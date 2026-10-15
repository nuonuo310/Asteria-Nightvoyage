import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { reviewCoupledAffect } from '../src/coupled-affect-review.js';
import { GatedDeepSeekClient } from '../src/gated-deepseek-client.js';
import { validateAllowance } from '../src/budget-ledger.js';
import { prunedV2TrialProposal } from '../src/pruned-v2-trial-config.js';
const cases=JSON.parse(fs.readFileSync(new URL('../fixtures/coupled-affect-review.json',import.meta.url))).cases;
const context=c=>({materialKind:'fictional',origin:'dream',isRealityFact:false,before:{valence:0,arousal:0.2},flat:c.flat,coupled:c.coupled});
for(const c of cases)test(`coupled review: ${c.id}`,()=>{
  const input=context(c),saved=structuredClone(input),r=reviewCoupledAffect(input);
  assert.deepEqual(input,saved);assert.equal(r.flat.accepted,c.expected.flatAccepted);assert.equal(r.coupled.accepted,c.expected.coupledAccepted);
  assert.equal(r.flat.check,c.expected.flatCheck);assert.equal(r.coupled.check,c.expected.coupledCheck);
  assert.equal(r.normalizedEquivalent,r.flat.accepted&&r.coupled.accepted?true:null);
  assert.equal(r.semanticSupport,'not_assessed');assert.equal(r.modelComplianceImproved,'not_assessed');assert.equal(r.qualityAssessed,false);assert.equal(r.isRealityFact,false);
  assert.ok(!JSON.stringify(r).includes(c.flat.event));assert.equal(r.generatedBodyReturned,false);
});
test('coupled review rejects real or missing identity and invalid before values',()=>{
  for(const change of [{materialKind:'real'},{materialKind:undefined},{origin:'memory'},{isRealityFact:true},{before:{valence:NaN,arousal:0.2}},{before:{valence:0,arousal:2}}])assert.throws(()=>reviewCoupledAffect({...context(cases[0]),...change}),/fictional_review_context_required/);
});
test('coupled branch selection never infers a delta or reference, permits extras or echoes arbitrary data',()=>{
  for(const affect of [null,{kind:'estimated',delta:{valence:0,arousal:0}},{kind:'estimated',delta:{valence:0,arousal:0},evidence:'0'},{kind:'estimated',delta:{valence:0,arousal:0},evidence:0.5},{kind:'unchanged',evidence:0},{kind:'unchanged',delta:{valence:-0.1,arousal:0}},{kind:'DUMMY-FREE-TEXT'}]){
    const i=context(structuredClone(cases[0]));i.coupled.affect=affect;const r=reviewCoupledAffect(i);assert.equal(r.coupled.check,'coupled_affect_shape_invalid');assert.ok(!JSON.stringify(r).includes('DUMMY-FREE-TEXT'));
  }
  const missing=context(structuredClone(cases[0]));delete missing.coupled.affect;assert.equal(reviewCoupledAffect(missing).coupled.check,'invalid_coupled_scene_shape');
  for(const field of ['delta','normalizationAudit','secret']) {const i=context(structuredClone(cases[0]));i.coupled[field]='DUMMY';assert.equal(reviewCoupledAffect(i).coupled.check,'invalid_coupled_scene_shape');}
});
test('coupled review is not a transport selector or allowance protocol and leaves all nine live pins intact',()=>{
  assert.throws(()=>new GatedDeepSeekClient(null,{protocol:'offline-coupled-affect-review-v1'}),/unreviewed_transport_protocol/);
  assert.throws(()=>validateAllowance({id:'offline',mode:'live',approved:true,expiresAt:10,protocolVersion:'offline-coupled-affect-review-v1',limits:{maxRuns:1,maxCalls:1,maxMicroCny:1},pricing:{model:'deepseek-flash',contextTokenLimit:1,inputMicroCnyPerMillion:1,outputMicroCnyPerMillion:1,reference:'https://api-docs.deepseek.com/TEST-ONLY',checkedAt:1}}),/invalid_allowance_protocol/);
  assert.equal(Object.keys(prunedV2TrialProposal().protocolSourcePins).length,9);
});
test('independent coupled comparison script returns only aggregates, zero requests and no quality claim',()=>{
  const r=spawnSync(process.execPath,['scripts/check-coupled-affect-review.mjs'],{cwd:new URL('..',import.meta.url),encoding:'utf8'});assert.equal(r.status,0,r.stderr);const out=JSON.parse(r.stdout);
  assert.equal(out.cases,15);assert.equal(out.realModelRequests,0);assert.equal(out.persistentWrites,0);assert.equal(out.liveSourcePinsUnchanged,true);assert.equal(out.modelComplianceImproved,'not_assessed');assert.equal(out.qualityAssessed,false);
});
