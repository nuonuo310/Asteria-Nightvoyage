import { coupledBudgetVersion, normalizeBudgetCoupledCheckpoint } from './coupled-affect-protocol.js';
// Derived read view only; never rewrites an original or stores another body cache.
import { Store, copy, fail } from './store.js';
import { hash, neutral, own, safeId } from './contract.js';
import { normalizeAppraisalScene, appraisalProtocolVersion } from './appraisal-rehearsal.js';
import { normalizeCompactCheckpoint, compactProtocolVersion } from './compact-appraisal-protocol.js';
import { normalizeCompactV2Checkpoint, compactV2Version } from './compact-v2-offline.js';
import { normalizePrunedV2Checkpoint, prunedCompactV2Version } from './compact-v2-protocol.js';

import { normalizeCoupledCheckpoint, coupledAffectVersion } from './coupled-affect-offline.js';

export const appraisalViewVersion = 'appraisal-read-view-v1';
const unknown = () => ({status:'not_stated',value:null,evidence:null});
const estimate = (value,evidence) => ({status:'model_estimate',value:copy(value),evidence:copy(evidence)});
export function readAppraisalView(store,entryId) {
  if (!(store instanceof Store)) fail('managed_store_required');
  store.assert();
  if (!safeId(entryId)) fail('invalid_entry_id');
  const entry=own(store.state.entries,entryId);
  if (!entry) return null;
  if (entry.id!==entryId) fail('invalid_appraisal_view_record');
  if (entry.origin!=='dream'||entry.isRealityFact!==false||entry.materialKind!=='fictional') fail('appraisal_view_requires_dream');
  if (entry.sourceRefs.some(s=>store.withdrawn.includes(s.id))) return null;
  const run=own(store.state.runs,entry.runId);
  if (!run||['revoked','deleted'].includes(run.status)||run.sourceIds.some(id=>store.withdrawn.includes(id))) return null;
  // A derived read is stamped from the managed parent, not caller-provided metadata.
  const envelope={schemaVersion:1,viewVersion:appraisalViewVersion,origin:'dream_appraisal_view',materialKind:'fictional',isRealityFact:false,
    sourceRefs:copy(entry.sourceRefs),derivedFrom:[entry.id],semanticSupport:'not_assessed'};
  if (![appraisalProtocolVersion,compactProtocolVersion,compactV2Version,prunedCompactV2Version,coupledAffectVersion,coupledBudgetVersion].includes(run.appraisalProtocolVersion)) return {...envelope,status:'unsupported_protocol',scenes:[]};
  if (run.status!=='completed'||!run.snapshot||!entry.scenes?.length||hash(run.scenes)!==hash(entry.scenes)||
      hash(entry.sourceRefs)!==hash(run.snapshot.sources.map(s=>({id:s.id,version:s.version})))) fail('invalid_appraisal_view_record');
  let before=run.snapshot.channels.affect.value??neutral();
  const scenes=entry.scenes.map((saved,sceneIndex)=>{
    const normalized=run.appraisalProtocolVersion===coupledBudgetVersion?normalizeBudgetCoupledCheckpoint(saved,before):run.appraisalProtocolVersion===coupledAffectVersion?normalizeCoupledCheckpoint(saved,before):run.appraisalProtocolVersion===prunedCompactV2Version?normalizePrunedV2Checkpoint(saved,before):run.appraisalProtocolVersion===compactV2Version?normalizeCompactV2Checkpoint(saved,before):run.appraisalProtocolVersion===compactProtocolVersion?normalizeCompactCheckpoint(saved,before):normalizeAppraisalScene({...saved,basis:saved.appraisalBasis?.evidence},before);
    if (hash(normalized)!==hash(saved)) fail('invalid_appraisal_view_record');
    before=normalized.after;
    const e=normalized.appraisalBasis.evidence;
    return {sceneIndex,event:normalized.event,...(normalized.affectDeclaration?{affectDeclaration:{...copy(normalized.affectDeclaration),origin:'model_declaration',isRealityFact:false,verification:'shape_only'}}:{}),...(normalized.normalizationAudit?{normalizationAudit:copy(normalized.normalizationAudit)}:{}),
      goalEffect:e.goal===null?unknown():estimate(normalized.appraisal.goalEffect,e.goal),
      control:e.controlExcerpt===null?unknown():estimate(normalized.appraisal.control,e.controlExcerpt),
      uncertainty:e.uncertaintyExcerpt===null?unknown():estimate(normalized.appraisal.uncertainty,e.uncertaintyExcerpt),
      affectChange:e.affectExcerpt===null?unknown():estimate(normalized.delta,e.affectExcerpt),
      appliedAffect:{origin:'simulated_affect',isRealityFact:false,before:copy(normalized.before),delta:copy(normalized.delta),after:copy(normalized.after)}};
  });
  return {...envelope,status:'available',protocolVersion:run.appraisalProtocolVersion,scenes};
}
