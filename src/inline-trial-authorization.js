// Contract-bound authority data and accounts. This module cannot dispatch HTTP.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Store,copy,fail} from './store.js';
import {hash,own,config,snapshot} from './contract.js';
import {validateAllowance} from './budget-ledger.js';
import {inlineProtocolVersion,buildInlineRequest} from './inline-evidence-protocol.js';
import {InlineHistoryGuard} from './inline-entry-admission.js';
import {readInlinePaidContract,validateInlinePaidContract,inspectInlinePaidAcknowledgement} from './inline-paid-contract.js';
import {inlineTrialAllowanceId,inlineTrialAuthorizationVersion} from './inline-trial-policy.js';
import {assertAppraisalReviewJsonData} from './appraisal-review-memory.js';
export {inlineTrialAllowanceId,inlineTrialAuthorizationVersion};
const field='inlineTrialAuthorization';
const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(k=>Object.hasOwn(value,k));
export const inlineTrialRunConfig=()=>config({scenes:2,maxCalls:3,inputTokens:3300000,outputTokens:1200,perCallOutput:400,timeoutMs:60000});
function allowance(contract,mode){
  if(!['stub','live'].includes(mode))fail('invalid_trial_authorization_mode');const p=contract.pricing;
  return validateAllowance({id:inlineTrialAllowanceId,mode,approved:true,expiresAt:p.expiresAt,limits:{maxRuns:1,maxCalls:3,maxMicroCny:3000000},pricing:{model:contract.provider.model,contextTokenLimit:p.contextTokenLimit,inputMicroCnyPerMillion:p.inputMicroCnyPerMillion,outputMicroCnyPerMillion:p.outputMicroCnyPerMillion,reference:p.references[0],checkedAt:p.checkedAt},protocolVersion:inlineProtocolVersion,entryAuthorizationVersion:inlineTrialAuthorizationVersion});
}
function checked(record){
  try{assertAppraisalReviewJsonData(record);}catch{fail('invalid_trial_authorization');}
  if(!exact(record,['schemaVersion','authorizationVersion','mode','status','terms','termsHash'])||record.schemaVersion!==1||record.authorizationVersion!==inlineTrialAuthorizationVersion||!['stub','live'].includes(record.mode)||!['active','revoked'].includes(record.status)||!exact(record.terms,['contract','contractHash','confirmation','dispatchKind','allowance','baseline','createdAt','requestId','sessionId','runConfig'])||hash(record.terms)!==record.termsHash)fail('invalid_trial_authorization');
  const t=record.terms,c=validateInlinePaidContract(t.contract,{now:t.createdAt});
  inspectInlinePaidAcknowledgement(t.contract,t.confirmation,{now:t.createdAt});
  if(!['rehearsal','provider'].includes(t.dispatchKind)||record.mode==='stub'&&t.dispatchKind!=='rehearsal')fail('trial_dispatch_kind_mismatch');
  if(c.contractHash!==t.contractHash||hash(allowance(c.contract,record.mode))!==hash(t.allowance)||t.requestId!==inlineTrialAllowanceId||t.sessionId!==inlineTrialAllowanceId||hash(t.runConfig)!==hash(inlineTrialRunConfig()))fail('trial_authorization_terms_changed');return record;
}
const candidate=mode=>({id:inlineTrialAllowanceId,mode});
export function readInlineTrialAuthorization(store,{now=Date.now(),allowExpired=false,allowRevoked=false}={}){
  if(!(store instanceof Store))fail('managed_store_required');store.assert();const r=checked(own(store.state,field));
  validateInlinePaidContract(r.terms.contract,{now,allowExpired});if(now<r.terms.createdAt)fail('paid_contract_clock_invalid');
  new InlineHistoryGuard(store,{baseline:r.terms.baseline,candidateAccount:candidate(r.mode)}).assertPreserved();
  const a=own(store.state.billing.accounts,inlineTrialAllowanceId);if(!a||a.fingerprint!==hash(r.terms.allowance)||hash(a.allowance)!==hash(r.terms.allowance))fail('trial_authorization_account_mismatch');
  if(!allowRevoked&&r.status!=='active')fail('trial_authorization_revoked');return copy(r);
}
export function initInlineTrialAuthorization(store,{confirmation,mode,dispatchKind=mode==='stub'?'rehearsal':'provider',now=Date.now(),fault=()=>{}}={}){
  if(!['stub','live'].includes(mode))fail('explicit_trial_mode_required');
  if(!['rehearsal','provider'].includes(dispatchKind)||mode==='stub'&&dispatchKind!=='rehearsal')fail('trial_dispatch_kind_mismatch');
  const c=readInlinePaidContract({now});inspectInlinePaidAcknowledgement(c.contract,confirmation,{now});
  if(!(store instanceof Store))fail('managed_store_required');store.assert();
  if(Object.hasOwn(store.state,field)){const old=readInlineTrialAuthorization(store,{now});if(old.mode!==mode||old.terms.contractHash!==c.contractHash||old.terms.dispatchKind!==dispatchKind)fail('trial_authorization_conflict');return old;}
  if(own(store.state.billing?.accounts??{},inlineTrialAllowanceId))fail('unbound_trial_account');
  const guard=new InlineHistoryGuard(store,{candidateAccount:candidate(mode)}),terms={contract:c.contract,contractHash:c.contractHash,confirmation:copy(confirmation),dispatchKind,allowance:allowance(c.contract,mode),baseline:guard.capture(),createdAt:now,requestId:inlineTrialAllowanceId,sessionId:inlineTrialAllowanceId,runConfig:inlineTrialRunConfig()};
  const record={schemaVersion:1,authorizationVersion:inlineTrialAuthorizationVersion,mode,status:'active',terms,termsHash:hash(terms)};
  fault('before_trial_authorization_commit');guard.assertPreserved();validateInlinePaidContract(c.contract,{now});
  store.state[field]=record;store.state.billing.accounts[inlineTrialAllowanceId]={fingerprint:hash(terms.allowance),allowance:terms.allowance,attempts:{},runIds:[]};
  try{store.save();}catch{delete store.state[field];delete store.state.billing.accounts[inlineTrialAllowanceId];store.poisoned=true;fail('storage_io_failure');}
  fault('after_trial_authorization_commit');return readInlineTrialAuthorization(store,{now});
}
export function revokeInlineTrialAuthorization(store){const r=readInlineTrialAuthorization(store,{allowExpired:true,allowRevoked:true});if(r.status==='revoked')return r;store.state[field].status='revoked';try{store.save();}catch{store.poisoned=true;fail('storage_io_failure');}return copy(store.state[field]);}
export function requireInlineTrialAuthorization(directory,{mode}={}){
  try{
    const d=path.resolve(directory),root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));if(d===root||d.startsWith(root+path.sep))fail('unsafe_trial_path');
    let p=d;for(;;){if(fs.lstatSync(p).isSymbolicLink())fail('unsafe_trial_path');const parent=path.dirname(p);if(parent===p)break;p=parent;}
    const file=path.join(d,'state.json'),stat=fs.lstatSync(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>2097152)fail('unsafe_trial_path');const r=checked(JSON.parse(fs.readFileSync(file,'utf8'))[field]);if(mode!==undefined&&r.mode!==mode)fail('trial_mode_mismatch');return copy(r);
  }catch{fail('existing_matching_trial_authorization_required');}
}
export function inlineTrialInput(){const input=snapshot(JSON.parse(fs.readFileSync(new URL('../fixtures/quality/sparse-context.json',import.meta.url),'utf8')));if(input.sources.some(s=>s.grant.modelEgress!==false))fail('trial_fixture_changed');for(const s of input.sources)s.grant.modelEgress=true;return input;}
export function assertInlineTrialStage(store,{allowanceId,requestId,runId,payload},phase,{mode='stub'}={}){
  const record=readInlineTrialAuthorization(store),t=record.terms,r=runId&&own(store.state.runs,runId),request=own(store.state.requests,t.requestId);
  if(record.mode!==mode)fail('trial_mode_mismatch');
  assertAppraisalReviewJsonData(payload);
  const provider=`${inlineProtocolVersion}:${mode}:${inlineTrialAllowanceId}:deepseek-flash:${inlineTrialAuthorizationVersion}:${record.termsHash}`;
  if(allowanceId!==inlineTrialAllowanceId||request?.runId!==runId||!r||r.id!==runId||r.status!=='running'||r.billingAllowanceId!==inlineTrialAllowanceId||r.billingProtocolVersion!==inlineProtocolVersion||r.appraisalProtocolVersion!==inlineProtocolVersion||r.trialAuthorizationVersion!==inlineTrialAuthorizationVersion||r.trialAuthorizationHash!==record.termsHash||hash(r.executionOwner)!==hash({schemaVersion:1,family:`specialized:${inlineProtocolVersion}`,providerIdentity:provider})||hash(r.config)!==hash(t.runConfig)||hash(r.snapshot)!==hash(inlineTrialInput())||!exact(payload,['stage','index','snapshot','scenes'])||hash(payload)!==hash({stage:r.scenes.length<2?'scene':'wake',index:r.scenes.length,snapshot:r.snapshot,scenes:r.scenes})||requestId!==`stage-${runId}-${payload.stage}-${payload.index}`)fail('trial_authorized_stage_mismatch');
  const rows=Object.values(store.state.billing.accounts[inlineTrialAllowanceId].attempts);if(rows.some(row=>row.runId!==runId||row.status==='unknown')||phase==='before_reservation'&&rows.some(row=>row.status!=='settled'))fail('ambiguous_attempt');
  if(phase!=='before_reservation'){const row=own(store.state.billing.accounts[inlineTrialAllowanceId].attempts,requestId),expected=phase==='before_dispatch'?'reserved':phase==='publish'?'settled':'dispatched';if(row?.status!==expected)fail('trial_stage_reservation_mismatch');}
  const built=buildInlineRequest(payload,{model:t.allowance.pricing.model,maxOutputTokens:400});
  if(phase!=='before_reservation'){const row=store.state.billing.accounts[inlineTrialAllowanceId].attempts[requestId];if(row.fingerprint!==hash({runId,request:built.body,snapshot:payload.snapshot})||row.maxOutputTokens!==400||row.reservedMicroCny!==t.contract.pricing.fullPerCallReservationMicroCny)fail('trial_stage_reservation_mismatch');}return record;
}
