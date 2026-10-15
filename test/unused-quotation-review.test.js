import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { normalizeAppraisalScene } from '../src/appraisal-rehearsal.js';
import { compactSceneData, normalizeCompactScene, normalizeCompactStage } from '../src/compact-appraisal-protocol.js';
import { reviewUnusedQuotations } from '../src/unused-quotation-review.js';
import { singleSceneProposal } from '../src/single-scene-diagnostic.js';
import { neutral } from '../src/contract.js';

const probes=JSON.parse(fs.readFileSync(new URL('../fixtures/appraisal-probes.json',import.meta.url)));
const raw=i=>compactSceneData(normalizeAppraisalScene(probes.scenes[i],neutral()));
const context=wire=>({materialKind:'fictional',origin:'dream',isRealityFact:false,raw:wire,before:neutral()});
function inserted(i=0){const x=raw(i);x.evidence.unshift('梦');for(const key of ['control','uncertainty','affect'])if(x.links[key]!==null)x.links[key]++;
  if(x.links.goal!==null)x.links.goal=x.links.goal.map(n=>n+1);return x;}
test('offline review leaves valid strict scenes alone and returns no generated data',()=>{
  for(let i=0;i<4;i++){const x=raw(i),result=reviewUnusedQuotations(context(x));assert.equal(result.strict.accepted,true);assert.equal(result.candidate,null);assert.equal(result.generatedBodyReturned,false);
    assert.equal(result.semanticSupport,'not_assessed');assert.equal(result.isRealityFact,false);assert.ok(!JSON.stringify(result).includes(x.event));assert.equal(result.realModelRequests,0);}
});
test('discard-only comparison preserves current event, numbers, bound quotes and shared indices without mutating input',()=>{
  for(let i=0;i<4;i++){const x=inserted(i),before=structuredClone(x),r=reviewUnusedQuotations(context(x));assert.equal(r.strict.check,'unused_compact_evidence');assert.equal(r.candidate.accepted,true);
    assert.equal(r.candidate.removedUnusedQuoteCount,1);for(const key of ['preservesEvent','preservesAppraisal','preservesDelta','preservesLinkedEvidence'])assert.equal(r.candidate[key],true);
    assert.deepEqual(x,before);assert.throws(()=>normalizeCompactScene(x,neutral()),/unused_compact_evidence/);}
});
test('later goal, unknown-placeholder and affect checks remain required after discarding unused quotes',()=>{
  for(const [mutate,expected]of [[x=>x.appraisal.goalEffect=-1,'nonzero_goal_requires_evidence'],[x=>x.appraisal.control=0,'unbased_appraisal_requires_placeholder'],
    [x=>x.appraisal.uncertainty=1,'unbased_appraisal_requires_placeholder'],[x=>x.delta.arousal=0.1,'affect_change_requires_evidence'],
    [x=>x.appraisal.control=2,'invalid_appraisal'],[x=>x.delta.valence=2,'invalid_affect']]){
    const x=inserted();mutate(x);const r=reviewUnusedQuotations(context(x));assert.equal(r.strict.check,'unused_compact_evidence');assert.equal(r.candidate.accepted,false);assert.equal(r.candidate.check,expected);}
});
test('invalid unused data is rejected before pruning rather than concealed',()=>{
  for(const mutate of [x=>x.evidence[0]='not in event',x=>x.evidence.push(x.evidence[0]),x=>{x.event='波'.repeat(65);x.evidence=[x.event];},
    x=>x.links.control=99,x=>x.links.extra=null,x=>x.evidence.push('里','的','人','站','在')]){
    const x=inserted();mutate(x);const r=reviewUnusedQuotations(context(x));assert.equal(r.strict.accepted,false);assert.notEqual(r.strict.check,'unused_compact_evidence');assert.equal(r.candidate,null);}
});
test('unused rule is the only comparison exception; neutral goal evidence cannot be reinterpreted as purpose',()=>{
  const x=inserted();x.links.goal=[0,0];assert.equal(reviewUnusedQuotations(context(x)).strict.check,'neutral_goal_evidence_must_be_null');
  assert.equal(reviewUnusedQuotations(context(x)).candidate,null);
});
test('literal support remains semantically unassessed even when a referenced quote is irrelevant',()=>{
  const x=inserted(1);x.links.affect=x.links.goal[0];const r=reviewUnusedQuotations(context(x));assert.equal(r.candidate.accepted,true);assert.equal(r.semanticSupport,'not_assessed');assert.equal(r.qualityAssessed,false);
});
test('review context rejects real/unmarked input and never enables the existing live protocol',()=>{
  const x=context(inserted());for(const patch of [{materialKind:'real'},{isRealityFact:true},{origin:'memory'},{before:{valence:2,arousal:0.2}}])assert.throws(()=>reviewUnusedQuotations({...x,...patch}),/fictional_review_context_required/);
  assert.throws(()=>normalizeCompactStage(x.raw,{stage:'scene',previousAffect:neutral()}),/compact_appraisal_invalid/);
  const p=singleSceneProposal();assert.equal(p.paidEvaluationApproved,false);assert.equal(p.protocolVersion,'compact-appraisal-quotes-v1');assert.equal(p.maxAdditionalCalls,1);
});
test('offline command uses 15 independent scripted comparisons with no provider, user body or quality claim',()=>{
  const r=spawnSync(process.execPath,['scripts/check-unused-quotation-policy.mjs'],{cwd:new URL('..',import.meta.url),encoding:'utf8'});assert.equal(r.status,0,r.stderr);
  const output=JSON.parse(r.stdout);assert.equal(output.cases,15);assert.equal(output.realModelRequests,0);assert.equal(output.liveProtocolChanged,false);assert.equal(output.userResponseReconstructed,false);
  assert.equal(output.results.filter(x=>x.candidate?.accepted).length,4);assert.equal(output.results.filter(x=>x.candidate&&!x.candidate.accepted).length,3);
  assert.ok(output.results.every(x=>!x.qualityAssessed&&!x.generatedBodyReturned));assert.ok(!r.stdout.includes(probes.scenes[0].event));
});
