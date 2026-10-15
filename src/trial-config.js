import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { hash } from './contract.js';
import { Store, fail } from './store.js';
import { BudgetLedger, maximumCost, validateAllowance } from './budget-ledger.js';

export const pricingProfile = Object.freeze({model:'deepseek-flash',contextTokenLimit:1100000,inputMicroCnyPerMillion:2000000,outputMicroCnyPerMillion:8000000,reference:'https://api-docs.deepseek.com/zh-cn/quick_start/pricing/',checkedAt:Date.parse('2026-10-15T12:10:00Z')});
export const profileExpiresAt = Date.parse('2026-10-16T12:10:00Z');
export const fixtureDigest = '7151c9c5e1d88b4c1b3fe8412b1fb41c9d25bf2d9c85c3c5680f380b898cb7b4';
export function verifiedFixture(bytes) {
  // Git may check text out with CRLF on Windows. Only normalize CRLF;
  // every other byte remains part of the pinned fictional-material identity.
  const canonical = Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
  if (createHash('sha256').update(canonical).digest('hex')!==fixtureDigest) fail('fixture_changed');
  return JSON.parse(canonical);
}
export function trialFixture(config) {
  if (config.fixtureEgressApproved!==true || config.fixtureSha256!==fixtureDigest) fail('fixture_egress_not_approved');
  const bytes=fs.readFileSync(new URL('../fixtures/paper-harbor.json',import.meta.url));
  const f=verifiedFixture(bytes);for(const s of f.sources)s.grant.modelEgress=true;return f;
}
export function initTrial(directory,{budgetCny,approveFictionalEgress=false,now=Date.now()}={}) {
  if (approveFictionalEgress!==true || !['1','3'].includes(String(budgetCny))) fail('explicit_trial_approval_required');
  if (now>=profileExpiresAt || now<pricingProfile.checkedAt) fail('pricing_review_expired');
  const store=new Store(directory);
  try {
    const file=path.join(store.directory,'trial.json');
    const allowance=validateAllowance({id:'first-fictional-trial-20261015',mode:'live',approved:true,expiresAt:profileExpiresAt,limits:{maxRuns:3,maxCalls:9,maxMicroCny:Number(budgetCny)*1000000},pricing:pricingProfile});
    const config={version:1,allowance,fixtureEgressApproved:true,fixtureSha256:fixtureDigest};
    if (fs.existsSync(file)) {if(JSON.stringify(readTrial(store.directory))!==JSON.stringify(config))fail('trial_config_conflict');}
    else store.atomic('trial.json',config);
    new BudgetLedger(store).approve(allowance);return config;
  } finally {store.close();}
}
export function readTrial(directory) {
  const file=path.join(directory,'trial.json');
  if (!fs.existsSync(file) || fs.lstatSync(file).isSymbolicLink() || !fs.lstatSync(file).isFile())fail('trial_config_missing_or_unsafe');
  const config=JSON.parse(fs.readFileSync(file,'utf8'));
  if(config.version!==1)fail('invalid_trial_config');
  const a=validateAllowance(config.allowance);
  if(a.id!=='first-fictional-trial-20261015'||a.mode!=='live'||![1000000,3000000].includes(a.limits.maxMicroCny)||a.limits.maxRuns!==3||a.limits.maxCalls!==9||a.expiresAt!==profileExpiresAt||hash(a.pricing)!==hash(pricingProfile))fail('trial_config_not_reviewed');
  trialFixture(config);return {...config,allowance:a};
}
export function preflight(directory,now=Date.now(),slot) {
  const store=new Store(directory);
  try {
    const config=readTrial(store.directory),ledger=new BudgetLedger(store);ledger.approve(config.allowance);
    const state=ledger.status(config.allowance.id),reservation=maximumCost(config.allowance.pricing,400);
    const existingId=store.state.requests[`trial-slot-${slot}`]?.runId;
    const admitted=existingId&&ledger.account(config.allowance.id).runIds.includes(existingId);
    const expired=now>=Math.min(config.allowance.expiresAt,profileExpiresAt);
    return {ready:!expired&&reservation+BigInt(state.heldOrSpentMicroCny)<=BigInt(config.allowance.limits.maxMicroCny)&&state.calls<9&&(state.runs<3||admitted),reason:expired?'pricing_or_allowance_expired':reservation+BigInt(state.heldOrSpentMicroCny)>BigInt(config.allowance.limits.maxMicroCny)?'reservation_exceeds_remaining_budget':state.calls>=9?'call_limit_reached':state.runs>=3&&!admitted?'run_limit_reached':'limits_checked',credentialRead:false,model:config.allowance.pricing.model,budgetCny:config.allowance.limits.maxMicroCny/1000000,nextReservationCny:Number(reservation)/1000000,calls:state.calls,runs:state.runs,heldOrSpentMicroCny:state.heldOrSpentMicroCny};
  } finally {store.close();}
}
