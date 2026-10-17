import {inlineProtocolVersion,buildInlineRequest,normalizeInlineStage,normalizeInlineScene,inlineDiagnostic} from './inline-evidence-protocol.js';
import {assertContinuityLiveStore} from './continuity-trial-config.js';
import {continuityBudgetVersion,buildContinuityRequest,normalizeContinuityStage,normalizeContinuityScene,continuityDiagnostic} from './scene-continuity-protocol.js';
import { coupledBudgetVersion, buildBudgetCoupledRequest, normalizeBudgetCoupledStage, normalizeBudgetCoupledScene, coupledBudgetDiagnostic } from './coupled-affect-protocol.js';
import { buildDeepSeekRequest, parseDeepSeekResponse, normalizeDeepSeekStage, protocolVersion } from './deepseek-protocol.js';
import { buildCompactAppraisalRequest, normalizeCompactStage, normalizeCompactScene, compactProtocolVersion } from './compact-appraisal-protocol.js';
import { compactValidationDiagnostic } from './validation-diagnostic.js';
import { prunedCompactV2Version, buildPrunedV2Request, normalizePrunedV2Stage, normalizePrunedV2Scene, prunedV2Diagnostic } from './compact-v2-protocol.js';
import { BudgetLedger } from './budget-ledger.js';
import { snapshot, hash, safeId } from './contract.js';
import { fail, copy } from './store.js';

async function boundedBody(response, signal) {
  if (!response.body?.getReader) fail('invalid_http_body');
  const reader = response.body.getReader(); const parts = []; let length = 0;
  try {
    while (true) {
      if (signal.aborted) fail('cancelled');
      const { done, value } = await reader.read(); if (done) break;
      length += value.byteLength; if (length > 65536) fail('provider_response_too_large');
      parts.push(Buffer.from(value));
    }
    try { return JSON.parse(Buffer.concat(parts).toString('utf8')); } catch { fail('provider_invalid_json'); }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
export class GatedDeepSeekClient {
  constructor(store, { enabled = false, mode = 'disabled', fetchImpl, timeoutMs = 10000, fault = () => {}, protocol = 'grounded-wake-v2' } = {}) {
    if (!['grounded-wake-v2','compact-appraisal-v1','compact-appraisal-v2','coupled-affect-v1','scene-continuity-v1','inline-evidence-v1'].includes(protocol)) fail('unreviewed_transport_protocol');
    if(protocol==='inline-evidence-v1'&&mode==='live')fail('inline_live_entry_pending');
    if(protocol==='scene-continuity-v1'&&mode==='live')assertContinuityLiveStore(store);
    if (!['disabled','stub','live'].includes(mode) || !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000) fail('invalid_transport_config');
    if (mode === 'stub' && typeof fetchImpl !== 'function') fail('stub_transport_required');
    if (mode === 'live' && fetchImpl !== undefined) fail('live_transport_override_forbidden');
    this.store = store; this.enabled = enabled; this.mode = mode; this.fetchImpl = mode === 'stub' ? fetchImpl : undefined;
    this.timeoutMs = timeoutMs; this.fault = fault; this.pending = new Map(); this.closed = false;
    Object.defineProperties(this,{protocol:{value:protocol,enumerable:true},
      protocolVersion:{value:protocol==='inline-evidence-v1'?inlineProtocolVersion:protocol==='scene-continuity-v1'?continuityBudgetVersion:protocol==='coupled-affect-v1'?coupledBudgetVersion:protocol==='compact-appraisal-v2'?prunedCompactV2Version:protocol==='compact-appraisal-v1'?compactProtocolVersion:protocolVersion,enumerable:true}});
    this.ledger = new BudgetLedger(store);
  }
  checkSources(input) {
    this.store.assert();
    if (input.sources.some(s => s.grant.modelEgress !== true || this.store.withdrawn.includes(s.id))) fail('source_egress_denied_or_withdrawn');
  }
  checkAdmission(_context,_phase) {}
  async send({ allowanceId, requestId, runId, payload, credential, signal, publish } = {}) {
    if(this.protocol==='scene-continuity-v1'&&this.mode==='live')assertContinuityLiveStore(this.store,{allowanceId,requestId,runId,payload});
    if (this.closed || this.enabled !== true || this.mode === 'disabled') fail('transport_disabled');
    if(this.protocol==='inline-evidence-v1'&&this.mode!=='stub')fail('inline_live_entry_pending');
    const admission={allowanceId,requestId,runId,payload};this.checkAdmission(admission,'before_reservation');
    if (signal?.aborted) fail('cancelled');
    if (typeof credential !== 'string' || !credential.trim() || credential.length > 2000 || /[\r\n]/.test(credential)) fail('credential_required');
    if (!safeId(allowanceId) || !safeId(requestId) || !safeId(runId)) fail('invalid_transport_ids');
    const input = snapshot(payload?.snapshot); this.checkSources(input);
    const allowance = this.ledger.account(allowanceId).allowance;
    if(allowance.entryAuthorizationVersion!==undefined&&this.checkAdmission===GatedDeepSeekClient.prototype.checkAdmission)fail('trial_managed_client_required');
    if (allowance.mode !== this.mode) fail('allowance_mode_mismatch');
    if ((['compact-appraisal-v2','coupled-affect-v1','scene-continuity-v1','inline-evidence-v1'].includes(this.protocol)&&allowance.protocolVersion!==this.protocolVersion)||
        (allowance.protocolVersion!==undefined&&allowance.protocolVersion!==this.protocolVersion)) fail('allowance_protocol_mismatch');
    if (Date.now() >= allowance.expiresAt) fail('allowance_expired');
    const build=this.protocol==='inline-evidence-v1'?buildInlineRequest:this.protocol==='scene-continuity-v1'?buildContinuityRequest:this.protocol==='coupled-affect-v1'?buildBudgetCoupledRequest:this.protocol==='compact-appraisal-v2'?buildPrunedV2Request:this.protocol==='compact-appraisal-v1'?buildCompactAppraisalRequest:buildDeepSeekRequest;
    const request = build({ ...payload, snapshot: input }, { model: allowance.pricing.model, maxOutputTokens: 400 });
    // JSON bytes are only a request size guard; cost reserves the whole context bound.
    if (Buffer.byteLength(JSON.stringify(request.body)) > 65536) fail('request_too_large');
    const material = JSON.parse(request.body.messages[1].content);
    const fingerprint = hash({ runId, request: request.body, snapshot: input });
    const reservation = this.ledger.reserve(allowanceId,{ requestId,runId,fingerprint,sourceRefs:input.sources.map(s=>({id:s.id,version:s.version})),maxOutputTokens:400 });
    if (reservation.replayed) return { replayed: true, receipt: reservation.attempt, generated: null };
    const key = `${allowanceId}:${requestId}`, controller = new AbortController();
    this.pending.set(key,{ controller, sourceIds: input.sources.map(s=>s.id) });
    const abort = () => controller.abort(); signal?.addEventListener('abort',abort,{once:true});
    let timer, timedOut = false, validationDiagnostic;
    try {
      this.fault('reserved');
      if (signal?.aborted || this.closed) fail('cancelled');
      this.checkAdmission(admission,'before_dispatch');
      this.checkSources(input);
      this.ledger.dispatch(allowanceId,requestId); this.fault('dispatched');
      const stopped = new Promise((_,reject)=>{
        controller.signal.addEventListener('abort',()=>reject(new Error('cancelled')),{once:true});
        timer=setTimeout(()=>{ timedOut = true; controller.abort(); },this.timeoutMs);
      });
      const operation = async () => {
        if (controller.signal.aborted) fail('cancelled');
        this.checkSources(input);
        this.checkAdmission(admission,'before_http');
        // Native fetch is reached only for explicitly enabled, approved live mode.
        const transport = this.mode === 'stub' ? this.fetchImpl : globalThis.fetch;
        const response = await transport(request.endpoint,{ method:'POST',redirect:'error',signal:controller.signal,headers:{'Content-Type':'application/json',Authorization:`Bearer ${credential}`},body:JSON.stringify(request.body) });
        if (controller.signal.aborted) fail('cancelled');
        if (response.status !== 200) return parseDeepSeekResponse({ status:response.status },{model:allowance.pricing.model});
        const body=await boundedBody(response,controller.signal);
        return parseDeepSeekResponse({status:response.status,body},{model:allowance.pricing.model});
      };
      const result=await Promise.race([operation(),stopped]);
      if (controller.signal.aborted || this.closed) fail('cancelled'); this.checkSources(input);
      this.checkAdmission(admission,'response');
      const normalize=this.protocol==='inline-evidence-v1'?normalizeInlineStage:this.protocol==='scene-continuity-v1'?normalizeContinuityStage:this.protocol==='coupled-affect-v1'?normalizeBudgetCoupledStage:this.protocol==='compact-appraisal-v2'?normalizePrunedV2Stage:this.protocol==='compact-appraisal-v1'?normalizeCompactStage:normalizeDeepSeekStage;
      let value;
      if (this.protocol!=='grounded-wake-v2' && material.stage==='scene') {
        const sceneNormalizer=this.protocol==='inline-evidence-v1'?normalizeInlineScene:this.protocol==='scene-continuity-v1'?normalizeContinuityScene:this.protocol==='coupled-affect-v1'?normalizeBudgetCoupledScene:this.protocol==='compact-appraisal-v2'?normalizePrunedV2Scene:normalizeCompactScene;
        try {value=sceneNormalizer(result.data,material.previousAffect);}
        catch (error) {validationDiagnostic=this.protocol==='inline-evidence-v1'?inlineDiagnostic(error?.message):this.protocol==='scene-continuity-v1'?continuityDiagnostic(error?.message):this.protocol==='coupled-affect-v1'?coupledBudgetDiagnostic(error?.message):this.protocol==='compact-appraisal-v2'?prunedV2Diagnostic(error?.message):compactValidationDiagnostic(error?.message);fail('compact_appraisal_invalid');}
      } else value=normalize(result.data,material);
      if (publish !== undefined && typeof publish !== 'function') fail('invalid_publication');
      this.checkAdmission(admission,'before_settlement');
      const receipt=this.ledger.settle(allowanceId,requestId,result.receipt,publish ? accounting => {this.checkAdmission(admission,'publish');return publish(copy(value),accounting);} : undefined);
      return { replayed:false, receipt, generated:{schemaVersion:1,materialKind:'fictional',origin:material.stage==='wake'?'wake_note':'dream',isRealityFact:false,sourceRefs:copy(receipt.sourceRefs),derivedFrom:[input.id],value} };
    } catch (error) {
      controller.abort();
      if (!this.store.poisoned && !this.store.closed) this.ledger.unknown(allowanceId,requestId,validationDiagnostic);
      const permitted=['compact_appraisal_invalid','wake_fragment_not_grounded','source_egress_denied_or_withdrawn','cancelled','storage_io_failure','usage_exceeds_reviewed_bounds','provider_authentication_failed','provider_rate_limited','provider_http_failure','provider_incomplete_response','provider_invalid_json','provider_invalid_usage','provider_empty_or_oversized_content','provider_tools_forbidden','provider_response_too_large'];
      fail(timedOut ? 'timeout' : permitted.includes(error.message)?error.message:'request_failed');
    } finally {clearTimeout(timer);signal?.removeEventListener('abort',abort);this.pending.delete(key);}
  }
  withdraw(sourceId) { this.store.withdraw(sourceId); for(const pending of this.pending.values())if(pending.sourceIds.includes(sourceId))pending.controller.abort(); }
  close() { this.closed=true;for(const {controller} of this.pending.values())controller.abort(); }
}
