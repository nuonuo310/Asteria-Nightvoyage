// Separate simulator-only protocol. No transport, credential or allowance access.
import { decodeCoupledScene } from './coupled-affect-wire.js';
import { normalizeCompactV2Scene, normalizeCompactV2Checkpoint, buildCompactV2Request, compactV2Version } from './compact-v2-offline.js';
import { parseDeepSeekResponse, normalizeDeepSeekStage } from './deepseek-protocol.js';
import { snapshot, neutral, hash } from './contract.js';
import { copy, fail } from './store.js';
import { Nightvoyage } from './engine.js';
import { FakeProvider } from './fake-provider.js';

export const coupledAffectVersion='offline-coupled-affect-quotes-v1';
const policy='validated-unused-quotation-pruning-v1',encoding='explicit-affect-union-v1';
function stamped(value,kind) {
  const result=copy(value);result.appraisalBasis.protocolVersion=coupledAffectVersion;
  result.affectDeclaration={schemaVersion:1,kind};return result;
}
export function normalizeCoupledScene(raw,before) {
  const value=normalizeCompactV2Scene(decodeCoupledScene(raw),before);
  return stamped(value,raw.affect.kind);
}
export function normalizeCoupledCheckpoint(saved,before) {
  if(saved?.appraisalBasis?.protocolVersion!==coupledAffectVersion)fail('invalid_coupled_checkpoint');
  const old=copy(saved);delete old.affectDeclaration;old.appraisalBasis.protocolVersion=compactV2Version;
  const value=normalizeCompactV2Checkpoint(old,before),kind=value.appraisalBasis.evidence.affectExcerpt===null?'unchanged':'estimated';
  const normalized=stamped(value,kind);
  if(hash(normalized)!==hash(saved))fail('invalid_coupled_checkpoint');return normalized;
}
export function buildCoupledRequest(payload,settings) {
  if(!payload||!Array.isArray(payload.scenes))fail('invalid_protocol_input');
  let before=snapshot(payload.snapshot).channels.affect.value??neutral();
  const previous=payload.scenes.map(s=>{const v=normalizeCoupledCheckpoint(s,before);before=v.after;return v;});
  const old=previous.map(s=>{const v=copy(s);delete v.affectDeclaration;v.appraisalBasis.protocolVersion=compactV2Version;return v;});
  const request=buildCompactV2Request({...payload,scenes:old},settings),material=JSON.parse(request.body.messages[1].content);
  material.previousScenes=previous;
  if(payload.stage==='scene') {
    const lines=request.body.messages[0].content.split('\n').filter(line=>!['Return event, appraisal, delta, evidence and links only.','links indices are','Null control/uncertainty','JSON shape example:'].some(prefix=>line.startsWith(prefix)));
    lines.push('Return exactly event, appraisal, evidence, links and affect. No top-level delta. All fields share the same bounded output cap; no reasoning or explanations.',
      'links contains exactly goal, control and uncertainty. Indices are zero-based integers into evidence; goal is null or [goalIndex,outcomeIndex], the others null or one index.',
      'Null control/uncertainty links require value 0.5 as UNKNOWN placeholder. Other values require linked exact event evidence.',
      'affect must choose exactly one branch: {"kind":"unchanged"} (no other fields), or {"kind":"estimated","delta":{"valence":0.1,"arousal":0},"evidence":0}.',
      'unchanged explicitly declares both changes zero; do not choose it merely to omit evidence for a change. estimated requires BOTH delta numbers and one integer evidence index, even for an explicit zero estimate. Missing evidence, null or conflicting fields is invalid.',
      'The quoted current event must support the estimate; no fabricated event merely to justify a number. Literal validation does not establish semantic support. No mood quotas, forced insight or positive ending.',
      'affectDeclaration and normalizationAudit are program-owned: never output them.',
      'JSON shape example: '+JSON.stringify({event:'梦里的人望着桌边的纸片。',appraisal:{goalEffect:0,control:0.5,uncertainty:0.5},evidence:[],links:{goal:null,control:null,uncertainty:null},affect:{kind:'unchanged'}}));
    request.body.messages[0].content=lines.join('\n');
  }
  request.body.messages[1].content=JSON.stringify(material);request.protocolVersion=coupledAffectVersion;return request;
}
export class OfflineCoupledAffectProvider extends FakeProvider {
  constructor({model,maxOutputTokens=400,simulator}={}) {
    super();if(typeof simulator!=='function')fail('offline_simulator_required');
    if(!['deepseek-flash','deepseek-v4-pro'].includes(model)||!Number.isSafeInteger(maxOutputTokens)||maxOutputTokens<1||maxOutputTokens>400)fail('invalid_coupled_settings');
    this.settings=Object.freeze({model,maxOutputTokens});this.simulator=simulator;this.identity=`${coupledAffectVersion}:${model}:${maxOutputTokens}`;
  }
  async generate(payload) {
    if(payload.signal?.aborted)fail('cancelled');
    const request=buildCoupledRequest(payload,this.settings);let response;
    try {response=await this.simulator(copy(request),{signal:payload.signal});}catch{fail('offline_simulator_failure');}
    if(payload.signal?.aborted)fail('cancelled');
    const {data}=parseDeepSeekResponse(response,this.settings),material=JSON.parse(request.body.messages[1].content);
    if(payload.stage==='scene') {normalizeCoupledScene(data,material.previousAffect);return copy(data);}
    const value=normalizeDeepSeekStage(data,material);return {fragment:value.fragment,residue:value.residue,associations:value.associations};
  }
}
export class CoupledAffectRehearsal extends Nightvoyage {
  executionFamily(){return `specialized:${coupledAffectVersion}`;}
  constructor(directory,{model,maxOutputTokens=400,simulator,fault=()=>{}}={}) {
    super(directory,{provider:new OfflineCoupledAffectProvider({model,maxOutputTokens,simulator}),fault});
  }
  initialRunMetadata(){return {appraisalProtocolVersion:coupledAffectVersion,normalizationPolicyVersion:policy,affectEncodingVersion:encoding};}
  start(requestId,sessionId,input,settings) {
    if(settings?.perCallOutput!==undefined&&settings.perCallOutput!==this.provider.settings.maxOutputTokens)fail('appraisal_output_limit_mismatch');
    return super.start(requestId,sessionId,input,{inputTokens:16000,...settings,perCallOutput:this.provider.settings.maxOutputTokens});
  }
  assertIdentity(id) {
    const r=this.run(id);if(r.appraisalProtocolVersion!==coupledAffectVersion||r.normalizationPolicyVersion!==policy||r.affectEncodingVersion!==encoding)fail('coupled_run_identity_mismatch');
    if(r.snapshot&&r.scenes){let before=r.snapshot.channels.affect.value??neutral();for(const s of r.scenes){const v=normalizeCoupledCheckpoint(s,before);before=v.after;}}
  }
  execute(id){this.assertIdentity(id);return super.execute(id);}
  resume(id,options){this.assertIdentity(id);return super.resume(id,options);}
  async sceneStep(r,signal) {
    const raw=await this.call(r,'scene',signal);if(r.status!=='running'||signal.aborted)return;
    const before=r.scenes.at(-1)?.after??r.snapshot.channels.affect.value??neutral();
    r.scenes.push(normalizeCoupledScene(raw,before));this.store.save();this.fault('scene_saved');
  }
  async wakeStep(r,signal) {
    const raw=await this.call(r,'wake',signal);if(r.status!=='running'||signal.aborted)return;
    r.wake=normalizeDeepSeekStage(raw,{stage:'wake',previousScenes:r.scenes});this.publishDream(r);this.store.save();
  }
}
