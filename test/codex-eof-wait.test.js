import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {openFictionalTrialStore} from '../scripts/codex-fictional-trial-store.mjs';
import {persistentWaitIdentity,eofWaitIdentity,rehearseCodexEofWait,observeNativeCodexEofWait} from '../scripts/codex-persistent-wait-owner.mjs';
const clock=Date.parse('2026-10-20T12:00:00.000Z'),realClock=Date.now;Date.now=()=>clock;test.after(()=>{Date.now=realClock;});
function setup(){const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-eof-entry-test-'));return {directory,options:{stateDirectory:directory,timeoutMs:2000},close(){fs.rmSync(directory,{recursive:true,force:true});}};}
test('EOF observation has a distinct fixed identity while legacy identity stays exactly preserved',()=>{
 const old=persistentWaitIdentity(),fresh=eofWaitIdentity();
 const archived=JSON.parse(fs.readFileSync(new URL('../docs/validation/user-local-codex-persistent-wait-excerpt-windows.json',import.meta.url))).reportedFields.retainedAllowance.identity;
 assert.deepEqual(old,archived);for(const key of ['approval_id','run_id','protocol_version','source_hash'])assert.notEqual(fresh[key],old[key]);
 assert.equal(fresh.fixture_hash,old.fixture_hash);assert.equal(fresh.max_calls,2);assert.equal(fresh.model_id,'gpt-5.6-sol');assert.equal(fresh.expires_at,old.expires_at);assert.equal(fresh.confirmation_origin,'independent_fictional_fixture');
});
test('fresh EOF owner completes two requests with normal exit and cannot repeat; unrelated old state is untouched',async()=>{
 const f=setup(),old=path.join(f.directory,'old'),fresh=path.join(f.directory,'fresh');fs.mkdirSync(old);fs.mkdirSync(fresh);
 try{const seed=openFictionalTrialStore({directory:old,identity:persistentWaitIdentity(),mode:'create',now:clock});seed.cancel(clock);seed.close();const file=path.join(old,'fictional-trial.json'),before=fs.readFileSync(file);
  const r=await rehearseCodexEofWait('observed',{stateDirectory:fresh,timeoutMs:2000});assert.equal(r.status,'selected_wait_denial_observed',JSON.stringify(r));assert.equal(r.contractVersion,'codex-local-persistent-eof-wait-v1');assert.deepEqual(r.retainedAllowance.identity,eofWaitIdentity());assert.equal(r.retainedAllowance.calls,2);assert.equal(r.retainedAllowance.phase,'completed');assert.equal(r.retainedAllowanceClosed,true);assert.equal(r.ownedShutdown.gracefulZeroExitObserved,true);assert.equal(r.temporaryCleanupComplete,true);assert.equal(r.localForwardAccounting.intentsCheckedBeforeFixtureArrival,2);assert.deepEqual(fs.readFileSync(file),before);
  const stored=fs.readFileSync(path.join(fresh,'fictional-trial.json'));const repeated=await rehearseCodexEofWait('observed',{stateDirectory:fresh});assert.equal(repeated.processStarted,false);assert.equal(repeated.reason,'persistent_trial_create_blocked');assert.deepEqual(fs.readFileSync(path.join(fresh,'fictional-trial.json')),stored);
 }finally{f.close();}
});
test('new entry cannot adopt or renew an existing legacy allowance',async()=>{
 const f=setup();try{const seed=openFictionalTrialStore({directory:f.directory,identity:persistentWaitIdentity(),mode:'create',now:clock});seed.close();const before=fs.readFileSync(path.join(f.directory,'fictional-trial.json'));const r=await rehearseCodexEofWait('observed',f.options);assert.equal(r.processStarted,false);assert.equal(r.reason,'persistent_trial_create_blocked');assert.deepEqual(fs.readFileSync(path.join(f.directory,'fictional-trial.json')),before);}finally{f.close();}
});
test('pre-start cancellation consumes the distinct entry at zero calls',async()=>{
 const f=setup();try{const c=new AbortController();c.abort();const r=await rehearseCodexEofWait('observed',{...f.options,signal:c.signal});assert.equal(r.status,'cancelled');assert.equal(r.retainedAllowance.calls,0);assert.equal(r.retainedAllowance.phase,'cancelled');assert.equal(r.retainedAllowance.identity.run_id,eofWaitIdentity().run_id);assert.equal((await rehearseCodexEofWait('observed',f.options)).processStarted,false);}finally{f.close();}
});
test('invalid continuation remains blocked and never takes normal EOF completion',async()=>{
 const f=setup();try{const r=await rehearseCodexEofWait('wrong_output',f.options);assert.equal(r.status,'blocked');assert.equal(r.ownedShutdown.stdinEofRequested,false);assert.ok(r.retainedAllowance.calls<=2);assert.equal(r.retainedAllowanceClosed,true);assert.equal(r.temporaryCleanupComplete,true);}finally{f.close();}
});
test('no-argument CLI is an independent rehearsal; its receipt requires normal EOF and cleanup',()=>{
 const cli=fileURLToPath(new URL('../scripts/check-codex-eof-wait.mjs',import.meta.url));const p=spawnSync(process.execPath,[cli],{encoding:'utf8',timeout:10000});assert.equal(p.status,0,p.stdout+p.stderr);const r=JSON.parse(p.stdout);assert.equal(r.status,'eof_wait_cleanup_observed');assert.equal(r.fixtureClockAppliesOnlyToRehearsal,true);assert.equal(r.kind,'independent_node_peer');assert.equal(r.report.ownedShutdown.gracefulZeroExitObserved,true);assert.equal(r.report.temporaryCleanupComplete,true);assert.equal(r.realModelRequests,0);assert.equal(r.priorTrialContinued,false);assert.equal(r.oldRootRecoveryAttempted,false);assert.equal(r.report.nativePersistentFixtureIntegrated,false);
});
test('new CLI and functions reject login, model, retry, recovery and executable options before mutation',()=>{
 const f=setup();try{for(const extra of [{login:true},{model:'other'},{eofProfile:false},{retry:true},{token:'FICTIONAL-PRIVATE'}])assert.throws(()=>rehearseCodexEofWait('observed',{...f.options,...extra}));assert.throws(()=>observeNativeCodexEofWait(process.execPath,f.options));
  const cli=fileURLToPath(new URL('../scripts/check-codex-eof-wait.mjs',import.meta.url));for(const args of [['--login'],['--state-directory',f.directory],['--resume'],['--cleanup-old'],['--model','other'],['--native-executable'],['--retry'],['--token','FICTIONAL-PRIVATE']]){const p=spawnSync(process.execPath,[cli,...args],{encoding:'utf8'});assert.equal(p.status,1);assert.equal(JSON.parse(p.stdout).dispatchEnabled,false);assert.ok(!p.stdout.includes('FICTIONAL-PRIVATE'));}assert.deepEqual(fs.readdirSync(f.directory),[]);
 }finally{f.close();}
});
