// Project-owned standalone offline runtime. Reuses the existing core, never paid entries.
import {Nightvoyage} from '../src/engine.js';
import {FakeProvider} from '../src/fake-provider.js';
import {copy,fail} from '../src/store.js';
import {snapshot,hash,neutral} from '../src/contract.js';
import {normalizeInlineFixture,fictionalInlineContext,inlineReviewVersion} from './inline-evidence-review.js';
import {buildDeepSeekRequest} from '../src/deepseek-protocol.js';
import {parseDeepSeekResponse,normalizeDeepSeekStage} from '../src/deepseek-protocol.js';
import {sceneContinuityPrompt} from '../src/scene-continuity-prompt-text.js';
import {assertAppraisalReviewJsonData} from '../src/appraisal-review-memory.js';
export const inlineRuntimeVersion='offline-inline-runtime-v1';
const inlineRules=[
  'Return exactly event, appraisal, basis and affect. No evidence table, links or numeric evidence references. No explanations or hidden reasoning.',
  'basis contains exactly goal, control and uncertainty. goal is null or [exactGoalText,exactOutcomeText]; control and uncertainty are null or exact event text.',
  'Use goalEffect:0 and basis.goal:null without a stated goal effect. Nonzero goalEffect requires both exact goal and outcome quotations. Mystery alone is not goal damage.',
  'Null control/uncertainty basis requires value 0.5 as UNKNOWN placeholder; another numeric value requires a quotation.',
  'affect is exactly {"kind":"unchanged"}, or {"kind":"estimated","delta":{"valence":0.1,"arousal":0},"excerpt":"exact current event text"}. Estimated zero also requires an excerpt. Never infer unchanged merely to omit evidence.',
  'Every non-null excerpt must be a nonblank exact contiguous quote from this event, at most 64 Unicode codepoints; repeat the exact text when fields share evidence. No offsets or automatic repairs.',
  'Keep event and every quotation within the same 400-token/1200-JSON-byte cap. Literal quotes do not establish semantic support. No scene invented merely to justify a number.'
];
const promptHash=hash({inlineRules,secondScene:sceneContinuityPrompt});
function stamp(scene,version){const value=copy(scene);value.appraisalBasis.protocolVersion=version;return value;}
function wire(saved){
  const e=saved.appraisalBasis.evidence;
  return {event:saved.event,appraisal:copy(saved.appraisal),basis:{goal:e.goal===null?null:[e.goal.goalExcerpt,e.goal.outcomeExcerpt],control:e.controlExcerpt,uncertainty:e.uncertaintyExcerpt},affect:saved.affectDeclaration.kind==='unchanged'?{kind:'unchanged'}:{kind:'estimated',delta:copy(saved.delta),excerpt:e.affectExcerpt}};
}
function checkpoint(saved,before){
  if(saved?.appraisalBasis?.protocolVersion!==inlineRuntimeVersion)fail('invalid_inline_checkpoint');
  let normalized;try{normalized=stamp(normalizeInlineFixture(fictionalInlineContext(wire(saved)),before),inlineRuntimeVersion);}catch{fail('invalid_inline_checkpoint');}
  if(hash(normalized)!==hash(saved))fail('invalid_inline_checkpoint');return normalized;
}
function previousScenes(saved,input){let before=snapshot(input).channels.affect.value??neutral();return saved.map(s=>{const v=checkpoint(s,before);before=v.after;return v;});}
export function buildInlineRehearsalRequest(payload){
  assertAppraisalReviewJsonData(payload);const keys=['snapshot','scenes','stage','index'];
  if(!payload||Array.isArray(payload)||Object.keys(payload).length!==keys.length||keys.some(k=>!Object.hasOwn(payload,k))||!Array.isArray(payload.scenes)||payload.scenes.length>2||!['scene','wake'].includes(payload.stage)||payload.index!==payload.scenes.length||(payload.stage==='scene'&&payload.index>1)||(payload.stage==='wake'&&payload.index!==2))fail('invalid_inline_stage');
  const input=snapshot(payload.snapshot);if(payload.snapshot.sources.some(s=>s.grant.modelEgress!==false)||input.sources.some(s=>s.grant.modelEgress!==false))fail('offline_no_egress_fixture_required');
  const previous=previousScenes(payload.scenes,input),request=buildDeepSeekRequest({...payload,snapshot:input,scenes:previous},{model:'deepseek-flash',maxOutputTokens:400}),material=JSON.parse(request.body.messages[1].content);
  material.previousScenes=previous;request.body.messages[1].content=JSON.stringify(material);
  if(payload.stage==='scene'){
    const example={event:'梦里的人望着桌边的纸片。',appraisal:{goalEffect:0,control:.5,uncertainty:.5},basis:{goal:null,control:null,uncertainty:null},affect:{kind:'unchanged'}};
    request.body.messages[0].content=request.body.messages[0].content.split('\n').filter(l=>!l.startsWith('JSON shape example:')).concat(inlineRules,`JSON shape example: ${JSON.stringify(example)}`,...(payload.index===1?[sceneContinuityPrompt]:[])).join('\n');
  }
  request.protocolVersion=inlineRuntimeVersion;
  if(Buffer.byteLength(JSON.stringify(request.body))>65536)fail('request_too_large');return request;
}
export class OfflineInlineProvider extends FakeProvider {
  constructor({simulator}={}) {
    super();if(typeof simulator!=='function')fail('offline_simulator_required');
    Object.defineProperties(this,{identity:{value:`${inlineRuntimeVersion}:${inlineReviewVersion}:${promptHash}:deepseek-flash:400`,enumerable:true},simulator:{value:simulator}});
  }
  async generate(payload) {
    if(payload.signal?.aborted)fail('cancelled');
    const request=buildInlineRehearsalRequest({snapshot:payload.snapshot,scenes:payload.scenes,stage:payload.stage,index:payload.index});
    let response;
    try{response=await this.simulator(copy(request),{signal:payload.signal});}catch{fail('offline_simulator_failure');}
    if(payload.signal?.aborted)fail('cancelled');
    const {data}=parseDeepSeekResponse(response,{model:'deepseek-flash',maxOutputTokens:400});
    // Validation/publication happens in the core's stage path, not in caller metadata.
    return copy(data);
  }
}
export class InlineRehearsal extends Nightvoyage {
  constructor(directory,options={}) {
    if(!options||typeof options!=='object'||Object.keys(options).some(k=>!['simulator','fault'].includes(k)))fail('invalid_inline_runtime_options');
    const provider=new OfflineInlineProvider({simulator:options.simulator});
    super(directory,{provider,fault:options.fault});
  }
  initialRunMetadata(){return {appraisalProtocolVersion:inlineRuntimeVersion,wireReviewVersion:inlineReviewVersion,promptCandidateHash:promptHash,wakePolicyVersion:'saved-scene-excerpt-v1',budgetKind:'fake_byte_estimate_only'};}
  start(requestId,sessionId,input,settings={}){
    const normalized=snapshot(input);
    if(input.sources.some(s=>s.grant.modelEgress!==false)||normalized.sources.some(s=>s.grant.modelEgress!==false))fail('offline_no_egress_fixture_required');
    if((settings.scenes!==undefined&&settings.scenes!==2)||(settings.perCallOutput!==undefined&&settings.perCallOutput!==400))fail('invalid_inline_runtime_settings');
    return super.start(requestId,sessionId,input,{inputTokens:16000,...settings,scenes:2,perCallOutput:400});
  }
  assertIdentity(id){
    const r=this.run(id);
    if(r.appraisalProtocolVersion!==inlineRuntimeVersion||r.wireReviewVersion!==inlineReviewVersion||r.wakePolicyVersion!=='saved-scene-excerpt-v1'||r.promptCandidateHash!==promptHash||r.budgetKind!=='fake_byte_estimate_only')fail('inline_runtime_identity_mismatch');
    if(r.snapshot&&r.scenes){if(r.snapshot.sources.some(s=>s.grant.modelEgress!==false))fail('offline_no_egress_fixture_required');previousScenes(r.scenes,r.snapshot);}
    return r;
  }
  appraisalView(entryId){
    const entry=this.read(entryId);if(!entry)return null;const r=this.assertIdentity(entry.runId);
    if(r.status!=='completed'||entry.origin!=='dream'||r.entryId!==entryId||hash(entry.scenes)!==hash(r.scenes)||hash(entry.sourceRefs)!==hash(r.snapshot.sources.map(s=>({id:s.id,version:s.version}))))fail('invalid_inline_view');
    return {schemaVersion:1,protocolVersion:inlineRuntimeVersion,origin:'offline_inline_appraisal_view',materialKind:'fictional',isRealityFact:false,sourceRefs:copy(entry.sourceRefs),derivedFrom:[entryId],scenes:copy(r.scenes),semanticSupport:'not_assessed',qualityAssessed:false};
  }
  execute(id){this.assertIdentity(id);return super.execute(id);}
  resume(id,options={}){
    const r=this.assertIdentity(id);
    // Only a complete durable scene prefix with no extra dispatched/received attempt.
    // An interrupted simulator call has no result to replay or automatically retry.
    if(Object.keys(options).length||!['failed','uncertain'].includes(r.status)||!r.scenes?.length||r.budget.calls!==r.scenes.length||r.attempts.length!==r.scenes.length||r.attempts.some(a=>a.state!=='received'))fail('inline_resume_requires_saved_prefix');
    return super.resume(id,{retryUnknown:true});
  }
  async sceneStep(r,signal){
    const raw=await this.call(r,'scene',signal);if(r.status!=='running'||signal.aborted)return;
    const before=r.scenes.at(-1)?.after??r.snapshot.channels.affect.value??neutral();
    r.scenes.push(stamp(normalizeInlineFixture(fictionalInlineContext(raw),before),inlineRuntimeVersion));this.store.save();this.fault('scene_saved');
  }
  async wakeStep(r,signal){
    const raw=await this.call(r,'wake',signal);if(r.status!=='running'||signal.aborted)return;
    r.wake=normalizeDeepSeekStage(raw,{stage:'wake',previousScenes:r.scenes});this.publishDream(r);this.store.save();this.fault('wake_saved');
  }
}
