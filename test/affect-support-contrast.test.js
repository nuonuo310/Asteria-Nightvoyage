import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { auditAffectSupportContrasts, affectSupportContrastVersion } from '../src/affect-support-contrast.js';
import { GatedDeepSeekClient } from '../src/gated-deepseek-client.js';
import { coupledTrialPinsMatch } from '../src/coupled-trial-config.js';
const fixture=JSON.parse(fs.readFileSync(new URL('../fixtures/affect-support-contrasts.json',import.meta.url),'utf8'));
for(const scene of fixture.scenes)test(`support contrast literal contract: ${scene.id}`,()=>{
  const input=structuredClone(fixture),before=structuredClone(input),result=auditAffectSupportContrasts(input),row=result.results.find(s=>s.caseId===scene.id);
  assert.deepEqual(input,before);assert.deepEqual(row.literalContract,scene.expectedGate);assert.equal(row.matchesAuthoredGateExpectation,true);assert.equal(row.authoredReview.isAutomaticJudgment,false);assert.equal(result.annotationsVerifiedSemantically,false);
});
test('same event and quote can pass with opposite valence estimates without a semantic verdict',()=>{
  const [positive,negative]=auditAffectSupportContrasts(fixture).results;assert.equal(positive.literalContract.accepted,true);assert.equal(negative.literalContract.accepted,true);assert.equal(positive.authoredReview.directionSupport,'not_determined');assert.equal(negative.authoredReview.directionSupport,'not_determined');
  assert.equal(fixture.scenes[0].raw.event,fixture.scenes[1].raw.event);assert.deepEqual(fixture.scenes[0].raw.evidence,fixture.scenes[1].raw.evidence);assert.equal(fixture.scenes[0].raw.affect.delta.valence,-fixture.scenes[1].raw.affect.delta.valence);
});
test('literal acceptance includes author-flagged unrelated and conflicting examples, not semantic approval',()=>{
  const r=auditAffectSupportContrasts(fixture);for(const id of ['bowl-unrelated-quote','direction-conflict']){const row=r.results.find(s=>s.caseId===id);assert.equal(row.literalContract.accepted,true);assert.equal(row.authoredReview.isAutomaticJudgment,false);}assert.equal(r.qualityAccepted,false);assert.equal(r.semanticClassifier,false);
});
test('annotation change cannot change validation; authored semantic labels are not treated as verified truth',()=>{
  const changed=structuredClone(fixture);changed.scenes[4].authoredReview.evidenceRelation='directly_stated';changed.scenes[4].authoredReview.directionSupport='compatible_not_unique';const a=auditAffectSupportContrasts(fixture),b=auditAffectSupportContrasts(changed);
  assert.deepEqual(a.results.map(s=>s.literalContract),b.results.map(s=>s.literalContract));assert.equal(b.annotationsVerifiedSemantically,false);assert.notDeepEqual(a.results[4].authoredReview,b.results[4].authoredReview);
});
test('ordinary and transformed transitions remain author observations with no automatic ranking',()=>{
  const r=auditAffectSupportContrasts(fixture);assert.deepEqual(r.transitionObservations.map(t=>t.observation),['limited_confirmation','ordinary_subtle_progress','transformed_with_link']);assert.ok(r.transitionObservations.every(t=>t.qualityRank===null&&t.isAutomaticJudgment===false));
});
test('only explicitly fictional, no-egress, bounded scripted contrast fixtures enter the helper',()=>{
  for(const change of [x=>x.materialKind='real',x=>x.modelEgress=true,x=>x.scriptedOnly=false,x=>x.kind='user_dream',x=>x.before.arousal=NaN,x=>x.sources=['private'],x=>x.scenes=Array(31).fill(x.scenes[0])]){const f=structuredClone(fixture);change(f);assert.throws(()=>auditAffectSupportContrasts(f),/fictional_contrast_fixture_required/);}
});
test('unknown annotation text, duplicate IDs and narrative extras cannot enter summary metadata',()=>{
  for(const change of [x=>x.scenes[0].authoredReview.evidenceRelation='DUMMY-FREE-TEXT',x=>x.scenes[1].id=x.scenes[0].id,x=>x.scenes[0].authoredReview.extra='body',x=>x.transitions[0].authoredObservation='DUMMY-FREE-TEXT']){const f=structuredClone(fixture);change(f);assert.throws(()=>auditAffectSupportContrasts(f),/invalid_contrast_annotation/);}
});
test('summary returns neither raw scene/quote/note bodies nor a paid selector and leaves live pins intact',()=>{
  const r=auditAffectSupportContrasts(fixture),body=JSON.stringify(r);for(const c of fixture.scenes){assert.ok(!body.includes(c.raw.event));assert.ok(!body.includes(c.authoredReview.note));for(const q of c.raw.evidence)assert.ok(!body.includes(q));}for(const c of fixture.transitions)for(const e of c.events)assert.ok(!body.includes(e));
  assert.throws(()=>new GatedDeepSeekClient(null,{protocol:affectSupportContrastVersion}),/unreviewed_transport_protocol/);assert.equal(coupledTrialPinsMatch(),false);
});
test('fixed offline command uses no credential or transport and reports expectations rather than semantic success',()=>{
  const r=spawnSync(process.execPath,['scripts/check-affect-support-contrasts.mjs'],{cwd:new URL('..',import.meta.url),encoding:'utf8'});assert.equal(r.status,0,r.stderr);const p=JSON.parse(r.stdout);assert.equal(p.results.length,10);assert.equal(p.realModelRequests,0);assert.equal(p.credentialReads,0);assert.equal(p.persistentRuntimeWrites,0);assert.equal(p.liveSourcePinsUnchanged,false);assert.equal(p.semanticClassifier,false);assert.equal(p.annotationsVerifiedSemantically,false);
});
