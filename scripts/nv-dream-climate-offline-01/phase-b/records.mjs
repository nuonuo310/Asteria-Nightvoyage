// Managed publication and read-only R1 receipt. There is no generation here.
import {Store} from '../../../src/store.js';
import {hash,neutral,own,safeId} from '../../../src/contract.js';
import {copy,fail} from '../../../src/store.js';
import {
  dreamClimateCanonicalSnapshot,dreamClimateScenesPerRun,
  dreamClimateSceneMaterial,dreamClimateSourceRefs,normalizeDreamClimateCheckpoint
} from '../protocol.mjs';
import {liveBatchKey,liveFirstFeelingOrigin,liveJournalKey} from './config.mjs';
import {r3Profile} from './profile.mjs';

export {liveBatchKey,liveFirstFeelingOrigin,liveJournalKey};
const statuses=new Set(['present','absent','uncertain']);
const exact=(value,names)=>value&&typeof value==='object'&&!Array.isArray(value)&&
  Object.keys(value).length===names.length&&names.every(name=>Object.hasOwn(value,name));
const stamp=value=>Number.isSafeInteger(value)&&value>=0;
const text=value=>typeof value==='string'&&value.isWellFormed()&&value.trim().length>0;
const emptyJournal=()=>({version:1,runs:{}});

function accountingTotals(rows){
  let settledCharge=0n,unknownReserved=0n;
  for(const row of rows){
    if(row.status==='settled')settledCharge+=BigInt(row.chargedMicroCny??0);
    else if(['unknown','reserved','dispatched'].includes(row.status))
      unknownReserved+=BigInt(row.reservedMicroCny??row.chargedMicroCny??0);
  }
  return {settledChargeMicroCny:settledCharge.toString(),
    unknownReservedMicroCny:unknownReserved.toString(),
    combinedAccountingMicroCny:(settledCharge+unknownReserved).toString(),
    combinedIsProviderCharged:false,
    combinedMeaning:'settled_calculated_charge_plus_unknown_reserved_hold'};
}

function sceneRecord(scene,index,technicalScene=scene){
  return {index,event:scene.event,appraisal:copy(scene.appraisal),before:copy(scene.before),
    delta:copy(scene.delta),after:copy(scene.after),appraisalBasis:copy(scene.appraisalBasis),
    affectDeclaration:copy(scene.affectDeclaration),
    evidence:copy(scene.appraisalBasis?.evidence),
    normalizationAudit:copy(technicalScene.normalizationAudit),
    unbasedAppraisalAudit:copy(technicalScene.unbasedAppraisalAudit),
    protocolVersion:scene.appraisalBasis?.protocolVersion};
}

function billingRow(row,extra={}){
  const settled=row.status==='settled';
  return {...extra,requestId:row.requestId,status:row.status,
    usage:row.usage?copy(row.usage):null,chargedMicroCny:row.chargedMicroCny,
    reservedMicroCny:row.reservedMicroCny,sourceRefs:copy(row.sourceRefs),
    chargeClass:settled?'settled_calculated_charge':'unknown_reserved_hold',
    settledChargeMicroCny:settled?row.chargedMicroCny:null,
    unknownReservedMicroCny:settled?null:row.reservedMicroCny};
}

function journal(store,profile){
  const value=own(store.state,profile.journalKey);
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

function validateScenes(scenes,run){
  if(!Array.isArray(scenes)||scenes.length!==dreamClimateScenesPerRun)
    fail('invalid_dream_climate_live_scenes');
  let before=neutral();
  for(const [index,scene] of scenes.entries()){
    const value=normalizeDreamClimateCheckpoint(scene,before,{sceneIndex:index,
      requestId:`${run.id}-scene-${index}`});before=value.after;
  }
}

function feelingRecord({run,dreamId,feeling,recordedAt,wakeRequestId,profile}){
  const base={schemaVersion:1,id:`${profile.idPrefix}-feeling-${run.id}`,runId:run.id,dreamId,
    origin:profile.firstFeelingOrigin,materialKind:'fictional',isRealityFact:false,
    sourceRefs:run.snapshot.sources.map(source=>({id:source.id,version:source.version})),
    derivedFrom:[dreamId],status:feeling.status,recordedAt,sourceVersion:run.snapshot.version,
    protocolVersion:profile.protocolVersion,wakeRequestId,runOrdinal:run.ordinal};
  return feeling.status==='present'?{...base,text:feeling.text,
    textBasis:'independent_first_feeling_model_output'}:base;
}

export function prepareManagedPublication(store,input,profile){
  if(!(store instanceof Store))fail('managed_store_required');
  store.assert();
  if(!input||!exact(input,['run','wake','firstFeeling','firstFeelingOmitted','wakeRequestId','recordedAt']))
    fail('invalid_dream_climate_live_publication');
  const {run,wake,firstFeeling,firstFeelingOmitted,wakeRequestId,recordedAt}=input;
  if(!run||!safeId(run.id)||own(store.state.runs,run.id)!==run||run.status!=='running'||
     run.entryId!==undefined||!run.snapshot||hash(run.snapshot)!==hash(dreamClimateCanonicalSnapshot)||
     run.protocolVersion!==profile.protocolVersion||run.runtimeVersion!==profile.runtimeVersion||
     !Number.isSafeInteger(run.ordinal)||run.ordinal<1||run.ordinal>profile.runCount||
     !Array.isArray(run.draftScenes)||run.draftScenes.length!==dreamClimateScenesPerRun||
     !safeId(wakeRequestId)||!stamp(recordedAt)||typeof firstFeelingOmitted!=='boolean')
    fail('invalid_dream_climate_live_publication');
  if(hash(run.sourceRefs)!==hash(dreamClimateSourceRefs))fail('invalid_dream_climate_live_publication');
  validateScenes(run.draftScenes,run);
  validateWake(wake,run.draftScenes);
  if(firstFeelingOmitted!==(firstFeeling===null))fail('invalid_dream_climate_live_publication');
  if(!firstFeelingOmitted&&(!firstFeeling||!statuses.has(firstFeeling.status)||
     (firstFeeling.status==='present'?(!exact(firstFeeling,['status','text'])||!text(firstFeeling.text)||
       [...firstFeeling.text].length>240):!exact(firstFeeling,['status']))))
    fail('invalid_dream_climate_live_publication');
  const current=journal(store,profile),dreamId=`${profile.idPrefix}-dream-${run.id}`;
  if(own(store.state.entries,dreamId)!==undefined||own(current.runs,run.id)!==undefined)
    fail('dream_climate_live_already_published');
  const next=copy(current);
  const dreamEntry={...envelope(run,dreamId,'dream'),
    scenes:copy(run.draftScenes).map(dreamClimateSceneMaterial),
    wake:{...envelope(run,`${profile.idPrefix}-wake-${run.id}`,profile.wakeOrigin,[dreamId]),
      ...copy(wake),protocolVersion:profile.protocolVersion},
    residue:{...envelope(run,`${profile.idPrefix}-residue-${run.id}`,'simulated_affect',[dreamId]),
      strength:wake.residue,startedAt:recordedAt,durationMs:3600000},
    protocolVersion:profile.protocolVersion,runOrdinal:run.ordinal,
    climate:run.plan.climate,mechanism:run.plan.mechanism,
    foregroundAnchor:run.plan.foregroundAnchor,
    usedForegroundAnchors:copy(run.plan.usedForegroundAnchors),
    usedMechanisms:copy(run.plan.usedMechanisms)};
  let feelingEntry=null;
  if(firstFeelingOmitted){
    next.runs[run.id]={dreamId,wakeRequestId,firstFeelingId:null,
      firstFeelingStatus:'omitted',runOrdinal:run.ordinal};
  }else{
    feelingEntry=feelingRecord({run,dreamId,feeling:firstFeeling,recordedAt,wakeRequestId,profile});
    next.runs[run.id]={dreamId,wakeRequestId,firstFeelingId:feelingEntry.id,
      firstFeelingStatus:firstFeeling.status,runOrdinal:run.ordinal};
  }
  return {dreamId,dreamEntry,feelingEntry,journal:next};
}

export function prepareLivePublication(store,input){
  return prepareManagedPublication(store,input,r3Profile);
}

function validateRunIdentity(run,identity,index,profile){
  const matrixEntry=profile.matrix[index];
  if(!run||run.ordinal!==index+1||!run.plan||hash(run.plan)!==hash(matrixEntry.plan)||
     run.protocolVersion!==profile.protocolVersion||run.runtimeVersion!==profile.runtimeVersion||
     run.identityHash!==profile.identityHash(identity)||run.matrixHash!==profile.matrixHash||
     run.releaseHash!==profile.releaseHash(identity)||run.allowanceId!==profile.allowanceId||
     hash(run.sourceRefs)!==hash(dreamClimateSourceRefs)||
     hash(run.snapshot)!==hash(dreamClimateCanonicalSnapshot))
    fail('dream_climate_live_run_identity_mismatch');
}

function billingRows(store,runId,profile){
  const account=own(own(store.state,profile.billingKey)?.accounts??{},profile.allowanceId);
  if(!account)return [];
  return Object.values(account.attempts).filter(row=>row.runId===runId).map(row=>copy(row));
}

function orderedBillingRows(rows,attempts){
  const byRequest=new Map(rows.map(row=>[row.requestId,row]));
  const committed=new Set(attempts.map(attempt=>attempt.billingRequestId));
  const ordered=attempts.map((attempt,index)=>{
    const row=byRequest.get(attempt.billingRequestId);
    if(!row)return {call:index+1,stage:attempt.stage,index:attempt.index,
      requestId:attempt.billingRequestId,status:'missing'};
    return billingRow(row,{call:index+1,stage:attempt.stage,index:attempt.index});
  });
  for(const row of rows){
    if(committed.has(row.requestId))continue;
    ordered.push(billingRow(row,{call:ordered.length+1}));
  }
  return ordered;
}

function uncommittedBillingRows(rows){
  return rows.map((row,index)=>billingRow(row,{call:index+1}));
}

function extractCompletedRun(store,run,now,profile){
  const current=journal(store,profile),mapping=own(current.runs,run.id);
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
     dream.protocolVersion!==profile.protocolVersion||dream.runOrdinal!==run.ordinal||
     !Array.isArray(dream.scenes)||dream.scenes.length!==dreamClimateScenesPerRun||
     hash(dream.scenes)!==hash(run.scenes.map(dreamClimateSceneMaterial))||
     dream.climate!==run.plan.climate||
     dream.mechanism!==run.plan.mechanism||dream.foregroundAnchor!==run.plan.foregroundAnchor)
    fail('dream_climate_live_dream_unavailable');
  const wake=dream.wake;
  if(!wake||wake.protocolVersion!==profile.protocolVersion||
     wake.id!==`${profile.idPrefix}-wake-${run.id}`||
     wake.runId!==run.id||wake.origin!==profile.wakeOrigin||
     wake.materialKind!=='fictional'||wake.isRealityFact!==false||
     hash(wake.sourceRefs)!==hash(dream.sourceRefs)||!Array.isArray(wake.associations))
    fail('invalid_dream_climate_live_wake');
  validateWake({fragment:wake.fragment,associations:wake.associations,
    residue:wake.residue,fragmentBasis:wake.fragmentBasis},dream.scenes);
  const residue=dream.residue;
  if(!residue||residue.id!==`${profile.idPrefix}-residue-${run.id}`||residue.runId!==run.id||
     residue.origin!=='simulated_affect'||residue.materialKind!=='fictional'||
     residue.isRealityFact!==false||hash(residue.sourceRefs)!==hash(dream.sourceRefs)||
     residue.strength!==wake.residue||!stamp(residue.startedAt)||residue.durationMs!==3600000)
    fail('invalid_dream_climate_live_residue');
  const feelingEntries=Object.values(store.state.entries)
    .filter(entry=>entry?.origin===profile.firstFeelingOrigin&&entry.dreamId===dream.id);
  if(feelingEntries.length!==(mapping.firstFeelingStatus==='omitted'?0:1))
    fail('invalid_dream_climate_live_feeling_record');
  let firstFeeling={status:mapping.firstFeelingStatus};
  if(mapping.firstFeelingStatus!=='omitted'){
    const feeling=own(store.state.entries,mapping.firstFeelingId);
    if(!feeling||feeling.id!==mapping.firstFeelingId||feeling.dreamId!==dream.id||
       feeling.runId!==run.id||feeling.status!==mapping.firstFeelingStatus||
       !statuses.has(feeling.status)||feeling.protocolVersion!==profile.protocolVersion||
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
  const rows=billingRows(store,run.id,profile),attempts=run.attempts??[];
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
    scenes:dream.scenes.map((scene,index)=>sceneRecord(scene,index,run.scenes[index])),
    wake:{fragment:wake.fragment,fragmentBasis:copy(wake.fragmentBasis),
      associations:copy(wake.associations),residue:{label:'simulated_estimate',
        baseStrength:residue.strength,currentStrength:residue.strength*nowDecay,
        startedAt:residue.startedAt,durationMs:residue.durationMs}},
    firstFeeling,
    billing:{calls:4,...accountingTotals(rows),rows:orderedBillingRows(rows,attempts)}
  };
}

export function extractManagedReceipt(store,{now=Date.now(),profile}={}){
  if(!(store instanceof Store))fail('managed_store_required');
  store.assert();
  if(!Number.isFinite(now))fail('invalid_dream_climate_live_clock');
  if(!profile)fail('managed_profile_required');
  const identity=profile.verifyIdentity(),batch=own(store.state,profile.batchKey);
  if(!batch||!exact(batch,['version','runIds','requestIds','sessionIds','matrixHash','startedAt'])||
     batch.version!==1||hash(batch.runIds)!==hash([...profile.runIds])||
     hash(batch.requestIds)!==hash([...profile.requestIds])||
     hash(batch.sessionIds)!==hash([...profile.sessionIds])||
     batch.matrixHash!==profile.matrixHash||!stamp(batch.startedAt))
    fail('invalid_dream_climate_live_batch');
  if(own(store.state,profile.runtimeStateKey)!==profile.runtimeVersion)
    fail('dream_climate_live_runtime_identity_mismatch');
  const runs=[];
  for(const [index,runId] of batch.runIds.entries()){
    const run=own(store.state.runs,runId);
    validateRunIdentity(run,identity,index,profile);
    const rows=billingRows(store,run.id,profile);
    runs.push(run.status==='completed'?extractCompletedRun(store,run,now,profile):{
      ordinal:index+1,id:run.id,status:run.status,error:run.error??null,
      validation:run.validationSubreason?{subreason:run.validationSubreason,
        originalError:run.validationOriginalError??null}:null,
      diagnostics:copy(run.diagnostics??[]),
      climate:run.plan.climate,mechanism:run.plan.mechanism,
      foregroundAnchor:run.plan.foregroundAnchor,
      usedForegroundAnchors:copy(run.plan.usedForegroundAnchors),
      usedMechanisms:copy(run.plan.usedMechanisms),
      scenesSaved:run.scenes?.length??0,draftScenes:run.draftScenes?.length??0,
      draftSceneRecords:run.draftScenes.map((scene,index)=>sceneRecord(scene,index,scene)),
      publication:{status:'not_published',wakeRecorded:false,
        firstFeelingRecorded:false,residueCreated:false},
      billing:{calls:rows.length,...accountingTotals(rows),
        rows:run.attempts?.length?orderedBillingRows(rows,run.attempts):
          uncommittedBillingRows(rows)}
    });
  }
  const completedRuns=runs.filter(run=>run.status==='completed').length;
  const allRows=runs.flatMap(run=>run.billing.rows);
  const batchAccounting=accountingTotals(allRows);
  return {
    schemaVersion:1,extractionVersion:profile.extractionVersion,profile:profile.id,
    status:completedRuns===profile.runCount?profile.completeStatus:profile.partialStatus,
    completedRuns,requestedRuns:profile.runCount,
    identity:copy(identity),
    input:{snapshotId:dreamClimateCanonicalSnapshot.id,
      version:dreamClimateCanonicalSnapshot.version,materialKind:'fictional',
      isRealityFact:false,sourceRefs:copy(dreamClimateSourceRefs)},
    runs,
    batch:{calls:allRows.length,...batchAccounting,
      chargedMicroCny:batchAccounting.combinedAccountingMicroCny,
      chargedMicroCnyMeaning:'settled_calculated_charge_plus_unknown_reserved_hold'},
    laterRecollections:[],
    boundaries:{modelNamesInReadingSurface:false,laterRecollectionsEmpty:true,
      climateMappedToFirstFeeling:false,climateMappedToResidue:false,
      qualityAssessed:false,semanticSupport:'not_assessed'}
  };
}

export function extractLiveReceipt(store,{now=Date.now()}={}){
  return extractManagedReceipt(store,{now,profile:r3Profile});
}
