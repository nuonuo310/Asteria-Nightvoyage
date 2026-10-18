import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {Store} from '../src/store.js';
import {withSyntheticNativeEnvelope,nativeEnvelopeSeed} from '../test-support/envelope-native-fixtures.js';
import {envelopeTranscript} from '../test-support/offline-envelope-runtime-fixtures.js';
import {createEnvelopeHttpTransport} from '../scripts/envelope-plan-http.mjs';
import {EnvelopePlanAdapter,selectAdapter,FakeAdapter,CodexAdapter} from '../scripts/envelope-plan-model-port.mjs';
import {MissingTypePlanAdapter} from '../scripts/missing-type-model-port.mjs';
import {readModelPortContent} from '../scripts/envelope-plan-content-view.mjs';
import {ModelPortNightvoyage} from '../scripts/envelope-plan-model-runtime.mjs';
import {envelopeNativeComponentReview} from '../scripts/envelope-native-review.mjs';
const tick=()=>new Promise(r=>setImmediate(r));

test('native components use synthetic OAuth/HTTP for two scenes/wake and credential-free persisted reading',async()=>{
 let bodies,receipt;
 const {authorization,modelAdapter}=await withSyntheticNativeEnvelope(async({engine,input,http,directory})=>{
  const id=engine.start('native-synthetic','native-synthetic',input);await engine.execute(id);const r=engine.result(id);receipt=r.receipt;
  assert.equal(receipt.status,'completed');assert.equal(receipt.protocol_version,'chatgpt-plan-reasoning-envelope-http-v1');assert.equal(receipt.model_id,'gpt-5.6-sol');assert.equal(receipt.auth_mode,'chatgpt_plan');assert.equal(receipt.provider_kind,'openai');assert.equal(receipt.external_calls_started,3);assert.equal(receipt.checkpoint.saved_scenes,2);assert.equal(receipt.checkpoint.wake_saved,true);assert.equal(receipt.budget.money,'unknown');
  assert.equal(receipt.usage.length,3);assert.deepEqual(receipt.usage[0].usage,{input_tokens:10,output_tokens:10,total_tokens:20});assert.equal(r.dream.isRealityFact,false);assert.equal(r.wake.origin,'wake_note');assert.equal(r.residue.origin,'simulated_affect');
  const original=engine.read(r.dream.id),wake=structuredClone(r.wake);await engine.execute(id);assert.equal(engine.start('other-request','native-synthetic',input),id);await engine.execute(id);assert.equal(http.bodies.length,3);
  engine.close();const store=new Store(directory);try{const view=readModelPortContent(store,r.dream.id);assert.equal(view.narrative.dream.origin,'dream');assert.deepEqual(view.narrative.wake,wake);assert.deepEqual(store.state.entries[r.dream.id],original);}finally{store.close();}
  const disk=fs.readFileSync(path.join(directory,'state.json'),'utf8');for(const s of ['SYNTHETIC-TRIAL-ACCESS','SYNTHETIC-TRIAL-REFRESH','SYNTHETIC-REASONING-PRIVATE','SYNTHETIC-ENCRYPTED-PRIVATE','synthetic-reasoning'])assert.ok(!disk.includes(s));bodies=http.bodies;
  for(const body of bodies){assert.deepEqual(Object.keys(body),['model','instructions','input','store','stream']);assert.equal(body.store,false);assert.equal(body.stream,true);assert.equal(body.model,'gpt-5.6-sol');}
  return {syntheticCompleted:true};
 });
 assert.equal(authorization.status,'plan_action_finished');assert.equal(authorization.remoteRevocationConfirmed,true);assert.equal(modelAdapter.preflight().ready,false);assert.equal(bodies.length,3);assert.equal(receipt.fallback_from,null);
});
test('native factory refuses absent, forged, mixed or broadened authority before fetch',()=>{
 let calls=0;const saved=globalThis.fetch;globalThis.fetch=()=>{calls++;throw Error('UNEXPECTED');};try{
  assert.equal(new EnvelopePlanAdapter().preflight().ready,false);assert.equal(selectAdapter().adapter.identity.adapter_kind,'FakeAdapter');
  for(const options of [{},{session:{},model:'gpt-5.6-sol',authorize(){},allowMissingContentType:true,allowReasoningDiscard:true},{session:{},model:'gpt-5.6-sol',authorize(){},allowMissingContentType:true,allowReasoningDiscard:false}])assert.throws(()=>createEnvelopeHttpTransport(options));
  for(const options of [{httpTransport:{ready:()=>true}},{model_id:'other'},{simulator:()=>[]},{apiKey:'SYNTHETIC-PRIVATE'},{endpoint:'https://invalid.example'}])assert.throws(()=>new EnvelopePlanAdapter(options));
  let touched=false;assert.throws(()=>new EnvelopePlanAdapter({get httpTransport(){touched=true;}}));assert.throws(()=>selectAdapter({get primary(){touched=true;}}));assert.equal(touched,false);assert.equal(calls,0);
 }finally{globalThis.fetch=saved;}
});
test('new branded transport cannot impersonate old adapter or silently choose Codex',async()=>{
 await withSyntheticNativeEnvelope(async({transport,adapter,directory})=>{
  assert.throws(()=>new MissingTypePlanAdapter({model_id:'gpt-5.6-sol',httpTransport:transport}),/unreviewed_model_adapter/);
  assert.throws(()=>selectAdapter({primary:adapter,fallback:new CodexAdapter(),fallback_on:['authorization_required']}),/invalid_fallback_policy/);
  assert.throws(()=>new ModelPortNightvoyage(directory,{selection:{...selectAdapter({primary:adapter})}}),/invalid_model_selection/);return {synthetic:true};
 });
});
test('fictional no-egress fixture is not silently granted permission by the native adapter',async()=>{
 await withSyntheticNativeEnvelope(async({engine,input,http})=>{for(const s of input.sources)s.grant.modelEgress=false;const id=engine.start('no-egress','no-egress',input);await engine.execute(id);assert.equal(engine.status(id).status,'failed');assert.equal(engine.status(id).external_calls_started,0);assert.equal(http.bodies.length,0);return {synthetic:true};});
 const fixture=nativeEnvelopeSeed();assert.equal(fixture.materialKind,'fictional');
});
test('second-stage structural rejection keeps first checkpoint and cannot resume or repeat HTTP',async()=>{
 const {authorization}=await withSyntheticNativeEnvelope(async({engine,input,http})=>{
  const id=engine.start('second','second',input);await engine.execute(id);assert.equal(engine.status(id).stagesSaved,1);assert.equal(engine.status(id).external_calls_started,2);assert.equal(engine.result(id).dream,null);assert.equal(http.bodies.length,2);await assert.rejects(engine.resume(id),/ambiguous_attempt/);await engine.execute(id);assert.equal(http.bodies.length,2);return {synthetic:true};
 },{onGenerate:(body,opts,n)=>new Response(Buffer.concat(envelopeTranscript({body},undefined,events=>{if(n===2)events[0].item.type='function_call';})))});
 assert.equal(authorization.remoteRevocationConfirmed,true);
});
test('explicit HTML header, incomplete stream and invalid usage do not publish or retry',async()=>{
 for(const kind of ['html','incomplete','usage'])await withSyntheticNativeEnvelope(async({engine,input,http})=>{
  const id=engine.start(kind,kind,input);await engine.execute(id);assert.equal(engine.status(id).external_calls_started,1);assert.equal(engine.status(id).stagesSaved,0);assert.equal(engine.result(id).dream,null);assert.equal(http.bodies.length,1);return {synthetic:true};
 },{onGenerate:body=>{const chunks=envelopeTranscript({body},undefined,events=>{if(kind==='usage')events.at(-1).response.usage.total_tokens=99;if(kind==='incomplete')events.pop();});return new Response(Buffer.concat(chunks),kind==='html'?{headers:{'Content-Type':'text/html'}}:undefined);}});
});
test('cancellation suppresses noncooperative HTTP and late parsed output without another stage',async()=>{
 let release,entered;const ready=new Promise(r=>entered=r);
 const result=await withSyntheticNativeEnvelope(async({engine,input,http})=>{
  const id=engine.start('cancel','cancel',input),work=engine.execute(id);await Promise.race([ready,work.then(()=>{throw Error('synthetic_dispatch_not_reached');})]);engine.cancel(id);await work;release();await tick();assert.equal(engine.status(id).status,'cancelled');assert.equal(engine.result(id).dream,null);assert.equal(http.bodies.length,1);assert.equal(engine.status(id).cancellation.remote_confirmed,'unknown');return {synthetic:true};
 },{onGenerate:body=>{entered();return new Promise(r=>release=()=>r(new Response(Buffer.concat(envelopeTranscript({body})))));}});
 assert.equal(result.authorization.remoteRevocationConfirmed,true);
});
test('withdrawal before a late native response suppresses bodies, projection and replay after reopen',async()=>{
 let release,entered;const ready=new Promise(r=>entered=r);
 await withSyntheticNativeEnvelope(async({engine,input,http,directory})=>{
  const id=engine.start('withdraw','withdraw',input),work=engine.execute(id);await Promise.race([ready,work.then(()=>{throw Error('synthetic_dispatch_not_reached');})]);engine.store.withdraw(input.sources[0].id);release();await work;assert.equal(engine.result(id).dream,null);assert.equal(http.bodies.length,1);engine.close();
  const store=new Store(directory);try{assert.equal(readModelPortContent(store,`dream-${id}`),null);assert.deepEqual(Object.keys(store.state.entries),[]);}finally{store.close();}assert.ok(!fs.readFileSync(path.join(directory,'state.json'),'utf8').includes(input.sources[0].text));return {synthetic:true};
 },{onGenerate:body=>{entered();return new Promise(r=>release=()=>r(new Response(Buffer.concat(envelopeTranscript({body})))));}});
});
test('native runtime and reader are guarded exact deltas; no existing provider source is overwritten',()=>{
 const read=p=>fs.readFileSync(new URL(`../scripts/${p}`,import.meta.url),'utf8');
 assert.equal(read('envelope-plan-model-runtime.mjs'),read('dream-model-runtime.mjs').replace("from './dream-model-port.mjs'","from './envelope-plan-model-port.mjs'"));
 assert.equal(read('envelope-plan-content-view.mjs'),read('offline-envelope-content-view.mjs').replace("['chatgpt-plan-inline-http-v1','chatgpt-plan-inline-missing-type-v1']","['chatgpt-plan-inline-http-v1','chatgpt-plan-inline-missing-type-v1','chatgpt-plan-reasoning-envelope-http-v1']"));
});
test('read-only source inventory is deterministic and cannot be mistaken for a runnable grant',()=>{
 const r=envelopeNativeComponentReview();assert.deepEqual(r,envelopeNativeComponentReview());assert.equal(r.dispatchEnabled,false);assert.equal(r.realTrialEntryAvailable,false);assert.equal(r.userApprovalRecorded,false);assert.equal(r.fixtureEgressApproved,false);assert.equal(r.requiresFreshUserConsent,true);assert.equal(r.model_id,'gpt-5.6-sol');assert.equal(r.proposedMaxExternalIntents,3);assert.equal(r.proposedServerOutputTokenCap,null);assert.equal(r.priorGrantReuse,false);
 for(const file of ['scripts/envelope-plan-http.mjs','scripts/offline-plan-envelope.mjs','scripts/missing-type-plan-http.mjs','scripts/chatgpt-plan-login.mjs','src/engine.js','src/store.js'])assert.match(r.sourcePins[file],/^[a-f0-9]{64}$/);
 assert.ok(r.pending.includes('candidate_specific_closed_diagnostics'));assert.ok(Object.keys(r.sourcePins).every(p=>!path.isAbsolute(p)&&!p.startsWith('../')));
});
