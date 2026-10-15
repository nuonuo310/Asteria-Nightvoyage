// Offline design comparison only: no provider, persistent scene, key or transport.
import { normalizeCompactV2Scene } from './compact-v2-offline.js';
import { compactValidationDiagnostic } from './validation-diagnostic.js';
import { copy, fail } from './store.js';
import { hash } from './contract.js';

export const coupledAffectReviewVersion='offline-coupled-affect-review-v1';
const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
function candidate(raw,before) {
  if(!exact(raw,['event','appraisal','evidence','links','affect'])||!exact(raw.links,['goal','control','uncertainty']))fail('invalid_coupled_scene_shape');
  const a=raw.affect;let delta,reference;
  if(exact(a,['kind'])&&a.kind==='unchanged') {delta={valence:0,arousal:0};reference=null;}
  else if(exact(a,['kind','delta','evidence'])&&a.kind==='estimated'&&exact(a.delta,['valence','arousal'])&&Number.isSafeInteger(a.evidence)&&a.evidence>=0) {
    delta=copy(a.delta);reference=a.evidence;
  } else fail('coupled_affect_shape_invalid');
  // Declared unchanged encodes zero. Never infer a branch or drop supplied fields.
  // Referenced estimates preserve every supplied number; all original v2 guards run.
  return normalizeCompactV2Scene({event:raw.event,appraisal:copy(raw.appraisal),evidence:copy(raw.evidence),
    links:{...copy(raw.links),affect:reference},delta},before);
}
const diagnostic=error=>['invalid_coupled_scene_shape','coupled_affect_shape_invalid'].includes(error?.message)?error.message:compactValidationDiagnostic(error?.message).check;
function evaluate(normalize,raw,before) {
  try {return {value:normalize(raw,before),result:{accepted:true,check:null}};}
  catch(error) {return {value:null,result:{accepted:false,check:diagnostic(error)}};}
}
export function reviewCoupledAffect(input) {
  if(input?.materialKind!=='fictional'||input.origin!=='dream'||input.isRealityFact!==false||
    !Number.isFinite(input.before?.valence)||Math.abs(input.before.valence)>1||
    !Number.isFinite(input.before?.arousal)||input.before.arousal<0||input.before.arousal>1)fail('fictional_review_context_required');
  // Two independently supplied scripted alternatives, never a repair of rejected output.
  const flat=copy(input.flat),coupled=copy(input.coupled),before=copy(input.before);
  const f=evaluate(normalizeCompactV2Scene,flat,before),c=evaluate(candidate,coupled,before),both=!!(f.value&&c.value);
  const bytes=v=>{try{return Buffer.byteLength(JSON.stringify(v),'utf8');}catch{return null;}};
  return {schemaVersion:1,reviewVersion:coupledAffectReviewVersion,origin:'offline_protocol_comparison',materialKind:'fictional',
    generatedEventOrigin:'dream',isRealityFact:false,realModelRequests:0,generatedBodyReturned:false,semanticSupport:'not_assessed',
    modelComplianceImproved:'not_assessed',qualityAssessed:false,flat:f.result,coupled:c.result,
    normalizedEquivalent:both?hash(f.value)===hash(c.value):null,
    sizes:{unit:'UTF-8 JSON bytes; not tokens',flat:bytes(flat),coupled:bytes(coupled)}};
}
