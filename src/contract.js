import { createHash } from 'node:crypto';
import { fail, copy } from './store.js';
export const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const own = (obj, key) => Object.hasOwn(obj, key) ? obj[key] : undefined;
export const safeId = value => typeof value === 'string' && /^[\w-]{1,100}$/.test(value) && !['__proto__','constructor','prototype'].includes(value);
export const channels = ['memory', 'background', 'affect', 'mind', 'intents'];
const text = value => typeof value === 'string' && value.length > 0 && value.length <= 20000;
export function snapshot(input) {
  if (!input || !text(input.id) || !text(input.version) || input.materialKind !== 'fictional' || !Array.isArray(input.sources)) fail('invalid_snapshot');
  const seen = new Set();
  for (const s of input.sources) {
    if (!s || !text(s.id) || seen.has(s.id) || !text(s.version) || !text(s.text) || s.grant?.dream !== true || s.grant?.modelEgress !== false) fail('invalid_source');
    seen.add(s.id);
  }
  const used = new Set();
  const out = { id: input.id, version: input.version, materialKind: 'fictional', channels: {} };
  for (const key of channels) {
    const c = input.channels?.[key];
    if (!c || !['present','absent','denied','stale','unavailable'].includes(c.availability) || !Array.isArray(c.sourceIds)) fail('invalid_channel');
    if (c.availability !== 'present' && c.sourceIds.length) fail('unavailable_channel_content');
    for (const id of c.sourceIds) { if (!seen.has(id)) fail('unknown_source'); used.add(id); }
    if (c.availability === 'present' && !c.sourceIds.length) fail('empty_present_channel');
    out.channels[key] = { availability: c.availability, sourceIds: [...c.sourceIds] };
    if (key === 'affect' && c.availability === 'present') {
      if (!c.value || !Number.isFinite(c.value.valence) || c.value.valence < -1 || c.value.valence > 1 || !Number.isFinite(c.value.arousal) || c.value.arousal < 0 || c.value.arousal > 1) fail('invalid_initial_affect');
      out.channels[key].value = { valence: c.value.valence, arousal: c.value.arousal };
    }
  }
  out.sources = input.sources.filter(s => used.has(s.id)).map(s => ({ id: s.id, version: s.version, text: s.text, grant: copy(s.grant) }));
  return out;
}
export function config(input = {}) {
  const out = { scenes: 2, maxCalls: 3, inputTokens: 6000, outputTokens: 1200, perCallOutput: 400, timeoutMs: 10000, ...input };
  if (Object.keys(input).some(k => !Object.hasOwn({ scenes:1,maxCalls:1,inputTokens:1,outputTokens:1,perCallOutput:1,timeoutMs:1 }, k))) fail('invalid_config');
  for (const v of Object.values(out)) if (!Number.isSafeInteger(v) || v <= 0) fail('invalid_config');
  if (out.scenes > 2 || out.maxCalls > 3 || out.perCallOutput > out.outputTokens || out.timeoutMs > 60000) fail('invalid_config');
  return out;
}
export const neutral = () => ({ valence: 0, arousal: 0.2 });
export function scene(raw, before) {
  if (!raw || !text(raw.event) || ![-1,0,1].includes(raw.appraisal?.goalEffect)) fail('invalid_scene');
  for (const key of ['control','uncertainty']) if (!Number.isFinite(raw.appraisal[key]) || raw.appraisal[key] < 0 || raw.appraisal[key] > 1) fail('invalid_appraisal');
  const delta = {}, after = {};
  for (const key of ['valence','arousal']) {
    const d = raw.delta?.[key];
    if (!Number.isFinite(d) || Math.abs(d) > 0.5) fail('invalid_affect');
    delta[key] = d; after[key] = Math.max(key === 'valence' ? -1 : 0, Math.min(1, before[key] + d));
  }
  return { event: raw.event, appraisal: { goalEffect: raw.appraisal.goalEffect, control: raw.appraisal.control, uncertainty: raw.appraisal.uncertainty }, before: copy(before), delta, after };
}
export function wake(raw) {
  if (!raw || !text(raw.fragment) || !Array.isArray(raw.associations) || raw.associations.length > 1 || raw.associations.some(a => !text(a)) || !Number.isFinite(raw.residue) || raw.residue < 0 || raw.residue > 0.3) fail('invalid_wake');
  return { fragment: raw.fragment, associations: [...raw.associations], residue: raw.residue };
}
