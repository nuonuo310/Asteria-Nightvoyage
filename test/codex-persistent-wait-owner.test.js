import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {openFictionalTrialStore} from '../scripts/codex-fictional-trial-store.mjs';
import {persistentWaitIdentity,rehearseCodexPersistentWait,observeNativeCodexPersistentWait} from '../scripts/codex-persistent-wait-owner.mjs';
// Only the parent owner uses this independent clock. No real consent or native test is implied.
const fixtureClock=Date.parse('2026-10-20T12:00:00.000Z'),realClock=Date.now;Date.now=()=>fixtureClock;
test.after(()=>{Date.now=realClock;});
function setup(){const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-persistent-wait-test-'));return {directory,settings:{stateDirectory:directory,timeoutMs:2000},record:()=>JSON.parse(fs.readFileSync(path.join(directory,'fictional-trial.json'))),close(){fs.rmSync(directory,{recursive:true,force:true});}};}
test('new owner retains two logical intents after temporary cleanup and blocks a repeated launch before any child',async()=>{
 const f=setup();try{const r=await rehearseCodexPersistentWait('observed',f.settings);assert.equal(r.status,'selected_wait_denial_observed',JSON.stringify(r));assert.equal(r.fixtureModelPosts,2);assert.equal(r.localForwardAccounting.intentsCheckedBeforeFixtureArrival,2);assert.equal(r.localForwardAccounting.fictionalTrialAccountingIntegrated,true);assert.equal(r.retainedAllowance.phase,'completed');assert.equal(r.retainedAllowance.calls,2);assert.equal(r.retainedAllowanceClosed,true);assert.equal(r.retainedAllowancePresent,true);assert.equal(r.retainedRelayPresent,true);assert.equal(r.temporaryCleanupComplete,true);assert.equal(r.nativePersistentFixtureIntegrated,false);assert.equal(r.realUserApprovalRecorded,false);
  const before=fs.readFileSync(path.join(f.directory,'fictional-trial.json'));const replay=await rehearseCodexPersistentWait('observed',f.settings);assert.equal(replay.reason,'persistent_trial_create_blocked');assert.equal(replay.processStarted,false);assert.deepEqual(fs.readFileSync(path.join(f.directory,'fictional-trial.json')),before);
  const o=openFictionalTrialStore({directory:f.directory,identity:persistentWaitIdentity(),mode:'open',now:fixtureClock});assert.equal(o.view().phase,'completed');assert.throws(()=>o.reserve({request_id:'third',request_hash:'c'.repeat(64)},fixtureClock));o.close();
 }finally{f.close();}
});
for(const scenario of ['host_enabled','foreign_warning','wrong_output','wrong_call','second_unknown_tools','stderr_error'])test('persistent owner preserves guard and protocol refusal: '+scenario,async()=>{
 const f=setup();try{const r=await rehearseCodexPersistentWait(scenario,f.settings);assert.equal(r.status,'blocked');assert.ok(r.fixtureModelPosts<=2);assert.equal(r.ownedProcessClosed,true);assert.equal(r.temporaryCleanupComplete,true);assert.equal(r.retainedAllowancePresent,true);assert.equal(r.retainedAllowanceClosed,true);const again=await rehearseCodexPersistentWait('observed',f.settings);assert.equal(again.processStarted,false);assert.equal(again.reason,'persistent_trial_create_blocked');}finally{f.close();}
});
test('pre-start cancellation retains a terminal zero-call record and cannot relaunch',async()=>{
 const f=setup();try{const c=new AbortController();c.abort();const r=await rehearseCodexPersistentWait('observed',{...f.settings,signal:c.signal});assert.equal(r.status,'cancelled');assert.equal(r.processStarted,false);assert.equal(f.record().phase,'cancelled');assert.equal(f.record().attempts.length,0);assert.equal((await rehearseCodexPersistentWait('observed',f.settings)).processStarted,false);}finally{f.close();}
});
test('in-flight cancellation retains consumed call and cancelled state without a second request',async()=>{
 const f=setup();try{const c=new AbortController(),p=rehearseCodexPersistentWait('stall_after_call',{...f.settings,signal:c.signal});const timer=setInterval(()=>{try{if(JSON.parse(fs.readFileSync(path.join(f.directory,'relay','forward-journal.json'))).phase==='continuation_ready')c.abort();}catch{}},5);let r;try{r=await p;}finally{clearInterval(timer);}assert.equal(r.status,'cancelled');assert.equal(r.fixtureModelPosts,1);assert.equal(r.retainedAllowance.phase,'cancelled');assert.equal(r.retainedAllowance.calls,1);assert.equal(r.retainedAllowanceClosed,true);assert.equal(r.temporaryCleanupComplete,true);}finally{f.close();}
});
test('partial persistence, identity mismatch and expired policy block before child launch',async()=>{
 for(const scenario of ['partial','foreign','expired']){const f=setup();try{if(scenario==='partial')fs.writeFileSync(path.join(f.directory,'fictional-trial.json.next'),'partial');if(scenario==='foreign'){const o=openFictionalTrialStore({directory:f.directory,identity:{...persistentWaitIdentity(),run_id:'foreign'},mode:'create',now:fixtureClock});o.close();}if(scenario==='expired')Date.now=()=>persistentWaitIdentity().expires_at;
  const r=await rehearseCodexPersistentWait('observed',f.settings);assert.equal(r.reason,'persistent_trial_create_blocked');assert.equal(r.processStarted,false);
 }finally{Date.now=()=>fixtureClock;f.close();}}
});
test('candidate arguments cannot request credentials, a different model, target, cell, or an implicit native path',()=>{
 const f=setup();try{for(const extra of [{token:'FICTIONAL-PRIVATE'},{model:'other'},{target:'https://api.openai.com'},{cell_id:'other'}])assert.throws(()=>rehearseCodexPersistentWait('observed',{...f.settings,...extra}));assert.throws(()=>observeNativeCodexPersistentWait(process.execPath,f.settings));assert.throws(()=>rehearseCodexPersistentWait());assert.deepEqual(fs.readdirSync(f.directory),[]);
  const cli=fileURLToPath(new URL('../scripts/check-codex-persistent-wait.mjs',import.meta.url));for(const args of [['--login'],['--state-directory',f.directory],['--native-executable'],['--target','https://api.openai.com']]){const p=spawnSync(process.execPath,[cli,...args],{encoding:'utf8'});assert.equal(p.status,1);assert.equal(JSON.parse(p.stdout).dispatchEnabled,false);}
 }finally{f.close();}
});

test('unexpected continuation cannot expand retained two-call allowance',async()=>{
 const f=setup();try{const r=await rehearseCodexPersistentWait('third_post',f.settings);assert.ok(r.fixtureModelPosts<=2);assert.ok(r.retainedAllowance.calls<=2);assert.equal(r.retainedAllowanceClosed,true);assert.equal(r.temporaryCleanupComplete,true);assert.equal((await rehearseCodexPersistentWait('observed',f.settings)).processStarted,false);}finally{f.close();}
});
