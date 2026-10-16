// Offline fixture audit, NOT a semantic classifier or production protocol.
import { normalizeBudgetCoupledScene, coupledBudgetDiagnostic } from './coupled-affect-protocol.js';
import { copy, fail } from './store.js';
export const affectSupportContrastVersion='offline-affect-support-contrast-v1';
const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const id=v=>typeof v==='string'&&/^[a-z][a-z0-9-]{0,79}$/.test(v);
const relations=new Set(['interpretable_ambiguous','directly_stated','unrelated','reader_flagged_conflict','not_applicable_unchanged','not_assessed_rejected']);
const directions=new Set(['not_determined','compatible_not_unique','reader_flagged_conflict','not_applicable','not_assessed']);
const transitions=new Set(['limited_confirmation','ordinary_subtle_progress','transformed_with_link']);
const note=v=>typeof v==='string'&&v.length>0&&v.length<=800;
export function auditAffectSupportContrasts(input){
  if(!exact(input,['schemaVersion','kind','license','materialKind','modelEgress','scriptedOnly','before','scenes','transitions'])||input.schemaVersion!==1||input.kind!=='independently_authored_offline_contrasts'||input.license!=='MIT'||input.materialKind!=='fictional'||input.modelEgress!==false||input.scriptedOnly!==true||
    !exact(input.before,['valence','arousal'])||!Number.isFinite(input.before.valence)||Math.abs(input.before.valence)>1||!Number.isFinite(input.before.arousal)||input.before.arousal<0||input.before.arousal>1||!Array.isArray(input.scenes)||input.scenes.length<1||input.scenes.length>30||!Array.isArray(input.transitions)||input.transitions.length>10)fail('fictional_contrast_fixture_required');
  const fixture=copy(input),seen=new Set();
  for(const s of fixture.scenes){
    if(!exact(s,['id','raw','expectedGate','authoredReview'])||!id(s.id)||seen.has(s.id)||!exact(s.expectedGate,['accepted','check'])||typeof s.expectedGate.accepted!=='boolean'||
      !(s.expectedGate.check===null||typeof s.expectedGate.check==='string'&&coupledBudgetDiagnostic(s.expectedGate.check).check===s.expectedGate.check)||
      !exact(s.authoredReview,['evidenceRelation','directionSupport','magnitudeSupport','note'])||!relations.has(s.authoredReview.evidenceRelation)||!directions.has(s.authoredReview.directionSupport)||!['not_established','not_applicable'].includes(s.authoredReview.magnitudeSupport)||!note(s.authoredReview.note))fail('invalid_contrast_annotation');seen.add(s.id);
  }
  for(const s of fixture.transitions){if(!exact(s,['id','events','authoredObservation','note'])||!id(s.id)||seen.has(s.id)||!Array.isArray(s.events)||s.events.length!==2||!s.events.every(x=>typeof x==='string'&&x.length>0&&x.length<=2000)||!transitions.has(s.authoredObservation)||!note(s.note))fail('invalid_contrast_annotation');seen.add(s.id);}
  const results=fixture.scenes.map(s=>{
    let accepted=false,check=null;
    try{normalizeBudgetCoupledScene(s.raw,fixture.before);accepted=true;}catch(error){check=coupledBudgetDiagnostic(error?.message).check;}
    return {caseId:s.id,literalContract:{accepted,check},matchesAuthoredGateExpectation:accepted===s.expectedGate.accepted&&check===s.expectedGate.check,
      authoredReview:{origin:'fixture_author_annotation',isAutomaticJudgment:false,evidenceRelation:s.authoredReview.evidenceRelation,directionSupport:s.authoredReview.directionSupport,magnitudeSupport:s.authoredReview.magnitudeSupport}};
  });
  return {schemaVersion:1,reviewVersion:affectSupportContrastVersion,materialKind:'fictional',generatedEventOrigin:'dream',isRealityFact:false,realModelRequests:0,generatedBodyReturned:false,
    semanticClassifier:false,semanticSupport:'not_automatically_assessed',annotationsVerifiedSemantically:false,qualityAccepted:false,modelComplianceImproved:'not_assessed',
    results,transitionObservations:fixture.transitions.map(s=>({caseId:s.id,origin:'fixture_author_annotation',observation:s.authoredObservation,isAutomaticJudgment:false,qualityRank:null}))};
}
