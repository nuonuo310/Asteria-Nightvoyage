import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {ChatGPTPlanAdapter,CodexAdapter,selectAdapter,selectSubscriptionAdapter,FakeAdapter,stageRequest,dreamModelPortVersion} from '../scripts/dream-model-port.mjs';
import {ModelPortNightvoyage} from '../scripts/dream-model-runtime.mjs';
import {CodexDreamStream} from '../scripts/codex-dream-protocol.mjs';
import {planTranscript,codexTranscript,byteChunks,protocolScene} from '../test-support/model-port-protocol-fixtures.js';
const seed=()=>JSON.parse(fs.readFileSync(new URL('../examples/adapter-boundary.snapshot.json',import.meta.url),'utf8'));
function setup(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-subscription-protocol-')),directory=path.join(root,'book');let engine;const open=adapter=>engine=new ModelPortNightvoyage(directory,{selection:selectAdapter({primary:adapter})});t.after(()=>{engine?.close();fs.rmSync(root,{recursive:true,force:true});});return {root,directory,open};}
const adapters=[['GPT',ChatGPTPlanAdapter,planTranscript],['Codex',CodexAdapter,codexTranscript]];
for(const [name,Adapter,transcript] of adapters)test(`${name} explicit simulator uses same persistent engine, separate identity, usage, dedup and withdrawal`,async t=>{
 const {open,directory}=setup(t);let calls=0;const adapter=new Adapter({model_id:'fiction-protocol-model',simulator:draft=>{calls++;assert.equal(draft.dispatchAuthorized,false);return transcript(draft);}});let e=open(adapter);const id=e.start('fiction','fiction',seed());await e.execute(id);const r=e.result(id);assert.equal(r.receipt.status,'completed');assert.equal(calls,3);assert.equal(r.receipt.adapter_kind,name==='GPT'?'ChatGPTPlanAdapter':'CodexAdapter');assert.equal(r.receipt.auth_mode,'synthetic_stub');assert.equal(r.receipt.provider_kind,'openai_protocol_simulator');assert.equal(r.receipt.external_calls_started,0);assert.equal(r.receipt.checkpoint.saved_scenes,2);assert.equal(r.dream.isRealityFact,false);
 assert.deepEqual(r.receipt.usage[0].usage,name==='GPT'?{input_tokens:7,output_tokens:3,total_tokens:10}:'unknown');
 const original=JSON.stringify(e.read(r.dream.id));e.close();e=open(new Adapter({model_id:'fiction-protocol-model',simulator:()=>{throw Error('REPLAY_MUST_NOT_CALL');}}));assert.equal(e.start('fiction','fiction',seed()),id);await e.execute(id);assert.equal(JSON.stringify(e.read(r.dream.id)),original);assert.equal(calls,3);
 const disk=fs.readFileSync(path.join(directory,'state.json'),'utf8');assert.ok(!disk.includes('fiction-thread'));assert.ok(!disk.includes('fiction-turn'));assert.equal(e.recall('clock','cue',1)[0].origin,'dream');
 e.withdraw(seed().sources[0].id);e.close();e=open(adapter);assert.equal(e.result(id).dream,null);assert.deepEqual(e.recall('clock','cue',1),[]);
});
test('explicit preflight GPT-to-Codex simulated fallback is recorded and never occurs after first dispatch',async t=>{
 const {directory}=setup(t);let calls=0;const fallback=new CodexAdapter({model_id:'fiction-codex',simulator:draft=>{calls++;return codexTranscript(draft);}}),primary=new ChatGPTPlanAdapter({model_id:'fiction-plan'});
 assert.equal(selectAdapter({primary,fallback}).ready,false);
 const selection=selectAdapter({primary,fallback,fallback_on:['authorization_required']}),e=new ModelPortNightvoyage(directory,{selection});
 try{const id=e.start('fallback','fallback',seed());await e.execute(id);assert.equal(e.status(id).status,'completed');assert.equal(e.status(id).fallback_from,'ChatGPTPlanAdapter');assert.equal(e.status(id).fallback_reason,'authorization_required');assert.equal(e.status(id).adapter_kind,'CodexAdapter');assert.equal(calls,3);}finally{e.close();}
});
for(const [name,Adapter,transcript] of adapters)test(`${name} second stage rejection retains first checkpoint and never switches or repairs`,async t=>{
 const {open,directory}=setup(t);let calls=0;const adapter=new Adapter({model_id:'fiction-protocol-model',simulator:draft=>{calls++;const material=JSON.parse(name==='GPT'?draft.body.input[0].content:draft.input);return transcript(draft,material.sceneIndex===1?{}:undefined);}}),e=open(adapter),id=e.start('failure','failure',seed());await e.execute(id);assert.equal(e.status(id).status,'failed');assert.equal(e.status(id).stagesSaved,1);assert.equal(calls,2);await assert.rejects(e.resume(id),/ambiguous_attempt/);await e.execute(id);assert.equal(calls,2);e.close();assert.throws(()=>new ModelPortNightvoyage(directory,{selection:selectAdapter({primary:new FakeAdapter()})}),/foreign_execution_owner/);
});
for(const [name,Adapter,transcript] of adapters)test(`${name} noncooperative simulator cancellation suppresses completed late stream`,async t=>{
 const {open}=setup(t);let release,entered,calls=0;const started=new Promise(r=>entered=r),adapter=new Adapter({model_id:'fiction-protocol-model',simulator:draft=>{calls++;entered();return new Promise(resolve=>release=()=>resolve(transcript(draft)));}}),e=open(adapter),id=e.start('cancel','cancel',seed());const work=e.execute(id);await started;e.cancel(id);await work;release();await new Promise(r=>setImmediate(r));assert.equal(e.status(id).status,'cancelled');assert.equal(e.result(id).dream,null);assert.equal(calls,1);assert.equal(e.status(id).cancellation.remote_confirmed,'unknown');
});
test('production defaults have no simulator, no model inference, no login or process fallback',async t=>{
 const {directory}=setup(t);assert.equal(selectSubscriptionAdapter().ready,false);assert.throws(()=>new ModelPortNightvoyage(directory,{selection:selectSubscriptionAdapter()}),/authorization_required/);assert.equal(fs.existsSync(directory),false);
 for(const adapter of [new ChatGPTPlanAdapter({model_id:'fiction-model'}),new CodexAdapter({model_id:'fiction-model'})]){assert.equal(adapter.preflight().ready,false);await assert.rejects(adapter.generate(),/authorization_required/);}
});
const request=()=>stageRequest({contract_version:dreamModelPortVersion,request_id:'fiction-request',run_id:'fiction-run',stage:'scene',index:0,snapshot:seed(),scenes:[]});
test('GPT preparation remains store false, no tool authority, explicit model and non-dispatchable',()=>{
 const adapter=new ChatGPTPlanAdapter({model_id:'fiction-model'}),draft=adapter.prepare(request());assert.equal(draft.dispatchAuthorized,false);assert.equal(draft.body.store,false);assert.equal(draft.body.stream,true);assert.equal('tools' in draft.body,false);assert.equal('max_output_tokens' in draft.body,false);assert.throws(()=>new ChatGPTPlanAdapter().prepare(request()),/explicit_model_required/);
});
test('Codex terminal status, tools, reroutes, wrong identity, extra final message and malformed data fail closed',()=>{
 const draft=new CodexAdapter({model_id:'fiction-model'}).prepare(request());assert.equal(draft.dispatchAuthorized,false);assert.equal(draft.liveAdmission,'blocked_pending_auth_and_verified_tool_disable');
 const parse=result=>{const s=new CodexDreamStream(result.thread_id,result.turn_id);for(const chunk of result.chunks)s.push(chunk);return s.finish();};
 for(const status of ['failed','interrupted','inProgress'])assert.throws(()=>parse(codexTranscript(draft,undefined,{status})),/codex_/);
 for(const itemType of ['commandExecution','fileChange','mcpToolCall','dynamicToolCall','webSearch','reasoning','collabToolCall'])assert.throws(()=>parse(codexTranscript(draft,undefined,{itemType})),/codex_/);
 const bad=codexTranscript(draft);bad.turn_id='other-turn';assert.throws(()=>parse(bad),/codex_/);
 const reroute={method:'model/rerouted',params:{threadId:'fiction-thread',turnId:'fiction-turn',fromModel:'fiction-model',toModel:'other-model'}};
 assert.throws(()=>parse({...codexTranscript(draft),chunks:byteChunks(JSON.stringify(reroute)+'\n')}),/codex_/);
 const extra=codexTranscript(draft);extra.chunks.push(...extra.chunks);assert.throws(()=>parse(extra),/codex_/);
 assert.throws(()=>parse({thread_id:'fiction-thread',turn_id:'fiction-turn',chunks:byteChunks('not json\n')}),/codex_/);
});
test('Codex UTF-8/CRLF byte splitting returns only authoritative final item and never delta text',()=>{
 const draft=new CodexAdapter({model_id:'fiction-model'}).prepare(request()),raw=protocolScene(JSON.parse(draft.input));raw.event='梦里有一只蓝色碗。';const result=codexTranscript(draft,raw);
 const delta={method:'item/agentMessage/delta',params:{threadId:result.thread_id,turnId:result.turn_id,itemId:'fiction-message',delta:'THIS_PARTIAL_TEXT_MUST_NOT_RETURN'}};
 const text=JSON.stringify(delta)+'\r\n'+Buffer.concat(result.chunks).toString('utf8'),stream=new CodexDreamStream(result.thread_id,result.turn_id);
 for(const byte of Buffer.from(text))stream.push(Uint8Array.of(byte));const output=stream.finish();assert.equal(output.data.event,raw.event);assert.equal(output.usage,'unknown');assert.ok(!JSON.stringify(output).includes('THIS_PARTIAL'));assert.throws(()=>stream.finish(),/closed/);
});
test('Codex bounds, truncation and JSON nonobject response cannot release a body',()=>{
 for(const chunks of [[Buffer.alloc(65537)],byteChunks('{"method":'),[Uint8Array.of(255)]]){const s=new CodexDreamStream('fiction-thread','fiction-turn');assert.throws(()=>{for(const c of chunks)s.push(c);s.finish();},/codex_/);}
 const s=new CodexDreamStream('fiction-thread','fiction-turn'),events=Array(129).fill(JSON.stringify({method:'thread/tokenUsage/updated',params:{threadId:'fiction-thread'}})).join('\n')+'\n';assert.throws(()=>s.push(Buffer.from(events)),/codex_/);
});
test('ready GPT rehearsal failure never dispatches declared Codex fallback after scene zero',async t=>{
 const {directory}=setup(t);let gptCalls=0,codexCalls=0;
 const primary=new ChatGPTPlanAdapter({model_id:'fiction-gpt',simulator:draft=>{gptCalls++;return planTranscript(draft,gptCalls===2?{}:undefined);}}),fallback=new CodexAdapter({model_id:'fiction-codex',simulator:draft=>{codexCalls++;return codexTranscript(draft);}}),selection=selectAdapter({primary,fallback,fallback_on:['adapter_unavailable','authorization_required']}),e=new ModelPortNightvoyage(directory,{selection});
 try{const id=e.start('pinned','pinned',seed());await e.execute(id);assert.equal(e.status(id).status,'failed');assert.equal(e.status(id).stagesSaved,1);assert.equal(e.status(id).adapter_kind,'ChatGPTPlanAdapter');assert.equal(e.status(id).fallback_from,null);assert.equal(gptCalls,2);assert.equal(codexCalls,0);}finally{e.close();}
});
test('Codex rejects hidden final-turn tools and a conflicting final item even without tool notifications',()=>{
 const draft=new CodexAdapter({model_id:'fiction-model'}).prepare(request());
 for(const item of [{type:'commandExecution',id:'hidden-tool'},{type:'agentMessage',id:'conflict',text:'{}',phase:'final_answer'}]){
  const r=codexTranscript(draft),events=Buffer.concat(r.chunks).toString('utf8').trim().split('\r\n').map(JSON.parse);events.at(-1).params.turn.items=[item];const stream=new CodexDreamStream(r.thread_id,r.turn_id);
  assert.throws(()=>{stream.push(Buffer.from(events.map(e=>JSON.stringify(e)).join('\n')+'\n'));stream.finish();},/codex_/);
 }
});
