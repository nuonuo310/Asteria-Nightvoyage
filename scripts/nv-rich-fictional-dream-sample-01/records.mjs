// Managed publication and the read-only three-run receipt. No generation here.
import {Store} from '../../src/store.js';
import {hash,neutral,own,safeId} from '../../src/contract.js';
import {copy,fail} from '../../src/store.js';
import {richSampleIdentity} from './identity.mjs';
import {normalizeRichSampleCheckpoint,richSampleAllowanceId,richSampleCanonicalSnapshot,richSampleExtractionVersion,richSampleMaxCalls,richSampleNormalizationVersion,richSampleProtocolVersion,richSampleRecordOrigin,richSampleRunCount,richSampleRunIds,richSampleRunRequestIds,richSampleRuntimeVersion,richSampleScenesPerRun,richSampleSessionIds,richSampleSourceHash,richSampleSourceRefs,richSampleTextBasis} from './protocol.mjs';

export const richSampleBatchKey='richDreamSampleBatch';
export const richSampleJournalKey='richDreamSampleJournal';
const statuses=new Set(['present','absent','uncertain']);
const exact=(value,names)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===names.length&&names.every(name=>Object.hasOwn(value,name));
const stamp=value=>Number.isSafeInteger(value)&&value>=0;
const text=value=>typeof value==='string'&&value.isWellFormed()&&value.trim().length>0;
const emptyJournal=()=>({version:1,runs:{}});
function journal(store){
  const value=own(store.state,richSampleJournalKey);
  if(value===undefined)return emptyJournal();
  if(!value||value.version!==1||!value.runs||Array.isArray(value.runs))fail('invalid_rich_sample_journal');
  return copy(value);
}
function envelope(run,id,origin){
  return {schemaVersion:1,id,runId:run.id,materialKind:'fictional',origin,isRealityFact:false,
    sourceRefs:run.snapshot.sources.map(source=>({id:source.id,version:source.version})),derivedFrom:[run.snapshot.id]};
}
function validateWake(wake,scenes){
  if(!wake||!exact(wake,['fragment','associations','residue','fragmentBasis'])||!text(wake.fragment)||
     !Array.isArray(wake.associations)||wake.associations.length>1||
     wake.associations.some(value=>!text(value)||value.length>20000)||
     !Number.isFinite(wake.residue)||wake.residue<0||wake.residue>0.3||
     !exact(wake.fragmentBasis,['kind','sceneIndex'])||wake.fragmentBasis.kind!=='scene_excerpt'||
     !Number.isSafeInteger(wake.fragmentBasis.sceneIndex)||wake.fragmentBasis.sceneIndex<0||
     wake.fragmentBasis.sceneIndex>=scenes.length||!scenes[wake.fragmentBasis.sceneIndex].event.includes(wake.fragment))fail('invalid_rich_sample_wake');
  return wake;
}
function feelingRecord({run,dreamId,feeling,recordedAt,wakeRequestId}){
  const base={schemaVersion:1,id:`rich-feeling-${run.id}`,runId:run.id,dreamId,origin:richSampleRecordOrigin,
    materialKind:'fictional',isRealityFact:false,sourceRefs:run.snapshot.sources.map(source=>({id:source.id,version:source.version})),
    derivedFrom:[dreamId],status:feeling.status,recordedAt,sourceVersion:run.snapshot.version,
    protocolVersion:richSampleProtocolVersion,wakeRequestId,runOrdinal:run.richDreamSampleRunOrdinal};
  return feeling.status==='present'?{...base,text:feeling.text,textBasis:richSampleTextBasis}:base;
}

export function prepareRichSamplePublication(store,input){
  if(!(store instanceof Store))fail('managed_store_required');
  store.assert();
  if(!input||!exact(input,['run','wake','firstFeeling','firstFeelingOmitted','wakeRequestId','recordedAt']))fail('invalid_rich_sample_publication');
  const {run,wake,firstFeeling,firstFeelingOmitted,wakeRequestId,recordedAt}=input;
  if(!run||!safeId(run.id)||own(store.state.runs,run.id)!==run||run.status!=='running'||run.entryId!==undefined||
     !run.snapshot||hash(run.snapshot)!==hash(richSampleCanonicalSnapshot)||
     run.richDreamSampleProtocolVersion!==richSampleProtocolVersion||run.richDreamSampleRuntimeVersion!==richSampleRuntimeVersion||
     run.richDreamSampleNormalizationVersion!==richSampleNormalizationVersion||
     !Number.isSafeInteger(run.richDreamSampleRunOrdinal)||run.richDreamSampleRunOrdinal<1||run.richDreamSampleRunOrdinal>richSampleRunCount||
     !Array.isArray(run.scenes)||run.scenes.length!==richSampleScenesPerRun||!safeId(wakeRequestId)||!stamp(recordedAt)||
     typeof firstFeelingOmitted!=='boolean')fail('invalid_rich_sample_publication');
  validateWake(wake,run.scenes);
  if(firstFeelingOmitted!==(firstFeeling===null))fail('invalid_rich_sample_publication');
  if(!firstFeelingOmitted&&(!firstFeeling||!statuses.has(firstFeeling.status)||
     (firstFeeling.status==='present'?(!exact(firstFeeling,['status','text'])||!text(firstFeeling.text)||[...firstFeeling.text].length>240):!exact(firstFeeling,['status']))))fail('invalid_rich_sample_publication');
  const current=journal(store),dreamId=`rich-dream-${run.id}`;
  if(own(store.state.entries,dreamId)!==undefined||own(current.runs,run.id)!==undefined)fail('rich_sample_already_published');
  const next=copy(current);
  const dreamEntry={...envelope(run,dreamId,'dream'),scenes:copy(run.scenes),
    wake:{...envelope(run,`rich-wake-${run.id}`,'rich_wake_note'),...copy(wake),protocolVersion:richSampleProtocolVersion},
    residue:{...envelope(run,`rich-residue-${run.id}`,'simulated_affect'),strength:wake.residue,startedAt:recordedAt,durationMs:3600000},
    protocolVersion:richSampleProtocolVersion,runOrdinal:run.richDreamSampleRunOrdinal};
  let feelingEntry=null;
  if(firstFeelingOmitted)next.runs[run.id]={dreamId,wakeRequestId,firstFeelingId:null,firstFeelingStatus:'omitted',runOrdinal:run.richDreamSampleRunOrdinal};
  else{
    feelingEntry=feelingRecord({run,dreamId,feeling:firstFeeling,recordedAt,wakeRequestId});
    next.runs[run.id]={dreamId,wakeRequestId,firstFeelingId:feelingEntry.id,firstFeelingStatus:firstFeeling.status,runOrdinal:run.richDreamSampleRunOrdinal};
  }
  return {dreamId,dreamEntry,feelingEntry,journal:next};
}

function validateRunIdentity(run,identity){
  if(!run||run.richDreamSampleProtocolVersion!==richSampleProtocolVersion||
     run.richDreamSampleRuntimeVersion!==richSampleRuntimeVersion||
     run.richDreamSampleNormalizationVersion!==richSampleNormalizationVersion||
     run.richDreamSampleIdentityHash!==identity.identityHash||
     run.richDreamSamplePromptHash!==identity.promptHash||
     run.richDreamSampleSourceHash!==richSampleSourceHash||
     run.richDreamSampleAllowanceId!==richSampleAllowanceId||
     !Number.isSafeInteger(run.richDreamSampleRunOrdinal)||run.richDreamSampleRunOrdinal<1||run.richDreamSampleRunOrdinal>richSampleRunCount||
     hash(run.snapshot)!==hash(richSampleCanonicalSnapshot))fail('rich_sample_run_identity_mismatch');
  let before=neutral();
  for(const scene of run.scenes??[]){const value=normalizeRichSampleCheckpoint(scene,before);before=value.after;}
}
function billingRows(store,runId){
  const account=own(own(store.state,'richDreamSampleBilling')?.accounts??{},richSampleAllowanceId);
  if(!account)return [];
  return Object.values(account.attempts).filter(row=>row.runId===runId).map(row=>copy(row));
}
function orderedBillingRows(rows,attempts){
  const byRequest=new Map(rows.map(row=>[row.requestId,row]));
  return attempts.map((attempt,index)=>{
    const row=byRequest.get(attempt.billingRequestId);
    if(!row)return {call:index+1,stage:attempt.stage,index:attempt.index,requestId:attempt.billingRequestId,status:'missing'};
    return {call:index+1,stage:attempt.stage,index:attempt.index,requestId:row.requestId,status:row.status,
      usage:row.usage?copy(row.usage):null,chargedMicroCny:row.chargedMicroCny,reservedMicroCny:row.reservedMicroCny,
      sourceRefs:copy(row.sourceRefs)};
  });
}

function extractCompletedRun(store,run,identity,now){
  const current=journal(store),mapping=own(current.runs,run.id);
  if(!mapping||!exact(mapping,['dreamId','wakeRequestId','firstFeelingId','firstFeelingStatus','runOrdinal'])||
     mapping.runOrdinal!==run.richDreamSampleRunOrdinal||!safeId(mapping.dreamId)||!safeId(mapping.wakeRequestId)||
     !(mapping.firstFeelingStatus==='omitted'?mapping.firstFeelingId===null:
       statuses.has(mapping.firstFeelingStatus)&&safeId(mapping.firstFeelingId)))fail('invalid_rich_sample_journal');
  const dream=own(store.state.entries,mapping.dreamId);
  if(!dream||dream.id!==mapping.dreamId||dream.runId!==run.id||dream.origin!=='dream'||
     dream.materialKind!=='fictional'||dream.isRealityFact!==false||
     !Array.isArray(dream.sourceRefs)||hash(dream.sourceRefs)!==hash(richSampleSourceRefs)||
     !Array.isArray(dream.derivedFrom)||dream.derivedFrom.length!==1||dream.derivedFrom[0]!==richSampleCanonicalSnapshot.id||
     dream.protocolVersion!==richSampleProtocolVersion||dream.runOrdinal!==run.richDreamSampleRunOrdinal||
     !Array.isArray(dream.scenes)||dream.scenes.length!==richSampleScenesPerRun||
     hash(dream.scenes)!==hash(run.scenes))fail('rich_sample_dream_unavailable');
  const wake=dream.wake;
  if(!wake||wake.protocolVersion!==richSampleProtocolVersion||wake.id!==`rich-wake-${run.id}`||
     wake.runId!==run.id||wake.origin!=='rich_wake_note'||wake.materialKind!=='fictional'||wake.isRealityFact!==false||
     hash(wake.sourceRefs)!==hash(dream.sourceRefs)||!Array.isArray(wake.associations))fail('invalid_rich_sample_wake');
  validateWake({fragment:wake.fragment,associations:wake.associations,residue:wake.residue,fragmentBasis:wake.fragmentBasis},dream.scenes);
  const residue=dream.residue;
  if(!residue||residue.id!==`rich-residue-${run.id}`||residue.runId!==run.id||residue.origin!=='simulated_affect'||
     residue.materialKind!=='fictional'||residue.isRealityFact!==false||
     !Array.isArray(residue.sourceRefs)||hash(residue.sourceRefs)!==hash(dream.sourceRefs)||
     residue.strength!==wake.residue||!stamp(residue.startedAt)||residue.durationMs!==3600000)fail('invalid_rich_sample_residue');
  const feelingEntries=Object.values(store.state.entries).filter(entry=>entry?.origin===richSampleRecordOrigin&&entry.dreamId===dream.id);
  if(feelingEntries.length!==(mapping.firstFeelingStatus==='omitted'?0:1))fail('invalid_rich_sample_feeling_record');
  let firstFeeling={status:mapping.firstFeelingStatus};
  if(mapping.firstFeelingStatus!=='omitted'){
    const feeling=own(store.state.entries,mapping.firstFeelingId);
    if(!feeling||feeling.id!==mapping.firstFeelingId||feeling.dreamId!==dream.id||feeling.runId!==run.id||
       feeling.status!==mapping.firstFeelingStatus||!statuses.has(feeling.status)||feeling.protocolVersion!==richSampleProtocolVersion||
       feeling.materialKind!=='fictional'||feeling.isRealityFact!==false||hash(feeling.sourceRefs)!==hash(dream.sourceRefs)||
       (feeling.status==='present'?(!text(feeling.text)||feeling.textBasis!==richSampleTextBasis):Object.hasOwn(feeling,'text')))fail('invalid_rich_sample_feeling_record');
    firstFeeling={status:feeling.status,...(feeling.status==='present'?{text:feeling.text,textBasis:feeling.textBasis}:{})};
  }
  const later=Object.values(store.state.entries).filter(entry=>entry?.origin==='recollection'&&Array.isArray(entry.derivedFrom)&&entry.derivedFrom[0]===dream.id);
  if(later.length)fail('rich_sample_later_recollection_not_empty');
  const rows=billingRows(store,run.id),attempts=run.attempts??[];
  if(rows.length!==4||attempts.length!==4||rows.some(row=>row.status!=='settled')||
     attempts.some((attempt,index)=>attempt.state!=='committed'||attempt.stage!==(index<3?'scene':'wake')||attempt.index!==index))fail('rich_sample_billing_prefix_incomplete');
  const nowDecay=Math.max(0,1-Math.max(0,now-residue.startedAt)/residue.durationMs);
  return {
    ordinal:run.richDreamSampleRunOrdinal,id:run.id,status:run.status,dreamId:dream.id,
    scenes:dream.scenes.map((scene,index)=>({index,event:scene.event,appraisal:copy(scene.appraisal),before:copy(scene.before),
      delta:copy(scene.delta),after:copy(scene.after),evidence:copy(scene.appraisalBasis?.evidence),protocolVersion:scene.appraisalBasis?.protocolVersion})),
    wake:{fragment:wake.fragment,fragmentBasis:copy(wake.fragmentBasis),associations:copy(wake.associations),
      residue:{label:'simulated_estimate',baseStrength:residue.strength,currentStrength:residue.strength*nowDecay,startedAt:residue.startedAt,durationMs:residue.durationMs}},
    firstFeeling,
    billing:{calls:4,rows:orderedBillingRows(rows,attempts)}
  };
}

export function extractRichSampleReceipt(store,{now=Date.now()}={}){
  if(!(store instanceof Store))fail('managed_store_required');store.assert();
  if(!Number.isFinite(now))fail('invalid_rich_sample_clock');
  const identity=richSampleIdentity(),batch=own(store.state,richSampleBatchKey);
  if(!batch||!exact(batch,['version','runIds','requestIds','sessionIds','startedAt'])||batch.version!==1||
     !Array.isArray(batch.runIds)||!Array.isArray(batch.requestIds)||!Array.isArray(batch.sessionIds)||
     hash(batch.runIds)!==hash([...richSampleRunIds])||hash(batch.requestIds)!==hash([...richSampleRunRequestIds])||
     hash(batch.sessionIds)!==hash([...richSampleSessionIds])||!stamp(batch.startedAt))fail('invalid_rich_sample_batch');
  if(own(store.state,'richDreamSampleVersion')!==richSampleRuntimeVersion)fail('rich_sample_runtime_identity_mismatch');
  const runs=[];
  for(const [index,runId] of batch.runIds.entries()){
    const run=own(store.state.runs,runId);
    if(!run||run.richDreamSampleRunOrdinal!==index+1||
       run.richDreamSampleRequestId!==batch.requestIds[index]||
       run.richDreamSampleSessionId!==batch.sessionIds[index])fail('rich_sample_run_identity_mismatch');
    validateRunIdentity(run,identity);
    const rows=billingRows(store,run.id),ordered=orderedBillingRows(rows,run.attempts??[]);
    runs.push(run.status==='completed'?extractCompletedRun(store,run,identity,now):{
      ordinal:index+1,id:run.id,status:run.status,error:run.error??null,scenesSaved:run.scenes?.length??0,
      billing:{calls:rows.length,rows:ordered}
    });
  }
  const completedRuns=runs.filter(run=>run.status==='completed').length;
  return {
    schemaVersion:1,extractionVersion:richSampleExtractionVersion,
    status:completedRuns===richSampleRunCount?'READY_FOR_MANUAL_REVIEW':'PARTIAL_FAILED_FOR_MANUAL_REVIEW',
    completedRuns,requestedRuns:richSampleRunCount,
    identity:copy(identity),
    input:{snapshotId:richSampleCanonicalSnapshot.id,version:richSampleCanonicalSnapshot.version,materialKind:'fictional',isRealityFact:false,
      sourceRefs:copy(richSampleSourceRefs),source:{id:richSampleSourceRefs[0].id,version:richSampleSourceRefs[0].version,sha256:richSampleSourceHash}},
    runs,
    boundaries:{modelNamesInReadingSurface:false,laterRecollectionsEmpty:true,qualityAssessed:false,semanticSupport:'not_assessed'}
  };
}
