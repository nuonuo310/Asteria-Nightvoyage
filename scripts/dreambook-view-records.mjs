// Separate validated projection for later narrative records; never mutates the original dream.
import {Store,fail} from '../src/store.js';
import {hash,own,safeId} from '../src/contract.js';
import {readContentReview} from '../src/content-review.js';
import {readModelPortContent as readAggregateModelPortContent} from './aggregate-plan-content-view.mjs';
import {readModelPortContent as readAggregateIntegrationContent} from './offline-aggregate-integration-content-view.mjs';
import {offlineAggregateIntegrationVersion} from './offline-aggregate-integration-port.mjs';
import {readModelPortContent as readPlanTransportAdmissionContent} from './plan-transport-admission-content-view.mjs';
import {planTransportAdmissionHttpVersion} from './plan-transport-admission-http.mjs';
import {readModelPortContent as readAccountedCodexContent} from './accounted-codex-content-view.mjs';
import {accountedStageProtocols} from './codex-dream-http-account.mjs';
import {dreambookCatalog} from './dreambook.mjs';
export function readDreambookView(store,dreamId){
  if(!(store instanceof Store))fail('managed_store_required');
  store.assert();
  if(!safeId(dreamId))fail('invalid_dreambook_entry');
  if(!dreambookCatalog(store).dreams.some(d=>d.id===dreamId))return null;
  const run=store.state.runs[store.state.entries[dreamId].runId];
  const portReader=run.modelSelection?.protocol_version===planTransportAdmissionHttpVersion?readPlanTransportAdmissionContent:run.modelSelection?.protocol_version===offlineAggregateIntegrationVersion?readAggregateIntegrationContent:accountedStageProtocols.includes(run.modelSelection?.protocol_version)?readAccountedCodexContent:readAggregateModelPortContent;
  return run.modelPortVersion==='dream-model-port-v1'?portReader(store,dreamId):readContentReview(store,dreamId);
}
export function readDreambookLaterRecords(store,dreamId){
  if(!(store instanceof Store))fail('managed_store_required');
  store.assert();
  if(!safeId(dreamId))fail('invalid_dreambook_entry');
  const dream=own(store.state.entries,dreamId);
  if(!dream||dream.origin!=='dream'||dream.materialKind!=='fictional'||dream.isRealityFact!==false||!safeId(dream.runId)||!Array.isArray(dream.sourceRefs))fail('dream_not_visible');
  const records=[];
  for(const [id,entry] of Object.entries(store.state.entries)){
    if(!entry||!['recollection','imagined_continuation'].includes(entry.origin))continue;
    if(!Array.isArray(entry.derivedFrom)||entry.derivedFrom.length!==1||entry.derivedFrom[0]!==dreamId)continue;
    if(!safeId(id)||entry.id!==id||entry.runId!==dream.runId||entry.materialKind!==dream.materialKind||entry.isRealityFact!==false||typeof entry.text!=='string'||!entry.text||entry.text.length>20000||hash(entry.sourceRefs)!==hash(dream.sourceRefs))fail('invalid_dreambook_entry');
    records.push({id,origin:entry.origin,materialKind:dream.materialKind,isRealityFact:false,derivedFrom:[dreamId],text:entry.text});
  }
  return records;
}
