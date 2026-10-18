// Model-stage boundary only. No Asteria state, network, login or credential loading.
import {snapshot,neutral,hash,safeId,scene} from '../src/contract.js';
import {assertAppraisalReviewJsonData} from '../src/appraisal-review-memory.js';
import {normalizeInlineScene,normalizeInlineCheckpoint,normalizeInlineStage} from '../src/inline-evidence-protocol.js';
import {prepareCodexDream,CodexDreamStream,codexDreamProtocolVersion} from './codex-dream-protocol.mjs';
import {prepareChatgptPlanRequest,ChatgptPlanStream} from './chatgpt-plan-protocol.mjs';
import {markPlanResponseFailure} from './plan-response-diagnostic.mjs';
import {isPlanHttpTransport,planHttpProtocolVersion} from './chatgpt-plan-http.mjs';
export const dreamModelPortVersion='dream-model-port-v1';
export const targetDefaultAdapter='ChatGPTPlanAdapter';
const selections=new WeakSet();
export const isModelSelection=value=>selections.has(value);
const fail=code=>{throw Error(code);};
export function jsonFields(value,required,optional=[]){
  assertAppraisalReviewJsonData(value);
  if(!value||typeof value!=='object'||Array.isArray(value)||required.some(k=>!Object.hasOwn(value,k))||Object.keys(value).some(k=>![...required,...optional].includes(k)))fail('invalid_model_port_contract');
}
export const portErrors=Object.freeze(['authorization_required','adapter_unavailable','budget_exhausted','cancelled','timeout','ambiguous_attempt','invalid_model_response','source_withdrawn','storage_io_failure','foreign_execution_owner']);
export function portError(error){return portErrors.includes(error?.message)?error.message:'invalid_model_response';}
const modelId=value=>typeof value==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/.test(value);
export function stageRequest(input){
  jsonFields(input,['contract_version','request_id','run_id','stage','index','snapshot','scenes'],['stage_schema']);
  if(input.contract_version!==dreamModelPortVersion||!safeId(input.request_id)||!safeId(input.run_id)||!['scene','wake'].includes(input.stage)||!Array.isArray(input.scenes)||input.index!==input.scenes.length||input.index>2||(input.stage==='scene'&&input.index===2)||(input.stage==='wake'&&input.index!==2))fail('invalid_model_port_contract');
  const snap=snapshot(input.snapshot);let before=snap.channels.affect.value??neutral();
  if(input.stage_schema!==undefined&&!['inline-evidence-v1','legacy-grounded-wake-v2'].includes(input.stage_schema))fail('invalid_model_port_contract');
  const scenes=input.scenes.map(s=>{const v=input.stage_schema==='legacy-grounded-wake-v2'?scene(s,before):normalizeInlineCheckpoint(s,before);if(hash(v)!==hash(s))fail('invalid_model_port_contract');before=v.after;return v;});
  return {...structuredClone(input),snapshot:snap,scenes};
}
export function stageResponse(raw,request){
  jsonFields(raw,['value','usage']);
  if(raw.usage!=='unknown'){
    jsonFields(raw.usage,['input_tokens','output_tokens','total_tokens']);
    if(!Object.values(raw.usage).every(n=>Number.isSafeInteger(n)&&n>=0)||raw.usage.input_tokens+raw.usage.output_tokens!==raw.usage.total_tokens)fail('invalid_model_response');
  }
  const before=request.scenes.at(-1)?.after??request.snapshot.channels.affect.value??neutral();
  const value=request.stage==='scene'?normalizeInlineScene(raw.value,before):normalizeInlineStage(raw.value,{stage:'wake',previousScenes:request.scenes});
  return {value,usage:structuredClone(raw.usage)};
}
export function validateStageResponse(response,request){
  jsonFields(response,['value','usage']);
  const u=response.usage;
  if(u!=='unknown'){
    jsonFields(u,['input_tokens','output_tokens','total_tokens']);
    if(!Object.values(u).every(n=>Number.isSafeInteger(n)&&n>=0)||u.input_tokens+u.output_tokens!==u.total_tokens)fail('invalid_model_response');
  }
  const before=request.scenes.at(-1)?.after??request.snapshot.channels.affect.value??neutral();
  const value=request.stage==='scene'?normalizeInlineCheckpoint(response.value,before):normalizeInlineStage(response.value,{stage:'wake',previousScenes:request.scenes});
  if(hash(value)!==hash(response.value))fail('invalid_model_response');
  return structuredClone({value,usage:u});
}

class Adapter {
  constructor(kind,provider,model,auth,protocol,external=provider!=='local_fake'){
    if(!modelId(model)&&model!=='unknown')fail('explicit_model_required');
    Object.defineProperties(this,{identity:{value:Object.freeze({adapter_kind:kind,provider_kind:provider,model_id:model,auth_mode:auth,protocol_version:protocol}),enumerable:true},capabilities:{value:Object.freeze({external_generation:external,stage_schema:'inline-evidence-v1'}),enumerable:true}});
  }
  preflight(){return {ready:false,reason:'authorization_required'};}
  async generate(){fail('authorization_required');}
}
export class FakeAdapter extends Adapter {
  #reply;#ready;
  constructor({model_id='fictional-fake-v1',reply,available=true}={}){
    super('FakeAdapter','local_fake',model_id,'none','inline-evidence-quotes-v1');
    if(reply!==undefined&&typeof reply!=='function')fail('invalid_fake_reply');
    this.#reply=reply;this.#ready=available===true;
  }
  preflight(){return {ready:this.#ready,reason:this.#ready?'ready':'adapter_unavailable'};}
  async generate(input,{signal}={}){
    const request=stageRequest(input);if(signal?.aborted)fail('cancelled');
    if(!this.#ready)fail('adapter_unavailable');
    if(this.#reply)return stageResponse(await this.#reply(request,{signal}),request);
    const events=['A blue tile rests on a wooden sill.','The blue tile turns transparent; the wooden sill remains.'];
    const value=request.stage==='scene'?{event:events[request.index],appraisal:{goalEffect:0,control:.5,uncertainty:.5},basis:{goal:null,control:null,uncertainty:null},affect:{kind:'unchanged'}}:{fragment:request.scenes[1].event,residue:.1,associations:[]};
    return stageResponse({value,usage:'unknown'},request);
  }
}
// A simulator is an explicit trusted offline callback, never a fetch/process fallback.
export class ChatGPTPlanAdapter extends Adapter {
  #simulator;#http;
  constructor({model_id='unknown',simulator,httpTransport}={}){
    if(simulator!==undefined&&typeof simulator!=='function')fail('invalid_protocol_simulator');
    if(httpTransport!==undefined&&(!isPlanHttpTransport(httpTransport)||httpTransport.model!==model_id||simulator))fail('unreviewed_model_adapter');
    super('ChatGPTPlanAdapter',simulator?'openai_protocol_simulator':'openai',model_id,simulator?'synthetic_stub':'chatgpt_plan',simulator?'offline-chatgpt-plan-inline-v1':httpTransport?planHttpProtocolVersion:'chatgpt-plan-inline-preparation-v1',!simulator);this.#simulator=simulator;this.#http=httpTransport;
  }
  preflight(){const ready=(!!this.#simulator||this.#http?.ready()===true)&&this.identity.model_id!=='unknown';return {ready,reason:ready?'ready':'authorization_required'};}
  prepare(input){if(this.identity.model_id==='unknown')fail('explicit_model_required');const r=stageRequest(input);return prepareChatgptPlanRequest({snapshot:r.snapshot,scenes:r.scenes,stage:r.stage,index:r.index},{model:this.identity.model_id});}
  async generate(input,{signal}={}){
    if(!this.preflight().ready)fail('authorization_required');const request=stageRequest(input);if(signal?.aborted)fail('cancelled');
    try {
    const draft=this.prepare(request),chunks=this.#http?this.#http.stream(draft,request,{signal}):await this.#simulator(structuredClone(draft),{signal}),stream=new ChatgptPlanStream(this.identity.model_id);
    for await(const chunk of chunks){if(signal?.aborted)fail('cancelled');stream.push(chunk);}
    if(signal?.aborted)fail('cancelled');const {data,usage}=stream.finish();
    return stageResponse({value:data,usage:{input_tokens:usage.inputTokens,output_tokens:usage.outputTokens,total_tokens:usage.totalTokens}},request);
    }catch(error){throw markPlanResponseFailure(error);}
  }
}
export class CodexAdapter extends Adapter {
  #simulator;
  constructor({model_id='unknown',simulator}={}){
    if(simulator!==undefined&&typeof simulator!=='function')fail('invalid_protocol_simulator');
    super('CodexAdapter',simulator?'openai_protocol_simulator':'openai',model_id,simulator?'synthetic_stub':'codex_chatgpt_subscription',simulator?codexDreamProtocolVersion:'codex-app-server-pending',!simulator);this.#simulator=simulator;
  }
  preflight(){return {ready:!!this.#simulator&&this.identity.model_id!=='unknown',reason:this.#simulator&&this.identity.model_id!=='unknown'?'ready':'adapter_unavailable'};}
  prepare(input){if(this.identity.model_id==='unknown')fail('explicit_model_required');const r=stageRequest(input);return prepareCodexDream({snapshot:r.snapshot,scenes:r.scenes,stage:r.stage,index:r.index},this.identity.model_id);}
  async generate(input,{signal}={}){
    if(!this.#simulator)fail('authorization_required');const request=stageRequest(input);if(signal?.aborted)fail('cancelled');
    const draft=this.prepare(request),result=await this.#simulator(structuredClone(draft),{signal});
    // Provider thread IDs live only in this stage's transient decoder, never the book.
    const stream=new CodexDreamStream(result.thread_id,result.turn_id);
    for await(const chunk of result.chunks){if(signal?.aborted)fail('cancelled');stream.push(chunk);}
    if(signal?.aborted)fail('cancelled');const {data,usage}=stream.finish();return stageResponse({value:data,usage},request);
  }
}
export function assertAdapter(adapter){
  if(!(adapter instanceof FakeAdapter||adapter instanceof ChatGPTPlanAdapter||adapter instanceof CodexAdapter))fail('unreviewed_model_adapter');
  return adapter;
}
// Synchronous, local-only readiness. Never probes model lists or accounts.
export function selectAdapter({primary=new FakeAdapter(),fallback=null,fallback_on=[]}={}){
  assertAdapter(primary);if(fallback!==null)assertAdapter(fallback);
  if(!Array.isArray(fallback_on)||fallback_on.some(v=>!['authorization_required','adapter_unavailable'].includes(v)))fail('invalid_fallback_policy');
  if(fallback!==null&&!(primary instanceof FakeAdapter&&fallback instanceof FakeAdapter)&&!(primary instanceof ChatGPTPlanAdapter&&fallback instanceof CodexAdapter))fail('invalid_fallback_policy');
  const initial=primary.preflight();let adapter=primary,from=null,reason=null;
  if(!initial.ready&&fallback&&fallback_on.includes(initial.reason)){adapter=fallback;from=primary.identity.adapter_kind;reason=initial.reason;}
  const check=adapter.preflight();
  const selected=Object.freeze({adapter,ready:check.ready,reason:check.reason,fallback_from:from,fallback_reason:reason,selection_id:hash({identity:adapter.identity,fallback_from:from,fallback_reason:reason})});selections.add(selected);return selected;
}

// Formal target route is explicit; calling this never logs in or generates.
export function selectSubscriptionAdapter({model_id='unknown',codex_model_id='unknown',fallback_on=[]}={}){
  return selectAdapter({primary:new ChatGPTPlanAdapter({model_id}),fallback:new CodexAdapter({model_id:codex_model_id}),fallback_on});
}
