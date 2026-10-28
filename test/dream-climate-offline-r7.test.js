import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {neutral} from '../src/contract.js';
import {
  buildBatchPlan,buildDreamStageRequest,dreamClimatePromptHash,
  dreamClimatePromptSource,normalizeDreamClimateScene
} from '../scripts/nv-dream-climate-offline-01/protocol.mjs';
import {createDummySimulator} from '../scripts/nv-dream-climate-offline-01/phase-b/dummy.mjs';
import {ManagedDreamClimateRuntime} from '../scripts/nv-dream-climate-offline-01/phase-b/runtime.mjs';
import {r6Profile} from '../scripts/nv-dream-climate-offline-01/single-run-r6/profile.mjs';
import {r6RunId,r6StoreBasename} from '../scripts/nv-dream-climate-offline-01/single-run-r6/config.mjs';

const sha256=value=>crypto.createHash('sha256').update(value,'utf8').digest('hex');
const copy=value=>structuredClone(value);
const run=buildBatchPlan([{climate:'ordinary',mechanism:'transformation',
  foregroundAnchor:'cup_tap'}])[0];

// Frozen prompt identity recorded before R7 and the wake system hash of that
// same version. Only sceneRules gained the same-scene clarification.
const frozenPromptHash='9fe4d0863983eae2eb8a969d89fd6ffc5eeab3ebec507bf263d0f27664fbdb66';
const frozenWakeSystemSha='3b7b7f48afd0d93c68718f083dab9c4749d29cb8ccbb1968f36150d0a171b77e';

// Historical model response, verbatim from the R7 construction envelope. It is
// not model output from this repository and was never published.
const historical={
  event:'铁皮盒的盖子被搁到长凳另一头，盒口朝上，那张洇湿的票根还贴在盒底。梦里的人伸指沿着盒沿走了一圈，走到缺口处停住，又轻轻敲了两下。声音闷在薄铁里，像从很远的地方传回来。旁边另一个人没有接话，只把盒盖拿起来，对着剩余的天光看了一会儿，然后把它翻扣在盒口上，像一杯凉透的茶被合了盖。小街的积水暗下去，早点摊的板凳腿在湿地上挪出轻轻一声。',
  appraisal:{goalEffect:0,control:0.4,uncertainty:0.6},
  basis:{goal:null,control:'把它翻扣在盒口上',uncertainty:'日期被水汽洇得看不清了'},
  affect:{kind:'estimated',delta:{valence:0,arousal:-0.1},
    excerpt:'声音闷在薄铁里，像从很远的地方传回来'}
};
const historicalBefore={valence:0,arousal:0.1};
const crossSceneSentence='日期被水汽洇得看不清了';
const secondCrossSceneSentence='盒盖对着剩余的天光看了一会儿';

const earlierScenes=[
  Object.freeze({event:'雨停后，梦里的人把一张折过的车票摊在早点摊的桌面上，票面日期被水汽洇得看不清了。旁边的人把杯子推远了一点。',
    appraisal:{goalEffect:0,control:0.5,uncertainty:0.5},
    basis:{goal:null,control:null,uncertainty:null},affect:{kind:'unchanged'}}),
  Object.freeze({event:'梦里的人把车票收回口袋，转身去看那张空桌，杯沿上还留着一圈浅印。',
    appraisal:{goalEffect:0,control:0.5,uncertainty:0.5},
    basis:{goal:null,control:null,uncertainty:null},affect:{kind:'unchanged'}})
];

const sameSceneEvent='铁皮盒的盖子被搁到长凳另一头。梦里的人伸指沿着盒沿走了一圈，又轻轻敲了两下。小街的积水暗下去，早点摊的板凳腿挪出轻轻一声。';
const compliant={
  event:sameSceneEvent,
  appraisal:{goalEffect:1,control:0.4,uncertainty:0.6},
  basis:{goal:['盖子被搁到长凳另一头','伸指沿着盒沿走了一圈'],
    control:'轻轻敲了两下',uncertainty:'小街的积水暗下去'},
  affect:{kind:'estimated',delta:{valence:0.1,arousal:-0.1},
    excerpt:'板凳腿挪出轻轻一声'}
};
const noEvidence={
  event:sameSceneEvent,
  appraisal:{goalEffect:0,control:0.5,uncertainty:0.5},
  basis:{goal:null,control:null,uncertainty:null},affect:{kind:'unchanged'}
};

// R6's approval is closed by the R7 prompt identity change (see the entry
// test). The runtime reads a profile identity, so this frozen historical
// identity only lets the reused runtime drive synthetic offline stages; no
// entry, credential, store contract or network path is opened here.
const closedR6TestIdentity={
  identityHash:'ebceaf1a5609d31d5031cce86c86e4424e2ede4864f0d6d3c2d83005e30f2531',
  executionDigest:'f2eceb8719d20b492f130b4cba9030ea7e09cd03f66fabd1c2ceb379d278b294',
  executionPin:'f2eceb8719d20b492f130b4cba9030ea7e09cd03f66fabd1c2ceb379d278b294',
  releaseHash:'5b35b7aa59806cfbc3d9d467e05190d8b2ee031b18df0a2d48e4bed25e7a63e5'
};

test('historical third scene is rejected only for its cross-scene uncertainty quotation',()=>{
  let before=neutral();
  const previousScenes=earlierScenes.map(scene=>{
    const value=normalizeDreamClimateScene(copy(scene),before);before=value.after;return value;
  });
  assert.ok(previousScenes[0].event.includes(crossSceneSentence));
  assert.equal(historical.event.includes(crossSceneSentence),false);
  assert.ok(historical.event.includes(historical.basis.control));
  assert.ok(historical.event.includes(historical.affect.excerpt));
  assert.throws(()=>normalizeDreamClimateScene(copy(historical),copy(historicalBefore)),
    /invalid_compact_evidence/);

  const control=copy(historical);
  control.basis.uncertainty='小街的积水暗下去';
  assert.ok(control.event.includes(control.basis.uncertainty));
  const accepted=normalizeDreamClimateScene(control,copy(historicalBefore));
  assert.equal(accepted.appraisalBasis.evidence.uncertaintyExcerpt,'小街的积水暗下去');
  assert.equal(accepted.appraisalBasis.evidence.controlExcerpt,'把它翻扣在盒口上');
  assert.equal(accepted.event,historical.event);
  assert.equal(accepted.appraisal.goalEffect,0);
});

test('every quoted basis field must come from the current event, not an earlier scene',()=>{
  const cases=[
    ['goal goalExcerpt',value=>{value.basis.goal[0]=crossSceneSentence;}],
    ['goal outcomeExcerpt',value=>{value.basis.goal[1]=secondCrossSceneSentence;}],
    ['control',value=>{value.basis.control=crossSceneSentence;}],
    ['uncertainty',value=>{value.basis.uncertainty=crossSceneSentence;}],
    ['affect excerpt',value=>{value.affect.excerpt=secondCrossSceneSentence;}]
  ];
  for(const [name,mutate] of cases){
    const value=copy(compliant);mutate(value);
    assert.throws(()=>normalizeDreamClimateScene(value,neutral()),/invalid_compact_evidence/,name);
  }

  const inside=copy(compliant);
  inside.event=sameSceneEvent+crossSceneSentence+'。';
  inside.basis.uncertainty=crossSceneSentence;
  const accepted=normalizeDreamClimateScene(inside,neutral());
  assert.equal(accepted.appraisalBasis.evidence.uncertaintyExcerpt,crossSceneSentence);

  const sameScene=normalizeDreamClimateScene(copy(compliant),neutral());
  assert.deepEqual(sameScene.appraisalBasis.evidence,{
    goal:{goalExcerpt:'盖子被搁到长凳另一头',outcomeExcerpt:'伸指沿着盒沿走了一圈'},
    controlExcerpt:'轻轻敲了两下',uncertaintyExcerpt:'小街的积水暗下去',
    affectExcerpt:'板凳腿挪出轻轻一声'
  });
  const quiet=normalizeDreamClimateScene(copy(noEvidence),neutral());
  assert.deepEqual(quiet.appraisalBasis.evidence,
    {goal:null,controlExcerpt:null,uncertaintyExcerpt:null,affectExcerpt:null});
  assert.equal(quiet.appraisal.goalEffect,0);
  assert.equal(quiet.delta.valence,0);
  assert.equal(quiet.delta.arousal,0);
});

test('each scene stage carries the clarification while previous scenes and wake stay exact',()=>{
  const clarification='previousScenes supply narrative continuity and earlier states only';
  const checkStep='Before returning, confirm each quotation occurs in the current event';
  assert.ok(dreamClimatePromptSource.sceneSystem.includes(clarification));
  assert.ok(dreamClimatePromptSource.sceneSystem.includes(checkStep));
  assert.equal(dreamClimatePromptSource.sceneRules.length,12);

  let before=neutral();
  const previousScenes=[];
  const raws=[earlierScenes[0],earlierScenes[1],compliant];
  for(const [index,raw] of raws.entries()){
    const request=buildDreamStageRequest({run,previousScenes,stage:'scene'});
    const system=request.body.messages[0].content;
    const material=JSON.parse(request.body.messages[1].content);
    assert.ok(system.includes(clarification),'scene '+index);
    assert.ok(system.includes(checkStep),'scene '+index);
    assert.equal(material.stage,'scene');
    assert.equal(material.sceneIndex,index);
    assert.equal(material.previousScenes.length,index);
    assert.deepEqual(material.previousScenes.map(scene=>scene.event),
      previousScenes.map(scene=>scene.event));
    const value=normalizeDreamClimateScene(copy(raw),before);
    previousScenes.push(value);before=value.after;
  }

  const wake=buildDreamStageRequest({run,previousScenes,stage:'wake'});
  assert.equal(wake.body.messages[0].content,dreamClimatePromptSource.wakeSystem);
  assert.equal(sha256(wake.body.messages[0].content),frozenWakeSystemSha);
  assert.equal(wake.body.messages[0].content.includes(clarification),false);
  assert.equal(JSON.parse(wake.body.messages[1].content).previousScenes.length,3);

  assert.equal(dreamClimatePromptHash,'89b1d4a87d53f41b697341dd32fb4bb3ad41b665e2a47b68a3d5e5464cbf3c38');
  assert.notEqual(dreamClimatePromptHash,frozenPromptHash);
});

test('fake transport stops after the rejected third scene with two drafts and one settled usage',async t=>{
  const parent=fs.mkdtempSync(path.join(os.tmpdir(),'nv-r7-runtime-'));
  t.after(()=>fs.rmSync(parent,{recursive:true,force:true}));
  const directory=path.join(parent,r6StoreBasename);
  const base=createDummySimulator();
  let calls=0,wakeCalls=0;
  const simulator=async request=>{
    calls++;
    const material=JSON.parse(request.body.messages[1].content);
    if(material.stage==='wake')wakeCalls++;
    const response=await base(request);
    if(material.stage==='scene'&&material.sceneIndex===2)
      response.body.choices[0].message.content=JSON.stringify(historical);
    return response;
  };
  const profile={...r6Profile,verifyIdentity:()=>closedR6TestIdentity};
  const runtime=new ManagedDreamClimateRuntime(directory,
    {enabled:true,simulator,now:()=>1700000000000},profile);
  t.after(()=>{try{runtime.close();}catch{}});
  runtime.startBatch();
  await runtime.executeBatch();

  const record=runtime.run(r6RunId);
  const billing=runtime.status(r6RunId).billing;
  assert.equal(calls,3);
  assert.equal(wakeCalls,0);
  assert.equal(record.status,'failed');
  assert.equal(record.error,'scene_response_rejected');
  assert.equal(record.draftScenes.length,2);
  assert.equal(record.wake,undefined);
  assert.equal(record.entryId,undefined);
  assert.equal(Object.keys(runtime.store.state.entries).length,0);
  assert.equal(record.diagnostics.length,1);
  const diagnostic=record.diagnostics[0];
  assert.equal(diagnostic.stage,'scene');
  assert.equal(diagnostic.originalError,'invalid_compact_evidence');
  assert.equal(diagnostic.usageValidation,'verified');
  assert.equal(diagnostic.settlement,'settled');
  assert.equal(diagnostic.published,false);
  assert.equal(JSON.stringify(diagnostic.parsedJson),JSON.stringify(historical));
  assert.equal(billing.calls,3);
  assert.equal(billing.settled,3);
  assert.equal(billing.unknown,0);
  assert.ok(BigInt(billing.settledChargeMicroCny)>0n);
  assert.equal(billing.combinedIsProviderCharged,false);
  assert.equal(record.attempts.filter(attempt=>attempt.stage==='wake').length,0);
});