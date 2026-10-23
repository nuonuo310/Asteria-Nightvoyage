import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {Store} from '../src/store.js';
import {snapshot} from '../src/contract.js';
import {planTransportAdmissionProposal,calculatePlanTransportAdmissionProposal,initPlanTransportAdmission,preflightPlanTransportAdmission,executePlanTransportAdmission} from '../scripts/plan-transport-admission-trial.mjs';
import {createPlanTransportAdmissionHttpTransport,planTransportAdmissionHttpVersion,isPlanTransportAdmissionHttp} from '../scripts/plan-transport-admission-http.mjs';
import {ChatGPTPlanAdapter,selectAdapter,planTransportAdmissionModel} from '../scripts/plan-transport-admission-port.mjs';
import {ModelPortNightvoyage} from '../scripts/plan-transport-admission-runtime.mjs';
import {OfflineAggregateEnvelopeStream} from '../scripts/offline-aggregate-envelope.mjs';
import {envelopeDiagnostic} from '../scripts/envelope-diagnostic.mjs';
import {dreamModelPortVersion,stageRequest} from '../scripts/dream-model-port.mjs';
import {withCheckedPlanSession,planSessionAvailable} from '../scripts/chatgpt-plan-login.mjs';
import {runDreambook} from '../scripts/dreambook.mjs';
import {syntheticPlanHttp} from '../test-support/plan-trial-fixtures.js';
import {aggregateTranscript} from '../test-support/offline-aggregate-fixtures.js';
import {protocolScene} from '../test-support/model-port-protocol-fixtures.js';
const fixtureUrl=new URL('../examples/plan-transport-admission.snapshot.json',import.meta.url);
const approval=()=>({approveFictionalSubscriptionTrial:true,confirmExtraCreditsDisabled:true,acknowledgeNoServerTokenCap:true,approveMissingContentTypeCompatibility:true,approveReasoningDiscard:true,approveAggregateStreamBudget:true,acknowledgeIndependentVersion:true,confirmNoFallbackOrCodex:true});
const settings={scenes:2,maxCalls:3,inputTokens:65536,outputTokens:3600,perCallOutput:1200,timeoutMs:60000};
function input(){const value=JSON.parse(fs.readFileSync(fixtureUrl,'utf8'));for(const source of value.sources)source.grant.modelEgress=true;return snapshot(value);}
function requestFor(){return stageRequest({contract_version:dreamModelPortVersion,request_id:'synthetic-admission-scene',run_id:'synthetic-admission-run',stage:'scene',index:0,snapshot:input(),scenes:[]});}
function setup(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-plan-admission-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return {root,directory:path.join(root,'book'),connectionDirectory:path.join(root,'connection')};}
function allText(root){return fs.readdirSync(root,{withFileTypes:true}).map(entry=>entry.isDirectory()?allText(path.join(root,entry.name)):fs.readFileSync(path.join(root,entry.name),'utf8')).join('\n');}
function completionFrame(draft){
 const material=JSON.parse(draft.body.input[0].content),data=protocolScene(material);
 return Buffer.from(`event: response.completed\ndata: ${JSON.stringify({type:'response.completed',response:{id:'synthetic-admission-response',status:'completed',model:draft.body.model,output:[{type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:JSON.stringify(data)}]}],usage:{input_tokens:7,output_tokens:3,total_tokens:10}}})}\n\n`);
}
const progressFrame=Buffer.from('data: {"type":"response.in_progress"}\n\n');
function transcriptAtEventCount(draft,total){return [Buffer.concat(Array(total-1).fill(progressFrame)),completionFrame(draft)];}
async function withAdapter(t,onGenerate,action){
 const dirs=setup(t),http=syntheticPlanHttp({onGenerate});http.install();t.after(http.restore);
 const out=await withCheckedPlanSession({directory:dirs.connectionDirectory,onReady:http.onReady},async session=>{
  const transport=createPlanTransportAdmissionHttpTransport({session,model:planTransportAdmissionModel,authorize(){},allowMissingContentType:true,allowReasoningDiscard:true,allowAggregateStream:true});
  const adapter=new ChatGPTPlanAdapter({httpTransport:transport});
  return action({adapter,transport,http,session,dirs});
 });
 return {dirs,http,authorization:out};
}
async function diagnosticFor(t,onGenerate){
 const {authorization}=await withAdapter(t,onGenerate,async({adapter})=>{try{await adapter.generate(requestFor());}catch(error){return envelopeDiagnostic(error);}assert.fail('synthetic stream unexpectedly accepted');});
 return authorization.actionResult;
}
async function runTrial(t,onGenerate){
 const dirs=setup(t);initPlanTransportAdmission(dirs.directory,approval());
 const http=syntheticPlanHttp({onGenerate});http.install();t.after(http.restore);
 const output=await executePlanTransportAdmission({...dirs,onReady:http.onReady});
 return {dirs,http,output};
}
async function withRuntime(t,onGenerate,action,fault=()=>{}){
 const dirs=setup(t),http=syntheticPlanHttp({onGenerate});http.install();t.after(http.restore);
 return withCheckedPlanSession({directory:dirs.connectionDirectory,onReady:http.onReady},async session=>{
  const transport=createPlanTransportAdmissionHttpTransport({session,model:planTransportAdmissionModel,authorize(){},allowMissingContentType:true,allowReasoningDiscard:true,allowAggregateStream:true});
  const adapter=new ChatGPTPlanAdapter({httpTransport:transport}),selection=selectAdapter({primary:adapter}),engine=new ModelPortNightvoyage(dirs.directory,{selection,fault});
  return action({engine,selection,adapter,transport,http,session,dirs});
 });
}
test('proposal is a new fixed source binding awaiting fresh approval',()=>{
 const proposal=planTransportAdmissionProposal(),calculated=calculatePlanTransportAdmissionProposal();
 assert.equal(proposal.admissionState,'OFFLINE_READY_AWAITING_FRESH_APPROVAL');
 assert.equal(proposal.protocol_version,'chatgpt-plan-aggregate-admission-v1');
 assert.notEqual(proposal.protocol_version,'chatgpt-plan-aggregate-envelope-http-v1');
 assert.deepEqual([proposal.adapter_kind,proposal.provider_kind,proposal.model_id,proposal.auth_mode],['ChatGPTPlanAdapter','openai','gpt-5.6-sol','chatgpt_plan']);
 assert.equal(proposal.permitCreated,false);assert.equal(proposal.permitConsumed,false);assert.equal(proposal.extraCreditsApproved,false);
 assert.equal(proposal.maxRuns,1);assert.equal(proposal.maxCalls,3);assert.equal(proposal.firstStageFailureStops,true);
 assert.equal(proposal.sourceIdentity,calculated.sourceIdentity);
 assert.ok(proposal.sourcePins['scripts/plan-transport-admission-trial.mjs']);
 assert.ok(proposal.sourcePins['scripts/plan-transport-admission-port.mjs']);
 assert.ok(proposal.sourcePins['scripts/dreambook.mjs']);
 const raw=fs.readFileSync(fixtureUrl,'utf8').replaceAll('\r\n','\n');
 assert.equal(proposal.fixtureHash,createHash('sha256').update(raw).digest('hex'));
});
test('synthetic OAuth and missing-type HTTP complete two scenes and wake without exposing reasoning or credentials',async t=>{
 const {dirs,http,output}=await runTrial(t,body=>new Response(Buffer.concat(aggregateTranscript({body}))));
 assert.equal(output.receipt.status,'completed');
 assert.equal(output.receipt.external_calls_started,3);assert.equal(output.receipt.stage_dispatches_started,3);
 assert.deepEqual(output.receipt.checkpoint,{saved_scenes:2,wake_saved:true,last_committed:'stage-'+output.receipt.runId+'-wake-2'});
 assert.equal(output.receipt.validation_diagnostic,null);assert.deepEqual(output.receipt.diagnostic_layers,{http:null,responses_envelope:null,responses_protocol:null,dream_stage:null,unclassified:null});
 assert.equal(output.receipt.extraCreditsApproved,false);assert.equal(output.receipt.apiFallback,false);assert.equal(output.receipt.codexFallback,false);
 assert.equal(output.receipt.remoteRevocationConfirmed,true);assert.equal(output.receipt.remoteCancellationConfirmed,'unknown');
 assert.equal(output.dream.scenes.length,2);assert.ok(output.wake.fragment);assert.equal(output.receipt.reasoningReturned,false);
 assert.equal(http.bodies.length,3);for(const body of http.bodies){assert.deepEqual(Object.keys(body).sort(),['input','instructions','model','store','stream']);assert.equal(body.store,false);assert.equal(body.stream,true);assert.equal(body.model,'gpt-5.6-sol');}
  const text=allText(dirs.root),syntheticMarkers=[['SYNTHETIC','AGGREGATE','REASONING'],['SYNTHETIC','TRIAL','ACCESS'],['SYNTHETIC','TRIAL','REFRESH'],['SYNTHETIC','ENCRYPTED']].map(parts=>parts.join('-'));
  for(const secret of syntheticMarkers)assert.ok(!text.includes(secret));
 const book=runDreambook(['read','--latest','--data-dir',dirs.directory]);assert.ok(book.includes('A small clock stands in a shallow bowl.'));
 const before=http.bodies.length,replay=await executePlanTransportAdmission({...dirs,onReady:()=>assert.fail('terminal replay opened OAuth')});
 assert.equal(replay.receipt.status,'completed');assert.equal(http.bodies.length,before);
});
test('the aggregate owner accepts 128 and 129 events while the historical strict parser stops at 129',async t=>{
 for(const total of [128,129]){
  const {http,output}=await runTrial(t,body=>new Response(Buffer.concat(transcriptAtEventCount({body},total))));
  assert.equal(output.receipt.status,'completed',`events=${total}`);assert.equal(http.bodies.length,3);assert.equal(output.receipt.checkpoint.saved_scenes,2);
 }
});
test('the aggregate owner accepts 1024 events and rejects 1025 at the first stage',async t=>{
 const accepted=await runTrial(t,body=>new Response(Buffer.concat(transcriptAtEventCount({body},1024))));
 assert.equal(accepted.output.receipt.status,'completed');assert.equal(accepted.http.bodies.length,3);
 const rejected=await runTrial(t,body=>new Response(Buffer.concat(transcriptAtEventCount({body},1025))));
 assert.equal(rejected.output.receipt.status,'failed');assert.equal(rejected.http.bodies.length,1);assert.equal(rejected.output.receipt.checkpoint.saved_scenes,0);
 assert.deepEqual(rejected.output.receipt.validation_diagnostic,{schemaVersion:1,layer:'responses_envelope',check:'event_limit'});
  assert.deepEqual(rejected.output.receipt.diagnostic_layers.responses_envelope,{schemaVersion:1,layer:'responses_envelope',check:'event_limit'});
  assert.deepEqual(rejected.output.receipt.stage_diagnostics.map(s=>s.diagnostic),[{schemaVersion:1,layer:'responses_envelope',check:'event_limit'}]);
 assert.equal(rejected.output.receipt.diagnostic_layers.http,null);assert.equal(rejected.output.receipt.usage[0].usage,'unknown');
});
test('a second-stage failure retains one committed scene, stops before wake and never replays externally',async t=>{
 let calls=0;
 const {dirs,http,output}=await runTrial(t,body=>{
  calls++;
  return calls===1?new Response(Buffer.concat(aggregateTranscript({body}))):new Response(Buffer.concat(transcriptAtEventCount({body},1025)));
 });
 assert.equal(output.receipt.status,'failed');assert.equal(http.bodies.length,2);assert.equal(output.receipt.external_calls_started,2);
 assert.deepEqual(output.receipt.checkpoint,{saved_scenes:1,wake_saved:false,last_committed:'stage-'+output.receipt.runId+'-scene-0'});
 assert.equal(output.dream,null);assert.equal(output.wake,null);
 assert.deepEqual(output.receipt.stage_diagnostics.map(s=>({stage:s.stage,index:s.index,state:s.state,diagnostic:s.diagnostic})),[
  {stage:'scene',index:0,state:'committed',diagnostic:null},
  {stage:'scene',index:1,state:'dispatched',diagnostic:{schemaVersion:1,layer:'responses_envelope',check:'event_limit'}}
 ]);
 const before=http.bodies.length,replay=await executePlanTransportAdmission({...dirs,onReady:()=>assert.fail('terminal failure replay opened OAuth')});
 assert.equal(http.bodies.length,before);assert.equal(replay.receipt.status,'failed');
});
test('HTTP bytes, aggregate bytes and canonical strict-frame bytes retain distinct diagnostics',async t=>{
 const httpCase=await runTrial(t,()=>new Response(Buffer.alloc(65537,120)));
 assert.deepEqual(httpCase.output.receipt.validation_diagnostic,{schemaVersion:1,layer:'http',check:'http_stream_limit'});
 assert.deepEqual(httpCase.output.receipt.diagnostic_layers.http,{schemaVersion:1,layer:'http',check:'http_stream_limit'});
 assert.equal(httpCase.output.receipt.diagnostic_layers.responses_envelope,null);assert.equal(httpCase.http.bodies.length,1);
 const aggregate=new OfflineAggregateEnvelopeStream('gpt-5.6-sol');
 assert.throws(()=>aggregate.push(Buffer.alloc(65537,120)),error=>{const d=envelopeDiagnostic(error);assert.deepEqual(d,{schemaVersion:1,layer:'responses_envelope',check:'stream_byte_limit'});return true;});
 const type='response.output_text.delta',empty={type,delta:''};
 const n=65536-Buffer.byteLength(`data: ${JSON.stringify(empty)}\n\n`)-20,event={type,delta:'x'.repeat(n)};
 const raw=Buffer.from(`data: ${JSON.stringify(event)}\n\n`),canonical=Buffer.byteLength(`event: ${type}\ndata: ${JSON.stringify(event)}\n\n`);
 assert.ok(raw.byteLength<65536);assert.ok(canonical>65536,`canonical=${canonical}`);
 const strict=new OfflineAggregateEnvelopeStream('gpt-5.6-sol');
 assert.throws(()=>strict.push(raw),error=>{assert.deepEqual(envelopeDiagnostic(error),{schemaVersion:1,layer:'responses_protocol',check:'plan_stream_limit'});return true;});
});
test('a present non-SSE media type fails at the HTTP layer before decoding',async t=>{
 const {output,http}=await runTrial(t,body=>new Response(Buffer.concat(aggregateTranscript({body})),{headers:{'Content-Type':'application/json'}}));
 assert.equal(output.receipt.status,'failed');assert.equal(http.bodies.length,1);
 assert.deepEqual(output.receipt.validation_diagnostic,{schemaVersion:1,layer:'http',check:'http_content_type'});
});
test('unknown, tool, refusal and stream-error events all fail closed at the envelope layer',async t=>{
 const cases=[
  ['unknown_event',events=>{events[2].type='synthetic.unknown';},'unknown_event'],
  ['tool_item',events=>{events[0].item.type='function_call';},'forbidden_output_item'],
  ['refusal_event',events=>{events[2].type='response.refusal.delta';},'refusal_output'],
  ['response_failed',events=>{events.splice(-1,0,{type:'response.failed',response:{status:'failed'}});},'unknown_event'],
  ['response_incomplete',events=>{events.splice(-1,0,{type:'response.incomplete',response:{status:'incomplete'}});},'unknown_event'],
  ['explicit_error',events=>{events.splice(-1,0,{type:'error',code:'synthetic_error'});},'unknown_event']
 ];
 for(const [name,mutate,check] of cases){
  const diagnostic=await diagnosticFor(t,body=>new Response(Buffer.concat(aggregateTranscript({body},undefined,mutate))));
  assert.deepEqual(diagnostic,{schemaVersion:1,layer:'responses_envelope',check},name);
 }
});
test('malformed, truncated, post-completion and invalid UTF-8 streams fail closed',async t=>{
 const malformed=await diagnosticFor(t,()=>new Response(Buffer.from('data: {"type":\n\n')));
 assert.deepEqual(malformed,{schemaVersion:1,layer:'responses_envelope',check:'invalid_event_json'});
 const truncated=await diagnosticFor(t,body=>{const bytes=Buffer.concat(aggregateTranscript({body}));return new Response(bytes.subarray(0,bytes.length-10));});
 assert.deepEqual(truncated,{schemaVersion:1,layer:'responses_envelope',check:'trailing_or_incomplete_stream'});
 const after=await diagnosticFor(t,body=>new Response(Buffer.concat([...aggregateTranscript({body}),progressFrame])));
 assert.deepEqual(after,{schemaVersion:1,layer:'responses_envelope',check:'events_after_completion'});
 const utf8=await diagnosticFor(t,()=>new Response(Buffer.from([0xff,0xfe,0xfd])));
 assert.deepEqual(utf8,{schemaVersion:1,layer:'responses_envelope',check:'invalid_utf8'});
});
test('model, usage, answer cardinality and invalid final JSON stay in protocol diagnostics',async t=>{
 const cases=[
  ['model',events=>{events.at(-1).response.model='fiction-other-model';},'responses_envelope','response_model_mismatch'],
  ['usage',events=>{events.at(-1).response.usage.total_tokens=99;},'responses_protocol','plan_invalid_usage'],
  ['messages',events=>{const message=structuredClone(events.at(-1).response.output[1]);message.id='synthetic-other-message';events.at(-1).response.output.push(message);},'responses_envelope','assistant_message_count'],
  ['json',events=>{events.at(-1).response.output[1].content[0].text='not-json';},'responses_protocol','plan_invalid_json']
 ];
 for(const [name,mutate,layer,check] of cases){
  const diagnostic=await diagnosticFor(t,body=>new Response(Buffer.concat(aggregateTranscript({body},undefined,mutate))));
  assert.deepEqual(diagnostic,{schemaVersion:1,layer,check},name);
 }
});
test('valid JSON with an invalid dream-stage shape maps to the distinct dream-stage layer',async t=>{
 const diagnostic=await diagnosticFor(t,body=>new Response(Buffer.concat(aggregateTranscript({body},undefined,events=>{events.at(-1).response.output[1].content[0].text=JSON.stringify({event:'incomplete scene'});}))));
 assert.equal(diagnostic.layer,'dream_stage');assert.equal(diagnostic.check,'invalid_inline_shape');
});
test('the real adapter cannot be forged, renamed from a simulator or given a fallback',async t=>{
 await withAdapter(t,body=>new Response(Buffer.concat(aggregateTranscript({body}))),async({adapter,transport,session})=>{
  assert.deepEqual(adapter.identity,{adapter_kind:'ChatGPTPlanAdapter',provider_kind:'openai',model_id:'gpt-5.6-sol',auth_mode:'chatgpt_plan',protocol_version:'chatgpt-plan-aggregate-admission-v1'});
  assert.equal(adapter.capabilities.external_generation,true);assert.equal(isPlanTransportAdmissionHttp(transport),true);
  assert.equal(transport.protocolVersion,planTransportAdmissionHttpVersion);assert.equal(planSessionAvailable(session,'gpt-5.6-sol'),true);
  assert.throws(()=>new ChatGPTPlanAdapter({httpTransport:transport,simulator(){}}),/unreviewed_model_adapter/);
  assert.throws(()=>new ChatGPTPlanAdapter({model_id:'gpt-5.6-sol',httpTransport:transport}),/unreviewed_model_adapter/);
  assert.throws(()=>new ChatGPTPlanAdapter({httpTransport:{}}),/unreviewed_model_adapter/);
  assert.throws(()=>selectAdapter({primary:adapter,fallback:{}}),/invalid_fallback_policy/);
  assert.throws(()=>selectAdapter({primary:adapter,fallback_on:['authorization_required']}),/invalid_fallback_policy/);
  return true;
 });
});
test('preflight creates no Store or permit and an initialized synthetic store refuses an expired window',async t=>{
 const dirs=setup(t),pre=preflightPlanTransportAdmission(dirs.directory);
 assert.equal(pre.ready,false);assert.equal(pre.reason,'fresh_approval_required');assert.equal(pre.credentialRead,false);assert.equal(fs.existsSync(path.join(dirs.directory,'state.json')),false);
 initPlanTransportAdmission(dirs.directory,approval());
 assert.equal(preflightPlanTransportAdmission(dirs.directory).ready,true);
 const store=new Store(dirs.directory);store.state.planTransportAdmissionTrial.approvedAt-=86400001;store.state.planTransportAdmissionTrial.expiresAt-=86400001;store.save();store.close();
 assert.equal(preflightPlanTransportAdmission(dirs.directory).reason,'trial_expired');
});
test('a committed scene checkpoint resumes without repeating the first dispatch',async t=>{
 let calls=0,crashed=false;
 await withRuntime(t,body=>{calls++;return new Response(Buffer.concat(aggregateTranscript({body})));},async({engine,selection,dirs})=>{
  const id=engine.start('checkpoint-retry','checkpoint-retry',input(),settings);
  await engine.execute(id);
  assert.equal(engine.status(id).status,'failed');assert.equal(engine.status(id).stagesSaved,1);assert.equal(calls,1);
  const first=structuredClone(engine.run(id).scenes[0]);engine.close();
  const reopened=new ModelPortNightvoyage(dirs.directory,{selection});
  await reopened.resume(id);
  assert.equal(reopened.status(id).status,'completed');assert.equal(calls,3);assert.deepEqual(reopened.result(id).dream.scenes[0],first);
  reopened.close();
 },point=>{if(point==='port_scene_saved'&&!crashed){crashed=true;throw Error('synthetic_checkpoint_interruption');}});
});
test('duplicate request ids and terminal execute reuse the same run without another dispatch',async t=>{
 await withRuntime(t,body=>new Response(Buffer.concat(aggregateTranscript({body}))),async({engine,http,selection,dirs})=>{
  const first=engine.start('duplicate-request','duplicate-request',input(),settings),second=engine.start('duplicate-request','duplicate-request',input(),settings);
  assert.equal(first,second);assert.equal(http.bodies.length,0);
  await engine.execute(first);assert.equal(engine.status(first).status,'completed');assert.equal(http.bodies.length,3);
  await engine.execute(first);assert.equal(http.bodies.length,3);engine.close();
  const reopened=new ModelPortNightvoyage(dirs.directory,{selection});await reopened.execute(first);assert.equal(http.bodies.length,3);reopened.close();
 });
});
test('cancellation, timeout and source withdrawal suppress late chunks and save no scene',async t=>{
 for(const mode of ['cancel','timeout','withdraw']){
  let entered,release;const ready=new Promise(resolve=>{entered=resolve;}),gate=new Promise(resolve=>{release=resolve;});
  await withRuntime(t,body=>{
   const chunks=aggregateTranscript({body});let sent=false;
   const stream=new ReadableStream({
    start(controller){controller.enqueue(chunks[0]);entered();},
    async pull(controller){if(sent)return;sent=true;await gate;for(const chunk of chunks.slice(1))controller.enqueue(chunk);controller.close();}
   });
   return new Response(stream);
  },async({engine,selection,http,dirs})=>{
   const id=engine.start('controlled-'+mode,'controlled-'+mode,input(),mode==='timeout'?{...settings,timeoutMs:20}:settings);
   const work=engine.execute(id);await ready;
   if(mode==='cancel')engine.cancel(id);if(mode==='timeout')await new Promise(resolve=>setTimeout(resolve,30));if(mode==='withdraw')engine.withdraw(input().sources[0].id);
   release();await work;
   assert.equal(engine.result(id).dream,null,mode);assert.equal(engine.status(id).stagesSaved,0,mode);assert.equal(http.bodies.length,1,mode);assert.equal(engine.status(id).cancellation.remote_confirmed,'unknown',mode);
   engine.close();const reopened=new ModelPortNightvoyage(dirs.directory,{selection});await reopened.execute(id);assert.equal(http.bodies.length,1,mode);reopened.close();
  });
 }
});
test('source withdrawal suppresses completed dream, dreambook readback and credential-free replay',async t=>{
 const {dirs,http,output}=await runTrial(t,body=>new Response(Buffer.concat(aggregateTranscript({body}))));
 const event=output.dream.scenes[0].event,fragment=output.wake.fragment,source=input().sources[0].text,before=http.bodies.length;
 const store=new Store(dirs.directory);store.withdraw(input().sources[0].id);store.close();
 const replay=await executePlanTransportAdmission({...dirs,onReady:()=>assert.fail('withdrawn replay opened OAuth')});
 assert.equal(http.bodies.length,before);assert.equal(replay.dream,null);assert.equal(replay.receipt.status,'revoked');assert.equal(replay.receipt.checkpoint.saved_scenes,0);
 const book=runDreambook(['read','--latest','--data-dir',dirs.directory]);assert.ok(!book.includes(event));assert.ok(!book.includes(fragment));
 const text=allText(dirs.root);for(const value of [event,fragment,source])assert.ok(!text.includes(value));
});
test('durable dispatched intent exists on disk before the model HTTP request begins',async t=>{
 const dirs=setup(t);initPlanTransportAdmission(dirs.directory,approval());let observed;
 const http=syntheticPlanHttp({onGenerate:body=>{
  const state=JSON.parse(fs.readFileSync(path.join(dirs.directory,'state.json'),'utf8')),run=Object.values(state.runs)[0],attempt=run.attempts.at(-1);
  observed??={status:run.status,attempt:structuredClone(attempt),calls:run.budget.calls};
  return new Response(Buffer.concat(aggregateTranscript({body})));
 }});http.install();t.after(http.restore);
 const output=await executePlanTransportAdmission({...dirs,onReady:http.onReady});
 assert.equal(output.receipt.status,'completed');
 assert.deepEqual(observed.status,'running');assert.equal(observed.calls,1);assert.equal(observed.attempt.state,'dispatched');assert.equal(observed.attempt.external_call_intent,true);assert.equal(observed.attempt.stage,'scene');assert.equal(observed.attempt.index,0);
});
