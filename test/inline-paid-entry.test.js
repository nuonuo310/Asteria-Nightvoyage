import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync,spawn} from 'node:child_process';
import {launchInlinePaid} from '../src/inline-paid-entry.js';
import {inlineChildEnvironment} from '../src/inline-stub-launcher.js';
import {runInlinePaidSession} from '../src/inline-paid-session.js';
import {Store} from '../src/store.js';
import {InlinePaidRuntime} from '../src/inline-paid-runtime.js';
import {prepareTrialHistory} from '../test-support/inline-trial-fixtures.js';
import {inlineTrialAllowanceId} from '../src/inline-trial-authorization.js';
const root=fileURLToPath(new URL('..',import.meta.url));
const cli=path.join(root,'src/inline-paid-entry.js');
function project(t){const p=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-paid-process-'));t.after(()=>fs.rmSync(p,{recursive:true,force:true}));for(const n of ['src','fixtures','package.json','docs/proposals'])fs.cpSync(path.join(root,n),path.join(p,n),{recursive:true});return p;}
function run(p,args,environment={}){return spawnSync(process.execPath,[path.join(p,'src/inline-paid-entry.js'),...args],{encoding:'utf8',timeout:20000,env:{...process.env,...environment}});}
test('fresh constrained paid child completes a pipe rehearsal, reopens and replays without another credential',async t=>{
  const h=prepareTrialHistory(t,{mode:'live',dispatchKind:'rehearsal'});let suppliers=0;const v=await launchInlinePaid('rehearse',h.directory,{credentialSupplier:()=>{suppliers++;const state=JSON.parse(fs.readFileSync(path.join(h.directory,'state.json')));assert.equal(state.inlineTrialAuthorization.termsHash,h.record.termsHash);assert.equal(state.runs[state.requests[inlineTrialAllowanceId].runId].status,'queued');return 'DUMMY-PROCESS-PIPE';}});assert.equal(v.status,'completed');assert.equal(v.credentialSupplierCalls,1);assert.equal(v.receipt.budget.calls,3);assert.equal(v.appraisalView.status,'available');assert.equal(v.dream.origin,'dream');assert.equal(v.dream.materialKind,'fictional');assert.equal(v.dream.isRealityFact,false);assert.equal(suppliers,1);const next=await launchInlinePaid('rehearse',h.directory,{credentialSupplier:()=>{suppliers++;throw Error('must_not_request');}});assert.deepEqual(next.dream,v.dream);assert.equal(next.credentialSupplierCalls,0);assert.equal(suppliers,1);
});
test('entry separates simulator grants from provider actions and never asks for a key on mismatch',async t=>{
  const h=prepareTrialHistory(t,{mode:'live',dispatchKind:'rehearsal'});let suppliers=0;const v=await launchInlinePaid('run',h.directory,{credentialSupplier:()=>{suppliers++;throw Error('PRIVATE');}});assert.equal(v.status,'blocked');assert.equal(v.credentialRequested,false);assert.equal(v.credentialSupplierCalls,0);assert.equal(suppliers,0);const s=new Store(h.directory);try{assert.equal(Object.keys(s.state.billing.accounts[inlineTrialAllowanceId].attempts).length,0);}finally{s.close();}
});
for(const key of [undefined,'','bad key','x'.repeat(2001)])test(`invalid private supplier value ${key?.length??'absent'} cannot consume a call`,async t=>{
  const h=prepareTrialHistory(t,{mode:'live',dispatchKind:'rehearsal'});const v=await launchInlinePaid('rehearse',h.directory,{credentialSupplier:()=>key});assert.equal(v.status,'blocked');assert.equal(v.reason,'credential_pipe_refused');assert.equal(v.credentialSupplierCalls,1);const s=new Store(h.directory);try{assert.equal(Object.keys(s.state.billing.accounts[inlineTrialAllowanceId].attempts).length,0);assert.equal(s.state.runs[s.state.requests[inlineTrialAllowanceId].runId].status,'queued');}finally{s.close();}
});
for(const kind of ['unapproved','wrong-mode','withdrawn','busy','old-history'])test(`${kind} history blocks the child before private credential supply`,async t=>{
  const h=prepareTrialHistory(t,{mode:kind==='wrong-mode'?'stub':'live',dispatchKind:'rehearsal',authorize:kind!=='unapproved'}),s=new Store(h.directory);if(kind==='withdrawn')s.withdraw('q-sparse-memory');if(kind==='old-history'){s.state.billing.accounts['quality-screen-20261015'].fingerprint='a'.repeat(64);s.save();}if(kind!=='busy')s.close();try{let suppliers=0;const v=await launchInlinePaid('rehearse',h.directory,{credentialSupplier:()=>{suppliers++;throw Error('PRIVATE');}});assert.equal(v.status,'blocked');assert.equal(v.credentialRequested,false);assert.equal(suppliers,0);}finally{s.close();}
});
for(const change of ['source','extra-source','graph','flags','symlink'])test(`paid loader rejects ${change} before Store access or credential supply`,t=>{
  const p=project(t),h=prepareTrialHistory(t,{mode:'live',dispatchKind:'rehearsal'}),before=fs.readFileSync(path.join(h.directory,'state.json'));
  if(change==='source')fs.appendFileSync(path.join(p,'src/inline-paid-session.js'),'\nthrow Error("PRIVATE-SENTINEL");');if(change==='extra-source')fs.writeFileSync(path.join(p,'src/unreviewed.js'),'throw Error("PRIVATE-SENTINEL");');if(change==='graph')fs.writeFileSync(path.join(p,'src/inline-paid-graph.json'),'{}');if(change==='flags'){const f=path.join(p,'src/inline-entry-review.json'),v=JSON.parse(fs.readFileSync(f));v.paidEvaluationApproved=true;fs.writeFileSync(f,JSON.stringify(v));}if(change==='symlink'){const f=path.join(p,'src/inline-paid-session.js');fs.renameSync(f,f+'.original');fs.symlinkSync(f+'.original',f);}
  const r=run(p,['read','--data-dir',h.directory]);assert.equal(r.status,1);assert.equal(r.stdout,'');assert.equal(r.stderr.trim(),'inline_paid_entry_refused');assert.deepEqual(fs.readFileSync(path.join(h.directory,'state.json')),before);assert.equal(fs.existsSync(path.join(h.directory,'owner.lock')),false);
});
test('paid child rejects inherited environment before loading runtime or opening Store',t=>{
  const h=prepareTrialHistory(t),before=fs.readFileSync(path.join(h.directory,'state.json'));const v=spawnSync(process.execPath,['--experimental-vm-modules',path.join(root,'src/inline-paid-worker.js'),'run',h.directory,'null'],{encoding:'utf8',timeout:15000,env:{NIGHTVOYAGE_DEEPSEEK_KEY:'DUMMY-PRIVATE'}});assert.equal(v.status,1);assert.equal(v.stderr.trim(),'inline_paid_entry_refused');assert.deepEqual(fs.readFileSync(path.join(h.directory,'state.json')),before);
});
test('paid CLI rejects broad approval, relative paths, key, transport, implicit run and public simulator options',t=>{
  for(const args of [['init'],['run'],['run','--data-dir','relative','--live'],['rehearse'],['run','--live','--key','PRIVATE-SENTINEL'],['preflight','--transport','arbitrary'],['init','--approve-budget-cny','4'],['init','--data-dir',os.tmpdir(),'--account-currency','USD']]){const r=run(root,args);assert.equal(r.status,1,JSON.stringify(args));assert.ok(!r.stdout.includes('PRIVATE'));assert.equal(r.stderr.trim(),'inline_paid_entry_refused');}
});
test('missing history and missing approval stay credential free and never create a directory/account',async t=>{
  const h=prepareTrialHistory(t,{authorize:false}),absent=path.join(h.directory,'absent');for(const d of [undefined,absent,h.directory]){let keys=0;const value=await launchInlinePaid('preflight',d,{credentialSupplier:()=>{keys++;throw Error('PRIVATE');}});assert.equal(value.ready,false);assert.equal(value.credentialSupplierCalls,0);assert.equal(value.credentialRequested,false);assert.equal(keys,0);}assert.equal(fs.existsSync(absent),false);const s=new Store(h.directory);try{assert.equal(s.state.inlineTrialAuthorization,undefined);assert.equal(s.state.billing.accounts[inlineTrialAllowanceId],undefined);}finally{s.close();}
});
test('session init checks exact public confirmation before Store access, and cannot broaden or refresh it',async t=>{
  const h=prepareTrialHistory(t,{authorize:false});let keys=0;const send=()=>{keys++;throw Error('unexpected_key');};assert.equal((await runInlinePaidSession('init',h.directory,{...h.confirmation,budgetCny:4},send)).status,'blocked');let s=new Store(h.directory);try{assert.equal(s.state.inlineTrialAuthorization,undefined);}finally{s.close();}const first=await runInlinePaidSession('init',h.directory,h.confirmation,send);assert.equal(first.status,'initialized');const second=await runInlinePaidSession('init',h.directory,h.confirmation,send);assert.deepEqual(second,first);s=new Store(h.directory);try{assert.equal(s.state.inlineTrialAuthorization.terms.dispatchKind,'provider');assert.equal(s.state.inlineTrialAuthorization.terms.confirmation.accountCurrency,'CNY');for(const [id,a]of Object.entries(h.oldAccounts))assert.deepEqual(s.state.billing.accounts[id],a);}finally{s.close();}assert.equal(keys,0);
});
test('source-safe read after withdrawal exposes no body, key or new reservation',async t=>{
  const h=prepareTrialHistory(t,{mode:'live',dispatchKind:'rehearsal'}),v=await launchInlinePaid('rehearse',h.directory,{credentialSupplier:()=> 'DUMMY'});const s=new Store(h.directory);try{s.withdraw('q-sparse-memory');}finally{s.close();}const read=await launchInlinePaid('read',h.directory);assert.equal(read.dream,null);assert.equal(read.appraisalView,null);assert.equal(read.credentialSupplierCalls,0);assert.ok(!JSON.stringify(read).includes(v.dream.scenes[0].event));
});
test('fixed paid process selfcheck is simulator-only, independent and not a quality or consent claim',()=>{
  const r=spawnSync(process.execPath,['scripts/check-inline-paid-entry.mjs'],{encoding:'utf8',timeout:20000});assert.equal(r.status,0,r.stderr);const v=JSON.parse(r.stdout);assert.equal(v.realModelRequests,0);assert.equal(v.stubCalls,3);assert.equal(v.replayCredentialSupplierCalls,0);assert.equal(v.oldAccountsUnchanged,true);assert.equal(v.withdrawalPurgedAfterReopen,true);assert.equal(v.userStoreAccessed,false);assert.equal(v.realUserApprovalRecorded,false);assert.equal(v.providerNetworkTested,false);assert.equal(v.qualityAssessed,false);
});

for(const stop of ['SIGTERM','SIGKILL'])test(`fresh paid worker ${stop} while awaiting credential consumes no call or secret`,async t=>{
  const h=prepareTrialHistory(t,{mode:'live',dispatchKind:'rehearsal'});
  const child=spawn(process.execPath,['--experimental-vm-modules',path.join(root,'src/inline-paid-worker.js'),'rehearse',h.directory,'null'],{env:inlineChildEnvironment(),stdio:['pipe','pipe','pipe']});
  let text='',gate=0;child.stdout.setEncoding('utf8');child.stderr.resume();child.stdin.on('error',()=>{});const timer=setTimeout(()=>child.kill('SIGKILL'),15000);
  child.stdout.on('data',chunk=>{text+=chunk;if(!gate&&text.includes('credential_required')){gate++;child.kill(stop);}});
  const exit=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',(code,signal)=>resolve({code,signal}));});clearTimeout(timer);assert.equal(gate,1);if(stop==='SIGTERM'&&process.platform!=='win32')assert.equal(exit.code,0);const s=new Store(h.directory);try{assert.equal(Object.keys(s.state.billing.accounts[inlineTrialAllowanceId].attempts).length,0);const r=s.state.runs[s.state.requests[inlineTrialAllowanceId].runId];if(stop==='SIGTERM'&&process.platform!=='win32')assert.equal(r.status,'cancelled');else assert.ok(['queued','cancelled'].includes(r.status));for(const [id,a]of Object.entries(h.oldAccounts))assert.deepEqual(s.state.billing.accounts[id],a);}finally{s.close();}
});
