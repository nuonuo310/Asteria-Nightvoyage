// Immutable reviewed template; local exact init is required before any live dispatch.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {Store,copy,fail} from './store.js';
import {hash,own,snapshot,neutral} from './contract.js';
import {BudgetLedger,maximumCost} from './budget-ledger.js';
import {continuityBudgetVersion,continuityIdentity,buildContinuityRequest,normalizeContinuityCheckpoint} from './scene-continuity-protocol.js';
import {coupledTrialId,readCoupledTrial,coupledTrialInput,coupledTrialState} from './coupled-trial-config.js';
import {compactTrialId} from './compact-trial-config.js';
import {diagnosticId} from './single-scene-diagnostic.js';
import {prunedV2TrialId} from './pruned-v2-trial-config.js';
const reviewed=JSON.parse(fs.readFileSync(new URL('./continuity-trial-profile.json',import.meta.url),'utf8'));
export const continuityTrialId='scene-continuity-dream-trial-20261016';
const filename=`${continuityTrialId}.json`;
const clockReady=now=>Number.isFinite(now)&&now>=reviewed.allowance.pricing.checkedAt&&now<reviewed.expiresAt;
const digest=text=>createHash('sha256').update(text.replaceAll('\r\n','\n')).digest('hex');
export function continuityTrialPinsMatch(){try{return Object.entries(reviewed.protocolSourcePins).every(([f,h])=>/^[\w-]+\.(js|json)$/.test(f)&&digest(fs.readFileSync(new URL('./'+f,import.meta.url),'utf8'))===h);}catch{return false;}}
export function continuityTrialProposal(){const p=copy(reviewed);delete p.allowance;p.fixtureEgressApproved=false;p.paidEvaluationApproved=false;p.proposedPricing=copy(reviewed.allowance.pricing);return p;}
export function readContinuityTrial(directory){
  const file=path.join(directory,filename);
  if(!fs.existsSync(file)||!fs.lstatSync(file).isFile()||fs.lstatSync(file).isSymbolicLink())fail('continuity_approval_missing_or_unsafe');
  const config=JSON.parse(fs.readFileSync(file,'utf8'));if(hash(config)!==hash(reviewed))fail('continuity_config_not_reviewed');return config;
}
function fixtureMatches(){try{return digest(fs.readFileSync(new URL('../fixtures/quality/sparse-context.json',import.meta.url),'utf8'))===reviewed.fixtureSha256;}catch{return false;}}
export function continuityTrialInput(config){
  if(hash(config)!==hash(reviewed))fail('continuity_config_not_reviewed');if(!fixtureMatches())fail('continuity_fixture_changed');
  return coupledTrialInput(JSON.parse(fs.readFileSync(new URL('./coupled-trial-profile.json',import.meta.url),'utf8')));
}
// Same builder as transport; verifies the full saved chain before credential access.
export function checkContinuityRequestBytes(input,scenes=[]){
  const index=scenes.length,request=buildContinuityRequest({stage:index<2?'scene':'wake',index,snapshot:input,scenes},{model:reviewed.model,maxOutputTokens:400}),requestBytes=Buffer.byteLength(JSON.stringify(request.body));
  return {requestBytes,requestByteLimit:65536,requestFits:requestBytes<=65536};
}
function history(store,ledger){
  const config=readCoupledTrial(store.directory),state=coupledTrialState(store,config),previous=ledger.status(coupledTrialId),runId=state.run?.id,run=runId&&own(store.state.runs,runId);
  if(state.preservedUnknowns.calls!==3||state.preservedUnknowns.heldOrSpentMicroCny!=='6609600'||previous.calls!==3||previous.runs!==1||previous.attempts.some(t=>t.status!=='settled'||t.runId!==runId)||!run||!['completed','revoked','deleted'].includes(run.status))fail('completed_coupled_history_required');
  return {preservedUnknowns:copy(state.preservedUnknowns),previousCoupled:{calls:previous.calls,runs:previous.runs,heldOrSpentMicroCny:previous.heldOrSpentMicroCny}};
}
const otherUnsettled=store=>Object.entries(store.state.billing.accounts).some(([id,a])=>![compactTrialId,diagnosticId,prunedV2TrialId,continuityTrialId].includes(id)&&Object.values(a.attempts).some(t=>t.status!=='settled'));
function checkedRun(store){
  const id=own(store.state.requests,continuityTrialId)?.runId,r=id?own(store.state.runs,id):null;
  if(id&&(!r||r.id!==id||r.billingAllowanceId!==continuityTrialId||r.billingProtocolVersion!==continuityBudgetVersion||r.appraisalProtocolVersion!==continuityBudgetVersion||Object.entries(continuityIdentity()).some(([k,v])=>r[k]!==v)))fail('continuity_run_identity_mismatch');
  if(r?.snapshot&&r.scenes){
    if(hash(r.snapshot)!==hash(snapshot(continuityTrialInput(reviewed)))||r.config.scenes!==2||r.config.maxCalls!==3||r.config.perCallOutput!==400)fail('continuity_run_identity_mismatch');
    let before=r.snapshot.channels.affect.value??neutral();for(const s of r.scenes)before=normalizeContinuityCheckpoint(s,before).after;
  }
  return r;
}
export function continuityTrialState(store,config,now=Date.now()){
  if(hash(config)!==hash(readContinuityTrial(store.directory)))fail('continuity_config_not_reviewed');
  if(!fixtureMatches())fail('continuity_fixture_changed');
  if(!store.state.billing)fail('completed_coupled_history_required');
  const ledger=new BudgetLedger(store),prior=history(store,ledger),current=ledger.status(continuityTrialId),run=checkedRun(store);
  if(hash(current.allowance)!==hash(config.allowance))fail('allowance_conflict');
  const sourcePinsMatch=continuityTrialPinsMatch(),withdrawn=config.sourceRefs.some(s=>store.withdrawn.includes(s.id)),rows=current.attempts;
  if(run&&rows.some(t=>t.runId!==run.id))fail('continuity_run_identity_mismatch');
  const sizing=sourcePinsMatch&&!withdrawn&&(!run||['queued','uncertain','running'].includes(run.status))?checkContinuityRequestBytes(continuityTrialInput(config),run?.scenes??[]):{requestBytes:null,requestByteLimit:65536,requestFits:null};
  const cost=maximumCost(config.allowance.pricing,400),reason=!sourcePinsMatch?'continuity_protocol_source_changed':!clockReady(now)?'pricing_or_allowance_expired':withdrawn?'source_withdrawn':otherUnsettled(store)?'other_unsettled_attempt_requires_review':rows.some(t=>t.status!=='settled')?'unsettled_attempt_requires_review':current.calls>=3?'call_limit_reached':run?.status==='completed'?'completed_replay_available':run&&['failed','cancelled','revoked','deleted','skipped'].includes(run.status)?'run_stopped':sizing.requestFits===false?'request_too_large':current.runs>=1&&!run?'run_limit_reached':BigInt(current.heldOrSpentMicroCny)+cost>BigInt(config.allowance.limits.maxMicroCny)?'reservation_exceeds_remaining_budget':'limits_checked';
  const all=Object.keys(store.state.billing.accounts).map(id=>ledger.status(id));
  return {ready:reason==='limits_checked',reason,credentialRead:false,sourcePinsMatch,fixtureMatchesReview:true,batchId:continuityTrialId,caseId:config.caseId,protocolVersion:config.protocolVersion,promptCandidateHash:config.promptCandidateHash,model:config.model,expiresAt:config.expiresAt,additionalBudgetCny:3,maxAdditionalRuns:1,maxAdditionalCalls:3,nextReservationCny:Number(cost)/1000000,...sizing,run:run?{id:run.id,status:run.status,stagesSaved:run.scenes?.length??0}:null,...prior,continuityTrial:{calls:current.calls,runs:current.runs,heldOrSpentMicroCny:current.heldOrSpentMicroCny},allAllowances:{calls:all.reduce((n,s)=>n+s.calls,0),runs:all.reduce((n,s)=>n+s.runs,0),heldOrSpentMicroCny:all.reduce((n,s)=>n+BigInt(s.heldOrSpentMicroCny),0n).toString()},qualityAssessed:false};
}
export function continuityTrialPreflight(directory,now=Date.now()){
  if(!fs.existsSync(path.join(directory,filename)))return {ready:false,reason:'continuity_approval_required',credentialRead:false,proposal:continuityTrialProposal()};
  const config=readContinuityTrial(directory);if(!fs.existsSync(path.join(directory,'state.json')))fail('completed_coupled_history_required');
  const store=new Store(directory);try{return continuityTrialState(store,config,now);}finally{store.close();}
}
export function initContinuityTrial(directory,{budgetCny,approvedCase,approveFictionalEgress=false,acknowledgePreservedHolds=false,now=Date.now()}={}){
  if(String(budgetCny)!=='3'||approvedCase!=='sparse-context'||approveFictionalEgress!==true||acknowledgePreservedHolds!==true)fail('explicit_continuity_approval_required');
  if(!clockReady(now))fail('pricing_review_expired');if(!continuityTrialPinsMatch())fail('continuity_protocol_source_changed');
  const input=continuityTrialInput(reviewed);if(!checkContinuityRequestBytes(input).requestFits)fail('request_too_large');
  readCoupledTrial(directory);if(!fs.existsSync(path.join(directory,'state.json')))fail('completed_coupled_history_required');
  const store=new Store(directory);try{
    if(!store.state.billing)fail('completed_coupled_history_required');const ledger=new BudgetLedger(store);history(store,ledger);
    if(otherUnsettled(store))fail('other_unsettled_attempt_requires_review');if(reviewed.sourceRefs.some(s=>store.withdrawn.includes(s.id)))fail('source_withdrawn');
    if(fs.existsSync(path.join(directory,filename)))readContinuityTrial(directory);else store.atomic(filename,reviewed);
    ledger.approve(reviewed.allowance);return copy(reviewed);
  }finally{store.close();}
}
// Runtime admission is stricter than a public low-level allowance object.
export function assertContinuityApprovalDirectory(directory){
  if(!directory||!fs.existsSync(path.join(directory,filename)))fail('continuity_live_entry_pending');
  const config=readContinuityTrial(directory);if(!clockReady(Date.now()))fail('pricing_review_expired');if(!continuityTrialPinsMatch())fail('continuity_protocol_source_changed');return config;
}
export function assertContinuityLiveStore(store,args){
  if(!(store instanceof Store))fail('continuity_live_entry_pending');
  const config=assertContinuityApprovalDirectory(store.directory),state=continuityTrialState(store,config);if(!state.ready)fail('continuity_preflight_blocked');
  if(args){const run=checkedRun(store);if(!run||run.status!=='running'||args.allowanceId!==continuityTrialId||args.runId!==run.id||args.requestId!==`stage-${run.id}-${run.scenes.length<2?'scene':'wake'}-${run.scenes.length}`||hash(args.payload)!==hash({stage:run.scenes.length<2?'scene':'wake',index:run.scenes.length,snapshot:run.snapshot,scenes:run.scenes}))fail('continuity_run_identity_mismatch');}
}
