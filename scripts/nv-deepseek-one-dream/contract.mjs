// New, expiring, one-use contract. It never extends or rewrites the 2026-10-17 grant.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {Store, copy, fail} from '../../src/store.js';
import {hash, snapshot} from '../../src/contract.js';
import {maximumCost} from '../../src/budget-ledger.js';
import {inlineIdentity} from '../../src/inline-evidence-protocol.js';
import {readInlinePaidContract} from '../../src/inline-paid-contract.js';
import {inlineEntryInventory} from '../../src/inline-entry-preflight.js';
import {assertAppraisalReviewJsonData} from '../../src/appraisal-review-memory.js';
import {digestText, oneDreamGraphEntry, oneDreamGraphPath, readSafeJson, readSafeText} from './source.mjs';

const root=fileURLToPath(new URL('../..',import.meta.url));
export const oneDreamContractPath='docs/proposals/deepseek-one-dream-20261025.json';
export const oneDreamContractId='nv-deepseek-one-dream-fresh-admission-20261025';
export const oneDreamCaseId='fictional-night-station-20261025';
export const oneDreamFixturePath='examples/deepseek-one-dream-20261025.json';
export const oneDreamProviderModel='deepseek-flash';
export const oneDreamObservedRevision='DeepSeek-V4.1-Flash-1017';
export const oneDreamContextTokenLimit=1048576;
export const oneDreamCheckedAt=Date.parse('2026-10-24T16:45:00Z');
export const oneDreamExpiresAt=Date.parse('2026-10-25T16:45:00Z');
export const oneDreamMaximumMicroCny=3000000n;
const legacyClock=Date.parse('2026-10-17T15:00:00Z');
const ordered=value=>value===null||typeof value!=='object'?value:Array.isArray(value)?value.map(ordered):Object.fromEntries(Object.keys(value).sort().map(key=>[key,ordered(value[key])]));
export const canonicalJson=value=>JSON.stringify(ordered(value));
export const contractDigest=value=>digestText(canonicalJson(value));
function safeContract(value){try{assertAppraisalReviewJsonData(value);return value;}catch{fail('one_dream_contract_mismatch');}}
function readShippedContract(repositoryRoot=root){try{return safeContract(readSafeJson(repositoryRoot,oneDreamContractPath));}catch{fail('one_dream_contract_unavailable');}}
export function oneDreamCodeFiles(repositoryRoot=root){
  const base=path.resolve(repositoryRoot),directory=path.join(base,'scripts','nv-deepseek-one-dream'),files={};
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
  walk('scripts/nv-deepseek-one-dream');
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
export function draftOneDreamContract({repositoryRoot=root}={}){
  const base=path.resolve(repositoryRoot),fixture=fixtureData(base),codeFiles=oneDreamCodeFiles(base),graphFileHash=digestText(readSafeText(base,oneDreamGraphPath)),legacy=legacyEvidence(base);
  const provider={name:'DeepSeek',endpoint:'https://api.deepseek.com/chat/completions',model:oneDreamProviderModel,observedRevision:oneDreamObservedRevision,aliasRevisionPinned:false,actualModelsRequestMade:false};
  const pricing={currency:'CNY',checkedAt:oneDreamCheckedAt,expiresAt:oneDreamExpiresAt,rateBasis:'peak_cache_miss_upper_bound',inputMicroCnyPerMillion:2000000,outputMicroCnyPerMillion:8000000,contextTokenLimit:oneDreamContextTokenLimit,fullPerCallReservationMicroCny:maximumCost({...provider,contextTokenLimit:oneDreamContextTokenLimit,inputMicroCnyPerMillion:2000000,outputMicroCnyPerMillion:8000000},400).toString(),actualAccountCurrencyVerified:false,automaticRenewal:false,references:['https://api-docs.deepseek.com/zh-cn/quick_start/pricing/','https://api-docs.deepseek.com/api/list-models/'],observedAt:'2026-10-24T16:44:46Z'};
  return {
    schemaVersion:1,kind:'fresh_one_use_deepseek_one_dream_contract',id:oneDreamContractId,
    authority:{constructionPath:'docs/construction-envelopes/2026-10-24-deepseek-one-dream-v1.md',baseCommit:'dfe56712ebe2384b3f385a4867f8a4e08b5aedfa',pullRequest:89},
    protocolVersion:'inline-evidence-quotes-v1',protocolIdentity:inlineIdentity(),
    provider,
    material:{caseId:oneDreamCaseId,fixturePath:oneDreamFixturePath,fixtureHash:hash(fixture.input),fixtureFileHash:fixture.fileHash,materialKind:'fictional',generatedEventOrigin:'dream',isRealityFact:false,sourceRefs:fixture.input.sources.map(source=>({id:source.id,version:source.version})),privateMaterialAllowed:false},
    source:{kind:'independent_one_dream_surface',entry:oneDreamGraphEntry,graphPath:oneDreamGraphPath,graphHash:graphFileHash,codeFiles,codeHash:hash(codeFiles),protocolIdentity:inlineIdentity(),...legacy},
    pricing,
    limits:{additionalBudgetMicroCny:oneDreamMaximumMicroCny.toString(),maxRuns:1,maxCalls:3,scenes:2,wakeCalls:1,perCallOutputTokens:400,requestBytes:65536,responseJsonBytes:1200},
    history:{requiredLegacyAccounts:4,legacyUnknownHolds:4,legacyHeldMicroCny:'8812800',providerChargeKnown:false,preserveEveryOldAccount:true,releaseOrSettlementAuthorized:false,captureBaseline:'under_owner_before_new_account',reopenPolicy:'compare_persisted_baseline_never_recapture',separateAllowanceId:'nv-deepseek-one-dream-20261025',separateAuthorizationField:'nvDeepSeekOneDreamAuthorization'},
    control:{automaticRetry:false,repairCalls:false,continuesPriorRun:false,resume:'explicit_settled_committed_prefix_only',cancel:'suppress_late_body_and_keep_ambiguous_full_hold',sourceWithdrawal:'block_and_purge_managed_bodies',originalDream:'immutable_separate_from_wake_recollection_and_continuation'},
    credential:{channel:'one_shot_parent_to_child_private_pipe',readOnlyAfter:['exact_contract_confirmation','source_and_loader_checks','owner_locked_history_and_budget','next_request_bytes'],inheritedEnvironment:false,persist:false,log:false,replayRequiresKey:false},
    delivery:{readerPath:'scripts/dreambook-view-html.mjs',readerRequiresProviderLabel:false,internalReceiptsMayNameProvider:true,mustPreserveOriginalAndWakeTypes:true},
    blockers:['fresh_explicit_contract_approval_required','user_account_currency_confirmation_required','provider_usage_and_bill_remain_unknown'],
    paidEvaluationApproved:false,fictionalEgressApproved:false,liveEntryAvailable:true,implementationReady:true,qualityAssessed:false,semanticSupport:'not_assessed'
  };
}
export function validateOneDreamContract(value,{repositoryRoot=root,now=Date.now(),allowExpired=false}={}){
  safeContract(value);
  let expected,shipped;try{expected=draftOneDreamContract({repositoryRoot});shipped=readShippedContract(repositoryRoot);}catch{fail('one_dream_contract_unavailable');}
  if(canonicalJson(value)!==canonicalJson(expected)||canonicalJson(value)!==canonicalJson(shipped))fail('one_dream_contract_mismatch');
  if(!Number.isSafeInteger(now)||now<expected.pricing.checkedAt)fail('one_dream_contract_clock_invalid');
  if(now>=expected.pricing.expiresAt&&!allowExpired)fail('one_dream_contract_expired');
  const priced={...expected.pricing,model:expected.provider.model};
  if(maximumCost(priced,400).toString()!==expected.pricing.fullPerCallReservationMicroCny)fail('one_dream_contract_reservation_mismatch');
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
