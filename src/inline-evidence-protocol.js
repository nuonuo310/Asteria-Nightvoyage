// Project-owned direct-quotation wire. Production core, currently stub-only.
import {normalizeBudgetCoupledScene,coupledBudgetDiagnostic,reviewedCoupledBudgetDiagnostic,coupledBudgetVersion} from './coupled-affect-protocol.js';
import {assertAppraisalReviewJsonData} from './appraisal-review-memory.js';
import {buildDeepSeekRequest,normalizeDeepSeekStage} from './deepseek-protocol.js';
import {sceneContinuityPrompt} from './scene-continuity-prompt-text.js';
import {hash,snapshot,neutral} from './contract.js';
import {copy,fail} from './store.js';
export const inlineProtocolVersion='inline-evidence-quotes-v1';
const exact=(v,names)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===names.length&&names.every(k=>Object.hasOwn(v,k));
const rules=[
  'Return exactly event, appraisal, basis and affect. No evidence table, links or numeric evidence references. No explanations or hidden reasoning.',
  'basis contains exactly goal, control and uncertainty. goal is null or [exactGoalText,exactOutcomeText]; control and uncertainty are null or exact event text.',
  'Use goalEffect:0 and basis.goal:null without a stated goal effect. Nonzero goalEffect requires both exact goal and outcome quotations. Mystery alone is not goal damage.',
  'Null control/uncertainty basis requires value 0.5 as UNKNOWN placeholder; another numeric value requires a quotation.',
  'affect is exactly {"kind":"unchanged"}, or {"kind":"estimated","delta":{"valence":0.1,"arousal":0},"excerpt":"exact current event text"}. Estimated zero also requires an excerpt. Never infer unchanged merely to omit evidence.',
  'Every non-null excerpt must be a nonblank exact contiguous quote from this event, at most 64 Unicode codepoints; repeat the exact text when fields share evidence. No offsets or automatic repairs.',
  'Keep event and every quotation within the same 400-token/1200-JSON-byte cap. Literal quotes do not establish semantic support. No scene invented merely to justify a number.'
];
export const inlineIdentity=()=>({promptCandidateHash:hash({rules,secondScene:sceneContinuityPrompt}),evidenceEncodingVersion:'direct-quotation-interning-v1',affectEncodingVersion:'explicit-affect-union-v1',wakePolicyVersion:'saved-scene-excerpt-v1'});
function compact(raw){
  if(!exact(raw,['event','appraisal','basis','affect'])||!exact(raw.appraisal,['goalEffect','control','uncertainty'])||!exact(raw.basis,['goal','control','uncertainty']))fail('invalid_inline_shape');
  const evidence=[];let supplied=0;const index=q=>{if(typeof q!=='string'||!q.trim())fail('invalid_inline_excerpt');supplied++;let n=evidence.indexOf(q);if(n<0){n=evidence.length;evidence.push(q);}return n;};
  const b=raw.basis;let goal=null;
  if(b.goal!==null){if(!Array.isArray(b.goal)||b.goal.length!==2)fail('invalid_inline_goal');goal=b.goal.map(index);}
  const links={goal,control:b.control===null?null:index(b.control),uncertainty:b.uncertainty===null?null:index(b.uncertainty)};let affect;
  if(exact(raw.affect,['kind'])&&raw.affect.kind==='unchanged')affect={kind:'unchanged'};
  else if(exact(raw.affect,['kind','delta','excerpt'])&&raw.affect.kind==='estimated')affect={kind:'estimated',delta:copy(raw.affect.delta),evidence:index(raw.affect.excerpt)};
  else fail('invalid_inline_affect');
  return {value:{event:raw.event,appraisal:copy(raw.appraisal),evidence,links,affect},supplied};
}
export function normalizeInlineScene(raw,before){
  try{assertAppraisalReviewJsonData(raw);assertAppraisalReviewJsonData(before);}catch{fail('invalid_inline_json_data');}
  if(!exact(before,['valence','arousal'])||!Number.isFinite(before.valence)||before.valence< -1||before.valence>1||!Number.isFinite(before.arousal)||before.arousal<0||before.arousal>1)fail('invalid_inline_before');
  if(Buffer.byteLength(JSON.stringify(raw))>1200)fail('inline_output_too_large');
  const projected=compact(raw),value=normalizeBudgetCoupledScene(projected.value,before);value.appraisalBasis.protocolVersion=inlineProtocolVersion;
  value.inlineEvidenceAudit={schemaVersion:1,policyVersion:'direct-quotation-interning-v1',suppliedQuotedFields:projected.supplied,internedUniqueQuotes:projected.value.evidence.length};return value;
}
function wire(saved){const e=saved.appraisalBasis.evidence;return {event:saved.event,appraisal:copy(saved.appraisal),basis:{goal:e.goal===null?null:[e.goal.goalExcerpt,e.goal.outcomeExcerpt],control:e.controlExcerpt,uncertainty:e.uncertaintyExcerpt},affect:saved.affectDeclaration.kind==='unchanged'?{kind:'unchanged'}:{kind:'estimated',delta:copy(saved.delta),excerpt:e.affectExcerpt}};}
export function normalizeInlineCheckpoint(saved,before){
  let value;try{assertAppraisalReviewJsonData(saved);if(saved?.appraisalBasis?.protocolVersion!==inlineProtocolVersion)fail('invalid_inline_checkpoint');value=normalizeInlineScene(wire(saved),before);}catch{fail('invalid_inline_checkpoint');}
  if(hash(value)!==hash(saved))fail('invalid_inline_checkpoint');return value;
}
export function buildInlineRequest(payload,settings){
  try{assertAppraisalReviewJsonData(payload);}catch{fail('invalid_inline_json_data');}
  if(!exact(payload,['snapshot','scenes','stage','index'])||!Array.isArray(payload.scenes)||payload.scenes.length>2||payload.index!==payload.scenes.length||!['scene','wake'].includes(payload.stage)||(payload.stage==='scene'&&payload.index>1)||(payload.stage==='wake'&&payload.index!==2))fail('invalid_inline_stage');
  if(settings?.model!=='deepseek-flash'||settings.maxOutputTokens!==400)fail('invalid_inline_settings');
  const input=snapshot(payload.snapshot);let before=input.channels.affect.value??neutral();const scenes=payload.scenes.map(s=>{const value=normalizeInlineCheckpoint(s,before);before=value.after;return value;});
  const request=buildDeepSeekRequest({...payload,snapshot:input,scenes},settings),material=JSON.parse(request.body.messages[1].content);material.previousScenes=scenes;request.body.messages[1].content=JSON.stringify(material);
  if(payload.stage==='scene'){
    const example={event:'梦里的人望着桌边的纸片。',appraisal:{goalEffect:0,control:.5,uncertainty:.5},basis:{goal:null,control:null,uncertainty:null},affect:{kind:'unchanged'}};
    request.body.messages[0].content=request.body.messages[0].content.split('\n').filter(l=>!l.startsWith('JSON shape example:')).concat(rules,`JSON shape example: ${JSON.stringify(example)}`,...(payload.index===1?[sceneContinuityPrompt]:[])).join('\n');
  }
  request.protocolVersion=inlineProtocolVersion;if(Buffer.byteLength(JSON.stringify(request.body))>65536)fail('request_too_large');return request;
}
export const normalizeInlineStage=(raw,material)=>material.stage==='scene'?normalizeInlineScene(raw,material.previousAffect):normalizeDeepSeekStage(raw,material);
const ownChecks=new Set(['invalid_inline_shape','invalid_inline_excerpt','invalid_inline_goal','invalid_inline_affect','invalid_inline_json_data','invalid_inline_before','inline_output_too_large']);
export const inlineDiagnostic=check=>({schemaVersion:1,protocolVersion:inlineProtocolVersion,stage:'scene',check:ownChecks.has(check)?check:coupledBudgetDiagnostic(check).check});
export function reviewedInlineDiagnostic(value){
  if(value?.schemaVersion!==1||value.protocolVersion!==inlineProtocolVersion||value.stage!=='scene'||typeof value.check!=='string')return null;
  return ownChecks.has(value.check)||reviewedCoupledBudgetDiagnostic({...value,protocolVersion:coupledBudgetVersion})?inlineDiagnostic(value.check):null;
}
