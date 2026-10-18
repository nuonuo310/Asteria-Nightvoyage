// Trusted simulator callbacks only. No OAuth, native transport, CLI grant or API fallback.
export {dreamModelPortVersion,stageRequest,stageResponse,validateStageResponse,jsonFields,portError,FakeAdapter} from './dream-model-port.mjs';
import {FakeAdapter,selectAdapter as selectOriginal,stageRequest,stageResponse} from './dream-model-port.mjs';
import {prepareChatgptPlanRequest} from './chatgpt-plan-protocol.mjs';
import {OfflineEventWitnessEnvelopeStream,offlineEnvelopeVersion} from './offline-event-witness-envelope.mjs';
import {markEventWitnessFailure as markEnvelopeFailure} from './response-event-witness.mjs';
import {hash} from '../src/contract.js';
const fail=code=>{throw Error(code);},selections=new WeakSet();
export const isModelSelection=value=>selections.has(value);
function fields(options,allowed){
 if(!options||typeof options!=='object'||![Object.prototype,null].includes(Object.getPrototypeOf(options)))fail('invalid_model_port_contract');
 const descriptors=Object.getOwnPropertyDescriptors(options);
 if(Reflect.ownKeys(descriptors).some(k=>!allowed.includes(k)||!('value' in descriptors[k])||!descriptors[k].enumerable))fail('invalid_model_port_contract');
 return descriptors;
}
export class OfflineEventWitnessPlanAdapter{
 #simulator;
 constructor(options={}){
  const d=fields(options,['model_id','simulator']),model=d.model_id?d.model_id.value:'unknown',simulator=d.simulator?.value;
  if(typeof model!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(model))fail('explicit_model_required');
  if(simulator!==undefined&&typeof simulator!=='function')fail('invalid_protocol_simulator');
  Object.defineProperties(this,{identity:{value:Object.freeze({adapter_kind:'ChatGPTPlanAdapter',provider_kind:'openai_protocol_simulator',model_id:model,auth_mode:'synthetic_stub',protocol_version:offlineEnvelopeVersion}),enumerable:true},capabilities:{value:Object.freeze({external_generation:false,stage_schema:'inline-evidence-v1'}),enumerable:true}});
  this.#simulator=simulator;
 }
 preflight(){const ready=!!this.#simulator&&this.identity.model_id!=='unknown';return {ready,reason:ready?'ready':'adapter_unavailable'};}
 prepare(input){if(this.identity.model_id==='unknown')fail('explicit_model_required');const r=stageRequest(input);return prepareChatgptPlanRequest({snapshot:r.snapshot,scenes:r.scenes,stage:r.stage,index:r.index},{model:this.identity.model_id});}
 async generate(input,{signal}={}){
  if(!this.preflight().ready)fail('adapter_unavailable');if(signal?.aborted)fail('cancelled');
  const request=stageRequest(input);
  try{
   const draft=this.prepare(request),chunks=await this.#simulator(structuredClone(draft),{signal}),decoder=new OfflineEventWitnessEnvelopeStream(this.identity.model_id);
   for await(const chunk of chunks){if(signal?.aborted)fail('cancelled');decoder.push(chunk);}
   if(signal?.aborted)fail('cancelled');const {data,usage}=decoder.finish();
   return stageResponse({value:data,usage:{input_tokens:usage.inputTokens,output_tokens:usage.outputTokens,total_tokens:usage.totalTokens}},request);
  }catch(error){throw markEnvelopeFailure(error);}
 }
}
export function selectAdapter(options={}){
 const d=fields(options,['primary','fallback','fallback_on']),primary=d.primary?d.primary.value:new FakeAdapter(),fallback=d.fallback?d.fallback.value:null,fallback_on=d.fallback_on?d.fallback_on.value:[];
 if(fallback!==null||!Array.isArray(fallback_on)||fallback_on.length)fail('invalid_fallback_policy');
 // The candidate selector cannot adopt old/native subscription or legacy API adapters.
 if(!(primary instanceof OfflineEventWitnessPlanAdapter)&&!(primary instanceof FakeAdapter))fail('invalid_model_selection');
 if(primary instanceof FakeAdapter){const selected=selectOriginal({primary});selections.add(selected);return selected;}
 const check=primary.preflight(),selection=Object.freeze({adapter:primary,ready:check.ready,reason:check.reason,fallback_from:null,fallback_reason:null,selection_id:hash({identity:primary.identity,fallback_from:null,fallback_reason:null})});selections.add(selection);return selection;
}
