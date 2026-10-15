import { randomUUID } from 'node:crypto';
import { Store, copy, fail } from './store.js';
import { snapshot, config, hash, neutral, scene, wake, own, safeId } from './contract.js';
import { FakeProvider } from './fake-provider.js';
export class Nightvoyage {
  constructor(directory, { provider = new FakeProvider(), fault = () => {} } = {}) {
    if (!(provider instanceof FakeProvider)) fail('real_provider_not_authorized');
    this.store = new Store(directory); this.provider = provider; this.fault = fault; this.active = new Map();
  }
  run(id) { this.store.assert(); return own(this.store.state.runs, id) ?? fail('unknown_run'); }
  start(requestId, sessionId, input, settings) {
    this.store.assert();
    if (![requestId,sessionId].every(safeId)) fail('invalid_request_id');
    const snap = snapshot(input), cfg = config(settings);
    if (snap.sources.some(s => this.store.withdrawn.includes(s.id))) fail('source_withdrawn');
    const fingerprint = hash({ sessionId, snap, cfg, provider: this.provider.identity });
    const previous = own(this.store.state.requests, requestId);
    if (previous) { if (previous.fingerprint !== fingerprint) fail('request_conflict'); return previous.runId; }
    const existing = own(this.store.state.sessions, fingerprint);
    const id = existing ?? randomUUID();
    this.store.state.requests[requestId] = { fingerprint, runId: id };
    this.store.state.sessions[fingerprint] = id;
    if (!existing) this.store.state.runs[id] = { id, status: snap.channels.memory.availability === 'present' ? 'queued' : 'skipped', snapshot: snap, config: cfg, sourceIds: snap.sources.map(s => s.id), scenes: [], attempts: [], budget: { calls: 0, input: 0, output: 0 } };
    this.store.save(); return id;
  }
  status(id) {
    const r = this.run(id);
    return copy({ id, status: r.status, stagesSaved: r.scenes?.length ?? 0, budget: r.budget, error: r.error, attempts: r.attempts });
  }
  cancel(id) {
    const r = this.run(id);
    if (!['queued','running','failed','uncertain'].includes(r.status)) return this.status(id);
    r.status = 'cancelled'; this.store.save(); this.active.get(id)?.abort(); return this.status(id);
  }
  async resume(id, { retryUnknown = false } = {}) {
    const r = this.run(id);
    if (!['failed','uncertain'].includes(r.status)) fail('not_resumable');
    if (r.status === 'uncertain' && !retryUnknown) fail('ambiguous_attempt');
    if (this.active.has(id)) fail('run_busy');
    r.status = 'queued'; delete r.error; this.store.save(); return this.execute(id);
  }
  async execute(id) {
    const r = this.run(id);
    if (this.active.has(id)) fail('run_busy');
    if (r.status !== 'queued') return this.status(id);
    const controller = new AbortController(); this.active.set(id, controller);
    r.status = 'running';
    try {
      this.store.save();
      while (r.scenes.length < r.config.scenes) {
        const raw = await this.call(r, 'scene', controller.signal);
        if (r.status !== 'running') return this.status(id);
        const before = r.scenes.at(-1)?.after ?? r.snapshot.channels.affect.value ?? neutral();
        r.scenes.push(scene(raw, before)); this.store.save(); this.fault('scene_saved');
      }
      const raw = await this.call(r, 'wake', controller.signal);
      if (r.status !== 'running') return this.status(id);
      r.wake = wake(raw);
      const entryId = `dream-${id}`;
      this.store.state.entries[entryId] = { ...this.envelope(r, entryId, 'dream'), scenes: copy(r.scenes), wake: { ...this.envelope(r, `wake-${id}`, 'wake_note'), ...r.wake }, residue: { ...this.envelope(r, `residue-${id}`, 'simulated_affect'), strength: r.wake.residue, startedAt: Date.now(), durationMs: 3600000 }, cherished: false, recallAccess: 'cue' };
      r.entryId = entryId; r.status = 'completed'; this.store.save();
    } catch (error) {
      if (this.store.poisoned) throw error;
      if (r.status === 'running') { r.status = error.message === 'simulated_crash' ? 'uncertain' : 'failed'; r.error = ['budget_exhausted','timeout','invalid_scene','invalid_affect','invalid_appraisal','invalid_wake','simulated_crash'].includes(error.message) ? error.message : 'provider_or_validation_failure'; this.store.save(); }
    } finally { this.active.delete(id); }
    return this.status(id);
  }
  async call(r, stage, signal) {
    if (r.status !== 'running' || signal.aborted) fail('cancelled');
    const callController = new AbortController();
    const payload = { stage, index: r.scenes.length, snapshot: copy(r.snapshot), scenes: copy(r.scenes), signal: callController.signal };
    const input = Math.ceil(Buffer.byteLength(JSON.stringify({ ...payload, signal: undefined })) / 3);
    const b = r.budget, c = r.config;
    if (b.calls + 1 > c.maxCalls || b.input + input > c.inputTokens || b.output + c.perCallOutput > c.outputTokens) fail('budget_exhausted');
    b.calls++; b.input += input; b.output += c.perCallOutput;
    const attempt = { stage, index: r.scenes.length, state: 'dispatched', inputReserved: input, outputReserved: c.perCallOutput };
    r.attempts.push(attempt); this.store.save(); this.fault('dispatched');
    let timer, onAbort;
    const abort = new Promise((_, reject) => {
      onAbort = () => { callController.abort(); reject(new Error('cancelled')); };
      signal.addEventListener('abort', onAbort, { once: true });
      timer = setTimeout(() => { callController.abort(); reject(new Error('timeout')); }, c.timeoutMs);
    });
    try {
      const result = await Promise.race([Promise.resolve().then(() => this.provider.generate(payload)), abort]);
      if (r.status !== 'running' || signal.aborted) fail('cancelled');
      if (Buffer.byteLength(JSON.stringify(result)) > c.perCallOutput * 3) fail('output_limit');
      attempt.state = 'received'; return result;
    } finally { clearTimeout(timer); signal.removeEventListener('abort', onAbort); }
  }
  envelope(r, id, origin) { return { schemaVersion: 1, id, runId: r.id, materialKind: r.snapshot.materialKind, origin, isRealityFact: false, sourceRefs: r.snapshot.sources.map(s => ({ id: s.id, version: s.version })), derivedFrom: [r.snapshot.id] }; }
  read(id) { this.store.assert(); const e = own(this.store.state.entries, id); return e ? copy(e) : null; }
  list() { this.store.assert(); return Object.values(this.store.state.entries).map(e => ({ schemaVersion: e.schemaVersion, id: e.id, origin: e.origin, materialKind: e.materialKind, isRealityFact: false, sourceRefs: copy(e.sourceRefs), derivedFrom: copy(e.derivedFrom) })); }
  append(id, kind, text) {
    const e = this.read(id); if (!e || e.origin !== 'dream' || !['recollection','imagined_continuation'].includes(kind) || typeof text !== 'string' || !text || text.length > 20000) fail('invalid_append');
    const childId = randomUUID();
    this.store.state.entries[childId] = { schemaVersion: 1, id: childId, runId: e.runId, materialKind: e.materialKind, origin: kind, isRealityFact: false, sourceRefs: e.sourceRefs, derivedFrom: [id], text };
    this.store.save(); return childId;
  }
  setPolicy(id, patch) {
    const e = this.read(id); if (!e || e.origin !== 'dream' || Object.keys(patch).some(k => !['cherished','recallAccess'].includes(k)) || ('cherished' in patch && typeof patch.cherished !== 'boolean') || ('recallAccess' in patch && !['manual','cue'].includes(patch.recallAccess))) fail('invalid_policy');
    Object.assign(this.store.state.entries[id], patch); this.store.save();
  }
  recall(cue, requestId, now = Date.now()) {
    this.store.assert();
    if (typeof cue !== 'string' || !cue.trim() || cue.length > 200 || !safeId(requestId) || !Number.isFinite(now)) fail('invalid_cue');
    const fingerprint = hash(cue.toLowerCase());
    const previous = own(this.store.state.recalls, requestId);
    if (previous && previous.fingerprint !== fingerprint) fail('recall_conflict');
    let e;
    if (previous) e = this.read(previous.entryId);
    else e = Object.values(this.store.state.entries).find(v => v.origin === 'dream' && v.recallAccess === 'cue' && v.scenes.some(s => s.event.toLowerCase().includes(cue.toLowerCase())));
    if (!previous) { this.store.state.recalls[requestId] = { fingerprint, entryId: e?.id ?? null, expiresAt: now + 60000 }; this.store.save(); }
    const receipt = own(this.store.state.recalls, requestId);
    if (!e || e.recallAccess !== 'cue' || now >= receipt.expiresAt) return [];
    return [{ schemaVersion: 1, id: requestId, origin: 'dream', materialKind: e.materialKind, isRealityFact: false, sourceRefs: copy(e.sourceRefs), derivedFrom: [e.id], fragment: e.wake.fragment, reason: 'literal_scene_match', expiresAt: receipt.expiresAt }];
  }
  residue(id, now = Date.now()) {
    if (!Number.isFinite(now)) fail('invalid_clock');
    const e = this.read(id); if (!e?.residue) return null;
    return { schemaVersion: 1, origin: 'simulated_affect', materialKind: e.materialKind, isRealityFact: false, sourceRefs: e.sourceRefs, derivedFrom: [id], strength: e.residue.strength * Math.max(0, 1 - Math.max(0, now - e.residue.startedAt) / e.residue.durationMs) };
  }
  withdraw(sourceId) { this.store.withdraw(sourceId); for (const [id, c] of this.active) if (this.run(id).status === 'revoked') c.abort(); }
  deleteEntry(id) {
    const e = this.read(id); if (!e) return;
    this.store.deleteEntry(e);
  }
  result(id) {
    const r = this.run(id), e = this.read(r.entryId);
    return { dream: e ? { ...e, wake: undefined, residue: undefined } : null, wake: e?.wake ?? null, residue: e ? this.residue(e.id) : null, associations: e ? e.wake.associations.map(text => ({ origin: 'dream_association', isRealityFact: false, materialKind: e.materialKind, sourceRefs: e.sourceRefs, derivedFrom: [e.id], text })) : [], receipt: this.status(id) };
  }
  close() { if (this.active.size) fail('active_runs'); this.store.close(); }
}
