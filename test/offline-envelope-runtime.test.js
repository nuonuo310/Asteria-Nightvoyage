import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {OfflineEnvelopePlanAdapter,selectAdapter,FakeAdapter,CodexAdapter} from '../scripts/offline-envelope-model-port.mjs';
import {selectAdapter as selectOriginal} from '../scripts/dream-model-port.mjs';
import {ModelPortNightvoyage} from '../scripts/offline-envelope-model-runtime.mjs';
import {readModelPortContent} from '../scripts/offline-envelope-content-view.mjs';
import {runDreambook} from '../scripts/dreambook.mjs';
import {envelopeSeed,envelopeTranscript} from '../test-support/offline-envelope-runtime-fixtures.js';
const turn=()=>new Promise(r=>setImmediate(r));
function setup(t,simulator=d=>envelopeTranscript(d),{fault,model_id='fiction-envelope-model'}={}){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-envelope-runtime-')),directory=path.join(root,'book');let engine,calls=0;
 const adapter=new OfflineEnvelopePlanAdapter({model_id,simulator:async(d,c)=>{calls++;return simulator(d,c);}});
 const open=()=>engine=new ModelPortNightvoyage(directory,{selection:selectAdapter({primary:adapter}),fault});
 t.after(()=>{engine?.close();fs.rmSync(root,{recursive:true,force:true});});return {root,directory,adapter,open,calls:()=>calls};
}
const start=(engine,id='synthetic-envelope',settings)=>engine.start(id,id,envelopeSeed(),settings);

test('simulator persists typed scenes/wake, normalized usage and identity with no reasoning or external intent',async t=>{
 const env=setup(t,d=>envelopeTranscript(d));let e=env.open();const id=start(e);await e.execute(id);const r=e.result(id);
 assert.equal(r.receipt.status,'completed');assert.equal(env.calls(),3);assert.equal(r.receipt.stage_dispatches_started,3);assert.equal(r.receipt.external_calls_started,0);assert.equal(r.receipt.protocol_version,'offline-plan-reasoning-envelope-v1');assert.equal(r.receipt.auth_mode,'synthetic_stub');assert.equal(r.receipt.provider_kind,'openai_protocol_simulator');
 assert.equal(r.receipt.checkpoint.saved_scenes,2);assert.equal(r.receipt.checkpoint.wake_saved,true);assert.equal(r.receipt.budget.money,'not_applicable_fake');assert.equal(r.receipt.usage.length,3);
 for(const row of r.receipt.usage)assert.deepEqual(row.usage,{input_tokens:10,output_tokens:10,total_tokens:20});
 for(const v of [r.dream,r.wake,r.residue]){assert.equal(v.materialKind,'fictional');assert.equal(v.isRealityFact,false);assert.deepEqual(v.sourceRefs,r.dream.sourceRefs);}
 const returnedOriginal=structuredClone(r.dream),original=e.read(r.dream.id),wake=structuredClone(r.wake);
 for(const kind of ['recollection','imagined_continuation'])e.append(r.dream.id,kind,'独立虚构的后来内容。');assert.deepEqual(e.read(r.dream.id),original);
 const projection=readModelPortContent(e.store,r.dream.id);projection.narrative.dream.scenes[0].event='mutated detached view';assert.deepEqual(e.read(r.dream.id),original);
 e.close();e=env.open();assert.equal(start(e),id);await e.execute(id);assert.equal(env.calls(),3);assert.deepEqual(e.result(id).dream,returnedOriginal);assert.deepEqual(e.read(r.dream.id),original);assert.deepEqual(e.result(id).wake,wake);
 assert.equal(e.start('duplicate-session-request','synthetic-envelope',envelopeSeed()),id);await e.execute(id);assert.equal(env.calls(),3);
 assert.throws(()=>e.start('synthetic-envelope','changed',envelopeSeed()),/request_conflict/);
 const disk=fs.readFileSync(path.join(env.directory,'state.json'),'utf8');for(const s of ['SYNTHETIC-REASONING-PRIVATE','SYNTHETIC-ENCRYPTED-PRIVATE','synthetic-reasoning','not released early'])assert.ok(!disk.includes(s));
});
test('default stays Fake; candidate has no live constructor option, getter evaluation or forged selection',async t=>{
 const env=setup(t);assert.equal(selectAdapter().adapter.identity.adapter_kind,'FakeAdapter');assert.equal(new OfflineEnvelopePlanAdapter().preflight().ready,false);
 assert.throws(()=>new ModelPortNightvoyage(env.directory,{selection:selectAdapter({primary:new OfflineEnvelopePlanAdapter()})}),/adapter_unavailable/);assert.equal(fs.existsSync(env.directory),false);
 for(const extra of [{httpTransport:{}},{endpoint:'https://invalid.example'},{apiKey:'SYNTHETIC-PRIVATE'},{model_id:null},{simulator:'not function'}])assert.throws(()=>new OfflineEnvelopePlanAdapter(extra));
 let touched=false;assert.throws(()=>new OfflineEnvelopePlanAdapter({get simulator(){touched=true;return envelopeTranscript;}}));assert.equal(touched,false);
 const candidate=selectAdapter({primary:env.adapter});assert.throws(()=>new ModelPortNightvoyage(env.directory,{selection:{...candidate}}),/invalid_model_selection/);
 assert.throws(()=>selectOriginal({primary:env.adapter}));assert.throws(()=>selectAdapter({primary:env.adapter,fallback:new CodexAdapter(),fallback_on:['adapter_unavailable']}),/invalid_fallback_policy/);
 await assert.rejects(new OfflineEnvelopePlanAdapter().generate({}),/adapter_unavailable/);
});
test('first scene pins candidate and model; second rejection stops without fallback or repair',async t=>{
 let n=0;const env=setup(t,d=>{n++;return envelopeTranscript(d,undefined,events=>{if(n===2)events[0].item.type='function_call';});});let e=env.open();const id=start(e);await e.execute(id);
 assert.equal(e.status(id).status,'failed');assert.equal(e.status(id).stagesSaved,1);assert.equal(env.calls(),2);assert.equal(e.status(id).stage_dispatches_started,2);assert.equal(e.status(id).fallback_from,null);e.close();
 assert.throws(()=>new ModelPortNightvoyage(env.directory,{selection:selectAdapter({primary:new FakeAdapter()})}),/foreign_execution_owner/);
 assert.throws(()=>new ModelPortNightvoyage(env.directory,{selection:selectAdapter({primary:new OfflineEnvelopePlanAdapter({model_id:'other',simulator:envelopeTranscript})})}),/foreign_execution_owner/);
 e=env.open();await assert.rejects(e.resume(id),/ambiguous_attempt/);assert.equal(start(e),id);await e.execute(id);assert.equal(env.calls(),2);assert.equal(e.result(id).dream,null);
});
test('ungrounded wake invention cannot publish a dream or trigger repair',async t=>{
 const env=setup(t,d=>envelopeTranscript(d,JSON.parse(d.body.input[0].content).stage==='wake'?{fragment:'独立虚构的新结局。',residue:.1,associations:[]}:undefined));const e=env.open(),id=start(e);await e.execute(id);
 assert.equal(e.status(id).stagesSaved,2);assert.equal(env.calls(),3);assert.equal(e.result(id).dream,null);await assert.rejects(e.resume(id),/ambiguous_attempt/);assert.equal(env.calls(),3);
});
test('durable scene checkpoint resumes explicitly with the same candidate without regenerating scene one',async t=>{
 let stop=true;const env=setup(t,d=>envelopeTranscript(d),{fault:p=>{if(p==='port_scene_saved'&&stop){stop=false;throw Error('simulated_crash');}}});let e=env.open();const id=start(e);await e.execute(id);const saved=structuredClone(e.run(id).scenes[0]);assert.equal(env.calls(),1);e.close();
 e=env.open();await e.execute(id);assert.equal(env.calls(),1);await e.resume(id);assert.equal(e.status(id).status,'completed');assert.equal(env.calls(),3);assert.deepEqual(e.result(id).dream.scenes[0],saved);
});
for(const [point,exitCode,expectedCalls,resumable] of [['port_dispatched',71,1,false],['port_scene_saved',72,1,true]])test(`actual child exit at ${point} preserves durable accounting and explicit recovery boundary`,async t=>{
 const env=setup(t,d=>envelopeTranscript(d)),runtime=new URL('../scripts/offline-envelope-model-runtime.mjs',import.meta.url).href,port=new URL('../scripts/offline-envelope-model-port.mjs',import.meta.url).href,fixtures=new URL('../test-support/offline-envelope-runtime-fixtures.js',import.meta.url).href;
 const child=spawnSync(process.execPath,['--input-type=module','-e',`import {ModelPortNightvoyage} from ${JSON.stringify(runtime)};import {OfflineEnvelopePlanAdapter,selectAdapter} from ${JSON.stringify(port)};import {envelopeSeed,envelopeTranscript} from ${JSON.stringify(fixtures)};const a=new OfflineEnvelopePlanAdapter({model_id:'fiction-envelope-model',simulator:d=>envelopeTranscript(d)});const e=new ModelPortNightvoyage(process.argv[1],{selection:selectAdapter({primary:a}),fault:p=>{if(p===process.argv[2])process.exit(Number(process.argv[3]));}});await e.execute(e.start('child','child',envelopeSeed()));`,env.directory,point,String(exitCode)],{encoding:'utf8'});
 assert.equal(child.status,exitCode,child.stderr);const e=env.open(),id=start(e,'child');assert.equal(e.status(id).status,'uncertain');assert.equal(e.status(id).stage_dispatches_started,expectedCalls);assert.equal(e.status(id).external_calls_started,0);await e.execute(id);assert.equal(env.calls(),0);
 if(resumable){await e.resume(id);assert.equal(env.calls(),2);assert.equal(e.status(id).status,'completed');assert.equal(e.status(id).stage_dispatches_started,3);}else{await assert.rejects(e.resume(id),/ambiguous_attempt/);assert.equal(env.calls(),0);}
});
test('call/input/output caps stop at the same durable boundaries and replay cannot reset them',async t=>{
 const env=setup(t,d=>envelopeTranscript(d)),e=env.open(),id=start(e,'one',{maxCalls:1});await e.execute(id);assert.equal(e.status(id).stagesSaved,1);assert.equal(env.calls(),1);await e.resume(id);assert.equal(env.calls(),1);assert.equal(e.status(id).error,'budget_exhausted');
 const tiny=start(e,'tiny',{inputTokens:1});await e.execute(tiny);assert.equal(e.status(tiny).stage_dispatches_started,0);assert.equal(env.calls(),1);
 const output=start(e,'output',{perCallOutput:1});await e.execute(output);assert.equal(e.status(output).stagesSaved,0);assert.equal(e.status(output).stage_dispatches_started,1);assert.equal(env.calls(),2);
});
test('queued and in-flight cancellation are terminal and suppress noncooperative late streams',async t=>{
 let entered,release;const ready=new Promise(r=>entered=r),env=setup(t,d=>{entered();return new Promise(r=>release=()=>r(envelopeTranscript(d)));}),e=env.open(),queued=start(e,'queued');e.cancel(queued);await e.execute(queued);assert.equal(env.calls(),0);await assert.rejects(e.resume(queued),/not_resumable/);
 const id=start(e,'active'),work=e.execute(id);await ready;e.cancel(id);await work;release();await turn();assert.equal(env.calls(),1);assert.equal(e.status(id).status,'cancelled');assert.equal(e.result(id).dream,null);assert.equal(e.status(id).cancellation.remote_confirmed,'unknown');await e.execute(id);assert.equal(env.calls(),1);
});
for(const mode of ['timeout','cancelled'])test(`${mode} after a partial SSE frame discards the delayed final body`,async t=>{
 let release,entered;const ready=new Promise(r=>entered=r),env=setup(t,d=>(async function*(){const chunks=envelopeTranscript(d);yield chunks[0];entered();await new Promise(r=>release=r);yield* chunks.slice(1);})()),e=env.open();
 const id=start(e,mode,{timeoutMs:mode==='timeout'?20:1000}),work=e.execute(id);await ready;if(mode==='cancelled')e.cancel(id);await work;release();await turn();
 assert.equal(e.status(id).status,mode==='timeout'?'failed':'cancelled');if(mode==='timeout')assert.equal(e.status(id).error,'timeout');assert.equal(env.calls(),1);assert.equal(e.status(id).stagesSaved,0);assert.equal(e.result(id).dream,null);await assert.rejects(e.resume(id),mode==='timeout'?/ambiguous_attempt/:/not_resumable/);
});
test('withdrawal purges original, descendants and cached cue bodies across reader, replay and reopen',async t=>{
 const env=setup(t,d=>envelopeTranscript(d));let e=env.open();const id=start(e);await e.execute(id);const r=e.result(id),dream=r.dream,source=envelopeSeed().sources[0];
 e.append(dream.id,'recollection','SYNTHETIC-DERIVED-PRIVATE');e.append(dream.id,'imagined_continuation','SYNTHETIC-CONTINUATION-PRIVATE');const cue=e.recall('clock','cue-event',1);assert.equal(cue.length,1);assert.equal(cue[0].origin,'dream');assert.equal(cue[0].isRealityFact,false);
 e.close();const text=runDreambook(['read','--latest','--data-dir',env.directory]);assert.ok(text.includes(dream.scenes[0].event));assert.ok(text.includes('不是现实事实'));e=env.open();e.withdraw(source.id);e.close();e=env.open();assert.equal(e.result(id).dream,null);assert.deepEqual(e.recall('clock','cue-event',1),[]);assert.deepEqual(e.list(),[]);assert.throws(()=>start(e),/source_withdrawn/);await e.execute(id);assert.equal(env.calls(),3);
 e.close();assert.ok(runDreambook(['read','--latest','--data-dir',env.directory]).includes('没有可查看'));const disk=fs.readFileSync(path.join(env.directory,'state.json'),'utf8');for(const s of [dream.scenes[0].event,source.text,'SYNTHETIC-DERIVED-PRIVATE','SYNTHETIC-CONTINUATION-PRIVATE','SYNTHETIC-REASONING-PRIVATE'])assert.ok(!disk.includes(s));
});
test('direct Store withdrawal while awaiting a noncooperative stream blocks late content without client hook',async t=>{
 let entered,release;const ready=new Promise(r=>entered=r),env=setup(t,d=>{entered();return new Promise(r=>release=()=>r(envelopeTranscript(d)));});let e=env.open();const id=start(e),work=e.execute(id);await ready;e.store.withdraw(envelopeSeed().sources[0].id);release();await work;assert.equal(e.result(id).dream,null);assert.equal(env.calls(),1);e.close();e=env.open();assert.equal(e.result(id).dream,null);assert.deepEqual(e.recall('clock','late',1),[]);await e.execute(id);assert.equal(env.calls(),1);
});
test('persistence failure prevents dispatch, and owner lock prevents a second candidate execution',async t=>{
 const env=setup(t,d=>envelopeTranscript(d)),e=env.open(),id=start(e);assert.throws(()=>new ModelPortNightvoyage(env.directory,{selection:selectAdapter({primary:env.adapter})}),/store_busy/);fs.mkdirSync(path.join(env.directory,'snapshot.tmp'));await assert.rejects(e.execute(id),/storage_io_failure/);assert.equal(env.calls(),0);
});
test('atomic checkpoint save failure cannot expose a scene or usage after reopen',async t=>{
 const env=setup(t,d=>envelopeTranscript(d));let e=env.open();const id=start(e),save=e.store.save.bind(e.store);
 e.store.save=()=>{if(e.run(id).scenes.length===1)fs.mkdirSync(path.join(env.directory,'snapshot.tmp'));return save();};
 await assert.rejects(e.execute(id),/storage_io_failure/);assert.equal(env.calls(),1);e.close();fs.rmdirSync(path.join(env.directory,'snapshot.tmp'));
 e=env.open();assert.equal(e.status(id).status,'uncertain');assert.equal(e.status(id).stagesSaved,0);assert.equal(e.status(id).usage[0].usage,'unknown');assert.equal(e.result(id).dream,null);await assert.rejects(e.resume(id),/ambiguous_attempt/);assert.equal(env.calls(),1);
});
test('parallel execute and cancellation after a saved scene cannot dispatch a second stage',async t=>{
 let entered,release;const ready=new Promise(r=>entered=r),env=setup(t,d=>{entered();return new Promise(r=>release=()=>r(envelopeTranscript(d)));});let e=env.open();const id=start(e),work=e.execute(id);await ready;await assert.rejects(e.execute(id),/run_busy/);e.cancel(id);await work;release();await turn();assert.equal(env.calls(),1);e.close();
 let engine;const other=setup(t,d=>envelopeTranscript(d),{fault:p=>{if(p==='port_scene_saved')engine.cancel(runId);}});engine=other.open();const runId=start(engine);await engine.execute(runId);assert.equal(engine.status(runId).stagesSaved,1);assert.equal(engine.status(runId).status,'cancelled');assert.equal(other.calls(),1);await assert.rejects(engine.resume(runId),/not_resumable/);
});
test('closed inputs reject real material and getters before simulation; unsupported review cannot be hidden',async t=>{
 const env=setup(t,d=>envelopeTranscript(d)),e=env.open(),real=envelopeSeed();real.materialKind='real';assert.throws(()=>e.start('real','real',real));let touched=false;assert.throws(()=>e.start('getter','getter',{get id(){touched=true;}}));assert.equal(touched,false);assert.equal(env.calls(),0);
 const id=start(e);await e.execute(id);const dream=e.result(id).dream;e.store.state.entries['synthetic-review']={origin:'dream_appraisal_review',runId:id,derivedFrom:[dream.id]};assert.throws(()=>readModelPortContent(e.store,dream.id),/review_reader_pending/);
});
test('versioned wrappers contain only reviewed deltas and leave pinned original files untouched',()=>{
 const read=p=>fs.readFileSync(new URL(`../scripts/${p}`,import.meta.url),'utf8');
 assert.equal(read('offline-envelope-model-runtime.mjs'),read('dream-model-runtime.mjs').replace("from './dream-model-port.mjs'","from './offline-envelope-model-port.mjs'"));
 assert.equal(read('offline-envelope-content-view.mjs'),read('missing-type-content-view.mjs').replace("s.protocol_version==='offline-chatgpt-plan-missing-type-v1'","['offline-chatgpt-plan-missing-type-v1','offline-plan-reasoning-envelope-v1'].includes(s.protocol_version)"));
});
