// Independent offline DreamModelPort version over the reviewed aggregate parser.
// It accepts only a trusted simulator: no OAuth, fetch, credentials or API fallback.
export {dreamModelPortVersion,stageRequest,stageResponse,validateStageResponse,jsonFields,portError,FakeAdapter} from './dream-model-port.mjs';
import {FakeAdapter,selectAdapter as selectOriginal,stageRequest,stageResponse} from './dream-model-port.mjs';
import {prepareChatgptPlanRequest,chatgptPlanLimits} from './chatgpt-plan-protocol.mjs';
import {OfflineAggregateEnvelopeStream,offlineEnvelopeVersion,aggregateEnvelopeLimits} from './offline-aggregate-envelope.mjs';
import {markEnvelopeFailure} from './envelope-diagnostic.mjs';
import {boundedOfflineAggregateChunks,offlineAggregateIntegrationHttpVersion} from './offline-aggregate-integration-http.mjs';
import {hash} from '../src/contract.js';
const fail=code=>{throw Error(code);},selections=new WeakSet();
export const offlineAggregateIntegrationVersion='offline-aggregate-integration-v1';
export const offlineAggregateIntegrationModel='synthetic-aggregate-integration-v1';
export const offlineAggregateIntegrationLimits=Object.freeze({
  httpStreamBytes:chatgptPlanLimits.streamBytes,
  aggregateStreamBytes:aggregateEnvelopeLimits.streamBytes,
  aggregateEvents:aggregateEnvelopeLimits.events,
  finalContentBytes:aggregateEnvelopeLimits.contentBytes,
  indexes:chatgptPlanLimits.events,
  reasoningItems:16,
  serverOutputTokenCap:null,
});
export const isModelSelection=value=>selections.has(value);
function fields(options,allowed){
  if(!options||typeof options!=='object'||![Object.prototype,null].includes(Object.getPrototypeOf(options)))fail('invalid_model_port_contract');
  const descriptors=Object.getOwnPropertyDescriptors(options);
  if(Reflect.ownKeys(descriptors).some(k=>!allowed.includes(k)||!('value' in descriptors[k])||!descriptors[k].enumerable))fail('invalid_model_port_contract');
  return descriptors;
}
export class OfflineAggregateIntegrationAdapter{
  #simulator;
  constructor(options={}){
    const d=fields(options,['model_id','simulator']),model=d.model_id?d.model_id.value:undefined,simulator=d.simulator?.value;
    if(model!==offlineAggregateIntegrationModel)fail('explicit_model_required');
    if(simulator!==undefined&&typeof simulator!=='function')fail('invalid_protocol_simulator');
    Object.defineProperties(this,{identity:{value:Object.freeze({adapter_kind:'ChatGPTPlanAdapter',provider_kind:'openai_protocol_simulator',model_id:model,auth_mode:'synthetic_stub',protocol_version:offlineAggregateIntegrationVersion}),enumerable:true},capabilities:{value:Object.freeze({external_generation:false,stage_schema:'inline-evidence-v1',decoder_version:offlineEnvelopeVersion,http_version:offlineAggregateIntegrationHttpVersion}),enumerable:true}});
    this.#simulator=simulator;
  }
  preflight(){return {ready:!!this.#simulator,reason:this.#simulator?'ready':'adapter_unavailable'};}
  prepare(input){const r=stageRequest(input);return prepareChatgptPlanRequest({snapshot:r.snapshot,scenes:r.scenes,stage:r.stage,index:r.index},{model:this.identity.model_id});}
  async generate(input,{signal}={}){
    if(!this.preflight().ready)fail('adapter_unavailable');if(signal?.aborted)fail('cancelled');
    const request=stageRequest(input);
    try{
      const draft=this.prepare(request),chunks=await this.#simulator(structuredClone(draft),{signal}),decoder=new OfflineAggregateEnvelopeStream(this.identity.model_id);
      for await(const chunk of boundedOfflineAggregateChunks(chunks)){if(signal?.aborted)fail('cancelled');decoder.push(chunk);}
      if(signal?.aborted)fail('cancelled');const {data,usage}=decoder.finish();
      return stageResponse({value:data,usage:{input_tokens:usage.inputTokens,output_tokens:usage.outputTokens,total_tokens:usage.totalTokens}},request);
    }catch(error){throw markEnvelopeFailure(error);}
  }
}
export function selectAdapter(options={}){
  const d=fields(options,['primary','fallback','fallback_on']),primary=d.primary?d.primary.value:new FakeAdapter(),fallback=d.fallback?d.fallback.value:null,fallback_on=d.fallback_on?d.fallback_on.value:[];
  if(fallback!==null||!Array.isArray(fallback_on)||fallback_on.length)fail('invalid_fallback_policy');
  if(!(primary instanceof OfflineAggregateIntegrationAdapter)&&!(primary instanceof FakeAdapter))fail('invalid_model_selection');
  if(primary instanceof FakeAdapter){const selected=selectOriginal({primary});selections.add(selected);return selected;}
  const check=primary.preflight(),selection=Object.freeze({adapter:primary,ready:check.ready,reason:check.reason,fallback_from:null,fallback_reason:null,selection_id:hash({identity:primary.identity,fallback_from:null,fallback_reason:null})});selections.add(selection);return selection;
}
