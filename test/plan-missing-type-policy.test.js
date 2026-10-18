import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {planMissingTypePolicy} from '../scripts/plan-missing-type-policy.mjs';
import {ChatGPTPlanAdapter,stageRequest,dreamModelPortVersion} from '../scripts/dream-model-port.mjs';
import {planTranscript,byteChunks} from '../test-support/model-port-protocol-fixtures.js';
import {checkMissingTypeSse} from '../test-support/missing-type-sse-rehearsal.js';
const seed=()=>JSON.parse(fs.readFileSync(new URL('../examples/adapter-boundary.snapshot.json',import.meta.url),'utf8'));
const request=()=>stageRequest({contract_version:dreamModelPortVersion,request_id:'fiction-media-request',run_id:'fiction-media-run',stage:'scene',index:0,snapshot:seed(),scenes:[]});
const policy=(contentType,allowMissingContentType=false,httpStatus=200)=>planMissingTypePolicy({httpStatus,contentType,allowMissingContentType});
function adapter(chunks,{contentType=null,allowMissingContentType=true}={}){return new ChatGPTPlanAdapter({model_id:'fiction-media-model',simulator:draft=>{policy(contentType,allowMissingContentType);return chunks(draft);}});}
test('missing Content-Type requires explicit candidate policy, while explicit non-SSE never qualifies',()=>{
 for(const missing of [null,'']){assert.throws(()=>policy(missing),/content_type_required/);const out=policy(missing,true);assert.equal(out.missingHeaderCompatibilityUsed,true);assert.equal(out.completeStreamValidationRequired,true);assert.equal(out.dreamStageValidationRequired,true);assert.equal(out.inferenceAccepted,false);assert.equal(out.dispatchEnabled,false);}
 for(const type of ['application/json','text/html','text/plain','application/octet-stream',' ','text/event-streamx','__proto__'])assert.throws(()=>policy(type,true),/explicit_type_rejected/);
 for(const status of [201,204,301,401,403,429,500,null])assert.throws(()=>policy(null,true,status),/http_status/);
 for(const type of ['text/event-stream','TEXT/EVENT-STREAM; charset=utf-8'])assert.equal(policy(type).missingHeaderCompatibilityUsed,false);
});
test('policy rejects implicit, malformed, getter and arbitrary inputs without evaluating accessors or returning values',()=>{
 let reads=0;for(const input of [{httpStatus:200,contentType:null}, {httpStatus:200,contentType:null,allowMissingContentType:'yes'}, {httpStatus:200,contentType:'x'.repeat(257),allowMissingContentType:true}, {httpStatus:200,contentType:null,allowMissingContentType:true,private:'PRIVATE'}, {httpStatus:200,get contentType(){reads++;return null;},allowMissingContentType:true}])assert.throws(()=>planMissingTypePolicy(input),/media_policy_invalid/);assert.equal(reads,0);assert.equal(JSON.stringify(policy(null,true)).includes('PRIVATE'),false);
});
test('complete synthetic missing-header streams use the unchanged decoder and dream validation with normalized usage',async()=>{
 const a=adapter(draft=>planTranscript(draft)),r=await a.generate(request());assert.equal(a.identity.provider_kind,'openai_protocol_simulator');assert.equal(a.identity.auth_mode,'synthetic_stub');assert.equal(a.capabilities.external_generation,false);assert.equal(r.value.event,'A small clock stands in a shallow bowl.');assert.deepEqual(r.usage,{input_tokens:7,output_tokens:3,total_tokens:10});
});
test('SSE-like prefix, HTML, JSON, invalid UTF8 and terminal-free streams cannot release a stage',async()=>{
 for(const text of ['data: {"type":"response.created"}\n\n','data: [DONE]\n\n','<!doctype html><html>PRIVATE','{"object":"response"}','data: {"type":"response.completed"}'])await assert.rejects(adapter(()=>byteChunks(text)).generate(request()));
 await assert.rejects(adapter(()=>[Uint8Array.of(255)]).generate(request()));
});
test('failed, incomplete, tool, refusal and extra terminal events remain rejected after candidate media admission',async()=>{
 for(const type of ['response.failed','response.incomplete','error','unknown.event','response.refusal.delta'])await assert.rejects(adapter(()=>byteChunks(`data: ${JSON.stringify({type})}\n\n`)).generate(request()));
 await assert.rejects(adapter(()=>byteChunks('data: {"type":"response.output_item.added","item":{"type":"function_call"}}\n\n')).generate(request()));
 await assert.rejects(adapter(draft=>{const chunks=planTranscript(draft);return [...chunks,...chunks];}).generate(request()));
});
test('completed event still requires matching model, exact output shape, bounded content and consistent usage',async()=>{
 for(const mutate of [e=>e.response.model='other-model',e=>e.response.status='incomplete',e=>e.response.output[0].role='tool',e=>e.response.output[0].content[0].type='refusal',e=>e.response.output[0].content[0].text='x'.repeat(1201),e=>e.response.usage.total_tokens=999,e=>e.response.output[0].content[0].text='{"event":"PRIVATE"}']){
  await assert.rejects(adapter(draft=>{const raw=Buffer.concat(planTranscript(draft)).toString().trim().slice(6),e=JSON.parse(raw);mutate(e);return byteChunks('data: '+JSON.stringify(e)+'\n\n');}).generate(request()));
 }
});
test('unchanged 64KiB stream, 128-event and UTF8/CRLF bounds apply; missing-header compatibility does not raise budgets',async()=>{
 await assert.rejects(adapter(()=>[Buffer.alloc(65537)]).generate(request()));
 await assert.rejects(adapter(draft=>[...byteChunks('data: {"type":"response.created"}\n\n'.repeat(129)),...planTranscript(draft)]).generate(request()));
 const a=adapter(draft=>{const e=JSON.parse(Buffer.concat(planTranscript(draft)).toString().trim().slice(6));e.response.output[0].content[0].text=JSON.stringify({...JSON.parse(e.response.output[0].content[0].text),event:'梦里有一只碗。'});return [...Buffer.from('data: '+JSON.stringify(e)+'\r\n\r\n')].map(byte=>Uint8Array.of(byte));});assert.equal((await a.generate(request())).value.event,'梦里有一只碗。');
});
test('cancelled synthetic stream cannot release late completion and strict default blocks before reading chunks',async()=>{
 const controller=new AbortController();await assert.rejects(adapter(draft=>(async function*(){controller.abort();yield* planTranscript(draft);})()).generate(request(),{signal:controller.signal}),/cancelled/);
 let reads=0;await assert.rejects(adapter(()=>{reads++;return [];},{allowMissingContentType:false}).generate(request()),/media_policy_content_type_required/);assert.equal(reads,0);
});
test('complete fictional loop persists two scenes and wake, deduplicates replay and suppresses withdrawn recall after restart',async()=>{
 const out=await checkMissingTypeSse();assert.equal(out.status,'completed');assert.equal(out.simulatorStageCalls,3);assert.equal(out.externalCallsStarted,0);assert.equal(out.realModelRequests,0);assert.equal(out.savedScenes,2);assert.equal(out.wakeSaved,true);assert.equal(out.replayAdditionalCalls,0);assert.equal(out.originalAndWakeUnchanged,true);assert.equal(out.recallOrigin,'dream');assert.equal(out.recallIsRealityFact,false);assert.equal(out.withdrawalSuppressesReopenedResult,true);assert.equal(out.withdrawalSuppressesReopenedRecall,true);assert.equal(out.realInferenceQualified,false);
});
test('offline candidate never imports native transport, OAuth, credentials, fetch or Store',()=>{
 const text=fs.readFileSync(new URL('../scripts/plan-missing-type-policy.mjs',import.meta.url),'utf8');assert.equal(/^import\s/m.test(text),false);assert.equal(/\bfetch\s*\(|planSessionCredential|createPlanHttpTransport|child_process|readFile|writeFile/.test(text),false);
});
