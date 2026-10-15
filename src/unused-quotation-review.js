// Offline comparison only: no generated scene is returned, saved or sent anywhere.
import { normalizeCompactScene } from './compact-appraisal-protocol.js';
import { compactValidationDiagnostic } from './validation-diagnostic.js';
import { copy, fail } from './store.js';
import { hash } from './contract.js';

export const unusedQuotationReviewVersion='unused-quotation-offline-comparison-v1';
const check=error=>compactValidationDiagnostic(error?.message).check;
export function reviewUnusedQuotations(input) {
  if(input?.materialKind!=='fictional'||input.origin!=='dream'||input.isRealityFact!==false||
      !Number.isFinite(input.before?.valence)||Math.abs(input.before.valence)>1||
      !Number.isFinite(input.before?.arousal)||input.before.arousal<0||input.before.arousal>1)fail('fictional_review_context_required');
  const raw=copy(input.raw),before=copy(input.before);
  const envelope={schemaVersion:1,reviewVersion:unusedQuotationReviewVersion,origin:'offline_protocol_comparison',materialKind:'fictional',
    generatedEventOrigin:'dream',isRealityFact:false,realModelRequests:0,generatedBodyReturned:false,semanticSupport:'not_assessed',qualityAssessed:false};
  let strict;
  try {normalizeCompactScene(raw,before);return {...envelope,strict:{accepted:true,check:null},candidate:null};}
  catch(error){strict={accepted:false,check:check(error)};}
  if(strict.check!=='unused_compact_evidence')return {...envelope,strict,candidate:null};
  // Reaching this exact guard means the ORIGINAL validator already checked all
  // table entries (including unused ones), link keys and referenced index bounds.
  // Pruning first would wrongly conceal bad, duplicated or oversized material.
  const used=new Set(raw.links.goal??[]);
  for(const field of ['control','uncertainty','affect'])if(raw.links[field]!==null)used.add(raw.links[field]);
  const order=[...used].sort((a,b)=>a-b),remap=new Map(order.map((old,index)=>[old,index]));
  const index=old=>old===null?null:remap.get(old);
  const candidate={...raw,evidence:order.map(i=>raw.evidence[i]),links:{
    goal:raw.links.goal===null?null:raw.links.goal.map(index),control:index(raw.links.control),
    uncertainty:index(raw.links.uncertainty),affect:index(raw.links.affect)}};
  const changes={removedUnusedQuoteCount:raw.evidence.length-order.length,
    preservesEvent:candidate.event===raw.event,preservesAppraisal:hash(candidate.appraisal)===hash(raw.appraisal),
    preservesDelta:hash(candidate.delta)===hash(raw.delta)};
  try {
    // The ORIGINAL full validator must now pass, including later numeric/basis rules.
    // This is a hypothetical policy comparison, never a replacement live normalizer.
    const value=normalizeCompactScene(candidate,before),quote=i=>i===null?null:raw.evidence[i];
    const expected={goal:raw.links.goal===null?null:{goalExcerpt:quote(raw.links.goal[0]),outcomeExcerpt:quote(raw.links.goal[1])},
      controlExcerpt:quote(raw.links.control),uncertaintyExcerpt:quote(raw.links.uncertainty),affectExcerpt:quote(raw.links.affect)};
    return {...envelope,strict,candidate:{considered:true,accepted:true,check:null,...changes,
      preservesLinkedEvidence:hash(expected)===hash(value.appraisalBasis.evidence)}};
  }catch(error){return {...envelope,strict,candidate:{considered:true,accepted:false,check:check(error),...changes,preservesLinkedEvidence:null}};}
}
