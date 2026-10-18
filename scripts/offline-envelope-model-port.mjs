// Simulator-only extension. No HTTP/OAuth/API fallback or live selection exists here.
export * from './dream-model-port.mjs';
import {FakeAdapter,selectAdapter as selectOriginal,stageRequest,stageResponse} from './dream-model-port.mjs';
import {prepareChatgptPlanRequest} from './chatgpt-plan-protocol.mjs';
import {OfflinePlanEnvelopeStream,offlineEnvelopeVersion} from './offline-plan-envelope.mjs';
import {markPlanResponseFailure} from './plan-response-diagnostic.mjs';
import {hash} from '../src/contract.js';
const fail=code=>{throw Error(code);},selections=new WeakSet();
export const isModelSelection=value=>selections.has(value);
export class OfflineEnvelopePlanAdapter{
 #simulator;
 constructor(options={}){
  if(!options||typeof options!=='object'||![Object.prototype,null].includes(Object.getPrototypeOf(options)))fail('invalid_model_port_contract');
  const d=Object.getOwnPropertyDescriptors(options);
  if(Reflect.ownKeys(d).some(k=>!['model_id','simulator'].includes(k)||!('value' in d[k])||!d[k].enumerable))fail('invalid_model_port_contract');
  const model_id=d.model_id?d.model_id.value:'unknown',simulator=d.simulator?.value;
  if(typeof model_id!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(model_id))fail('explicit_model_required');
  if(simulator!==undefined&&typeof simulator!=='function')fail('invalid_protocol_simulator');
  Object.defineProperties(this,{identity:{value:Object.freeze({adapter_kind:'ChatGPTPlanAdapter',provider_kind:'openai_protocol_simulator',model_id,auth_mode:'synthetic_stub',protocol_version:offlineEnvelopeVersion}),enumerable:true},capabilities:{value:Object.freeze({external_generation:false,stage_schema:'inline-evidence-v1'}),enumerable:true}});
  this.#simulator=simulator;
 }
 preflight(){const ready=!!this.#simulator&&this.identity.model_id!=='unknown';return {ready,reason:ready?'ready':'adapter_unavailable'};}
 prepare(input){if(this.identity.model_id==='unknown')fail('explicit_model_required');const r=stageRequest(input);return prepareChatgptPlanRequest({snapshot:r.snapshot,scenes:r.scenes,stage:r.stage,index:r.index},{model:this.identity.model_id});}
 async generate(input,{signal}={}){
  if(!this.preflight().ready)fail('adapter_unavailable');if(signal?.aborted)fail('cancelled');
  const request=stageRequest(input);
  try{
   const draft=this.prepare(request),chunks=await this.#simulator(structuredClone(draft),{signal}),stream=new OfflinePlanEnvelopeStream(this.identity.model_id);
   for await(const chunk of chunks){if(signal?.aborted)fail('cancelled');stream.push(chunk);}
   if(signal?.aborted)fail('cancelled');const {data,usage}=stream.finish();
   // Counts are a protocol rehearsal audit, not extra fields in the stage contract.
   return stageResponse({value:data,usage:{input_tokens:usage.inputTokens,output_tokens:usage.outputTokens,total_tokens:usage.totalTokens}},request);
  }catch(error){throw markPlanResponseFailure(error);}
 }
}
export function selectAdapter({primary=new FakeAdapter(),fallback=null,fallback_on=[]}={}){
 if(!(primary instanceof OfflineEnvelopePlanAdapter)){const selection=selectOriginal({primary,fallback,fallback_on});selections.add(selection);return selection;}
 if(fallback!==null||!Array.isArray(fallback_on)||fallback_on.length)fail('invalid_fallback_policy');
 const check=primary.preflight(),selection=Object.freeze({adapter:primary,ready:check.ready,reason:check.reason,fallback_from:null,fallback_reason:null,selection_id:hash({identity:primary.identity,fallback_from:null,fallback_reason:null})});selections.add(selection);return selection;
}
