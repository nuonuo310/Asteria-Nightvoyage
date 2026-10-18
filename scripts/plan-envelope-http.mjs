// Dedicated one-response metadata observer. Never releases inference output.
import {planSessionAvailable,planSessionCredential} from './chatgpt-plan-login.mjs';
import {planEnvelopeReview,reviewedPlanEnvelopeReview} from './plan-envelope-review.mjs';
const fail=code=>{throw Error(code);};
const observations=new WeakMap();
export function envelopeObservation(error){const value=error&&typeof error==='object'?observations.get(error):null;return value?structuredClone(value):null;}
export function reviewedEnvelopeObservation(value){
 if(!value||typeof value!=='object'||Array.isArray(value))return null;const d=Object.getOwnPropertyDescriptors(value);
 if(Object.keys(d).length!==2||!d.readOutcome||!('value' in d.readOutcome)||!d.review||!('value' in d.review)||!['headers_only_sse','body_complete','body_missing','byte_limit','timeout','cancelled','transport_failure'].includes(d.readOutcome.value))return null;
 const review=reviewedPlanEnvelopeReview(d.review.value);return review?{readOutcome:d.readOutcome.value,review}:null;
}
export function createPlanEnvelopeObserver({session,authorize}){
 if(typeof authorize!=='function'||!planSessionAvailable(session,'gpt-5.6-sol'))fail('authorization_required');let used=false;
 return Object.freeze({async observe(draft,{signal}={}){
  if(signal?.aborted)fail('cancelled');if(used)fail('ambiguous_attempt');
  if(draft?.endpoint!=='https://api.openai.com/v1/responses'||draft.method!=='POST'||draft.body?.model!=='gpt-5.6-sol'||draft.body.store!==false||draft.body.stream!==true||Object.keys(draft.body).some(k=>!['model','instructions','input','store','stream'].includes(k)))fail('invalid_model_response');
  const body=JSON.stringify(draft.body);if(Buffer.byteLength(body)>65536)fail('budget_exhausted');authorize();used=true;
  const controller=new AbortController();let timer,onAbort,reader,stopReason=null,review=null;
  const stopped=new Promise((_,reject)=>{const stop=code=>{stopReason=code;controller.abort();reject(Error(code));};onAbort=()=>stop('cancelled');signal?.addEventListener('abort',onAbort,{once:true});timer=setTimeout(()=>stop('timeout'),60000);});
  const active=()=>{if(signal?.aborted)fail('cancelled');if(stopReason)fail(stopReason);authorize();};
  try{
   active();const credential=planSessionCredential(session,'gpt-5.6-sol');
   const response=await Promise.race([fetch('https://api.openai.com/v1/responses',{method:'POST',redirect:'error',headers:{Authorization:`Bearer ${credential}`,'Content-Type':'application/json',Accept:'text/event-stream'},body,signal:controller.signal}),stopped]);active();
   const contentType=response.headers.get('content-type'),httpStatus=response.status;review=planEnvelopeReview({httpStatus,contentType});
   if(review.mediaClass==='event_stream')return {readOutcome:'headers_only_sse',review};
   reader=response.body?.getReader();if(!reader)return {readOutcome:'body_missing',review};
   const chunks=[];let size=0;
   for(;;){const {done,value}=await Promise.race([reader.read(),stopped]);active();if(done)break;if(!(value instanceof Uint8Array))fail('invalid_model_response');if(size+value.byteLength>8192)return {readOutcome:'byte_limit',review:planEnvelopeReview({httpStatus,contentType,body:new Uint8Array(8193)})};size+=value.byteLength;chunks.push(value);}
   active();review=planEnvelopeReview({httpStatus,contentType,body:Buffer.concat(chunks,size)});return {readOutcome:'body_complete',review};
  }catch(error){const known=['cancelled','timeout','authorization_required','budget_exhausted','source_withdrawn','storage_io_failure','ambiguous_attempt'];const code=stopReason??(known.includes(error?.message)?error.message:'invalid_model_response'),failure=Error(code);if(review)observations.set(failure,{readOutcome:code==='timeout'?'timeout':code==='cancelled'?'cancelled':'transport_failure',review});throw failure;}
  finally{clearTimeout(timer);signal?.removeEventListener('abort',onAbort);controller.abort();if(reader){try{Promise.resolve(reader.cancel()).catch(()=>{});}catch{}try{reader.releaseLock();}catch{}}}
 }});
}
