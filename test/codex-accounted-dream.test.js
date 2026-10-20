import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {AccountedCodexDream} from '../scripts/codex-accounted-dream-runtime.mjs';
import {createAccountedCodexStageTransport} from '../scripts/codex-accounted-stage-transport.mjs';
import {createCodexDreamHttpAccount,isCodexDreamHttpAccount} from '../scripts/codex-dream-http-account.mjs';
import {readModelPortContent} from '../scripts/accounted-codex-content-view.mjs';
import {runDreambook} from '../scripts/dreambook.mjs';
const seed=()=>JSON.parse(fs.readFileSync(new URL('../examples/adapter-boundary.snapshot.json',import.meta.url)));
function setup(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-accounted-dream-'));let e;
 t.after(()=>{e?.close();fs.rmSync(root,{recursive:true,force:true});});return {dir:path.join(root,'book'),open(options){e=new AccountedCodexDream(path.join(root,'book'),options);return e;}};}
const start=(e,settings)=>e.start('fictional-accounted','fictional-accounted',seed(),settings);
const saved=e=>JSON.parse(fs.readFileSync(path.join(e.store.directory,'state.json')));
test('three app-server peer HTTP requests have durable intents before replies and close before canonical stage publication',async t=>{
 const s=setup(t);let e,commits=0;
 e=s.open({fault(point){if(['port_scene_saved','port_wake_saved'].includes(point)){
  commits++;const row=Object.values(saved(e).runs)[0].attempts.at(-1);assert.equal(row.state,'committed');assert.equal(row.codex_fixture_http.requests[0].state,'http_completed');
  const report=e.transport.status().reports.at(-1);assert.equal(report.ownedProcessClosed,true);assert.equal(report.temporaryCleanupComplete,true);assert.equal(report.ownedShutdown.gracefulZeroExitObserved,true);
  assert.equal(report.localForwardAccounting.dreamStage.arrivalsChecked,1);assert.equal(report.localForwardAccounting.dreamStage.completed,1);
 }}});const id=start(e);await e.execute(id);const result=e.result(id);
 assert.equal(result.receipt.status,'completed');assert.equal(commits,3);assert.equal(result.receipt.external_calls_started,0);assert.equal(result.receipt.local_http_accounting.calls,3);assert.equal(result.receipt.auth_mode,'synthetic_stub');
 assert.deepEqual(result.receipt.local_http_accounting.stages.flatMap(a=>a.requests.map(r=>r.ordinal)),[1,2,3]);
 assert.equal(readModelPortContent(e.store,result.dream.id).narrative.dream.scenes.length,2);
 for(const report of e.transport.status().reports){assert.equal(report.kind,'independent_node_peer');assert.equal(report.localForwardAccounting.directSocketAttempts,1);assert.equal(report.localForwardAccounting.failed,null);assert.equal(report.requestObservation.toolCount,0);assert.equal(report.accountAuthorizationRequested,false);}
 const original=JSON.stringify(e.read(result.dream.id));e.close();e=s.open();assert.equal(start(e),id);await e.execute(id);assert.equal(e.transport.status().exchangesStarted,0);assert.equal(JSON.stringify(e.read(result.dream.id)),original);
 e.close();assert.ok(runDreambook(['read','--latest','--data-dir',s.dir]).includes('fictional blue cup'));
 e=s.open();assert.equal(e.recall('cup','fictional-accounted-cue',1)[0].isRealityFact,false);e.append(result.dream.id,'imagined_continuation','Independent fictional continuation.');e.withdraw(seed().sources[0].id);e.close();e=s.open();
 assert.equal(e.result(id).dream,null);assert.equal(e.recall('cup','fictional-accounted-cue',1).length,0);assert.equal(e.status(id).local_http_accounting.calls,3);assert.equal(JSON.stringify(saved(e)).includes('fictional blue cup'),false);
});
test('saved first-scene checkpoint resumes only remaining stages with the original adapter identity',async t=>{
 const s=setup(t);let crash=false,e=s.open({fault(point){if(point==='port_scene_saved'&&!crash){crash=true;throw Error('simulated_crash');}}});const id=start(e);await e.execute(id);
 const scene=structuredClone(e.run(id).scenes[0]),identity=structuredClone(e.run(id).modelSelection);assert.equal(e.status(id).status,'uncertain');assert.equal(e.status(id).local_http_accounting.calls,1);e.close();e=s.open();await e.resume(id);
 assert.equal(e.status(id).status,'completed');assert.equal(e.transport.status().exchangesStarted,2);assert.equal(e.status(id).local_http_accounting.calls,3);assert.deepEqual(e.run(id).scenes[0],scene);assert.deepEqual(e.run(id).modelSelection,identity);
});
for(const scenario of ['stage_wrong_text','stage_failed','stage_tool','stage_exit'])test(`${scenario}: completed HTTP cannot substitute for a canonical checkpoint or authorize retry`,async t=>{
 const s=setup(t);let e=s.open({scenario});const id=start(e);await e.execute(id);assert.equal(e.status(id).status,'failed');assert.equal(e.status(id).local_http_accounting.calls,1);assert.equal(e.status(id).checkpoint.saved_scenes,0);
 assert.equal(e.run(id).attempts[0].codex_fixture_http.requests[0].state,'http_completed');e.close();e=s.open();await assert.rejects(e.resume(id),/ambiguous_attempt/);await e.execute(id);assert.equal(e.transport.status().exchangesStarted,0);assert.equal(e.result(id).dream,null);
});
test('second stage child exit preserves the first scene and blocks model or transport replacement',async t=>{
 const s=setup(t);let e=s.open({scenario:'second_stage_exit'});const id=start(e);await e.execute(id);assert.equal(e.status(id).checkpoint.saved_scenes,1);assert.equal(e.status(id).local_http_accounting.calls,2);
 e.close();e=s.open();await assert.rejects(e.resume(id),/ambiguous_attempt/);await e.execute(id);assert.equal(e.transport.status().exchangesStarted,0);
});
test('queued and in-flight cancellation retain consumed HTTP and prohibit a wake or replay',async t=>{
 const s=setup(t);let e=s.open({scenario:'stage_stall'});const id=start(e),work=e.execute(id);
 const deadline=Date.now()+3000;while(e.status(id).local_http_accounting.calls===0&&Date.now()<deadline)await new Promise(r=>setTimeout(r,2));assert.equal(e.status(id).local_http_accounting.calls,1);
 e.cancel(id);await work;assert.equal(e.transport.status().inFlight,false);assert.equal(e.status(id).status,'cancelled');assert.equal(e.status(id).checkpoint.saved_scenes,0);e.close();e=s.open();await e.execute(id);assert.equal(e.transport.status().exchangesStarted,0);await assert.rejects(e.resume(id),/not_resumable/);
 const q=setup(t),other=q.open(),queued=start(other);other.cancel(queued);await other.execute(queued);assert.equal(other.status(queued).local_http_accounting.calls,0);assert.equal(other.transport.status().exchangesStarted,0);
});
test('pending-intent write failure cannot reach upstream even after app-server starts',async t=>{
 const s=setup(t);let e,installed=false;
 e=s.open({fault(point){if(point==='port_dispatched'&&!installed){installed=true;const original=e.store.save.bind(e.store);e.store.save=()=>{const a=Object.values(e.store.state.runs)[0].attempts.at(-1);if(a.codex_fixture_http?.requests.at(-1)?.state==='pending')fs.writeFileSync(path.join(s.dir,'snapshot.tmp'),'independent-persistence-collision',{flag:'wx'});return original();};}}});
 const id=start(e);await assert.rejects(e.execute(id),/storage_io_failure/);const report=e.transport.status().reports[0];assert.equal(report.fixtureModelPosts,0);assert.equal(report.localForwardAccounting.forwardedLocalRequests,0);e.close();e=s.open();assert.equal(e.status(id).status,'uncertain');await assert.rejects(e.resume(id),/ambiguous_attempt/);assert.equal(e.transport.status().exchangesStarted,0);
});
test('stage budget exhaustion before second stage keeps one HTTP and cannot be renewed by reopen',async t=>{
 const s=setup(t);let e=s.open();const id=start(e,{maxCalls:1});await e.execute(id);assert.equal(e.status(id).checkpoint.saved_scenes,1);assert.equal(e.status(id).local_http_accounting.calls,1);assert.equal(e.status(id).error_category,'budget_exhausted');e.close();e=s.open();await e.resume(id);assert.equal(e.status(id).local_http_accounting.calls,1);assert.equal(e.transport.status().exchangesStarted,0);
});
test('owner conflict, forged stage transport/account, credentials and remote endpoints fail closed',async t=>{
 const s=setup(t),e=s.open();assert.throws(()=>new AccountedCodexDream(s.dir),/busy/);const id=start(e);assert.equal(start(e),id);
 for(const option of [{endpoint:'https://example.invalid'},{apiKey:'fictional-key'},{model_id:'other'},{executable:'codex'},{scenario:'unknown'}])assert.throws(()=>createAccountedCodexStageTransport(option));
 let touched=false;assert.throws(()=>new AccountedCodexDream(s.dir,{get executable(){touched=true;}}));assert.equal(touched,false);
 const transport=createAccountedCodexStageTransport();assert.throws(()=>transport.bindAccount({reserve(){}}),/account_required/);await assert.rejects(transport.exchange({}),/account_required/);await transport.close();
 assert.equal(isCodexDreamHttpAccount({}),false);assert.throws(()=>createCodexDreamHttpAccount({},e.run(id),'scene'));
});
test('completed account corruption cannot be read as a valid book or reopened for generation',async t=>{
 const s=setup(t);let e=s.open();const id=start(e);await e.execute(id);const entry=e.result(id).dream.id,run=e.run(id),original=structuredClone(run.attempts[0].codex_fixture_http);
 run.attempts[0].codex_fixture_http.requests=[];assert.throws(()=>readModelPortContent(e.store,entry),/invalid_model_port_book/);run.attempts[0].codex_fixture_http=original;
 run.attempts[0].index='0';run.attempts[0].codex_fixture_http.binding.index='0';assert.throws(()=>readModelPortContent(e.store,entry),/invalid_model_port_book/);run.attempts[0].index=0;run.attempts[0].codex_fixture_http.binding.index=0;
 run.attempts[0].stage='wake';run.attempts[0].codex_fixture_http.binding.stage='wake';assert.throws(()=>readModelPortContent(e.store,entry),/invalid_model_port_book/);run.attempts[0].stage='scene';run.attempts[0].codex_fixture_http.binding.stage='scene';e.close();
 const file=path.join(s.dir,'state.json'),state=JSON.parse(fs.readFileSync(file));state.runs[id].attempts[0].codex_fixture_http.binding.snapshot_hash='0'.repeat(64);fs.writeFileSync(file,JSON.stringify(state));assert.throws(()=>new AccountedCodexDream(s.dir),/ambiguous_attempt/);
});
test('parent death just after pending persistence leaves an uncertain stage and no replay permission',async t=>{
 const s=setup(t),moduleUrl=new URL('../scripts/codex-accounted-dream-runtime.mjs',import.meta.url).href,fixtureUrl=new URL('../examples/adapter-boundary.snapshot.json',import.meta.url).href;
 const code=`import fs from 'node:fs';import {AccountedCodexDream} from ${JSON.stringify(moduleUrl)};const e=new AccountedCodexDream(process.argv[1]);const original=e.store.save.bind(e.store);e.store.save=()=>{original();if(Object.values(e.store.state.runs)[0]?.attempts.at(-1)?.codex_fixture_http?.requests.at(-1)?.state==='pending')process.exit(39);};await e.execute(e.start('fictional-accounted','fictional-accounted',JSON.parse(fs.readFileSync(new URL(${JSON.stringify(fixtureUrl)})))));`;
 const child=spawn(process.execPath,['--input-type=module','-e',code,s.dir],{stdio:['ignore','ignore','pipe']});let err='';child.stderr.on('data',b=>err+=b);const exit=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',resolve);});assert.equal(exit,39,err);
 const e=s.open(),id=Object.keys(e.store.state.runs)[0];assert.equal(e.status(id).status,'uncertain');assert.equal(e.status(id).local_http_accounting.calls,1);assert.equal(e.run(id).attempts[0].codex_fixture_http.requests[0].state,'pending');await assert.rejects(e.resume(id),/ambiguous_attempt/);await e.execute(id);assert.equal(e.transport.status().exchangesStarted,0);
});
test('issued account permits one bound completion and never accepts forged handles or a second stage POST',t=>{
 const s=setup(t),e=s.open(),id=start(e),r=e.run(id);r.status='running';r.attempts.push({request_id:`stage-${id}-scene-0`,stage:'scene',index:0,state:'dispatched',external_call_intent:false,usage:'unknown'});e.store.save();
 const account=createCodexDreamHttpAccount(e.store,r,'scene');assert.equal(isCodexDreamHttpAccount(account),true);account.activate();
 const bytes=Buffer.from(JSON.stringify({model:'gpt-5.6-sol',tools:[],input:[]})),token=account.reserve(bytes);
 assert.equal(saved(e).runs[id].attempts[0].codex_fixture_http.requests[0].state,'pending');account.observeArrival(bytes);
 assert.throws(()=>account.complete({}),/ambiguous_attempt/);assert.throws(()=>account.reserve(bytes),/budget_exhausted/);account.complete(token);assert.throws(()=>account.complete(token),/ambiguous_attempt/);
 assert.equal(account.view().completed,1);account.close();assert.throws(()=>account.reserve(bytes),/cancelled/);
});
test('inherited credentials, Node options and proxy variables never enter owned fixture children',async t=>{
 const names=['OPENAI_API_KEY','ACCESS_TOKEN','NODE_OPTIONS','NODE_PATH','HTTPS_PROXY','NIGHTVOYAGE_DEEPSEEK_KEY'],old=Object.fromEntries(names.map(k=>[k,process.env[k]]));
 try{for(const k of names)process.env[k]='independent-fictional-environment-sentinel';const s=setup(t),e=s.open(),id=start(e);await e.execute(id);assert.equal(e.status(id).status,'completed');assert.equal(e.transport.status().reports.every(r=>r.credentialEnvironmentSupplied===false),true);}
 finally{for(const k of names){if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k];}}
});
test('public CLI defaults to an independent peer and rejects unreviewed flags before any native process',()=>{
 const cli=fileURLToPath(new URL('../scripts/check-codex-accounted-dream.mjs',import.meta.url));
 const run=spawnSync(process.execPath,[cli],{encoding:'utf8',timeout:15000});assert.equal(run.status,0,run.stderr);const receipt=JSON.parse(run.stdout);
 assert.equal(receipt.status,'accounted_fictional_dream_completed');assert.equal(receipt.appServerChildrenStarted,3);assert.equal(receipt.persistedLocalHttpIntents,3);assert.equal(receipt.nativeAppServerIntegrated,false);assert.equal(receipt.realModelRequests,0);assert.equal(run.stdout.includes('fictional blue cup'),false);
 for(const flag of ['--login','--model','--retry','--data-dir','--native-executable']){const bad=spawnSync(process.execPath,[cli,flag],{encoding:'utf8',timeout:3000});assert.notEqual(bad.status,0);assert.equal(JSON.parse(bad.stdout).reason,'entry_arguments_invalid');assert.equal(bad.stderr,'');}
});
