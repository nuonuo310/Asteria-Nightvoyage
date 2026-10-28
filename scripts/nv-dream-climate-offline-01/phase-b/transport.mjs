import https from 'node:https';
import {fail} from '../../../src/store.js';
import {assertRequestBounds} from '../protocol.mjs';
import {
  liveEndpoint,liveMaxOutputTokens,liveModelAlias,liveProtocolVersion,
  liveRequestByteLimit,liveTransportTimeoutMs
} from './config.mjs';

const credentialPattern=/^[\x21-\x7e]{1,2000}$/;

export function createDeepSeekTransport(credential,{requestImpl=https.request,timeoutMs=liveTransportTimeoutMs}={}){
  if(typeof credential!=='string'||!credentialPattern.test(credential))fail('credential_required');
  if(typeof requestImpl!=='function'||!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>60000) {
    fail('invalid_dream_climate_live_transport');
  }
  return function transport(request,{signal}={}){
    if(!request||request.endpoint!=='offline://dream-climate-fixture-only'||request.method!=='POST'||
       request.offlineOnly!==true||request.protocolVersion!==liveProtocolVersion||
       request.body?.model!==liveModelAlias||request.body?.max_tokens!==liveMaxOutputTokens||
       request.body?.stream!==false||request.body?.thinking?.type!=='disabled'||
       request.body?.response_format?.type!=='json_object')fail('dream_climate_live_transport_refused');
    if(assertRequestBounds(request)>liveRequestByteLimit)fail('dream_climate_live_request_too_large');
    const payload=Buffer.from(JSON.stringify(request.body),'utf8');
    return new Promise((resolve,reject)=>{
      let settled=false,req;
      const cleanup=()=>signal?.removeEventListener('abort',abort);
      const settle=(failure,value)=>{
        if(settled)return;
        settled=true;cleanup();
        if(failure)reject(value);else resolve(value);
      };
      const abort=()=>{
        try{req?.destroy();}catch{}
        settle(true,Error('cancelled'));
      };
      signal?.addEventListener('abort',abort,{once:true});
      if(signal?.aborted){abort();return;}
      try{
        req=requestImpl(new URL(liveEndpoint),{
          method:'POST',agent:false,
          headers:{'Content-Type':'application/json','Content-Length':payload.byteLength,
            Authorization:`Bearer ${credential}`}
        },response=>{
          const status=response.statusCode;
          if(!Number.isInteger(status)){response.resume?.();settle(true,Error('provider_http_failure'));return;}
          if(status!==200){response.resume?.();settle(false,{status});return;}
          const contentType=String(response.headers?.['content-type']??'');
          if(!contentType.toLowerCase().startsWith('application/json')) {
            response.resume?.();settle(true,Error('provider_http_failure'));return;
          }
          const parts=[];let size=0;
          response.on('data',chunk=>{
            if(settled)return;
            size+=chunk.length;
            if(size>65536){try{req?.destroy();}catch{}settle(true,Error('provider_response_too_large'));return;}
            parts.push(Buffer.from(chunk));
          });
          response.on('error',()=>settle(true,Error('provider_http_failure')));
          response.on('end',()=>{
            if(settled)return;
            const text=Buffer.concat(parts).toString('utf8');
            for(const part of parts)part.fill(0);
            if(text.includes(credential)){settle(true,Error('provider_response_echoed_credential'));return;}
            let body;
            try{body=JSON.parse(text);}catch{settle(true,Error('provider_invalid_json'));return;}
            settle(false,{status,body});
          });
        });
        req.on('error',()=>settle(true,Error(signal?.aborted?'cancelled':'provider_http_failure')));
        req.setTimeout(timeoutMs,()=>{
          settle(true,Error('timeout'));
          try{req.destroy();}catch{}
        });
        req.end(payload);
      }catch{settle(true,Error('provider_http_failure'));}
    });
  };
}
