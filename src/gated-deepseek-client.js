import { buildDeepSeekRequest, parseDeepSeekResponse } from './deepseek-protocol.js';
import { BudgetLedger } from './budget-ledger.js';
import { snapshot, hash, scene, wake, safeId } from './contract.js';
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
  constructor(store, { enabled = false, mode = 'disabled', fetchImpl, timeoutMs = 10000, fault = () => {} } = {}) {
    if (!['disabled','stub','live'].includes(mode) || !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000) fail('invalid_transport_config');
    if (mode === 'stub' && typeof fetchImpl !== 'function') fail('stub_transport_required');
    if (mode === 'live' && fetchImpl !== undefined) fail('live_transport_override_forbidden');
    this.store = store; this.enabled = enabled; this.mode = mode; this.fetchImpl = mode === 'stub' ? fetchImpl : undefined;
    this.timeoutMs = timeoutMs; this.fault = fault; this.pending = new Map(); this.closed = false;
    this.ledger = new BudgetLedger(store);
  }
  checkSources(input) {
    this.store.assert();
    if (input.sources.some(s => s.grant.modelEgress !== true || this.store.withdrawn.includes(s.id))) fail('source_egress_denied_or_withdrawn');
  }
  async send({ allowanceId, requestId, runId, payload, credential, signal } = {}) {
    if (this.closed || this.enabled !== true || this.mode === 'disabled') fail('transport_disabled');
    if (signal?.aborted) fail('cancelled');
    if (typeof credential !== 'string' || !credential.trim() || credential.length > 2000 || /[\r\n]/.test(credential)) fail('credential_required');
    if (!safeId(allowanceId) || !safeId(requestId) || !safeId(runId)) fail('invalid_transport_ids');
    const input = snapshot(payload?.snapshot); this.checkSources(input);
    const allowance = this.ledger.account(allowanceId).allowance;
    if (allowance.mode !== this.mode) fail('allowance_mode_mismatch');
    if (Date.now() >= allowance.expiresAt) fail('allowance_expired');
    const request = buildDeepSeekRequest({ ...payload, snapshot: input }, { model: allowance.pricing.model, maxOutputTokens: 400 });
    // JSON bytes are only a request size guard; cost reserves the whole context bound.
    if (Buffer.byteLength(JSON.stringify(request.body)) > 65536) fail('request_too_large');
    const material = JSON.parse(request.body.messages[1].content);
    const fingerprint = hash({ runId, request: request.body, snapshot: input });
    const reservation = this.ledger.reserve(allowanceId,{ requestId,runId,fingerprint,sourceRefs:input.sources.map(s=>({id:s.id,version:s.version})),maxOutputTokens:400 });
    if (reservation.replayed) return { replayed: true, receipt: reservation.attempt, generated: null };
    const key = `${allowanceId}:${requestId}`, controller = new AbortController();
    this.pending.set(key,{ controller, sourceIds: input.sources.map(s=>s.id) });
    const abort = () => controller.abort(); signal?.addEventListener('abort',abort,{once:true});
    let timer, timedOut = false;
    try {
      this.fault('reserved');
      if (signal?.aborted || this.closed) fail('cancelled');
      this.checkSources(input);
      this.ledger.dispatch(allowanceId,requestId); this.fault('dispatched');
      const stopped = new Promise((_,reject)=>{
        controller.signal.addEventListener('abort',()=>reject(new Error('cancelled')),{once:true});
        timer=setTimeout(()=>{ timedOut = true; controller.abort(); },this.timeoutMs);
      });
      const operation = async () => {
        if (controller.signal.aborted) fail('cancelled');
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
      const value=material.stage==='wake' ? wake(result.data) : scene(result.data,material.previousAffect);
      const receipt=this.ledger.settle(allowanceId,requestId,result.receipt);
      return { replayed:false, receipt, generated:{schemaVersion:1,materialKind:'fictional',origin:material.stage==='wake'?'wake_note':'dream',isRealityFact:false,sourceRefs:copy(receipt.sourceRefs),derivedFrom:[input.id],value} };
    } catch (error) {
      controller.abort();
      if (!this.store.poisoned && !this.store.closed) this.ledger.unknown(allowanceId,requestId);
      const permitted=['source_egress_denied_or_withdrawn','cancelled','storage_io_failure','usage_exceeds_reviewed_bounds','provider_authentication_failed','provider_rate_limited','provider_http_failure','provider_incomplete_response','provider_invalid_json','provider_invalid_usage','provider_empty_or_oversized_content','provider_tools_forbidden','provider_response_too_large'];
      fail(timedOut ? 'timeout' : permitted.includes(error.message)?error.message:'request_failed');
    } finally {clearTimeout(timer);signal?.removeEventListener('abort',abort);this.pending.delete(key);}
  }
  withdraw(sourceId) { this.store.withdraw(sourceId); for(const pending of this.pending.values())if(pending.sourceIds.includes(sourceId))pending.controller.abort(); }
  close() { this.closed=true;for(const {controller} of this.pending.values())controller.abort(); }
}
