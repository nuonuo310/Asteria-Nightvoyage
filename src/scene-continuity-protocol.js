// Project-owned candidate: distinct identity, unchanged affect/wake validation.
import {buildBudgetCoupledRequest,normalizeBudgetCoupledScene,normalizeBudgetCoupledCheckpoint,coupledBudgetVersion,coupledBudgetDiagnostic,reviewedCoupledBudgetDiagnostic} from './coupled-affect-protocol.js';
import {sceneContinuityPrompt,sceneContinuityPromptVersion} from './scene-continuity-prompt-text.js';
import {normalizeDeepSeekStage} from './deepseek-protocol.js';
import {hash,neutral,snapshot} from './contract.js';
import {copy,fail} from './store.js';
export const continuityBudgetVersion='scene-continuity-quotes-v1';
export const continuityPromptHash=hash(sceneContinuityPrompt);
export const continuityIdentity=()=>({promptCandidateVersion:sceneContinuityPromptVersion,promptCandidateHash:continuityPromptHash,normalizationPolicyVersion:'validated-unused-quotation-pruning-v1',affectEncodingVersion:'explicit-affect-union-v1',wakePolicyVersion:'saved-scene-excerpt-v1'});
const stamp=(s,version)=>{const v=copy(s);v.appraisalBasis.protocolVersion=version;return v;};
export const normalizeContinuityScene=(raw,before)=>stamp(normalizeBudgetCoupledScene(raw,before),continuityBudgetVersion);
export function normalizeContinuityCheckpoint(saved,before){
  if(saved?.appraisalBasis?.protocolVersion!==continuityBudgetVersion)fail('invalid_continuity_checkpoint');
  const normalized=stamp(normalizeBudgetCoupledCheckpoint(stamp(saved,coupledBudgetVersion),before),continuityBudgetVersion);
  if(hash(normalized)!==hash(saved))fail('invalid_continuity_checkpoint');return normalized;
}
export function buildContinuityRequest(payload,settings){
  if(!payload||!Array.isArray(payload.scenes)||payload.index!==payload.scenes.length||payload.scenes.length>2||!['scene','wake'].includes(payload.stage)||(payload.stage==='scene'&&payload.index>1)||(payload.stage==='wake'&&payload.index!==2))fail('invalid_continuity_stage');
  let before=snapshot(payload.snapshot).channels.affect.value??neutral();
  const scenes=payload.scenes.map(s=>{const v=normalizeContinuityCheckpoint(s,before);before=v.after;return stamp(v,coupledBudgetVersion);});
  const request=buildBudgetCoupledRequest({...payload,scenes},settings),material=JSON.parse(request.body.messages[1].content);
  material.previousScenes=material.previousScenes.map(s=>stamp(s,continuityBudgetVersion));
  request.body.messages[1].content=JSON.stringify(material);
  if(payload.stage==='scene'&&payload.index===1)request.body.messages[0].content+='\n'+sceneContinuityPrompt;
  request.protocolVersion=continuityBudgetVersion;return request;
}
export const normalizeContinuityStage=(raw,material)=>material.stage==='scene'?normalizeContinuityScene(raw,material.previousAffect):normalizeDeepSeekStage(raw,material);
export const continuityDiagnostic=check=>({...coupledBudgetDiagnostic(check),protocolVersion:continuityBudgetVersion});
export function reviewedContinuityDiagnostic(value){
  if(value?.protocolVersion!==continuityBudgetVersion)return null;
  const reviewed=reviewedCoupledBudgetDiagnostic({...value,protocolVersion:coupledBudgetVersion});
  return reviewed?{...reviewed,protocolVersion:continuityBudgetVersion}:null;
}
