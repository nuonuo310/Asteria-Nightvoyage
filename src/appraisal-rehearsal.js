// Candidate protocol and local simulator only. Never imported by the paid entries.
import { buildDeepSeekRequest, parseDeepSeekResponse, normalizeDeepSeekStage } from './deepseek-protocol.js';
import { scene, neutral, hash } from './contract.js';
import { copy, fail } from './store.js';
import { FakeProvider } from './fake-provider.js';
import { Nightvoyage } from './engine.js';

export const appraisalProtocolVersion = 'offline-appraisal-evidence-v1';
function exactKeys(value,keys) {
  return value&&typeof value==='object'&&!Array.isArray(value)&&
    Object.keys(value).length===keys.length&&keys.every(k=>Object.hasOwn(value,k));
}
function excerpt(value,event) {
  if (typeof value!=='string'||!value.trim()||value.length>160||!event.includes(value)) fail('appraisal_excerpt_not_grounded');
  return value;
}
function evidence(value,normalized) {
  if (!exactKeys(value,['goal','controlExcerpt','uncertaintyExcerpt','affectExcerpt'])) fail('invalid_appraisal_evidence');
  const event=normalized.event,result={goal:null,controlExcerpt:null,uncertaintyExcerpt:null,affectExcerpt:null};
  if (normalized.appraisal.goalEffect===0) {
    if (value.goal!==null) fail('neutral_goal_evidence_must_be_null');
  } else {
    if (!exactKeys(value.goal,['goalExcerpt','outcomeExcerpt'])) fail('nonzero_goal_requires_evidence');
    result.goal={goalExcerpt:excerpt(value.goal.goalExcerpt,event),outcomeExcerpt:excerpt(value.goal.outcomeExcerpt,event)};
  }
  for (const [field,numeric] of [['controlExcerpt','control'],['uncertaintyExcerpt','uncertainty']]) {
    if (value[field]===null) {
      // Compatibility placeholder, explicitly marked unknown by the null basis.
      // It is not evidence that perceived control/uncertainty was measured at 0.5.
      if (normalized.appraisal[numeric]!==0.5) fail('unbased_appraisal_requires_placeholder');
    } else result[field]=excerpt(value[field],event);
  }
  if (value.affectExcerpt===null) {
    if (normalized.delta.valence!==0||normalized.delta.arousal!==0) fail('affect_change_requires_evidence');
  } else result.affectExcerpt=excerpt(value.affectExcerpt,event);
  return result;
}
export function normalizeAppraisalScene(data,before) {
  const normalized=scene(data,before),basis=evidence(data?.basis,normalized);
  return {...normalized,appraisalBasis:{schemaVersion:1,protocolVersion:appraisalProtocolVersion,origin:'dream_appraisal',isRealityFact:false,
    verification:'literal_excerpt_only',semanticSupport:'not_assessed',evidence:basis}};
}
const stageData = value => ({event:value.event,appraisal:value.appraisal,delta:value.delta,basis:copy(value.appraisalBasis.evidence)});
export function buildAppraisalRehearsalRequest(payload,settings) {
  // Reuse the existing fictional input whitelist, bounded model settings and inert-data envelope.
  // Do not change v2 or its source hash, and do not expose an HTTP endpoint here.
  const base=buildDeepSeekRequest(payload,settings),material=JSON.parse(base.body.messages[1].content);
  let before=material.channels.affect.value??neutral();
  material.previousScenes=payload.scenes.map(saved=>{
    const normalized=normalizeAppraisalScene({...saved,basis:saved.appraisalBasis?.evidence},before);
    if (hash(normalized.appraisalBasis)!==hash(saved.appraisalBasis)) fail('invalid_appraisal_checkpoint');
    before=normalized.after;return normalized;
  });
  const example=payload.stage==='scene'?{
    event:'梦里的人望着纸片，纸片停在桌边。',appraisal:{goalEffect:0,control:0.5,uncertainty:0.5},delta:{valence:0,arousal:0},
    basis:{goal:null,controlExcerpt:null,uncertaintyExcerpt:null,affectExcerpt:null}
  }:{fragment:material.previousScenes.at(-1).event,residue:0.1,associations:[]};
  const additions=payload.stage==='scene'?[
    'Return event, appraisal, delta and basis only. Keep events concise so the event and evidence fit the same 400-token output cap.',
    'Use 梦里的人 for the fictional subject, or omit the subject. Avoid gendered and first/second-person subject pronouns. Do not add gender merely to vary the wording.',
    'Appraise this scene event, not the real user or missing input channels. A neutral or unchanged scene is allowed; do not invent an event just to justify numerical movement.',
    'For nonzero goalEffect, the event must state both a dream goal and its helped/hindered outcome. Copy short exact contiguous goalExcerpt and outcomeExcerpt from this event into basis.goal. A mysterious event alone does not establish a goal or harm. Without a stated impact use goalEffect:0 and basis.goal:null.',
    'basis.controlExcerpt and basis.uncertaintyExcerpt are exact contiguous event excerpts, or null when not stated. Null requires the corresponding numeric field to be 0.5, an UNKNOWN placeholder, not a measured midpoint. No arbitrary extreme without an excerpt.',
    'basis.affectExcerpt is an exact contiguous event excerpt supporting the valence/arousal change; if absent use null and both deltas zero. Affect can change without a goal effect. Quotation existence does not prove semantic support.',
    'Evidence excerpts come only from the current event, not the seed, previous scenes or a later explanation. Maximum 160 characters each. Do not output analysis, hidden reasoning or a separate justification narrative.'
  ]:[
    'Prefer an excerpt that retains a distinctive central experience of the dream and enough context, including relevant negation. Do not pick an incidental object merely because it is easy to copy.',
    'This is selection guidance, not a semantic guarantee: still copy one exact contiguous excerpt, never repair it by paraphrasing or joining scenes. No insight or positive ending is required.'
  ];
  const system=base.body.messages[0].content.split('\n').filter(line=>!line.startsWith('JSON shape example:')).join('\n');
  return {protocolVersion:appraisalProtocolVersion,body:{...base.body,messages:[
    {role:'system',content:[system,...additions,`JSON shape example: ${JSON.stringify(example)}`].join('\n')},
    {role:'user',content:JSON.stringify(material)}]}};
}
export class OfflineAppraisalProvider extends FakeProvider {
  constructor({model,simulator,maxOutputTokens=400}={}) {
    super();
    if (typeof simulator!=='function') fail('offline_simulator_required');
    // Validate model/output bounds before a simulator can be invoked.
    // The request builder performs full input checks when generate is called.
    if (!['deepseek-flash','deepseek-v4-pro'].includes(model)||!Number.isSafeInteger(maxOutputTokens)||maxOutputTokens<1||maxOutputTokens>400) fail('invalid_appraisal_settings');
    this.settings={model,maxOutputTokens};this.simulator=simulator;
    this.identity=`${appraisalProtocolVersion}:${model}:${maxOutputTokens}`;
  }
  async generate(payload) {
    if (payload.signal?.aborted) fail('cancelled');
    const request=buildAppraisalRehearsalRequest(payload,this.settings);let response;
    try {response=await this.simulator(copy(request),{signal:payload.signal});}
    catch {fail('offline_simulator_failure');}
    if (payload.signal?.aborted) fail('cancelled');
    const {data}=parseDeepSeekResponse(response,this.settings),material=JSON.parse(request.body.messages[1].content);
    if (payload.stage==='scene') return stageData(normalizeAppraisalScene(data,material.previousAffect));
    return normalizeDeepSeekStage(data,material);
  }
}
// Isolated extension of the same local engine, using the same storage/withdrawal contract.
// No live transport, allowance, credential lookup or automatic repair is added.
export class AppraisalRehearsal extends Nightvoyage {
  executionFamily(){return `specialized:${appraisalProtocolVersion}`;}
  constructor(directory,{model,simulator,maxOutputTokens=400,fault=()=>{}}={}) {
    super(directory,{provider:new OfflineAppraisalProvider({model,simulator,maxOutputTokens}),fault});
  }
  initialRunMetadata(){return {appraisalProtocolVersion};}
  start(requestId,sessionId,input,settings) {
    if (settings?.perCallOutput!==undefined&&settings.perCallOutput!==this.provider.settings.maxOutputTokens) fail('appraisal_output_limit_mismatch');
    const id=super.start(requestId,sessionId,input,{inputTokens:12000,...settings,perCallOutput:this.provider.settings.maxOutputTokens});
    this.run(id).appraisalProtocolVersion=appraisalProtocolVersion;this.store.save();return id;
  }
  execute(id) {
    if (this.run(id).appraisalProtocolVersion!==appraisalProtocolVersion) fail('appraisal_run_protocol_mismatch');
    return super.execute(id);
  }
  resume(id,options) {
    if (this.run(id).appraisalProtocolVersion!==appraisalProtocolVersion) fail('appraisal_run_protocol_mismatch');
    return super.resume(id,options);
  }
  async sceneStep(r,signal) {
    const raw=await this.call(r,'scene',signal);
    if (r.status!=='running'||signal.aborted) return;
    const before=r.scenes.at(-1)?.after??r.snapshot.channels.affect.value??neutral();
    r.scenes.push(normalizeAppraisalScene(raw,before));this.store.save();this.fault('scene_saved');
  }
  async wakeStep(r,signal) {
    const raw=await this.call(r,'wake',signal);
    if (r.status!=='running'||signal.aborted) return;
    r.wake=normalizeDeepSeekStage(raw,{stage:'wake',previousScenes:r.scenes});
    this.publishDream(r);this.store.save();
  }
}
