import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {OfflineAggregateIntegrationAdapter,selectAdapter,offlineAggregateIntegrationVersion,offlineAggregateIntegrationModel} from '../scripts/offline-aggregate-integration-port.mjs';
import {ModelPortNightvoyage} from '../scripts/offline-aggregate-integration-runtime.mjs';
import {OfflineAggregateEnvelopeStream,aggregateEnvelopeLimits} from '../scripts/offline-aggregate-envelope.mjs';
import {boundedOfflineAggregateChunks} from '../scripts/offline-aggregate-integration-http.mjs';
import {ChatgptPlanStream} from '../scripts/chatgpt-plan-protocol.mjs';
import {envelopeDiagnostic} from '../scripts/envelope-diagnostic.mjs';
import {dreamModelPortVersion,stageRequest,FakeAdapter} from '../scripts/dream-model-port.mjs';
import {OfflineAggregatePlanAdapter} from '../scripts/offline-aggregate-model-port.mjs';
import {runDreambook} from '../scripts/dreambook.mjs';
import {envelopeSeed,aggregateTranscript} from '../test-support/offline-aggregate-fixtures.js';
import {envelopeEvents} from '../test-support/offline-plan-envelope-fixtures.js';
import {protocolScene} from '../test-support/model-port-protocol-fixtures.js';
import {shapeCompletion,shapeFrame,shapeModel} from '../test-support/plan-output-shape-cases.js';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const progressFrame=Buffer.from('data: {"type":"response.in_progress"}\n\n');
const requestFor=()=>stageRequest({contract_version:dreamModelPortVersion,request_id:'synthetic-integration-request',run_id:'synthetic-integration-run',stage:'scene',index:0,snapshot:envelopeSeed(),scenes:[]});
const adapterFor=simulator=>new OfflineAggregateIntegrationAdapter({model_id:offlineAggregateIntegrationModel,simulator});
const completionFor=(draft,mutate=()=>{})=>{
 const material=JSON.parse(draft.body.input[0].content),completion=envelopeEvents(protocolScene(material)).at(-1);
 completion.response.model=draft.body.model;mutate(completion.response);return completion;
};
const serializedFrame=event=>Buffer.from(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
function streamWithProgress(count,mutate){
 return draft=>{
  const completion=completionFor(draft,mutate),bytes=Buffer.concat([...Array(count).fill(progressFrame),serializedFrame(completion)]);
  return [bytes];
 };
}
async function rejectionFor(simulator){
 let error;
 try{await adapterFor(simulator).generate(requestFor());}catch(caught){error=caught;}
 assert.ok(error,'synthetic stream unexpectedly accepted');return envelopeDiagnostic(error);
}
function setupRuntime(context,simulator=draft=>aggregateTranscript(draft),fault=()=>{}){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-integration-')),directory=path.join(root,'book');let engine,calls=0;
 const adapter=adapterFor((draft,control)=>{calls++;return simulator(draft,control);}),selection=selectAdapter({primary:adapter});
 const open=()=>engine=new ModelPortNightvoyage(directory,{selection,fault});
 context.after(()=>{engine?.close();fs.rmSync(root,{recursive:true,force:true});});
 return {directory,selection,open,calls:()=>calls,start:(instance,id='synthetic-integration',settings)=>instance.start(id,id,envelopeSeed(),settings)};
}
test('one aggregate owner accepts 128 and 129 events while the standalone strict parser still stops at 129',async()=>{
 for(const total of [128,129]){
  const source=draft=>streamWithProgress(total-1)(draft),result=await adapterFor(source).generate(requestFor());
  assert.equal(result.value.event,'A small clock stands in a shallow bowl.');
  const bytes=Buffer.concat([...Array(total-1).fill(progressFrame),Buffer.from(shapeFrame(shapeCompletion()))]);
  assert.ok(bytes.length<aggregateEnvelopeLimits.streamBytes);
  const decoder=new OfflineAggregateEnvelopeStream(shapeModel);decoder.push(bytes);const decoded=decoder.finish();
  assert.equal(decoded.envelopeAudit.processedEvents,total);assert.equal(decoded.envelopeAudit.strictCompletionFrames,1);
  const strict=new ChatgptPlanStream(shapeModel);
  if(total===128){strict.push(bytes);assert.ok(strict.finish().data.fragment);}
  else assert.throws(()=>strict.push(bytes),/plan_invalid_stream/);
 }
});
test('aggregate event budget accepts 1024 total events and rejects 1025',async()=>{
 const accepted=await adapterFor(streamWithProgress(1023)).generate(requestFor());
 assert.equal(accepted.value.event,'A small clock stands in a shallow bowl.');
 const over=await rejectionFor(streamWithProgress(1024));
 assert.deepEqual(over,{schemaVersion:1,layer:'responses_envelope',check:'event_limit'});
 assert.equal(aggregateEnvelopeLimits.events,1024);
});
test('HTTP, outer byte, inner strict byte and event limits keep independent diagnostics',async()=>{
 const http=await rejectionFor(()=>[Buffer.alloc(65537)]);
 assert.deepEqual(http,{schemaVersion:1,layer:'http',check:'http_stream_limit'});
 const outer=new OfflineAggregateEnvelopeStream(offlineAggregateIntegrationModel);
 assert.throws(()=>outer.push(Buffer.alloc(65537)),error=>envelopeDiagnostic(error)?.layer==='responses_envelope'&&envelopeDiagnostic(error)?.check==='stream_byte_limit');
 const count=[];for(let index=0;index<1025;index++)count.push(progressFrame);
 const event=new OfflineAggregateEnvelopeStream(offlineAggregateIntegrationModel);
 assert.throws(()=>event.push(Buffer.concat(count)),error=>envelopeDiagnostic(error)?.check==='event_limit');
 const type='response.output_text.delta',eventValue={type,output_index:1,item_id:'synthetic-message',content_index:0,delta:'x'.repeat(65382)};
 const raw=Buffer.from(`data: ${JSON.stringify(eventValue)}\n\n`),canonical=Buffer.from(`event: ${type}\ndata: ${JSON.stringify(eventValue)}\n\n`);
 assert.ok(raw.length<aggregateEnvelopeLimits.streamBytes);assert.ok(canonical.length>aggregateEnvelopeLimits.streamBytes);
 const inner=await rejectionFor(()=>[raw]);
 assert.deepEqual(inner,{schemaVersion:1,layer:'responses_protocol',check:'plan_stream_limit'});
});
const rejectionCases=[
 ['unknown_event','responses_envelope','unknown_event',events=>events.splice(2,0,{type:'unreviewed.event'})],
 ['forbidden tool item','responses_envelope','forbidden_output_item',events=>{events[0].item.type='function_call';}],
 ['refusal event','responses_envelope','refusal_output',events=>events.splice(2,0,{type:'response.refusal.delta',delta:'synthetic refusal'})],
 ['wrong model','responses_envelope','response_model_mismatch',events=>{events.at(-1).response.model='synthetic-other-model';}],
 ['invalid usage','responses_protocol','plan_invalid_usage',events=>{events.at(-1).response.usage.total_tokens++;}],
 ['oversized final JSON','responses_protocol','plan_content_limit',events=>{events.at(-1).response.output[1].content[0].text=JSON.stringify({fragment:'a'.repeat(1200)});}]
];
for(const [name,layer,check,mutate]of rejectionCases)test(`integration preserves ${name} rejection as ${layer}/${check}`,async()=>{
 const diagnostic=await rejectionFor(draft=>aggregateTranscript(draft,undefined,mutate));
 assert.deepEqual(diagnostic,{schemaVersion:1,layer,check});
});
test('malformed, invalid UTF-8, truncated and empty streams release no answer',async()=>{
 const cases=[
  [()=>[Buffer.from('data:not-json\n\n')],'invalid_event_json'],
  [()=>[Buffer.from([255])],'invalid_utf8'],
  [draft=>aggregateTranscript(draft).slice(0,-1),'trailing_or_incomplete_stream'],
  [()=>[],'trailing_or_incomplete_stream']
 ];
 for(const [source,check]of cases)assert.equal((await rejectionFor(source)).check,check);
});
test('selector is Fake by default, fixes adapter/model/version and rejects authority or forged selections',async()=>{
 const adapter=adapterFor(draft=>aggregateTranscript(draft));
 assert.equal(adapter.identity.adapter_kind,'ChatGPTPlanAdapter');assert.equal(adapter.identity.provider_kind,'openai_protocol_simulator');assert.equal(adapter.identity.model_id,offlineAggregateIntegrationModel);assert.equal(adapter.identity.protocol_version,offlineAggregateIntegrationVersion);assert.equal(adapter.capabilities.external_generation,false);
 assert.equal(selectAdapter().adapter.identity.adapter_kind,'FakeAdapter');assert.equal(new OfflineAggregateIntegrationAdapter({model_id:offlineAggregateIntegrationModel}).preflight().ready,false);
 for(const options of [{model_id:'synthetic-other-model',simulator:aggregateTranscript},{model_id:offlineAggregateIntegrationModel,simulator:1},{model_id:offlineAggregateIntegrationModel,apiKey:'SYNTHETIC'},{model_id:offlineAggregateIntegrationModel,endpoint:'https://synthetic.invalid'}])assert.throws(()=>new OfflineAggregateIntegrationAdapter(options));
 let touched=false;assert.throws(()=>new OfflineAggregateIntegrationAdapter({get model_id(){touched=true;}}));assert.throws(()=>selectAdapter({get primary(){touched=true;}}));assert.equal(touched,false);
 assert.throws(()=>selectAdapter({primary:new OfflineAggregatePlanAdapter()}),/invalid_model_selection/);assert.throws(()=>selectAdapter({primary:adapter,fallback:new FakeAdapter(),fallback_on:['adapter_unavailable']}),/invalid_fallback_policy/);
 const selection=selectAdapter({primary:adapter}),root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-integration-selector-'));
 try{assert.throws(()=>new ModelPortNightvoyage(path.join(root,'book'),{selection:{...selection}}),/invalid_model_selection/);assert.equal(fs.existsSync(path.join(root,'book')),false);}finally{fs.rmSync(root,{recursive:true,force:true});}
 await assert.rejects(new OfflineAggregateIntegrationAdapter({model_id:offlineAggregateIntegrationModel}).generate({}),/adapter_unavailable/);
});
test('fictional two scenes and wake persist, replay without dispatch and remain reasoning-free in the reader',async context=>{
 const environment=setupRuntime(context);let engine=environment.open();const id=environment.start(engine);await engine.execute(id);const result=engine.result(id),sourceRefs=envelopeSeed().sources.map(source=>({id:source.id,version:source.version}));
 assert.equal(result.receipt.status,'completed');assert.equal(environment.calls(),3);assert.equal(result.receipt.protocol_version,offlineAggregateIntegrationVersion);assert.equal(result.receipt.contract_version,dreamModelPortVersion);assert.equal(result.receipt.model_id,offlineAggregateIntegrationModel);assert.equal(result.receipt.external_calls_started,0);assert.equal(result.receipt.stage_dispatches_started,3);assert.equal(result.receipt.checkpoint.saved_scenes,2);assert.equal(result.receipt.checkpoint.wake_saved,true);assert.equal(result.receipt.validation_diagnostic,null);assert.equal(result.receipt.budget.money,'not_applicable_fake');
 assert.equal(result.dream.isRealityFact,false);assert.equal(result.dream.materialKind,'fictional');assert.equal(result.wake.origin,'wake_note');assert.equal(result.residue.origin,'simulated_affect');assert.deepEqual(result.dream.sourceRefs,sourceRefs);assert.deepEqual(result.wake.sourceRefs,sourceRefs);assert.equal(result.receipt.usage.length,3);for(const row of result.receipt.usage)assert.deepEqual(row.usage,{input_tokens:10,output_tokens:10,total_tokens:20});
 const original=engine.read(result.dream.id);engine.append(result.dream.id,'recollection','SYNTHETIC-INTEGRATION-LATER');engine.append(result.dream.id,'imagined_continuation','SYNTHETIC-INTEGRATION-CONTINUATION');assert.deepEqual(engine.read(result.dream.id),original);const cue=engine.recall('clock','synthetic-integration-cue',1);assert.equal(cue.length,1);assert.equal(cue[0].origin,'dream');assert.equal(cue[0].isRealityFact,false);
 const state=fs.readFileSync(path.join(environment.directory,'state.json'),'utf8');for(const secret of ['SYNTHETIC-AGGREGATE-REASONING','SYNTHETIC-ENCRYPTED-PRIVATE'])assert.ok(!state.includes(secret));engine.close();const book=runDreambook(['read','--latest','--data-dir',environment.directory]);assert.ok(book.includes(result.dream.scenes[0].event));assert.ok(!book.includes('SYNTHETIC-AGGREGATE-REASONING'));engine=environment.open();
 assert.equal(engine.start('replay-request','synthetic-integration',envelopeSeed()),id);await engine.execute(id);assert.equal(environment.calls(),3);assert.deepEqual(engine.read(result.dream.id),original);assert.deepEqual(engine.result(id).wake,result.wake);assert.throws(()=>engine.start('synthetic-integration','different-session',envelopeSeed()),/request_conflict/);
});
test('second-scene rejection keeps only the first checkpoint and exposes a closed envelope diagnostic',async context=>{
 let stage=0;const environment=setupRuntime(context,draft=>aggregateTranscript(draft,undefined,events=>{if(++stage===2)events[2].type='synthetic.unknown';}));let engine=environment.open();const id=environment.start(engine);await engine.execute(id);
 assert.equal(engine.status(id).status,'failed');assert.equal(engine.status(id).stagesSaved,1);assert.equal(environment.calls(),2);assert.equal(engine.result(id).dream,null);assert.deepEqual(engine.status(id).validation_diagnostic,{schemaVersion:1,layer:'responses_envelope',check:'unknown_event'});assert.equal(engine.status(id).usage[1].usage,'unknown');await assert.rejects(engine.resume(id),/ambiguous_attempt/);
 engine.close();engine=environment.open();await engine.execute(id);assert.equal(environment.calls(),2);
});
test('a committed scene checkpoint resumes explicitly without repeating the first dispatch',async context=>{
 let crashing=true;const environment=setupRuntime(context,draft=>aggregateTranscript(draft),point=>{if(point==='port_scene_saved'&&crashing){crashing=false;throw Error('synthetic_checkpoint_interruption');}});let engine=environment.open();const id=environment.start(engine);await engine.execute(id);const firstScene=structuredClone(engine.run(id).scenes[0]);assert.equal(environment.calls(),1);engine.close();
 engine=environment.open();await engine.resume(id);assert.equal(environment.calls(),3);assert.equal(engine.status(id).status,'completed');assert.deepEqual(engine.result(id).dream.scenes[0],firstScene);
});
for(const mode of ['cancel','timeout','withdraw'])test(`${mode} suppresses a late partial stream and permits no later dispatch`,async context=>{
 let entered,release;const ready=new Promise(resolve=>{entered=resolve;}),environment=setupRuntime(context,draft=>(async function*(){const chunks=aggregateTranscript(draft);yield chunks[0];entered();await new Promise(resolve=>{release=resolve;});yield* chunks.slice(1);})());let engine=environment.open();const id=environment.start(engine,'partial',{timeoutMs:20}),work=engine.execute(id);await ready;
 if(mode==='cancel')engine.cancel(id);if(mode==='timeout')await tick();if(mode==='withdraw')engine.withdraw(envelopeSeed().sources[0].id);if(mode==='withdraw')release();await work;if(mode!=='withdraw')release();await tick();
 assert.equal(engine.result(id).dream,null);assert.equal(engine.status(id).stagesSaved,0);assert.equal(environment.calls(),1);assert.equal(engine.status(id).cancellation.remote_confirmed,'unknown');engine.close();engine=environment.open();await engine.execute(id);assert.equal(environment.calls(),1);
});
test('source withdrawal suppresses dream, recall, replay and reader exposure across reopen',async context=>{
 const environment=setupRuntime(context);let engine=environment.open();const id=environment.start(engine);await engine.execute(id);const result=engine.result(id);engine.withdraw(envelopeSeed().sources[0].id);engine.close();
 const book=runDreambook(['read','--latest','--data-dir',environment.directory]);engine=environment.open();assert.equal(engine.result(id).dream,null);assert.deepEqual(engine.list(),[]);assert.deepEqual(engine.recall('clock','synthetic-integration-cue',1),[]);assert.ok(!book.includes(result.dream.scenes[0].event));await engine.execute(id);assert.equal(environment.calls(),3);
 const state=fs.readFileSync(path.join(environment.directory,'state.json'),'utf8');for(const body of [envelopeSeed().sources[0].text,result.dream.scenes[0].event,result.wake.fragment,'SYNTHETIC-INTEGRATION-LATER'])assert.ok(!state.includes(body));
});
test('checkpoint persistence failure leaves no committed scene or usage after reopen',async context=>{
 const environment=setupRuntime(context);let engine=environment.open();const id=environment.start(engine),save=engine.store.save.bind(engine.store);engine.store.save=()=>{if(engine.run(id).scenes.length===1)fs.mkdirSync(path.join(environment.directory,'snapshot.tmp'));return save();};
 await assert.rejects(engine.execute(id),/storage_io_failure/);assert.equal(environment.calls(),1);engine.close();fs.rmdirSync(path.join(environment.directory,'snapshot.tmp'));engine=environment.open();assert.equal(engine.status(id).status,'uncertain');assert.equal(engine.status(id).stagesSaved,0);assert.equal(engine.status(id).usage[0].usage,'unknown');assert.equal(engine.result(id).dream,null);await assert.rejects(engine.resume(id),/ambiguous_attempt/);
});
test('bounded HTTP wrapper rejects non-byte simulator output without invoking a decoder',async()=>{
 await assert.rejects(async()=>{for await(const chunk of boundedOfflineAggregateChunks(['not-bytes']))void chunk;},error=>envelopeDiagnostic(error)?.layer==='http'&&envelopeDiagnostic(error)?.check==='http_stream_chunk_invalid');
});
