// Derived generated-feeling records and a read-only view. No generation here.
import {Store,copy,fail} from './store.js';
import {hash,neutral,own,safeId} from './contract.js';
import {generatedWakeProtocolVersion,generatedWakeRuntimeVersion,generatedWakeViewVersion,generatedWakeRecordOrigin,generatedWakeTextBasis} from './generated-wake-protocol.js';
import {dreamClimateSceneMaterial,normalizeDreamClimateCheckpoint} from './dream-climate-protocol.js';

const journalName='generatedWakeJournal';
const statuses=new Set(['present','absent','uncertain']);
const exact=(value,names)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===names.length&&names.every(name=>Object.hasOwn(value,name));
const stamp=value=>Number.isSafeInteger(value)&&value>=0;
const text=value=>typeof value==='string'&&value.isWellFormed()&&value.trim().length>0;
const recordEnvelopeKeys=['schemaVersion','id','origin','runId','dreamId','materialKind','isRealityFact','sourceRefs','derivedFrom','status','recordedAt','sourceVersion','wakeAttempt','order'];
const attemptKeys=['protocolVersion','requestId','index','sourceVersion'];
const baseRecordKeys=['schemaVersion','origin','materialKind','isRealityFact','sourceRefs','derivedFrom'];

function emptyJournal(){return {version:1,nextOrder:1,dreams:{}};}
function journal(store){
  const value=own(store.state,journalName);
  if(value===undefined)return emptyJournal();
  if(!value||value.version!==1||!Number.isSafeInteger(value.nextOrder)||value.nextOrder<1||
     !value.dreams||Array.isArray(value.dreams))fail('invalid_generated_wake_journal');
  for(const [dreamId,mapping] of Object.entries(value.dreams)){
    if(!safeId(dreamId)||!mapping||!exact(mapping,['wakeRequestId','recordId','status'])||
       !safeId(mapping.wakeRequestId)||!statuses.has(mapping.status)&&mapping.status!=='omitted')fail('invalid_generated_wake_journal');
    if(mapping.status==='omitted'?mapping.recordId!==null:!safeId(mapping.recordId))fail('invalid_generated_wake_journal');
  }
  return copy(value);
}

function envelope(run,id,origin){return {schemaVersion:1,id,runId:run.id,materialKind:'fictional',origin,isRealityFact:false,sourceRefs:run.snapshot.sources.map(source=>({id:source.id,version:source.version})),derivedFrom:[run.snapshot.id]};}

function validateWake(wake,run,scenes){
  if(!wake||!['fragment','associations','residue','fragmentBasis'].every(key=>Object.hasOwn(wake,key))||
     !text(wake.fragment)||!Array.isArray(wake.associations)||wake.associations.length>1||
     wake.associations.some(value=>!text(value)||value.length>20000)||
     !Number.isFinite(wake.residue)||wake.residue<0||wake.residue>0.3||
     !exact(wake.fragmentBasis,['kind','sceneIndex'])||wake.fragmentBasis.kind!=='scene_excerpt'||
     !Number.isSafeInteger(wake.fragmentBasis.sceneIndex)||
     wake.fragmentBasis.sceneIndex<0||wake.fragmentBasis.sceneIndex>=scenes.length||
     !scenes[wake.fragmentBasis.sceneIndex].event.includes(wake.fragment))fail('invalid_generated_wake_note');
  return wake;
}

function feelingRecord({run,dreamId,feeling,recordedAt,sourceVersion,wakeRequestId,order}){
  const base={schemaVersion:1,id:`generated-feeling-${run.id}`,origin:generatedWakeRecordOrigin,runId:run.id,dreamId,
    materialKind:'fictional',isRealityFact:false,sourceRefs:run.snapshot.sources.map(source=>({id:source.id,version:source.version})),
    derivedFrom:[dreamId],status:feeling.status,recordedAt,sourceVersion,wakeAttempt:{protocolVersion:generatedWakeProtocolVersion,requestId:wakeRequestId,index:run.scenes.length,sourceVersion},order};
  return feeling.status==='present'?{...base,text:feeling.text,textBasis:generatedWakeTextBasis}:base;
}

function validateFeeling(entry,dream,run){
  if(!entry||!safeId(entry.id)||!statuses.has(entry.status)||
     !exact(entry,entry.status==='present'?[...recordEnvelopeKeys,'text','textBasis']:recordEnvelopeKeys))fail('invalid_generated_wake_feeling_record');
  if(entry.schemaVersion!==1||entry.origin!==generatedWakeRecordOrigin||entry.runId!==run.id||entry.dreamId!==dream.id||
     entry.materialKind!=='fictional'||entry.isRealityFact!==false||!Array.isArray(entry.sourceRefs)||
     hash(entry.sourceRefs)!==hash(dream.sourceRefs)||!Array.isArray(entry.derivedFrom)||
     entry.derivedFrom.length!==1||entry.derivedFrom[0]!==dream.id||!stamp(entry.recordedAt)||
     !Number.isSafeInteger(entry.order)||entry.order<1||!text(entry.sourceVersion)||
     !exact(entry.wakeAttempt,attemptKeys)||entry.wakeAttempt.protocolVersion!==generatedWakeProtocolVersion||
     entry.wakeAttempt.index!==run.scenes.length||entry.wakeAttempt.sourceVersion!==entry.sourceVersion)fail('invalid_generated_wake_feeling_record');
  if(entry.status==='present'){
    if(!text(entry.text)||[...entry.text].length>240||entry.textBasis!==generatedWakeTextBasis)fail('invalid_generated_wake_feeling_record');
  }else if(Object.hasOwn(entry,'text')||Object.hasOwn(entry,'textBasis'))fail('invalid_generated_wake_feeling_record');
  return entry;
}

function validateRun(run,dream){
  if(!run||run.status!=='completed'||run.entryId!==dream.id||!run.snapshot||
     run.generatedWakeProtocolVersion!==generatedWakeProtocolVersion||
     run.generatedWakeRuntimeVersion!==generatedWakeRuntimeVersion||
     run.appraisalProtocolVersion!==generatedWakeProtocolVersion||
     run.executionOwner?.family!==`specialized:${generatedWakeRuntimeVersion}`||
     !Array.isArray(run.scenes)||run.scenes.length!==3||
     !Array.isArray(run.draftScenes)||run.draftScenes.length!==3||
     hash(run.scenes)!==hash(dream.scenes)||
     hash(run.draftScenes.map(dreamClimateSceneMaterial))!==hash(run.scenes)||
     hash(dream.sourceRefs)!==hash(run.snapshot.sources.map(source=>({id:source.id,version:source.version}))))fail('generated_wake_dream_unavailable');
  let before=run.snapshot.channels.affect.value??neutral();
  for(const [index,scene] of run.draftScenes.entries()){
    const value=normalizeDreamClimateCheckpoint(scene,before,{sceneIndex:index,
      requestId:`generated-${run.id}-scene-${index}`});before=value.after;
  }
  return run;
}

export function prepareGeneratedWakePublication(store,input){
  if(!(store instanceof Store))fail('managed_store_required');
  store.assert();
  if(!input||typeof input!=='object'||Array.isArray(input)||
     !exact(input,['run','wake','firstFeeling','firstFeelingOmitted','wakeRequestId','recordedAt']))fail('invalid_generated_wake_publication');
  const {run,wake,firstFeeling,firstFeelingOmitted,wakeRequestId,recordedAt}=input;
  if(!run||!safeId(run.id)||own(store.state.runs,run.id)!==run||run.status!=='running'||run.entryId!==undefined||!run.snapshot||
     !safeId(run.snapshot.id)||!text(run.snapshot.version)||!Array.isArray(run.scenes)||run.scenes.length!==3||
     !Array.isArray(run.draftScenes)||run.draftScenes.length!==3||
     hash(run.draftScenes.map(dreamClimateSceneMaterial))!==hash(run.scenes)||
     run.generatedWakeProtocolVersion!==generatedWakeProtocolVersion||
     run.generatedWakeRuntimeVersion!==generatedWakeRuntimeVersion||
     run.executionOwner?.family!==`specialized:${generatedWakeRuntimeVersion}`||
     !safeId(wakeRequestId)||!stamp(recordedAt)||typeof firstFeelingOmitted!=='boolean')fail('invalid_generated_wake_publication');
  validateWake(wake,run,run.scenes);
  if(firstFeelingOmitted!==(firstFeeling===null))fail('invalid_generated_wake_publication');
  if(!firstFeelingOmitted){
    if(!firstFeeling||!statuses.has(firstFeeling.status)||
       (firstFeeling.status==='present'?(!exact(firstFeeling,['status','text'])||!text(firstFeeling.text)||[...firstFeeling.text].length>240):!exact(firstFeeling,['status'])))fail('invalid_generated_wake_publication');
  }
  const current=journal(store),dreamId=`dream-${run.id}`;
  if(own(store.state.entries,dreamId)!==undefined||own(current.dreams,dreamId)!==undefined)return fail('generated_wake_already_published');
  const records=Object.values(store.state.entries).filter(entry=>entry?.origin===generatedWakeRecordOrigin&&Array.isArray(entry.derivedFrom)&&entry.derivedFrom.length===1&&entry.derivedFrom[0]===dreamId);
  if(records.length)return fail('generated_wake_already_published');
  const nextJournal=copy(current);
  let before=run.snapshot.channels.affect.value??neutral();
  for(const [index,scene] of run.draftScenes.entries()){
    const value=normalizeDreamClimateCheckpoint(scene,before,{sceneIndex:index,
      requestId:`generated-${run.id}-scene-${index}`});before=value.after;
  }
  const dreamEntry={...envelope(run,dreamId,'dream'),scenes:copy(run.scenes),wake:{...envelope(run,`wake-${run.id}`,'wake_note'),...copy(wake)},residue:{...envelope(run,`residue-${run.id}`,'simulated_affect'),strength:wake.residue,startedAt:recordedAt,durationMs:3600000},cherished:false,recallAccess:'cue'};
  let feelingEntry=null;
  if(firstFeelingOmitted){
    nextJournal.dreams[dreamId]={wakeRequestId,recordId:null,status:'omitted'};
  }else{
    const order=nextJournal.nextOrder++;
    feelingEntry=feelingRecord({run,dreamId,feeling:firstFeeling,recordedAt,sourceVersion:run.snapshot.version,wakeRequestId,order});
    nextJournal.dreams[dreamId]={wakeRequestId,recordId:feelingEntry.id,status:firstFeeling.status};
  }
  return {dreamId,dreamEntry,feelingEntry,journal:nextJournal};
}

function visibleDream(store,dreamId){
  if(!(store instanceof Store))fail('managed_store_required');
  store.assert();
  if(!safeId(dreamId))fail('invalid_generated_wake_dream');
  const dream=own(store.state.entries,dreamId);
  if(dream===undefined)return null;
  if(!dream||dream.id!==dreamId||dream.origin!=='dream'||dream.materialKind!=='fictional'||
     dream.isRealityFact!==false||!Array.isArray(dream.sourceRefs)||!Array.isArray(dream.scenes))fail('generated_wake_dream_unavailable');
  const run=own(store.state.runs,dream.runId);
  if(!run||['revoked','deleted'].includes(run.status))return null;
  if(dream.sourceRefs.some(source=>store.withdrawn.includes(source.id))||
     (run.sourceIds??[]).some(sourceId=>store.withdrawn.includes(sourceId)))return null;
  validateRun(run,dream);
  return {dream,run};
}

function wakeFromDream(store,dream,run){
  const wake=dream.wake;
  if(!wake||!exact(wake,['schemaVersion','id','runId','materialKind','origin','isRealityFact','sourceRefs','derivedFrom','fragment','associations','residue','fragmentBasis'])||
     wake.schemaVersion!==1||wake.id!==`wake-${run.id}`||wake.runId!==run.id||wake.materialKind!=='fictional'||
     wake.origin!=='wake_note'||wake.isRealityFact!==false||
     hash(wake.sourceRefs)!==hash(dream.sourceRefs)||hash(wake.derivedFrom)!==hash([run.snapshot.id]))fail('invalid_generated_wake_note');
  validateWake(wake,run,dream.scenes);
  return wake;
}

export function readGeneratedWakeView(store,dreamId,{now=Date.now()}={}){
  if(!Number.isFinite(now))fail('invalid_generated_wake_clock');
  const visible=visibleDream(store,dreamId);
  if(!visible)return null;
  const {dream,run}=visible,wake=wakeFromDream(store,dream,run),residue=dream.residue;
  if(!residue||!exact(residue,['schemaVersion','id','runId','materialKind','origin','isRealityFact','sourceRefs','derivedFrom','strength','startedAt','durationMs'])||
     residue.schemaVersion!==1||residue.id!==`residue-${run.id}`||residue.runId!==run.id||
     residue.materialKind!=='fictional'||residue.origin!=='simulated_affect'||residue.isRealityFact!==false||
     hash(residue.sourceRefs)!==hash(dream.sourceRefs)||hash(residue.derivedFrom)!==hash([run.snapshot.id])||
     residue.strength!==wake.residue||!stamp(residue.startedAt)||!Number.isFinite(residue.durationMs)||residue.durationMs<=0)fail('invalid_generated_wake_residue');
  const current=journal(store),mapping=own(current.dreams,dreamId);
  if(!mapping||mapping.wakeRequestId===undefined)fail('invalid_generated_wake_journal');
  const matching=Object.values(store.state.entries).filter(entry=>entry?.origin===generatedWakeRecordOrigin&&Array.isArray(entry.derivedFrom)&&entry.derivedFrom.length===1&&entry.derivedFrom[0]===dreamId);
  if(matching.length>1)fail('invalid_generated_wake_feeling_record');
  let firstFeeling=null;
  if(mapping.status!=='omitted'){
    const entry=own(store.state.entries,mapping.recordId);
    if(entry!==undefined){
      firstFeeling=validateFeeling(entry,dream,run);
      if(firstFeeling.id!==mapping.recordId||firstFeeling.status!==mapping.status||
         firstFeeling.wakeAttempt.requestId!==mapping.wakeRequestId||
         firstFeeling.recordedAt!==residue.startedAt)fail('invalid_generated_wake_feeling_record');
    }
  }
  if(matching.length===1&&(!firstFeeling||matching[0].id!==firstFeeling.id))fail('invalid_generated_wake_feeling_record');
  const later=[];
  for(const [id,entry] of Object.entries(store.state.entries)){
    if(entry?.origin!=='recollection'||!Array.isArray(entry.derivedFrom)||entry.derivedFrom.length!==1||entry.derivedFrom[0]!==dreamId)continue;
    if(!safeId(id)||entry.id!==id||entry.runId!==run.id||entry.materialKind!=='fictional'||entry.isRealityFact!==false||
       !text(entry.text)||entry.text.length>20000||hash(entry.sourceRefs)!==hash(dream.sourceRefs))fail('invalid_generated_wake_recollection');
    later.push({id,origin:'recollection',order:later.length+1,text:entry.text});
  }
  const residueView={origin:'simulated_affect',isRealityFact:false,strength:residue.strength*Math.max(0,1-Math.max(0,now-residue.startedAt)/residue.durationMs),startedAt:residue.startedAt,durationMs:residue.durationMs,label:'simulated_estimate'};
  return {schemaVersion:1,viewVersion:generatedWakeViewVersion,origin:'generated_wake_offline_view',protocolVersion:generatedWakeProtocolVersion,
    materialKind:'fictional',isRealityFact:false,sourceRefs:copy(dream.sourceRefs),derivedFrom:[dreamId],
    dream:{id:dream.id,runId:dream.runId,sourceVersion:run.snapshot.version,scenes:copy(dream.scenes)},
    wake:{fragment:wake.fragment,fragmentSceneIndex:wake.fragmentBasis.sceneIndex,associations:copy(wake.associations),wakeRequestId:mapping.wakeRequestId,protocolVersion:generatedWakeProtocolVersion},
    firstFeeling:firstFeeling?copy(firstFeeling):null,firstFeelingOmitted:mapping.status==='omitted',firstFeelingDeleted:mapping.status!=='omitted'&&firstFeeling===null,
    residue:residueView,later};
}

const quote=value=>JSON.stringify(value);
export function assertGeneratedWakeView(view){
  if(!view||view.schemaVersion!==1||view.viewVersion!==generatedWakeViewVersion||
     view.origin!=='generated_wake_offline_view'||view.protocolVersion!==generatedWakeProtocolVersion||
     view.materialKind!=='fictional'||view.isRealityFact!==false||
     !Array.isArray(view.dream?.scenes)||view.dream.scenes.length!==3||
     !text(view.wake?.fragment)||!Array.isArray(view.wake.associations)||
     !view.residue||view.residue.label!=='simulated_estimate'||!Array.isArray(view.later))fail('invalid_generated_wake_view');
  if(view.firstFeeling!==null){
    const feeling=view.firstFeeling;
    if(!feeling||!statuses.has(feeling.status)||feeling.isRealityFact!==false||
       feeling.textBasis!==undefined&&feeling.textBasis!==generatedWakeTextBasis||
       (feeling.status==='present'?!text(feeling.text):Object.hasOwn(feeling,'text')))fail('invalid_generated_wake_view');
  }
  for(const item of view.later)if(!item||item.origin!=='recollection'||!text(item.text)||!Number.isSafeInteger(item.order))fail('invalid_generated_wake_view');
  return view;
}

export function renderGeneratedWakeView(view){
  if(view===null)return '\u6b64\u68a6\u5f53\u524d\u4e0d\u53ef\u8bfb\u53d6\u3002';
  assertGeneratedWakeView(view);
  const lines=['\u591c\u822a \u00b7 \u79bb\u7ebf\u751f\u6210\u9192\u6765\u89c6\u56fe',
    '\u8eab\u4efd\uff1a\u4ee5\u4e0b\u5747\u4e3a\u865a\u6784\uff0c\u4e0d\u662f\u73b0\u5b9e\u4e8b\u5b9e\u3002',
    '','\u3010\u539f\u68a6\u3011'];
  view.dream.scenes.forEach((scene,index)=>lines.push(`\u7b2c ${index+1} \u5e55\uff1a${quote(scene.event)}`));
  lines.push('','\u3010\u9192\u6765\u6b8b\u7247\u3011',`\u6b8b\u7247\uff1a${quote(view.wake.fragment)}`,
    `\u9010\u5b57\u6458\u5f55\u6765\u6e90\uff1a\u7b2c ${view.wake.fragmentSceneIndex+1} \u5e55\u3002`);
  if(view.wake.associations.length)lines.push('',`\u5f85\u9a8c\u8bc1\u8054\u60f3\uff08\u975e\u4e8b\u5b9e\uff09\uff1a${quote(view.wake.associations)}`);
  if(view.firstFeeling){
    const feeling=view.firstFeeling;
    const shown=feeling.status==='present'?quote(feeling.text):
      feeling.status==='absent'?'\u65e0\uff08\u660e\u786e\u8bb0\u4e3a\u65e0\uff09\u3002':'\u8bf4\u4e0d\u6e05\uff08\u4e0d\u786e\u5b9a\uff09\u3002';
    lines.push('','\u3010\u521a\u9192\u5fc3\u60c5\u3011',`\u521a\u9192\u5fc3\u60c5\uff1a${shown}`);
  }
  lines.push('','\u3010\u6a21\u62df\u4f59\u97f5\u3011',
    `\u5f3a\u5ea6\uff1a${view.residue.strength}\uff08\u72ec\u7acb\u6a21\u62df\u4f30\u8ba1\uff0c\u4e0d\u662f\u521a\u9192\u5fc3\u60c5\u6216\u6301\u4e45\u5fc3\u60c5\u8bb0\u5f55\uff09\u3002`);
  if(view.later.length){
    lines.push('','\u3010\u540e\u6765\u56de\u60f3\u3011');
    view.later.forEach((item,index)=>lines.push(`\u56de\u60f3 ${index+1}\uff1a${quote(item.text)}`));
  }
  lines.push('','\u3010\u8fb9\u754c\u3011',
    '\u521a\u9192\u5fc3\u60c5\u4e0e\u6b8b\u7247\u3001\u6a21\u62df\u4f59\u97f5\u5206\u522b\u4fdd\u5b58\uff1b\u540e\u6765\u8bb0\u5f55\u53ea\u8ffd\u52a0\u3002',
    '\u663e\u793a\u4e0d\u7b49\u4e8e\u73b0\u5b9e\u4e3b\u89c2\u611f\u53d7\u6216\u8bed\u4e49\u8d28\u91cf\u9a8c\u6536\u3002');
  return lines.join('\n');
}
