import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { Store, fail } from './store.js';
import { hash, own } from './contract.js';
import { BudgetLedger, validateAllowance, maximumCost } from './budget-ledger.js';
import { pricingProfile, profileExpiresAt } from './trial-config.js';
import { readQualityConfig, verifiedQualityFixture } from './quality-config.js';
import { prunedCompactV2Version as compactProtocolVersion } from './compact-v2-protocol.js';
import { compactTrialId as oldCompactId, readCompactTrial } from './compact-trial-config.js';
import { diagnosticId, readSingleSceneConfig } from './single-scene-diagnostic.js';

export const prunedV2TrialId='pruned-v2-dream-trial-20261015';
const filename=`${prunedV2TrialId}.json`,caseId='sparse-context';
const sourcePins=Object.freeze({"compact-appraisal-protocol.js": "935762c0e5961b0abcd38d0d5a959ff40ebd97e051a1236e57c7ab3fb8118e34", "appraisal-rehearsal.js": "361f2a81e4dc63ca7f6f138032fc65d649e53f1b3039cd0841f614396d1cc23f", "deepseek-protocol.js": "0f8471c69f170ec74880ef0e7deef8889df8a3b12e6e86c0aea2b13fcefa681e", "validation-diagnostic.js": "931a0bd25e03755570a8931fc5efa4d25a2c2548b164ede0051b005b17d9c0be", "compact-v2-offline.js": "097857494759b96d0a18338a0b071c3d3b8c6832441ec91a19b786b67b244c10", "compact-v2-protocol.js": "a9e26e5ffe8dee7102e695af7dd9ee92f90426d7d94b126126f171be6a0a312b", "budget-ledger.js": "bd71f25562edf177e736cf19aa45c989826584897918f471fa263ac4401ec1d5", "gated-deepseek-client.js": "33e629221ca69e8dc6f1c719dcf6e0faad3b70d385021af4a48da591c9b22149", "budgeted-runtime.js": "2739b3c0513ddcb1d833c26175fd3f07836cd4c12d76d7c73621d54670fa3871"});
function fixture() {return verifiedQualityFixture(caseId,fs.readFileSync(new URL('../fixtures/quality/sparse-context.json',import.meta.url)));}
export function prunedV2TrialProposal() {
  for(const [file,pin] of Object.entries(sourcePins)) {
    const bytes=fs.readFileSync(new URL(`./${file}`,import.meta.url),'utf8').replace(/\r\n/g,'\n');
    if(createHash('sha256').update(bytes).digest('hex')!==pin)fail('pruned_v2_protocol_source_changed');
  }
  const input=fixture();
  return {schemaVersion:1,batchId:prunedV2TrialId,protocolVersion:compactProtocolVersion,protocolSourcePins:{...sourcePins},
    caseId,fixtureSha256:'66a19f5968bc0bb60c8ff4918d6e57e223b008329c2a7028f3ac478cb6256d10',
    sourceRefs:input.sources.map(s=>({id:s.id,version:s.version})),model:pricingProfile.model,expiresAt:profileExpiresAt,
    proposedAdditionalBudgetCny:3,maxAdditionalRuns:1,maxAdditionalCalls:3,perCallOutputTokens:400,persistsGeneratedBody:true,requiresPreservedHoldsAcknowledgement:true,continuesPriorRun:false,
    fixtureEgressApproved:false,paidEvaluationApproved:false,qualityAssessed:false};
}
function reviewedConfig() {
  return {...prunedV2TrialProposal(),fixtureEgressApproved:true,paidEvaluationApproved:true,
    allowance:validateAllowance({id:prunedV2TrialId,mode:'live',approved:true,expiresAt:profileExpiresAt,
      protocolVersion:compactProtocolVersion,limits:{maxRuns:1,maxCalls:3,maxMicroCny:3000000},pricing:pricingProfile})};
}
export function readPrunedV2Trial(directory) {
  const file=path.join(directory,filename);
  if(!fs.existsSync(file)||!fs.lstatSync(file).isFile()||fs.lstatSync(file).isSymbolicLink())fail('pruned_v2_approval_missing_or_unsafe');
  const value=JSON.parse(fs.readFileSync(file,'utf8'));
  if(hash(value)!==hash(reviewedConfig()))fail('pruned_v2_config_not_reviewed');return value;
}
function previousQuality(store,ledger) {
  const config=readQualityConfig(store.directory),prior=ledger.status(config.allowance.id);
  if(hash(config.allowance)!==hash(prior.allowance)||prior.calls!==9||prior.runs!==3||prior.attempts.some(t=>t.status!=='settled'))fail('prior_quality_screen_not_complete');
  return prior;
}
function preservedFailures(store,ledger) {
  const oldConfig=readCompactTrial(store.directory),diagnostic=readSingleSceneConfig(store.directory);
  const prior=ledger.status(oldCompactId),probe=ledger.status(diagnosticId);
  const runId=own(store.state.requests,oldCompactId)?.runId,run=runId&&own(store.state.runs,runId);
  const sourceRevoked=oldConfig.sourceRefs.some(s=>store.withdrawn.includes(s.id));
  const row=prior.attempts[0],one=probe.attempts[0],record=own(store.state.protocolDiagnostics??{},diagnosticId);
  if(hash(oldConfig.allowance)!==hash(prior.allowance)||hash(diagnostic.allowance)!==hash(probe.allowance)||
    prior.calls!==1||prior.runs!==1||!run||!(run.status==='failed'&&run.scenes?.length===0||sourceRevoked&&run.status==='revoked'&&run.scenes===undefined)||run.error!=='compact_appraisal_invalid'||
    run.billingAllowanceId!==oldCompactId||run.billingProtocolVersion!==oldConfig.protocolVersion||run.appraisalProtocolVersion!==oldConfig.protocolVersion||
    row?.runId!==runId||row?.requestId!==`stage-${runId}-scene-0`||
    probe.calls!==1||probe.runs!==1||record?.schemaVersion!==1||record?.status!=='failed'||record?.protocolVersion!==diagnostic.protocolVersion||record?.allowanceId!==diagnosticId||
    one?.runId!==diagnosticId||one?.requestId!==`${diagnosticId}-scene-0`||one?.validationDiagnostic?.check!=='unused_compact_evidence'||
    one?.validationDiagnostic?.protocolVersion!==diagnostic.protocolVersion||one?.validationDiagnostic?.stage!=='scene'||
    [row,one].some(t=>t.status!=='unknown'||t.reservedMicroCny!=='2203200'||t.chargedMicroCny!==t.reservedMicroCny))fail('expected_two_preserved_holds_required');
  for(const [id,account] of Object.entries(store.state.billing.accounts))
    if(![oldCompactId,diagnosticId,prunedV2TrialId].includes(id)&&Object.values(account.attempts).some(t=>t.status!=='settled'))fail('other_unsettled_attempt_requires_review');
  return {calls:prior.calls+probe.calls,runs:prior.runs+probe.runs,heldOrSpentMicroCny:(BigInt(prior.heldOrSpentMicroCny)+BigInt(probe.heldOrSpentMicroCny)).toString()};
}

const clockReady=now=>Number.isFinite(now)&&now>=pricingProfile.checkedAt&&now<profileExpiresAt;
export function initPrunedV2Trial(directory,{budgetCny,approvedCase,approveFictionalEgress=false,acknowledgePreservedHolds=false,now=Date.now()}={}) {
  if(String(budgetCny)!=='3'||approvedCase!==caseId||approveFictionalEgress!==true||acknowledgePreservedHolds!==true)fail('explicit_pruned_v2_approval_required');
  if(!clockReady(now))fail('pricing_review_expired');
  const config=reviewedConfig();readCompactTrial(directory);readSingleSceneConfig(directory);const store=new Store(directory);
  try {
    const ledger=new BudgetLedger(store);
    if(config.sourceRefs.some(s=>store.withdrawn.includes(s.id)))fail('source_withdrawn');
    previousQuality(store,ledger);preservedFailures(store,ledger);
    if(fs.existsSync(path.join(store.directory,filename)))readPrunedV2Trial(store.directory);else store.atomic(filename,config);
    ledger.approve(config.allowance);return config;
  } finally {store.close();}
}
export function prunedV2TrialInput(config) {
  if(hash(config)!==hash(reviewedConfig()))fail('pruned_v2_config_not_reviewed');
  const input=fixture();for(const s of input.sources)s.grant.modelEgress=true;return input;
}
export function prunedV2TrialState(store,config,now=Date.now()) {
  if(hash(config)!==hash(readPrunedV2Trial(store.directory)))fail('pruned_v2_config_not_reviewed');
  const ledger=new BudgetLedger(store),prior=previousQuality(store,ledger),current=ledger.status(config.allowance.id);
  if(hash(current.allowance)!==hash(config.allowance))fail('allowance_conflict');
  const runId=own(store.state.requests,prunedV2TrialId)?.runId,run=runId?own(store.state.runs,runId):null;
  if(runId&&(!run||run.billingAllowanceId!==config.allowance.id||run.billingProtocolVersion!==compactProtocolVersion||run.appraisalProtocolVersion!==compactProtocolVersion))fail('pruned_v2_run_identity_mismatch');
  const preserved=preservedFailures(store,ledger);
  const cost=maximumCost(config.allowance.pricing,400),reason=!clockReady(now)?'pricing_or_allowance_expired':
    config.sourceRefs.some(s=>store.withdrawn.includes(s.id))?'source_withdrawn':current.attempts.some(t=>t.status!=='settled')?'unsettled_attempt_requires_review':
    current.calls>=3?'call_limit_reached':run?.status==='completed'?'completed_replay_available':run&&['cancelled','revoked','deleted','skipped'].includes(run.status)?'run_stopped':
    current.runs>=1&&!runId?'run_limit_reached':BigInt(current.heldOrSpentMicroCny)+cost>3000000n?'reservation_exceeds_remaining_budget':'limits_checked';
  const summary=s=>({calls:s.calls,runs:s.runs,heldOrSpentMicroCny:s.heldOrSpentMicroCny}),all=Object.keys(store.state.billing.accounts).map(id=>ledger.status(id));
  return {ready:reason==='limits_checked',reason,credentialRead:false,batchId:prunedV2TrialId,caseId,model:config.model,
    additionalBudgetCny:3,maxAdditionalRuns:1,maxAdditionalCalls:3,nextReservationCny:Number(cost)/1000000,
    run:runId?{id:runId,status:run.status,stagesSaved:run.scenes?.length??0}:null,previousQualityScreen:summary(prior),preservedUnknowns:preserved,prunedV2Trial:summary(current),
    allAllowances:{calls:all.reduce((n,s)=>n+s.calls,0),runs:all.reduce((n,s)=>n+s.runs,0),heldOrSpentMicroCny:all.reduce((n,s)=>n+BigInt(s.heldOrSpentMicroCny),0n).toString()},qualityAssessed:false};
}
export function prunedV2TrialPreflight(directory,now=Date.now()) {
  if(!fs.existsSync(path.join(directory,filename)))return {ready:false,reason:'pruned_v2_approval_required',credentialRead:false,proposal:prunedV2TrialProposal()};
  const store=new Store(directory);try{return prunedV2TrialState(store,readPrunedV2Trial(store.directory),now);}finally{store.close();}
}
