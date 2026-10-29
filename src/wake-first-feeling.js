// Independent, append-only wake-first-feeling records for fictional dreams.
import {randomUUID} from 'node:crypto';
import {Store,copy,fail} from './store.js';
import {hash,own,safeId} from './contract.js';

export const wakeFirstFeelingVersion='wake-first-feeling-v1';
export const wakeFirstFeelingViewVersion='wake-first-feeling-view-v1';

const journalName='wakeFirstFeeling',recordOrigin='wake_first_feeling';
const statuses=new Set(['present','absent','uncertain']);
const text=value=>typeof value==='string'&&value.trim().length>0&&value.length<=20000;
const stamp=value=>Number.isSafeInteger(value)&&value>=0;
const maxText=20000;

function journal(store,{create=false}={}){
  const value=own(store.state,journalName);
  if(value===undefined){
    if(!create)return null;
    const fresh={version:1,nextOrder:1,requests:{},dreams:{}};
    store.state[journalName]=fresh;return fresh;
  }
  if(!value||value.version!==1||!Number.isSafeInteger(value.nextOrder)||value.nextOrder<1||!value.requests||!value.dreams||Array.isArray(value.requests)||Array.isArray(value.dreams))fail('invalid_wake_first_feeling_journal');
  for(const [id,request] of Object.entries(value.requests)){
    if(!safeId(id)||!request||!safeId(request.entryId)||!safeId(request.dreamId)||typeof request.fingerprint!=='string'||!/^[a-f0-9]{64}$/.test(request.fingerprint))fail('invalid_wake_first_feeling_journal');
  }
  for(const [dreamId,record] of Object.entries(value.dreams)){
    if(!safeId(dreamId)||!record||!safeId(record.entryId)||!safeId(record.requestId))fail('invalid_wake_first_feeling_journal');
  }
  return value;
}

function visibleDream(store,dreamId){
  if(!(store instanceof Store))fail('managed_store_required');
  store.assert();
  if(!safeId(dreamId))fail('invalid_wake_first_feeling_dream');
  const dream=own(store.state.entries,dreamId),run=dream?own(store.state.runs,dream.runId):null,wake=dream?.wake;
  if(!dream||dream.origin!=='dream'||dream.id!==dreamId||!safeId(dream.runId)||dream.materialKind!=='fictional'||dream.isRealityFact!==false||!Array.isArray(dream.sourceRefs)||!Array.isArray(dream.scenes)||!wake||wake.origin!=='wake_note'||wake.materialKind!=='fictional'||wake.isRealityFact!==false||wake.runId!==dream.runId||!text(wake.fragment)||hash(wake.sourceRefs)!==hash(dream.sourceRefs)||hash(wake.derivedFrom)!==hash([run?.snapshot?.id].filter(Boolean)))fail('wake_first_feeling_dream_unavailable');
  if(!run||run.status!=='completed'||run.entryId!==dreamId||!run.snapshot)fail('wake_first_feeling_dream_unavailable');
  if(!dream.scenes.some(scene=>typeof scene?.event==='string'&&scene.event.includes(wake.fragment)))fail('wake_first_feeling_requires_excerpt_wake');
  return {dream,run,wake};
}

function dreamOrGone(store,dreamId){
  if(!(store instanceof Store))fail('managed_store_required');
  store.assert();
  if(!safeId(dreamId))fail('invalid_wake_first_feeling_dream');
  return own(store.state.entries,dreamId)?visibleDream(store,dreamId):null;
}

function validateRecord(entry,dream){
  if(!entry||entry.schemaVersion!==1||!safeId(entry.id)||entry.origin!==recordOrigin||entry.runId!==dream.runId||entry.dreamId!==dream.id||entry.materialKind!==dream.materialKind||entry.isRealityFact!==false||!Array.isArray(entry.derivedFrom)||entry.derivedFrom.length!==1||entry.derivedFrom[0]!==dream.id||hash(entry.sourceRefs)!==hash(dream.sourceRefs)||!Number.isSafeInteger(entry.order)||entry.order<1||!stamp(entry.recordedAt)||!statuses.has(entry.status))fail('invalid_wake_first_feeling_record');
  if(entry.status==='present'){
    if(!text(entry.text)||entry.text.length>maxText||entry.textBasis!=='explicit_fictional_record')fail('invalid_wake_first_feeling_record');
  }else if(Object.hasOwn(entry,'text')||Object.hasOwn(entry,'textBasis'))fail('invalid_wake_first_feeling_record');
  return entry;
}

function findRecord(store,dream){
  const current=journal(store),mapped=current?own(current.dreams,dream.id):undefined;
  if(mapped){
    const entry=own(store.state.entries,mapped.entryId);
    if(entry===undefined)return null;
    return validateRecord(entry,dream);
  }
  const records=Object.values(store.state.entries).filter(entry=>entry?.origin===recordOrigin&&Array.isArray(entry.derivedFrom)&&entry.derivedFrom.length===1&&entry.derivedFrom[0]===dream.id);
  if(records.length>1)fail('invalid_wake_first_feeling_record');
  return records.length?validateRecord(records[0],dream):null;
}

export function recordWakeFirstFeeling(store,input){
  if(!(store instanceof Store))fail('managed_store_required');
  store.assert();
  if(!input||Array.isArray(input)||typeof input!=='object')fail('invalid_wake_first_feeling_input');
  const allowed=['dreamId','requestId','status','text','now'];
  if(Object.keys(input).some(key=>!allowed.includes(key)))fail('invalid_wake_first_feeling_input');
  const {dreamId,requestId,status}=input;
  if(!safeId(dreamId)||!safeId(requestId)||!statuses.has(status))fail('invalid_wake_first_feeling_input');
  if(status==='present'){
    if(!text(input.text)||input.text.length>maxText)fail('invalid_wake_first_feeling_text');
  }else if(Object.hasOwn(input,'text'))fail('invalid_wake_first_feeling_text');
  if(Object.hasOwn(input,'now')&&!stamp(input.now))fail('invalid_wake_first_feeling_clock');
  const {dream}=visibleDream(store,dreamId);
  const fingerprint=hash({dreamId,status,text:status==='present'?input.text:null});
  const current=journal(store),previous=current?own(current.requests,requestId):undefined;
  if(previous){
    if(previous.fingerprint!==fingerprint||previous.dreamId!==dreamId)fail('wake_first_feeling_request_conflict');
    const existing=own(store.state.entries,previous.entryId);
    if(existing===undefined)fail('wake_first_feeling_request_unavailable');
    return {...copy(validateRecord(existing,dream)),replayed:true};
  }
  if(current&&own(current.dreams,dreamId))fail('wake_first_feeling_already_recorded');
  if(findRecord(store,dream))fail('wake_first_feeling_already_recorded');
  const target=journal(store,{create:true}),id=randomUUID(),order=target.nextOrder++;
  const entry={schemaVersion:1,id,runId:dream.runId,dreamId:dream.id,materialKind:dream.materialKind,origin:recordOrigin,isRealityFact:false,sourceRefs:copy(dream.sourceRefs),derivedFrom:[dream.id],order,recordedAt:Object.hasOwn(input,'now')?input.now:Date.now(),status,...(status==='present'?{text:input.text,textBasis:'explicit_fictional_record'}:{})};
  target.requests[requestId]={fingerprint,entryId:id,dreamId};target.dreams[dream.id]={entryId:id,requestId};
  store.state.entries[id]=entry;store.save();return copy(entry);
}

export function readWakeFirstFeeling(store,dreamId){
  const visible=dreamOrGone(store,dreamId);
  if(!visible)return null;
  const {dream}=visible,entry=findRecord(store,dream);
  return entry?copy(entry):null;
}

export function readWakeFirstFeelingView(store,dreamId,{now=Date.now()}={}){
  if(!stamp(now))fail('invalid_wake_first_feeling_clock');
  const visible=dreamOrGone(store,dreamId);
  if(!visible)return null;
  const {dream,wake}=visible,entry=findRecord(store,dream);
  const residue=dream.residue;
  if(residue!==undefined&&(!residue||residue.origin!=='simulated_affect'||residue.isRealityFact!==false||!Number.isFinite(residue.strength)||!stamp(residue.startedAt)||!Number.isFinite(residue.durationMs)||residue.durationMs<=0))fail('invalid_wake_first_feeling_residue');
  const later=[];
  for(const [id,child] of Object.entries(store.state.entries)){
    if(child?.origin!=='recollection'||!Array.isArray(child.derivedFrom)||child.derivedFrom.length!==1||child.derivedFrom[0]!==dream.id)continue;
    if(!safeId(id)||child.id!==id||child.runId!==dream.runId||child.materialKind!==dream.materialKind||child.isRealityFact!==false||!text(child.text)||child.text.length>maxText||hash(child.sourceRefs)!==hash(dream.sourceRefs))fail('invalid_wake_first_feeling_recollection');
    later.push({id:child.id,origin:'recollection',order:later.length+1,text:child.text});
  }
  const residueView=residue?{origin:'simulated_affect',isRealityFact:false,strength:residue.strength*Math.max(0,1-Math.max(0,now-residue.startedAt)/residue.durationMs),startedAt:residue.startedAt,durationMs:residue.durationMs,label:'simulated_estimate'}:null;
  return {schemaVersion:1,viewVersion:wakeFirstFeelingViewVersion,origin:'wake_first_feeling_view',materialKind:dream.materialKind,isRealityFact:false,sourceRefs:copy(dream.sourceRefs),derivedFrom:[dream.id],dream:{id:dream.id,runId:dream.runId,scenes:copy(dream.scenes)},wake:{id:wake.id,fragment:wake.fragment,fragmentSceneIndex:dream.scenes.findIndex(scene=>scene.event.includes(wake.fragment)),associations:copy(wake.associations??[])},firstFeeling:entry?copy(entry):null,residue:residueView,later};
}

function assertView(view){
  if(!view||view.schemaVersion!==1||view.viewVersion!==wakeFirstFeelingViewVersion||view.origin!=='wake_first_feeling_view'||view.materialKind!=='fictional'||view.isRealityFact!==false||!Array.isArray(view.dream?.scenes)||!text(view.wake?.fragment)||!Array.isArray(view.wake.associations)||!Array.isArray(view.later))fail('invalid_wake_first_feeling_view');
  if(view.firstFeeling!==null){
    const f=view.firstFeeling;
    if(!f||f.origin!==recordOrigin||f.isRealityFact!==false||!statuses.has(f.status)||!Number.isSafeInteger(f.order)||!stamp(f.recordedAt))fail('invalid_wake_first_feeling_view');
    if(f.status==='present'?!text(f.text):Object.hasOwn(f,'text'))fail('invalid_wake_first_feeling_view');
  }
  for(const item of view.later)if(!item||item.origin!=='recollection'||!text(item.text)||!Number.isSafeInteger(item.order))fail('invalid_wake_first_feeling_view');
}

const quote=value=>JSON.stringify(value);
export function renderWakeFirstFeelingView(view){
  assertView(view);
  const lines=['夜航 · 刚醒时心情（本地虚构只读视图）','身份：素材为虚构；原梦、醒来残片、刚醒心情和后来回想都不是现实事实。','',`来源编号与版本：${quote(view.sourceRefs)}`,'','【原梦】'];
  view.dream.scenes.forEach((scene,index)=>lines.push(`第 ${index+1} 幕：${quote(scene.event)}`));
  lines.push('','【醒来】',`残片：${quote(view.wake.fragment)}`,`逐字摘录来源：第 ${view.wake.fragmentSceneIndex+1} 幕`);
  if(view.wake.associations.length)lines.push('',`待验证联想（非事实）：${quote(view.wake.associations)}`);
  if(view.residue)lines.push('',`模拟余韵强度：${view.residue.strength}（独立模拟估计，不是刚醒心情）`);
  if(view.firstFeeling){
    const feeling=view.firstFeeling;
    const shown=feeling.status==='present'?quote(feeling.text):feeling.status==='absent'?'无（明确记为无）':'说不清（明确记录）';
    lines.push('','【刚醒心情】',`刚醒心情：${shown}`,`记录：${quote({id:feeling.id,order:feeling.order,status:feeling.status,recordedAt:feeling.recordedAt,textBasis:feeling.textBasis??null})}`);
  }
  if(view.later.length){
    lines.push('','【后来回想】');
    view.later.forEach((item,index)=>lines.push(`回想 ${index+1}：${quote(item.text)}`,`记录：${quote({id:item.id,order:item.order})}`));
  }
  lines.push('','【边界】','刚醒心情与残片、模拟余韵、梦中 valence/arousal 分开保存；后来记录只追加，不改写原梦。','显示不等于现实主观感受、语义支持或梦境质量已经验收。');
  return lines.join('\n');
}
