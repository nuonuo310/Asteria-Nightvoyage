import {continuityBudgetVersion,reviewedContinuityDiagnostic} from './scene-continuity-protocol.js';
import { coupledBudgetVersion, reviewedCoupledBudgetDiagnostic } from './coupled-affect-protocol.js';
import { copy, fail } from './store.js';
import { hash, own, safeId } from './contract.js';
import { reviewedValidationDiagnostic } from './validation-diagnostic.js';
import { prunedCompactV2Version, reviewedPrunedV2Diagnostic } from './compact-v2-protocol.js';
const positive = n => Number.isSafeInteger(n) && n > 0;
export function validateAllowance(input) {
  const { id, mode, expiresAt, limits, pricing } = input ?? {};
  if (!safeId(id) || !['stub','live'].includes(mode) || !positive(expiresAt) || !positive(limits?.maxRuns) || !positive(limits?.maxCalls) || !positive(limits?.maxMicroCny)) fail('invalid_allowance');
  if (!['deepseek-flash','deepseek-v4-pro'].includes(pricing?.model) || !positive(pricing.contextTokenLimit) || !positive(pricing.inputMicroCnyPerMillion) || !positive(pricing.outputMicroCnyPerMillion) || typeof pricing.reference !== 'string' || !pricing.reference.startsWith('https://api-docs.deepseek.com/') || !positive(pricing.checkedAt)) fail('invalid_pricing');
  if (input.approved !== true || pricing.checkedAt > expiresAt) fail('allowance_not_approved');
  if (input.protocolVersion!==undefined&&!['deepseek-chat-json-v2-grounded-wake','compact-appraisal-quotes-v1',prunedCompactV2Version,coupledBudgetVersion,continuityBudgetVersion].includes(input.protocolVersion)) fail('invalid_allowance_protocol');
  return { id, mode, approved: true, expiresAt, limits: { maxRuns: limits.maxRuns, maxCalls: limits.maxCalls, maxMicroCny: limits.maxMicroCny }, pricing: { model: pricing.model, contextTokenLimit: pricing.contextTokenLimit, inputMicroCnyPerMillion: pricing.inputMicroCnyPerMillion, outputMicroCnyPerMillion: pricing.outputMicroCnyPerMillion, reference: pricing.reference, checkedAt: pricing.checkedAt },...(input.protocolVersion===undefined?{}:{protocolVersion:input.protocolVersion}) };
}
const ceilMillion = (tokens, rate) => (BigInt(tokens) * BigInt(rate) + 999999n) / 1000000n;
export function maximumCost(pricing, maxOutputTokens) {
  if (!positive(maxOutputTokens) || maxOutputTokens > 400 || maxOutputTokens > pricing.contextTokenLimit) fail('invalid_cost_bound');
  // Reserve the entire verified model context as input, plus the capped output.
  // This deliberately does not rely on the fake engine's token estimate.
  return ceilMillion(pricing.contextTokenLimit, pricing.inputMicroCnyPerMillion) + ceilMillion(maxOutputTokens, pricing.outputMicroCnyPerMillion);
}
export class BudgetLedger {
  constructor(store) {
    this.store = store; store.assert();
    if (!store.state.billing) { store.state.billing = { version: 1, accounts: {} }; store.save(); }
    if (store.state.billing.version !== 1) fail('invalid_billing_version');

  }
  approve(input) {
    this.store.assert(); const allowance = validateAllowance(input), fingerprint = hash(allowance);
    const old = own(this.store.state.billing.accounts, allowance.id);
    if (old) { if (old.fingerprint !== fingerprint) fail('allowance_conflict'); return this.status(allowance.id); }
    this.store.state.billing.accounts[allowance.id] = { fingerprint, allowance, attempts: {}, runIds: [] };
    this.store.save(); return this.status(allowance.id);
  }
  account(id) { this.store.assert(); return own(this.store.state.billing.accounts, id) ?? fail('unknown_allowance'); }
  status(id) {
    const a = this.account(id), attempts = Object.values(a.attempts);
    const held = attempts.reduce((sum,t) => sum + BigInt(t.chargedMicroCny), 0n);
    return { allowance: copy(a.allowance), runs: a.runIds.length, calls: attempts.length, heldOrSpentMicroCny: held.toString(), attempts: copy(attempts) };
  }
  reserve(id, { requestId, runId, fingerprint, sourceRefs, maxOutputTokens }, now = Date.now()) {
    const a = this.account(id);
    if (!safeId(requestId) || !safeId(runId) || typeof fingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(fingerprint) || !Array.isArray(sourceRefs) || !sourceRefs.length || !sourceRefs.every(s => typeof s.id === 'string' && s.id.length > 0 && s.id.length <= 200 && typeof s.version === 'string' && s.version.length > 0)) fail('invalid_reservation');
    const old = own(a.attempts, requestId);
    if (old) { if (old.fingerprint !== fingerprint || old.runId !== runId) fail('request_conflict'); return { replayed: true, attempt: copy(old) }; }
    if (!Number.isFinite(now) || now >= a.allowance.expiresAt) fail('allowance_expired');
    if (sourceRefs.some(s => this.store.withdrawn.includes(s.id))) fail('source_withdrawn');
    const cost = maximumCost(a.allowance.pricing, maxOutputTokens);
    const status = this.status(id);
    if (status.calls >= a.allowance.limits.maxCalls || (!a.runIds.includes(runId) && status.runs >= a.allowance.limits.maxRuns) || BigInt(status.heldOrSpentMicroCny) + cost > BigInt(a.allowance.limits.maxMicroCny)) fail('allowance_exhausted');
    const attempt = { requestId, runId, fingerprint, sourceRefs: sourceRefs.map(s => ({ id: s.id, version: s.version })), status: 'reserved', maxOutputTokens, reservedMicroCny: cost.toString(), chargedMicroCny: cost.toString() };
    a.attempts[requestId] = attempt; if (!a.runIds.includes(runId)) a.runIds.push(runId);
    this.store.save(); return { replayed: false, attempt: copy(attempt) };
  }
  attempt(id, requestId) { return own(this.account(id).attempts, requestId) ?? fail('unknown_attempt'); }
  dispatch(id, requestId) {
    const t = this.attempt(id, requestId); if (t.status !== 'reserved') fail('attempt_not_dispatchable');
    t.status = 'dispatched'; this.store.save();
  }
  unknown(id, requestId, diagnostic) {
    const t = this.attempt(id, requestId); if (t.status !== 'settled') {
      const binding=this.account(id).allowance.protocolVersion;
      let reviewed = reviewedValidationDiagnostic(diagnostic);
      if(binding&&reviewed?.protocolVersion!==binding)reviewed=null;
      if(!reviewed&&binding===prunedCompactV2Version)reviewed=reviewedPrunedV2Diagnostic(diagnostic);
      if(!reviewed&&binding===coupledBudgetVersion)reviewed=reviewedCoupledBudgetDiagnostic(diagnostic);
      if(!reviewed&&binding===continuityBudgetVersion)reviewed=reviewedContinuityDiagnostic(diagnostic);
      if (reviewed) t.validationDiagnostic = reviewed;
      t.status = 'unknown'; this.store.save();
    }
  }
  settle(id, requestId, receipt, publish) {
    const a = this.account(id), t = this.attempt(id, requestId), p = a.allowance.pricing, u = receipt?.usage;
    if (t.status !== 'dispatched') fail('attempt_not_settleable');
    if (receipt?.model !== p.model || !u || !Number.isSafeInteger(u.inputTokens) || u.inputTokens < 0 || u.inputTokens > p.contextTokenLimit || !Number.isSafeInteger(u.outputTokens) || u.outputTokens < 0 || u.outputTokens > t.maxOutputTokens || u.totalTokens !== u.inputTokens + u.outputTokens) fail('usage_exceeds_reviewed_bounds');
    const cost = ceilMillion(u.inputTokens,p.inputMicroCnyPerMillion) + ceilMillion(u.outputTokens,p.outputMicroCnyPerMillion);
    if (cost > BigInt(t.reservedMicroCny)) fail('cost_exceeds_reservation');
    t.status = 'settled'; t.chargedMicroCny = cost.toString(); t.usage = { inputTokens: u.inputTokens, outputTokens: u.outputTokens, totalTokens: u.totalTokens }; t.model = receipt.model;
    if (publish) {
      try { publish(copy(t)); } catch { this.store.poisoned = true; fail('publication_failed'); }
    }
    this.store.save(); return copy(t);
  }
}
