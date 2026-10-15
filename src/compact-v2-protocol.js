// Versioned gated-core contract. This module never opens transport or reads a key.
import { normalizeCompactV2Scene, normalizeCompactV2Checkpoint, buildCompactV2Request, compactV2Version } from './compact-v2-offline.js';
import { normalizeDeepSeekStage } from './deepseek-protocol.js';
import { compactValidationDiagnostic, reviewedValidationDiagnostic } from './validation-diagnostic.js';
import { copy, fail } from './store.js';

export const prunedCompactV2Version='compact-appraisal-quotes-v2-pruned-unused';
const stamp=(value,version)=>{const result=copy(value);result.appraisalBasis.protocolVersion=version;return result;};
export const normalizePrunedV2Scene=(raw,before)=>stamp(normalizeCompactV2Scene(raw,before),prunedCompactV2Version);
export function normalizePrunedV2Checkpoint(saved,before){
  if(saved?.appraisalBasis?.protocolVersion!==prunedCompactV2Version)fail('invalid_pruned_v2_checkpoint');
  return stamp(normalizeCompactV2Checkpoint(stamp(saved,compactV2Version),before),prunedCompactV2Version);
}
export function buildPrunedV2Request(payload,settings){
  if(!payload||!Array.isArray(payload.scenes))fail('invalid_protocol_input');
  // The underlying builder validates the complete canonical checkpoint chain.
  const offline=payload.scenes.map(s=>{if(s?.appraisalBasis?.protocolVersion!==prunedCompactV2Version)fail('invalid_pruned_v2_checkpoint');return stamp(s,compactV2Version);});
  const request=buildCompactV2Request({...payload,scenes:offline},settings),material=JSON.parse(request.body.messages[1].content);
  material.previousScenes=material.previousScenes.map(s=>stamp(s,prunedCompactV2Version));
  request.body.messages[1].content=JSON.stringify(material);request.protocolVersion=prunedCompactV2Version;return request;
}
export function normalizePrunedV2Stage(data,material){return material.stage==='scene'?normalizePrunedV2Scene(data,material.previousAffect):normalizeDeepSeekStage(data,material);}
export const prunedV2Diagnostic=check=>({...compactValidationDiagnostic(check),protocolVersion:prunedCompactV2Version});
export function reviewedPrunedV2Diagnostic(value){
  if(value?.protocolVersion!==prunedCompactV2Version)return null;
  const old=reviewedValidationDiagnostic({...value,protocolVersion:'compact-appraisal-quotes-v1'});
  return old?{...old,protocolVersion:prunedCompactV2Version}:null;
}
