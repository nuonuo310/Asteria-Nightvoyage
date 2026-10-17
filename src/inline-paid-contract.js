// Executable contract checks only: no allowance creation, key or live transport.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {Store,copy,fail} from './store.js';
import {hash,snapshot} from './contract.js';
import {maximumCost} from './budget-ledger.js';
import {inlineProtocolVersion,inlineIdentity,buildInlineRequest} from './inline-evidence-protocol.js';
import {inlineEntryInventory,inlineEntryPreflight} from './inline-entry-preflight.js';
import {InlineHistoryGuard} from './inline-entry-admission.js';
import {assertAppraisalReviewJsonData} from './appraisal-review-memory.js';
const root=fileURLToPath(new URL('..',import.meta.url));
export const inlinePaidContractPath='docs/proposals/inline-paid-entry-windows-20261017.json';
export const inlinePaidContractId='inline-evidence-paid-entry-windows-plan-20261017';
const checkedAt=Date.parse('2026-10-17T14:49:00Z'),expiresAt=Date.parse('2026-10-18T14:49:00Z');
const ordered=v=>v===null||typeof v!=='object'?v:Array.isArray(v)?v.map(ordered):Object.fromEntries(Object.keys(v).sort().map(k=>[k,ordered(v[k])]));
const canonical=v=>JSON.stringify(ordered(v));
const digest=value=>createHash('sha256').update(value).digest('hex');
function file(base,relative){
  try{
  const filename=path.join(base,relative);let p=filename;
  for(;;){if(fs.lstatSync(p).isSymbolicLink())fail('paid_contract_unsafe_file');const parent=path.dirname(p);if(parent===p)break;p=parent;}
  const stat=fs.lstatSync(filename);if(!stat.isFile()||stat.size>262144)fail('paid_contract_unsafe_file');const bytes=fs.readFileSync(filename),text=bytes.toString('utf8');if(!Buffer.from(text).equals(bytes))fail('paid_contract_unsafe_file');const value=JSON.parse(text);assertAppraisalReviewJsonData(value);return value;
  }catch{fail('paid_contract_unavailable');}
}
// Explicit draft construction for repository preparation, never an init/renew API.
// The shipped JSON must stay pinned; read/check do not rewrite it on source drift.
export function draftInlinePaidContract({repositoryRoot=root}={}){
  const base=path.resolve(repositoryRoot),inventory=inlineEntryInventory(base),graph=file(base,'src/inline-bootstrap-graph.json'),input=snapshot(file(base,'fixtures/quality/sparse-context.json'));
  if(input.sources.some(s=>s.grant.modelEgress!==false))fail('paid_contract_fixture_egress_changed');
  return {
    schemaVersion:1,kind:'explicit_confirmation_required_inline_paid_entry_contract',id:inlinePaidContractId,
    protocolVersion:inlineProtocolVersion,protocolIdentity:inlineIdentity(),
    provider:{name:'DeepSeek',endpoint:'https://api.deepseek.com/chat/completions',model:'deepseek-flash',observedRevision:'DeepSeek-V4.1-Flash-1017',aliasRevisionPinned:false,actualModelsRequestMade:false},
    material:{caseId:'sparse-context',fixturePath:'fixtures/quality/sparse-context.json',fixtureHash:hash(input),materialKind:'fictional',generatedEventOrigin:'dream',isRealityFact:false,sourceRefs:input.sources.map(s=>({id:s.id,version:s.version})),privateMaterialAllowed:false},
    source:{inventoryHash:hash(inventory),stubGraphHash:hash(graph),paidGraphHash:hash(file(base,'src/inline-paid-graph.json')),paidGraphAvailable:true},
    pricing:{currency:'CNY',checkedAt,expiresAt,rateBasis:'peak_cache_miss_upper_bound',inputMicroCnyPerMillion:2000000,outputMicroCnyPerMillion:8000000,contextTokenLimit:1100000,fullPerCallReservationMicroCny:'2203200',actualAccountCurrencyVerified:false,automaticRenewal:false,references:['https://api-docs.deepseek.com/zh-cn/quick_start/pricing/','https://api-docs.deepseek.com/zh-cn/updates/','https://api-docs.deepseek.com/api/list-models/']},
    limits:{additionalBudgetMicroCny:'3000000',maxRuns:1,maxCalls:3,scenes:2,wakeCalls:1,perCallOutputTokens:400,requestBytes:65536,responseJsonBytes:1200},
    history:{unknownCount:4,heldMicroCny:'8812800',providerChargeKnown:false,preserveEveryOldAccount:true,releaseOrSettlementAuthorized:false,captureBaseline:'under_owner_before_new_account',reopenPolicy:'compare_persisted_baseline_never_recapture'},
    control:{automaticRetry:false,repairCalls:false,continuesPriorRun:false,resume:'explicit_settled_committed_prefix_only',cancel:'suppress_late_body_and_keep_ambiguous_full_hold',sourceWithdrawal:'block_and_purge_managed_bodies',originalDream:'immutable_separate_from_recollection_and_continuation'},
    credential:{channel:'one_shot_parent_to_child_private_pipe',readOnlyAfter:['exact_contract_confirmation','source_and_loader_checks','owner_locked_history_and_budget','next_request_bytes'],inheritedEnvironment:false,persist:false,log:false,replayRequiresKey:false},
    atomicAuthorizationStoreAvailable:true,
    blockers:['explicit_current_contract_confirmation_required','user_account_currency_confirmation_required'],
    paidEvaluationApproved:false,fictionalEgressApproved:false,liveEntryAvailable:true,implementationReady:true,qualityAssessed:false,semanticSupport:'not_assessed'
  };
}
export function validateInlinePaidContract(value,{repositoryRoot=root,now=Date.now(),allowExpired=false}={}){
  try{assertAppraisalReviewJsonData(value);}catch{fail('paid_contract_mismatch');}
  let expected,shipped;try{expected=draftInlinePaidContract({repositoryRoot});shipped=file(path.resolve(repositoryRoot),inlinePaidContractPath);}catch{fail('paid_contract_unavailable');}
  if(inlineEntryPreflight({repositoryRoot}).sourceInventoryMatches!==true)fail('paid_contract_source_changed');
  if(canonical(value?.source)!==canonical(expected.source))fail('paid_contract_source_changed');
  if(canonical(value)!==canonical(expected)||canonical(value)!==canonical(shipped))fail('paid_contract_mismatch');
  if(!Number.isSafeInteger(now)||now<checkedAt)fail('paid_contract_clock_invalid');if(now>=expiresAt&&!allowExpired)fail('paid_contract_expired');
  const pricing={...expected.pricing,model:expected.provider.model};
  if(maximumCost(pricing,400).toString()!==expected.pricing.fullPerCallReservationMicroCny)fail('paid_contract_reservation_mismatch');
  return {contract:copy(expected),contractHash:digest(canonical(expected))};
}
export function readInlinePaidContract(options={}){
  try{return validateInlinePaidContract(file(path.resolve(options.repositoryRoot??root),inlinePaidContractPath),options);}
  catch(error){const known=['paid_contract_mismatch','paid_contract_source_changed','paid_contract_clock_invalid','paid_contract_expired','paid_contract_reservation_mismatch','paid_contract_fixture_egress_changed'];if(known.includes(error.message))throw error;fail('paid_contract_unavailable');}
}
// Lock-local evidence for a future atomic approval. This function writes nothing.
export function inspectInlinePaidAdmission(store,value,options={}){
  if(!(store instanceof Store))fail('managed_store_required');
  // Lock checks belong to the current executing checkout, never a caller-selected copy.
  if(options.repositoryRoot!==undefined)fail('paid_admission_current_checkout_required');
  const checked=validateInlinePaidContract(value,options),baseline=new InlineHistoryGuard(store).capture();
  const input=snapshot(file(root,'fixtures/quality/sparse-context.json'));
  const request=buildInlineRequest({stage:'scene',index:0,snapshot:input,scenes:[]},{model:checked.contract.provider.model,maxOutputTokens:400});
  return {contractHash:checked.contractHash,baseline,firstRequestBytes:Buffer.byteLength(JSON.stringify(request.body)),nextReservationMicroCny:checked.contract.pricing.fullPerCallReservationMicroCny,createsAuthorization:false,createsAccount:false,credentialRead:false,liveEntryAvailable:false};
}
// Shape rehearsal, not a user approval receipt and never a persistent permission.
export function inspectInlinePaidAcknowledgement(value,acknowledgement,options={}){
  const checked=validateInlinePaidContract(value,options);
  try{assertAppraisalReviewJsonData(acknowledgement);}catch{fail('paid_acknowledgement_mismatch');}
  const expected={contractHash:checked.contractHash,budgetCny:3,caseId:'sparse-context',allowFictionalEgress:true,acknowledgePreservedHolds:true,acknowledgeMutableModelAlias:true,accountCurrency:'CNY'};
  if(canonical(acknowledgement)!==canonical(expected))fail('paid_acknowledgement_mismatch');
  return {contractHash:checked.contractHash,shapeMatches:true,createsAuthorization:false,createsAccount:false,credentialRead:false,liveEntryAvailable:false};
}
export function inlinePaidContractPreflight({repositoryRoot=root,historyDirectory,now=Date.now()}={}){
  const common={ready:false,credentialRead:false,realModelRequests:0,liveEntryAvailable:false,paidEvaluationApproved:false,qualityAssessed:false,semanticSupport:'not_assessed'};
  let checked;try{checked=readInlinePaidContract({repositoryRoot,now});}catch(error){return {...common,reason:error.message};}
  const observed=inlineEntryPreflight({repositoryRoot,historyDirectory});
  return {...common,contractHash:checked.contractHash,caseId:'sparse-context',additionalBudgetCny:3,maxRuns:1,maxCalls:3,nextReservationCny:2.2032,blockers:copy(checked.contract.blockers),sourceInventoryMatches:observed.sourceInventoryMatches,requestBytes:observed.requestBytes??null,history:observed.history??{checked:false},historyIsDispatchAdmission:false,reason:observed.history?.checked?'explicit_current_paid_approval_required':observed.reason};
}
