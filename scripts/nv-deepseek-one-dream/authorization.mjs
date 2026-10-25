// New authorization record and account. This module has no HTTP or credential loader.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Store, copy, fail} from '../../src/store.js';
import {hash, config, own, safeId} from '../../src/contract.js';
import {InlineHistoryGuard} from '../../src/inline-entry-admission.js';
import {inlineProtocolVersion, buildInlineRequest} from '../../src/inline-evidence-protocol.js';
import {assertAppraisalReviewJsonData} from '../../src/appraisal-review-memory.js';
import {readOneDreamContract, validateOneDreamContract, oneDreamInput, oneDreamCaseId} from './contract.mjs';
import {validateOneDreamAllowance} from './ledger.mjs';
import {oneDreamAllowanceId, oneDreamAuthorizationField, oneDreamAuthorizationVersion, oneDreamRequestId, oneDreamSessionId} from './policy.mjs';

const root=fileURLToPath(new URL('../..',import.meta.url));
const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
export const oneDreamContractConfirmationKeys=Object.freeze(['contractHash','budgetCny','caseId','allowFictionalEgress','acknowledgePreservedHolds','acknowledgeMutableModelAlias','accountCurrency']);
export function oneDreamConfirmation(contractHash){return {contractHash,budgetCny:3,caseId:oneDreamCaseId,allowFictionalEgress:true,acknowledgePreservedHolds:true,acknowledgeMutableModelAlias:true,accountCurrency:'CNY'};}
export function inspectOneDreamConfirmation(contract,confirmation){
  try{assertAppraisalReviewJsonData(confirmation);}catch{fail('one_dream_confirmation_mismatch');}
  const checked=validateOneDreamContract(contract,{now:contract?.pricing?.checkedAt});
  if(!exact(confirmation,oneDreamContractConfirmationKeys)||JSON.stringify(confirmation)!==JSON.stringify(oneDreamConfirmation(checked.contractHash)))fail('one_dream_confirmation_mismatch');
  return {contractHash:checked.contractHash,shapeMatches:true,createsAuthorization:false,credentialRead:false,liveEntryAvailable:false};
}
export function oneDreamAllowance(contract,mode){
  if(!['stub','live'].includes(mode))fail('one_dream_authorization_mode_required');
  const pricing=contract.pricing;
  return validateOneDreamAllowance({id:oneDreamAllowanceId,mode,approved:true,expiresAt:pricing.expiresAt,limits:{maxRuns:1,maxCalls:3,maxMicroCny:3000000},pricing:{model:contract.provider.model,contextTokenLimit:pricing.contextTokenLimit,inputMicroCnyPerMillion:pricing.inputMicroCnyPerMillion,outputMicroCnyPerMillion:pricing.outputMicroCnyPerMillion,reference:pricing.references[0],checkedAt:pricing.checkedAt},protocolVersion:inlineProtocolVersion,entryAuthorizationVersion:oneDreamAuthorizationVersion});
}
export function oneDreamRunConfig(contract){return config({scenes:2,maxCalls:3,inputTokens:contract.pricing.contextTokenLimit*3,outputTokens:1200,perCallOutput:400,timeoutMs:60000});}
function legacyBaseline(store){return new InlineHistoryGuard(store).capture();}
function assertLegacyBaseline(store,baseline){
  if(!baseline||typeof baseline!=='object'||!baseline.accounts||typeof baseline.accounts!=='object')fail('one_dream_invalid_legacy_baseline');
  const current=Object.fromEntries(Object.entries(store.state.billing?.accounts??{}).filter(([id])=>id!==oneDreamAllowanceId).map(([id,account])=>[id,hash(account)]));
  if(hash(current)!==hash(baseline.accounts))fail('one_dream_legacy_history_changed');
}
function validateRecord(record,{now=Date.now(),allowExpired=false,allowRevoked=false}={}){
  try{assertAppraisalReviewJsonData(record);}catch{fail('one_dream_invalid_authorization');}
  if(!exact(record,['schemaVersion','authorizationVersion','mode','status','terms','termsHash'])||record.schemaVersion!==1||record.authorizationVersion!==oneDreamAuthorizationVersion||!['stub','live'].includes(record.mode)||!['active','revoked'].includes(record.status)||!exact(record.terms,['contract','contractHash','confirmation','dispatchKind','allowance','baseline','createdAt','requestId','sessionId','runConfig'])||hash(record.terms)!==record.termsHash)fail('one_dream_invalid_authorization');
  const terms=record.terms,checked=validateOneDreamContract(terms.contract,{now:terms.createdAt,allowExpired});
  inspectOneDreamConfirmation(terms.contract,terms.confirmation);
  if(!['rehearsal','provider'].includes(terms.dispatchKind)||record.mode==='stub'&&terms.dispatchKind!=='rehearsal'||record.mode==='live'&&terms.dispatchKind!=='provider')fail('one_dream_dispatch_kind_mismatch');
  if(checked.contractHash!==terms.contractHash||hash(oneDreamAllowance(checked.contract,record.mode))!==hash(terms.allowance)||terms.requestId!==oneDreamRequestId||terms.sessionId!==oneDreamSessionId||hash(terms.runConfig)!==hash(oneDreamRunConfig(checked.contract)))fail('one_dream_authorization_terms_changed');
  if(!Number.isSafeInteger(terms.createdAt)||now<terms.createdAt)fail('one_dream_contract_clock_invalid');
  validateOneDreamContract(terms.contract,{now,allowExpired});
  if(!allowRevoked&&record.status!=='active')fail('one_dream_authorization_revoked');
  return record;
}
function assertAccount(store,record){
  const account=own(store.state.billing?.accounts??{},oneDreamAllowanceId);
  if(!account||account.fingerprint!==hash(record.terms.allowance)||hash(account.allowance)!==hash(record.terms.allowance))fail('one_dream_authorization_account_mismatch');
}
export function readOneDreamAuthorization(store,options={}){
  if(!(store instanceof Store))fail('one_dream_managed_store_required');store.assert();
  const record=validateRecord(own(store.state,oneDreamAuthorizationField),options);
  assertAccount(store,record);assertLegacyBaseline(store,record.terms.baseline);
  return copy(record);
}
export function initOneDreamAuthorization(store,{confirmation,mode,dispatchKind=mode==='stub'?'rehearsal':'provider',now=Date.now(),fault=()=>{}}={}){
  if(!(store instanceof Store))fail('one_dream_managed_store_required');store.assert();
  if(!['stub','live'].includes(mode)||!['rehearsal','provider'].includes(dispatchKind)||mode==='stub'&&dispatchKind!=='rehearsal'||mode==='live'&&dispatchKind!=='provider')fail('one_dream_dispatch_kind_mismatch');
  const checked=readOneDreamContract({now}),confirmationCheck=inspectOneDreamConfirmation(checked.contract,confirmation);
  if(own(store.state,oneDreamAuthorizationField)){
    const old=readOneDreamAuthorization(store,{now});
    if(old.mode!==mode||old.authorizationVersion!==oneDreamAuthorizationVersion||old.terms.contractHash!==confirmationCheck.contractHash||old.terms.dispatchKind!==dispatchKind)fail('one_dream_authorization_conflict');
    return old;
  }
  if(own(store.state.billing?.accounts??{},oneDreamAllowanceId))fail('one_dream_unbound_account');
  const baseline=legacyBaseline(store),terms={contract:checked.contract,contractHash:checked.contractHash,confirmation:copy(confirmation),dispatchKind,allowance:oneDreamAllowance(checked.contract,mode),baseline,createdAt:now,requestId:oneDreamRequestId,sessionId:oneDreamSessionId,runConfig:oneDreamRunConfig(checked.contract)};
  const record={schemaVersion:1,authorizationVersion:oneDreamAuthorizationVersion,mode,status:'active',terms,termsHash:hash(terms)};
  fault('before_one_dream_authorization_commit');validateOneDreamContract(checked.contract,{now});
  store.state[oneDreamAuthorizationField]=record;store.state.billing.accounts[oneDreamAllowanceId]={fingerprint:hash(terms.allowance),allowance:terms.allowance,attempts:{},runIds:[]};
  try{store.save();}catch{delete store.state[oneDreamAuthorizationField];delete store.state.billing.accounts[oneDreamAllowanceId];store.poisoned=true;fail('one_dream_storage_io_failure');}
  fault('after_one_dream_authorization_commit');return readOneDreamAuthorization(store,{now});
}
export function revokeOneDreamAuthorization(store){
  const record=readOneDreamAuthorization(store,{allowExpired:true,allowRevoked:true});
  if(record.status==='revoked')return record;
  store.state[oneDreamAuthorizationField].status='revoked';
  try{store.save();}catch{store.poisoned=true;fail('one_dream_storage_io_failure');}
  return copy(store.state[oneDreamAuthorizationField]);
}
export function requireOneDreamAuthorization(directory,{mode}={}){
  try{
    const resolved=path.resolve(directory),base=path.resolve(root);if(resolved===base||resolved.startsWith(base+path.sep))fail('one_dream_unsafe_path');
    let current=resolved;for(;;){if(fs.lstatSync(current).isSymbolicLink())fail('one_dream_unsafe_path');const parent=path.dirname(current);if(parent===current)break;current=parent;}
    const filename=path.join(resolved,'state.json'),stat=fs.lstatSync(filename);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>2097152)fail('one_dream_unsafe_path');
    const record=validateRecord(JSON.parse(fs.readFileSync(filename,'utf8'))[oneDreamAuthorizationField]);
    if(mode!==undefined&&record.mode!==mode)fail('one_dream_mode_mismatch');
    return copy(record);
  }catch{fail('one_dream_matching_authorization_required');}
}
export function assertOneDreamStage(store,{allowanceId,requestId,runId,payload},phase,{mode='stub'}={}){
  const record=readOneDreamAuthorization(store),terms=record.terms,run=runId&&own(store.state.runs,runId),request=own(store.state.requests,terms.requestId);
  if(record.mode!==mode)fail('one_dream_mode_mismatch');
  assertAppraisalReviewJsonData(payload);
  const providerIdentity=`${inlineProtocolVersion}:${mode}:${oneDreamAllowanceId}:deepseek-flash:${oneDreamAuthorizationVersion}:${record.termsHash}`;
  if(allowanceId!==oneDreamAllowanceId||request?.runId!==runId||!run||run.id!==runId||run.status!=='running'||run.billingAllowanceId!==oneDreamAllowanceId||run.billingProtocolVersion!==inlineProtocolVersion||run.appraisalProtocolVersion!==inlineProtocolVersion||run.nvDeepSeekOneDreamAuthorizationVersion!==oneDreamAuthorizationVersion||run.nvDeepSeekOneDreamAuthorizationHash!==record.termsHash||hash(run.executionOwner)!==hash({schemaVersion:1,family:`specialized:${inlineProtocolVersion}`,providerIdentity})||hash(run.config)!==hash(terms.runConfig)||hash(run.snapshot)!==hash(oneDreamInput(terms.contract))||!exact(payload,['stage','index','snapshot','scenes'])||hash(payload)!==hash({stage:run.scenes.length<2?'scene':'wake',index:run.scenes.length,snapshot:run.snapshot,scenes:run.scenes})||requestId!==`stage-${runId}-${payload.stage}-${payload.index}`)fail('one_dream_authorized_stage_mismatch');
  const rows=Object.values(store.state.billing.accounts[oneDreamAllowanceId].attempts);
  if(rows.some(row=>row.runId!==runId||row.status==='unknown')||phase==='before_reservation'&&rows.some(row=>row.status!=='settled'))fail('one_dream_ambiguous_attempt');
  if(phase!=='before_reservation'){const row=own(store.state.billing.accounts[oneDreamAllowanceId].attempts,requestId),expected=phase==='before_dispatch'?'reserved':phase==='publish'?'settled':'dispatched';if(row?.status!==expected)fail('one_dream_stage_reservation_mismatch');}
  const built=buildInlineRequest(payload,{model:terms.allowance.pricing.model,maxOutputTokens:400});
  if(phase!=='before_reservation'){const row=store.state.billing.accounts[oneDreamAllowanceId].attempts[requestId];if(row.fingerprint!==hash({runId,request:built.body,snapshot:payload.snapshot})||row.maxOutputTokens!==400||row.reservedMicroCny!==terms.contract.pricing.fullPerCallReservationMicroCny)fail('one_dream_stage_reservation_mismatch');}
  return record;
}
