import {continuityBudgetVersion,normalizeContinuityCheckpoint} from './scene-continuity-protocol.js';
// Stage A: pure fictional design data only. No Store/API/transport integration.
import { hash, safeId } from './contract.js';
import { normalizeBudgetCoupledCheckpoint, coupledBudgetVersion } from './coupled-affect-protocol.js';

export const appraisalReviewVersion = 'dream-appraisal-review-v1';
const reject = () => { throw new Error('invalid_appraisal_review_draft'); };
const keys = (v, required, optional = []) => {
  if (!v || ![Object.prototype, null].includes(Object.getPrototypeOf(v))) reject();
  const names = Reflect.ownKeys(v);
  if (required.some(k => !Object.hasOwn(v,k)) || names.some(k => typeof k !== 'string' || ![...required,...optional].includes(k) || !Object.hasOwn(Object.getOwnPropertyDescriptor(v,k),'value'))) reject();
};
// Accept bounded JSON data only; do not invoke caller accessors or retain aliases.
function jsonData(root) {
  let nodes=0,characters=0;
  const visit=(v,depth)=>{
    if (++nodes>20000 || depth>30) reject();
    if (v===null || typeof v==='boolean') return;
    if (typeof v==='number') { if (!Number.isFinite(v)) reject(); return; }
    if (typeof v==='string') { characters+=v.length; if (characters>100000 || !v.isWellFormed()) reject(); return; }
    if (!v || typeof v!=='object' || (!Array.isArray(v)&&![Object.prototype,null].includes(Object.getPrototypeOf(v)))) reject();
    const names=Reflect.ownKeys(v);
    if (Array.isArray(v) && (v.length>1000 || names.length!==v.length+1)) reject();
    for (const k of names) {
      if (Array.isArray(v)&&k==='length') continue;
      if (typeof k!=='string' || ['__proto__','constructor','prototype'].includes(k)) reject();
      const d=Object.getOwnPropertyDescriptor(v,k);
      if (!Object.hasOwn(d,'value') || !d.enumerable) reject();
      visit(d.value,depth+1);
    }
  };
  visit(root,0);
}
const id = v => { if (!safeId(v)) reject(); };
const enumValue = (v, values) => { if (!values.includes(v)) reject(); };
function identityList(values) {
  if (!Array.isArray(values) || values.length > 1000) reject();
  for (const v of values) id(v);
  if (new Set(values).size !== values.length) reject();
}
function contextValue(context) {
  keys(context,['kind','parent','reviewer','withdrawnSourceIds','deletedDreamIds']);
  if (context.kind !== 'fictional_appraisal_review_context') reject();
  identityList(context.withdrawnSourceIds); identityList(context.deletedDreamIds);
  keys(context.reviewer,['actorId','kind']); id(context.reviewer.actorId);
  enumValue(context.reviewer.kind,['person','assistant']);
  const p=context.parent;
  keys(p,['dreamId','runId','status','protocolVersion','origin','materialKind','isRealityFact','sourceRefs','initialAffect','scenes']);
  id(p.dreamId); id(p.runId);
  if (p.origin !== 'dream' || p.materialKind !== 'fictional' || p.isRealityFact !== false || ![coupledBudgetVersion,continuityBudgetVersion].includes(p.protocolVersion)) reject();
  if (!Array.isArray(p.sourceRefs) || !p.sourceRefs.length || p.sourceRefs.length > 100) reject();
  for (const s of p.sourceRefs) {
    keys(s,['id','version']); id(s.id);
    if (typeof s.version !== 'string' || !s.version.length || s.version.length > 200 || !s.version.isWellFormed() || /[\u0000-\u001f\u007f]/u.test(s.version)) reject();
  }
  if (new Set(p.sourceRefs.map(s=>s.id)).size !== p.sourceRefs.length) reject();
  enumValue(p.status,['completed','deleted','revoked']);
  // Simulated visibility only: a future managed adapter must derive these facts itself.
  if (p.status !== 'completed' || context.deletedDreamIds.includes(p.dreamId) || p.sourceRefs.some(s=>context.withdrawnSourceIds.includes(s.id))) return null;
  keys(p.initialAffect,['valence','arousal']);
  if (!Number.isFinite(p.initialAffect.valence) || p.initialAffect.valence < -1 || p.initialAffect.valence > 1 || !Number.isFinite(p.initialAffect.arousal) || p.initialAffect.arousal < 0 || p.initialAffect.arousal > 1) reject();
  if (!Array.isArray(p.scenes) || p.scenes.length < 1 || p.scenes.length > 2) reject();
  let before=p.initialAffect;
  try {
    for (const saved of p.scenes) {
      const normalized=p.protocolVersion===continuityBudgetVersion?normalizeContinuityCheckpoint(saved,before):normalizeBudgetCoupledCheckpoint(saved,before);
      if (hash(saved)!==hash(normalized)) reject();
      before=normalized.after;
    }
  } catch { reject(); }
  return p;
}
function assessmentValue(value, kind) {
  keys(value,['eventRelevance','direction','magnitude'],['note']);
  keys(value.direction,['valence','arousal']); keys(value.magnitude,['valence','arousal']);
  if (kind === 'unchanged') {
    if (value.eventRelevance !== 'not_applicable' || ['valence','arousal'].some(k=>value.direction[k]!=='not_applicable'||value.magnitude[k]!=='not_applicable')) reject();
  } else {
    enumValue(value.eventRelevance,['related','unclear','apparently_unrelated']);
    for (const k of ['valence','arousal']) {
      enumValue(value.direction[k],['compatible','underdetermined','apparent_conflict','not_reviewed']);
      if (value.magnitude[k] !== 'not_established') reject();
    }
  }
  if (Object.hasOwn(value,'note') && (typeof value.note !== 'string' || !value.note.isWellFormed() || [...value.note].length > 600 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value.note))) reject();
  return {eventRelevance:value.eventRelevance,direction:{valence:value.direction.valence,arousal:value.direction.arousal},magnitude:{valence:value.magnitude.valence,arousal:value.magnitude.arousal},...(Object.hasOwn(value,'note')?{note:value.note}:{})};
}
function build(context, request, parent) {
  keys(request,['id','requestId','sceneIndex','assessment','supersedesReviewId']);
  id(request.id); id(request.requestId);
  // Revisions need a managed previous-record lookup and are deliberately deferred to B.
  if (request.supersedesReviewId !== null || !Number.isSafeInteger(request.sceneIndex) || request.sceneIndex < 0 || request.sceneIndex >= parent.scenes.length) reject();
  const scene=parent.scenes[request.sceneIndex];
  const recordDraft={schemaVersion:1,reviewVersion:appraisalReviewVersion,id:request.id,requestId:request.requestId,
    origin:'dream_appraisal_review',materialKind:parent.materialKind,isRealityFact:false,
    sourceRefs:parent.sourceRefs.map(s=>({id:s.id,version:s.version})),derivedFrom:[parent.dreamId],
    parent:{dreamId:parent.dreamId,runId:parent.runId,sceneIndex:request.sceneIndex,protocolVersion:parent.protocolVersion,sceneFingerprint:hash(scene)},
    checkpointCheck:{kind:'canonical_scene_chain',status:'validated_shape_only'},
    reviewer:{actorId:context.reviewer.actorId,kind:context.reviewer.kind},
    assessment:assessmentValue(request.assessment,scene.affectDeclaration.kind),supersedesReviewId:null};
  return {illustrativeOnly:true,runtimeSupported:false,recordDraft};
}
export function buildAppraisalReviewDraft(context, request) {
  jsonData(context); jsonData(request);
  const parent=contextValue(context);
  if (!parent) throw new Error('appraisal_review_parent_unavailable');
  return build(context,request,parent);
}
export function projectAppraisalReviewDraft(context, draft) {
  jsonData(context); jsonData(draft);
  const parent=contextValue(context);
  if (!parent) return null;
  keys(draft,['illustrativeOnly','runtimeSupported','recordDraft']);
  if (draft.illustrativeOnly!==true || draft.runtimeSupported!==false) reject();
  const r=draft.recordDraft;
  keys(r,['schemaVersion','reviewVersion','id','requestId','origin','materialKind','isRealityFact','sourceRefs','derivedFrom','parent','checkpointCheck','reviewer','assessment','supersedesReviewId']);
  const expected=build(context,{id:r.id,requestId:r.requestId,sceneIndex:r.parent?.sceneIndex,assessment:r.assessment,supersedesReviewId:r.supersedesReviewId},parent);
  // Compare JSON data independent of caller key order, rejecting extra/altered metadata.
  const same=(a,b)=>{
    if (a===b) return true;
    if (!a || !b || typeof a!=='object' || typeof b!=='object' || Array.isArray(a)!==Array.isArray(b)) return false;
    const ak=Object.keys(a),bk=Object.keys(b);
    return ak.length===bk.length && ak.every(k=>Object.hasOwn(b,k)&&same(a[k],b[k]));
  };
  if (!same(draft,expected)) reject();
  return structuredClone(expected);
}

// Shared input guard for the managed layer; this does not turn drafts into stored records.
export function assertAppraisalReviewJsonData(value) { jsonData(value); }
