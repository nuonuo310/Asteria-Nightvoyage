import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {neutral} from '../src/contract.js';
import {generatedWakeFixture as fixture} from '../fixtures/generated-wake-offline.js';
import {buildGeneratedWakeRequest} from '../src/generated-wake-protocol.js';
import {
  dreamClimateCallsPerRun,dreamClimateDefinitions,dreamClimateNormalizationVersion,
  dreamClimateOrder,dreamClimatePromptSource,dreamClimateProtocolIdentity,
  dreamClimateProtocolVersion,dreamClimateScenesPerRun,dreamClimateSceneMaterial,
  dreamClimateUnknownAuditPolicyVersion,dreamClimateWeights,normalizeDreamClimateCheckpoint,
  normalizeDreamClimateScene,selectClimate
} from '../src/dream-climate-protocol.js';

const context={sceneIndex:0,requestId:'closeout-scene-0'};
const raw=({
  event='梦里的人把杯子挪到窗台内侧。',
  appraisal={goalEffect:0,control:.5,uncertainty:.5},
  basis={goal:null,control:null,uncertainty:null},
  affect={kind:'unchanged'}
}={})=>({event,appraisal,basis,affect});

test('climate weights, roll boundaries and fixed identities are explicit and deterministic',()=>{
  assert.deepEqual([...dreamClimateOrder],['ordinary','uneasy','nightmare']);
  assert.deepEqual({...dreamClimateWeights},{ordinary:.65,uneasy:.30,nightmare:.05});
  assert.equal(Object.values(dreamClimateWeights).reduce((sum,value)=>sum+value,0),1);
  assert.deepEqual(Object.keys(dreamClimateDefinitions),[ 'ordinary','uneasy','nightmare' ]);
  for(const [roll,expected] of [[0,'ordinary'],[.649999,'ordinary'],[.65,'uneasy'],
    [.949999,'uneasy'],[.95,'nightmare'],[.999999,'nightmare']])
    assert.equal(selectClimate(roll),expected);
  for(const roll of [-.0001,1,NaN,Infinity,-Infinity,'0.5',null,undefined])
    assert.throws(()=>selectClimate(roll),/invalid_dream_climate_roll/);
  const identity=dreamClimateProtocolIdentity();
  assert.equal(identity.protocolVersion,dreamClimateProtocolVersion);
  assert.equal(identity.normalizationVersion,dreamClimateNormalizationVersion);
  assert.equal(identity.unknownAuditPolicyVersion,dreamClimateUnknownAuditPolicyVersion);
  assert.equal(identity.scenesPerRun,dreamClimateScenesPerRun);
  assert.equal(identity.callsPerRun,dreamClimateCallsPerRun);
  assert.equal(dreamClimateScenesPerRun,3);assert.equal(dreamClimateCallsPerRun,4);
});

test('the prompt requires three-scene change and one transformation without forcing a plot',()=>{
  const prompt=dreamClimatePromptSource.sceneSystem;
  assert.match(prompt,/The run has exactly three scenes\./);
  assert.match(prompt,/Scene 2 and scene 3 must each change at least one observable state/);
  assert.match(prompt,/only moving the camera, or only adding scenery does not count as a change/);
  assert.match(prompt,/Across the three scenes include at least one dream transformation/);
  assert.match(prompt,/previousScenes supply narrative continuity and earlier states only/);
  assert.match(prompt,/No fourth scene, second wake, retry, replacement run, later recollection/);
  assert.match(prompt,/Do not force a climax, conflict, danger, tragedy, healing, insight/);
  const source=fs.readFileSync(new URL('../src/dream-climate-protocol.js',import.meta.url),'utf8');
  for(const forbidden of ['Math.random','node:http','node:https','node:net','node:tls','fetch(',
    'spawn(','execFile(','NIGHTVOYAGE_DEEPSEEK_KEY','owner.lock','forceClimate'])
    assert.equal(source.includes(forbidden),false,forbidden);
});

test('same-scene evidence is accepted, cross-scene evidence and unbased goals are rejected',()=>{
  const event='梦里的人把杯子挪到窗台内侧，杯沿轻轻碰了一下，雨声停了。';
  const accepted=normalizeDreamClimateScene({
    event,
    appraisal:{goalEffect:-1,control:.2,uncertainty:.8},
    basis:{goal:['把杯子挪到窗台内侧','杯沿轻轻碰了一下'],
      control:'杯沿轻轻碰了一下',uncertainty:'雨声停了'},
    affect:{kind:'estimated',delta:{valence:-.05,arousal:.05},excerpt:'杯沿轻轻碰了一下'}
  },neutral(),{sceneIndex:0,requestId:'same-scene'});
  assert.equal(accepted.appraisal.goalEffect,-1);
  assert.deepEqual(accepted.appraisalBasis.evidence.goal,
    {goalExcerpt:'把杯子挪到窗台内侧',outcomeExcerpt:'杯沿轻轻碰了一下'});
  assert.equal(accepted.appraisalBasis.evidence.controlExcerpt,'杯沿轻轻碰了一下');
  assert.equal(accepted.appraisalBasis.evidence.uncertaintyExcerpt,'雨声停了');
  assert.equal(accepted.appraisalBasis.evidence.affectExcerpt,'杯沿轻轻碰了一下');
  assert.throws(()=>normalizeDreamClimateScene({
    event:'新的场景里只有一盏灯。',
    appraisal:{goalEffect:0,control:.7,uncertainty:.2},
    basis:{goal:null,control:'杯沿轻轻碰了一下',uncertainty:'雨声停了'},
    affect:{kind:'unchanged'}
  },neutral(),{sceneIndex:1,requestId:'cross-scene'}),/invalid_compact_evidence|appraisal_excerpt_not_grounded/);
  assert.throws(()=>normalizeDreamClimateScene(raw({
    appraisal:{goalEffect:1,control:.5,uncertainty:.5},basis:{goal:null,control:null,uncertainty:null}
  }),neutral(),{sceneIndex:0,requestId:'unbased-goal'}),/nonzero_goal_requires_evidence/);
});

test('R9 UNKNOWN canonicalization is deterministic, audited and stripped from narrative material',()=>{
  const input=raw({appraisal:{goalEffect:0,control:.4,uncertainty:.7}});
  const normalized=normalizeDreamClimateScene(input,neutral(),context);
  assert.deepEqual(normalized.appraisal,{goalEffect:0,control:.5,uncertainty:.5});
  assert.deepEqual(normalized.unbasedAppraisalAudit.items,[
    {dimension:'control',receivedValue:.4,canonicalValue:.5,rule:'unbased_requires_unknown'},
    {dimension:'uncertainty',receivedValue:.7,canonicalValue:.5,rule:'unbased_requires_unknown'}
  ]);
  assert.equal(normalized.unbasedAppraisalAudit.sceneIndex,0);
  assert.equal(normalized.unbasedAppraisalAudit.requestId,context.requestId);
  assert.match(normalized.unbasedAppraisalAudit.integrityHash,/^[0-9a-f]{64}$/);
  assert.deepEqual(normalizeDreamClimateCheckpoint(normalized,neutral(),context),normalized);
  const material=dreamClimateSceneMaterial(normalized);
  assert.equal(Object.hasOwn(material,'unbasedAppraisalAudit'),false);
  assert.equal(Object.hasOwn(material,'normalizationAudit'),false);
  assert.equal(JSON.stringify(material).includes('unbased_requires_unknown'),false);
  assert.deepEqual(input,raw({appraisal:{goalEffect:0,control:.4,uncertainty:.7}}));
  for(const invalid of [-.1,1.1])
    assert.throws(()=>normalizeDreamClimateScene(raw({appraisal:{goalEffect:0,control:invalid,uncertainty:.5}}),
      neutral(),context),/invalid_appraisal|unbased_appraisal_requires_placeholder/);
});

test('technical audit tampering fails checkpoint validation while material requests stay clean',()=>{
  const normalized=normalizeDreamClimateScene(raw({
    event:'梦里的人看见纸船吸水后变成一只浅杯。',
    appraisal:{goalEffect:0,control:.5,uncertainty:.6}
  }),neutral(),context);
  const changedValue=structuredClone(normalized);
  changedValue.unbasedAppraisalAudit.items[0].receivedValue=.45;
  assert.throws(()=>normalizeDreamClimateCheckpoint(changedValue,neutral(),context),
    /invalid_dream_climate_audit/);
  const changedRequest=structuredClone(normalized);
  changedRequest.unbasedAppraisalAudit.requestId='other-request';
  assert.throws(()=>normalizeDreamClimateCheckpoint(changedRequest,neutral(),context),
    /invalid_dream_climate_audit/);
  const material=dreamClimateSceneMaterial(normalized);
  const request=buildGeneratedWakeRequest({snapshot:structuredClone(fixture.snapshot),
    scenes:[material],stage:'scene',index:1});
  const wire=JSON.stringify(request.body);
  assert.equal(wire.includes('unbasedAppraisalAudit'),false);
  assert.equal(wire.includes('unbased_requires_unknown'),false);
  assert.equal(wire.includes('integrityHash'),false);
  assert.throws(()=>buildGeneratedWakeRequest({snapshot:structuredClone(fixture.snapshot),
    scenes:[normalized],stage:'scene',index:1}),/invalid_dream_climate_scene_material/);
});
