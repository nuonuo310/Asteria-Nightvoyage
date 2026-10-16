// Simulator-only protocol candidate. No HTTP, credential or paid-allowance entry.
import { buildCompactAppraisalRequest, normalizeCompactScene, compactSceneData, compactProtocolVersion } from './compact-appraisal-protocol.js';
import { normalizeAppraisalScene } from './appraisal-rehearsal.js';
import { parseDeepSeekResponse, normalizeDeepSeekStage } from './deepseek-protocol.js';
import { snapshot, neutral, hash } from './contract.js';
import { copy, fail } from './store.js';
import { Nightvoyage } from './engine.js';
import { FakeProvider } from './fake-provider.js';

export const compactV2Version='offline-compact-quotes-v2-pruned-unused';
const policy='validated-unused-quotation-pruning-v1';
function audit(received,kept){return {schemaVersion:1,policyVersion:policy,receivedQuoteCount:received,keptQuoteCount:kept,discardedUnusedQuoteCount:received-kept};}
function stamped(value,normalizationAudit){value.appraisalBasis.protocolVersion=compactV2Version;return {...value,normalizationAudit};}
export function normalizeCompactV2Scene(raw,before) {
  let value;
  try {value=normalizeCompactScene(raw,before);}
  catch(error){
    if(error.message!=='unused_compact_evidence')throw error;
    // Only this original guard establishes validity of the ENTIRE table and links.
    const used=new Set(raw.links.goal??[]);
    for(const k of ['control','uncertainty','affect'])if(raw.links[k]!==null)used.add(raw.links[k]);
    const order=[...used].sort((a,b)=>a-b),mapping=new Map(order.map((old,index)=>[old,index])),index=i=>i===null?null:mapping.get(i);
    const cleaned={...raw,evidence:order.map(i=>raw.evidence[i]),links:{goal:raw.links.goal===null?null:raw.links.goal.map(index),
      control:index(raw.links.control),uncertainty:index(raw.links.uncertainty),affect:index(raw.links.affect)}};
    value=normalizeCompactScene(cleaned,before); // Includes ALL later numeric and evidence rules.
    return stamped(value,audit(raw.evidence.length,cleaned.evidence.length));
  }
  return stamped(value,audit(raw.evidence.length,raw.evidence.length));
}
export function normalizeCompactV2Checkpoint(saved,before) {
  if(saved?.appraisalBasis?.protocolVersion!==compactV2Version)fail('invalid_compact_v2_checkpoint');
  const value=normalizeAppraisalScene({...saved,basis:saved.appraisalBasis.evidence},before);
  const wire=compactSceneData(value),a=saved.normalizationAudit;
  if(!a||!Number.isSafeInteger(a.receivedQuoteCount)||a.receivedQuoteCount<0||a.receivedQuoteCount>5||
      !Number.isSafeInteger(a.keptQuoteCount)||a.keptQuoteCount!==wire.evidence.length||a.keptQuoteCount>a.receivedQuoteCount||
      hash(a)!==hash(audit(a.receivedQuoteCount,a.keptQuoteCount)))fail('invalid_compact_v2_audit');
  const normalized=stamped(value,audit(a.receivedQuoteCount,a.keptQuoteCount));
  if(hash(normalized)!==hash(saved))fail('invalid_compact_v2_checkpoint');return normalized;
}
export function buildCompactV2Request(payload,settings) {
  if(!payload||!Array.isArray(payload.scenes))fail('invalid_protocol_input');
  let before=snapshot(payload.snapshot).channels.affect.value??neutral();
  const previous=payload.scenes.map(saved=>{const value=normalizeCompactV2Checkpoint(saved,before);before=value.after;return value;});
  const strictPrevious=previous.map(saved=>{
    const value=normalizeAppraisalScene({...saved,basis:saved.appraisalBasis.evidence},saved.before);
    value.appraisalBasis.protocolVersion=compactProtocolVersion;return value;
  });
  const request=buildCompactAppraisalRequest({...payload,scenes:strictPrevious},settings),material=JSON.parse(request.body.messages[1].content);
  material.previousScenes=previous;
  request.protocolVersion=compactV2Version;
  request.body.messages[0].content=request.body.messages[0].content.replace('include no unused quotation.','prefer no unused quotation. Valid unused quotations may be discarded by the program.')+
    '\nNormalization audit is program-owned. Output no audit fields. Every table entry still must be unique, bounded and grounded, including unused entries; all numeric/basis rules remain mandatory.';
  request.body.messages[1].content=JSON.stringify(material);return request;
}
export class OfflineCompactV2Provider extends FakeProvider {
  constructor({model,maxOutputTokens=400,simulator}={}) {
    super();if(typeof simulator!=='function')fail('offline_simulator_required');
    if(!['deepseek-flash','deepseek-v4-pro'].includes(model)||!Number.isSafeInteger(maxOutputTokens)||maxOutputTokens<1||maxOutputTokens>400)fail('invalid_compact_v2_settings');
    this.settings=Object.freeze({model,maxOutputTokens});this.simulator=simulator;this.identity=`${compactV2Version}:${model}:${maxOutputTokens}`;
  }
  async generate(payload) {
    if(payload.signal?.aborted)fail('cancelled');
    const request=buildCompactV2Request(payload,this.settings);let response;
    try {response=await this.simulator(copy(request),{signal:payload.signal});}catch{fail('offline_simulator_failure');}
    if(payload.signal?.aborted)fail('cancelled');
    const {data}=parseDeepSeekResponse(response,this.settings),material=JSON.parse(request.body.messages[1].content);
    if(payload.stage==='scene'){
      normalizeCompactV2Scene(data,material.previousAffect);
      // Keep the engine's response-size accounting on model fields, not program audit overhead.
      return {event:data.event,appraisal:copy(data.appraisal),delta:copy(data.delta),evidence:copy(data.evidence),links:copy(data.links)};
    }
    const value=normalizeDeepSeekStage(data,material);return {fragment:value.fragment,residue:value.residue,associations:value.associations};
  }
}
export class CompactV2Rehearsal extends Nightvoyage {
  executionFamily(){return `specialized:${compactV2Version}`;}
  constructor(directory,{model,maxOutputTokens=400,simulator,fault=()=>{}}={}) {
    super(directory,{provider:new OfflineCompactV2Provider({model,maxOutputTokens,simulator}),fault});
  }
  initialRunMetadata(){return {appraisalProtocolVersion:compactV2Version,normalizationPolicyVersion:policy};}
  start(requestId,sessionId,input,settings){
    if(settings?.perCallOutput!==undefined&&settings.perCallOutput!==this.provider.settings.maxOutputTokens)fail('appraisal_output_limit_mismatch');
    return super.start(requestId,sessionId,input,{inputTokens:16000,...settings,perCallOutput:this.provider.settings.maxOutputTokens});
  }
  assertIdentity(id){const r=this.run(id);if(r.appraisalProtocolVersion!==compactV2Version||r.normalizationPolicyVersion!==policy)fail('compact_v2_run_identity_mismatch');}
  execute(id){this.assertIdentity(id);return super.execute(id);}
  resume(id,options){this.assertIdentity(id);return super.resume(id,options);}
  async sceneStep(r,signal){
    const raw=await this.call(r,'scene',signal);if(r.status!=='running'||signal.aborted)return;
    const before=r.scenes.at(-1)?.after??r.snapshot.channels.affect.value??neutral();
    r.scenes.push(normalizeCompactV2Scene(raw,before));this.store.save();this.fault('scene_saved');
  }
  async wakeStep(r,signal){
    const raw=await this.call(r,'wake',signal);if(r.status!=='running'||signal.aborted)return;
    r.wake=normalizeDeepSeekStage(raw,{stage:'wake',previousScenes:r.scenes});this.publishDream(r);this.store.save();
  }
}
