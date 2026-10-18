// Offline closed metadata only. No arbitrary event type, body, identifier or hash of one.
import {hash} from '../src/contract.js';
import {reviewedEventTypes,responseEventCoverage} from './response-event-coverage.mjs';
import {rejectedEventDiagnostic,reviewedRejectedEventDiagnostic,markRejectedEventFailure} from './rejected-event-class.mjs';
export const eventWitnessVersion='closed-response-event-witness-v1';
export const eventWitnessCatalogueHash='051cd44649b7473fe524499a76cba0ba4fa1777c5f15d1419d49ff200f74b096';
if(hash(reviewedEventTypes)!==eventWitnessCatalogueHash)throw Error('event_witness_catalogue_changed');
const codes=new Map(reviewedEventTypes.map((name,i)=>[name,`event_${String(i).padStart(3,'0')}`]));
const names=new Map([...codes].map(([name,code])=>[code,name]));
const namespace=type=>typeof type!=='string'?'invalid':type==='error'?'error':type.startsWith('response.')?'response':'other';
const shape=type=>typeof type!=='string'?'invalid':type===''?'empty':/^[a-z_]+(?:\.[a-z_]+)+$/.test(type)?'lowercase_dotted':'other';
const band=type=>{if(typeof type!=='string')return 'invalid';const n=Buffer.byteLength(type);return n===0?'empty':n<=32?'1_32':n<=96?'33_96':'97_plus';};
const fields=['schemaVersion','policyVersion','catalogueHash','classification','eventCode','route','namespace','typeShape','typeByteBand','ordinal','previousReviewedEventCode'];
function closed(value,fields){
 try{if(!value||typeof value!=='object'||![Object.prototype,null].includes(Object.getPrototypeOf(value)))return null;const d=Object.getOwnPropertyDescriptors(value);if(Reflect.ownKeys(d).length!==fields.length||fields.some(k=>!d[k]||!('value'in d[k])||!d[k].enumerable))return null;return Object.fromEntries(fields.map(k=>[k,d[k].value]));}catch{return null;}
}
export function reviewedEventWitness(value){
 const w=closed(value,fields);if(!w||w.schemaVersion!==1||w.policyVersion!==eventWitnessVersion||w.catalogueHash!==eventWitnessCatalogueHash||!Number.isSafeInteger(w.ordinal)||w.ordinal<1||w.ordinal>1024||(w.previousReviewedEventCode!==null&&!names.has(w.previousReviewedEventCode))||(w.ordinal===1&&w.previousReviewedEventCode!==null))return null;
 if(w.classification==='reviewed_event'){
  const name=names.get(w.eventCode);if(!name||w.route!==responseEventCoverage(name)||w.namespace!==namespace(name)||w.typeShape!==shape(name)||w.typeByteBand!==band(name))return null;
 }else if(w.classification==='outside_catalogue'){
  if(w.eventCode!==null||w.route!=='outside_reviewed_catalogue'||!['response','other'].includes(w.namespace)||!['empty','lowercase_dotted','other'].includes(w.typeShape)||!['empty','1_32','33_96','97_plus'].includes(w.typeByteBand)||(w.typeShape==='empty')!==(w.typeByteBand==='empty')||(w.typeShape==='empty'&&w.namespace!=='other')||(w.typeShape==='lowercase_dotted'&&w.typeByteBand==='empty'))return null;
 }else if(w.classification==='invalid_type'){
  if(w.eventCode!==null||w.route!=='invalid_type'||w.namespace!=='invalid'||w.typeShape!=='invalid'||w.typeByteBand!=='invalid')return null;
 }else return null;
 return w;
}
export class ResponseEventWitness {
 #ordinal=0;#previous=null;
 observe(type){
  if(this.#ordinal>=1024)throw Error('event_witness_limit');
  const eventCode=typeof type==='string'?(codes.get(type)??null):null;
  const w={schemaVersion:1,policyVersion:eventWitnessVersion,catalogueHash:eventWitnessCatalogueHash,classification:eventCode?'reviewed_event':typeof type==='string'?'outside_catalogue':'invalid_type',eventCode,route:responseEventCoverage(type),namespace:namespace(type),typeShape:shape(type),typeByteBand:band(type),ordinal:++this.#ordinal,previousReviewedEventCode:this.#previous};
  if(eventCode)this.#previous=eventCode;return w;
 }
}
// Only static, reviewed names can be resolved. Outside-catalog names are unrecoverable.
export function resolveReviewedEventCode(code){return typeof code==='string'?(names.get(code)??null):null;}
export function eventWitnessDecision(value){
 const w=reviewedEventWitness(value);if(!w)return 'invalid_witness_stop';
 return w.classification==='outside_catalogue'?'provider_contract_unverified_stop':w.classification==='invalid_type'?'malformed_type_stop':'review_named_event_schema';
}
const branded=new WeakMap();
export function eventWitnessFailure(value){
 const w=reviewedEventWitness(value);if(!w)throw Error('invalid_model_response');
 const check=w.classification==='reviewed_event'?'reviewed_unsupported_event':w.classification==='outside_catalogue'?'outside_catalogue_event':'invalid_event_type';
 const error=Error('invalid_model_response');branded.set(error,{schemaVersion:1,layer:'responses_event_witness',check,witness:w});return error;
}
export function eventWitnessDiagnostic(error){const d=branded.get(error);return d?structuredClone(d):rejectedEventDiagnostic(error);}
export function markEventWitnessFailure(error){return branded.has(error)?error:markRejectedEventFailure(error);}
export function reviewedEventWitnessDiagnostic(value){
 const d=closed(value,['schemaVersion','layer','check','witness']);
 if(d?.layer==='responses_event_witness'){
  const w=reviewedEventWitness(d.witness),expected=w?.classification==='reviewed_event'?'reviewed_unsupported_event':w?.classification==='outside_catalogue'?'outside_catalogue_event':'invalid_event_type';
  return d.schemaVersion===1&&w&&d.check===expected?{schemaVersion:1,layer:d.layer,check:d.check,witness:w}:null;
 }
 try{return reviewedRejectedEventDiagnostic(value);}catch{return null;}
}
