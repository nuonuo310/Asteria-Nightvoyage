import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { Store, fail } from './store.js';
import { hash, own } from './contract.js';
import { BudgetLedger, validateAllowance, maximumCost } from './budget-ledger.js';
import { pricingProfile, profileExpiresAt } from './trial-config.js';
import { readQualityConfig, verifiedQualityFixture } from './quality-config.js';
import { compactProtocolVersion } from './compact-appraisal-protocol.js';

export const compactTrialId='compact-appraisal-trial-20261015';
const filename=`${compactTrialId}.json`,caseId='sparse-context';
const sourcePins=Object.freeze({
  'compact-appraisal-protocol.js':'935762c0e5961b0abcd38d0d5a959ff40ebd97e051a1236e57c7ab3fb8118e34',
  'appraisal-rehearsal.js':'361f2a81e4dc63ca7f6f138032fc65d649e53f1b3039cd0841f614396d1cc23f',
  'deepseek-protocol.js':'0f8471c69f170ec74880ef0e7deef8889df8a3b12e6e86c0aea2b13fcefa681e'
});
function fixture() {return verifiedQualityFixture(caseId,fs.readFileSync(new URL('../fixtures/quality/sparse-context.json',import.meta.url)));}
export function compactTrialProposal() {
  for(const [file,pin] of Object.entries(sourcePins)) {
    const bytes=fs.readFileSync(new URL(`./${file}`,import.meta.url),'utf8').replace(/\r\n/g,'\n');
    if(createHash('sha256').update(bytes).digest('hex')!==pin)fail('compact_protocol_source_changed');
  }
  const input=fixture();
  return {schemaVersion:1,batchId:compactTrialId,protocolVersion:compactProtocolVersion,protocolSourcePins:{...sourcePins},
    caseId,fixtureSha256:'66a19f5968bc0bb60c8ff4918d6e57e223b008329c2a7028f3ac478cb6256d10',
    sourceRefs:input.sources.map(s=>({id:s.id,version:s.version})),model:pricingProfile.model,expiresAt:profileExpiresAt,
    proposedAdditionalBudgetCny:3,maxAdditionalRuns:1,maxAdditionalCalls:3,perCallOutputTokens:400,
    fixtureEgressApproved:false,paidEvaluationApproved:false,qualityAssessed:false};
}
function reviewedConfig() {
  return {...compactTrialProposal(),fixtureEgressApproved:true,paidEvaluationApproved:true,
    allowance:validateAllowance({id:compactTrialId,mode:'live',approved:true,expiresAt:profileExpiresAt,
      limits:{maxRuns:1,maxCalls:3,maxMicroCny:3000000},pricing:pricingProfile})};
}
export function readCompactTrial(directory) {
  const file=path.join(directory,filename);
  if(!fs.existsSync(file)||!fs.lstatSync(file).isFile()||fs.lstatSync(file).isSymbolicLink())fail('compact_approval_missing_or_unsafe');
  const value=JSON.parse(fs.readFileSync(file,'utf8'));
  if(hash(value)!==hash(reviewedConfig()))fail('compact_config_not_reviewed');return value;
}
function previousQuality(store,ledger) {
  const config=readQualityConfig(store.directory),prior=ledger.status(config.allowance.id);
  if(hash(config.allowance)!==hash(prior.allowance)||prior.calls!==9||prior.runs!==3||prior.attempts.some(t=>t.status!=='settled'))fail('prior_quality_screen_not_complete');
  return prior;
}
const clockReady=now=>Number.isFinite(now)&&now>=pricingProfile.checkedAt&&now<profileExpiresAt;
export function initCompactTrial(directory,{budgetCny,approvedCase,approveFictionalEgress=false,now=Date.now()}={}) {
  if(String(budgetCny)!=='3'||approvedCase!==caseId||approveFictionalEgress!==true)fail('explicit_compact_approval_required');
  if(!clockReady(now))fail('pricing_review_expired');
  const config=reviewedConfig(),store=new Store(directory);
  try {
    const ledger=new BudgetLedger(store);previousQuality(store,ledger);
    if(config.sourceRefs.some(s=>store.withdrawn.includes(s.id)))fail('source_withdrawn');
    if(fs.existsSync(path.join(store.directory,filename)))readCompactTrial(store.directory);else store.atomic(filename,config);
    ledger.approve(config.allowance);return config;
  } finally {store.close();}
}
export function compactTrialInput(config) {
  if(hash(config)!==hash(reviewedConfig()))fail('compact_config_not_reviewed');
  const input=fixture();for(const s of input.sources)s.grant.modelEgress=true;return input;
}
export function compactTrialState(store,config,now=Date.now()) {
  if(hash(config)!==hash(readCompactTrial(store.directory)))fail('compact_config_not_reviewed');
  const ledger=new BudgetLedger(store),prior=previousQuality(store,ledger),current=ledger.status(config.allowance.id);
  if(hash(current.allowance)!==hash(config.allowance))fail('allowance_conflict');
  const runId=own(store.state.requests,compactTrialId)?.runId,run=runId?own(store.state.runs,runId):null;
  if(runId&&(!run||run.billingAllowanceId!==config.allowance.id||run.billingProtocolVersion!==compactProtocolVersion||run.appraisalProtocolVersion!==compactProtocolVersion))fail('compact_run_identity_mismatch');
  const cost=maximumCost(config.allowance.pricing,400),reason=!clockReady(now)?'pricing_or_allowance_expired':
    config.sourceRefs.some(s=>store.withdrawn.includes(s.id))?'source_withdrawn':current.attempts.some(t=>t.status!=='settled')?'unsettled_attempt_requires_review':
    current.calls>=3?'call_limit_reached':run?.status==='completed'?'completed_replay_available':run&&['cancelled','revoked','deleted','skipped'].includes(run.status)?'run_stopped':
    current.runs>=1&&!runId?'run_limit_reached':BigInt(current.heldOrSpentMicroCny)+cost>3000000n?'reservation_exceeds_remaining_budget':'limits_checked';
  const summary=s=>({calls:s.calls,runs:s.runs,heldOrSpentMicroCny:s.heldOrSpentMicroCny}),all=Object.keys(store.state.billing.accounts).map(id=>ledger.status(id));
  return {ready:reason==='limits_checked',reason,credentialRead:false,batchId:compactTrialId,caseId,model:config.model,
    additionalBudgetCny:3,maxAdditionalRuns:1,maxAdditionalCalls:3,nextReservationCny:Number(cost)/1000000,
    run:runId?{id:runId,status:run.status,stagesSaved:run.scenes?.length??0}:null,previousQualityScreen:summary(prior),compactTrial:summary(current),
    allAllowances:{calls:all.reduce((n,s)=>n+s.calls,0),runs:all.reduce((n,s)=>n+s.runs,0),heldOrSpentMicroCny:all.reduce((n,s)=>n+BigInt(s.heldOrSpentMicroCny),0n).toString()},qualityAssessed:false};
}
export function compactTrialPreflight(directory,now=Date.now()) {
  if(!fs.existsSync(path.join(directory,filename)))return {ready:false,reason:'compact_approval_required',credentialRead:false,proposal:compactTrialProposal()};
  const store=new Store(directory);try{return compactTrialState(store,readCompactTrial(store.directory),now);}finally{store.close();}
}
