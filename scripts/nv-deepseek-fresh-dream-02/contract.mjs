// New, expiring, one-use contract. It never extends or rewrites the 2026-10-17 grant.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {Store, copy, fail} from '../../src/store.js';
import {hash, snapshot} from '../../src/contract.js';
import {inlineIdentity} from '../../src/inline-evidence-protocol.js';
import {readInlinePaidContract} from '../../src/inline-paid-contract.js';
import {inlineEntryInventory} from '../../src/inline-entry-preflight.js';
import {assertAppraisalReviewJsonData} from '../../src/appraisal-review-memory.js';
import {digestText, oneDreamGraphEntry, oneDreamGraphPath, readSafeJson, readSafeText} from './source.mjs';
import {freshDreamMaximumCost} from './ledger.mjs';
import {freshDreamInputTokenBound} from './policy.mjs';

const root=fileURLToPath(new URL('../..',import.meta.url));
export const oneDreamContractPath='docs/proposals/deepseek-fresh-dream-02-20261025.json';
export const oneDreamContractId='nv-deepseek-fresh-dream-02-fresh-admission-20261025';
export const oneDreamCaseId='fictional-glass-orchard-20261025';
export const oneDreamFixturePath='examples/deepseek-fresh-dream-02-20261025.json';
export const oneDreamProviderModel='deepseek-flash';
export const oneDreamObservedRevision='DeepSeek-V4.1-Flash-1017';
export const oneDreamContextTokenLimit=1048576;
export const oneDreamCheckedAt=Date.parse('2026-10-25T13:10:19Z');
export const oneDreamExpiresAt=Date.parse('2026-10-26T13:10:19Z');
export const oneDreamMaximumMicroCny=3000000n;
export const oneDreamLegacyUnknownHoldGroups=Object.freeze([
  Object.freeze({kind:'four_earlier_independent_unknowns',accounts:4,holds:4,eachReservedMicroCny:'2203200',eachChargedMicroCny:'2203200',reservedMicroCny:'8812800',chargedMicroCny:'8812800',heldMicroCny:'8812800',releaseOrSettlementAuthorized:false}),
  Object.freeze({kind:'later_one_dream_unknown',accounts:1,holds:1,eachReservedMicroCny:'2100352',eachChargedMicroCny:'2100352',reservedMicroCny:'2100352',chargedMicroCny:'2100352',heldMicroCny:'2100352',releaseOrSettlementAuthorized:false})
]);
const legacyClock=Date.parse('2026-10-17T15:00:00Z');
const ordered=value=>value===null||typeof value!=='object'?value:Array.isArray(value)?value.map(ordered):Object.fromEntries(Object.keys(value).sort().map(key=>[key,ordered(value[key])]));
export const canonicalJson=value=>JSON.stringify(ordered(value));
export const contractDigest=value=>digestText(canonicalJson(value));
function safeContract(value){try{assertAppraisalReviewJsonData(value);return value;}catch{fail('one_dream_contract_mismatch');}}
function readShippedContract(repositoryRoot=root){try{return safeContract(readSafeJson(repositoryRoot,oneDreamContractPath));}catch{fail('one_dream_contract_unavailable');}}
export function oneDreamCodeFiles(repositoryRoot=root){
  const base=path.resolve(repositoryRoot),directory=path.join(base,'scripts','nv-deepseek-fresh-dream-02'),files={};
  const walk=relative=>{
    for(const entry of fs.readdirSync(path.join(base,relative),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en'))){
      const next=relative+'/'+entry.name;
      if(entry.isSymbolicLink())fail('one_dream_contract_source_unsafe');
      if(entry.isDirectory())walk(next);
      else if(entry.isFile()&&(/\.mjs$/.test(entry.name)||next===oneDreamGraphPath))files[next]=digestText(readSafeText(base,next));
      else if(!entry.isFile())fail('one_dream_contract_source_unsafe');
    }
  };
  if(!fs.statSync(directory).isDirectory())fail('one_dream_contract_source_unsafe');
  walk('scripts/nv-deepseek-fresh-dream-02');
  return Object.fromEntries(Object.entries(files).sort(([a],[b])=>a.localeCompare(b,'en')));
}
function fixtureData(repositoryRoot=root){
  const file=readSafeText(repositoryRoot,oneDreamFixturePath),input=snapshot(JSON.parse(file));
  if(input.id!==oneDreamCaseId||input.materialKind!=='fictional'||!input.sources.length||input.sources.some(source=>source.grant.modelEgress!==false))fail('one_dream_fixture_mismatch');
  return {input,fileHash:digestText(file)};
}
function legacyEvidence(repositoryRoot=root){
  const base=path.resolve(repositoryRoot);
  let old;try{old=readInlinePaidContract({repositoryRoot:base,now:legacyClock,allowExpired:true});}catch{fail('one_dream_legacy_boundary_unavailable');}
  const inventory=inlineEntryInventory(base),inventoryHash=hash(inventory);
  if(old.contract.source.inventoryHash!==inventoryHash)fail('one_dream_legacy_source_changed');
  return {legacyContractPath:'docs/proposals/inline-paid-entry-windows-20261017.json',legacyContractHash:old.contractHash,legacyInventoryHash:inventoryHash,legacyExpiresAt:old.contract.pricing.expiresAt,legacyReusable:false,oldSourceAdmissionChanged:false};
}
function priorOneDreamEvidence(repositoryRoot=root){
  const base=path.resolve(repositoryRoot),contractPath='docs/proposals/deepseek-one-dream-20261025.json',graphPath='scripts/nv-deepseek-one-dream/runtime-graph.json';
  const prior=readSafeJson(base,contractPath);
  if(prior.id!=='nv-deepseek-one-dream-fresh-admission-20261025'||prior.source?.graphPath!==graphPath)fail('one_dream_prior_contract_changed');
  return {priorOneDreamContractPath:contractPath,priorOneDreamContractFileHash:digestText(readSafeText(base,contractPath)),priorOneDreamContractHash:contractDigest(prior),priorOneDreamGraphPath:graphPath,priorOneDreamGraphHash:prior.source.graphHash,priorOneDreamCodeHash:prior.source.codeHash,priorOneDreamExpiresAt:prior.pricing.expiresAt,priorOneDreamReusable:false,priorOneDreamUnknownHoldMicroCny:'2100352'};
}
export function draftOneDreamContract({repositoryRoot=root}={}){
  const base=path.resolve(repositoryRoot),fixture=fixtureData(base),codeFiles=oneDreamCodeFiles(base),graphFileHash=digestText(readSafeText(base,oneDreamGraphPath)),legacy=legacyEvidence(base),prior=priorOneDreamEvidence(base);
  const unknownHoldGroups=copy(oneDreamLegacyUnknownHoldGroups),unknownHolds=unknownHoldGroups.reduce((sum,group)=>sum+group.holds,0),unknownAccounts=unknownHoldGroups.reduce((sum,group)=>sum+group.accounts,0),unknownReservedMicroCny=unknownHoldGroups.reduce((sum,group)=>sum+BigInt(group.reservedMicroCny),0n),unknownChargedMicroCny=unknownHoldGroups.reduce((sum,group)=>sum+BigInt(group.chargedMicroCny),0n);
  if(unknownHolds!==5||unknownAccounts!==5||unknownReservedMicroCny!==10913152n||unknownChargedMicroCny!==10913152n||unknownHoldGroups.some(group=>BigInt(group.eachReservedMicroCny)*BigInt(group.holds)!==BigInt(group.reservedMicroCny)||BigInt(group.eachChargedMicroCny)*BigInt(group.holds)!==BigInt(group.chargedMicroCny)||BigInt(group.chargedMicroCny)!==BigInt(group.heldMicroCny)))fail('one_dream_reviewed_history_invalid');
  const provider={name:'DeepSeek',endpoint:'https://api.deepseek.com/chat/completions',model:oneDreamProviderModel,observedRevision:oneDreamObservedRevision,aliasRevisionPinned:false,actualModelsRequestMade:false};
  const priced={model:oneDreamProviderModel,contextTokenLimit:oneDreamContextTokenLimit,inputTokenBound:freshDreamInputTokenBound,inputMicroCnyPerMillion:2000000,outputMicroCnyPerMillion:8000000};
  const fullPerCall=freshDreamMaximumCost(priced,400),aggregateWorstCase=fullPerCall*3n;
  if(aggregateWorstCase>oneDreamMaximumMicroCny)fail('one_dream_three_hold_budget_exceeded');
  const pricing={currency:'CNY',checkedAt:oneDreamCheckedAt,expiresAt:oneDreamExpiresAt,rateBasis:'peak_cache_miss_upper_bound',inputMicroCnyPerMillion:2000000,outputMicroCnyPerMillion:8000000,contextTokenLimit:oneDreamContextTokenLimit,inputTokenBound:freshDreamInputTokenBound,inputTokenBoundBasis:'the 65,536-byte request cap is a conservative local input-token upper bound; tokenization cannot consume less than one UTF-8 byte per token',fullPerCallReservationMicroCny:fullPerCall.toString(),aggregateThreeCallReservationMicroCny:aggregateWorstCase.toString(),aggregateCeilingMicroCny:oneDreamMaximumMicroCny.toString(),worstCaseFitsAggregateCeiling:true,actualAccountCurrencyVerified:false,automaticRenewal:false,references:['https://api-docs.deepseek.com/zh-cn/quick_start/pricing/','https://api-docs.deepseek.com/api/list-models/'],observedAt:'2026-10-25T13:10:18.942Z',observedFrom:'2026-10-25T13:10:17.715Z',observedTo:'2026-10-25T13:10:18.942Z',publicDocsRecheck:{pricingStatus:200,pricingBytes:26182,pricingSha256:'556097caba8adfeeed6455714bffd731c7f60db520fcee06a922eba5840663a3',revisionMatched:true,ratesMatched:true,contextMatched:true,modelsApiRequestMade:false,providerRequestMade:false},uncertainty:{providerUsageAndBillUnknown:true,noServerSideOutputCap:true,localTokenBoundOnly:true,mutableModelAlias:true,priceSnapshotIsNotFutureRateLock:true}};
  return {
    schemaVersion:1,kind:'fresh_one_use_deepseek_one_dream_contract',id:oneDreamContractId,
    authority:{constructionPath:'docs/construction-envelopes/2026-10-25-deepseek-fresh-dream-02.md',authorityCommit:'249d38ab6eb65aeab3207771062b0e51b962bd4d',implementationBase:'e927b882b07c93285a6a88b2b8c4524db1474af0',stackedAbove:'a94d0909162ce9d544c5d1338cb9096cd97b17e1',pullRequest:92},
    protocolVersion:'inline-evidence-quotes-v1',protocolIdentity:inlineIdentity(),
    provider,
    material:{caseId:oneDreamCaseId,fixturePath:oneDreamFixturePath,fixtureHash:hash(fixture.input),fixtureFileHash:fixture.fileHash,materialKind:'fictional',generatedEventOrigin:'dream',isRealityFact:false,sourceRefs:fixture.input.sources.map(source=>({id:source.id,version:source.version})),privateMaterialAllowed:false},
    source:{kind:'independent_fresh_dream_02_surface',entry:oneDreamGraphEntry,graphPath:oneDreamGraphPath,graphHash:graphFileHash,codeFiles,codeHash:hash(codeFiles),protocolIdentity:inlineIdentity(),...legacy,...prior},
    pricing,
    limits:{additionalBudgetMicroCny:oneDreamMaximumMicroCny.toString(),maxRuns:1,maxCalls:3,scenes:2,wakeCalls:1,perCallOutputTokens:400,requestBytes:65536,localInputTokenBound:freshDreamInputTokenBound,responseJsonBytes:1200,aggregateWorstCaseMicroCny:aggregateWorstCase.toString(),worstCaseFitsAggregateCeiling:true},
    history:{requiredLegacyAccounts:unknownAccounts,legacyUnknownHolds:unknownHolds,legacyReservedMicroCny:unknownReservedMicroCny.toString(),legacyHeldMicroCny:unknownChargedMicroCny.toString(),publicRowIdentitiesDisclosed:false,initialVerification:'owner_locked_local_group_counts_and_amounts',privateBaselineSchemaVersion:2,privateBaselineScope:'all_legacy_account_hashes_plus_full_unknown_row_identities_in_local_authorization_only',providerChargeKnown:false,preserveEveryOldAccount:true,preserveEachOriginalIdentity:true,releaseOrSettlementAuthorized:false,captureBaseline:'under_owner_before_new_account',reopenPolicy:'strict_compare_persisted_full_private_baseline_never_recapture',separateAllowanceId:'nv-deepseek-fresh-dream-02-20261025',separateAuthorizationField:'nvDeepSeekFreshDream02Authorization',unknownHoldGroups},
    control:{automaticRetry:false,repairCalls:false,continuesPriorRun:false,resume:'explicit_settled_committed_prefix_only',cancel:'suppress_late_body_and_keep_ambiguous_full_hold',sourceWithdrawal:'block_and_purge_managed_bodies',originalDream:'immutable_separate_from_wake_recollection_and_continuation'},
    credential:{channel:'one_shot_parent_to_child_private_pipe',readOnlyAfter:['exact_contract_confirmation','source_and_loader_checks','owner_locked_history_and_budget','next_request_bytes'],inheritedEnvironment:false,persist:false,log:false,replayRequiresKey:false},
    delivery:{readerPath:'scripts/dreambook-view-html.mjs',readerRequiresProviderLabel:false,internalReceiptsMayNameProvider:true,mustPreserveOriginalAndWakeTypes:true},
    blockers:['fresh_explicit_contract_approval_required','user_account_currency_confirmation_required','provider_usage_and_bill_remain_unknown','mutable_model_alias_requires_reconfirmation','no_server_side_output_cap_local_bound_only'],
    paidEvaluationApproved:false,fictionalEgressApproved:false,liveEntryAvailable:true,implementationReady:true,qualityAssessed:false,semanticSupport:'not_assessed'
  };
}
export function validateOneDreamContract(value,{repositoryRoot=root,now=Date.now(),allowExpired=false}={}){
  safeContract(value);
  let expected,shipped;try{expected=draftOneDreamContract({repositoryRoot});shipped=readShippedContract(repositoryRoot);}catch{fail('one_dream_contract_unavailable');}
  if(canonicalJson(value)!==canonicalJson(expected)||canonicalJson(value)!==canonicalJson(shipped))fail('one_dream_contract_mismatch');
  if(!Number.isSafeInteger(now)||now<expected.pricing.checkedAt)fail('one_dream_contract_clock_invalid');
  if(now>=expected.pricing.expiresAt&&!allowExpired)fail('one_dream_contract_expired');
  const priced={model:expected.provider.model,contextTokenLimit:expected.pricing.contextTokenLimit,inputTokenBound:expected.pricing.inputTokenBound,inputMicroCnyPerMillion:expected.pricing.inputMicroCnyPerMillion,outputMicroCnyPerMillion:expected.pricing.outputMicroCnyPerMillion};
  const full=freshDreamMaximumCost(priced,400);
  if(full.toString()!==expected.pricing.fullPerCallReservationMicroCny||(full*3n).toString()!==expected.pricing.aggregateThreeCallReservationMicroCny||full*3n>oneDreamMaximumMicroCny)fail('one_dream_contract_reservation_mismatch');
  return {contract:copy(expected),contractHash:contractDigest(expected)};
}
export function readOneDreamContract(options={}){
  try{return validateOneDreamContract(readShippedContract(options.repositoryRoot??root),options);}
  catch(error){const known=['one_dream_contract_mismatch','one_dream_contract_clock_invalid','one_dream_contract_expired','one_dream_contract_reservation_mismatch','one_dream_legacy_boundary_unavailable','one_dream_legacy_source_changed','one_dream_fixture_mismatch'];if(known.includes(error.message))throw error;fail('one_dream_contract_unavailable');}
}
export function oneDreamInput(contract,repositoryRoot=root){
  const fixture=fixtureData(repositoryRoot),input=fixture.input;
  if(hash(input)!==contract.material.fixtureHash||fixture.fileHash!==contract.material.fixtureFileHash||canonicalJson(input.sources.map(source=>({id:source.id,version:source.version})))!==canonicalJson(contract.material.sourceRefs))fail('one_dream_fixture_changed');
  for(const source of input.sources)source.grant.modelEgress=true;
  return input;
}
export function oneDreamFixtureSummary(repositoryRoot=root){
  const fixture=fixtureData(repositoryRoot),contract=draftOneDreamContract({repositoryRoot});
  return {caseId:contract.material.caseId,path:contract.material.fixturePath,fixtureHash:contract.material.fixtureHash,fixtureFileHash:contract.material.fixtureFileHash,sourceRefs:copy(contract.material.sourceRefs),contractHash:contractDigest(contract)};
}
