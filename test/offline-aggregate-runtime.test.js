import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {OfflineAggregatePlanAdapter,selectAdapter,FakeAdapter} from '../scripts/offline-aggregate-model-port.mjs';
import {OfflineEnvelopePlanAdapter} from '../scripts/offline-envelope-model-port.mjs';
import {EnvelopePlanAdapter} from '../scripts/envelope-plan-model-port.mjs';
import {ModelPortNightvoyage} from '../scripts/offline-aggregate-model-runtime.mjs';
import {envelopeSeed,aggregateTranscript} from '../test-support/offline-aggregate-fixtures.js';
import {envelopeTrialProposal} from '../scripts/envelope-plan-trial.mjs';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function setup(t,simulator=d=>aggregateTranscript(d),fault=()=>{}){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-aggregate-')),directory=path.join(root,'book');let engine,calls=0;
 const adapter=new OfflineAggregatePlanAdapter({model_id:'synthetic-aggregate-model',simulator:(draft,control)=>{calls++;return simulator(draft,control);}}),open=()=>engine=new ModelPortNightvoyage(directory,{selection:selectAdapter({primary:adapter}),fault});
 t.after(()=>{engine?.close();fs.rmSync(root,{recursive:true,force:true});});return {directory,adapter,open,calls:()=>calls};
}
const start=(e,id='synthetic-aggregate',config)=>e.start(id,id,envelopeSeed(),config);
test('dense three-stage loop persists typed nonfacts and usage, reopens and deduplicates without reasoning',async t=>{
 const env=setup(t);let e=env.open();const id=start(e);await e.execute(id);const result=e.result(id),original=e.read(result.dream.id);
 assert.equal(result.receipt.status,'completed');assert.equal(env.calls(),3);assert.equal(result.receipt.protocol_version,'offline-aggregate-envelope-v1');assert.equal(result.receipt.external_calls_started,0);assert.equal(result.receipt.stage_dispatches_started,3);assert.equal(result.receipt.checkpoint.saved_scenes,2);assert.equal(result.receipt.checkpoint.wake_saved,true);assert.equal(result.receipt.budget.money,'not_applicable_fake');
 for(const part of [result.dream,result.wake,result.residue]){assert.equal(part.isRealityFact,false);assert.equal(part.materialKind,'fictional');assert.deepEqual(part.sourceRefs,result.dream.sourceRefs);}
 for(const usage of result.receipt.usage)assert.deepEqual(usage.usage,{input_tokens:10,output_tokens:10,total_tokens:20});
 e.append(result.dream.id,'recollection','独立虚构的后来回想');e.append(result.dream.id,'imagined_continuation','独立虚构的想象续写');assert.deepEqual(e.read(result.dream.id),original);
 const cue=e.recall('clock','synthetic-cue',1);assert.equal(cue.length,1);assert.equal(cue[0].origin,'dream');assert.equal(cue[0].isRealityFact,false);
 e.close();e=env.open();assert.equal(start(e),id);await e.execute(id);assert.equal(env.calls(),3);assert.deepEqual(e.read(result.dream.id),original);assert.deepEqual(e.result(id).wake,result.wake);
 assert.equal(e.start('other-request','synthetic-aggregate',envelopeSeed()),id);await e.execute(id);assert.equal(env.calls(),3);
 assert.throws(()=>e.start('synthetic-aggregate','other-session',envelopeSeed()),/request_conflict/);
 const disk=fs.readFileSync(path.join(env.directory,'state.json'),'utf8');for(const s of ['SYNTHETIC-AGGREGATE-REASONING','SYNTHETIC-ENCRYPTED-PRIVATE','synthetic-reasoning'])assert.ok(!disk.includes(s));
});
test('candidate selector is Fake by default, rejects live/old adapters, authority, getters and forged selection',async t=>{
 const env=setup(t);assert.equal(selectAdapter().adapter.identity.adapter_kind,'FakeAdapter');assert.equal(new OfflineAggregatePlanAdapter().preflight().ready,false);
 for(const options of [{httpTransport:{}},{endpoint:'https://synthetic.invalid'},{apiKey:'SYNTHETIC'},{model_id:null},{simulator:1}])assert.throws(()=>new OfflineAggregatePlanAdapter(options));
 let touched=false;assert.throws(()=>new OfflineAggregatePlanAdapter({get simulator(){touched=true;}}));assert.throws(()=>selectAdapter({get primary(){touched=true;}}));assert.equal(touched,false);
 for(const primary of [null,new EnvelopePlanAdapter(),new OfflineEnvelopePlanAdapter()])assert.throws(()=>selectAdapter({primary}),/invalid_model_selection/);
 assert.throws(()=>selectAdapter({primary:env.adapter,fallback:new FakeAdapter(),fallback_on:['adapter_unavailable']}),/invalid_fallback_policy/);
 const selection=selectAdapter({primary:env.adapter});assert.throws(()=>new ModelPortNightvoyage(env.directory,{selection:{...selection}}),/invalid_model_selection/);assert.equal(fs.existsSync(env.directory),false);
 await assert.rejects(new OfflineAggregatePlanAdapter().generate({}),/adapter_unavailable/);
});
test('second-scene protocol rejection preserves first checkpoint and closed diagnostic with no repair or switch',async t=>{
 let n=0;const env=setup(t,d=>aggregateTranscript(d,undefined,events=>{if(++n===2)events[2].type='synthetic.unknown';}));let e=env.open();const id=start(e);await e.execute(id);
 assert.equal(e.status(id).status,'failed');assert.equal(e.status(id).stagesSaved,1);assert.equal(env.calls(),2);assert.equal(e.result(id).dream,null);assert.equal(e.status(id).validation_diagnostic.check,'unknown_event');assert.equal(e.status(id).usage[1].usage,'unknown');e.close();
 assert.throws(()=>new ModelPortNightvoyage(env.directory,{selection:selectAdapter()}),/foreign_execution_owner/);
 assert.throws(()=>new ModelPortNightvoyage(env.directory,{selection:selectAdapter({primary:new OfflineAggregatePlanAdapter({model_id:'synthetic-other-model',simulator:aggregateTranscript})})}),/foreign_execution_owner/);
 e=env.open();await assert.rejects(e.resume(id),/ambiguous_attempt/);await e.execute(id);assert.equal(env.calls(),2);
});
test('saved checkpoint resumes explicitly under the same candidate without repeating scene one',async t=>{
 let stop=true;const env=setup(t,d=>aggregateTranscript(d),point=>{if(point==='port_scene_saved'&&stop){stop=false;throw Error('simulated_crash');}});let e=env.open();const id=start(e);await e.execute(id);const scene=structuredClone(e.run(id).scenes[0]);assert.equal(env.calls(),1);e.close();
 e=env.open();await e.execute(id);assert.equal(env.calls(),1);await e.resume(id);assert.equal(env.calls(),3);assert.equal(e.status(id).status,'completed');assert.deepEqual(e.result(id).dream.scenes[0],scene);
});
for(const point of ['port_dispatched','port_scene_saved'])test(`actual child death at ${point} retains durable intent/checkpoint and never repeats automatically`,async t=>{
 const env=setup(t),runtime=new URL('../scripts/offline-aggregate-model-runtime.mjs',import.meta.url).href,port=new URL('../scripts/offline-aggregate-model-port.mjs',import.meta.url).href,fixture=new URL('../test-support/offline-aggregate-fixtures.js',import.meta.url).href;
 const child=spawnSync(process.execPath,['--input-type=module','-e',`import {ModelPortNightvoyage} from ${JSON.stringify(runtime)};import {OfflineAggregatePlanAdapter,selectAdapter} from ${JSON.stringify(port)};import {envelopeSeed,aggregateTranscript} from ${JSON.stringify(fixture)};const adapter=new OfflineAggregatePlanAdapter({model_id:'synthetic-aggregate-model',simulator:d=>aggregateTranscript(d)});const e=new ModelPortNightvoyage(process.argv[1],{selection:selectAdapter({primary:adapter}),fault:p=>{if(p===process.argv[2])process.exit(74);}});await e.execute(e.start('child','child',envelopeSeed()));`,env.directory,point],{encoding:'utf8'});
 assert.equal(child.status,74,child.stderr);const e=env.open(),id=start(e,'child');assert.equal(e.status(id).status,'uncertain');await e.execute(id);assert.equal(env.calls(),0);assert.equal(e.status(id).stage_dispatches_started,1);
 if(point==='port_scene_saved'){await e.resume(id);assert.equal(env.calls(),2);assert.equal(e.status(id).status,'completed');}else{await assert.rejects(e.resume(id),/ambiguous_attempt/);assert.equal(env.calls(),0);}
});
test('budgets and request replay cannot add stages or turn local byte guards into token usage',async t=>{
 const env=setup(t),e=env.open(),id=start(e,'single',{maxCalls:1});await e.execute(id);assert.equal(env.calls(),1);assert.equal(e.status(id).stagesSaved,1);await e.resume(id);assert.equal(e.status(id).error,'budget_exhausted');assert.equal(env.calls(),1);
 for(const [name,limits,expected]of [['input',{inputTokens:1},0],['output',{perCallOutput:1},1]]){const before=env.calls(),run=start(e,name,limits);await e.execute(run);assert.equal(env.calls()-before,expected);assert.equal(e.result(run).dream,null);assert.equal(e.status(run).budget.units,'UTF-8 JSON bytes; not model tokens');}
});
for(const mode of ['cancel','timeout','withdraw'])test(`${mode} suppresses noncooperative late partial stream and blocks automatic continuation`,async t=>{
 let entered,release;const ready=new Promise(r=>entered=r),env=setup(t,d=>(async function*(){const chunks=aggregateTranscript(d);yield chunks[0];entered();await new Promise(r=>release=r);yield* chunks.slice(1);})());let e=env.open();const id=start(e,mode,{timeoutMs:mode==='timeout'?20:2000}),work=e.execute(id);await ready;
 if(mode==='cancel')e.cancel(id);if(mode==='withdraw')e.store.withdraw(envelopeSeed().sources[0].id);
 if(mode==='withdraw')release();await work;if(mode!=='withdraw')release();await tick();
 assert.equal(e.result(id).dream,null);assert.equal(e.status(id).stagesSaved,0);assert.equal(env.calls(),1);assert.equal(e.status(id).cancellation.remote_confirmed,'unknown');e.close();e=env.open();await e.execute(id);assert.equal(env.calls(),1);
});
test('queued cancellation and cancellation after scene commit prevent any subsequent dispatch',async t=>{
 let e,id;const env=setup(t,d=>aggregateTranscript(d),p=>{if(p==='port_scene_saved')e.cancel(id);});e=env.open();const queued=start(e,'queued');e.cancel(queued);await e.execute(queued);assert.equal(env.calls(),0);await assert.rejects(e.resume(queued),/not_resumable/);
 id=start(e,'saved');await e.execute(id);assert.equal(env.calls(),1);assert.equal(e.status(id).stagesSaved,1);assert.equal(e.status(id).status,'cancelled');await assert.rejects(e.resume(id),/not_resumable/);
});
test('withdrawal purges source, dream, derivatives and cached recall across reopen',async t=>{
 const env=setup(t);let e=env.open();const id=start(e);await e.execute(id);const r=e.result(id),source=envelopeSeed().sources[0];
 e.append(r.dream.id,'recollection','SYNTHETIC-LATER-RECALL');e.append(r.dream.id,'imagined_continuation','SYNTHETIC-LATER-CONTINUATION');assert.equal(e.recall('clock','cached',1).length,1);e.withdraw(source.id);e.close();e=env.open();
 assert.equal(e.result(id).dream,null);assert.deepEqual(e.list(),[]);assert.deepEqual(e.recall('clock','cached',1),[]);assert.throws(()=>start(e),/source_withdrawn/);await e.execute(id);assert.equal(env.calls(),3);
 const disk=fs.readFileSync(path.join(env.directory,'state.json'),'utf8');for(const body of [source.text,r.dream.scenes[0].event,r.wake.fragment,'SYNTHETIC-LATER-RECALL','SYNTHETIC-LATER-CONTINUATION'])assert.ok(!disk.includes(body));
});
test('storage failure before dispatch and second owner prevent simulation',async t=>{
 const env=setup(t),e=env.open(),id=start(e);assert.throws(()=>new ModelPortNightvoyage(env.directory,{selection:selectAdapter({primary:env.adapter})}),/store_busy/);
 fs.mkdirSync(path.join(env.directory,'snapshot.tmp'));await assert.rejects(e.execute(id),/storage_io_failure/);assert.equal(env.calls(),0);
});
test('checkpoint save failure retains unknown usage and exposes no uncommitted scene after reopen',async t=>{
 const env=setup(t);let e=env.open();const id=start(e),save=e.store.save.bind(e.store);e.store.save=()=>{if(e.run(id).scenes.length===1)fs.mkdirSync(path.join(env.directory,'snapshot.tmp'));return save();};
 await assert.rejects(e.execute(id),/storage_io_failure/);assert.equal(env.calls(),1);e.close();fs.rmdirSync(path.join(env.directory,'snapshot.tmp'));e=env.open();assert.equal(e.status(id).status,'uncertain');assert.equal(e.status(id).stagesSaved,0);assert.equal(e.status(id).usage[0].usage,'unknown');assert.equal(e.result(id).dream,null);await assert.rejects(e.resume(id),/ambiguous_attempt/);
});
test('wrapper preserves existing runtime algorithm and current real trial source closure',()=>{
 const read=p=>fs.readFileSync(new URL(`../scripts/${p}`,import.meta.url),'utf8');
 const expected=read('dream-model-runtime.mjs').replace("from './dream-model-port.mjs'","from './offline-aggregate-model-port.mjs'").replace("import {planResponseDiagnostic,reviewedPlanResponseDiagnostic} from './plan-response-diagnostic.mjs';","import {envelopeDiagnostic as planResponseDiagnostic,reviewedEnvelopeDiagnostic as reviewedPlanResponseDiagnostic} from './envelope-diagnostic.mjs';");
 assert.equal(read('offline-aggregate-model-runtime.mjs'),expected);assert.equal(envelopeTrialProposal().protocol_version,'chatgpt-plan-reasoning-envelope-http-v1');
});
