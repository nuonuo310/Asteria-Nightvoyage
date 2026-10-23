// Fixed real subscription adapter. OAuth/HTTP readiness is required; no simulator,
// environment key, Codex route, retry or paid API fallback can mint this selection.
import {stageRequest,stageResponse} from './dream-model-port.mjs';
import {prepareChatgptPlanRequest} from './chatgpt-plan-protocol.mjs';
import {OfflineAggregateEnvelopeStream,offlineEnvelopeVersion} from './offline-aggregate-envelope.mjs';
import {isPlanTransportAdmissionHttp,planTransportAdmissionHttpVersion} from './plan-transport-admission-http.mjs';
import {markEnvelopeFailure} from './envelope-diagnostic.mjs';
import {hash} from '../src/contract.js';
export {dreamModelPortVersion,stageRequest,validateStageResponse,jsonFields,portError} from './dream-model-port.mjs';
const fail=code=>{throw Error(code);},selections=new WeakSet();
export const planTransportAdmissionModel='gpt-5.6-sol';
export const planTransportAdmissionAdapterVersion='chatgpt-plan-aggregate-admission-adapter-v1';
export const isModelSelection=value=>selections.has(value);
export class ChatGPTPlanAdapter{
  #http;
  constructor(options={}){
    if(!options||typeof options!=='object'||![Object.prototype,null].includes(Object.getPrototypeOf(options)))fail('unreviewed_model_adapter');
    const d=Object.getOwnPropertyDescriptors(options);
    if(Reflect.ownKeys(d).some(k=>k!=='httpTransport'||!('value' in d[k])||!d[k].enumerable))fail('unreviewed_model_adapter');
    const transport=d.httpTransport?.value;
    if(!isPlanTransportAdmissionHttp(transport)||transport.model!==planTransportAdmissionModel||transport.protocolVersion!==planTransportAdmissionHttpVersion)fail('unreviewed_model_adapter');
    this.#http=transport;
    Object.defineProperties(this,{
      identity:{value:Object.freeze({adapter_kind:'ChatGPTPlanAdapter',provider_kind:'openai',model_id:planTransportAdmissionModel,auth_mode:'chatgpt_plan',protocol_version:planTransportAdmissionHttpVersion}),enumerable:true},
      capabilities:{value:Object.freeze({external_generation:true,stage_schema:'inline-evidence-v1',decoder_version:offlineEnvelopeVersion,transport_protocol:planTransportAdmissionHttpVersion}),enumerable:true}
    });
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
    }catch(error){throw markEnvelopeFailure(error);}
  }
}
export function selectAdapter(options={}){
  if(!options||typeof options!=='object'||![Object.prototype,null].includes(Object.getPrototypeOf(options)))fail('invalid_model_selection');
  const d=Object.getOwnPropertyDescriptors(options);
  if(Reflect.ownKeys(d).some(k=>!['primary','fallback','fallback_on'].includes(k)||!('value' in d[k])||!d[k].enumerable))fail('invalid_model_selection');
  if(!(d.primary?.value instanceof ChatGPTPlanAdapter)||d.fallback?.value!==undefined||d.fallback_on?.value!==undefined)fail('invalid_fallback_policy');
  const adapter=d.primary.value,check=adapter.preflight();
  const selection=Object.freeze({adapter,ready:check.ready,reason:check.reason,fallback_from:null,fallback_reason:null,selection_id:hash({identity:adapter.identity,fallback_from:null,fallback_reason:null})});
  selections.add(selection);return selection;
}
