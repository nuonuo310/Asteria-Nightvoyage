import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {normalizeInlineFixture,compareInlineFixture,fictionalInlineContext,sharedQuotationBoundary,inlineReviewVersion} from '../test-support/inline-evidence-review.js';
import {neutral,hash} from '../src/contract.js';
import {normalizeBudgetCoupledScene,coupledBudgetVersion} from '../src/coupled-affect-protocol.js';
import {GatedDeepSeekClient} from '../src/gated-deepseek-client.js';
import {validateAllowance} from '../src/budget-ledger.js';
const inline=()=>({event:'梦里的人看见门开了，松了一口气。',appraisal:{goalEffect:0,control:.5,uncertainty:.5},basis:{goal:null,control:null,uncertainty:null},affect:{kind:'estimated',delta:{valence:.1,arousal:-.1},excerpt:'松了一口气'}});
const normalize=raw=>normalizeInlineFixture(fictionalInlineContext(raw),neutral());
const contrasts=JSON.parse(fs.readFileSync(new URL('../fixtures/affect-support-contrasts.json',import.meta.url),'utf8'));
for(const c of contrasts.scenes)test(`independent fictional encoding comparison: ${c.id}`,()=>{
  const f=fictionalInlineContext(c.raw),before=hash(f);
  if(!c.expectedGate.accepted)assert.throws(()=>compareInlineFixture(f,contrasts.before));
  else {const r=compareInlineFixture(f,contrasts.before);assert.equal(r.contentPreserved,true);assert.equal(r.candidateBoundedResult,'accepted');assert.equal(r.modelNumericReferencesRequired,0);assert.equal(r.semanticSupport,'not_assessed');assert.equal(r.qualityAssessed,false);}
  assert.equal(hash(f),before);
});
test('inline estimates preserve event, exact quote, both numbers and explicit estimated-zero branch',()=>{
  const raw=inline(),value=normalize(raw);assert.equal(value.event,raw.event);assert.deepEqual(value.delta,raw.affect.delta);assert.equal(value.appraisalBasis.evidence.affectExcerpt,raw.affect.excerpt);assert.equal(value.appraisalBasis.protocolVersion,inlineReviewVersion);
  raw.affect.delta={valence:0,arousal:0};assert.equal(normalize(raw).affectDeclaration.kind,'estimated');assert.deepEqual(normalize(raw).delta,{valence:0,arousal:0});
});
test('unchanged is explicit and cannot carry hidden deltas or quotations',()=>{
  const raw=inline();raw.affect={kind:'unchanged'};const v=normalize(raw);assert.deepEqual(v.delta,{valence:0,arousal:0});assert.equal(v.appraisalBasis.evidence.affectExcerpt,null);
  for(const extra of [{delta:{valence:.1,arousal:0}},{excerpt:'松了一口气'}])assert.throws(()=>normalize({...raw,affect:{...raw.affect,...extra}}),/invalid_inline_affect/);
});
for(const [id,mutate,code] of [
  ['missing-affect-excerpt',x=>delete x.affect.excerpt,'invalid_inline_affect'],
  ['null-affect-excerpt',x=>x.affect.excerpt=null,'invalid_inline_excerpt'],
  ['numeric-affect-reference',x=>x.affect.excerpt=0,'invalid_inline_excerpt'],
  ['ungrounded-affect',x=>x.affect.excerpt='从未出现在本幕','invalid_compact_evidence'],
  ['out-of-range-delta',x=>x.affect.delta.valence=.6,'invalid_affect'],
  ['unknown-not-midpoint',x=>x.appraisal.control=.9,'unbased_appraisal_requires_placeholder'],
  ['neutral-goal-evidence',x=>x.basis.goal=['门开了','门开了'],'neutral_goal_evidence_must_be_null'],
  ['nonzero-goal-without-evidence',x=>x.appraisal.goalEffect=1,'nonzero_goal_requires_evidence'],
  ['old-index-table-not-accepted',x=>x.evidence=['门开了'],'invalid_inline_shape'],
  ['goal-must-have-two-texts',x=>x.basis.goal=['门开了'],'invalid_inline_goal'],
  ['numeric-goal-is-not-repaired',x=>x.basis.goal=[0,1],'invalid_inline_excerpt'],
  ['extra-numeric-field',x=>x.appraisal.extra=1,'invalid_inline_shape']
])test(`inline guard: ${id}`,()=>{const raw=inline();mutate(raw);assert.throws(()=>normalize(raw),new RegExp(code));});
test('short shared quotation is deduplicated by program without changing evidence or inferred meaning',()=>{
  const raw=inline();raw.basis.control='松了一口气';raw.basis.uncertainty='松了一口气';const v=normalize(raw);assert.equal(v.normalizationAudit.keptQuoteCount,1);assert.equal(v.appraisalBasis.evidence.controlExcerpt,raw.basis.control);assert.equal(v.appraisalBasis.evidence.uncertaintyExcerpt,raw.basis.uncertainty);assert.equal(v.appraisalBasis.semanticSupport,'not_assessed');
});
test('shared long quotation remains valid in compact form but inline repetition exceeds the SAME byte ceiling',()=>{
  const raw=sharedQuotationBoundary();assert.ok(normalizeBudgetCoupledScene(raw,neutral()));const r=compareInlineFixture(fictionalInlineContext(raw),neutral());assert.equal(r.sizes.canonicalCompactJsonBytes,603);assert.equal(r.sizes.inlineJsonBytes,1359);assert.equal(r.candidateBoundedResult,'inline_output_too_large');assert.equal(r.contentPreserved,true);
});
test('the independent inline decoder enforces exactly 1200 serialized bytes and never clips output',()=>{
  const raw=inline();raw.affect={kind:'unchanged'};raw.event='x';const fixed=Buffer.byteLength(JSON.stringify({...raw,event:''}));raw.event='x'.repeat(1200-fixed);assert.equal(Buffer.byteLength(JSON.stringify(raw)),1200);assert.equal(normalize(raw).event,raw.event);raw.event+='x';assert.throws(()=>normalize(raw),/inline_output_too_large/);
});
test('64 Unicode codepoint quotation ceiling and JSON escaping remain bounded, never token estimates',()=>{
  const raw=inline();raw.event='😀'.repeat(64);raw.affect.excerpt=raw.event;assert.equal(normalize(raw).appraisalBasis.evidence.affectExcerpt,raw.event);raw.event+='😀';raw.affect.excerpt=raw.event;assert.throws(()=>normalize(raw),/invalid_compact_evidence/);
  const escaped=inline();escaped.event='"\\'.repeat(350);escaped.affect={kind:'unchanged'};assert.throws(()=>normalize(escaped),/inline_output_too_large/);
});
test('fictional/no-egress markers and initial affect are mandatory',()=>{
  const f=fictionalInlineContext(inline());for(const change of [{materialKind:'real'},{modelEgress:true},{kind:'provider_response'}])assert.throws(()=>normalizeInlineFixture({...f,...change},neutral()),/fictional_no_egress_fixture_required/);
  for(const before of [undefined,{valence:0,arousal:-1},{valence:NaN,arousal:0},{valence:0,arousal:0,extra:0}])assert.throws(()=>normalizeInlineFixture(f,before),/invalid_inline_before/);
});
test('unsafe objects cannot invoke getters; returned mutation cannot alter future normalized evidence',()=>{
  const f=fictionalInlineContext(inline());let invoked=0;Object.defineProperty(f.scene,'event',{get(){invoked++;return 'data';},enumerable:true});assert.throws(()=>normalizeInlineFixture(f,neutral()),/invalid_inline_fixture/);assert.equal(invoked,0);
  const raw=inline(),before=hash(raw),v=normalize(raw);v.delta.valence=.5;v.appraisalBasis.evidence.affectExcerpt='changed';assert.equal(hash(raw),before);assert.equal(normalize(raw).delta.valence,.1);
});
test('new offline format cannot enter transport or an allowance, and does not disguise itself as old checkpoints',()=>{
  assert.throws(()=>new GatedDeepSeekClient(null,{protocol:inlineReviewVersion}),/unreviewed_transport_protocol/);
  assert.notEqual(normalize(inline()).appraisalBasis.protocolVersion,coupledBudgetVersion);
  assert.throws(()=>validateAllowance({id:'offline-no-fee',mode:'stub',approved:true,expiresAt:Date.now()+60000,protocolVersion:inlineReviewVersion,limits:{maxRuns:1,maxCalls:3,maxMicroCny:3000000},pricing:{model:'deepseek-flash',contextTokenLimit:1000,inputMicroCnyPerMillion:1,outputMicroCnyPerMillion:1,reference:'https://api-docs.deepseek.com/TEST-ONLY',checkedAt:1}}),/invalid_allowance_protocol/);
});
test('fixed comparison script prints aggregates, no scene, key, real call, Store or quality guarantee',()=>{
  const r=spawnSync(process.execPath,['scripts/check-inline-evidence-review.mjs'],{cwd:new URL('..',import.meta.url),encoding:'utf8'});assert.equal(r.status,0,r.stderr);const v=JSON.parse(r.stdout);assert.equal(v.scriptedComparisons,9);assert.equal(v.realModelRequests,0);assert.equal(v.credentialReads,0);assert.equal(v.storeOpened,false);assert.equal(v.existingPaidPinsMatch,true);assert.equal(v.actualModelTokenCount,null);assert.equal(v.modelComplianceImproved,'not_assessed');assert.equal(v.liveSelectorAvailable,false);assert.equal(v.oldRejectedResponseAvailable,false);assert.ok(!r.stdout.includes('梦里的人'));
});
