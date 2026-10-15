// Distinct gated-core contract; no credential, allowance creation or transport here.
import { normalizeCoupledScene, normalizeCoupledCheckpoint, buildCoupledRequest, coupledAffectVersion } from './coupled-affect-offline.js';
import { normalizeDeepSeekStage } from './deepseek-protocol.js';
import { compactValidationDiagnostic, reviewedValidationDiagnostic } from './validation-diagnostic.js';
import { copy, fail } from './store.js';
export const coupledBudgetVersion='coupled-affect-quotes-v1';
const stamp=(value,version)=>{const result=copy(value);result.appraisalBasis.protocolVersion=version;return result;};
export const normalizeBudgetCoupledScene=(raw,before)=>stamp(normalizeCoupledScene(raw,before),coupledBudgetVersion);
export function normalizeBudgetCoupledCheckpoint(saved,before) {
  if(saved?.appraisalBasis?.protocolVersion!==coupledBudgetVersion)fail('invalid_budget_coupled_checkpoint');
  return stamp(normalizeCoupledCheckpoint(stamp(saved,coupledAffectVersion),before),coupledBudgetVersion);
}
export function buildBudgetCoupledRequest(payload,settings) {
  if(!payload||!Array.isArray(payload.scenes))fail('invalid_protocol_input');
  const scenes=payload.scenes.map(s=>{if(s?.appraisalBasis?.protocolVersion!==coupledBudgetVersion)fail('invalid_budget_coupled_checkpoint');return stamp(s,coupledAffectVersion);});
  const request=buildCoupledRequest({...payload,scenes},settings),material=JSON.parse(request.body.messages[1].content);
  material.previousScenes=material.previousScenes.map(s=>stamp(s,coupledBudgetVersion));
  request.body.messages[1].content=JSON.stringify(material);request.protocolVersion=coupledBudgetVersion;return request;
}
export const normalizeBudgetCoupledStage=(data,material)=>material.stage==='scene'?normalizeBudgetCoupledScene(data,material.previousAffect):normalizeDeepSeekStage(data,material);
const ownChecks=new Set(['invalid_coupled_scene_shape','coupled_affect_shape_invalid']);
export function coupledBudgetDiagnostic(check) {
  return {schemaVersion:1,protocolVersion:coupledBudgetVersion,stage:'scene',check:ownChecks.has(check)?check:compactValidationDiagnostic(check).check};
}
export function reviewedCoupledBudgetDiagnostic(value) {
  if(value?.schemaVersion!==1||value.protocolVersion!==coupledBudgetVersion||value.stage!=='scene'||typeof value.check!=='string')return null;
  return ownChecks.has(value.check)||reviewedValidationDiagnostic({...value,protocolVersion:'compact-appraisal-quotes-v1'})?coupledBudgetDiagnostic(value.check):null;
}
