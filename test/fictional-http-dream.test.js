import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {openFictionalHttpDream as open} from '../scripts/fictional-http-dream.mjs';
import {readModelPortContent} from '../scripts/model-port-content-view.mjs';
const seed=()=>JSON.parse(fs.readFileSync(new URL('../examples/adapter-boundary.snapshot.json',import.meta.url)));
function setup(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-http-dream-test-'));let engine;
 t.after(()=>{engine?.close();fs.rmSync(root,{recursive:true,force:true});});
 return {dir:path.join(root,'book'),async open(options){engine=await open(path.join(root,'book'),options);return engine;}};}
const start=(e,settings)=>e.start('fictional-http','fictional-http',seed(),settings);
const disk=e=>JSON.parse(fs.readFileSync(path.join(e.store.directory,'state.json'),'utf8'));
test('six real loopback POSTs bind to three canonical stages; replay, dreambook, recall and withdrawal preserve separation',async t=>{
 const s=setup(t);let e=await s.open();const id=start(e);await e.execute(id);const result=e.result(id),r=result.receipt;
 assert.equal(r.status,'completed');assert.equal(r.adapter_kind,'FakeAdapter');assert.equal(r.external_calls_started,0);
 assert.equal(r.stage_dispatches_started,3);assert.equal(r.local_http_accounting.calls,6);assert.equal(e.fixtureObservations().length,6);
 assert.deepEqual(r.local_http_accounting.stages.map(a=>[a.stage,a.index,a.requests.length,a.checkpoint_committed]),[['scene',0,2,true],['scene',1,2,true],['wake',2,2,true]]);
 assert.deepEqual(r.local_http_accounting.stages.flatMap(a=>a.requests.map(row=>row.ordinal)),[1,2,3,4,5,6]);
 assert.equal(r.checkpoint.saved_scenes,2);assert.equal(r.checkpoint.wake_saved,true);
 const original=JSON.stringify(e.read(result.dream.id));assert.equal(readModelPortContent(e.store,result.dream.id).narrative.dream.scenes.length,2);
 assert.equal(e.recall('boat','fiction-cue',1)[0].isRealityFact,false);
 e.close();e=await s.open();assert.equal(start(e),id);await e.execute(id);assert.equal(e.fixtureObservations().length,0);assert.equal(JSON.stringify(e.read(result.dream.id)),original);
 e.append(result.dream.id,'imagined_continuation','An independently fictional continuation.');
 e.withdraw(seed().sources[0].id);e.close();e=await s.open();assert.equal(e.result(id).dream,null);assert.equal(e.recall('boat','fiction-cue',1).length,0);
 assert.equal(readModelPortContent(e.store,result.dream.id),null);assert.equal(e.status(id).local_http_accounting.calls,6);
 const saved=JSON.stringify(disk(e));assert.equal(saved.includes('A blue paper boat'),false);assert.equal(saved.includes('independently fictional continuation'),false);
});
test('disk pending intent exists before each socket and committed checkpoint contains both completed requests',async t=>{
 const s=setup(t);let e,reservations=0,commits=0;
 e=await s.open({fault(point){if(point==='fictional_http_reserved'){
  const run=Object.values(disk(e).runs)[0],rows=run.attempts.flatMap(a=>a.fictional_http?.requests??[]);reservations++;
  assert.equal(rows.length,reservations);assert.equal(rows.at(-1).state,'pending');assert.equal(e.fixtureObservations().length,reservations-1);
 }if(point==='port_scene_saved'||point==='port_wake_saved'){
  const run=Object.values(disk(e).runs)[0],a=run.attempts.at(-1);commits++;
  assert.equal(a.state,'committed');assert.deepEqual(a.fictional_http.requests.map(row=>row.state),['http_completed','http_completed']);
 }}});await e.execute(start(e));assert.equal(reservations,6);assert.equal(commits,3);
});
test('crash after saved first scene resumes remaining stages with the same owner and no repeated first scene',async t=>{
 const s=setup(t);let crashed=false,e=await s.open({fault(point){if(point==='port_scene_saved'&&!crashed){crashed=true;throw Error('simulated_crash');}}});
 const id=start(e);await e.execute(id);assert.equal(e.status(id).checkpoint.saved_scenes,1);assert.equal(e.status(id).local_http_accounting.calls,2);e.close();
 e=await s.open();await e.resume(id);assert.equal(e.status(id).status,'completed');assert.deepEqual(e.fixtureObservations().map(x=>x.index),[1,1,2,2]);assert.equal(e.status(id).local_http_accounting.calls,6);
});
test('completed HTTP without a validated stage checkpoint remains ambiguous and cannot be retried',async t=>{
 const s=setup(t);let e=await s.open({scenario:'invalid_second_scene'});const id=start(e);await e.execute(id);
 assert.equal(e.status(id).checkpoint.saved_scenes,1);assert.equal(e.status(id).local_http_accounting.calls,4);e.close();e=await s.open();
 await assert.rejects(e.resume(id),/ambiguous_attempt/);await e.execute(id);assert.equal(e.fixtureObservations().length,0);
});
test('local HTTP cap stops before a new stage and changing its pinned policy cannot resume the book',async t=>{
 const s=setup(t);let e=await s.open({maxLocalHttpCalls:3});const id=start(e);await e.execute(id);
 assert.equal(e.status(id).checkpoint.saved_scenes,1);assert.equal(e.status(id).error_category,'budget_exhausted');assert.equal(e.status(id).local_http_accounting.calls,2);e.close();
 await assert.rejects(open(s.dir,{maxLocalHttpCalls:6}),/foreign_execution_owner/);
 e=await s.open({maxLocalHttpCalls:3});await e.resume(id);assert.equal(e.status(id).local_http_accounting.calls,2);assert.equal(e.fixtureObservations().length,0);
});
test('cancelled late response cannot commit another scene or dispatch wake; pending hold survives reopen',async t=>{
 const s=setup(t);let e=await s.open({scenario:'late_second_scene'});const id=start(e),work=e.execute(id);
 while(e.fixtureObservations().length<4)await new Promise(resolve=>setTimeout(resolve,2));
 e.cancel(id);await work;await new Promise(resolve=>setTimeout(resolve,120));
 assert.equal(e.status(id).status,'cancelled');assert.equal(e.status(id).checkpoint.saved_scenes,1);assert.equal(e.status(id).local_http_accounting.calls,4);
 assert.equal(e.status(id).local_http_accounting.stages.at(-1).requests.at(-1).state,'pending');
 e.close();e=await s.open();await e.execute(id);await assert.rejects(e.resume(id),/not_resumable/);assert.equal(e.fixtureObservations().length,0);
});
test('process death after durable HTTP reservation leaves no permission to redispatch on reopen',async t=>{
 const s=setup(t),moduleUrl=new URL('../scripts/fictional-http-dream.mjs',import.meta.url).href,fixtureUrl=new URL('../examples/adapter-boundary.snapshot.json',import.meta.url).href;
 const code=`import fs from 'node:fs';import {openFictionalHttpDream} from ${JSON.stringify(moduleUrl)};const e=await openFictionalHttpDream(process.argv[1],{fault(point){if(point==='fictional_http_reserved')process.exit(37);}});await e.execute(e.start('fictional-http','fictional-http',JSON.parse(fs.readFileSync(new URL(${JSON.stringify(fixtureUrl)})))));`;
 const child=spawn(process.execPath,['--input-type=module','-e',code,s.dir],{stdio:['ignore','ignore','pipe']});let stderr='';child.stderr.on('data',b=>stderr+=b);
 const exit=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',resolve);});assert.equal(exit,37,stderr);
 const e=await s.open(),id=Object.keys(e.store.state.runs)[0];assert.equal(e.status(id).status,'uncertain');assert.equal(e.status(id).local_http_accounting.calls,1);
 assert.equal(e.status(id).local_http_accounting.stages[0].requests[0].state,'pending');await assert.rejects(e.resume(id),/ambiguous_attempt/);await e.execute(id);assert.equal(e.fixtureObservations().length,0);
});
test('closed fixture options reject endpoints, authorization, real models and getters before opening storage',async t=>{
 const s=setup(t);for(const options of [{endpoint:'https://example.invalid'},{model_id:'gpt-5.6-sol'},{login:true},{maxLocalHttpCalls:7},{scenario:'remote'}])await assert.rejects(open(s.dir,options));
 let touched=false;await assert.rejects(open(s.dir,{get fault(){touched=true;}}));assert.equal(touched,false);assert.equal(fs.existsSync(s.dir),false);
});
test('a second owner and repeated request cannot open a parallel generation path',async t=>{
 const s=setup(t),e=await s.open(),id=start(e);await assert.rejects(open(s.dir),/busy/);
 assert.equal(start(e),id);const work=e.execute(id);await assert.rejects(e.execute(id),/run_busy/);await work;
 assert.equal(e.fixtureObservations().length,6);const changed=seed();changed.sources[0].text='Independent changed fixture.';
 assert.throws(()=>e.start('fictional-http','fictional-http',changed),/request_conflict/);
});
test('queued cancellation costs zero HTTP reservations and never resumes',async t=>{
 const s=setup(t);let e=await s.open();const id=start(e);e.cancel(id);await e.execute(id);
 assert.equal(e.status(id).local_http_accounting.calls,0);e.close();e=await s.open();await e.execute(id);assert.equal(e.fixtureObservations().length,0);await assert.rejects(e.resume(id),/not_resumable/);
});
test('failure of the pending-intent atomic write prevents socket dispatch and reopening cannot retry the stage',async t=>{
 const s=setup(t);let e=await s.open({fault(point){if(point==='port_dispatched')fs.writeFileSync(path.join(s.dir,'snapshot.tmp'),'independent-write-collision',{flag:'wx'});}});
 const id=start(e);await assert.rejects(e.execute(id),/storage_io_failure/);assert.equal(e.fixtureObservations().length,0);e.close();
 e=await s.open();assert.equal(e.status(id).status,'uncertain');assert.equal(e.status(id).local_http_accounting.calls,0);await assert.rejects(e.resume(id),/ambiguous_attempt/);assert.equal(e.fixtureObservations().length,0);
});
test('binding or checkpoint/HTTP mismatch is rejected on reopen without invoking the fixture',async t=>{
 const s=setup(t);let e=await s.open();const id=start(e);await e.execute(id);e.close();const file=path.join(s.dir,'state.json'),saved=JSON.parse(fs.readFileSync(file));
 for(const mutate of [r=>r.attempts[0].fictional_http.binding.snapshot_hash='0'.repeat(64),r=>r.attempts[0].fictional_http.requests.pop(),r=>r.attempts[1].fictional_http.requests[0].ordinal=1,r=>r.attempts[0].fictional_http.requests[0].state='pending']){
  const changed=structuredClone(saved);mutate(changed.runs[id]);fs.writeFileSync(file,JSON.stringify(changed));await assert.rejects(open(s.dir),/ambiguous_attempt/);
 }
 fs.writeFileSync(file,JSON.stringify(saved));e=await s.open();assert.equal(e.status(id).status,'completed');
});
test('offline check emits only bounded receipt metadata and rejects real/native/auth options',()=>{
 const script=fileURLToPath(new URL('../scripts/check-fictional-http-dream.mjs',import.meta.url)),good=spawnSync(process.execPath,[script],{encoding:'utf8'});
 assert.equal(good.status,0,good.stderr);const r=JSON.parse(good.stdout);assert.equal(r.loopbackHttpPosts,6);assert.equal(r.replayAdditionalPosts,0);assert.equal(r.nativeAppServerIntegrated,false);assert.equal(good.stdout.includes('paper boat'),false);
 for(const flag of ['--login','--model','--native-executable','--data-dir','--retry']){const bad=spawnSync(process.execPath,[script,flag],{encoding:'utf8'});assert.notEqual(bad.status,0);assert.equal(bad.stdout,'');}
});
