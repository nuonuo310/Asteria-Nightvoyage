import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { AppraisalRehearsal } from '../src/appraisal-rehearsal.js';
import { Nightvoyage } from '../src/engine.js';
import { readAppraisalView } from '../src/appraisal-view.js';

const probes=JSON.parse(fs.readFileSync(new URL('../fixtures/appraisal-probes.json',import.meta.url)));
const seed=JSON.parse(fs.readFileSync(new URL('../fixtures/quality/sparse-context.json',import.meta.url)));
async function setup(t,indices=[0,1]) {
  const d=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-appraisal-view-'));let calls=0;
  const simulator=async request=>{
    calls++;const m=JSON.parse(request.body.messages[1].content),data=m.stage==='wake'?{fragment:m.previousScenes.at(-1).event,residue:0.1,associations:[]}:probes.scenes[indices[m.sceneIndex]];
    return {status:200,body:{model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(data)}}],usage:{prompt_tokens:100,completion_tokens:80,total_tokens:180}}};
  };
  const e=new AppraisalRehearsal(d,{model:'deepseek-flash',simulator});t.after(()=>{e.close();fs.rmSync(d,{recursive:true,force:true});});
  const id=e.start('view','view',seed);assert.equal((await e.execute(id)).status,'completed');
  return {d,e,id,simulator,calls:()=>calls,entryId:e.result(id).dream.id};
}
test('read view presents missing appraisal as null rather than numeric placeholders',async t=>{
  const {e,entryId}=await setup(t);const original=e.read(entryId),view=readAppraisalView(e.store,entryId);
  assert.equal(view.scenes[0].control.status,'not_stated');assert.equal(view.scenes[0].control.value,null);assert.equal(view.scenes[0].uncertainty.value,null);assert.equal(view.scenes[0].goalEffect.value,null);assert.equal(view.scenes[0].affectChange.value,null);
  assert.equal(original.scenes[0].appraisal.control,0.5);assert.equal(original.scenes[0].appraisal.goalEffect,0);assert.deepEqual(e.read(entryId),original);
  assert.equal(view.scenes[0].appliedAffect.origin,'simulated_affect');assert.equal(view.scenes[0].appliedAffect.delta.valence,0);
});
test('quoted estimates remain model claims, including an explicitly quoted midpoint',async t=>{
  const {e,entryId}=await setup(t);const entry=e.store.state.entries[entryId],run=e.store.state.runs[entry.runId];
  // Rebuild both managed copies using the candidate's normalizer for this synthetic variant.
  const {normalizeAppraisalScene}=await import('../src/appraisal-rehearsal.js');const raw=structuredClone(probes.scenes[1]);raw.appraisal.control=0.5;
  entry.scenes[1]=normalizeAppraisalScene(raw,entry.scenes[0].after);run.scenes[1]=structuredClone(entry.scenes[1]);
  const view=readAppraisalView(e.store,entryId);assert.equal(view.scenes[1].control.status,'model_estimate');assert.equal(view.scenes[1].control.value,0.5);assert.ok(view.scenes[1].control.evidence);
  assert.equal(view.semanticSupport,'not_assessed');assert.equal(view.origin,'dream_appraisal_view');assert.equal(view.materialKind,'fictional');assert.equal(view.isRealityFact,false);assert.deepEqual(view.sourceRefs,[{id:'q-sparse-memory',version:'1'}]);assert.deepEqual(view.derivedFrom,[entryId]);
});
test('view is recomputed without persistence or calls; returned mutation cannot alter provenance',async t=>{
  const {d,e,entryId,calls}=await setup(t);const before=fs.readFileSync(path.join(d,'state.json'),'utf8');const view=readAppraisalView(e.store,entryId);view.sourceRefs.length=0;view.scenes[1].control.evidence='forged';
  assert.equal(calls(),3);assert.equal(fs.readFileSync(path.join(d,'state.json'),'utf8'),before);const again=readAppraisalView(e.store,entryId);assert.equal(again.sourceRefs.length,1);assert.notEqual(again.scenes[1].control.evidence,'forged');
});
test('withdrawal blocks new views after restart and introduces no body cache',async t=>{
  const {d,e,entryId,simulator}=await setup(t);assert.ok(readAppraisalView(e.store,entryId));e.withdraw('q-sparse-memory');assert.equal(readAppraisalView(e.store,entryId),null);e.close();
  const next=new AppraisalRehearsal(d,{model:'deepseek-flash',simulator});assert.equal(readAppraisalView(next.store,entryId),null);assert.ok(!fs.readFileSync(path.join(d,'state.json'),'utf8').includes('小船'));next.close();
});
test('deletion removes view source; later recollections and legacy runs cannot masquerade as evidence',async t=>{
  const {e,entryId}=await setup(t);const child=e.append(entryId,'recollection','虚构的后来回想。');assert.throws(()=>readAppraisalView(e.store,child),/requires_dream/);e.deleteEntry(entryId);assert.equal(readAppraisalView(e.store,entryId),null);
  const d=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-view-legacy-'));t.after(()=>fs.rmSync(d,{recursive:true,force:true}));const old=new Nightvoyage(d);t.after(()=>old.close());const id=old.start('legacy','legacy',seed);await old.execute(id);const legacy=readAppraisalView(old.store,old.result(id).dream.id);assert.equal(legacy.status,'unsupported_protocol');assert.deepEqual(legacy.scenes,[]);
});
test('closed, forged and tampered records cannot produce an available view',async t=>{
  const {e,entryId}=await setup(t);assert.throws(()=>readAppraisalView({},entryId),/managed_store/);assert.throws(()=>readAppraisalView(e.store,'__proto__'),/invalid_entry_id/);
  const entry=e.store.state.entries[entryId];entry.scenes[1].appraisalBasis.semanticSupport='verified';assert.throws(()=>readAppraisalView(e.store,entryId),/invalid_appraisal_view_record/);
  e.close();assert.throws(()=>readAppraisalView(e.store,entryId),/store_unavailable/);
});
test('byte audit admits short probes and exact boundary, rejects composite oversize without token estimates',()=>{
  const r=spawnSync(process.execPath,['scripts/audit-appraisal-output.mjs'],{cwd:new URL('..',import.meta.url),encoding:'utf8'});assert.equal(r.status,0,r.stderr);const report=JSON.parse(r.stdout);
  assert.equal(report.realModelRequests,0);assert.equal(report.actualModelTokenCount,null);assert.equal(report.providerOutputTokenCap,400);assert.equal(report.responseByteSafetyCeiling,1200);assert.ok(report.results.every(p=>p.byteAdmission==='accepted'&&p.addedEvidenceBytes>0));assert.equal(report.oversizedProbe.byteAdmission,'rejected_oversized');assert.equal(report.oversizedProbe.structureAccepted,true);assert.deepEqual(report.boundaries.map(p=>p.byteAdmission),['accepted','accepted','rejected_oversized']);
});
