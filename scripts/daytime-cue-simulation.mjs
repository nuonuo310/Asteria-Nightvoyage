// Explicit virtual-day driver, outside the paid source inventory. No scheduler or model.
import {Nightvoyage} from '../src/engine.js';
import {assertAppraisalReviewJsonData} from '../src/appraisal-review-memory.js';
import {hash,own,safeId} from '../src/contract.js';
import {copy,fail} from '../src/store.js';
export const daytimeSimulationVersion='fictional-daytime-cues-v1';
const field='daytimeCueSimulation';
const shape=(v,names)=>{if(!v||Array.isArray(v)||Object.keys(v).length!==names.length||names.some(k=>!Object.hasOwn(v,k)))fail('invalid_daytime_simulation');};
const clock=at=>Number.isSafeInteger(at)&&at>=0&&at<=Number.MAX_SAFE_INTEGER-60000;
function stateValue(store){
  const state=own(store.state,field)??{version:1,lastAt:0,events:{}};
  assertAppraisalReviewJsonData(state);shape(state,['version','lastAt','events']);
  if(state.version!==1||!clock(state.lastAt)||!state.events||Array.isArray(state.events)||Object.keys(state.events).length>100)fail('invalid_daytime_simulation');
  for(const [id,row]of Object.entries(state.events)){
    shape(row,['fingerprint']);
    if(!safeId(id)||id.length>96||typeof row.fingerprint!=='string'||!/^[a-f0-9]{64}$/.test(row.fingerprint))fail('invalid_daytime_simulation');
    const receipt=own(store.state.recalls,`day-${id}`);
    if(!receipt)fail('invalid_daytime_simulation');
    shape(receipt,['fingerprint','entryId','expiresAt']);
    if(receipt.fingerprint!==row.fingerprint||receipt.entryId!==null&&!safeId(receipt.entryId)||!Number.isSafeInteger(receipt.expiresAt)||receipt.expiresAt<60000)fail('invalid_daytime_simulation');
  }
  return copy(state);
}
function prepare(store,plan){
  assertAppraisalReviewJsonData(plan);
  shape(plan,['schemaVersion','kind','materialKind','clock','recallAllowed','events']);
  if(plan.schemaVersion!==1||plan.kind!==daytimeSimulationVersion||plan.materialKind!=='fictional'||plan.clock!=='virtual'||typeof plan.recallAllowed!=='boolean'||!Array.isArray(plan.events)||plan.events.length>10||(!plan.recallAllowed&&plan.events.length))fail('invalid_daytime_simulation');
  const state=stateValue(store),seen=new Map(Object.entries(state.events).map(([id,row])=>[id,row.fingerprint]));let lastAt=state.lastAt;
  for(const event of plan.events){
    shape(event,['id','cue','at']);
    if(!safeId(event.id)||event.id.length>96||typeof event.cue!=='string'||!event.cue.trim()||event.cue.length>200||!clock(event.at))fail('invalid_daytime_simulation');
    if(event.at<lastAt)fail('daytime_clock_rewind');lastAt=event.at;
    const fingerprint=hash(event.cue.toLowerCase()),previous=seen.get(event.id);
    if(previous&&previous!==fingerprint)fail('daytime_event_conflict');
    if(!previous&&Object.hasOwn(store.state.recalls,`day-${event.id}`))fail('daytime_request_namespace_conflict');
    seen.set(event.id,fingerprint);
  }
  if(seen.size>100)fail('daytime_event_capacity_reached');
  return {state,plan:copy(plan)};
}
export function runDaytimeCueSimulation(engine,input,{signal}={}){
  if(!(engine instanceof Nightvoyage))fail('managed_daytime_engine_required');
  if(signal!==undefined&&!(signal instanceof AbortSignal))fail('invalid_daytime_signal');
  engine.store.assert();
  const {state,plan}=prepare(engine.store,input),events=[];
  const result=status=>{
    for(const event of events){
      event.candidates=event.candidates.filter(candidate=>engine.read(candidate.derivedFrom[0])?.recallAccess==='cue'&&state.lastAt<candidate.expiresAt);
      if(event.status==='candidate'&&!event.candidates.length)event.status='suppressed';
    }
    return {schemaVersion:1,protocolVersion:daytimeSimulationVersion,origin:'dream_daytime_simulation',materialKind:'fictional',isRealityFact:false,clock:'virtual',status,events:copy(events),asteriaAdapter:'pending',automaticDelivery:false};
  };
  const cancelled=()=>{for(const event of events){event.status='cancelled';event.candidates=[];}return result('cancelled');};
  if(signal?.aborted)return cancelled();
  if(!plan.recallAllowed)return result('denied');
  for(const event of plan.events){
    if(signal?.aborted)return cancelled();
    // The driver's metadata and the engine's receipt commit in the same new-event save.
    // Replays persist only the monotonic delivery clock; never refresh the receipt expiry.
    state.lastAt=event.at;state.events[event.id]={fingerprint:hash(event.cue.toLowerCase())};
    engine.store.state[field]=copy(state);
    const candidates=engine.recall(event.cue,`day-${event.id}`,event.at);
    engine.store.save();
    // Recheck after persistence: withdrawal/deletion/policy hooks cannot publish a late body.
    const deliverable=candidates.filter(candidate=>{
      const parent=engine.read(candidate.derivedFrom[0]);
      return parent?.recallAccess==='cue'&&event.at<candidate.expiresAt;
    });
    events.push({id:event.id,at:event.at,status:deliverable.length?'candidate':'no_candidate',candidates:deliverable});
    if(signal?.aborted)return cancelled();
  }
  return result('completed');
}
