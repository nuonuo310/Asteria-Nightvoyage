// Fixed categories for rejected events, not an acceptance policy or provider-body log.
import {envelopeDiagnostic,reviewedEnvelopeDiagnostic,markEnvelopeFailure} from './envelope-diagnostic.mjs';
const categories=new Map([
 ['response.failed','upstream_failed_event'],['response.incomplete','upstream_incomplete_event'],['error','upstream_error_event'],
 ['response.queued','unsupported_queue_event'],['response.output_text.annotation.added','unsupported_annotation_event'],
 ['response.compaction.compacting','unsupported_compaction_event']
]);
export const rejectedEventChecks=Object.freeze([...categories.values(),'unreviewed_event']);
const known=new Set(rejectedEventChecks),branded=new WeakMap();
export function rejectedEventClass(type){return typeof type==='string'?(categories.get(type)??'unreviewed_event'):'unreviewed_event';}
export function rejectedEventFailure(type){
 const error=Error('invalid_model_response');branded.set(error,{schemaVersion:1,layer:'rejected_response_event',check:rejectedEventClass(type)});return error;
}
export function rejectedEventDiagnostic(error){const value=branded.get(error);return value?{...value}:envelopeDiagnostic(error);}
export function markRejectedEventFailure(error){return branded.has(error)?error:markEnvelopeFailure(error);}
export function reviewedRejectedEventDiagnostic(value){
 if(value&&typeof value==='object'&&!Array.isArray(value)){
  const d=Object.getOwnPropertyDescriptors(value),names=Reflect.ownKeys(d);
  if(names.length===3&&['schemaVersion','layer','check'].every(k=>d[k]&&'value' in d[k])&&d.schemaVersion.value===1&&d.layer.value==='rejected_response_event'&&known.has(d.check.value))return {schemaVersion:1,layer:'rejected_response_event',check:d.check.value};
 }
 return reviewedEnvelopeDiagnostic(value);
}
