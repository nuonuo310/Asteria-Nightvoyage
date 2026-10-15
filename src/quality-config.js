import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { Store, fail } from './store.js';
import { hash, snapshot, own } from './contract.js';
import { BudgetLedger, maximumCost, validateAllowance } from './budget-ledger.js';
import { pricingProfile, profileExpiresAt } from './trial-config.js';
import { protocolVersion } from './deepseek-protocol.js';

export const qualityBatchId = 'quality-screen-20261015';
const filename = `${qualityBatchId}.json`;
const pins = Object.freeze({
  'courtyard-cloth':'be3803ed59e84963e51bc22d927929241406aa80d0cdd3de8c93dc89955beff3',
  'drawer-and-orbit':'c9b5c2f10e53007960164e783086243e3fbe15ec14bd2adabfdb381b8248983d',
  'sparse-context':'66a19f5968bc0bb60c8ff4918d6e57e223b008329c2a7028f3ac478cb6256d10'
});
const protocolSha256 = '0f8471c69f170ec74880ef0e7deef8889df8a3b12e6e86c0aea2b13fcefa681e';
const digest = bytes => createHash('sha256').update(bytes.toString('utf8').replace(/\r\n/g,'\n')).digest('hex');
export const qualityRequestId = caseId => {
  if (!Object.hasOwn(pins,caseId)) fail('quality_case_not_reviewed');
  return `${qualityBatchId}-${caseId}`;
};
export function verifiedQualityFixture(caseId,bytes) {
  qualityRequestId(caseId);
  if (digest(bytes)!==pins[caseId]) fail('quality_fixture_changed');
  const input=snapshot(JSON.parse(bytes.toString('utf8')));
  if (!input.sources.length || input.sources.some(s=>s.grant.modelEgress!==false)) fail('quality_fixture_changed');
  return input;
}
function fixture(caseId) {
  qualityRequestId(caseId);
  return verifiedQualityFixture(caseId,fs.readFileSync(new URL(`../fixtures/quality/${caseId}.json`,import.meta.url)));
}
export function qualityProposal() {
  if (digest(fs.readFileSync(new URL('./deepseek-protocol.js',import.meta.url)))!==protocolSha256) fail('quality_protocol_changed');
  return {version:1,batchId:qualityBatchId,protocolVersion,protocolSha256,
    model:pricingProfile.model,pricingCheckedAt:pricingProfile.checkedAt,expiresAt:profileExpiresAt,
    proposedBudgetCny:3,maxRuns:3,maxCalls:9,scenesPerRun:2,maxOutputTokensPerCall:400,
    cases:Object.keys(pins).map(id=>({id,sha256:pins[id],sourceRefs:fixture(id).sources.map(s=>({id:s.id,version:s.version}))})),
    modelEgressApproved:false,paidEvaluationApproved:false,qualityAssessed:false};
}
function reviewedConfig() {
  const proposal=qualityProposal();
  return {...proposal,modelEgressApproved:true,paidEvaluationApproved:true,
    allowance:validateAllowance({id:qualityBatchId,mode:'live',approved:true,expiresAt:profileExpiresAt,
      limits:{maxRuns:3,maxCalls:9,maxMicroCny:3000000},pricing:pricingProfile})};
}
export function readQualityConfig(directory) {
  const file=path.join(directory,filename);
  if (!fs.existsSync(file)||!fs.lstatSync(file).isFile()||fs.lstatSync(file).isSymbolicLink()) fail('quality_approval_missing_or_unsafe');
  const config=JSON.parse(fs.readFileSync(file,'utf8'));
  if (hash(config)!==hash(reviewedConfig())) fail('quality_config_not_reviewed');
  return config;
}
export function qualityInput(config,caseId) {
  if (hash(config)!==hash(reviewedConfig())) fail('quality_config_not_reviewed');
  const input=fixture(caseId);
  for (const source of input.sources) source.grant.modelEgress=true;
  return input;
}
const clockReady = now => Number.isFinite(now)&&now>=pricingProfile.checkedAt&&now<profileExpiresAt;
function checkSources(store,config) {
  if (config.cases.some(c=>c.sourceRefs.some(s=>store.withdrawn.includes(s.id)))) fail('source_withdrawn');
}
export function initQualityBatch(directory,{budgetCny,approvedCases,approveFictionalEgress=false,now=Date.now()}={}) {
  const config=reviewedConfig();
  if (String(budgetCny)!=='3'||approveFictionalEgress!==true||hash(approvedCases)!==hash(config.cases.map(c=>c.id))) fail('explicit_quality_approval_required');
  if (!clockReady(now)) fail('pricing_review_expired');
  const store=new Store(directory);
  try {
    checkSources(store,config);
    const file=path.join(store.directory,filename);
    if (fs.existsSync(file)) readQualityConfig(store.directory);
    else store.atomic(filename,config);
    new BudgetLedger(store).approve(config.allowance);
    return config;
  } finally {store.close();}
}
// Called with the already owned store too, so the dispatch path rechecks under its lock.
export function qualityState(store,config,caseId,now=Date.now()) {
  if (caseId!==undefined) qualityRequestId(caseId);
  if (hash(config)!==hash(readQualityConfig(store.directory))) fail('quality_config_not_reviewed');
  const ledger=new BudgetLedger(store),current=ledger.status(config.allowance.id);
  if (hash(current.allowance)!==hash(config.allowance)) fail('allowance_conflict');
  const cases=config.cases.map(c=>{
    const id=own(store.state.requests,qualityRequestId(c.id))?.runId;
    const run=id?own(store.state.runs,id):null;
    if (id&&(!run||run.billingAllowanceId!==config.allowance.id)) fail('quality_run_conflict');
    return {caseId:c.id,runId:id??null,status:run?.status??'not_started',stagesSaved:run?.scenes?.length??0,
      calls:current.attempts.filter(t=>t.runId===id).length};
  });
  const index=caseId===undefined?-1:cases.findIndex(c=>c.caseId===caseId),target=cases[index];
  const reservation=maximumCost(config.allowance.pricing,400);
  const reason=!clockReady(now)?'pricing_or_allowance_expired':
    config.cases.some(c=>c.sourceRefs.some(s=>store.withdrawn.includes(s.id)))?'source_withdrawn':
    current.attempts.some(t=>t.status!=='settled')?'unsettled_attempt_requires_review':
    target?.status==='completed'?'completed_replay_available':
    cases.some((c,i)=>c.status!=='completed'&&c.status!=='not_started'&&i!==index)?'another_case_requires_review':
    index>=0&&cases.slice(0,index).some(c=>c.status!=='completed')?'previous_case_incomplete':
    target&&['cancelled','revoked','deleted','skipped'].includes(target.status)?'case_stopped':
    current.calls>=9?'call_limit_reached':current.runs>=3&&!target?.runId?'run_limit_reached':
    BigInt(current.heldOrSpentMicroCny)+reservation>3000000n?'reservation_exceeds_remaining_budget':'limits_checked';
  const all=Object.keys(store.state.billing.accounts).map(id=>ledger.status(id));
  return {ready:reason==='limits_checked',reason,credentialRead:false,batchId:qualityBatchId,model:config.model,
    additionalBudgetCny:3,maxAdditionalRuns:3,maxAdditionalCalls:9,nextReservationCny:Number(reservation)/1000000,
    qualityAssessed:false,cases,batch:{calls:current.calls,runs:current.runs,heldOrSpentMicroCny:current.heldOrSpentMicroCny},
    allAllowances:{calls:all.reduce((n,s)=>n+s.calls,0),runs:all.reduce((n,s)=>n+s.runs,0),heldOrSpentMicroCny:all.reduce((n,s)=>n+BigInt(s.heldOrSpentMicroCny),0n).toString()}};
}
export function qualityPreflight(directory,caseId,now=Date.now()) {
  // Missing approval can be inspected without creating a runtime directory or allowance.
  if (!fs.existsSync(path.join(directory,filename))) return {ready:false,reason:'quality_approval_required',credentialRead:false,proposal:qualityProposal()};
  const store=new Store(directory);
  try {return qualityState(store,readQualityConfig(store.directory),caseId,now);}
  finally {store.close();}
}
