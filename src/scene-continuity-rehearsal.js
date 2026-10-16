// Simulator-only runtime on the existing dream core. No paid client/key/HTTP entry.
import {Nightvoyage} from './engine.js';
import {FakeProvider} from './fake-provider.js';
import {copy,fail} from './store.js';
import {snapshot,hash,neutral} from './contract.js';
import {normalizeBudgetCoupledScene,normalizeBudgetCoupledCheckpoint,coupledBudgetVersion} from './coupled-affect-protocol.js';
import {parseDeepSeekResponse,normalizeDeepSeekStage} from './deepseek-protocol.js';
import {compareSceneContinuityRequest,sceneContinuityPrompt,sceneContinuityPromptVersion} from './scene-continuity-prompt.js';
export const continuityRehearsalVersion='offline-scene-continuity-runtime-v1';
const promptHash=hash(sceneContinuityPrompt);
function stamp(scene,version){const value=copy(scene);value.appraisalBasis.protocolVersion=version;return value;}
function checkpoint(saved,before){
  if(saved?.appraisalBasis?.protocolVersion!==continuityRehearsalVersion)fail('invalid_continuity_checkpoint');
  const normalized=stamp(normalizeBudgetCoupledCheckpoint(stamp(saved,coupledBudgetVersion),before),continuityRehearsalVersion);
  if(hash(normalized)!==hash(saved))fail('invalid_continuity_checkpoint');return normalized;
}
function previousScenes(saved,input){let before=snapshot(input).channels.affect.value??neutral();return saved.map(s=>{const scene=checkpoint(s,before);before=scene.after;return stamp(scene,coupledBudgetVersion);});}
export class OfflineContinuityProvider extends FakeProvider {
  constructor({simulator}={}) {
    super();if(typeof simulator!=='function')fail('offline_simulator_required');
    Object.defineProperties(this,{identity:{value:`${continuityRehearsalVersion}:${sceneContinuityPromptVersion}:${promptHash}:deepseek-flash:400`,enumerable:true},simulator:{value:simulator}});
  }
  async generate(payload) {
    if(payload.signal?.aborted)fail('cancelled');
    const comparison=compareSceneContinuityRequest({snapshot:payload.snapshot,scenes:previousScenes(payload.scenes,payload.snapshot),stage:payload.stage,index:payload.index});
    if(!comparison.requestBytes.candidateFits)fail('request_too_large');
    let response;
    try{response=await this.simulator(copy(comparison.candidate),{signal:payload.signal});}catch{fail('offline_simulator_failure');}
    if(payload.signal?.aborted)fail('cancelled');
    const {data}=parseDeepSeekResponse(response,{model:'deepseek-flash',maxOutputTokens:400});
    // Validation/publication happens in the core's stage path, not in caller metadata.
    return copy(data);
  }
}
export class ContinuityRehearsal extends Nightvoyage {
  executionFamily(){return `specialized:${continuityRehearsalVersion}`;}
  constructor(directory,options={}) {
    if(!options||typeof options!=='object'||Object.keys(options).some(k=>!['simulator','fault'].includes(k)))fail('invalid_continuity_runtime_options');
    const provider=new OfflineContinuityProvider({simulator:options.simulator});
    super(directory,{provider,fault:options.fault});
  }
  initialRunMetadata(){return {appraisalProtocolVersion:continuityRehearsalVersion,promptCandidateVersion:sceneContinuityPromptVersion,promptCandidateHash:promptHash,budgetKind:'fake_byte_estimate_only'};}
  start(requestId,sessionId,input,settings={}){
    const normalized=snapshot(input);
    if(input.sources.some(s=>s.grant.modelEgress!==false)||normalized.sources.some(s=>s.grant.modelEgress!==false))fail('offline_no_egress_fixture_required');
    if((settings.scenes!==undefined&&settings.scenes!==2)||(settings.perCallOutput!==undefined&&settings.perCallOutput!==400))fail('invalid_continuity_runtime_settings');
    return super.start(requestId,sessionId,input,{inputTokens:16000,...settings,scenes:2,perCallOutput:400});
  }
  assertIdentity(id){
    const r=this.run(id);
    if(r.appraisalProtocolVersion!==continuityRehearsalVersion||r.promptCandidateVersion!==sceneContinuityPromptVersion||r.promptCandidateHash!==promptHash||r.budgetKind!=='fake_byte_estimate_only')fail('continuity_runtime_identity_mismatch');
    if(r.snapshot&&r.scenes){if(r.snapshot.sources.some(s=>s.grant.modelEgress!==false))fail('offline_no_egress_fixture_required');previousScenes(r.scenes,r.snapshot);}
    return r;
  }
  execute(id){this.assertIdentity(id);return super.execute(id);}
  resume(id,options={}){
    const r=this.assertIdentity(id);
    // Only a complete durable scene prefix with no extra dispatched/received attempt.
    // An interrupted simulator call has no result to replay or automatically retry.
    if(Object.keys(options).length||!['failed','uncertain'].includes(r.status)||!r.scenes?.length||r.budget.calls!==r.scenes.length||r.attempts.length!==r.scenes.length||r.attempts.some(a=>a.state!=='received'))fail('continuity_resume_requires_saved_prefix');
    return super.resume(id,{retryUnknown:true});
  }
  async sceneStep(r,signal){
    const raw=await this.call(r,'scene',signal);if(r.status!=='running'||signal.aborted)return;
    const before=r.scenes.at(-1)?.after??r.snapshot.channels.affect.value??neutral();
    r.scenes.push(stamp(normalizeBudgetCoupledScene(raw,before),continuityRehearsalVersion));this.store.save();this.fault('scene_saved');
  }
  async wakeStep(r,signal){
    const raw=await this.call(r,'wake',signal);if(r.status!=='running'||signal.aborted)return;
    r.wake=normalizeDeepSeekStage(raw,{stage:'wake',previousScenes:r.scenes});this.publishDream(r);this.store.save();this.fault('wake_saved');
  }
}
