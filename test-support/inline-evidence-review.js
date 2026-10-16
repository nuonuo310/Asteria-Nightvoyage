// Project-owned pure offline experiment. Never imported by production entries.
import {normalizeBudgetCoupledScene} from '../src/coupled-affect-protocol.js';
import {assertAppraisalReviewJsonData} from '../src/appraisal-review-memory.js';
import {copy,fail} from '../src/store.js';
import {hash} from '../src/contract.js';
export const inlineReviewVersion='offline-inline-evidence-review-v1';
const exact=(v,names)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===names.length&&names.every(k=>Object.hasOwn(v,k));
const bytes=v=>Buffer.byteLength(JSON.stringify(v));
export const fictionalInlineContext=scene=>{assertAppraisalReviewJsonData(scene);return {kind:'scripted_fictional_encoding_fixture',materialKind:'fictional',modelEgress:false,scene:copy(scene)};};
function admitted(fixture){
  try{assertAppraisalReviewJsonData(fixture);}catch{fail('invalid_inline_fixture');}
  if(!exact(fixture,['kind','materialKind','modelEgress','scene'])||fixture.kind!=='scripted_fictional_encoding_fixture'||fixture.materialKind!=='fictional'||fixture.modelEgress!==false)fail('fictional_no_egress_fixture_required');
  return copy(fixture.scene);
}
function checkedBefore(before){
  try{assertAppraisalReviewJsonData(before);}catch{fail('invalid_inline_before');}
  if(!exact(before,['valence','arousal'])||!Number.isFinite(before.valence)||before.valence< -1||before.valence>1||!Number.isFinite(before.arousal)||before.arousal<0||before.arousal>1)fail('invalid_inline_before');
}
function toCompact(raw){
  if(!exact(raw,['event','appraisal','basis','affect'])||!exact(raw.appraisal,['goalEffect','control','uncertainty'])||!exact(raw.basis,['goal','control','uncertainty']))fail('invalid_inline_shape');
  const evidence=[],index=q=>{if(typeof q!=='string'||!q.trim())fail('invalid_inline_excerpt');let i=evidence.indexOf(q);if(i<0){i=evidence.length;evidence.push(q);}return i;};
  const b=raw.basis;let goal=null;
  if(b.goal!==null){if(!Array.isArray(b.goal)||b.goal.length!==2)fail('invalid_inline_goal');goal=b.goal.map(index);}
  const links={goal,control:b.control===null?null:index(b.control),uncertainty:b.uncertainty===null?null:index(b.uncertainty)};
  let affect;
  if(exact(raw.affect,['kind'])&&raw.affect.kind==='unchanged')affect={kind:'unchanged'};
  else if(exact(raw.affect,['kind','delta','excerpt'])&&raw.affect.kind==='estimated')affect={kind:'estimated',delta:copy(raw.affect.delta),evidence:index(raw.affect.excerpt)};
  else fail('invalid_inline_affect');
  return {event:raw.event,appraisal:copy(raw.appraisal),evidence,links,affect};
}
function fromNormalized(v){
  const e=v.appraisalBasis.evidence;
  return {event:v.event,appraisal:copy(v.appraisal),basis:{goal:e.goal===null?null:[e.goal.goalExcerpt,e.goal.outcomeExcerpt],control:e.controlExcerpt,uncertainty:e.uncertaintyExcerpt},
    affect:v.affectDeclaration.kind==='unchanged'?{kind:'unchanged'}:{kind:'estimated',delta:copy(v.delta),excerpt:e.affectExcerpt}};
}
const content=v=>({event:v.event,appraisal:v.appraisal,before:v.before,delta:v.delta,after:v.after,evidence:v.appraisalBasis.evidence,affectDeclaration:v.affectDeclaration});
export function normalizeInlineFixture(fixture,before){
  checkedBefore(before);const raw=admitted(fixture);if(bytes(raw)>1200)fail('inline_output_too_large');
  const value=normalizeBudgetCoupledScene(toCompact(raw),before);value.appraisalBasis.protocolVersion=inlineReviewVersion;return value;
}
export function compareInlineFixture(fixture,before){
  checkedBefore(before);const supplied=admitted(fixture),original=normalizeBudgetCoupledScene(supplied,before),inline=fromNormalized(original),compact=toCompact(inline);
  // Only a validated SCRIPTED old scene can enter this comparison. Not a repair API.
  // Compare meaning-bearing fields; differing program audit counts remain reported.
  const projected=normalizeBudgetCoupledScene(compact,before);if(hash(content(original))!==hash(content(projected)))fail('encoding_projection_changed_content');
  let bounded='accepted';try{normalizeInlineFixture(fictionalInlineContext(inline),before);}catch(e){bounded=e.message;}
  return {schemaVersion:1,protocolVersion:inlineReviewVersion,materialKind:'fictional',origin:'scripted_encoding_comparison',isRealityFact:false,scriptedOnly:true,
    sizes:{suppliedCompactJsonBytes:bytes(supplied),canonicalCompactJsonBytes:bytes(compact),inlineJsonBytes:bytes(inline),inlineMinusCanonicalCompactBytes:bytes(inline)-bytes(compact),limit:1200,units:'UTF-8 JSON bytes; not model tokens'},
    candidateBoundedResult:bounded,contentPreserved:true,sharedQuoteCount:compact.evidence.length,receivedOldQuoteCount:supplied.evidence.length,oldAudit:copy(original.normalizationAudit),inlineAudit:copy(projected.normalizationAudit),
    modelNumericReferencesRequired:0,modelCompliance:'not_assessed',semanticSupport:'not_assessed',qualityAssessed:false};
}
// Existing independent fictional contrasts plus a synthetic size boundary, not model output.
export function sharedQuotationBoundary(){
  const quote='梦里的人想把纸船放进盒子，后来把纸船放进盒子，手指碰到干燥的木沿。'.padEnd(64,'。');
  return {event:quote,appraisal:{goalEffect:1,control:.5,uncertainty:.5},evidence:[quote],links:{goal:[0,0],control:0,uncertainty:0},affect:{kind:'estimated',delta:{valence:.1,arousal:0},evidence:0}};
}
