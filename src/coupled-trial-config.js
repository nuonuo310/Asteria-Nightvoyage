import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { Store, copy, fail } from './store.js';
import { hash, own } from './contract.js';
import { BudgetLedger, maximumCost } from './budget-ledger.js';
import { coupledBudgetVersion, buildBudgetCoupledRequest } from './coupled-affect-protocol.js';
import { verifiedQualityFixture } from './quality-config.js';
import { readPrunedV2Trial, prunedV2TrialState, prunedV2TrialId } from './pruned-v2-trial-config.js';
import { compactTrialId } from './compact-trial-config.js';
import { diagnosticId } from './single-scene-diagnostic.js';
const reviewed=JSON.parse(fs.readFileSync(new URL('./coupled-trial-profile.json',import.meta.url),'utf8'));
export const coupledTrialId='coupled-affect-dream-trial-20261016';
const filename=`${coupledTrialId}.json`;
const clockReady=now=>Number.isFinite(now)&&now>=reviewed.allowance.pricing.checkedAt&&now<reviewed.expiresAt;
export const coupledTrialProposal=()=>{const p=copy(reviewed);delete p.allowance;p.fixtureEgressApproved=false;p.paidEvaluationApproved=false;p.proposedPricing=copy(reviewed.allowance.pricing);return p;};
export function coupledTrialPinsMatch(){
  try{return Object.entries(reviewed.protocolSourcePins).every(([file,pin])=>createHash('sha256').update(fs.readFileSync(new URL('./'+file,import.meta.url),'utf8').replace(/\r\n/g,'\n')).digest('hex')===pin);}catch{return false;}
}
export function readCoupledTrial(directory){
  const file=path.join(directory,filename);
  if(!fs.existsSync(file)||!fs.lstatSync(file).isFile()||fs.lstatSync(file).isSymbolicLink())fail('coupled_approval_missing_or_unsafe');
  const config=JSON.parse(fs.readFileSync(file,'utf8'));if(hash(config)!==hash(reviewed))fail('coupled_config_not_reviewed');return config;
}
function priorHolds(store,ledger){
  const config=readPrunedV2Trial(store.directory),old=prunedV2TrialState(store,config),prior=ledger.status(prunedV2TrialId),runId=old.run?.id,run=runId&&own(store.state.runs,runId),row=prior.attempts[0];
  if(old.preservedUnknowns.calls!==2||old.preservedUnknowns.heldOrSpentMicroCny!=='4406400'||prior.calls!==1||prior.runs!==1||
      !run||!((run.status==='failed'&&run.scenes?.length===0)||(run.status==='revoked'&&store.withdrawn.includes('q-sparse-memory')&&run.scenes===undefined))||run.error!=='compact_appraisal_invalid'||
      row?.requestId!==`stage-${runId}-scene-0`||row?.runId!==runId||row?.status!=='unknown'||row.reservedMicroCny!=='2203200'||row.chargedMicroCny!==row.reservedMicroCny||
      hash(row.sourceRefs)!==hash(config.sourceRefs)||row.validationDiagnostic?.protocolVersion!==config.protocolVersion||row.validationDiagnostic?.stage!=='scene'||row.validationDiagnostic?.check!=='affect_change_requires_evidence')fail('expected_three_preserved_holds_required');
  return {calls:3,runs:3,heldOrSpentMicroCny:'6609600'};
}
function fixtureMatches(){try{return createHash('sha256').update(fs.readFileSync(new URL('../fixtures/quality/sparse-context.json',import.meta.url),'utf8').replace(/\r\n/g,'\n')).digest('hex')===reviewed.fixtureSha256;}catch{return false;}}
const hasOtherUnsettled=store=>Object.entries(store.state.billing.accounts).some(([id,a])=>![compactTrialId,diagnosticId,prunedV2TrialId,coupledTrialId].includes(id)&&Object.values(a.attempts).some(t=>t.status!=='settled'));
export function coupledTrialInput(config){
  if(hash(config)!==hash(reviewed))fail('coupled_config_not_reviewed');
  const bytes=fs.readFileSync(new URL('../fixtures/quality/sparse-context.json',import.meta.url)),digest=createHash('sha256').update(bytes.toString('utf8').replace(/\r\n/g,'\n')).digest('hex');
  if(digest!==reviewed.fixtureSha256)fail('coupled_fixture_changed');
  const input=verifiedQualityFixture('sparse-context',bytes);for(const s of input.sources)s.grant.modelEgress=true;return input;
}
// Pure: same builder and serialized byte ceiling as transport; no Key/reservation/HTTP.
export function checkCoupledRequestBytes(input,scenes=[]){
  const index=scenes.length,request=buildBudgetCoupledRequest({stage:index<2?'scene':'wake',index,snapshot:input,scenes},{model:reviewed.model,maxOutputTokens:400});
  const requestBytes=Buffer.byteLength(JSON.stringify(request.body));return {requestBytes,requestByteLimit:65536,requestFits:requestBytes<=65536};
}
export function coupledTrialState(store,config,now=Date.now()){
  if(hash(config)!==hash(readCoupledTrial(store.directory)))fail('coupled_config_not_reviewed');
  if(!fixtureMatches())fail('coupled_fixture_changed'); // Older reviewed history readers also require this shipped fixture.
  const ledger=new BudgetLedger(store),prior=priorHolds(store,ledger),current=ledger.status(coupledTrialId);
  if(hash(current.allowance)!==hash(config.allowance))fail('allowance_conflict');
  const runId=own(store.state.requests,coupledTrialId)?.runId,run=runId?own(store.state.runs,runId):null;
  if(runId&&(!run||run.billingAllowanceId!==coupledTrialId||run.billingProtocolVersion!==coupledBudgetVersion||run.appraisalProtocolVersion!==coupledBudgetVersion||run.normalizationPolicyVersion!=='validated-unused-quotation-pruning-v1'||run.affectEncodingVersion!=='explicit-affect-union-v1'))fail('coupled_run_identity_mismatch');
  const sourcePinsMatch=coupledTrialPinsMatch(),fixtureMatchesReview=fixtureMatches(),withdrawn=config.sourceRefs.some(s=>store.withdrawn.includes(s.id));
  // History reads survive drift/withdrawal/deletion; no old body is rebuilt to preflight.
  const sizing=sourcePinsMatch&&fixtureMatchesReview&&!withdrawn&&(!run||['queued','uncertain'].includes(run.status))?checkCoupledRequestBytes(coupledTrialInput(config),run?.scenes??[]):{requestBytes:null,requestByteLimit:65536,requestFits:null};
  const cost=maximumCost(config.allowance.pricing,400),reason=!sourcePinsMatch?'coupled_protocol_source_changed':!fixtureMatchesReview?'coupled_fixture_changed':!clockReady(now)?'pricing_or_allowance_expired':withdrawn?'source_withdrawn':hasOtherUnsettled(store)?'other_unsettled_attempt_requires_review':
    current.attempts.some(t=>t.status!=='settled')?'unsettled_attempt_requires_review':current.calls>=3?'call_limit_reached':run?.status==='completed'?'completed_replay_available':
    run&&['failed','cancelled','revoked','deleted','skipped'].includes(run.status)?'run_stopped':sizing.requestFits===false?'request_too_large':current.runs>=1&&!runId?'run_limit_reached':
    BigInt(current.heldOrSpentMicroCny)+cost>3000000n?'reservation_exceeds_remaining_budget':'limits_checked';
  const all=Object.keys(store.state.billing.accounts).map(id=>ledger.status(id));
  return {ready:reason==='limits_checked',reason,credentialRead:false,sourcePinsMatch,fixtureMatchesReview,batchId:coupledTrialId,caseId:'sparse-context',protocolVersion:coupledBudgetVersion,model:config.model,expiresAt:config.expiresAt,
    additionalBudgetCny:3,maxAdditionalRuns:1,maxAdditionalCalls:3,nextReservationCny:Number(cost)/1000000,...sizing,
    run:run?{id:runId,status:run.status,stagesSaved:run.scenes?.length??0}:null,preservedUnknowns:prior,
    coupledTrial:{calls:current.calls,runs:current.runs,heldOrSpentMicroCny:current.heldOrSpentMicroCny},
    allAllowances:{calls:all.reduce((n,s)=>n+s.calls,0),runs:all.reduce((n,s)=>n+s.runs,0),heldOrSpentMicroCny:all.reduce((n,s)=>n+BigInt(s.heldOrSpentMicroCny),0n).toString()},qualityAssessed:false};
}
export function coupledTrialPreflight(directory,now=Date.now()){
  if(!fs.existsSync(path.join(directory,filename)))return {ready:false,reason:'coupled_approval_required',credentialRead:false,proposal:coupledTrialProposal()};
  const store=new Store(directory);try{return coupledTrialState(store,readCoupledTrial(store.directory),now);}finally{store.close();}
}
export function initCoupledTrial(directory,{budgetCny,approvedCase,approveFictionalEgress=false,acknowledgePreservedHolds=false,now=Date.now()}={}){
  if(String(budgetCny)!=='3'||approvedCase!=='sparse-context'||approveFictionalEgress!==true||acknowledgePreservedHolds!==true)fail('explicit_coupled_approval_required');
  if(!clockReady(now))fail('pricing_review_expired');if(!coupledTrialPinsMatch())fail('coupled_protocol_source_changed');
  const input=coupledTrialInput(reviewed);if(!checkCoupledRequestBytes(input).requestFits)fail('request_too_large');
  // Missing old history never creates a new directory/account.
  readPrunedV2Trial(directory);const store=new Store(directory);
  try{const ledger=new BudgetLedger(store);priorHolds(store,ledger);if(hasOtherUnsettled(store))fail('other_unsettled_attempt_requires_review');if(reviewed.sourceRefs.some(s=>store.withdrawn.includes(s.id)))fail('source_withdrawn');
    if(fs.existsSync(path.join(store.directory,filename)))readCoupledTrial(store.directory);else store.atomic(filename,reviewed);
    ledger.approve(reviewed.allowance);return copy(reviewed);
  }finally{store.close();}
}
