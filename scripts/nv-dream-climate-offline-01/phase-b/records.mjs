// Managed publication and read-only R1 receipt. There is no generation here.
import {Store} from '../../../src/store.js';
import {hash,neutral,own,safeId} from '../../../src/contract.js';
import {copy,fail} from '../../../src/store.js';
import {
  dreamClimateCanonicalSnapshot,dreamClimateScenesPerRun,
  dreamClimateSourceRefs,normalizeDreamClimateCheckpoint
} from '../protocol.mjs';
import {
  liveExtractionVersion,liveProtocolVersion,liveRunCount,liveRuntimeVersion
} from './config.mjs';
import {verifyLiveIdentity} from './identity.mjs';
import {liveMatrix,liveRunIds,liveRunRequestIds,liveRunSessionIds} from './matrix.mjs';

export const liveBatchKey='dreamClimateLiveBatch';
export const liveJournalKey='dreamClimateLiveJournal';
export const liveFirstFeelingOrigin='dream_climate_live_first_feeling';
const statuses=new Set(['present','absent','uncertain']);
const exact=(value,names)=>value&&typeof value==='object'&&!Array.isArray(value)&&
  Object.keys(value).length===names.length&&names.every(name=>Object.hasOwn(value,name));
const stamp=value=>Number.isSafeInteger(value)&&value>=0;
const text=value=>typeof value==='string'&&value.isWellFormed()&&value.trim().length>0;
const emptyJournal=()=>({version:1,runs:{}});

function journal(store){
  const value=own(store.state,liveJournalKey);
  if(value===undefined)return emptyJournal();
  if(!value||value.version!==1||!value.runs||Array.isArray(value.runs))
    fail('invalid_dream_climate_live_journal');
  return copy(value);
}

function envelope(run,id,origin,derivedFrom=[dreamClimateCanonicalSnapshot.id]){
  return {schemaVersion:1,id,runId:run.id,materialKind:'fictional',origin,isRealityFact:false,
    sourceRefs:run.snapshot.sources.map(source=>({id:source.id,version:source.version})),
    derivedFrom:copy(derivedFrom)};
}

function validateWake(wake,scenes){
  if(!wake||!exact(wake,['fragment','associations','residue','fragmentBasis'])||!text(wake.fragment)||
     !Array.isArray(wake.associations)||wake.associations.length>1||
     wake.associations.some(value=>!text(value)||value.length>20000)||
     !Number.isFinite(wake.residue)||wake.residue<0||wake.residue>.3||
     !exact(wake.fragmentBasis,['kind','sceneIndex'])||wake.fragmentBasis.kind!=='scene_excerpt'||
     !Number.isSafeInteger(wake.fragmentBasis.sceneIndex)||wake.fragmentBasis.sceneIndex<0||
     wake.fragmentBasis.sceneIndex>=scenes.length||!scenes[wake.fragmentBasis.sceneIndex].event.includes(wake.fragment))
    fail('invalid_dream_climate_live_wake');
  return wake;
}

function validateScenes(scenes){
  if(!Array.isArray(scenes)||scenes.length!==dreamClimateScenesPerRun)
    fail('invalid_dream_climate_live_scenes');
  let before=neutral();
  for(const scene of scenes){const value=normalizeDreamClimateCheckpoint(scene,before);before=value.after;}
}

function feelingRecord({run,dreamId,feeling,recordedAt,wakeRequestId}){
  const base={schemaVersion:1,id:`live-feeling-${run.id}`,runId:run.id,dreamId,
    origin:liveFirstFeelingOrigin,materialKind:'fictional',isRealityFact:false,
    sourceRefs:run.snapshot.sources.map(source=>({id:source.id,version:source.version})),
    derivedFrom:[dreamId],status:feeling.status,recordedAt,sourceVersion:run.snapshot.version,
    protocolVersion:liveProtocolVersion,wakeRequestId,runOrdinal:run.ordinal};
  return feeling.status==='present'?{...base,text:feeling.text,
    textBasis:'independent_first_feeling_model_output'}:base;
}

export function prepareLivePublication(store,input){
  if(!(store instanceof Store))fail('managed_store_required');
  store.assert();
  if(!input||!exact(input,['run','wake','firstFeeling','firstFeelingOmitted','wakeRequestId','recordedAt']))
    fail('invalid_dream_climate_live_publication');
  const {run,wake,firstFeeling,firstFeelingOmitted,wakeRequestId,recordedAt}=input;
  if(!run||!safeId(run.id)||own(store.state.runs,run.id)!==run||run.status!=='running'||
     run.entryId!==undefined||!run.snapshot||hash(run.snapshot)!==hash(dreamClimateCanonicalSnapshot)||
     run.protocolVersion!==liveProtocolVersion||run.runtimeVersion!==liveRuntimeVersion||
     !Number.isSafeInteger(run.ordinal)||run.ordinal<1||run.ordinal>liveRunCount||
     !Array.isArray(run.draftScenes)||run.draftScenes.length!==dreamClimateScenesPerRun||
     !safeId(wakeRequestId)||!stamp(recordedAt)||typeof firstFeelingOmitted!=='boolean')
    fail('invalid_dream_climate_live_publication');
  if(hash(run.sourceRefs)!==hash(dreamClimateSourceRefs))fail('invalid_dream_climate_live_publication');
  validateScenes(run.draftScenes);
  validateWake(wake,run.draftScenes);
  if(firstFeelingOmitted!==(firstFeeling===null))fail('invalid_dream_climate_live_publication');
  if(!firstFeelingOmitted&&(!firstFeeling||!statuses.has(firstFeeling.status)||
     (firstFeeling.status==='present'?(!exact(firstFeeling,['status','text'])||!text(firstFeeling.text)||
       [...firstFeeling.text].length>240):!exact(firstFeeling,['status']))))
    fail('invalid_dream_climate_live_publication');
  const current=journal(store),dreamId=`live-dream-${run.id}`;
  if(own(store.state.entries,dreamId)!==undefined||own(current.runs,run.id)!==undefined)
    fail('dream_climate_live_already_published');
  const next=copy(current);
  const dreamEntry={...envelope(run,dreamId,'dream'),scenes:copy(run.draftScenes),
    wake:{...envelope(run,`live-wake-${run.id}`,'dream_climate_live_wake',[dreamId]),...copy(wake),
      protocolVersion:liveProtocolVersion},
    residue:{...envelope(run,`live-residue-${run.id}`,'simulated_affect',[dreamId]),
      strength:wake.residue,startedAt:recordedAt,durationMs:3600000},
    protocolVersion:liveProtocolVersion,runOrdinal:run.ordinal,
    climate:run.plan.climate,mechanism:run.plan.mechanism,
    foregroundAnchor:run.plan.foregroundAnchor,
    usedForegroundAnchors:copy(run.plan.usedForegroundAnchors),
    usedMechanisms:copy(run.plan.usedMechanisms)};
  let feelingEntry=null;
  if(firstFeelingOmitted){
    next.runs[run.id]={dreamId,wakeRequestId,firstFeelingId:null,
      firstFeelingStatus:'omitted',runOrdinal:run.ordinal};
  }else{
    feelingEntry=feelingRecord({run,dreamId,feeling:firstFeeling,recordedAt,wakeRequestId});
    next.runs[run.id]={dreamId,wakeRequestId,firstFeelingId:feelingEntry.id,
      firstFeelingStatus:firstFeeling.status,runOrdinal:run.ordinal};
  }
  return {dreamId,dreamEntry,feelingEntry,journal:next};
}

function validateRunIdentity(run,identity,index){
  const matrixEntry=liveMatrix[index];
  if(!run||run.ordinal!==index+1||!run.plan||hash(run.plan)!==hash(matrixEntry.plan)||
     run.protocolVersion!==liveProtocolVersion||run.runtimeVersion!==liveRuntimeVersion||
     run.identityHash!==identity.liveIdentityHash||run.matrixHash!==identity.matrixHash||
     run.releaseHash!==identity.releaseHash||run.allowanceId!==identity.allowanceId||
     hash(run.sourceRefs)!==hash(dreamClimateSourceRefs)||
     hash(run.snapshot)!==hash(dreamClimateCanonicalSnapshot))
    fail('dream_climate_live_run_identity_mismatch');
}

function billingRows(store,runId){
  const account=own(own(store.state,'dreamClimateLiveBilling')?.accounts??{},'nv-dream-climate-live-r1-001');
  if(!account)return [];
  return Object.values(account.attempts).filter(row=>row.runId===runId).map(row=>copy(row));
}

function orderedBillingRows(rows,attempts){
  const byRequest=new Map(rows.map(row=>[row.requestId,row]));
  return attempts.map((attempt,index)=>{
    const row=byRequest.get(attempt.billingRequestId);
    if(!row)return {call:index+1,stage:attempt.stage,index:attempt.index,
      requestId:attempt.billingRequestId,status:'missing'};
    return {call:index+1,stage:attempt.stage,index:attempt.index,requestId:row.requestId,
      status:row.status,usage:row.usage?copy(row.usage):null,
      chargedMicroCny:row.chargedMicroCny,reservedMicroCny:row.reservedMicroCny,
      sourceRefs:copy(row.sourceRefs)};
  });
}

function uncommittedBillingRows(rows){
  return rows.map((row,index)=>({call:index+1,requestId:row.requestId,status:row.status,
    usage:row.usage?copy(row.usage):null,chargedMicroCny:row.chargedMicroCny,
    reservedMicroCny:row.reservedMicroCny,sourceRefs:copy(row.sourceRefs)}));
}

function extractCompletedRun(store,run,now){
  const current=journal(store),mapping=own(current.runs,run.id);
  if(!mapping||!exact(mapping,['dreamId','wakeRequestId','firstFeelingId',
    'firstFeelingStatus','runOrdinal'])||mapping.runOrdinal!==run.ordinal||
     !safeId(mapping.dreamId)||!safeId(mapping.wakeRequestId)||
     !(mapping.firstFeelingStatus==='omitted'?mapping.firstFeelingId===null:
       statuses.has(mapping.firstFeelingStatus)&&safeId(mapping.firstFeelingId)))
    fail('invalid_dream_climate_live_journal');
  const dream=own(store.state.entries,mapping.dreamId);
  if(!dream||dream.id!==mapping.dreamId||dream.runId!==run.id||dream.origin!=='dream'||
     dream.materialKind!=='fictional'||dream.isRealityFact!==false||
     hash(dream.sourceRefs)!==hash(dreamClimateSourceRefs)||
     !Array.isArray(dream.derivedFrom)||dream.derivedFrom.length!==1||
     dream.derivedFrom[0]!==dreamClimateCanonicalSnapshot.id||
     dream.protocolVersion!==liveProtocolVersion||dream.runOrdinal!==run.ordinal||
     !Array.isArray(dream.scenes)||dream.scenes.length!==dreamClimateScenesPerRun||
     hash(dream.scenes)!==hash(run.scenes)||dream.climate!==run.plan.climate||
     dream.mechanism!==run.plan.mechanism||dream.foregroundAnchor!==run.plan.foregroundAnchor)
    fail('dream_climate_live_dream_unavailable');
  const wake=dream.wake;
  if(!wake||wake.protocolVersion!==liveProtocolVersion||wake.id!==`live-wake-${run.id}`||
     wake.runId!==run.id||wake.origin!=='dream_climate_live_wake'||
     wake.materialKind!=='fictional'||wake.isRealityFact!==false||
     hash(wake.sourceRefs)!==hash(dream.sourceRefs)||!Array.isArray(wake.associations))
    fail('invalid_dream_climate_live_wake');
  validateWake({fragment:wake.fragment,associations:wake.associations,
    residue:wake.residue,fragmentBasis:wake.fragmentBasis},dream.scenes);
  const residue=dream.residue;
  if(!residue||residue.id!==`live-residue-${run.id}`||residue.runId!==run.id||
     residue.origin!=='simulated_affect'||residue.materialKind!=='fictional'||
     residue.isRealityFact!==false||hash(residue.sourceRefs)!==hash(dream.sourceRefs)||
     residue.strength!==wake.residue||!stamp(residue.startedAt)||residue.durationMs!==3600000)
    fail('invalid_dream_climate_live_residue');
  const feelingEntries=Object.values(store.state.entries)
    .filter(entry=>entry?.origin===liveFirstFeelingOrigin&&entry.dreamId===dream.id);
  if(feelingEntries.length!==(mapping.firstFeelingStatus==='omitted'?0:1))
    fail('invalid_dream_climate_live_feeling_record');
  let firstFeeling={status:mapping.firstFeelingStatus};
  if(mapping.firstFeelingStatus!=='omitted'){
    const feeling=own(store.state.entries,mapping.firstFeelingId);
    if(!feeling||feeling.id!==mapping.firstFeelingId||feeling.dreamId!==dream.id||
       feeling.runId!==run.id||feeling.status!==mapping.firstFeelingStatus||
       !statuses.has(feeling.status)||feeling.protocolVersion!==liveProtocolVersion||
       feeling.materialKind!=='fictional'||feeling.isRealityFact!==false||
       hash(feeling.sourceRefs)!==hash(dream.sourceRefs)||
       (feeling.status==='present'?(!text(feeling.text)||
         feeling.textBasis!=='independent_first_feeling_model_output'):Object.hasOwn(feeling,'text')))
      fail('invalid_dream_climate_live_feeling_record');
    firstFeeling={status:feeling.status,
      ...(feeling.status==='present'?{text:feeling.text,textBasis:feeling.textBasis}:{})};
  }
  const later=Object.values(store.state.entries)
    .filter(entry=>entry?.origin==='recollection'&&Array.isArray(entry.derivedFrom)&&
      entry.derivedFrom[0]===dream.id);
  if(later.length)fail('dream_climate_live_later_recollection_not_empty');
  const rows=billingRows(store,run.id),attempts=run.attempts??[];
  if(rows.length!==4||attempts.length!==4||rows.some(row=>row.status!=='settled')||
     attempts.some((attempt,index)=>attempt.state!=='committed'||
       attempt.stage!==(index<3?'scene':'wake')||attempt.index!==index))
    fail('dream_climate_live_billing_prefix_incomplete');
  const nowDecay=Math.max(0,1-Math.max(0,now-residue.startedAt)/residue.durationMs);
  return {
    ordinal:run.ordinal,id:run.id,status:run.status,dreamId:dream.id,
    climate:run.plan.climate,mechanism:run.plan.mechanism,
    foregroundAnchor:run.plan.foregroundAnchor,
    usedForegroundAnchors:copy(run.plan.usedForegroundAnchors),
    usedMechanisms:copy(run.plan.usedMechanisms),
    scenes:dream.scenes.map((scene,index)=>({index,event:scene.event,
      appraisal:copy(scene.appraisal),before:copy(scene.before),delta:copy(scene.delta),
      after:copy(scene.after),evidence:copy(scene.appraisalBasis?.evidence),
      protocolVersion:scene.appraisalBasis?.protocolVersion})),
    wake:{fragment:wake.fragment,fragmentBasis:copy(wake.fragmentBasis),
      associations:copy(wake.associations),residue:{label:'simulated_estimate',
        baseStrength:residue.strength,currentStrength:residue.strength*nowDecay,
        startedAt:residue.startedAt,durationMs:residue.durationMs}},
    firstFeeling,
    billing:{calls:4,rows:orderedBillingRows(rows,attempts)}
  };
}

export function extractLiveReceipt(store,{now=Date.now()}={}){
  if(!(store instanceof Store))fail('managed_store_required');
  store.assert();
  if(!Number.isFinite(now))fail('invalid_dream_climate_live_clock');
  const identity=verifyLiveIdentity(),batch=own(store.state,liveBatchKey);
  if(!batch||!exact(batch,['version','runIds','requestIds','sessionIds','matrixHash','startedAt'])||
     batch.version!==1||hash(batch.runIds)!==hash([...liveRunIds])||
     hash(batch.requestIds)!==hash([...liveRunRequestIds])||
     hash(batch.sessionIds)!==hash([...liveRunSessionIds])||
     batch.matrixHash!==identity.matrixHash||!stamp(batch.startedAt))
    fail('invalid_dream_climate_live_batch');
  if(own(store.state,'dreamClimateLiveVersion')!==liveRuntimeVersion)
    fail('dream_climate_live_runtime_identity_mismatch');
  const runs=[];
  for(const [index,runId] of batch.runIds.entries()){
    const run=own(store.state.runs,runId);
    validateRunIdentity(run,identity,index);
    const rows=billingRows(store,run.id);
    runs.push(run.status==='completed'?extractCompletedRun(store,run,now):{
      ordinal:index+1,id:run.id,status:run.status,error:run.error??null,
      climate:run.plan.climate,mechanism:run.plan.mechanism,
      foregroundAnchor:run.plan.foregroundAnchor,
      usedForegroundAnchors:copy(run.plan.usedForegroundAnchors),
      usedMechanisms:copy(run.plan.usedMechanisms),
      scenesSaved:run.scenes?.length??0,draftScenes:run.draftScenes?.length??0,
      billing:{calls:rows.length,
        rows:run.attempts?.length?orderedBillingRows(rows,run.attempts):
          uncommittedBillingRows(rows)}
    });
  }
  const completedRuns=runs.filter(run=>run.status==='completed').length;
  const allRows=runs.flatMap(run=>run.billing.rows);
  return {
    schemaVersion:1,extractionVersion:liveExtractionVersion,
    status:completedRuns===liveRunCount?'READY_FOR_MANUAL_CONTENT_REVIEW':'PARTIAL_OR_FAILED',
    completedRuns,requestedRuns:liveRunCount,
    identity:copy(identity),
    input:{snapshotId:dreamClimateCanonicalSnapshot.id,
      version:dreamClimateCanonicalSnapshot.version,materialKind:'fictional',
      isRealityFact:false,sourceRefs:copy(dreamClimateSourceRefs)},
    runs,
    batch:{calls:allRows.length,chargedMicroCny:allRows.reduce((sum,row)=>
      sum+BigInt(row.chargedMicroCny??0),0n).toString()},
    laterRecollections:[],
    boundaries:{modelNamesInReadingSurface:false,laterRecollectionsEmpty:true,
      climateMappedToFirstFeeling:false,climateMappedToResidue:false,
      qualityAssessed:false,semanticSupport:'not_assessed'}
  };
}
