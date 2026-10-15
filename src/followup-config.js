import fs from 'node:fs';
import path from 'node:path';
import { Store, fail } from './store.js';
import { hash } from './contract.js';
import { BudgetLedger, maximumCost, validateAllowance } from './budget-ledger.js';
import { readTrial, trialFixture, pricingProfile, profileExpiresAt, fixtureDigest } from './trial-config.js';
import { protocolVersion } from './deepseek-protocol.js';

export const followupRequestId = 'grounded-wake-followup-20261015';
const filename = 'grounded-wake-followup.json';
function reviewedConfig() {
  return { version:1, protocolVersion, fixtureSha256:fixtureDigest, fixtureEgressApproved:true,
    allowance:validateAllowance({id:followupRequestId,mode:'live',approved:true,expiresAt:profileExpiresAt,
      limits:{maxRuns:1,maxCalls:3,maxMicroCny:3000000},pricing:pricingProfile}) };
}
export function readFollowup(directory) {
  const file=path.join(directory,filename);
  if(!fs.existsSync(file)||!fs.lstatSync(file).isFile()||fs.lstatSync(file).isSymbolicLink())fail('followup_config_missing_or_unsafe');
  const config=JSON.parse(fs.readFileSync(file,'utf8'));
  if(hash(config)!==hash(reviewedConfig()))fail('followup_config_not_reviewed');
  return config;
}
function priorTrial(store,ledger) {
  const config=readTrial(store.directory),prior=ledger.status(config.allowance.id);
  if(hash(prior.allowance)!==hash(config.allowance)||prior.calls!==9||prior.runs!==3||prior.attempts.some(t=>t.status!=='settled'))fail('prior_trial_not_complete');
  return prior;
}
function clockReady(now) {return Number.isFinite(now)&&now>=pricingProfile.checkedAt&&now<profileExpiresAt;}
export function initFollowup(directory,{budgetCny,approveFictionalEgress=false,now=Date.now()}={}) {
  if(String(budgetCny)!=='3'||approveFictionalEgress!==true)fail('explicit_followup_approval_required');
  if(!clockReady(now))fail('pricing_review_expired');
  const store=new Store(directory);
  try {
    const ledger=new BudgetLedger(store);priorTrial(store,ledger);
    const config=reviewedConfig(),fixture=trialFixture(config);
    if(fixture.sources.some(s=>store.withdrawn.includes(s.id)))fail('source_withdrawn');
    const file=path.join(store.directory,filename);
    if(fs.existsSync(file))readFollowup(store.directory);
    else store.atomic(filename,config);
    ledger.approve(config.allowance);return config;
  } finally {store.close();}
}
export function followupPreflight(directory,now=Date.now()) {
  const store=new Store(directory);
  try {
    const ledger=new BudgetLedger(store),prior=priorTrial(store,ledger),config=readFollowup(store.directory);
    // Require the existing durable approval; preflight never creates a new allowance.
    const current=ledger.status(config.allowance.id);
    if(hash(current.allowance)!==hash(config.allowance))fail('allowance_conflict');
    const fixture=trialFixture(config),reservation=maximumCost(config.allowance.pricing,400);
    const existing=store.state.requests[followupRequestId]?.runId;
    const admitted=existing&&ledger.account(config.allowance.id).runIds.includes(existing);
    const reason=!clockReady(now)?'pricing_or_allowance_expired':fixture.sources.some(s=>store.withdrawn.includes(s.id))?'source_withdrawn':current.calls>=3?'call_limit_reached':current.runs>=1&&!admitted?'run_limit_reached':BigInt(current.heldOrSpentMicroCny)+reservation>3000000n?'reservation_exceeds_remaining_budget':'limits_checked';
    const summary=s=>({calls:s.calls,runs:s.runs,heldOrSpentMicroCny:s.heldOrSpentMicroCny});
    const all=Object.keys(store.state.billing.accounts).map(id=>ledger.status(id));
    return {ready:reason==='limits_checked',reason,credentialRead:false,model:config.allowance.pricing.model,
      additionalBudgetCny:3,maxAdditionalRuns:1,maxAdditionalCalls:3,nextReservationCny:Number(reservation)/1000000,
      previousTrial:summary(prior),followupTrial:summary(current),allAllowances:{calls:all.reduce((n,s)=>n+s.calls,0),runs:all.reduce((n,s)=>n+s.runs,0),heldOrSpentMicroCny:all.reduce((n,s)=>n+BigInt(s.heldOrSpentMicroCny),0n).toString()}};
  } finally {store.close();}
}
