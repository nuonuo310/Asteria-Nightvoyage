import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {compareSceneContinuityRequest,sceneContinuityPromptVersion} from '../src/scene-continuity-prompt.js';
import {normalizeBudgetCoupledScene,buildBudgetCoupledRequest} from '../src/coupled-affect-protocol.js';
import {GatedDeepSeekClient} from '../src/gated-deepseek-client.js';
import {auditAffectSupportContrasts} from '../src/affect-support-contrast.js';
import {coupledTrialPinsMatch} from '../src/coupled-trial-config.js';
const input=JSON.parse(fs.readFileSync(new URL('../fixtures/quality/sparse-context.json',import.meta.url)));
const contrasts=JSON.parse(fs.readFileSync(new URL('../fixtures/affect-support-contrasts.json',import.meta.url)));
const first=normalizeBudgetCoupledScene(contrasts.scenes.find(s=>s.id==='explicit-unchanged').raw,contrasts.before),second=normalizeBudgetCoupledScene(contrasts.scenes.find(s=>s.id==='explicit-relief').raw,first.after);
const payload=(scenes,stage='scene')=>({snapshot:structuredClone(input),scenes:structuredClone(scenes),stage,index:scenes.length});

test('only second-scene system prose changes; body fields, saved scenes, schema and budgets remain exact',()=>{
  const p=payload([first]),before=structuredClone(p),r=compareSceneContinuityRequest(p),baseline=buildBudgetCoupledRequest(p,{model:'deepseek-flash',maxOutputTokens:400});assert.deepEqual(p,before);assert.deepEqual(r.baseline,baseline);assert.equal(r.bodyChanged,true);assert.notEqual(r.candidateBodyHash,r.baselineBodyHash);const candidate=structuredClone(r.candidate.body);candidate.messages[0].content=r.baseline.body.messages[0].content;assert.deepEqual(candidate,r.baseline.body);assert.ok(r.candidate.body.messages[0].content.startsWith(r.baseline.body.messages[0].content+'\n'));assert.equal(r.candidate.protocolVersion,sceneContinuityPromptVersion);assert.equal(r.paidEntryAvailable,false);assert.equal(r.qualityAssessed,false);
});
for(const [name,scenes,stage]of [['first scene',[],'scene'],['wake',[first,second],'wake']])test(`${name} preserves baseline body exactly, including original affect/excerpt instructions`,()=>{
  const r=compareSceneContinuityRequest(payload(scenes,stage));assert.equal(r.bodyChanged,false);assert.deepEqual(r.candidate.body,r.baseline.body);assert.equal(r.candidateBodyHash,r.baselineBodyHash);
});
test('literal normalization acceptance is independent of the candidate and authored transition labels',()=>{
  const before=auditAffectSupportContrasts(contrasts);compareSceneContinuityRequest(payload([first]));const after=auditAffectSupportContrasts(contrasts);assert.deepEqual(after,before);assert.ok(after.results.find(r=>r.caseId==='direction-conflict').literalContract.accepted);assert.deepEqual(after.transitionObservations.map(r=>r.qualityRank),[null,null,null]);assert.equal(after.annotationsVerifiedSemantically,false);
});
test('ordinary, quiet confirmation and transformed scripted transitions receive no automatic ranking',()=>{
  const fixture=structuredClone(contrasts);fixture.transitions.reverse();const audit=auditAffectSupportContrasts(fixture);assert.deepEqual(audit.transitionObservations.map(x=>x.observation),['transformed_with_link','ordinary_subtle_progress','limited_confirmation']);assert.ok(audit.transitionObservations.every(x=>x.isAutomaticJudgment===false&&x.qualityRank===null));assert.equal(compareSceneContinuityRequest(payload([first])).modelComplianceImproved,'not_assessed');
});
test('offline comparison requires explicit fictional no-egress input, valid stage/index and closed shape',()=>{
  for(const change of [p=>p.snapshot.materialKind='real',p=>p.snapshot.sources[0].grant.modelEgress=true,p=>p.index=0,p=>p.stage='repair',p=>p.provider='override',p=>p.snapshot.sources[0].grant.dream=false,p=>p.scenes.push(second),p=>p.index=Infinity]){const p=payload([first]);change(p);assert.throws(()=>compareSceneContinuityRequest(p));}
  assert.throws(()=>compareSceneContinuityRequest(payload([],'wake')),/invalid_continuity_comparison/);
});
test('inconsistent checkpoints cannot enter a candidate or be rewritten into apparent continuity',()=>{
  for(const change of [p=>p.scenes[0].after.valence=.2,p=>p.scenes[0].appraisalBasis.protocolVersion='other',p=>p.scenes[0].normalizationAudit.keptQuoteCount=1]){const p=payload([first]);change(p);assert.throws(()=>compareSceneContinuityRequest(p));}
});
test('returned mutations never change inputs or future baseline construction',()=>{
  const p=payload([first]),before=structuredClone(p),r=compareSceneContinuityRequest(p);r.candidate.body.messages[1].content='changed';r.baseline.body.messages[0].content='changed';assert.deepEqual(p,before);assert.notEqual(compareSceneContinuityRequest(p).baseline.body.messages[0].content,'changed');
});
test('candidate is not an accepted paid selector and all existing reviewed pins remain unchanged',()=>{
  assert.throws(()=>new GatedDeepSeekClient(null,{protocol:sceneContinuityPromptVersion}),/unreviewed_transport_protocol/);assert.equal(coupledTrialPinsMatch(),true);
});
test('offline script constructs three requests with zero generation, key, native request or Store access',()=>{
  const r=spawnSync(process.execPath,['scripts/check-scene-continuity-prompt.mjs'],{cwd:new URL('..',import.meta.url),encoding:'utf8',timeout:15000});assert.equal(r.status,0,r.stderr);const v=JSON.parse(r.stdout);assert.deepEqual(v.bodyChangedByStage,[false,true,false]);assert.equal(v.requestsConstructed,3);assert.equal(v.realModelRequests,0);assert.equal(v.fakeGenerationCalls,0);assert.equal(v.credentialReads,0);assert.equal(v.storeOpened,false);assert.equal(v.modelComplianceImproved,'not_assessed');assert.equal(v.authoredTransitionReview.length,3);
});

test('a self-consistent fictional event is not authenticated by a standalone request normalizer',()=>{
  const p=payload([first]);p.scenes[0].event='另一段结构一致、没有情绪变化估计的独立虚构事件。';const r=compareSceneContinuityRequest(p);assert.ok(JSON.parse(r.baseline.body.messages[1].content).previousScenes[0].event.includes('另一段'));assert.equal(r.offlineOnly,true);assert.equal(r.paidEntryAvailable,false);
});
test('request sizing counts serialized bytes and reports overflow without raising the transport ceiling',()=>{
  const p=payload([first]),ordinary=compareSceneContinuityRequest(p);assert.ok(ordinary.requestBytes.candidate>ordinary.requestBytes.baseline);assert.equal(ordinary.requestBytes.limit,65536);assert.equal(ordinary.requestBytes.units,'UTF-8 JSON bytes; not model tokens');p.snapshot.sources[0].text='"'.repeat(19000);const large=compareSceneContinuityRequest(p);assert.equal(large.requestBytes.candidateFits,false);assert.equal(large.requestBytes.limit,65536);assert.equal(large.realModelRequests,0);
});
