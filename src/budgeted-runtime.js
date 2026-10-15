import { Nightvoyage } from './engine.js';
import { GatedDeepSeekClient } from './gated-deepseek-client.js';
import { copy, fail } from './store.js';
import { protocolVersion } from './deepseek-protocol.js';

// Same dream core and journal. Only stage dispatch/publication differs from fake mode.
export class BudgetedNightvoyage extends Nightvoyage {
  constructor(directory, { allowance, credential, enabled = false, mode = 'disabled', fetchImpl, timeoutMs = 60000, fault = () => {}, protocol = 'grounded-wake-v2' } = {}) {
    super(directory,{fault});
    try {
      this.client = new GatedDeepSeekClient(this.store,{enabled,mode,fetchImpl,timeoutMs,fault,protocol});
      this.client.ledger.approve(allowance);
      this.allowanceId = allowance.id; this.credential = credential;
      this.provider.identity = `${this.client.protocolVersion}:${mode}:${allowance.id}:${allowance.pricing.model}`;
    } catch (e) { this.store.close(); throw e; }
  }
  initialRunMetadata() {
    return {billingAllowanceId:this.allowanceId,billingProtocolVersion:this.client.protocolVersion,
      ...(this.client.protocol!=='grounded-wake-v2'?{appraisalProtocolVersion:this.client.protocolVersion}:{})};
  }
  start(requestId,sessionId,input,settings={}) {
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
  }
  execute(id) {this.assertRunIdentity(id);return super.execute(id);}
  resume(id,options) {this.assertRunIdentity(id);return super.resume(id,options);}
  async stage(r,stage,signal) {
    const rows = this.client.ledger.status(this.allowanceId).attempts.filter(t=>t.runId===r.id);
    const requestId = `stage-${r.id}-${stage}-${r.scenes.length}`;
    // Replays of an uncommitted response never cause a new paid request.
    if (!rows.some(t=>t.requestId===requestId) && rows.length>=r.config.maxCalls) fail('budget_exhausted');
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
