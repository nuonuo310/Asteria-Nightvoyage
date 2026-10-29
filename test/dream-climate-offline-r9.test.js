import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Readable} from 'node:stream';
import {hash,neutral} from '../src/contract.js';
import {createDummySimulator} from '../scripts/nv-dream-climate-offline-01/phase-b/dummy.mjs';
import {ManagedDreamClimateRuntime} from '../scripts/nv-dream-climate-offline-01/phase-b/runtime.mjs';
import {runLiveWorker} from '../scripts/nv-dream-climate-offline-01/phase-b/worker.mjs';
import {r8Profile} from '../scripts/nv-dream-climate-offline-01/single-run-r8/profile.mjs';
import {r8RunId} from '../scripts/nv-dream-climate-offline-01/single-run-r8/config.mjs';
import {
  r8ReleaseObject,validateR8Release
} from '../scripts/nv-dream-climate-offline-01/single-run-r8/release.mjs';
import {verifyR8Identity} from '../scripts/nv-dream-climate-offline-01/single-run-r8/identity.mjs';
import {runR8Worker} from '../scripts/nv-dream-climate-offline-01/single-run-r8/worker.mjs';
import {
  buildDreamStageRequest,dreamClimateNormalizationVersion,
  dreamClimateSceneMaterial,dreamClimateUnknownAuditPolicyVersion,
  normalizeDreamClimateCheckpoint,normalizeDreamClimateScene
} from '../scripts/nv-dream-climate-offline-01/protocol.mjs';

const copy=value=>structuredClone(value);
const temporary=()=>fs.mkdtempSync(path.join(os.tmpdir(),'nv-dream-climate-r9-'));
const exactR8Object=Object.freeze({
  event:'梦里，一个人把一只白瓷杯搁在窗台上，杯里剩一点温水。雨刚停，街面泛着灰白的光。另一人伸手用指节在杯沿上轻敲两下，声音很薄，杯壁随之微微一颤。随后那人把杯子往窗台内侧挪了挪，像是要把这场对话留在那儿，却没说下次再讲的是什么事。',
  appraisal:Object.freeze({goalEffect:0,control:.5,uncertainty:.6}),
  basis:Object.freeze({goal:null,control:null,uncertainty:null}),
  affect:Object.freeze({kind:'unchanged'})
});
const context=(sceneIndex=0,requestId='r9-test-scene-0')=>({sceneIndex,requestId});

function simpleRaw({event='梦里的人把杯子挪到窗台内侧。',control=.5,uncertainty=.5,
  controlBasis=null,uncertaintyBasis=null,goal=null,goalEffect=0}={}){
  return {event,appraisal:{goalEffect,control,uncertainty},
    basis:{goal,control:controlBasis,uncertainty:uncertaintyBasis},
    affect:{kind:'unchanged'}};
}

function wire(scene){
  const evidence=scene.appraisalBasis.evidence;
  return {event:scene.event,appraisal:copy(scene.appraisal),
    basis:{goal:evidence.goal===null?null:
      [evidence.goal.goalExcerpt,evidence.goal.outcomeExcerpt],
    control:evidence.controlExcerpt,uncertainty:evidence.uncertaintyExcerpt},
    affect:scene.affectDeclaration.kind==='unchanged'?{kind:'unchanged'}:
      {kind:'estimated',delta:copy(scene.delta),excerpt:evidence.affectExcerpt}};
}

function auditItems(scene){
  return scene.unbasedAppraisalAudit.items;
}

test('R8 exact object canonicalizes only unbased uncertainty and keeps all narrative fields',()=>{
  const original=copy(exactR8Object);
  const scene=normalizeDreamClimateScene(exactR8Object,neutral(),context());
  assert.deepEqual(exactR8Object,original);
  assert.equal(scene.event,original.event);
  assert.deepEqual(scene.appraisal,{goalEffect:0,control:.5,uncertainty:.5});
  assert.deepEqual(scene.appraisalBasis.evidence,
    {goal:null,controlExcerpt:null,uncertaintyExcerpt:null,affectExcerpt:null});
  assert.equal(scene.affectDeclaration.kind,'unchanged');
  assert.deepEqual(scene.delta,{valence:0,arousal:0});
  assert.equal(scene.appraisalBasis.protocolVersion,dreamClimateNormalizationVersion);
  assert.equal(scene.unbasedAppraisalAudit.schemaVersion,1);
  assert.equal(scene.unbasedAppraisalAudit.policyVersion,dreamClimateUnknownAuditPolicyVersion);
  assert.equal(scene.unbasedAppraisalAudit.sceneIndex,0);
  assert.equal(scene.unbasedAppraisalAudit.requestId,'r9-test-scene-0');
  assert.match(scene.unbasedAppraisalAudit.integrityHash,/^[0-9a-f]{64}$/);
  assert.deepEqual(auditItems(scene),[
    {dimension:'uncertainty',receivedValue:.6,canonicalValue:.5,
      rule:'unbased_requires_unknown'}
  ]);
});

test('control and uncertainty canonicalization is deterministic, idempotent and evidence-preserving',()=>{
  const cases=[
    {name:'control-null',raw:simpleRaw({control:.4}),wantItems:[
      {dimension:'control',receivedValue:.4,canonicalValue:.5,rule:'unbased_requires_unknown'}
    ]},
    {name:'uncertainty-null',raw:simpleRaw({uncertainty:.7}),wantItems:[
      {dimension:'uncertainty',receivedValue:.7,canonicalValue:.5,rule:'unbased_requires_unknown'}
    ]},
    {name:'both-null',raw:simpleRaw({control:.2,uncertainty:.9}),wantItems:[
      {dimension:'control',receivedValue:.2,canonicalValue:.5,rule:'unbased_requires_unknown'},
      {dimension:'uncertainty',receivedValue:.9,canonicalValue:.5,rule:'unbased_requires_unknown'}
    ]},
    {name:'already-unknown',raw:simpleRaw(),wantItems:[]},
    {name:'same-scene-evidence',raw:simpleRaw({event:'梦里的人把杯子挪到窗台内侧，又轻轻敲了一下。',
      control:.3,uncertainty:.8,controlBasis:'轻轻敲了一下',uncertaintyBasis:'窗台内侧'}),wantItems:[]}
  ];
  for(const [index,entry] of cases.entries()){
    const ctx=context(0,`r9-table-${index}`);
    const original=copy(entry.raw);
    const scene=normalizeDreamClimateScene(entry.raw,neutral(),ctx);
    assert.deepEqual(entry.raw,original,entry.name);
    assert.deepEqual(auditItems(scene),entry.wantItems,entry.name);
    for(const item of entry.wantItems)assert.equal(scene.appraisal[item.dimension],.5,entry.name);
    assert.equal(scene.appraisal.control===.5||scene.appraisalBasis.evidence.controlExcerpt!==null,true,entry.name);
    assert.equal(scene.appraisal.uncertainty===.5||scene.appraisalBasis.evidence.uncertaintyExcerpt!==null,true,entry.name);
    assert.deepEqual(normalizeDreamClimateCheckpoint(scene,neutral(),ctx),scene,entry.name);
    const again=normalizeDreamClimateScene(wire(scene),neutral(),ctx);
    assert.deepEqual(again.appraisal,scene.appraisal,entry.name);
    assert.deepEqual(auditItems(again),[],entry.name);
    assert.equal(hash(dreamClimateSceneMaterial(again)),
      hash(dreamClimateSceneMaterial(scene)),entry.name);
  }
});

test('invalid numbers, evidence, affect and shape still reject before a publishable scene exists',()=>{
  const cases=[
    ['control-infinity',()=>simpleRaw({control:Infinity})],
    ['uncertainty-nan',()=>simpleRaw({uncertainty:NaN})],
    ['control-negative',()=>simpleRaw({control:-.1})],
    ['uncertainty-over-one',()=>simpleRaw({uncertainty:1.1})],
    ['control-string',()=>simpleRaw({control:'0.6'})],
    ['extra-top-level',()=>({...simpleRaw(),extra:true})],
    ['extra-appraisal',()=>{const value=simpleRaw();value.appraisal.extra=1;return value;}],
    ['extra-basis',()=>{const value=simpleRaw();value.basis.extra=null;return value;}],
    ['nonzero-goal-without-evidence',()=>simpleRaw({goalEffect:1})],
    ['cross-scene-quote',()=>simpleRaw({control:.4,controlBasis:'另一幕才有的句子'})],
    ['missing-quote',()=>simpleRaw({uncertainty:.4,uncertaintyBasis:''})],
    ['invalid-affect',()=>{const value=simpleRaw();value.affect={kind:'estimated',delta:{valence:0,arousal:0}};return value;}],
    ['extra-affect',()=>{const value=simpleRaw();value.affect.extra=true;return value;}]
  ];
  for(const [name,mutate] of cases)
    assert.throws(()=>normalizeDreamClimateScene(mutate(),neutral(),context(0,`r9-invalid-${name}`)),name);
});

test('checkpoint round-trip keeps canonical value and audit and rejects every audit tamper',()=>{
  const before=neutral(),scene=normalizeDreamClimateScene(exactR8Object,before,
    context(0,'r9-checkpoint-scene-0'));
  assert.deepEqual(normalizeDreamClimateCheckpoint(scene,before,
    context(0,'r9-checkpoint-scene-0')),scene);
  const tamper=[
    ['received',value=>{value.unbasedAppraisalAudit.items[0].receivedValue=.7;}],
    ['canonical',value=>{value.unbasedAppraisalAudit.items[0].canonicalValue=.6;}],
    ['rule',value=>{value.unbasedAppraisalAudit.items[0].rule='model_estimate';}],
    ['dimension',value=>{value.unbasedAppraisalAudit.items[0].dimension='control';}],
    ['integrity',value=>{value.unbasedAppraisalAudit.integrityHash='0'.repeat(64);}],
    ['delete-item',value=>{value.unbasedAppraisalAudit.items=[];}],
    ['scene-index',value=>{value.unbasedAppraisalAudit.sceneIndex=1;}],
    ['request-id',value=>{value.unbasedAppraisalAudit.requestId='r9-other-request';}],
    ['delete-audit',value=>{delete value.unbasedAppraisalAudit;}]
  ];
  for(const [name,mutate] of tamper){
    const value=copy(scene);mutate(value);
    assert.throws(()=>normalizeDreamClimateCheckpoint(value,before,
      context(0,'r9-checkpoint-scene-0')),/invalid_dream_climate/,name);
  }
});

test('request builder strips program audits from model material',()=>{
  const scene=normalizeDreamClimateScene(exactR8Object,neutral(),context());
  const request=buildDreamStageRequest({run:r8Profile.matrix[0].plan,
    previousScenes:[scene],stage:'scene'});
  const material=JSON.parse(request.body.messages[1].content);
  assert.equal(material.previousScenes.length,1);
  assert.equal(Object.hasOwn(material.previousScenes[0],'unbasedAppraisalAudit'),false);
  assert.equal(Object.hasOwn(material.previousScenes[0],'normalizationAudit'),false);
  assert.equal(JSON.stringify(request.body).includes('unbased_requires_unknown'),false);
  assert.equal(material.previousScenes[0].event,scene.event);
  assert.deepEqual(material.previousScenes[0].appraisal,scene.appraisal);
});

const testIdentity=Object.freeze({identityHash:'r9-test-identity',
  executionDigest:'r9-test-execution',executionPin:'r9-test-execution',
  releaseHash:'r9-test-release'});
function testProfile(){
  return {...r8Profile,id:'r9-synthetic-test',verifyIdentity:()=>testIdentity,
    identityHash:()=>testIdentity.identityHash,releaseHash:()=>testIdentity.releaseHash};
}

function runtimeFixture(t,{mutator}={}){
  const parent=temporary();
  t.after(()=>fs.rmSync(parent,{recursive:true,force:true}));
  const base=createDummySimulator();
  let calls=0;
  const simulator=async request=>{
    calls++;
    const material=JSON.parse(request.body.messages[1].content);
    const response=await base(request);
    if(mutator)mutator({material,response,call:calls});
    return response;
  };
  const profile=testProfile();
  const runtime=new ManagedDreamClimateRuntime(path.join(parent,profile.storeBasename),
    {enabled:true,simulator,now:()=>1700000000000},profile);
  t.after(()=>{try{runtime.close();}catch{}});
  runtime.startBatch();
  return {runtime,parent,calls:()=>calls};
}

function setScene0Exact({material,response}){
  if(material.stage!=='scene'||material.sceneIndex!==0)return;
  response.body.choices[0].message.content=JSON.stringify(exactR8Object);
}

test('synthetic 3-scene plus wake loop uses the exact R8 first scene and keeps audit out of reading surface',async t=>{
  const fixture=runtimeFixture(t,{mutator:setScene0Exact});
  const status=await fixture.runtime.executeRun(r8RunId);
  assert.equal(status.status,'completed');
  assert.equal(fixture.calls(),4);
  const run=fixture.runtime.run(r8RunId),receipt=fixture.runtime.readReceipt();
  assert.equal(run.draftScenes.length,3);
  assert.equal(run.scenes.length,3);
  assert.equal(receipt.completedRuns,1);
  assert.equal(receipt.runs[0].scenes.length,3);
  assert.equal(receipt.runs[0].scenes[0].unbasedAppraisalAudit.items[0].dimension,'uncertainty');
  assert.equal(receipt.runs[0].scenes[0].unbasedAppraisalAudit.items[0].receivedValue,.6);
  const entry=fixture.runtime.store.state.entries[run.entryId];
  assert.equal(entry.scenes.length,3);
  assert.equal(entry.scenes.every(scene=>!Object.hasOwn(scene,'unbasedAppraisalAudit')&&
    !Object.hasOwn(scene,'normalizationAudit')),true);
  assert.equal(JSON.stringify(entry).includes('unbased_requires_unknown'),false);
  assert.equal(JSON.stringify(entry).includes('deepseek'),false);
  const fragment=run.wake.fragment;
  assert.equal(run.scenes.some(scene=>scene.event.includes(fragment)),true);
  assert.equal(run.wake.fragmentBasis.kind,'scene_excerpt');
  assert.ok(['present','absent','uncertain'].includes(receipt.runs[0].firstFeeling.status));
  assert.equal(receipt.runs[0].wake.residue.label,'simulated_estimate');
  assert.equal(receipt.runs[0].wake.residue.baseStrength,run.wake.residue);
  assert.deepEqual(fixture.runtime.store.state.recalls,{});
  assert.equal(fixture.runtime.store.state.entries[`r9-feeling-later`],undefined);
});

test('fake invalid goal, quote and affect stop at the first scene with one settled usage',async t=>{
  const cases=[
    ['goal',data=>{data.appraisal.goalEffect=1;data.basis.goal=null;}],
    ['quote',data=>{data.basis.control='没有出现在本幕的引文';}],
    ['affect',data=>{data.affect={kind:'estimated',delta:{valence:0,arousal:0},excerpt:'不存在'};}]
  ];
  for(const [name,mutate] of cases){
    await t.test(name,async t=>{
      const fixture=runtimeFixture(t,{mutator:({material,response})=>{
        if(material.stage!=='scene'||material.sceneIndex!==0)return;
        const data=JSON.parse(response.body.choices[0].message.content);
        mutate(data);
        response.body.choices[0].message.content=JSON.stringify(data);
      }});
      const status=await fixture.runtime.executeRun(r8RunId);
      assert.equal(status.status,'failed',name);
      assert.equal(fixture.calls(),1,name);
      assert.equal(fixture.runtime.run(r8RunId).draftScenes.length,0,name);
      assert.equal(Object.keys(fixture.runtime.store.state.entries).length,0,name);
      assert.equal(status.billing.calls,1,name);
      assert.equal(status.billing.settled,1,name);
      assert.equal(status.billing.unknown,0,name);
    });
  }
});

test('R8 identity and release fail closed before credential, real Store or network',async t=>{
  assert.throws(()=>verifyR8Identity(),/dream_climate_r8_/);
  assert.throws(()=>validateR8Release(r8ReleaseObject()),/dream_climate_r8_release_superseded/);
  const parent=temporary();t.after(()=>fs.rmSync(parent,{recursive:true,force:true}));
  const releaseFile=path.join(parent,'release.json');
  fs.writeFileSync(releaseFile,JSON.stringify(r8ReleaseObject()),'utf8');
  let credentialReads=0;
  const credentialSource=new Readable({read(){
    credentialReads++;
    this.push(Buffer.from(JSON.stringify({credential:'not-read'}),'utf8'));
    this.push(null);
  }});
  const value=await runR8Worker('run',{priceFile:path.join(parent,'missing-pricing.html'),
    releaseFile,syntheticStoreRoot:parent,credentialSource});
  assert.equal(value.status,'blocked');
  assert.match(value.reason,/dream_climate_r8_release_superseded/);
  assert.equal(value.credentialRequested,false);
  assert.equal(value.credentialDelivered,false);
  assert.equal(credentialReads,0);
  assert.equal(value.storeCreated,false);
  assert.equal(fs.existsSync(path.join(parent,'store')),false);
  const live=await runLiveWorker('run');
  assert.equal(live.status,'blocked');
  assert.equal(live.credentialRequested,false);
  assert.equal(live.credentialSupplierCalls,0);
});
