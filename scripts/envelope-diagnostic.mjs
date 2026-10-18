// Closed metadata only; original diagnostic vocabulary and pinned history stay intact.
import {markPlanResponseFailure,planResponseDiagnostic,reviewedPlanResponseDiagnostic} from './plan-response-diagnostic.mjs';
export const envelopeChecks=Object.freeze(['invalid_envelope_shape','reasoning_item_shape','reasoning_content_shape','reasoning_encrypted_shape','reasoning_status','invalid_stream_chunk','stream_byte_limit','invalid_utf8','invalid_event_json','event_shape','event_sequence','event_limit','events_after_completion','output_array_shape','duplicate_output_identity','reasoning_item_limit','reasoning_lifecycle','assistant_lifecycle','assistant_message_count','assistant_message_shape','forbidden_output_item','reasoning_event_shape','unknown_event','refusal_output','response_model_mismatch','response_not_completed','trailing_or_incomplete_stream']);
const known=new Set(envelopeChecks),branded=new WeakMap();
export function envelopeFailure(check){const error=Error('invalid_model_response');branded.set(error,{schemaVersion:1,layer:'responses_envelope',check:known.has(check)?check:'invalid_envelope_shape'});return error;}
export function markEnvelopeFailure(error){if(branded.has(error))return error;return markPlanResponseFailure(error);}
export function envelopeDiagnostic(error){const value=branded.get(error);return value?{...value}:planResponseDiagnostic(error);}
export function reviewedEnvelopeDiagnostic(value){
 if(value&&typeof value==='object'&&!Array.isArray(value)){
  const d=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(d);
  if(keys.length===3&&['schemaVersion','layer','check'].every(k=>d[k]&&'value' in d[k])&&d.schemaVersion.value===1&&d.layer.value==='responses_envelope'&&known.has(d.check.value))return {schemaVersion:1,layer:'responses_envelope',check:d.check.value};
 }
 return reviewedPlanResponseDiagnostic(value);
}
