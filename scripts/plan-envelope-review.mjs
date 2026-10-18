// Non-dispatchable HTTP envelope review for independent offline fixtures.
// No fetch, credentials, filesystem, body return, inference acceptance or billing claim.
const limit=8192;
const codes=new Set(['subscription_sharing_user_not_eligible','subscription_sharing_usage_limit_exceeded','subscription_sharing_usage_unavailable','subscription_sharing_unsupported_capability','subscription_sharing_route_not_supported','subscription_sharing_invalid_user','chatpass_v2_scope_not_authorized','chatpass_v2_invalid_authorization_context','subscription_sharing_user_unavailable']);
const mediaTypes=new Map([['text/event-stream','event_stream'],['application/json','json'],['application/problem+json','problem_json'],['text/html','html'],['text/plain','plain']]);
const params=new Set(['model','input','instructions','store','stream','background','conversation','max_output_tokens','max_tool_calls','metadata','moderation','multi_agent','prompt','prompt_cache_retention','safety_identifier','temperature','top_logprobs','top_p','truncation','user','tools','previous_response_id']);
export function planEnvelopeReview({httpStatus,contentType,body}={}){
 let media='other';
 if(contentType===null||contentType===undefined||contentType==='')media='missing';
 else if(typeof contentType==='string'&&contentType.length<=256){const mime=contentType.split(';',1)[0].trim().toLowerCase();media=mediaTypes.get(mime)??'other';}
 const out={reviewVersion:'offline-plan-envelope-review-v1',httpStatus:Number.isInteger(httpStatus)&&httpStatus>=100&&httpStatus<=599?httpStatus:null,mediaClass:media,bodyShape:'not_read',errorCode:null,errorParam:null,bodyReturned:false,inferenceAccepted:false,dispatchEnabled:false,usage:'unknown',qualityAssessed:false};
 if(body===undefined)return out;
 if(!(body instanceof Uint8Array)){out.bodyShape='invalid_input';return out;}
 if(body.byteLength>limit){out.bodyShape='over_limit';return out;}
 let text;try{text=new TextDecoder('utf-8',{fatal:true}).decode(body);}catch{out.bodyShape='invalid_utf8';return out;}
 if(!text.trim()){out.bodyShape='empty';return out;}
 const trimmed=text.trimStart();
 if(/^<(?:!doctype\s+html|html)(?:\s|>)/i.test(trimmed)){out.bodyShape='html_like';return out;}
 if(/^(?:event:|data:|:)/.test(trimmed)){out.bodyShape='sse_like';return out;}
 let value;try{value=JSON.parse(text);}catch{out.bodyShape='unparsed_text';return out;}
 if(value===null||typeof value!=='object'||Array.isArray(value)){out.bodyShape='json_nonobject';return out;}
 if(Object.hasOwn(value,'error')&&value.error&&typeof value.error==='object'&&!Array.isArray(value.error)){
  out.bodyShape='json_error';out.errorCode=codes.has(value.error.code)?value.error.code:'unknown';out.errorParam=value.error.param===null?null:params.has(value.error.param)?value.error.param:'unknown';
 }else if(Object.hasOwn(value,'detail'))out.bodyShape='json_detail';
 else if(value.object==='response')out.bodyShape='json_response';
 else out.bodyShape='json_other';
 return out;
}
