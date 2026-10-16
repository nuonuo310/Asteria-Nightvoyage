import {inlineProtocolVersion,normalizeInlineCheckpoint,inlineIdentity} from './inline-evidence-protocol.js';
import {assertContinuityApprovalDirectory,continuityTrialId,continuityTrialInput} from './continuity-trial-config.js';
import {continuityBudgetVersion,continuityIdentity,normalizeContinuityCheckpoint} from './scene-continuity-protocol.js';
import { coupledBudgetVersion, normalizeBudgetCoupledCheckpoint } from './coupled-affect-protocol.js';
import { neutral,hash,snapshot } from './contract.js';
import { Nightvoyage } from './engine.js';
import { GatedDeepSeekClient } from './gated-deepseek-client.js';
import { copy, fail } from './store.js';
import { protocolVersion } from './deepseek-protocol.js';

// Same dream core and journal. Only stage dispatch/publication differs from fake mode.
export class BudgetedNightvoyage extends Nightvoyage {
  executionFamily(){return `specialized:${this.client.protocolVersion}`;}
  constructor(directory, { allowance, credential, enabled = false, mode = 'disabled', fetchImpl, timeoutMs = 60000, fault = () => {}, protocol = 'grounded-wake-v2' } = {}) {
    if(protocol==='inline-evidence-v1'&&(mode==='live'||allowance?.mode==='live'))fail('inline_live_entry_pending');
    if(protocol==='scene-continuity-v1'&&mode==='live'){const c=assertContinuityApprovalDirectory(directory);if(hash(allowance)!==hash(c.allowance))fail('continuity_allowance_mismatch');}
    super(directory,{fault});
    try {
      const checkedAllowance=this.beforeBudgetAccount({allowance,mode,protocol})??allowance;
      this.client = this.createBudgetClient({enabled,mode,fetchImpl,timeoutMs,fault,protocol});
      this.client.ledger.approve(checkedAllowance);
      this.allowanceId = checkedAllowance.id; this.credential = credential;
      this.provider.identity = `${this.client.protocolVersion}:${mode}:${checkedAllowance.id}:${checkedAllowance.pricing.model}`;
    } catch (e) { this.store.close(); throw e; }
  }
  beforeBudgetAccount(_options) {}
  createBudgetClient(options) {return new GatedDeepSeekClient(this.store,options);}
  legacyExecutionMetadata(r) {
    const expected=this.initialRunMetadata();
    if(this.client.protocol==='grounded-wake-v2'&&!Object.hasOwn(r,'billingProtocolVersion'))delete expected.billingProtocolVersion;
    return expected;
  }
  initialRunMetadata() {
    return {billingAllowanceId:this.allowanceId,billingProtocolVersion:this.client.protocolVersion,
      ...(this.client.protocol!=='grounded-wake-v2'?{appraisalProtocolVersion:this.client.protocolVersion}:{}),
      ...(this.client.protocol==='scene-continuity-v1'?continuityIdentity():{}),
      ...(this.client.protocol==='inline-evidence-v1'?inlineIdentity():{}),
      ...(this.client.protocol==='coupled-affect-v1'?{normalizationPolicyVersion:'validated-unused-quotation-pruning-v1',affectEncodingVersion:'explicit-affect-union-v1'}:{})};
  }
  start(requestId,sessionId,input,settings={}) {
    if(this.client.protocol==='scene-continuity-v1'&&this.client.mode==='live'){const c=assertContinuityApprovalDirectory(this.store.directory);if(requestId!==continuityTrialId||sessionId!==continuityTrialId||hash(snapshot(input))!==hash(snapshot(continuityTrialInput(c))))fail('continuity_run_identity_mismatch');}
    if(['scene-continuity-v1','inline-evidence-v1'].includes(this.client.protocol)&&settings.scenes!==undefined&&settings.scenes!==2)fail('invalid_continuity_stage');
    const pricing = this.client.ledger.account(this.allowanceId).allowance.pricing;
    // Input is bounded by reviewed provider context; never use the fake byte estimate.
    if (settings.perCallOutput !== undefined && settings.perCallOutput !== 400) fail('unsupported_live_output_limit');
    const id = super.start(requestId,sessionId,input,{inputTokens:pricing.contextTokenLimit*3,timeoutMs:60000,...settings});
    this.run(id).billingAllowanceId = this.allowanceId;
    this.run(id).billingProtocolVersion=this.client.protocolVersion;
    if (this.client.protocol!=='grounded-wake-v2') this.run(id).appraisalProtocolVersion=this.client.protocolVersion;
    this.store.save(); return id;
  }
  assertRunIdentity(id) {
    const r=this.run(id),version=r.billingProtocolVersion??r.appraisalProtocolVersion??protocolVersion;
    if (r.billingAllowanceId!==this.allowanceId||version!==this.client.protocolVersion||
        (this.client.protocol!=='grounded-wake-v2'&&r.appraisalProtocolVersion!==this.client.protocolVersion)) fail('billing_run_identity_mismatch');
    if(this.client.protocolVersion===continuityBudgetVersion){
      if(Object.entries(continuityIdentity()).some(([k,v])=>r[k]!==v))fail('billing_run_identity_mismatch');
      if(r.snapshot&&r.scenes){let before=r.snapshot.channels.affect.value??neutral();for(const scene of r.scenes)before=normalizeContinuityCheckpoint(scene,before).after;}
    }
    if(this.client.protocolVersion===inlineProtocolVersion){
      if(Object.entries(inlineIdentity()).some(([k,v])=>r[k]!==v))fail('billing_run_identity_mismatch');
      if(r.snapshot&&r.scenes){let before=r.snapshot.channels.affect.value??neutral();for(const scene of r.scenes)before=normalizeInlineCheckpoint(scene,before).after;}
    }
    if(this.client.protocolVersion===coupledBudgetVersion){
      if(r.normalizationPolicyVersion!=='validated-unused-quotation-pruning-v1'||r.affectEncodingVersion!=='explicit-affect-union-v1')fail('billing_run_identity_mismatch');
      if(r.snapshot&&r.scenes){let before=r.snapshot.channels.affect.value??neutral();for(const scene of r.scenes){before=normalizeBudgetCoupledCheckpoint(scene,before).after;}}
    }
  }
  execute(id) {this.assertRunIdentity(id);return super.execute(id);}
  resume(id,options) {
    this.assertRunIdentity(id);
    if(this.client.protocol==='inline-evidence-v1'){
      const r=this.run(id),rows=this.client.ledger.status(this.allowanceId).attempts.filter(t=>t.runId===id);
      if(!r.scenes?.length||rows.length!==r.scenes.length||rows.some(t=>t.status!=='settled')||r.attempts.length!==r.scenes.length||r.attempts.some((a,i)=>a.stage!=='scene'||a.index!==i||a.state!=='committed'||!rows.some(t=>t.requestId===a.billingRequestId)))fail('inline_resume_requires_committed_prefix');
    }
    return super.resume(id,options);
  }
  async stage(r,stage,signal) {
    const rows = this.client.ledger.status(this.allowanceId).attempts.filter(t=>t.runId===r.id);
    const requestId = `stage-${r.id}-${stage}-${r.scenes.length}`;
    // Replays of an uncommitted response never cause a new paid request.
    if (!rows.some(t=>t.requestId===requestId) && rows.length>=r.config.maxCalls) fail('budget_exhausted');
    if(this.client.protocol==='inline-evidence-v1'&&!rows.some(t=>t.requestId===requestId)){
      const context=this.client.ledger.account(this.allowanceId).allowance.pricing.contextTokenLimit;
      if(rows.reduce((n,t)=>n+(t.usage?.inputTokens??context),0)+context>r.config.inputTokens||rows.reduce((n,t)=>n+(t.usage?.outputTokens??400),0)+400>r.config.outputTokens)fail('budget_exhausted');
    }
    const result = await this.client.send({allowanceId:this.allowanceId,requestId,runId:r.id,credential:this.credential,signal,
      payload:{stage,index:r.scenes.length,snapshot:copy(r.snapshot),scenes:copy(r.scenes)},
      publish:(value,accounting)=>{
        if (r.status!=='running' || signal.aborted) fail('cancelled');
        if (stage==='scene') r.scenes.push(value);
        else {r.wake=value;this.publishDream(r);}
        r.attempts.push({stage,index:stage==='scene'?r.scenes.length-1:r.scenes.length,state:'committed',billingRequestId:accounting.requestId});
      }});
    if (result.replayed) fail('ambiguous_attempt');
    this.fault(stage==='scene'?'scene_saved':'wake_saved');
  }
  sceneStep(r,signal) { return this.stage(r,'scene',signal); }
  wakeStep(r,signal) { return this.stage(r,'wake',signal); }
  withdraw(sourceId) { super.withdraw(sourceId); }
  close() {
    if (this.active.size) fail('active_runs');
    this.credential=undefined; this.client?.close(); super.close();
  }
}
