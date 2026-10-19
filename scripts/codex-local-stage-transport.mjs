// Fixed independent Node transport, never an installed Codex binary or subscription.
import {runCodexPipeRehearsal} from './codex-pipe-rehearsal.mjs';
import {assertAppraisalReviewJsonData} from '../src/appraisal-review-memory.js';
export const codexLocalStageTransportVersion='offline-codex-owned-stage-pipe-v1';
const issued=new WeakSet();
export const isCodexLocalStageTransport=value=>issued.has(value);
const fail=()=>{throw Error('invalid_codex_stage_transport');};
function fields(value,allowed){
 if(!value||Object.getPrototypeOf(value)!==Object.prototype||Reflect.ownKeys(value).some(k=>!allowed.includes(k)||!Object.hasOwn(Object.getOwnPropertyDescriptor(value,k),'value')))fail();
}
export function createCodexLocalStageTransport(options){
 fields(options,['model_id','timeoutMs']);
 const {model_id,timeoutMs=10000}=options;
 if(typeof model_id!=='string'||model_id==='unknown'||!/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(model_id)||!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>60000)fail();
 let closed=false,active=null,started=0,settled=0,successful=0;
 const transport=Object.freeze({model_id,protocolVersion:codexLocalStageTransportVersion,
  ready:()=>!closed,
  status:()=>({protocolVersion:codexLocalStageTransportVersion,kind:'independent_node_peer',closed,inFlight:active!==null,exchangesStarted:started,exchangesSettled:settled,successfulChildClosures:successful,externalCallsStarted:0,nativeCodexProcessStarted:false,credentialReads:0,remoteCancellationConfirmed:'unknown'}),
  async exchange(draft,options={}){
   fields(options,['signal']);const {signal}=options;
   if(signal!==undefined&&!(signal instanceof AbortSignal))fail();
   assertAppraisalReviewJsonData(draft);
   if(draft?.model!==model_id)fail();
   if(closed||active)throw Error('adapter_unavailable');
   if(signal?.aborted)throw Error('cancelled');
   const controller=new AbortController(),onAbort=()=>controller.abort();
   signal?.addEventListener('abort',onAbort,{once:true});
   const token={controller,done:null};active=token;started++;
   token.done=(async()=>{
    try{
     const result=await runCodexPipeRehearsal(structuredClone(draft),{signal:controller.signal,timeoutMs});
     if(closed||signal?.aborted||controller.signal.aborted)throw Error('cancelled');
     if(result.syntheticChildClosed!==true||result.dispatchAuthorized!==false)throw Error('invalid_model_response');
     successful++;return result;
    }finally{signal?.removeEventListener('abort',onAbort);settled++;if(active===token)active=null;}
   })();
   return token.done;
  },
  async close(){closed=true;const token=active;if(token){token.controller.abort();try{await token.done;}catch{}}}
 });
 issued.add(transport);return transport;
}
