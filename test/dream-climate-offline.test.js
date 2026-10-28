import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {hash,neutral} from '../src/contract.js';
import {launchInlinePaid} from '../src/inline-paid-entry.js';
import {launchRichSampleLive} from '../scripts/nv-rich-fictional-dream-sample-01/live-launcher.mjs';
import {
  allocateBatch,assertBatchPlan,buildBatchPlan,buildDreamStageRequest,
  diagnoseSourceAnchors,dreamClimateCallsPerRun,dreamClimateCanonicalSnapshot,
  dreamClimateDefinitions,dreamClimateMaxCalls,dreamClimateNormalizationVersion,
  dreamClimateOrder,dreamClimatePromptHash,dreamClimatePromptSource,dreamClimateProtocolVersion,
  dreamClimateRequestByteLimit,dreamClimateRunCount,dreamClimateScenesPerRun,
  dreamClimateSource,dreamClimateSourceHash,dreamClimateSourceRefs,
  dreamClimateWeights,dreamMechanismOrder,foregroundAnchorOrder,
  normalizeDreamClimateScene,normalizeDreamClimateWake,selectClimate
} from '../scripts/nv-dream-climate-offline-01/protocol.mjs';
import {
  assertFixtureDeclarations,dreamClimateFixtureCases,
  dreamClimateFixtureDisclaimer
} from '../scripts/nv-dream-climate-offline-01/fixtures.mjs';
import {
  dreamClimateIdentity,verifyDreamClimateIdentity
} from '../scripts/nv-dream-climate-offline-01/identity.mjs';
import {
  renderHumanReceipt,runOfflineCheck,runOfflineRehearsal
} from '../scripts/nv-dream-climate-offline-01/offline-check.mjs';

const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const packageDirectory=path.join(root,'scripts','nv-dream-climate-offline-01');

function normalizeCase(fixture){
  let before=neutral();
  const scenes=[];
  for(const raw of fixture.scenes) {
    const value=normalizeDreamClimateScene(raw,before);
    scenes.push(value);before=value.after;
  }
  const wake=normalizeDreamClimateWake(fixture.wake,{previousScenes:scenes});
  return {scenes,wake};
}

test('climate roll boundaries are fixed and invalid rolls fail closed',()=>{
  const cases=[
    [0,'ordinary'],[.649999,'ordinary'],[.65,'uneasy'],
    [.949999,'uneasy'],[.95,'nightmare'],[.999999,'nightmare']
  ];
  for(const [roll,expected] of cases)assert.equal(selectClimate(roll),expected);
  for(const roll of [-.0001,1,NaN,Infinity,-Infinity,'0.5',null,undefined]) {
    assert.throws(()=>selectClimate(roll),/invalid_dream_climate_roll/);
  }
});

test('batch plans keep mechanisms and foreground anchors unique with cumulative ledgers',()=>{
  const plans=allocateBatch(['ordinary','uneasy','nightmare']);
  assert.deepEqual(plans.map(plan=>plan.mechanism),[...dreamMechanismOrder]);
  assert.deepEqual(plans.map(plan=>plan.foregroundAnchor),[...foregroundAnchorOrder]);
  assert.deepEqual(plans.map(plan=>plan.usedMechanisms),[[],['transformation'],['transformation','spatial_dislocation']]);
  assert.deepEqual(plans.map(plan=>plan.usedForegroundAnchors),[[],['cup_tap'],['cup_tap','rain_street']]);
  assertBatchPlan(plans);
  assert.throws(()=>allocateBatch(['ordinary','uneasy','nightmare','ordinary']),/invalid_dream_climate_batch_size/);
  assert.throws(()=>buildBatchPlan([
    {climate:'ordinary',mechanism:'transformation',foregroundAnchor:'cup_tap'},
    {climate:'uneasy',mechanism:'transformation',foregroundAnchor:'rain_street'}
  ]),/dream_climate_mechanism_reused/);
  assert.throws(()=>buildBatchPlan([
    {climate:'ordinary',mechanism:'transformation',foregroundAnchor:'cup_tap'},
    {climate:'uneasy',mechanism:'spatial_dislocation',foregroundAnchor:'cup_tap'}
  ]),/dream_climate_anchor_reused/);
  const tampered=plans.map(plan=>({...plan}));tampered[1].usedForegroundAnchors=[];
  assert.throws(()=>assertBatchPlan(tampered),/invalid_dream_climate_batch_plan/);
});

test('all three runs construct twelve bounded requests with fixed climate and inert user ledgers',()=>{
  const requests=[],materials=[];
  for(const fixture of dreamClimateFixtureCases) {
    let previousScenes=[],before=neutral();
    const systems=[];
    for(const [index,raw] of fixture.scenes.entries()) {
      const request=buildDreamStageRequest({run:fixture.run,previousScenes,stage:'scene'});
      const material=JSON.parse(request.body.messages[1].content);
      requests.push(request);materials.push(material);systems.push(request.body.messages[0].content);
      assert.equal(request.offlineOnly,true);
      assert.equal(request.endpoint,'offline://dream-climate-fixture-only');
      assert.equal(material.stage,'scene');assert.equal(material.sceneIndex,index);
      assert.equal(material.climate,fixture.run.climate);
      assert.equal(material.mechanism,fixture.run.mechanism);
      assert.equal(material.foregroundAnchor,fixture.run.foregroundAnchor);
      assert.deepEqual(material.usedForegroundAnchors,[...fixture.run.usedForegroundAnchors]);
      assert.deepEqual(material.usedMechanisms,[...fixture.run.usedMechanisms]);
      assert.deepEqual(material.previousScenes.length,index);
      assert.deepEqual(material.previousAffect,before);
      assert.equal(material.batchConstraintNote.includes('batch-local creative constraints'),true);
      assert.equal(material.batchConstraintNote.includes('not long-term memory'),true);
      assert.equal(material.sources.length,1);
      assert.deepEqual({id:material.sources[0].id,version:material.sources[0].version},
        {id:dreamClimateSource.id,version:dreamClimateSource.version});
      assert.equal(material.sources[0].text,dreamClimateSource.text);
      assert.equal(request.body.messages[0].content.includes(dreamClimateSource.text),false);
      assert.equal(foregroundAnchorOrder.some(id=>request.body.messages[0].content.includes(id)),false);
      assert.equal(request.body.messages[0].content.includes('usedForegroundAnchors'),false);
      assert.ok(Buffer.byteLength(JSON.stringify(request.body))<=dreamClimateRequestByteLimit);
      const scene=normalizeDreamClimateScene(raw,before);
      previousScenes.push(scene);before=scene.after;
    }
    const wakeRequest=buildDreamStageRequest({run:fixture.run,previousScenes,stage:'wake'});
    const wakeMaterial=JSON.parse(wakeRequest.body.messages[1].content);
    requests.push(wakeRequest);materials.push(wakeMaterial);
    assert.equal(wakeMaterial.stage,'wake');assert.equal(wakeMaterial.sceneIndex,3);
    assert.equal(wakeMaterial.previousScenes.length,3);
    assert.equal(wakeMaterial.climate,fixture.run.climate);
    assert.equal(wakeMaterial.sources[0].text,dreamClimateSource.text);
    assert.equal(new Set(systems).size,1);
  }
  assert.equal(requests.length,dreamClimateMaxCalls);
  assert.deepEqual(materials.map(value=>value.stage),
    ['scene','scene','scene','wake','scene','scene','scene','wake','scene','scene','scene','wake']);
  assert.deepEqual(materials.map(value=>value.sceneIndex),[0,1,2,3,0,1,2,3,0,1,2,3]);
  for(const stage of ['scene','wake']) {
    const systems=requests.filter((request,index)=>materials[index].stage===stage)
      .map(request=>request.body.messages[0].content);
    assert.equal(new Set(systems).size,1);
  }
  const system=dreamClimatePromptSource.sceneSystem;
  assert.equal(system.includes('JSON shape example'),false);
  assert.equal(system.includes('goalEffect:0'),false);
  const quote=String.fromCharCode(34);
  assert.equal(system.includes(`${quote}kind${quote}:${quote}unchanged${quote}`),false);
  assert.equal(dreamClimatePromptSource.wakeSystem.includes(`${quote}firstFeeling${quote}:{${quote}status${quote}:${quote}uncertain${quote}}`),false);
  assert.equal(dreamClimatePromptSource.wakeSystem.includes('four equally valid forms'),true);
  assert.equal(system.includes('Produce only the current scene'),true);
  assert.equal(system.includes('run mechanism must be perceptibly embodied'),true);
  assert.equal(system.includes('Other source anchors may remain background facts'),true);
});

test('run climate is frozen and cannot drift across scene or wake material',()=>{
  const run=dreamClimateFixtureCases[0].run;
  assert.equal(Object.isFrozen(run),true);
  assert.throws(()=>{run.climate='nightmare';},TypeError);
  const {scenes,wake}=normalizeCase(dreamClimateFixtureCases[0]);
  const sceneRequest=buildDreamStageRequest({run,previousScenes:scenes.slice(0,2),stage:'scene'});
  const wakeRequest=buildDreamStageRequest({run,previousScenes:scenes,stage:'wake'});
  assert.equal(JSON.parse(sceneRequest.body.messages[1].content).climate,'ordinary');
  assert.equal(JSON.parse(wakeRequest.body.messages[1].content).climate,'ordinary');
  assert.equal(wake.wake.fragmentBasis.sceneIndex,2);
});

test('fixtures are explicitly fictional and author-declare changes, transformation and repeats',()=>{
  assertFixtureDeclarations();
  assert.equal(dreamClimateFixtureCases.length,3);
  for(const fixture of dreamClimateFixtureCases) {
    assert.equal(fixture.fixtureKind,'fictional_fixture_not_model_output');
    assert.equal(fixture.disclaimer,dreamClimateFixtureDisclaimer);
    assert.equal(fixture.scenes.length,3);
    assert.notEqual(fixture.scenes[0].event,fixture.scenes[1].event);
    assert.notEqual(fixture.scenes[1].event,fixture.scenes[2].event);
    assert.ok(fixture.declared.scene1Change.length>0);
    assert.ok(fixture.declared.scene2Change.length>0);
    assert.ok(fixture.declared.transformation.sceneIndex>=0);
    assert.ok(fixture.declared.transformation.sceneIndex<3);
    assert.ok(fixture.declared.repeatedImagery.length>0);
    const {scenes,wake}=normalizeCase(fixture);
    assert.equal(wake.wake.fragmentBasis.kind,'scene_excerpt');
    assert.ok(scenes[wake.wake.fragmentBasis.sceneIndex].event.includes(wake.wake.fragment));
  }
});

test('wake preserves four independent firstFeeling states and rejects extra fields',()=>{
  const {scenes}=normalizeCase(dreamClimateFixtureCases[0]);
  const base={fragment:'桌上却留下一小片白屑',associations:[],residue:.1};
  const omitted=normalizeDreamClimateWake(base,{previousScenes:scenes});
  assert.equal(omitted.firstFeelingOmitted,true);assert.equal(omitted.firstFeeling,null);
  const present=normalizeDreamClimateWake({...base,firstFeeling:{status:'present',text:'醒来时只记得桌面很亮。'}},{previousScenes:scenes});
  assert.deepEqual(present.firstFeeling,{status:'present',text:'醒来时只记得桌面很亮。'});
  const absent=normalizeDreamClimateWake({...base,firstFeeling:{status:'absent'}},{previousScenes:scenes});
  assert.deepEqual(absent.firstFeeling,{status:'absent'});
  const uncertain=normalizeDreamClimateWake({...base,firstFeeling:{status:'uncertain'}},{previousScenes:scenes});
  assert.deepEqual(uncertain.firstFeeling,{status:'uncertain'});
  assert.throws(()=>normalizeDreamClimateWake({...base,firstFeeling:{status:'absent',text:'x'}},{previousScenes:scenes}),
    /invalid_generated_wake_first_feeling/);
  assert.throws(()=>normalizeDreamClimateWake({...base,extra:true},{previousScenes:scenes}),
    /invalid_generated_wake_response/);
  assert.throws(()=>normalizeDreamClimateWake({...base,fragment:'不存在的逐字片段'},{previousScenes:scenes}),
    /generated_wake_fragment_not_grounded/);
  assert.throws(()=>normalizeDreamClimateScene({...dreamClimateFixtureCases[0].scenes[0],extra:true},neutral()),
    /invalid_generated_wake_scene/);
});

test('source-anchor diagnostics are reproducible lexical counts, never semantic judgments',()=>{
  const diagnostic=diagnoseSourceAnchors(['雨停后走过小街','杯沿','车票日期']);
  assert.equal(diagnostic.method,'literal_term_occurrence');
  assert.equal(diagnostic.semanticJudgment,false);
  assert.equal(diagnostic.overlappingTermsCountedSeparately,true);
  assert.equal(diagnostic.anchors.rain_street.terms['雨停'],1);
  assert.equal(diagnostic.anchors.rain_street.terms['小街'],1);
  assert.equal(diagnostic.anchors.rain_street.terms['雨'],1);
  assert.equal(diagnostic.anchors.cup_tap.terms['杯'],1);
  assert.equal(diagnostic.anchors.cup_tap.terms['杯沿'],1);
  assert.equal(diagnostic.anchors.ticket_date.terms['车票'],1);
  assert.equal(diagnostic.anchors.ticket_date.terms['日期'],1);
  assert.deepEqual(diagnoseSourceAnchors(['雨停后走过小街','杯沿','车票日期']),diagnostic);
  for(const fixture of dreamClimateFixtureCases) {
    const {scenes}=normalizeCase(fixture);
    const value=diagnoseSourceAnchors(scenes.map(scene=>scene.event));
    assert.ok(value.anchors[fixture.run.foregroundAnchor].total>0);
    assert.equal(value.semanticJudgment,false);
  }
});

test('new identity covers every execution file and fails on file-set or content drift',t=>{
  const identity=dreamClimateIdentity();
  assert.equal(identity.protocolVersion,dreamClimateProtocolVersion);
  assert.equal(identity.normalizationVersion,dreamClimateNormalizationVersion);
  assert.equal(identity.sourceHash,dreamClimateSourceHash);
  assert.equal(identity.promptHash,dreamClimatePromptHash);
  assert.equal(identity.identityHash,dreamClimateIdentity().identityHash);
  assert.equal(identity.oldPaidCoreInventoryFiles>0,true);
  assert.equal(dreamClimateCanonicalSnapshot.sources[0].grant.modelEgress,false);
  assert.deepEqual(Object.keys(dreamClimateWeights),[ 'ordinary','uneasy','nightmare' ]);
  assert.deepEqual(Object.keys(dreamClimateDefinitions),[...dreamClimateOrder]);
  const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'nv-dream-climate-identity-'));
  t.after(()=>fs.rmSync(temporary,{recursive:true,force:true}));
  fs.cpSync(packageDirectory,temporary,{recursive:true});
  assert.equal(verifyDreamClimateIdentity({root,directory:temporary}).identityHash,identity.identityHash);
  fs.writeFileSync(path.join(temporary,'unexpected.mjs'),'export const hidden=true;\n');
  assert.throws(()=>verifyDreamClimateIdentity({root,directory:temporary}),
    /dream_climate_execution_file_set_changed/);
});

test('offline checker completes three full fictional reads with zero credentials, network or Store',()=>{
  const result=spawnSync(process.execPath,
    ['scripts/nv-dream-climate-offline-01/offline-check.mjs'],
    {cwd:root,encoding:'utf8',timeout:30000,
      env:{...process.env,NIGHTVOYAGE_DEEPSEEK_KEY:'DUMMY-SENTINEL-MUST-NOT-APPEAR'}});
  assert.equal(result.status,0,result.stderr);
  assert.equal(result.stderr,'');
  assert.equal(result.stdout.includes('DUMMY-SENTINEL-MUST-NOT-APPEAR'),false);
  const receipt=JSON.parse(result.stdout);
  assert.equal(receipt.status,'READY_FOR_HUMAN_OFFLINE_REVIEW');
  assert.equal(receipt.requestCapture.count,dreamClimateMaxCalls);
  assert.equal(receipt.requestCapture.requests.length,dreamClimateMaxCalls);
  assert.equal(receipt.cases.length,dreamClimateRunCount);
  assert.ok(receipt.cases.every(value=>value.scenes.length===dreamClimateScenesPerRun));
  assert.deepEqual(receipt.cases.map(value=>value.wake.firstFeelingStatus),['present','absent','omitted']);
  assert.ok(receipt.requestCapture.requests.every(value=>value.sourceExact&&
    value.systemContainsSourceText===false&&value.systemContainsAnchorId===false&&
    value.systemContainsUsedLedger===false&&value.bytes<=dreamClimateRequestByteLimit));
  assert.equal(receipt.requestCapture.requests.filter(value=>value.stage==='wake').every(value=>value.previousSceneCount===3),true);
  assert.equal(receipt.boundaries.credentialReads,0);
  assert.equal(receipt.boundaries.networkAttempts,0);
  assert.equal(receipt.boundaries.realModelRequests,0);
  assert.equal(receipt.boundaries.ownerLockCreated,false);
  assert.equal(receipt.boundaries.storeOpened,false);
  assert.equal(receipt.boundaries.automaticRetries,0);
  assert.equal(receipt.boundaries.fourthRunStarted,false);
  assert.equal(receipt.boundaries.memoryMindIntegration,false);
  const markdown=renderHumanReceipt(receipt);
  for(const value of receipt.cases) {
    assert.ok(markdown.includes(value.disclaimer));
    for(const scene of value.scenes)assert.ok(markdown.includes(scene.event));
  }
  assert.ok(markdown.includes('Fixture 作者声明'));
  assert.ok(markdown.includes('结构测试证明'));
  assert.ok(markdown.includes('不能冒充语义重复判定'));
});

test('old rich live and inline paid entries still refuse before credentials, Store or network',async t=>{
  const parent=fs.mkdtempSync(path.join(os.tmpdir(),'nv-dream-climate-old-entry-'));
  t.after(()=>fs.rmSync(parent,{recursive:true,force:true}));
  const storePath=path.join(parent,'ordinary-store');
  let supplierCalls=0,fetchCalls=0;
  const nativeFetch=globalThis.fetch;
  globalThis.fetch=()=>{fetchCalls++;throw Error('network_forbidden');};
  try{
    const rich=launchRichSampleLive(storePath,{credentialSupplier:()=>{supplierCalls++;return 'SENTINEL';}});
    assert.equal(rich.status,'refused');
    assert.equal(rich.reason,'rich_sample_phase_b_release_required');
    assert.equal(rich.credentialSupplierCalls,0);
    let paidError;
    try{await launchInlinePaid('preflight',storePath,{credentialSupplier:()=>{supplierCalls++;return 'SENTINEL';}});}
    catch(error){paidError=error.message;}
    assert.equal(paidError,'inline_paid_entry_refused');
  }finally{globalThis.fetch=nativeFetch;}
  assert.equal(supplierCalls,0);assert.equal(fetchCalls,0);
  assert.equal(fs.existsSync(storePath),false);
  assert.equal(fs.existsSync(path.join(storePath,'owner.lock')),false);
});

test('new package exposes no live/provider/transport module or forceClimate entry',()=>{
  const names=fs.readdirSync(packageDirectory).filter(name=>name.endsWith('.mjs'));
  assert.equal(names.some(name=>/(live|provider|transport|worker|credential)/i.test(name)),false);
  const source=names.map(name=>fs.readFileSync(path.join(packageDirectory,name),'utf8')).join('\n');
  assert.equal(source.includes('forceClimate'),false);
  assert.equal(source.includes('NIGHTVOYAGE_DEEPSEEK_KEY'),false);
  assert.equal(source.includes('owner.lock'),false);
  assert.equal(/from\s+[']node:(?:http|https|net|tls|dns)[']/.test(source),false);
  assert.equal(/\b(?:fetch|spawn|execFile)\s*\(/.test(source),false);
  assert.equal(source.includes('Math.random'),false);
});
