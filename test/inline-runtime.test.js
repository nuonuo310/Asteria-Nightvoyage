// Project-owned lifecycle probes adapted to the distinct inline wire and offline runtime.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {InlineRehearsal,inlineRuntimeVersion,buildInlineRehearsalRequest} from '../test-support/inline-evidence-runtime.js';
import {Store} from '../src/store.js';
import {GatedDeepSeekClient} from '../src/gated-deepseek-client.js';
import {coupledTrialPinsMatch} from '../src/coupled-trial-config.js';
import {inlineSeed,inlineResponse} from '../test-support/inline-runtime-fixtures.js';
import {sceneContinuityPrompt} from '../src/scene-continuity-prompt.js';
import {continuityTrialPinsMatch} from '../src/continuity-trial-config.js';
import {validateAllowance} from '../src/budget-ledger.js';
import {prunedV2ReviewedConfig} from '../src/pruned-v2-reviewed-profile.js';
function directory(t){const d=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-continuity-runtime-'));t.after(()=>fs.rmSync(d,{recursive:true,force:true}));return d;}
function setup(t,extra={}){const d=directory(t),calls=[];const e=new InlineRehearsal(d,{simulator:request=>{calls.push(structuredClone(request));return inlineResponse(request);},...extra});t.after(()=>e.close());return{d,e,calls};}
function child(directory,body){const url=p=>pathToFileURL(path.resolve(p)).href;return spawnSync(process.execPath,['--input-type=module','-e',`import {InlineRehearsal} from ${JSON.stringify(url('test-support/inline-evidence-runtime.js'))};import {inlineSeed,inlineResponse} from ${JSON.stringify(url('test-support/inline-runtime-fixtures.js'))};const directory=${JSON.stringify(directory)};${body}`],{encoding:'utf8',timeout:15000});}

test('new wire has one inline schema and cannot become a paid allowance or unknown stage',()=>{
  const payload={snapshot:inlineSeed(),scenes:[],stage:'scene',index:0},r=buildInlineRehearsalRequest(payload),system=r.body.messages[0].content;
  const example=JSON.parse(system.split('\n').find(l=>l.startsWith('JSON shape example:')).slice('JSON shape example:'.length));assert.deepEqual(Object.keys(example),['event','appraisal','basis','affect']);assert.equal(Object.hasOwn(example,'delta'),false);assert.equal(Object.hasOwn(example,'evidence'),false);assert.equal(Object.hasOwn(example,'links'),false);assert.equal(r.protocolVersion,inlineRuntimeVersion);assert.equal(r.body.max_tokens,400);assert.equal(r.body.stream,false);assert.equal(Object.hasOwn(r.body,'tools'),false);
  assert.throws(()=>buildInlineRehearsalRequest({...payload,stage:'other'}),/invalid_inline_stage/);assert.throws(()=>validateAllowance({...prunedV2ReviewedConfig().allowance,protocolVersion:inlineRuntimeVersion}));assert.equal(continuityTrialPinsMatch(),true);
});
test('derived offline view is copied, validates checkpoints and parent identity, and disappears on deletion',async t=>{
  const {e,d}=setup(t),id=e.start('view','view',inlineSeed());await e.execute(id);const entryId=e.result(id).dream.id,original=e.read(entryId),view=e.appraisalView(entryId);assert.equal(view.origin,'offline_inline_appraisal_view');assert.equal(view.isRealityFact,false);assert.equal(view.qualityAssessed,false);view.scenes[0].event='MUTATED';view.sourceRefs.length=0;assert.deepEqual(e.read(entryId),original);assert.notEqual(e.appraisalView(entryId).scenes[0].event,'MUTATED');
  const r=e.store.state.runs[id],version=r.appraisalProtocolVersion;r.appraisalProtocolVersion='coupled-affect-quotes-v1';assert.throws(()=>e.appraisalView(entryId),/inline_runtime_identity_mismatch/);r.appraisalProtocolVersion=version;const saved=r.scenes[0].after.valence;r.scenes[0].after.valence=.77;assert.throws(()=>e.appraisalView(entryId),/invalid_inline_checkpoint/);r.scenes[0].after.valence=saved;e.deleteEntry(entryId);assert.equal(e.appraisalView(entryId),null);e.close();const reopened=new InlineRehearsal(d,{simulator:inlineResponse});try{assert.equal(reopened.appraisalView(entryId),null);}finally{reopened.close();}
});
test('numeric inline quote and old table format are not repaired or dispatched again',async t=>{
  for(const mutate of [v=>v.affect={kind:'estimated',delta:{valence:.1,arousal:0},excerpt:0},v=>{delete v.basis;v.evidence=[];v.links={goal:null,control:null,uncertainty:null};}]){let calls=0;const {e}=setup(t,{simulator:r=>{calls++;const response=inlineResponse(r),value=JSON.parse(response.body.choices[0].message.content);mutate(value);response.body.choices[0].message.content=JSON.stringify(value);return response;}}),id=e.start('invalid','invalid',inlineSeed());await e.execute(id);assert.equal(calls,1);assert.equal(e.result(id).dream,null);assert.equal(e.status(id).stagesSaved,0);assert.throws(()=>e.resume(id),/inline_resume_requires_saved_prefix/);}
});
test('fixed command guards native transport and credential reads and reports mechanism only',()=>{
  const r=spawnSync(process.execPath,['scripts/check-inline-runtime.mjs'],{encoding:'utf8',timeout:15000});assert.equal(r.status,0,r.stderr);const v=JSON.parse(r.stdout);assert.equal(v.fakeStageCalls,3);assert.equal(v.realModelRequests,0);assert.equal(v.credentialReads,0);assert.equal(v.currentPaidSourcePinsMatch,true);assert.equal(v.paidLedgerCreated,false);assert.equal(v.withdrawalSurvivesReopen,true);assert.equal(v.qualityAssessed,false);assert.equal(v.liveProtocolEnabled,false);
});

test('candidate runtime persists distinct identity before calls and sends changed second prompt to simulator exactly once',async t=>{
  const {e,d,calls}=setup(t),id=e.start('continuity','continuity',inlineSeed());const saved=JSON.parse(fs.readFileSync(path.join(d,'state.json')));assert.equal(saved.runs[id].appraisalProtocolVersion,inlineRuntimeVersion);assert.equal(saved.runs[id].budgetKind,'fake_byte_estimate_only');assert.match(saved.runs[id].promptCandidateHash,/^[a-f0-9]{64}$/);assert.equal(calls.length,0);assert.equal((await e.execute(id)).status,'completed');assert.equal(calls.length,3);assert.deepEqual(calls.map(r=>r.body.messages[0].content.includes(sceneContinuityPrompt)),[false,true,false]);const result=e.result(id);assert.equal(result.dream.origin,'dream');assert.equal(result.dream.isRealityFact,false);assert.equal(result.wake.origin,'wake_note');assert.ok(result.dream.scenes.every(s=>s.appraisalBasis.protocolVersion===inlineRuntimeVersion));assert.equal(e.store.state.billing,undefined);
});
test('duplicate request/session and completed replay across reopen consume no additional calls',async t=>{
  const {e,d,calls}=setup(t),id=e.start('one','same-session',inlineSeed());await e.execute(id);assert.equal(e.start('one','same-session',inlineSeed()),id);assert.equal(e.start('two','same-session',inlineSeed()),id);await e.execute(id);assert.equal(calls.length,3);e.close();let again=0;const reopened=new InlineRehearsal(d,{simulator:()=>{again++;throw Error('must_not_call');}});try{await reopened.execute(id);assert.equal(again,0);assert.equal(reopened.result(id).receipt.budget.calls,3);}finally{reopened.close();}
});
test('request conflicts and changed saved prompt identity cannot be resumed or relabeled',async t=>{
  const {e}=setup(t),id=e.start('one','one',inlineSeed());const changed=inlineSeed();changed.sources[0].text+='独立虚构变更';assert.throws(()=>e.start('one','one',changed),/request_conflict/);e.store.state.runs[id].promptCandidateHash='0'.repeat(64);assert.throws(()=>e.execute(id),/inline_runtime_identity_mismatch/);
});
test('live/credential/fetch overrides and absent simulator reject before creating Store',t=>{
  const root=directory(t);for(const options of [{},{mode:'live',simulator:inlineResponse},{credential:'DUMMY',simulator:inlineResponse},{fetchImpl:()=>{},simulator:inlineResponse}]){const d=path.join(root,String(Object.keys(options).join('-')||'missing'));assert.throws(()=>new InlineRehearsal(d,options));assert.equal(fs.existsSync(d),false);}assert.throws(()=>new GatedDeepSeekClient(null,{protocol:inlineRuntimeVersion}),/unreviewed_transport_protocol/);
});
test('real or egress-enabled sources, incompatible scene/output settings and malformed checkpoints reject',async t=>{
  const {e}=setup(t);for(const mutate of [s=>s.materialKind='real',s=>s.sources[0].grant.modelEgress=true]){const s=inlineSeed();mutate(s);assert.throws(()=>e.start('bad','bad',s));}assert.throws(()=>e.start('one','one',inlineSeed(),{scenes:1}),/invalid_inline_runtime_settings/);assert.throws(()=>e.start('one','one',inlineSeed(),{perCallOutput:200}),/invalid_inline_runtime_settings/);
  const id=e.start('ok','ok',inlineSeed());await e.execute(id);e.store.state.runs[id].scenes[0].after.valence=.3;assert.throws(()=>e.execute(id));
});
test('queued cancellation spends no fake call and terminal replay cannot restart',async t=>{
  const {e,calls}=setup(t),id=e.start('cancel','cancel',inlineSeed());e.cancel(id);await e.execute(id);assert.equal(calls.length,0);assert.equal(e.status(id).status,'cancelled');assert.throws(()=>e.resume(id),/inline_resume_requires_saved_prefix/);
});
test('in-flight cancellation reaches simulator and suppresses all late content',async t=>{
  let release,entered,aborted=false;const pending=new Promise(r=>entered=r),{e}=setup(t,{simulator:(request,{signal})=>{signal.addEventListener('abort',()=>aborted=true);entered();return new Promise(resolve=>release=()=>resolve(inlineResponse(request)));}});const id=e.start('cancel','cancel',inlineSeed()),run=e.execute(id);await pending;e.cancel(id);await run;release();await new Promise(r=>setImmediate(r));assert.equal(aborted,true);assert.equal(e.result(id).dream,null);assert.equal(e.status(id).budget.calls,1);assert.equal(e.store.state.runs[id].scenes.length,0);
});
test('timeout aborts simulator, preserves consumed fake attempt and never implicitly repairs',async t=>{
  let aborted=false,calls=0;const {e}=setup(t,{simulator:(_r,{signal})=>{calls++;signal.addEventListener('abort',()=>aborted=true);return new Promise(()=>{});}}),id=e.start('timeout','timeout',inlineSeed(),{timeoutMs:10});await e.execute(id);assert.equal(e.status(id).error,'timeout');assert.equal(aborted,true);assert.equal(calls,1);assert.throws(()=>e.resume(id),/inline_resume_requires_saved_prefix/);
});
test('fake call cap stops after saved prefix and cannot become an implicit fourth call',async t=>{
  const {e,calls}=setup(t),id=e.start('cap','cap',inlineSeed(),{maxCalls:2});await e.execute(id);assert.equal(calls.length,2);assert.equal(e.status(id).status,'failed');assert.equal(e.result(id).dream,null);await e.resume(id);assert.equal(calls.length,2);assert.equal(e.status(id).error,'budget_exhausted');
});
test('malformed scene or novel wake fails without repair, even after two valid saved scenes',async t=>{
  for(const stage of ['scene','wake']){let calls=0;const {e}=setup(t,{simulator:r=>{calls++;const response=inlineResponse(r),m=JSON.parse(r.body.messages[1].content);if(m.stage===stage){const v=JSON.parse(response.body.choices[0].message.content);if(stage==='scene')v.affect={kind:'estimated',delta:{valence:.1,arousal:.1},excerpt:null};else v.fragment='另编的虚构结尾';response.body.choices[0].message.content=JSON.stringify(v);}return response;}}),id=e.start(stage,stage,inlineSeed());await e.execute(id);assert.equal(e.result(id).dream,null);assert.equal(calls,stage==='scene'?1:3);assert.throws(()=>e.resume(id),/inline_resume_requires_saved_prefix/);}
});
test('completed source withdrawal clears body and cached recall through reopen',async t=>{
  const {e,d}=setup(t),seed=inlineSeed(),id=e.start('withdraw','withdraw',seed);await e.execute(id);const packet=e.result(id),cue=packet.dream.scenes[0].event.slice(0,4);assert.equal(e.recall(cue,'before').length,1);e.withdraw(seed.sources[0].id);assert.deepEqual(e.recall(cue,'after'),[]);assert.equal(e.result(id).dream,null);e.close();const reopened=new InlineRehearsal(d,{simulator:inlineResponse});try{assert.equal(reopened.result(id).dream,null);assert.deepEqual(reopened.recall(cue,'before'),[]);assert.ok(!fs.readFileSync(path.join(d,'state.json'),'utf8').includes(packet.wake.fragment));}finally{reopened.close();}
});
test('source withdrawal in-flight aborts and never saves late simulated body',async t=>{
  let entered,release;const pending=new Promise(r=>entered=r),{e}=setup(t,{simulator:r=>{entered();return new Promise(resolve=>release=()=>resolve(inlineResponse(r)));}}),seed=inlineSeed(),id=e.start('withdraw','withdraw',seed),run=e.execute(id);await pending;e.withdraw(seed.sources[0].id);await run;release();await new Promise(r=>setImmediate(r));assert.equal(e.status(id).status,'revoked');assert.equal(e.store.state.runs[id].scenes,undefined);assert.equal(e.result(id).dream,null);
});
for(const point of ['dispatched','scene_saved'])test(`actual child exit at ${point} requires explicit safe recovery and never regenerates saved scene`,async t=>{
  const d=directory(t),run=child(d,`const e=new InlineRehearsal(directory,{simulator:inlineResponse,fault:p=>{if(p===${JSON.stringify(point)})process.exit(86);}});const id=e.start('crash','crash',inlineSeed());await e.execute(id);`);assert.equal(run.status,86,run.stderr);let calls=0;const e=new InlineRehearsal(d,{simulator:r=>{calls++;return inlineResponse(r);}});try{const id=e.store.state.requests.crash.runId;assert.equal(e.status(id).status,'uncertain');await e.execute(id);assert.equal(calls,0);if(point==='dispatched'){assert.throws(()=>e.resume(id),/inline_resume_requires_saved_prefix/);assert.equal(e.status(id).budget.calls,1);}else{await e.resume(id);assert.equal(e.status(id).status,'completed');assert.equal(calls,2);assert.equal(e.status(id).budget.calls,3);}}finally{e.close();}
});
test('storage failure fails closed before simulator dispatch; unrelated old accounting remains unchanged',async t=>{
  const {e,calls,d}=setup(t);e.store.state.billing={version:1,accounts:{'fictional-prior':{attempts:{a:{status:'unknown',chargedMicroCny:'2203200'}},runIds:[]}}};e.store.save();const billing=structuredClone(e.store.state.billing),id=e.start('failure','failure',inlineSeed()),rename=fs.renameSync;fs.renameSync=()=>{throw Error('DUMMY-FAIL');};try{await assert.rejects(e.execute(id),/storage_io_failure/);}finally{fs.renameSync=rename;}assert.equal(calls.length,0);e.close();const store=new Store(d);try{assert.deepEqual(store.state.billing,billing);}finally{store.close();}assert.equal(coupledTrialPinsMatch(),false);
});
test('fake input/output reservations are bounded and remain explicitly byte estimates, not provider usage',async t=>{
  for(const [settings,expected]of [[{inputTokens:1},0],[{outputTokens:400},1]]){const {e,calls}=setup(t),id=e.start('bounded','bounded',inlineSeed(),settings);await e.execute(id);assert.equal(calls.length,expected);assert.equal(e.status(id).error,'budget_exhausted');assert.equal(e.store.state.runs[id].budgetKind,'fake_byte_estimate_only');assert.equal(e.store.state.billing,undefined);}
});
test('oversized candidate request never reaches simulator or raises the 65536-byte ceiling',async t=>{
  const {e,calls}=setup(t),seed=inlineSeed();seed.sources[0].text='"'.repeat(19000);const id=e.start('oversized','oversized',seed);await e.execute(id);assert.equal(calls.length,0);assert.equal(e.result(id).dream,null);assert.equal(e.status(id).budget.calls,1);
});
test('cancellation after durable scene prevents later stages and parent deletion cannot resurrect completed result',async t=>{
  let id,e;const d=directory(t);let calls=0;e=new InlineRehearsal(d,{simulator:r=>{calls++;return inlineResponse(r);},fault:p=>{if(p==='scene_saved')e.cancel(id);}});t.after(()=>e.close());id=e.start('cancel-prefix','cancel-prefix',inlineSeed());await e.execute(id);assert.equal(calls,1);assert.equal(e.status(id).stagesSaved,1);assert.equal(e.status(id).status,'cancelled');await e.execute(id);assert.equal(calls,1);
  const next=setup(t),done=next.e.start('done','done',inlineSeed());await next.e.execute(done);next.e.deleteEntry(next.e.result(done).dream.id);await next.e.execute(done);assert.equal(next.calls.length,3);assert.equal(next.e.result(done).dream,null);
});
test('four full fabricated historical unknown holds survive separate fake run and source withdrawal',async t=>{
  const {prepareCoupledHistory}=await import('../test-support/coupled-trial-fixtures.js');const d=prepareCoupledHistory(t),e=new InlineRehearsal(d,{simulator:inlineResponse});try{const {BudgetLedger}=await import('../src/budget-ledger.js');const {prunedV2ReviewedConfig}=await import('../src/pruned-v2-reviewed-profile.js');const ledger=new BudgetLedger(e.store),allowance={...prunedV2ReviewedConfig().allowance,id:'independent-fourth-synthetic-hold'};ledger.approve(allowance);ledger.reserve(allowance.id,{requestId:'synthetic-fourth-call',runId:'synthetic-fourth-run',fingerprint:'a'.repeat(64),sourceRefs:[{id:'q-sparse-memory',version:'1'}],maxOutputTokens:400},allowance.pricing.checkedAt+1000);ledger.dispatch(allowance.id,'synthetic-fourth-call');ledger.unknown(allowance.id,'synthetic-fourth-call');const billing=structuredClone(e.store.state.billing),rows=Object.values(billing.accounts).flatMap(a=>Object.values(a.attempts)).filter(r=>r.status==='unknown');assert.equal(rows.length,4);assert.equal(rows.reduce((n,r)=>n+BigInt(r.chargedMicroCny),0n),8812800n);const seed=inlineSeed(),id=e.start('new-offline','new-offline',seed);await e.execute(id);assert.equal(e.status(id).status,'completed');e.withdraw(seed.sources[0].id);assert.deepEqual(e.store.state.billing,billing);e.close();const reopened=new InlineRehearsal(d,{simulator:inlineResponse});try{assert.deepEqual(reopened.store.state.billing,billing);assert.equal(reopened.appraisalView('dream-'+id),null);}finally{reopened.close();}}finally{e.close();}
});
for(const dispatchedCount of [2,3])test(`actual exit on dispatch ${dispatchedCount} preserves prior scenes but cannot retry the ambiguous stage`,async t=>{
  const d=directory(t),run=child(d,`let dispatched=0;const e=new InlineRehearsal(directory,{simulator:inlineResponse,fault:p=>{if(p==='dispatched'&&++dispatched===${dispatchedCount})process.exit(88);}});const id=e.start('prefix','prefix',inlineSeed());await e.execute(id);`);assert.equal(run.status,88,run.stderr);let calls=0;const e=new InlineRehearsal(d,{simulator:r=>{calls++;return inlineResponse(r);}});try{const id=e.store.state.requests.prefix.runId;assert.equal(e.status(id).stagesSaved,dispatchedCount-1);assert.equal(e.status(id).budget.calls,dispatchedCount);await e.execute(id);assert.equal(calls,0);assert.throws(()=>e.resume(id),/inline_resume_requires_saved_prefix/);assert.equal(e.result(id).dream,null);}finally{e.close();}
});
