import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { Store } from '../src/store.js';
import { BudgetLedger } from '../src/budget-ledger.js';
import { hash } from '../src/contract.js';
import { initTrial, pricingProfile, profileExpiresAt } from '../src/trial-config.js';
import { initFollowup, readFollowup, followupPreflight, followupRequestId } from '../src/followup-config.js';
import { Nightvoyage } from '../src/engine.js';

const now=pricingProfile.checkedAt+1000;
function reservation(requestId,runId){return {requestId,runId,fingerprint:hash({requestId,runId}),sourceRefs:[{id:'fiction-paper',version:'1'}],maxOutputTokens:400};}
const usage={model:'deepseek-flash',usage:{inputTokens:100,outputTokens:50,totalTokens:150}};
function setup(t,complete=true){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-followup-'));
 t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
 const first=initTrial(directory,{budgetCny:3,approveFictionalEgress:true,now});
 const store=new Store(directory),ledger=new BudgetLedger(store);
 if(complete)for(let i=0;i<9;i++){const id=`original-${i}`;ledger.reserve(first.allowance.id,reservation(id,`old-run-${Math.floor(i/3)}`),now);ledger.dispatch(first.allowance.id,id);ledger.settle(first.allowance.id,id,usage);}
 store.close();return {directory,first};
}
const initialize=directory=>initFollowup(directory,{budgetCny:3,approveFictionalEgress:true,now});
test('follow-up needs explicit one-run approval and completed original accounting',t=>{
 const {directory}=setup(t,false);
 assert.throws(()=>initFollowup(directory,{budgetCny:3,now}),/explicit_followup/);
 assert.throws(()=>initFollowup(directory,{budgetCny:1,approveFictionalEgress:true,now}),/explicit_followup/);
 assert.throws(()=>initialize(directory),/prior_trial_not_complete/);
 assert.equal(fs.existsSync(path.join(directory,'grounded-wake-followup.json')),false);
});
test('follow-up initialization preserves old attempts and reports cumulative allowances',t=>{
 const {directory,first}=setup(t);const before=new Store(directory),old=structuredClone(before.state.billing.accounts[first.allowance.id]);before.close();
 const config=initialize(directory);assert.equal(config.allowance.id,followupRequestId);assert.equal(config.allowance.limits.maxRuns,1);assert.equal(config.allowance.limits.maxCalls,3);
 initialize(directory);const status=followupPreflight(directory,now);
 assert.equal(status.ready,true);assert.equal(status.credentialRead,false);assert.equal(status.previousTrial.calls,9);assert.equal(status.followupTrial.calls,0);assert.equal(status.allAllowances.calls,9);
 const after=new Store(directory);assert.deepEqual(after.state.billing.accounts[first.allowance.id],old);after.close();
});
test('one extra run and three extra calls persist across reopen without allowance reset',t=>{
 const {directory}=setup(t),config=initialize(directory);const store=new Store(directory),ledger=new BudgetLedger(store);
 for(let i=0;i<3;i++){const id=`follow-${i}`;ledger.reserve(config.allowance.id,reservation(id,'new-run'),now);ledger.dispatch(config.allowance.id,id);ledger.settle(config.allowance.id,id,usage);}
 assert.throws(()=>ledger.reserve(config.allowance.id,reservation('fourth','new-run'),now),/allowance_exhausted/);store.close();
 initialize(directory);const check=followupPreflight(directory,now);assert.equal(check.ready,false);assert.equal(check.reason,'call_limit_reached');assert.equal(check.followupTrial.calls,3);assert.equal(check.allAllowances.calls,12);assert.equal(check.allAllowances.runs,4);assert.equal(check.previousTrial.calls,9);
});
test('unknown follow-up attempt retains hold and cannot open a different extra run',t=>{
 const {directory}=setup(t),config=initialize(directory);const store=new Store(directory),ledger=new BudgetLedger(store);
 ledger.reserve(config.allowance.id,reservation('unknown','new-run'),now);ledger.dispatch(config.allowance.id,'unknown');store.close();
 const next=new Store(directory),l=new BudgetLedger(next);assert.equal(l.status(config.allowance.id).attempts[0].status,'unknown');assert.equal(l.status(config.allowance.id).heldOrSpentMicroCny,'2203200');
 assert.throws(()=>l.reserve(config.allowance.id,reservation('different','another-run'),now),/allowance_exhausted/);next.close();
 initialize(directory);const check=followupPreflight(directory,now);assert.equal(check.ready,false);assert.equal(check.followupTrial.heldOrSpentMicroCny,'2203200');
});
test('follow-up config edits, withdrawal and expired price cannot enable dispatch',t=>{
 const {directory}=setup(t);initialize(directory);
 assert.equal(followupPreflight(directory,profileExpiresAt).ready,false);
 assert.throws(()=>initFollowup(directory,{budgetCny:3,approveFictionalEgress:true,now:profileExpiresAt}),/expired/);
 const store=new Store(directory);store.withdraw('fiction-paper');store.close();assert.equal(followupPreflight(directory,now).reason,'source_withdrawn');assert.throws(()=>initialize(directory),/source_withdrawn/);
 const file=path.join(directory,'grounded-wake-followup.json'),c=JSON.parse(fs.readFileSync(file));c.allowance.limits.maxCalls=30;fs.writeFileSync(file,JSON.stringify(c));assert.throws(()=>readFollowup(directory),/not_reviewed/);
});
test('CLI help, disabled run and missing approval never need a key or send HTTP',t=>{
 const {directory}=setup(t);const run=args=>spawnSync(process.execPath,['src/followup-cli.js',...args,'--data-dir',directory],{cwd:new URL('..',import.meta.url),encoding:'utf8',env:{...process.env,NIGHTVOYAGE_DEEPSEEK_KEY:'DUMMY-SENTINEL-NOT-A-REAL-KEY'}});
 assert.equal(run(['help']).status,0);const disabled=run(['run']);assert.equal(disabled.status,1);assert.ok(disabled.stderr.includes('explicit_live_flag_required'));
 const missing=run(['run','--live']);assert.equal(missing.status,1);assert.ok(missing.stderr.includes('followup_config_missing_or_unsafe'));
 assert.ok(![disabled.stdout,disabled.stderr,missing.stdout,missing.stderr].join('').includes('DUMMY-SENTINEL'));
 const store=new Store(directory);assert.equal(Object.keys(store.state.billing.accounts).length,1);store.close();
});
test('CLI completed replay works without credential or new billing attempts',async t=>{
 const {directory}=setup(t);const config=initialize(directory);const fixture=JSON.parse(fs.readFileSync(new URL('../fixtures/paper-harbor.json',import.meta.url)));
 const engine=new Nightvoyage(directory),id=engine.start(followupRequestId,followupRequestId,fixture);await engine.execute(id);
 // Seed a completed journal and invented accounting to test the CLI read path;
 // this does not exercise live HTTP or claim model-quality evidence.
 engine.run(id).billingAllowanceId=config.allowance.id;
 const ledger=new BudgetLedger(engine.store);
 for(let i=0;i<3;i++){const requestId=`replay-${i}`;ledger.reserve(config.allowance.id,reservation(requestId,id),now);ledger.dispatch(config.allowance.id,requestId);ledger.settle(config.allowance.id,requestId,usage);}
 engine.store.save();engine.close();
 const env={...process.env};delete env.NIGHTVOYAGE_DEEPSEEK_KEY;
 const result=spawnSync(process.execPath,['src/followup-cli.js','run','--live','--data-dir',directory],{cwd:new URL('..',import.meta.url),encoding:'utf8',env});
 assert.equal(result.status,0,result.stderr);assert.equal(JSON.parse(result.stdout).receipt.id,id);assert.equal(JSON.parse(result.stdout).receipt.budget.calls,3);assert.equal(followupPreflight(directory,now).followupTrial.calls,3);
});

test('a fake-only request with the follow-up ID cannot be mistaken for a billed validation run',async t=>{
 const {directory}=setup(t);initialize(directory);const fixture=JSON.parse(fs.readFileSync(new URL('../fixtures/paper-harbor.json',import.meta.url)));
 const engine=new Nightvoyage(directory),id=engine.start(followupRequestId,followupRequestId,fixture);await engine.execute(id);engine.close();
 const result=spawnSync(process.execPath,['src/followup-cli.js','run','--live','--data-dir',directory],{cwd:new URL('..',import.meta.url),encoding:'utf8'});
 assert.equal(result.status,1);assert.ok(result.stderr.includes('followup_run_conflict'));assert.equal(followupPreflight(directory,now).followupTrial.calls,0);
});
