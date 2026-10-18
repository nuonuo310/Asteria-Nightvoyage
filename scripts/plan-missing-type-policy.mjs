// Offline compatibility candidate: admission to an existing strict decoder only.
// Not a fetch transport, live adapter, completion proof or inference permission.
const fail=code=>{throw Error(code);};
export function planMissingTypePolicy(input){
 if(!input||typeof input!=='object'||Array.isArray(input))fail('media_policy_invalid');
 const d=Object.getOwnPropertyDescriptors(input),keys=['httpStatus','contentType','allowMissingContentType'];
 if(Object.keys(d).length!==keys.length||keys.some(k=>!d[k]||!('value' in d[k])))fail('media_policy_invalid');
 const {httpStatus,contentType,allowMissingContentType}=Object.fromEntries(keys.map(k=>[k,d[k].value]));
 if(typeof allowMissingContentType!=='boolean'||(contentType!==null&&typeof contentType!=='string')||(typeof contentType==='string'&&contentType.length>256))fail('media_policy_invalid');
 if(httpStatus!==200)fail('media_policy_http_status');
 const missing=contentType===null||contentType==='';
 if(missing&&!allowMissingContentType)fail('media_policy_content_type_required');
 if(!missing&&!/^text\/event-stream(?:\s*;|$)/i.test(contentType))fail('media_policy_explicit_type_rejected');
 return {policyVersion:'offline-missing-content-type-sse-candidate-v1',mediaClass:missing?'missing':'event_stream',missingHeaderCompatibilityUsed:missing,completeStreamValidationRequired:true,dreamStageValidationRequired:true,protocolLimitsChanged:false,inferenceAccepted:false,dispatchEnabled:false};
}
