// Fixed official HTTP/SSE transport. A checked, active OAuth capability is required.
// No environment credentials, API keys, endpoint overrides, tools, retries or refresh.
import {planSessionAvailable,planSessionCredential} from './chatgpt-plan-login.mjs';
import {markPlanHttpFailure} from './plan-response-diagnostic.mjs';
import {chatgptPlanLimits} from './chatgpt-plan-protocol.mjs';
const transports=new WeakSet();
export const planHttpProtocolVersion='chatgpt-plan-inline-http-v1';
export const isPlanHttpTransport=value=>transports.has(value);
const fail=code=>{throw Error(code);};
export function createPlanHttpTransport({session,model,authorize}){
  if(typeof authorize!=='function'||!planSessionAvailable(session,model))fail('authorization_required');
  const started=new Set();
  const transport=Object.freeze({
    model,
    ready:()=>planSessionAvailable(session,model),
    async *stream(draft,request,{signal}={}){
      if(signal?.aborted)fail('cancelled');
      if(!planSessionAvailable(session,model))fail('authorization_required');
      if(draft.endpoint!=='https://api.openai.com/v1/responses'||draft.method!=='POST'||draft.body?.model!==model||draft.body.store!==false||draft.body.stream!==true||Object.keys(draft.body).some(k=>!['model','instructions','input','store','stream'].includes(k)))fail('invalid_model_response');
      const body=JSON.stringify(draft.body);if(Buffer.byteLength(body)>chatgptPlanLimits.requestBytes)fail('budget_exhausted');
      authorize(request);if(signal?.aborted)fail('cancelled');
      if(started.has(request.request_id)||started.size>=3)fail('ambiguous_attempt');
      started.add(request.request_id);
      const controller=new AbortController();let timer,reader,onAbort;
      const stopped=new Promise((_,reject)=>{
        onAbort=()=>{controller.abort();reject(Error('cancelled'));};signal?.addEventListener('abort',onAbort,{once:true});
        timer=setTimeout(()=>{controller.abort();reject(Error('timeout'));},60000);
      });
      const active=()=>{if(signal?.aborted||controller.signal.aborted)fail('cancelled');authorize(request);};
      try{
        const credential=planSessionCredential(session,model);active();
        const response=await Promise.race([fetch('https://api.openai.com/v1/responses',{method:'POST',redirect:'error',headers:{Authorization:`Bearer ${credential}`,'Content-Type':'application/json',Accept:'text/event-stream'},body,signal:controller.signal}),stopped]);
        active();
        if(response.status!==200)fail(response.status===401||response.status===403?'authorization_required':'adapter_unavailable');
        if(!/^text\/event-stream(?:\s*;|$)/i.test(response.headers.get('content-type')??''))throw markPlanHttpFailure(Error('invalid_model_response'),'http_content_type');
        reader=response.body?.getReader();if(!reader)throw markPlanHttpFailure(Error('invalid_model_response'),'http_body_missing');
        let bytes=0;
        for(;;){
          const {done,value}=await Promise.race([reader.read(),stopped]);active();if(done)break;
          if(!(value instanceof Uint8Array))throw markPlanHttpFailure(Error('invalid_model_response'),'http_stream_chunk_invalid');
          if((bytes+=value.byteLength)>chatgptPlanLimits.streamBytes)throw markPlanHttpFailure(Error('invalid_model_response'),'http_stream_limit');
          yield value;
        }
      }catch(error){
        const known=['cancelled','timeout','authorization_required','adapter_unavailable','budget_exhausted','source_withdrawn','storage_io_failure','ambiguous_attempt'];
        if(error?.message==='invalid_model_response')throw error;
        if(known.includes(error?.message))throw error;
        throw markPlanHttpFailure(Error('invalid_model_response'),'http_transport_failure');
      }finally{
        clearTimeout(timer);signal?.removeEventListener('abort',onAbort);controller.abort();
        if(reader){try{const cancellation=reader.cancel();Promise.resolve(cancellation).catch(()=>{});}catch{}try{reader.releaseLock();}catch{}}
      }
    }
  });transports.add(transport);return transport;
}
