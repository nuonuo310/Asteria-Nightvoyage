// Owner-locked history prerequisite; no account creation, credentials or transport.
import fs from 'node:fs';
import path from 'node:path';
import {Store,fail} from './store.js';
import {hash,own,safeId} from './contract.js';
import {validateAllowance,maximumCost} from './budget-ledger.js';
import {inlineProtocolVersion} from './inline-evidence-protocol.js';
import {inlineEntryPreflight,preservedAccountIds} from './inline-entry-preflight.js';
import {assertAppraisalReviewJsonData} from './appraisal-review-memory.js';
import {readCompactTrial} from './compact-trial-config.js';
import {readSingleSceneConfig} from './single-scene-diagnostic.js';
import {readPrunedV2Trial} from './pruned-v2-trial-config.js';
import {readContinuityTrial} from './continuity-trial-config.js';
const readers=[readCompactTrial,readSingleSceneConfig,readPrunedV2Trial,readContinuityTrial];
export const inlineCandidateAllowanceId='inline-evidence-dream-trial-candidate';
const amount=v=>typeof v==='string'&&/^(0|[1-9][0-9]{0,19})$/.test(v);
function owner(store){
  if(!(store instanceof Store))fail('managed_store_required');store.assert();
  const p=path.join(store.directory,'owner.lock');let fd,saved,stat;
  try{fd=fs.fstatSync(store.lockfd);stat=fs.lstatSync(p);saved=JSON.parse(fs.readFileSync(p,'utf8'));}catch{fail('admission_owner_lock_required');}
  if(!stat.isFile()||stat.isSymbolicLink()||fd.dev!==stat.dev||fd.ino!==stat.ino||saved.pid!==process.pid)fail('admission_owner_lock_required');
  if(inlineEntryPreflight().sourceInventoryMatches!==true)fail('admission_source_changed');
  if(store.withdrawn.includes('q-sparse-memory'))fail('source_withdrawn');
}
function approvals(store){return readers.map((read,i)=>{try{const p=path.join(store.directory,preservedAccountIds[i]+'.json'),s=fs.lstatSync(p);if(!s.isFile()||s.isSymbolicLink()||s.size>262144)fail('unsafe_history_approval');return read(store.directory);}catch(error){if(error.message==='unsafe_history_approval')throw error;fail('invalid_history_approval');}});}
function history(store,configs){
  const billing=store.state.billing;assertAppraisalReviewJsonData(billing);
  if(billing?.version!==1||!billing.accounts||Array.isArray(billing.accounts))fail('admission_history_invalid');
  const bindings=[];
  for(const [id,a]of Object.entries(billing.accounts)){
    if(!a||!a.allowance||hash(validateAllowance(a.allowance))!==hash(a.allowance)||a.fingerprint!==hash(a.allowance)||a.allowance.id!==id||!Array.isArray(a.runIds)||new Set(a.runIds).size!==a.runIds.length||!a.runIds.every(safeId)||!a.attempts||Array.isArray(a.attempts))fail('admission_history_invalid');
    if(id===inlineCandidateAllowanceId){if(a.allowance.mode!=='stub'||a.allowance.protocolVersion!==inlineProtocolVersion)fail('inline_live_entry_pending');continue;}
    const rowRuns=new Set();for(const [key,r]of Object.entries(a.attempts)){
      if(!r||r.requestId!==key||!safeId(key)||!safeId(r.runId)||!/^[a-f0-9]{64}$/.test(r.fingerprint)||!amount(r.chargedMicroCny)||!amount(r.reservedMicroCny)||r.maxOutputTokens!==400||r.reservedMicroCny!==maximumCost(a.allowance.pricing,400).toString()||BigInt(r.chargedMicroCny)>BigInt(r.reservedMicroCny)||!['unknown','settled'].includes(r.status))fail('admission_history_invalid');
      rowRuns.add(r.runId);if(r.status!=='settled'&&!preservedAccountIds.includes(id))fail('unrelated_unsettled_attempt');
    }
    if(hash([...rowRuns].sort())!==hash([...a.runIds].sort())||Object.keys(a.attempts).length>a.allowance.limits.maxCalls||a.runIds.length>a.allowance.limits.maxRuns)fail('admission_history_invalid');
  }
  for(const [i,id]of preservedAccountIds.entries()){
    const a=own(billing.accounts,id),config=configs[i];if(!a||hash(a.allowance)!==hash(config.allowance)||a.runIds.length!==1||Object.keys(a.attempts).length!==1)fail('preserved_history_identity_mismatch');
    const r=Object.values(a.attempts)[0];if(r.status!=='unknown'||r.reservedMicroCny!=='2203200'||r.chargedMicroCny!=='2203200'||hash(r.sourceRefs)!==hash([{id:'q-sparse-memory',version:'1'}]))fail('preserved_history_identity_mismatch');
    if(i===1){const d=own(store.state.protocolDiagnostics??{},id);if(r.runId!==id||r.requestId!==id+'-scene-0'||d?.allowanceId!==id||d.protocolVersion!==config.protocolVersion||!['failed','revoked','deleted'].includes(d.status))fail('preserved_history_binding_mismatch');bindings.push(hash(d));}
    else{const request=own(store.state.requests,id),run=request&&own(store.state.runs,request.runId);if(!run||run.id!==r.runId||run.billingAllowanceId!==id||(run.billingProtocolVersion??run.appraisalProtocolVersion)!==config.protocolVersion||run.appraisalProtocolVersion!==config.protocolVersion||!['failed','revoked','deleted'].includes(run.status)||hash(run.sourceIds)!==hash(['q-sparse-memory'])||(run.scenes?.length??0)!==0||r.requestId!==`stage-${r.runId}-scene-0`)fail('preserved_history_binding_mismatch');bindings.push(hash({request,run}));}
  }
  return {accounts:Object.fromEntries(Object.entries(billing.accounts).filter(([id])=>id!==inlineCandidateAllowanceId).map(([id,a])=>[id,hash(a)])),bindings,configs:configs.map(hash)};
}
export class InlineHistoryGuard {
  #store;#baseline;
  constructor(store){owner(store);this.#store=store;this.#baseline=history(store,approvals(store));}
  assertPreserved(){owner(this.#store);if(hash(history(this.#store,approvals(this.#store)))!==hash(this.#baseline))fail('preserved_history_changed');return {historyPreserved:true,preservedUnknowns:4,heldMicroCny:'8812800',ownerLockChecked:true,liveEntryAvailable:false,dispatchAuthorized:false};}
}
