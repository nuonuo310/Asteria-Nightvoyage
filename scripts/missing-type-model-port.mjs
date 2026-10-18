// Versioned extension. The original port/transport stay unchanged for pinned history.
export * from './dream-model-port.mjs';
import {FakeAdapter,selectAdapter as selectOriginal,stageRequest,stageResponse} from './dream-model-port.mjs';
import {prepareChatgptPlanRequest,ChatgptPlanStream} from './chatgpt-plan-protocol.mjs';
import {markPlanResponseFailure} from './plan-response-diagnostic.mjs';
import {isMissingTypeHttpTransport,missingTypeHttpProtocolVersion} from './missing-type-plan-http.mjs';
import {hash} from '../src/contract.js';
const fail=code=>{throw Error(code);},selections=new WeakSet();
export const isModelSelection=value=>selections.has(value);
export class MissingTypePlanAdapter {
 #simulator;#http;
 constructor({model_id='unknown',simulator,httpTransport}={}){
  if(typeof model_id!=='string'||! /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(model_id))fail('explicit_model_required');
  if(simulator!==undefined&&typeof simulator!=='function')fail('invalid_protocol_simulator');
  if(httpTransport!==undefined&&(!isMissingTypeHttpTransport(httpTransport)||httpTransport.model!==model_id||simulator))fail('unreviewed_model_adapter');
  Object.defineProperties(this,{identity:{value:Object.freeze({adapter_kind:'ChatGPTPlanAdapter',provider_kind:simulator?'openai_protocol_simulator':'openai',model_id,auth_mode:simulator?'synthetic_stub':'chatgpt_plan',protocol_version:simulator?'offline-chatgpt-plan-missing-type-v1':missingTypeHttpProtocolVersion}),enumerable:true},capabilities:{value:Object.freeze({external_generation:!simulator,stage_schema:'inline-evidence-v1'}),enumerable:true}});this.#simulator=simulator;this.#http=httpTransport;
 }
 preflight(){const ready=(!!this.#simulator||this.#http?.ready()===true)&&this.identity.model_id!=='unknown';return {ready,reason:ready?'ready':'authorization_required'};}
 prepare(input){if(this.identity.model_id==='unknown')fail('explicit_model_required');const r=stageRequest(input);return prepareChatgptPlanRequest({snapshot:r.snapshot,scenes:r.scenes,stage:r.stage,index:r.index},{model:this.identity.model_id});}
 async generate(input,{signal}={}){
  if(!this.preflight().ready)fail('authorization_required');const request=stageRequest(input);if(signal?.aborted)fail('cancelled');
  try{const draft=this.prepare(request),chunks=this.#http?this.#http.stream(draft,request,{signal}):await this.#simulator(structuredClone(draft),{signal}),stream=new ChatgptPlanStream(this.identity.model_id);
   for await(const chunk of chunks){if(signal?.aborted)fail('cancelled');stream.push(chunk);}if(signal?.aborted)fail('cancelled');const {data,usage}=stream.finish();return stageResponse({value:data,usage:{input_tokens:usage.inputTokens,output_tokens:usage.outputTokens,total_tokens:usage.totalTokens}},request);
  }catch(error){throw markPlanResponseFailure(error);}
 }
}
export function selectAdapter({primary=new FakeAdapter(),fallback=null,fallback_on=[]}={}){
 if(!(primary instanceof MissingTypePlanAdapter)){const selected=selectOriginal({primary,fallback,fallback_on});selections.add(selected);return selected;}
 // This candidate never selects a second provider or adopts a retry/fallback policy.
 if(fallback!==null||!Array.isArray(fallback_on)||fallback_on.length)fail('invalid_fallback_policy');
 const check=primary.preflight(),selected=Object.freeze({adapter:primary,ready:check.ready,reason:check.reason,fallback_from:null,fallback_reason:null,selection_id:hash({identity:primary.identity,fallback_from:null,fallback_reason:null})});selections.add(selected);return selected;
}
