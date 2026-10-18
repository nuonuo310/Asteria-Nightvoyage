// Native component only. A separately gated trial/authorization owner is still required.
export * from './offline-aggregate-model-port.mjs';
import {selectAdapter as selectOffline,stageRequest,stageResponse} from './offline-aggregate-model-port.mjs';
import {prepareChatgptPlanRequest} from './chatgpt-plan-protocol.mjs';
import {OfflineAggregateEnvelopeStream} from './offline-aggregate-envelope.mjs';
import {isAggregateHttpTransport,aggregateHttpProtocolVersion} from './aggregate-plan-http.mjs';
import {markEnvelopeFailure as markPlanResponseFailure} from './envelope-diagnostic.mjs';
import {hash} from '../src/contract.js';
const fail=code=>{throw Error(code);},selections=new WeakSet();
export const isModelSelection=value=>selections.has(value);
export class AggregatePlanAdapter{
 #http;
 constructor(options={}){
  if(!options||typeof options!=='object'||![Object.prototype,null].includes(Object.getPrototypeOf(options)))fail('unreviewed_model_adapter');
  const d=Object.getOwnPropertyDescriptors(options);
  if(Reflect.ownKeys(d).some(k=>!['model_id','httpTransport'].includes(k)||!('value' in d[k])||!d[k].enumerable))fail('unreviewed_model_adapter');
  const model=d.model_id?d.model_id.value:'gpt-5.6-sol',transport=d.httpTransport?.value;
  if(model!=='gpt-5.6-sol')fail('explicit_model_required');
  if(transport!==undefined&&(!isAggregateHttpTransport(transport)||transport.model!==model))fail('unreviewed_model_adapter');
  this.#http=transport;
  Object.defineProperties(this,{identity:{value:Object.freeze({adapter_kind:'ChatGPTPlanAdapter',provider_kind:'openai',model_id:model,auth_mode:'chatgpt_plan',protocol_version:aggregateHttpProtocolVersion}),enumerable:true},capabilities:{value:Object.freeze({external_generation:true,stage_schema:'inline-evidence-v1'}),enumerable:true}});
 }
 preflight(){const ready=this.#http?.ready()===true;return {ready,reason:ready?'ready':'authorization_required'};}
 prepare(input){const r=stageRequest(input);return prepareChatgptPlanRequest({snapshot:r.snapshot,scenes:r.scenes,stage:r.stage,index:r.index},{model:this.identity.model_id});}
 async generate(input,{signal}={}){
  if(!this.preflight().ready)fail('authorization_required');if(signal?.aborted)fail('cancelled');
  const request=stageRequest(input);
  try{
   const draft=this.prepare(request),decoder=new OfflineAggregateEnvelopeStream(this.identity.model_id);
   for await(const chunk of this.#http.stream(draft,request,{signal})){if(signal?.aborted)fail('cancelled');decoder.push(chunk);}
   if(signal?.aborted)fail('cancelled');const {data,usage}=decoder.finish();
   return stageResponse({value:data,usage:{input_tokens:usage.inputTokens,output_tokens:usage.outputTokens,total_tokens:usage.totalTokens}},request);
  }catch(error){throw markPlanResponseFailure(error);}
 }
}
export function selectAdapter(options={}){
 if(!options||typeof options!=='object'||![Object.prototype,null].includes(Object.getPrototypeOf(options)))fail('invalid_model_selection');
 const descriptors=Object.getOwnPropertyDescriptors(options);
 if(Reflect.ownKeys(descriptors).some(k=>!['primary','fallback','fallback_on'].includes(k)||!('value' in descriptors[k])||!descriptors[k].enumerable))fail('invalid_model_selection');
 if(!(options.primary instanceof AggregatePlanAdapter)){const selected=selectOffline(options);selections.add(selected);return selected;}
 if(Object.keys(options).some(k=>!['primary','fallback','fallback_on'].includes(k))||(options.fallback??null)!==null||!Array.isArray(options.fallback_on??[])||(options.fallback_on??[]).length)fail('invalid_fallback_policy');
 const adapter=options.primary,check=adapter.preflight(),selection=Object.freeze({adapter,ready:check.ready,reason:check.reason,fallback_from:null,fallback_reason:null,selection_id:hash({identity:adapter.identity,fallback_from:null,fallback_reason:null})});selections.add(selection);return selection;
}
