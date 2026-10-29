// Fixed three-case offline rehearsal. It constructs request material in memory,
// uses prewritten fictional fixtures and provides no provider or dispatch path.
import assert from 'node:assert/strict';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {neutral} from '../../src/contract.js';
import {
  assertBatchPlan,buildDreamStageRequest,diagnoseSourceAnchors,
  dreamClimateCallsPerRun,
  dreamClimateMaxCalls,dreamClimateNormalizationVersion,
  dreamClimateOrder,dreamClimatePromptHash,dreamClimatePromptVersion,
  dreamClimateProtocolVersion,dreamClimateRequestByteLimit,
  dreamClimateRunCount,dreamClimateRuntimeVersion,
  dreamClimateScenesPerRun,dreamClimateSource,dreamClimateSourceHash,
  dreamClimateSourceRefs,dreamClimateWeights,
  normalizeDreamClimateScene,normalizeDreamClimateWake,
  foregroundAnchorOrder
} from './protocol.mjs';
import {
  assertFixtureDeclarations,dreamClimateFixtureCases,
  dreamClimateFixtureDisclaimer
} from './fixtures.mjs';
import {dreamClimateIdentity} from './identity.mjs';

export const offlineCheckVersion='nv-dream-climate-offline-check-v1';
const systemHash=value=>createHash('sha256').update(value,'utf8').digest('hex');
const bodyHash=value=>createHash('sha256').update(JSON.stringify(value),'utf8').digest('hex');
const copy=value=>structuredClone(value);

function capturedRequest(caseId,request){
  const material=JSON.parse(request.body.messages[1].content);
  const system=request.body.messages[0].content;
  return {
    caseId,stage:material.stage,sceneIndex:material.sceneIndex,
    bytes:Buffer.byteLength(JSON.stringify(request.body)),
    bodyHash:bodyHash(request.body),systemHash:systemHash(system),
    climate:material.climate,mechanism:material.mechanism,
    foregroundAnchor:material.foregroundAnchor,
    usedForegroundAnchors:copy(material.usedForegroundAnchors),
    usedMechanisms:copy(material.usedMechanisms),
    previousSceneCount:material.previousScenes.length,
    sourceExact:material.sources.length===1&&
      material.sources[0].id===dreamClimateSource.id&&
      material.sources[0].version===dreamClimateSource.version&&
      material.sources[0].text===dreamClimateSource.text,
    systemContainsSourceText:system.includes(dreamClimateSource.text),
    systemContainsAnchorId:foregroundAnchorOrder.some(id=>system.includes(id)),
    systemContainsUsedLedger:system.includes('usedForegroundAnchors')
  };
}

function sceneRecord(scene,index){
  return {
    index,event:scene.event,appraisal:copy(scene.appraisal),
    before:copy(scene.before),delta:copy(scene.delta),after:copy(scene.after),
    evidence:copy(scene.appraisalBasis.evidence),
    affectDeclaration:copy(scene.affectDeclaration),
    normalizationAudit:copy(scene.normalizationAudit),
    unbasedAppraisalAudit:copy(scene.unbasedAppraisalAudit),
    protocolVersion:scene.appraisalBasis.protocolVersion
  };
}

export function runOfflineRehearsal(){
  assertFixtureDeclarations();
  const identity=dreamClimateIdentity(),plans=dreamClimateFixtureCases.map(fixture=>fixture.run);
  assertBatchPlan(plans);
  const requests=[],cases=[];
  for(const fixture of dreamClimateFixtureCases) {
    let before=neutral();
    const previousScenes=[];
    for(const [index,raw] of fixture.scenes.entries()) {
      const request=buildDreamStageRequest({run:fixture.run,previousScenes,stage:'scene'});
      const captured=capturedRequest(fixture.id,request);
      assert.equal(captured.sceneIndex,index);
      assert.equal(captured.previousSceneCount,index);
      assert.equal(captured.climate,fixture.run.climate);
      assert.equal(captured.mechanism,fixture.run.mechanism);
      assert.equal(captured.foregroundAnchor,fixture.run.foregroundAnchor);
      assert.equal(captured.sourceExact,true);
      assert.equal(captured.systemContainsSourceText,false);
      assert.equal(captured.systemContainsAnchorId,false);
      assert.equal(captured.systemContainsUsedLedger,false);
      requests.push(captured);
      const scene=normalizeDreamClimateScene(raw,before,{sceneIndex:index,
        requestId:`offline-check-${fixture.id}-scene-${index}`});
      previousScenes.push(scene);
      before=scene.after;
    }
    const wakeRequest=buildDreamStageRequest({
      run:fixture.run,previousScenes,stage:'wake'
    });
    const wakeCapture=capturedRequest(fixture.id,wakeRequest);
    assert.equal(wakeCapture.sceneIndex,dreamClimateScenesPerRun);
    assert.equal(wakeCapture.previousSceneCount,dreamClimateScenesPerRun);
    assert.equal(wakeCapture.climate,fixture.run.climate);
    assert.equal(wakeCapture.sourceExact,true);
    requests.push(wakeCapture);
    const normalizedWake=normalizeDreamClimateWake(fixture.wake,{previousScenes});
    const fragmentIndex=previousScenes.findIndex(scene=>scene.event.includes(normalizedWake.wake.fragment));
    assert.ok(fragmentIndex>=0);
    assert.equal(normalizedWake.wake.fragmentBasis.sceneIndex,fragmentIndex);
    const diagnostics=diagnoseSourceAnchors(previousScenes.map(scene=>scene.event));
    assert.equal(diagnostics.semanticJudgment,false);
    assert.ok(diagnostics.anchors[fixture.run.foregroundAnchor].total>0);
    cases.push({
      id:fixture.id,fixtureKind:fixture.fixtureKind,disclaimer:fixture.disclaimer,
      climate:fixture.run.climate,mechanism:fixture.run.mechanism,
      foregroundAnchor:fixture.run.foregroundAnchor,
      usedForegroundAnchors:[...fixture.run.usedForegroundAnchors],
      usedMechanisms:[...fixture.run.usedMechanisms],
      scenes:previousScenes.map(sceneRecord),
      wake:{
        fragment:normalizedWake.wake.fragment,
        fragmentBasis:copy(normalizedWake.wake.fragmentBasis),
        associations:copy(normalizedWake.wake.associations),
        residue:normalizedWake.wake.residue,
        firstFeeling:copy(normalizedWake.firstFeeling),
        firstFeelingOmitted:normalizedWake.firstFeelingOmitted,
        firstFeelingStatus:normalizedWake.firstFeelingOmitted?'omitted':normalizedWake.firstFeeling.status
      },
      fixtureDeclaration:copy(fixture.declared),
      anchorDiagnostics:diagnostics,
      provenance:{
        intervalChangesAndTransformation:'fixture_author_declaration_not_semantic_validation',
        appraisalAndAffectEvidence:'literal_same_scene_excerpt_validation_only',
        reachedSceneTextQuality:'not_assessed',climateQuality:'not_assessed'
      }
    });
  }
  assert.equal(requests.length,dreamClimateMaxCalls);
  assert.deepEqual(requests.map(request=>request.stage),
    ['scene','scene','scene','wake','scene','scene','scene','wake','scene','scene','scene','wake']);
  assert.deepEqual(requests.map(request=>request.sceneIndex),
    [0,1,2,3,0,1,2,3,0,1,2,3]);
  for(const stage of ['scene','wake']) {
    const hashes=requests.filter(request=>request.stage===stage).map(request=>request.systemHash);
    assert.equal(new Set(hashes).size,1);
  }
  assert.ok(requests.every(request=>request.bytes<=dreamClimateRequestByteLimit));
  assert.deepEqual(cases.map(value=>value.wake.firstFeelingStatus),['present','absent','omitted']);
  assert.deepEqual(cases.map(value=>value.climate),[...dreamClimateOrder]);
  return {
    schemaVersion:1,command:'node scripts/nv-dream-climate-offline-01/offline-check.mjs',
    status:'READY_FOR_HUMAN_OFFLINE_REVIEW',node:process.version,platform:process.platform,
    offlineCheckVersion,identity,
    protocol:{version:dreamClimateProtocolVersion,runtimeVersion:dreamClimateRuntimeVersion,
      promptVersion:dreamClimatePromptVersion,normalizationVersion:dreamClimateNormalizationVersion,
      promptHash:dreamClimatePromptHash,requestByteLimit:dreamClimateRequestByteLimit},
    source:{...copy(dreamClimateSource),sha256:dreamClimateSourceHash,refs:copy(dreamClimateSourceRefs)},
    climateContract:{order:[...dreamClimateOrder],weights:copy(dreamClimateWeights)},
    batch:{runCount:dreamClimateRunCount,calls:dreamClimateMaxCalls,scenesPerRun:dreamClimateScenesPerRun,
      callsPerRun:dreamClimateCallsPerRun,status:'COMPLETE_SYNTHETIC_ONLY'},
    requestCapture:{count:requests.length,requests},
    cases,
    boundaries:{
      fictionalFixturesOnly:true,fixtureNotModelOutput:true,realUserStoreAccessed:false,
      credentialReads:0,networkAttempts:0,realModelRequests:0,paidCalls:0,costMicroCny:0,
      ownerLockCreated:false,storeOpened:false,automaticRetries:0,fourthRunStarted:false,
      laterRecollectionsEmpty:true,qualityAssessed:false,semanticSupport:'not_assessed',
      memoryMindIntegration:false,liveDispatchAvailable:false
    }
  };
}

export function runOfflineCheck(){
  const nativeFetch=globalThis.fetch,environment=process.env;
  let networkAttempts=0,credentialReads=0;
  globalThis.fetch=()=>{networkAttempts++;throw Error('network_forbidden');};
  process.env=new Proxy(environment,{get(target,key){
    if(typeof key==='string'&&/(KEY|TOKEN|SECRET|CREDENTIAL)/i.test(key))credentialReads++;
    return Reflect.get(target,key);
  }});
  try{
    const receipt=runOfflineRehearsal();
    receipt.boundaries.credentialReads=credentialReads;
    receipt.boundaries.networkAttempts=networkAttempts;
    return receipt;
  }finally{
    process.env=environment;globalThis.fetch=nativeFetch;
  }
}

function feelingText(wake){
  if(wake.firstFeelingOmitted)return 'omitted（未记录）';
  if(wake.firstFeeling.status==='present')return `present：${wake.firstFeeling.text}`;
  if(wake.firstFeeling.status==='absent')return 'absent（明确记为无）';
  return 'uncertain（明确记录为说不清）';
}

export function renderHumanReceipt(receipt){
  assert.equal(receipt?.status,'READY_FOR_HUMAN_OFFLINE_REVIEW');
  const lines=[
    '# NV-DREAM-CLIMATE-OFFLINE-01 · 三场 fake 阅读回执',
    '',
    '状态：`READY_FOR_HUMAN_OFFLINE_REVIEW`',
    '',
    `声明：所有叙事均为 **${dreamClimateFixtureDisclaimer}**。它们不是模型作品、真实梦境、现实人物材料或主观体验。`,
    '',
    '## 批内约束',
    '',
    `- climate 权重：${JSON.stringify(receipt.climateContract.weights)}`,
    `- protocol / prompt / source：${receipt.protocol.version} / ${receipt.protocol.promptVersion} / ${receipt.source.sha256}`,
    `- source inventory identity：${receipt.identity.identityHash}`,
    `- run / call：${receipt.batch.runCount} / ${receipt.batch.calls}`,
    `- 请求字节上限：${receipt.protocol.requestByteLimit}`,
    ''
  ];
  for(const value of receipt.cases) {
    lines.push(
      `## Case ${value.id} — ${value.climate} / ${value.mechanism} / ${value.foregroundAnchor}`,
      '',
      `- fixture：${value.disclaimer}`,
      `- usedForegroundAnchors：${JSON.stringify(value.usedForegroundAnchors)}`,
      `- usedMechanisms：${JSON.stringify(value.usedMechanisms)}`,
      '',
      '### Fixture 作者声明',
      '',
      `- scene/0 建立：${value.fixtureDeclaration.scene0Establishes}`,
      `- scene/1 改变：${value.fixtureDeclaration.scene1Change}`,
      `- scene/2 改变：${value.fixtureDeclaration.scene2Change}`,
      `- 梦内变形：第 ${value.fixtureDeclaration.transformation.sceneIndex+1} 幕，${value.fixtureDeclaration.transformation.kind} — ${value.fixtureDeclaration.transformation.description}`,
      `- 实际仍重复的主意象（作者声明）：${value.fixtureDeclaration.repeatedImagery.join('、')}`,
      '',
      '### 三幕原文与同幕证据',
      ''
    );
    for(const scene of value.scenes) {
      lines.push(
        `#### 幕 ${scene.index+1}`,
        '',
        `原文：${scene.event}`,
        '',
        `appraisal：${JSON.stringify(scene.appraisal)}`,
        `basis/evidence：${JSON.stringify(scene.evidence)}`,
        `affect：${JSON.stringify(scene.affectDeclaration)}${scene.affectDeclaration.kind==='estimated'?` / delta ${JSON.stringify(scene.delta)}`:' / delta {valence:0,arousal:0}'}`,
        `before → after：${JSON.stringify(scene.before)} → ${JSON.stringify(scene.after)}`,
        `normalization：${scene.protocolVersion}`,
        ''
      );
    }
    lines.push(
      '### Wake',
      '',
      `fragment：${value.wake.fragment}`,
      `逐字来源：第 ${value.wake.fragmentBasis.sceneIndex+1} 幕；结构校验通过，但不是语义质量判定。`,
      `associations：${JSON.stringify(value.wake.associations)}`,
      `simulated residue：${value.wake.residue}（独立模拟估计，不是刚醒心情或持久情绪）`,
      `firstFeeling：${feelingText(value.wake)}`,
      '',
      '### 词面诊断',
      '',
      `方法：${value.anchorDiagnostics.method}；semanticJudgment=${value.anchorDiagnostics.semanticJudgment}`,
      `逐组计数：${JSON.stringify(value.anchorDiagnostics.anchors)}`,
      '这些计数只可复现词面命中；重叠词分别计数，不能冒充语义重复判定。',
      '',
      '### 声明与证明分界',
      '',
      '- fixture 作者声明：幕间变化、梦内变形、实际重复意象与三幕阅读判断。',
      '- 结构测试证明：三幕形状、同幕逐字 evidence、wake fragment 逐字来源、四态 firstFeeling、批内 mechanism/anchor 唯一、12 个请求与 source 逐字一致。',
      '- 未证明：文本质量、气候是否被模型正确执行、变化是否足够好、appraisal 是否语义成立、真实模型效果。',
      ''
    );
  }
  lines.push(
    '## 边界',
    '',
    `- credentialReads=${receipt.boundaries.credentialReads}；networkAttempts=${receipt.boundaries.networkAttempts}；realModelRequests=${receipt.boundaries.realModelRequests}`,
    `- paidCalls=${receipt.boundaries.paidCalls}；costMicroCny=${receipt.boundaries.costMicroCny}；ownerLockCreated=${receipt.boundaries.ownerLockCreated}`,
    `- realUserStoreAccessed=${receipt.boundaries.realUserStoreAccessed}；storeOpened=${receipt.boundaries.storeOpened}`,
    `- automaticRetries=${receipt.boundaries.automaticRetries}；fourthRunStarted=${receipt.boundaries.fourthRunStarted}`,
    `- laterRecollectionsEmpty=${receipt.boundaries.laterRecollectionsEmpty}；memoryMindIntegration=${receipt.boundaries.memoryMindIntegration}`,
    '- 不构成真实模型质量、现实主观感受、正式 Memory/Mind、ready、合并或部署的证明。'
  );
  return lines.join('\n');
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2);
  if(args.length===0)console.log(JSON.stringify(runOfflineCheck(),null,2));
  else if(args.length===1&&args[0]==='--markdown')console.log(renderHumanReceipt(runOfflineCheck()));
  else{
    console.error('Usage: node scripts/nv-dream-climate-offline-01/offline-check.mjs [--markdown]');
    process.exitCode=1;
  }
}
