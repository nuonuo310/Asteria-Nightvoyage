// Fixed metadata only. No response text, exception stack, headers or provider IDs.
import {inlineDiagnostic} from '../src/inline-evidence-protocol.js';
const branded=new WeakMap();
const planChecks=new Set(['plan_incomplete_response','plan_output_shape','plan_content_limit','plan_invalid_json','plan_invalid_usage','plan_stream_closed','plan_invalid_stream','plan_stream_limit','plan_request_too_large','plan_explicit_model_required']);
const httpChecks=new Set(['http_content_type','http_body_missing','http_stream_limit','http_stream_chunk_invalid','http_transport_failure']);
function ownMessage(error){const d=error&&typeof error==='object'?Object.getOwnPropertyDescriptor(error,'message'):null;return d&&'value' in d&&typeof d.value==='string'?d.value:null;}
export function markPlanHttpFailure(error,check){if(error&&typeof error==='object'&&httpChecks.has(check))branded.set(error,{schemaVersion:1,layer:'http',check});return error;}
export function markPlanResponseFailure(error){
  if(!error||typeof error!=='object'||branded.has(error))return error;
  const message=ownMessage(error);if(['cancelled','timeout','authorization_required','adapter_unavailable','budget_exhausted','source_withdrawn','storage_io_failure','ambiguous_attempt'].includes(message))return error;let layer='unclassified',check='unclassified_validation_failure';
  if(planChecks.has(message)){layer='responses_protocol';check=message;}
  else {const inline=inlineDiagnostic(message);if(inline.check!=='unclassified_validation_failure'){layer='dream_stage';check=inline.check;}}
  branded.set(error,{schemaVersion:1,layer,check});return error;
}
export function planResponseDiagnostic(error){const value=error&&typeof error==='object'?branded.get(error):null;return value?{...value}:null;}
// Persisted metadata is rebuilt only from an exact, closed vocabulary. No spreading.
export function reviewedPlanResponseDiagnostic(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return null;
  const descriptors=Object.getOwnPropertyDescriptors(value),keys=Object.keys(descriptors);
  if(keys.length!==3||!['schemaVersion','layer','check'].every(k=>descriptors[k]&&'value' in descriptors[k]))return null;
  const version=descriptors.schemaVersion.value,layer=descriptors.layer.value,check=descriptors.check.value;
  if(version!==1||typeof check!=='string')return null;
  const valid=layer==='http'?httpChecks.has(check):layer==='responses_protocol'?planChecks.has(check):layer==='dream_stage'?inlineDiagnostic(check).check===check&&check!=='unclassified_validation_failure':layer==='unclassified'&&check==='unclassified_validation_failure';
  return valid?{schemaVersion:1,layer,check}:null;
}
