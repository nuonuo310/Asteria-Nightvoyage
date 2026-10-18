import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {Store} from '../src/store.js';
import {missingTypeTrialProposal as planTrialProposal,initMissingTypeTrial,preflightMissingTypeTrial,executeMissingTypeTrial} from '../scripts/missing-type-plan-trial.mjs';
import {missingTypeTrialFixture} from '../test-support/missing-type-trial-fixtures.js';
import {ChatGPTPlanAdapter as OriginalPlanAdapter} from '../scripts/dream-model-port.mjs';
import {MissingTypePlanAdapter as ChatGPTPlanAdapter} from '../scripts/missing-type-model-port.mjs';
import {createMissingTypeHttpTransport as createPlanHttpTransport} from '../scripts/missing-type-plan-http.mjs';
import {planSessionAvailable,planSessionCredential,withCheckedPlanSession} from '../scripts/chatgpt-plan-login.mjs';
import {readModelPortContent} from '../scripts/missing-type-content-view.mjs';
import {syntheticPlanHttp} from '../test-support/plan-trial-fixtures.js';
import {planTranscript} from '../test-support/model-port-protocol-fixtures.js';
const books=new Map();
async function setup(t){const dirs=await missingTypeTrialFixture(t);books.set(dirs.directory,dirs);return dirs;}
const trialApproval=()=>({approveFictionalSubscriptionTrial:true,confirmExtraCreditsDisabled:true,acknowledgeNoServerTokenCap:true,approveMissingContentTypeCompatibility:true,acknowledgeConsumedDiagnostics:true});
const initPlanTrial=(directory,approval)=>initMissingTypeTrial(directory,books.get(directory).history,approval);
const preflightPlanTrial=directory=>preflightMissingTypeTrial(directory,books.get(directory)?.history);
const executePlanTrial=args=>executeMissingTypeTrial({...args,history:args.history??books.get(args.directory)?.history});
async function run(t,changes={}){
 const dirs=await setup(t);initPlanTrial(dirs.directory,trialApproval());const http=syntheticPlanHttp({onGenerate:body=>new Response(Buffer.concat(planTranscript({body}))),...changes});http.install();t.after(http.restore);
 const output=await executePlanTrial({...dirs,onReady:http.onReady});return {...dirs,http,output};
}
function allText(root){return fs.readdirSync(root,{withFileTypes:true}).map(e=>e.isDirectory()?allText(path.join(root,e.name)):fs.readFileSync(path.join(root,e.name),'utf8')).join('\n');}
const approve=directory=>initPlanTrial(directory,trialApproval());
test('missing exact approval is read-only, fake stays default and forged transport/session never dispatch',async t=>{
 const {directory,connectionDirectory}=await setup(t);let calls=0;const saved=globalThis.fetch;globalThis.fetch=()=>{calls++;throw Error('UNEXPECTED');};t.after(()=>globalThis.fetch=saved);
 assert.equal(preflightPlanTrial(directory).reason,'trial_approval_required');assert.equal(fs.existsSync(directory),false);
 for(const flags of [{}, {...trialApproval(),confirmExtraCreditsDisabled:false},{...trialApproval(),approveMissingContentTypeCompatibility:false},{...trialApproval(),acknowledgeConsumedDiagnostics:false},{...trialApproval(),extra:true}])assert.throws(()=>initPlanTrial(directory,flags));
 await assert.rejects(executePlanTrial({directory,connectionDirectory,onReady:()=>assert.fail('login')}),/approval_required/);
 assert.throws(()=>createPlanHttpTransport({session:{},model:'gpt-5.6-sol',authorize(){}}),/authorization_required/);
 assert.throws(()=>new ChatGPTPlanAdapter({model_id:'gpt-5.6-sol',httpTransport:{ready:()=>true}}),/unreviewed/);
 assert.equal(new ChatGPTPlanAdapter({model_id:'gpt-5.6-sol'}).preflight().ready,false);assert.equal(calls,0);assert.equal(fs.existsSync(directory),false);
});
test('immutable approval binds fixture, full imported source closure, settings and expiry without new API account',async t=>{
 const {directory}=await setup(t),proposal=planTrialProposal();assert.equal(proposal.model_id,'gpt-5.6-sol');assert.equal(proposal.maxCalls,3);assert.equal(proposal.extraCreditsApproved,false);assert.equal(proposal.localLimits.serverOutputTokenCap,null);
 for(const p of ['src/store.js','src/engine.js','scripts/chatgpt-plan-auth.mjs','scripts/chatgpt-plan-http.mjs'])assert.equal(proposal.sourcePins[p].length,64);
 approve(directory);let store=new Store(directory),original=structuredClone(store.state.planMissingTypeDreamTrial);assert.equal(store.state.billing,undefined);store.close();approve(directory);store=new Store(directory);assert.deepEqual(store.state.planMissingTypeDreamTrial,original);
 store.state.planMissingTypeDreamTrial.proposal.model_id='fiction-changed';store.save();store.close();assert.throws(()=>preflightPlanTrial(directory),/source_pins_changed/);assert.throws(()=>approve(directory),/source_pins_changed/);
});
test('synthetic authorized HTTP completes fixed two scenes and wake, persists usage and replays without OAuth or dispatch',async t=>{
 const {directory,connectionDirectory,http,output,root}=await run(t);
 assert.equal(output.receipt.status,'completed');assert.equal(output.receipt.external_calls_started,3);assert.equal(output.receipt.model_id,'gpt-5.6-sol');assert.equal(output.receipt.auth_mode,'chatgpt_plan');assert.equal(output.authorization.remoteRevocationConfirmed,true);assert.equal(http.bodies.length,3);assert.equal(http.revoked,1);
 for(const body of http.bodies){assert.deepEqual(Object.keys(body),['model','instructions','input','store','stream']);assert.equal(body.store,false);assert.equal(body.stream,true);assert.equal(body.model,'gpt-5.6-sol');}
 assert.equal(output.dream.isRealityFact,false);assert.equal(output.wake.origin,'wake_note');assert.equal(output.residue.origin,'simulated_affect');assert.equal(output.receipt.usage.length,3);assert.equal(output.receipt.usage[0].usage.total_tokens,10);assert.equal(output.receipt.money,'unknown');
 const prior=http.calls.length,replay=await executePlanTrial({directory,connectionDirectory,onReady:()=>assert.fail('replay login')});assert.equal(replay.receipt.status,'completed');assert.equal(http.calls.length,prior);
 const store=new Store(directory);const view=readModelPortContent(store,output.dream.id);assert.equal(view.narrative.dream.origin,'dream');store.close();
 for(const marker of ['SYNTHETIC-TRIAL-ACCESS','SYNTHETIC-TRIAL-REFRESH','SYNTHETIC-TRIAL-CODE','fiction-response'])assert.ok(!allText(root).includes(marker));
});
test('second-stage invalid output retains first checkpoint, consumes attempt and never switches or retries',async t=>{
 const {directory,connectionDirectory,http,output}=await run(t,{onGenerate:(body,opts,n)=>new Response(Buffer.concat(planTranscript({body},n===2?{}:undefined)),{headers:{'Content-Type':'text/event-stream'}})});
 assert.equal(output.receipt.status,'failed');assert.equal(output.receipt.checkpoint.saved_scenes,1);assert.equal(output.receipt.external_calls_started,2);assert.equal(output.dream,null);assert.equal(http.revoked,1);
 const before=http.calls.length;await executePlanTrial({directory,connectionDirectory,onReady:()=>assert.fail('no retry')});approve(directory);assert.equal(preflightPlanTrial(directory).ready,false);assert.equal(http.calls.length,before);
 const store=new Store(directory);assert.equal(Object.keys(store.state.entries).length,0);assert.equal(Object.values(store.state.runs)[0].attempts[1].state,'dispatched');store.close();
});
test('scope or account catalog rejection consumes no generation calls and still revokes transient session',async t=>{
 for(const changes of [{denied:true},{missingModel:true}]){const {http,output}=await run(t,changes);assert.equal(http.bodies.length,0);assert.equal(http.revoked,1);assert.equal(output.dream,null);assert.equal(output.receipt.status,'failed');assert.equal(output.receipt.external_calls_started,0);}
});
test('HTTP error and wrong content-type suppress provider body, keep failed attempt and revoke without fallback',async t=>{
 for(const [status,type]of [[429,'application/json'],[200,'application/json']]){
  const {http,root,output}=await run(t,{onGenerate:()=>new Response('PRIVATE-PROVIDER-BODY',{status,headers:{'Content-Type':type}})});
  assert.equal(http.bodies.length,1);assert.equal(http.revoked,1);assert.equal(output.dream,null);assert.equal(output.receipt.external_calls_started,1);assert.ok(!JSON.stringify(output).includes('PRIVATE'));assert.ok(!allText(root).includes('PRIVATE'));
 }
});
test('direct withdrawal during HTTP suppresses late output; reopen, replay and reinit cannot expose bodies',async t=>{
 const dirs=await setup(t);approve(dirs.directory);let activeStore;
 const save=Store.prototype.save;Store.prototype.save=function(){const out=save.call(this);if(this.directory===dirs.directory&&this.state.planMissingTypeDreamTrial?.runId)activeStore=this;return out;};t.after(()=>Store.prototype.save=save);
 const http=syntheticPlanHttp({onGenerate:body=>{
   assert.equal(activeStore.state.runs[activeStore.state.planMissingTypeDreamTrial.runId].attempts[0].state,'dispatched');
   activeStore.withdraw('fictional-plan-window-memory');
   return new Response(Buffer.concat(planTranscript({body})),{headers:{'Content-Type':'text/event-stream'}});
 }});http.install();t.after(http.restore);
 await assert.rejects(executePlanTrial({...dirs,onReady:http.onReady}),/source_withdrawn/);
 assert.throws(()=>preflightPlanTrial(dirs.directory),/source_withdrawn/);assert.throws(()=>approve(dirs.directory),/source_withdrawn/);await assert.rejects(executePlanTrial({...dirs,onReady:()=>assert.fail('login')}),/source_withdrawn/);
 assert.ok(!allText(dirs.directory).includes('浅蓝色陶碗'));assert.equal(http.bodies.length,1);assert.equal(http.revoked,1);
});
test('cancellation in flight bounds noncooperative HTTP and ignores late response without wake',async t=>{
 const dirs=await setup(t);approve(dirs.directory);let entered,release;const started=new Promise(r=>entered=r),signal=new AbortController();
 const http=syntheticPlanHttp({onGenerate:body=>{entered();return new Promise(resolve=>release=()=>resolve(new Response(Buffer.concat(planTranscript({body})),{headers:{'Content-Type':'text/event-stream'}})));}});http.install();t.after(http.restore);
 const pending=executePlanTrial({...dirs,onReady:http.onReady,signal:signal.signal});await started;signal.abort();const output=await pending;release();await new Promise(r=>setImmediate(r));assert.equal(output.receipt.status,'cancelled');assert.equal(output.dream,null);assert.equal(http.bodies.length,1);assert.equal(output.receipt.remoteCancellationConfirmed,'unknown');assert.equal(http.revoked,1);
});
test('expiry or source withdrawal blocks before OAuth; reinit never refreshes time or clears consumed state',async t=>{
 const dirs=await setup(t);approve(dirs.directory);const store=new Store(dirs.directory);store.state.planMissingTypeDreamTrial.approvedAt-=86400001;store.state.planMissingTypeDreamTrial.expiresAt-=86400001;store.save();store.close();
 assert.equal(preflightPlanTrial(dirs.directory).reason,'trial_expired');assert.throws(()=>approve(dirs.directory),/trial_expired/);await assert.rejects(executePlanTrial({...dirs,onReady:()=>assert.fail('expired login')}),/trial_expired/);
});
test('opaque session expires at end of action and ordinary login never enables arbitrary inference',async t=>{
 const {connectionDirectory}=await setup(t),http=syntheticPlanHttp();http.install();t.after(http.restore);let handle;
 const result=await withCheckedPlanSession({directory:connectionDirectory,onReady:http.onReady},session=>{handle=session;assert.equal(planSessionAvailable(session,'gpt-5.6-sol'),true);assert.equal(planSessionAvailable(session,'unlisted'),false);assert.deepEqual(session,{});return {synthetic:true};});
 assert.equal(result.status,'plan_action_finished');assert.equal(result.remoteRevocationConfirmed,true);assert.equal(planSessionAvailable(handle,'gpt-5.6-sol'),false);assert.throws(()=>planSessionCredential(handle,'gpt-5.6-sol'),/authorization_required/);assert.equal(http.bodies.length,0);
});
test('CLI help and rejected flags never open a book, read inherited credentials or dispatch',async t=>{
 const {root}=await setup(t),script=fileURLToPath(new URL('../scripts/missing-type-plan-trial-cli.mjs',import.meta.url));
 for(const args of [['help'],['run'],['init'],['preflight','--live'],['run','--live','--api-key']]){
  const r=spawnSync(process.execPath,[script,...args],{encoding:'utf8',env:{...process.env,LOCALAPPDATA:root,OPENAI_API_KEY:'PRIVATE-ENV-KEY'}});assert.equal(r.status,args[0]==='help'?0:1);assert.ok(!(r.stdout+r.stderr).includes('PRIVATE'));assert.equal(fs.existsSync(path.join(root,'Nightvoyage','gpt-subscription-missing-type-dream-v1')),false);
 }
});

test('initial persistence failure prevents OAuth, and durable intent failure prevents generation',async t=>{
 const dirs=await setup(t);approve(dirs.directory);fs.mkdirSync(path.join(dirs.directory,'snapshot.tmp'));
 let opened=0;await assert.rejects(executePlanTrial({...dirs,onReady:()=>opened++}),/unsafe_storage_file/);assert.equal(opened,0);fs.rmdirSync(path.join(dirs.directory,'snapshot.tmp'));
 const next=await setup(t);approve(next.directory);const save=Store.prototype.save;
 Store.prototype.save=function(){if(this.directory===next.directory&&Object.values(this.state.runs).some(r=>r.attempts.length))fs.mkdirSync(path.join(this.directory,'snapshot.tmp'));return save.call(this);};t.after(()=>Store.prototype.save=save);
 const http=syntheticPlanHttp();http.install();t.after(http.restore);
 await assert.rejects(executePlanTrial({...next,onReady:http.onReady}),/store_unavailable/);assert.equal(http.bodies.length,0);assert.equal(http.revoked,1);
 fs.rmdirSync(path.join(next.directory,'snapshot.tmp'));assert.equal(preflightPlanTrial(next.directory).ready,false);
});

test('process death at second synthetic HTTP preserves scene and intent; reopening cannot log in or generate again',async t=>{
 const dirs=await setup(t);approve(dirs.directory);
 const trial=new URL('../scripts/missing-type-plan-trial.mjs',import.meta.url).href,fixture=new URL('../test-support/plan-trial-fixtures.js',import.meta.url).href,protocol=new URL('../test-support/model-port-protocol-fixtures.js',import.meta.url).href;
 const code=`import {executeMissingTypeTrial as executePlanTrial} from ${JSON.stringify(trial)};import {syntheticPlanHttp} from ${JSON.stringify(fixture)};import {planTranscript} from ${JSON.stringify(protocol)};const http=syntheticPlanHttp({onGenerate:(body,opts,n)=>{if(n===2)process.exit(47);return new Response(Buffer.concat(planTranscript({body})),{headers:{'Content-Type':'text/event-stream'}});}});http.install();await executePlanTrial({directory:process.argv[1],connectionDirectory:process.argv[2],history:JSON.parse(process.argv[3]),onReady:http.onReady});`;
 const child=spawnSync(process.execPath,['--input-type=module','-e',code,dirs.directory,dirs.connectionDirectory,JSON.stringify(dirs.history)],{encoding:'utf8'});assert.equal(child.status,47,child.stderr);
 const check=preflightPlanTrial(dirs.directory);assert.equal(check.ready,false);assert.equal(check.status,'uncertain');assert.equal(check.checkpoint.saved_scenes,1);assert.equal(check.external_calls_started,2);assert.equal(check.remoteRevocationConfirmed,'unknown');
 const replay=await executePlanTrial({...dirs,onReady:()=>assert.fail('crash must not reopen OAuth')});assert.equal(replay.dream,null);assert.equal(replay.receipt.external_calls_started,2);assert.equal(replay.receipt.status,'uncertain');
});

test('second Store owner blocks before login, and completed deletion cannot be replaced by replay',async t=>{
 const dirs=await setup(t);approve(dirs.directory);const owner=new Store(dirs.directory);
 await assert.rejects(executePlanTrial({...dirs,onReady:()=>assert.fail('busy login')}),/store_busy/);owner.close();
 const completed=await run(t);const store=new Store(completed.directory),entry=store.state.entries[completed.output.dream.id];store.deleteEntry(entry);store.close();
 const replay=await executePlanTrial({...completed,onReady:()=>assert.fail('deleted login')});assert.equal(replay.dream,null);assert.equal(replay.receipt.status,'deleted');assert.equal(completed.http.bodies.length,3);
});

test('local timeout bounds noncooperative HTTP, retains unknown usage and never dispatches another stage',async t=>{
 const dirs=await setup(t);approve(dirs.directory);const nativeTimeout=globalThis.setTimeout;
 globalThis.setTimeout=(callback,ms,...args)=>nativeTimeout(callback,ms===60000?20:ms,...args);t.after(()=>globalThis.setTimeout=nativeTimeout);
 const http=syntheticPlanHttp({onGenerate:()=>new Promise(()=>{})});http.install();t.after(http.restore);
 const output=await executePlanTrial({...dirs,onReady:http.onReady});assert.equal(output.receipt.status,'failed');assert.equal(output.receipt.error_category,'timeout');assert.equal(output.receipt.external_calls_started,1);assert.equal(output.receipt.usage[0].usage,'unknown');assert.equal(http.bodies.length,1);assert.equal(http.revoked,1);assert.equal(output.dream,null);assert.equal(preflightPlanTrial(dirs.directory).ready,false);
});

test('checkpoint save failure publishes no content and reopens as uncertain without inventing completion or usage',async t=>{
 const dirs=await setup(t);approve(dirs.directory);const save=Store.prototype.save;
 Store.prototype.save=function(){if(this.directory===dirs.directory&&Object.values(this.state.runs).some(r=>r.scenes?.length===1&&r.attempts[0]?.state==='committed'))fs.mkdirSync(path.join(this.directory,'snapshot.tmp'));return save.call(this);};t.after(()=>Store.prototype.save=save);
 const http=syntheticPlanHttp();http.install();t.after(http.restore);
 await assert.rejects(executePlanTrial({...dirs,onReady:http.onReady}),/store_unavailable/);assert.equal(http.bodies.length,1);assert.equal(http.revoked,1);
 fs.rmdirSync(path.join(dirs.directory,'snapshot.tmp'));Store.prototype.save=save;
 const replay=await executePlanTrial({...dirs,onReady:()=>assert.fail('no replay login')});assert.equal(replay.dream,null);assert.equal(replay.receipt.status,'uncertain');assert.equal(replay.receipt.checkpoint.saved_scenes,0);assert.equal(replay.receipt.usage[0].usage,'unknown');
});

test('an action exception revokes and invalidates its session without inventing zero external calls or echoing details',async t=>{
 const {connectionDirectory}=await setup(t),http=syntheticPlanHttp();http.install();t.after(http.restore);let handle;
 const result=await withCheckedPlanSession({directory:connectionDirectory,onReady:http.onReady},session=>{handle=session;throw Error('PRIVATE-ACTION-DETAIL');});assert.equal(result.status,'plan_action_failed');assert.equal(result.externalCallsStarted,'unknown');assert.equal(result.remoteRevocationConfirmed,true);assert.equal(planSessionAvailable(handle,'gpt-5.6-sol'),false);assert.ok(!JSON.stringify(result).includes('PRIVATE'));
});

test('oversized SSE is suppressed; revocation failure remains explicit and cannot be treated as confirmed',async t=>{
 const {http,output,root}=await run(t,{revocationFail:true,onGenerate:()=>new Response(Buffer.alloc(65537,120),{headers:{'Content-Type':'text/event-stream'}})});
 assert.equal(http.bodies.length,1);assert.equal(output.dream,null);assert.equal(output.authorization.remoteRevocationConfirmed,false);assert.equal(output.receipt.remoteCleanupMayBeRequired,true);assert.equal(output.receipt.usage[0].usage,'unknown');assert.ok(!allText(root).includes('SYNTHETIC-TRIAL-REFRESH'));
});

test('reviewed source manifest accepts CRLF but rejects changed code before approval, directory creation or credentials',async t=>{
 const {root}=await setup(t),copyRoot=path.join(root,'project'),proposal=planTrialProposal();
 const files=[...Object.keys(proposal.sourcePins),'package.json','examples/gpt-plan-trial.snapshot.json','docs/proposals/gpt-plan-missing-type-fictional-dream-v1.json'];
 for(const p of files){const out=path.join(copyRoot,p);fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,fs.readFileSync(new URL('../'+p,import.meta.url),'utf8').replaceAll('\r\n','\n').replaceAll('\n','\r\n'));}
 const entry=path.join(copyRoot,'scripts/missing-type-plan-trial.mjs'),code=`import {preflightMissingTypeTrial as preflightPlanTrial} from ${JSON.stringify(pathToFileURL(entry).href)};console.log(preflightPlanTrial(process.argv[1]).reason);`;
 const directory=path.join(root,'must-not-create');let child=spawnSync(process.execPath,['--input-type=module','-e',code,directory],{encoding:'utf8'});assert.equal(child.status,0,child.stderr);assert.match(child.stdout,/trial_approval_required/);assert.equal(fs.existsSync(directory),false);
 fs.appendFileSync(path.join(copyRoot,'scripts/chatgpt-plan-http.mjs'),'\r\n// changed after review\r\n');
 child=spawnSync(process.execPath,['--input-type=module','-e',code,directory],{encoding:'utf8'});assert.notEqual(child.status,0);assert.match(child.stderr,/trial_source_pins_changed/);assert.equal(fs.existsSync(directory),false);
});


test('trial initialization refuses identity-only or unrelated account metadata instead of adopting another store',async t=>{
 const {directory}=await setup(t),store=new Store(directory);store.state.planConnection={version:1,hostId:'synthetic-host',clientId:null,subject:null};store.save();store.close();
 assert.throws(()=>approve(directory),/foreign_execution_owner/);const reopened=new Store(directory);assert.equal(reopened.state.planMissingTypeDreamTrial,undefined);assert.equal(reopened.state.planConnection.hostId,'synthetic-host');reopened.close();
});
test('legacy runtime algorithm is unchanged and all old source-pinned histories remain independently verifiable',async t=>{
 const old=fs.readFileSync(new URL('../scripts/dream-model-runtime.mjs',import.meta.url),'utf8'),current=fs.readFileSync(new URL('../scripts/missing-type-model-runtime.mjs',import.meta.url),'utf8');assert.equal(current,old.replace("from './dream-model-port.mjs'","from './missing-type-model-port.mjs'"));
 const dirs=await setup(t),before=Object.fromEntries(Object.entries(dirs.history).map(([k,v])=>[k,fs.readFileSync(path.join(v,'state.json'),'utf8')]));approve(dirs.directory);const http=syntheticPlanHttp({onGenerate:body=>new Response(Buffer.concat(planTranscript({body})))});http.install();try{const out=await executePlanTrial({...dirs,onReady:http.onReady});assert.equal(out.receipt.protocol_version,'chatgpt-plan-inline-missing-type-v1');assert.equal(out.receipt.headerPolicy,'explicit-missing-only-complete-sse-v1');assert.equal(out.receipt.priorDiagnosticIntentsPreserved,3);}finally{http.restore();}
 for(const [k,v]of Object.entries(dirs.history))assert.equal(fs.readFileSync(path.join(v,'state.json'),'utf8'),before[k]);
 const {planTrialProposal}=await import('../scripts/chatgpt-plan-trial.mjs'),{envelopeProbeProposal}=await import('../scripts/plan-envelope-probe.mjs'),{prefixProbeProposal,preflightPrefixProbe}=await import('../scripts/plan-prefix-probe.mjs'),{readPlanTrialHistory}=await import('../scripts/chatgpt-plan-trial-history.mjs');assert.ok(planTrialProposal());assert.ok(envelopeProbeProposal());assert.ok(prefixProbeProposal());assert.equal(preflightPrefixProbe(dirs.history.prefixDirectory,dirs.history.envelopeDirectory,dirs.history.priorDirectory,dirs.history.parentDirectory).ready,false);assert.equal(readPlanTrialHistory(dirs.history.parentDirectory).dispatchEnabled,false);
});
test('missing-header SSE prefix without completion cannot publish, while explicit non-SSE full transcript still rejects',async t=>{
 for(const onGenerate of [()=>new Response(Buffer.from('data: {"type":"response.created"}\n\n')),body=>new Response(Buffer.concat(planTranscript({body})),{headers:{'Content-Type':'text/html'}}),body=>new Response(Buffer.concat(planTranscript({body})),{headers:{'Content-Type':'text/plain'}})]){
  const {output,http}=await run(t,{onGenerate});assert.equal(output.receipt.status,'failed');assert.equal(output.receipt.checkpoint.saved_scenes,0);assert.equal(output.receipt.external_calls_started,1);assert.equal(output.dream,null);assert.equal(http.bodies.length,1);assert.equal(output.receipt.usage[0].usage,'unknown');
 }
});
test('precheck network failure leaves approval unchanged and queued cancellation is terminal without login',async t=>{
 const dirs=await setup(t);approve(dirs.directory);const before=fs.readFileSync(path.join(dirs.directory,'state.json'),'utf8'),saved=globalThis.fetch;let checks=0;globalThis.fetch=async()=>{checks++;throw Error('PRIVATE-NETWORK',{cause:{code:'UND_ERR_CONNECT_TIMEOUT'}});};try{const out=await executePlanTrial({...dirs,onReady:()=>assert.fail('precheck login')});assert.equal(out.receipt.external_calls_started,0);assert.equal(out.networkPrecheck.httpDiagnostic.network_code,'UND_ERR_CONNECT_TIMEOUT');assert.equal(JSON.stringify(out).includes('PRIVATE'),false);}finally{globalThis.fetch=saved;}assert.equal(checks,1);assert.equal(fs.readFileSync(path.join(dirs.directory,'state.json'),'utf8'),before);
 const controller=new AbortController();controller.abort();const out=await executePlanTrial({...dirs,signal:controller.signal,onReady:()=>assert.fail('queued login')});assert.equal(out.receipt.status,'cancelled');assert.equal(preflightPlanTrial(dirs.directory).ready,false);await executePlanTrial({...dirs,onReady:()=>assert.fail('cancel replay')});
});
test('ancestor withdrawal and changed prefix observation block this grant before any new authorization',async t=>{
 for(const mode of ['withdraw','change']){const dirs=await setup(t);approve(dirs.directory);const store=new Store(dirs.history.prefixDirectory);if(mode==='withdraw')store.withdraw('fictional-plan-window-memory');else{store.state.planPrefixProbe.observation.prefix.prefixShape='html_like_prefix';store.save();}store.close();await assert.rejects(executePlanTrial({...dirs,onReady:()=>assert.fail('history login')}));assert.throws(()=>approve(dirs.directory));}
});
test('interrupted authorization replays uncertain without login and cannot reset its grant',async t=>{
 const dirs=await setup(t);approve(dirs.directory);const trial=new URL('../scripts/missing-type-plan-trial.mjs',import.meta.url).href,storeUrl=new URL('../src/store.js',import.meta.url).href,fixture=new URL('../test-support/plan-trial-fixtures.js',import.meta.url).href;
 const checked=`import {executeMissingTypeTrial} from ${JSON.stringify(trial)};import {Store} from ${JSON.stringify(storeUrl)};import {syntheticPlanHttp} from ${JSON.stringify(fixture)};const save=Store.prototype.save;Store.prototype.save=function(){const result=save.call(this);if(this.state.planMissingTypeDreamTrial?.status==='authorizing')process.exit(48);return result;};syntheticPlanHttp().install();await executeMissingTypeTrial({directory:process.argv[1],connectionDirectory:process.argv[2],history:JSON.parse(process.argv[3]),onReady:()=>process.exit(49)});`;
 const child=spawnSync(process.execPath,['--input-type=module','-e',checked,dirs.directory,dirs.connectionDirectory,JSON.stringify(dirs.history)],{encoding:'utf8'});assert.equal(child.status,48,child.stderr);const replay=await executePlanTrial({...dirs,onReady:()=>assert.fail('uncertain login')});assert.equal(replay.receipt.status,'uncertain');assert.equal(replay.receipt.external_calls_started,0);assert.equal(replay.receipt.remoteRevocationConfirmed,'unknown');assert.equal(approve(dirs.directory).ready,false);
});
test('dreambook reads the new identity explicitly and withdrawal suppresses its list/read without new calls',async t=>{
 const {directory,output,http}=await run(t),cli=fileURLToPath(new URL('../scripts/dreambook.mjs',import.meta.url)),before=fs.readFileSync(path.join(directory,'state.json'),'utf8');let child=spawnSync(process.execPath,[cli,'read','--latest','--data-dir',directory],{encoding:'utf8'});assert.equal(child.status,0,child.stderr);assert.match(child.stdout,/A small clock/);assert.equal(fs.readFileSync(path.join(directory,'state.json'),'utf8'),before);assert.equal(http.bodies.length,3);const store=new Store(directory);store.withdraw('fictional-plan-window-memory');store.close();child=spawnSync(process.execPath,[cli,'read','--latest','--data-dir',directory],{encoding:'utf8'});assert.equal(child.status,0,child.stderr);assert.match(child.stdout,/当前没有可查看的已保存梦境/);assert.equal(child.stdout.includes(output.dream.scenes[0].event),false);
});
test('active opaque capability still requires explicit missing-type opt-in and original port refuses candidate transport',async t=>{
 const dirs=await setup(t),http=syntheticPlanHttp();http.install();try{const out=await withCheckedPlanSession({directory:dirs.connectionDirectory,onReady:http.onReady},session=>{
  for(const allowMissingContentType of [undefined,false])assert.throws(()=>createPlanHttpTransport({session,model:'gpt-5.6-sol',authorize(){},allowMissingContentType}),/authorization_required/);
  const transport=createPlanHttpTransport({session,model:'gpt-5.6-sol',authorize(){},allowMissingContentType:true});assert.equal(transport.ready(),true);assert.throws(()=>new OriginalPlanAdapter({model_id:'gpt-5.6-sol',httpTransport:transport}),/unreviewed_model_adapter/);return {synthetic:true};
 });assert.equal(out.remoteRevocationConfirmed,true);assert.equal(http.bodies.length,0);}finally{http.restore();}
});
test('process death after queued run registration cannot make the interrupted trial ready or start OAuth again',async t=>{
 const dirs=await setup(t);approve(dirs.directory);const trial=new URL('../scripts/missing-type-plan-trial.mjs',import.meta.url).href,storeUrl=new URL('../src/store.js',import.meta.url).href,fixture=new URL('../test-support/plan-trial-fixtures.js',import.meta.url).href,code=`import {executeMissingTypeTrial} from ${JSON.stringify(trial)};import {Store} from ${JSON.stringify(storeUrl)};import {syntheticPlanHttp} from ${JSON.stringify(fixture)};const save=Store.prototype.save;Store.prototype.save=function(){const result=save.call(this),t=this.state.planMissingTypeDreamTrial;if(t?.runId&&this.state.runs[t.runId]?.status==='queued')process.exit(46);return result;};const http=syntheticPlanHttp();http.install();await executeMissingTypeTrial({directory:process.argv[1],connectionDirectory:process.argv[2],history:JSON.parse(process.argv[3]),onReady:http.onReady});`;
 const child=spawnSync(process.execPath,['--input-type=module','-e',code,dirs.directory,dirs.connectionDirectory,JSON.stringify(dirs.history)],{encoding:'utf8'});assert.equal(child.status,46,child.stderr);assert.equal(preflightPlanTrial(dirs.directory).status,'uncertain');assert.equal(preflightPlanTrial(dirs.directory).ready,false);const replay=await executePlanTrial({...dirs,onReady:()=>assert.fail('queued crash replay')});assert.equal(replay.receipt.status,'uncertain');assert.equal(replay.receipt.external_calls_started,0);assert.equal(replay.dream,null);
});
