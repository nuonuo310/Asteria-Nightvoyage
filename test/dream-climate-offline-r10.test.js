import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Readable} from 'node:stream';
import {spawnSync} from 'node:child_process';
import {hash,neutral} from '../src/contract.js';
import {Store} from '../src/store.js';
import {createDummySimulator} from '../scripts/nv-dream-climate-offline-01/phase-b/dummy.mjs';
import {runLiveWorker} from '../scripts/nv-dream-climate-offline-01/phase-b/worker.mjs';
import {
  assertRequestBounds,buildDreamStageRequest,dreamClimateNormalizationVersion,
  dreamClimateSceneMaterial,normalizeDreamClimateCheckpoint,
  normalizeDreamClimateScene
} from '../scripts/nv-dream-climate-offline-01/protocol.mjs';
import {
  r10AllowanceCapMicroCny,r10CallsPerRun,r10ExecutionPin,r10MaxCalls,
  r10MaxOutputTokens,r10OfflineHead,r10OfflineIdentityHash,r10OfflineParent,
  r10OfflinePromptHash,r10OfflineSourceHash,r10OfflineTree,
  r10PerCallMaximumMicroCny,r10RequestByteLimit,r10RunId,r10ScenesPerRun,
  r10StoreBasename,r10StoreDirectory,r10WorstMicroCny
} from '../scripts/nv-dream-climate-offline-01/single-run-r10/config.mjs';
import {r10Matrix,r10MatrixHash} from '../scripts/nv-dream-climate-offline-01/single-run-r10/matrix.mjs';
import {
  readR10Release,r10ExpectedReleaseHash,r10ReleaseObject,validateR10Release
} from '../scripts/nv-dream-climate-offline-01/single-run-r10/release.mjs';
import {
  createR10IdentityManifest,r10PackageDirectory,r10SharedDirectory,
  validateR10IdentityManifest,verifyR10Identity
} from '../scripts/nv-dream-climate-offline-01/single-run-r10/identity.mjs';
import {r10PriceSnapshotHash} from '../scripts/nv-dream-climate-offline-01/single-run-r10/price.mjs';
import {verifyR10PriceEvidence} from '../scripts/nv-dream-climate-offline-01/single-run-r10/price-check.mjs';
import {runR10DummyRehearsal} from '../scripts/nv-dream-climate-offline-01/single-run-r10/dummy.mjs';
import {runR10Admission} from '../scripts/nv-dream-climate-offline-01/single-run-r10/check-admission.mjs';
import {runR10Worker} from '../scripts/nv-dream-climate-offline-01/single-run-r10/worker.mjs';
import {DreamClimateR10Runtime} from '../scripts/nv-dream-climate-offline-01/single-run-r10/runtime.mjs';
import {writeR10Receipt} from '../scripts/nv-dream-climate-offline-01/single-run-r10/receipt.mjs';
import {
  assertR10DirectoryAbsent,assertR10StorePath
} from '../scripts/nv-dream-climate-offline-01/single-run-r10/store-contract.mjs';
import {
  r8ReleaseObject,validateR8Release
} from '../scripts/nv-dream-climate-offline-01/single-run-r8/release.mjs';
import {verifyR8Identity} from '../scripts/nv-dream-climate-offline-01/single-run-r8/identity.mjs';
import {runR4Worker} from '../scripts/nv-dream-climate-offline-01/single-run-r4/worker.mjs';
import {runR6Admission} from '../scripts/nv-dream-climate-offline-01/single-run-r6/check-admission.mjs';

const officialPrice=path.join(process.env.USERPROFILE??'','Desktop','deepseek-pricing-r8.html');
const temporary=()=>fs.mkdtempSync(path.join(os.tmpdir(),'nv-dream-climate-r10-'));
const copy=value=>structuredClone(value);
const strictText=bytes=>new TextDecoder('utf-8',{fatal:true}).decode(bytes);
const receiptDocument=file=>JSON.parse(strictText(fs.readFileSync(file)));
const hashBytes=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const exactR8Object=Object.freeze({
  event:'\u68a6\u91cc\uff0c\u4e00\u4e2a\u4eba\u628a\u4e00\u53ea\u767d\u74f7\u676f\u6401\u5728\u7a97\u53f0\u4e0a\uff0c\u676f\u91cc\u5269\u4e00\u70b9\u6e29\u6c34\u3002\u96e8\u521a\u505c\uff0c\u8857\u9762\u6cdb\u7740\u7070\u767d\u7684\u5149\u3002\u53e6\u4e00\u4eba\u4f38\u624b\u7528\u6307\u8282\u5728\u676f\u6cbf\u4e0a\u8f7b\u6572\u4e24\u4e0b\uff0c\u58f0\u97f3\u5f88\u8584\uff0c\u676f\u58c1\u968f\u4e4b\u5fae\u5fae\u4e00\u98a4\u3002\u968f\u540e\u90a3\u4eba\u628a\u676f\u5b50\u5f80\u7a97\u53f0\u5185\u4fa7\u632a\u4e86\u632a\uff0c\u50cf\u662f\u8981\u628a\u8fd9\u573a\u5bf9\u8bdd\u7559\u5728\u90a3\u513f\uff0c\u5374\u6ca1\u8bf4\u4e0b\u6b21\u518d\u8bb2\u7684\u662f\u4ec0\u4e48\u4e8b\u3002',
  appraisal:Object.freeze({goalEffect:0,control:.5,uncertainty:.6}),
  basis:Object.freeze({goal:null,control:null,uncertainty:null}),
  affect:Object.freeze({kind:'unchanged'})
});
const auditContext=(sceneIndex,requestId)=>({sceneIndex,requestId});

function simpleRaw({event='A quiet cup rests on the sill.',control=.5,uncertainty=.5,
  controlBasis=null,uncertaintyBasis=null,goal=null,goalEffect=0}={}){
  return {event,appraisal:{goalEffect,control,uncertainty},
    basis:{goal,control:controlBasis,uncertainty:uncertaintyBasis},
    affect:{kind:'unchanged'}};
}

function runtimeFixture(t,{mutator}={}){
  const parent=temporary();
  t.after(()=>fs.rmSync(parent,{recursive:true,force:true}));
  const directory=path.join(parent,r10StoreBasename);
  const base=createDummySimulator();
  let calls=0;
  const simulator=async request=>{
    calls++;
    const material=JSON.parse(request.body.messages[1].content);
    const response=await base(request);
    if(mutator)mutator({material,response,call:calls});
    return response;
  };
  const runtime=new DreamClimateR10Runtime(directory,{enabled:true,simulator,
    now:()=>1700000000000});
  t.after(()=>{try{runtime.close();}catch{}});
  runtime.startBatch();
  return {runtime,directory,parent,calls:()=>calls};
}

function setScene0Exact({material,response}){
  if(material.stage!=='scene'||material.sceneIndex!==0)return;
  response.body.choices[0].message.content=JSON.stringify(exactR8Object);
}

function mutateScene0(mutate){
  return ({material,response})=>{
    if(material.stage!=='scene'||material.sceneIndex!==0)return;
    const data=JSON.parse(response.body.choices[0].message.content);
    mutate(data);
    response.body.choices[0].message.content=JSON.stringify(data);
  };
}

function mutateWake(mutate){
  return ({material,response})=>{
    if(material.stage!=='wake')return;
    const data=JSON.parse(response.body.choices[0].message.content);
    mutate(data);
    response.body.choices[0].message.content=JSON.stringify(data);
  };
}

test('R10 identity, matrix, release, price and first request are exact',()=>{
  const identity=verifyR10Identity(),manifest=createR10IdentityManifest();
  assert.equal(identity.executionDigest,r10ExecutionPin);
  assert.equal(identity.executionPin,r10ExecutionPin);
  assert.equal(identity.identityHash,'35eb75b67db3bfb5b05e820a8a8af67a5cae458b98eb07dc463fa384639a2f9a');
  assert.equal(identity.releaseHash,r10ExpectedReleaseHash);
  assert.equal(r10ExpectedReleaseHash,'9bb4d01e7fa0f4c717b92c6dbae689d86b1b2499134463ebdb721326bee90f76');
  assert.equal(identity.offlineIdentityHash,r10OfflineIdentityHash);
  assert.equal(identity.offlineIdentityHash,'153503232906afd729d78054cc199ee71a9ea6aca8ebfd7ddfb6ebe7283ac867');
  assert.equal(identity.executionFiles,19);
  assert.equal(identity.sharedExecutionFiles,10);
  assert.equal(manifest.offline.head,r10OfflineHead);
  assert.equal(manifest.offline.tree,r10OfflineTree);
  assert.equal(manifest.offline.parent,r10OfflineParent);
  assert.equal(manifest.offline.promptHash,r10OfflinePromptHash);
  assert.equal(manifest.offline.sourceHash,r10OfflineSourceHash);
  assert.equal(manifest.offline.executionFiles['protocol.mjs'],
    'eaa5e46cccfc1464a2eb35886a6b7bc1406094112281b6d9fc199c962a85b54a');
  assert.equal(manifest.executionContract.normalizationVersion,
    'nv-dream-climate-offline-normalization-v2');
  assert.equal(manifest.executionContract.transportVersion,
    'nv-dream-climate-single-run-r10-https-v1');
  assert.equal(manifest.executionContract.diagnosticVersion,
    'nv-dream-climate-single-run-r10-diagnostic-v1');
  assert.equal(manifest.executionContract.noRetry,true);
  assert.equal(manifest.executionContract.storeDirectory,r10StoreDirectory);
  assert.equal(manifest.sharedExecutionFiles['runtime.mjs']!==undefined,true);
  assert.equal(manifest.sharedExecutionFiles['records.mjs']!==undefined,true);
  assert.equal(manifest.sharedExecutionFiles['transport.mjs']!==undefined,true);
  assert.equal(manifest.sharedExecutionFiles['diagnostics.mjs']!==undefined,true);

  assert.equal(r10Matrix.length,1);
  assert.equal(r10Matrix[0].id,r10RunId);
  assert.equal(r10Matrix[0].plan.climate,'ordinary');
  assert.equal(r10Matrix[0].plan.mechanism,'transformation');
  assert.equal(r10Matrix[0].plan.foregroundAnchor,'cup_tap');
  assert.deepEqual(r10Matrix[0].plan.usedForegroundAnchors,[]);
  assert.deepEqual(r10Matrix[0].plan.usedMechanisms,[]);
  assert.equal(hash(r10Matrix),r10MatrixHash);

  assert.deepEqual(validateR10Release(r10ReleaseObject()),r10ReleaseObject());
  assert.equal(hash(r10ReleaseObject()),r10ExpectedReleaseHash);
  assert.equal(r10ReleaseObject().authorityCommit,
    '377de3adf45b61550bfbfcb90dae966bba869ca2');
  assert.equal(r10ReleaseObject().executionDigest,r10ExecutionPin);
  assert.equal(r10ReleaseObject().storeDirectory,r10StoreDirectory);
  assert.equal(r10ReleaseObject().noRetry,true);
  assert.equal(r10ReleaseObject().maxRuns,1);
  assert.equal(r10ReleaseObject().maxCalls,4);
  assert.equal(r10ReleaseObject().allowanceCapMicroCny,160000);

  const request=buildDreamStageRequest({run:r10Matrix[0].plan,previousScenes:[],stage:'scene'});
  assert.equal(assertRequestBounds(request),5538);
  assert.ok(assertRequestBounds(request)<r10RequestByteLimit);
  assert.equal(request.body.model,'deepseek-flash');
  assert.equal(request.body.max_tokens,400);
  assert.equal(request.body.stream,false);
  assert.equal(r10MaxOutputTokens,400);
  assert.equal(r10ScenesPerRun,3);
  assert.equal(r10CallsPerRun,4);
  assert.equal(r10MaxCalls,4);
  assert.equal(r10PerCallMaximumMicroCny,35968);
  assert.equal(r10PerCallMaximumMicroCny*r10MaxCalls,r10WorstMicroCny);
  assert.equal(r10WorstMicroCny,143872);
  assert.ok(r10WorstMicroCny<=r10AllowanceCapMicroCny);

  const price=verifyR10PriceEvidence(officialPrice);
  assert.equal(price.pageSha256,'556097caba8adfeeed6455714bffd731c7f60db520fcee06a922eba5840663a3');
  assert.equal(price.inputMicroCnyPerMillion,2000000);
  assert.equal(price.outputMicroCnyPerMillion,8000000);
  assert.equal(price.worstMicroCny,143872);
  assert.equal(r10PriceSnapshotHash,'c755ea8b5ca6e62d1c81899be0b1d1d884c03b2d6f02506caf20f624dd73ae3b');
});

test('R10 dummy completes one dream and closes retry, second-run, fifth-call and directory boundaries',async()=>{
  const value=await runR10DummyRehearsal();
  assert.equal(value.status,'R10_DUMMY_REHEARSAL_PASSED');
  assert.equal(value.ok,true);
  assert.equal(value.calls,4);
  assert.deepEqual(value.dispatches.map(item=>item.stage),['scene','scene','scene','wake']);
  assert.equal(value.receipt.completedRuns,1);
  assert.equal(value.receipt.runs[0].billing.rows.length,4);
  assert.ok(value.receipt.runs[0].billing.rows.every(row=>row.status==='settled'));
  assert.equal(value.receipt.runs[0].scenes.length,3);
  assert.equal(value.fifthCallRefused,true);
  assert.equal(value.secondRunRefused,true);
  assert.equal(value.restartRefused,true);
  assert.equal(value.storeContract.existingDirectoryRefused,true);
  assert.equal(value.storeContract.ownerLockObserved,true);
  assert.equal(value.storeContract.ownerLockCleared,true);
  assert.equal(value.storeContract.storeDeleted,true);
  assert.deepEqual(value.boundaries,{networkAttempts:0,realModelRequests:0,
    credentialReads:0,requestOutcomeKnown:true,realUserStoreAccessed:false,
    realStoreCreated:false,paidCalls:0,costMicroCny:0,automaticRetries:0,
    secondRunStarted:false,laterRecollectionsEmpty:true});
});

test('actual R10 runtime canonicalizes the exact R8 object and keeps the audit technical only',async t=>{
  const original=copy(exactR8Object);
  const fixture=runtimeFixture(t,{mutator:setScene0Exact});
  const status=await fixture.runtime.executeRun(r10RunId);
  assert.equal(status.status,'completed');
  assert.equal(fixture.calls(),4);
  assert.deepEqual(exactR8Object,original);

  const run=fixture.runtime.run(r10RunId),receipt=fixture.runtime.readReceipt();
  assert.equal(run.draftScenes.length,3);
  assert.equal(run.scenes.length,3);
  assert.equal(receipt.completedRuns,1);
  assert.equal(receipt.runs[0].scenes.length,3);
  const scene=run.scenes[0],checkpoint=run.draftScenes[0];
  const requestId=`${r10RunId}-scene-0`;
  for(const value of [scene,checkpoint,receipt.runs[0].scenes[0]]){
    assert.equal(value.event,exactR8Object.event);
    assert.deepEqual(value.appraisal,{goalEffect:0,control:.5,uncertainty:.5});
    assert.equal(value.appraisalBasis.evidence.controlExcerpt,null);
    assert.equal(value.appraisalBasis.evidence.uncertaintyExcerpt,null);
    assert.equal(value.appraisalBasis.protocolVersion,dreamClimateNormalizationVersion);
    assert.deepEqual(value.unbasedAppraisalAudit.items,[
      {dimension:'uncertainty',receivedValue:.6,canonicalValue:.5,
        rule:'unbased_requires_unknown'}
    ]);
    assert.equal(value.unbasedAppraisalAudit.sceneIndex,0);
    assert.equal(value.unbasedAppraisalAudit.requestId,requestId);
  }

  const entry=fixture.runtime.store.state.entries[run.entryId];
  assert.equal(entry.scenes.length,3);
  assert.equal(entry.scenes.every(value=>!Object.hasOwn(value,'unbasedAppraisalAudit')&&
    !Object.hasOwn(value,'normalizationAudit')),true);
  assert.equal(JSON.stringify(entry).includes('unbased_requires_unknown'),false);
  assert.equal(JSON.stringify(entry).includes('deepseek'),false);
  assert.equal(run.scenes.some(value=>value.event.includes(run.wake.fragment)),true);
  assert.equal(run.wake.fragmentBasis.kind,'scene_excerpt');
  assert.ok(['present','absent','uncertain'].includes(receipt.runs[0].firstFeeling.status));
  assert.equal(receipt.runs[0].wake.residue.label,'simulated_estimate');
  assert.deepEqual(fixture.runtime.store.state.recalls,{});
});

test('R10 normalization covers none, each and both audit dimensions and rejects tamper',()=>{
  const cases=[
    ['none',simpleRaw(),[]],
    ['control',simpleRaw({control:.4}),[
      {dimension:'control',receivedValue:.4,canonicalValue:.5,rule:'unbased_requires_unknown'}
    ]],
    ['uncertainty',simpleRaw({uncertainty:.7}),[
      {dimension:'uncertainty',receivedValue:.7,canonicalValue:.5,rule:'unbased_requires_unknown'}
    ]],
    ['both',simpleRaw({control:.2,uncertainty:.9}),[
      {dimension:'control',receivedValue:.2,canonicalValue:.5,rule:'unbased_requires_unknown'},
      {dimension:'uncertainty',receivedValue:.9,canonicalValue:.5,rule:'unbased_requires_unknown'}
    ]]
  ];
  for(const [name,raw,want] of cases){
    const scene=normalizeDreamClimateScene(raw,neutral(),auditContext(0,`r10-${name}`));
    assert.deepEqual(scene.unbasedAppraisalAudit.items,want,name);
    assert.equal(scene.event,raw.event,name);
    assert.equal(scene.appraisal.control,.5,name);
    assert.equal(scene.appraisal.uncertainty,.5,name);
    assert.equal(JSON.stringify(dreamClimateSceneMaterial(scene)).includes('unbased_requires_unknown'),
      false,name);
  }

  const before=neutral(),context=auditContext(0,'r10-checkpoint');
  const scene=normalizeDreamClimateScene(exactR8Object,before,context);
  assert.deepEqual(normalizeDreamClimateCheckpoint(scene,before,context),scene);
  const tamper=[
    ['received',value=>{value.unbasedAppraisalAudit.items[0].receivedValue=.7;}],
    ['canonical',value=>{value.unbasedAppraisalAudit.items[0].canonicalValue=.6;}],
    ['rule',value=>{value.unbasedAppraisalAudit.items[0].rule='model_estimate';}],
    ['dimension',value=>{value.unbasedAppraisalAudit.items[0].dimension='control';}],
    ['integrity',value=>{value.unbasedAppraisalAudit.integrityHash='0'.repeat(64);}],
    ['delete-item',value=>{value.unbasedAppraisalAudit.items=[];}],
    ['scene-index',value=>{value.unbasedAppraisalAudit.sceneIndex=1;}],
    ['request-id',value=>{value.unbasedAppraisalAudit.requestId='r10-other-request';}],
    ['delete-audit',value=>{delete value.unbasedAppraisalAudit;}]
  ];
  for(const [name,mutate] of tamper){
    const value=copy(scene);mutate(value);
    assert.throws(()=>normalizeDreamClimateCheckpoint(value,before,context),
      /invalid_dream_climate/,name);
  }
});

test('R10 invalid scene and wake material stops without publication or retry',async t=>{
  const sceneCases=[
    ['goal',data=>{data.appraisal.goalEffect=1;data.basis.goal=null;}],
    ['quote',data=>{data.basis.control='not present in this scene';}],
    ['affect',data=>{data.affect={kind:'estimated',delta:{valence:0,arousal:0},
      excerpt:'not present'};}]
  ];
  for(const [name,mutate] of sceneCases){
    await t.test(`scene-${name}`,async t=>{
      const fixture=runtimeFixture(t,{mutator:mutateScene0(mutate)});
      const status=await fixture.runtime.executeRun(r10RunId);
      assert.equal(status.status,'failed',name);
      assert.equal(fixture.calls(),1,name);
      assert.equal(status.billing.calls,1,name);
      assert.equal(status.billing.settled,1,name);
      assert.equal(status.billing.unknown,0,name);
      assert.equal(fixture.runtime.run(r10RunId).draftScenes.length,0,name);
      assert.equal(Object.keys(fixture.runtime.store.state.entries).length,0,name);
      await fixture.runtime.executeBatch();
      assert.equal(fixture.calls(),1,name);
    });
  }

  const wakeCases=[
    ['associations',data=>{data.associations=[{question:'object is invalid'}];}],
    ['firstFeeling',data=>{data.firstFeeling={status:'unknown'};}]
  ];
  for(const [name,mutate] of wakeCases){
    await t.test(`wake-${name}`,async t=>{
      const fixture=runtimeFixture(t,{mutator:mutateWake(mutate)});
      const status=await fixture.runtime.executeRun(r10RunId);
      assert.equal(status.status,'failed',name);
      assert.equal(fixture.calls(),4,name);
      const run=fixture.runtime.run(r10RunId);
      assert.equal(run.error,'invalid_wake',name);
      assert.equal(run.draftScenes.length,3,name);
      assert.equal(Object.keys(fixture.runtime.store.state.entries).length,0,name);
      const receipt=fixture.runtime.readReceipt();
      assert.equal(receipt.runs[0].publication.status,'not_published',name);
      assert.deepEqual(receipt.runs[0].billing.rows.map(row=>row.status),
        ['settled','settled','settled','settled'],name);
      await fixture.runtime.executeBatch();
      assert.equal(fixture.calls(),4,name);
    });
  }
});

test('R10 worker writes the technical audit in an exclusive UTF-8 receipt',async t=>{
  const parent=temporary();
  t.after(()=>fs.rmSync(parent,{recursive:true,force:true}));
  const releaseFile=path.join(parent,'release.json');
  fs.writeFileSync(releaseFile,JSON.stringify(r10ReleaseObject()),'utf8');
  const notices=[];
  const base=createDummySimulator();
  let calls=0;
  const createRuntime=(directory,options)=>new DreamClimateR10Runtime(directory,{
    ...options,simulator:async request=>{
      calls++;
      const material=JSON.parse(request.body.messages[1].content);
      const response=await base(request);
      if(material.stage==='scene'&&material.sceneIndex===0)
        response.body.choices[0].message.content=JSON.stringify(exactR8Object);
      return response;
    }});
  const value=await runR10Worker('run',{priceFile:officialPrice,releaseFile,
    syntheticStoreRoot:parent,
    credentialSource:Readable.from([Buffer.from(JSON.stringify({
      credential:'sk-DUMMY-R10-ONLY'}),'utf8')]),
    noticeStream:{write:value=>notices.push(String(value))},
    createRuntime});
  assert.equal(value.status,'SINGLE_RUN_READY_FOR_MANUAL_CONTENT_REVIEW');
  assert.equal(value.batchStatus,'SINGLE_RUN_COMPLETE');
  assert.equal(value.completedRuns,1);
  assert.equal(calls,4);
  assert.equal(value.credentialRequested,true);
  assert.equal(value.credentialDelivered,true);
  assert.equal(value.credentialPersisted,false);
  assert.equal(value.requestOutcomeKnown,true);
  assert.equal(value.automaticRetry,false);
  assert.equal(value.replacementRun,false);
  assert.equal(value.secondRun,false);
  assert.equal(value.releaseRevoked,true);
  assert.equal(value.receiptWritten,true);
  assert.equal(fs.existsSync(releaseFile),false);
  assert.equal(fs.existsSync(r10StoreDirectory),false);
  assert.equal(notices.length,1);
  const notice=JSON.parse(notices[0]);
  assert.equal(notice.type,'credential_required');
  assert.equal(notice.nextRequestBytes,5538);
  assert.equal(notice.nextReservationMicroCny,35968);
  assert.equal(notice.executionDigest,r10ExecutionPin);

  const bytes=fs.readFileSync(value.receiptFile);
  assert.equal(bytes[0]===0xEF&&bytes[1]===0xBB&&bytes[2]===0xBF,false);
  const document=receiptDocument(value.receiptFile);
  assert.equal(document.encoding,'UTF-8');
  assert.equal(document.materialKind,'fictional');
  assert.equal(document.isRealityFact,false);
  assert.equal(document.receipt.status,'completed');
  assert.equal(document.receipt.receipt.completedRuns,1);
  assert.equal(document.receipt.receipt.runs[0].scenes.length,3);
  const audit=document.receipt.receipt.runs[0].scenes[0].unbasedAppraisalAudit;
  assert.equal(audit.sceneIndex,0);
  assert.equal(audit.requestId,`${r10RunId}-scene-0`);
  assert.deepEqual(audit.items,[{dimension:'uncertainty',receivedValue:.6,
    canonicalValue:.5,rule:'unbased_requires_unknown'}]);
  assert.equal(document.receipt.receipt.runs[0].scenes[0].event,exactR8Object.event);
  assert.equal(JSON.stringify(document).includes('sk-DUMMY-R10-ONLY'),false);
  assert.equal(JSON.stringify(document).includes('Authorization'),false);

  const directory=path.join(parent,r10StoreBasename);
  const reader=new Store(directory);
  try{
    const entry=reader.state.entries[document.receipt.receipt.runs[0].dreamId];
    assert.equal(entry.scenes.every(scene=>!Object.hasOwn(scene,'unbasedAppraisalAudit')),true);
  }finally{reader.close();}

  const original=hashBytes(bytes);
  const second=writeR10Receipt(directory,document);
  assert.equal(second.written,false);
  assert.equal(second.error,'EEXIST');
  assert.equal(hashBytes(fs.readFileSync(value.receiptFile)),original);
});

test('R10 pin, identity, release and Store contracts reject drift and old approvals',t=>{
  const current=createR10IdentityManifest();
  assert.equal(current.executionDigest,r10ExecutionPin);
  assert.deepEqual(validateR10IdentityManifest(current,current),current);
  assert.throws(()=>validateR10IdentityManifest({...current,noRetry:false},current),
    /invalid_dream_climate_r10_identity_manifest|dream_climate_r10_execution_pin_mismatch/);
  assert.throws(()=>validateR10Release({...r10ReleaseObject(),
    executionDigest:'0'.repeat(64)}),/dream_climate_r10_release_mismatch/);
  assert.throws(()=>validateR10Release({...r8ReleaseObject(),profile:'nv-dream-climate-single-run-r10-v1'}),
    /dream_climate_r10_release/);
  assert.throws(()=>validateR8Release(r8ReleaseObject()),/dream_climate_r8_release_superseded/);
  assert.throws(()=>verifyR8Identity(),/dream_climate_r8_/);
  assert.notEqual(r10ExecutionPin,'ba7444d97ecbf21afab5d3e179db26505bbe0b9d52caee29fc4a2c0d8319ad00');

  const parent=temporary();t.after(()=>fs.rmSync(parent,{recursive:true,force:true}));
  const copied=path.join(parent,'package');
  fs.cpSync(r10PackageDirectory,copied,{recursive:true});
  fs.appendFileSync(path.join(copied,'worker.mjs'),'\n// synthetic synchronized drift\n','utf8');
  const drifted=createR10IdentityManifest({directory:copied,shared:r10SharedDirectory});
  assert.notEqual(drifted.executionDigest,r10ExecutionPin);
  assert.throws(()=>validateR10IdentityManifest(drifted,drifted),
    /dream_climate_r10_execution_pin_mismatch/);

  assert.equal(assertR10StorePath(),path.resolve(r10StoreDirectory));
  const existing=path.join(parent,r10StoreBasename);
  fs.mkdirSync(existing);
  assert.throws(()=>assertR10DirectoryAbsent(existing),/dream_climate_r10_store_already_exists/);
  assert.throws(()=>assertR10StorePath(path.join(parent,'other')),/dream_climate_r10_store_path_mismatch/);
});

test('R10 admission is credential-free and all older live entries stay closed',async()=>{
  const value=await runR10Admission(officialPrice);
  assert.equal(value.status,'R10_OFFLINE_ADMISSION_PASSED');
  assert.equal(value.ok,true);
  assert.equal(value.liveEntryClosed,false);
  assert.equal(value.secureInputReady,true);
  assert.equal(value.releasePresent,false);
  assert.equal(value.storeExists,false);
  assert.equal(value.realStoreCreated,false);
  assert.equal(value.credentialSupplierCalls,0);
  assert.equal(value.credentialRead,false);
  assert.equal(value.networkAttempts,0);
  assert.equal(value.realModelRequests,0);
  assert.equal(value.dummy.status,'R10_DUMMY_REHEARSAL_PASSED');
  assert.equal(value.dummy.calls,4);
  assert.equal(fs.existsSync(path.join(r10PackageDirectory,'release.json')),false);
  const source=fs.readFileSync(path.join(r10PackageDirectory,'secure-input.ps1'),'utf8');
  assert.equal((source.match(/Read-Host/g)??[]).length,1);
  for(const forbidden of ['$env:','Get-Clipboard','Get-ChildItem Env:','ConvertTo-SecureString'])
    assert.equal(source.includes(forbidden),false,forbidden);

  const r4=await runR4Worker('run',{priceFile:path.join(os.tmpdir(),'missing-pricing.html')});
  assert.equal(r4.reason,'OFFLINE_REVIEW_REQUIRED_R5');
  assert.equal(r4.credentialRequested,false);
  const live=await runLiveWorker('run');
  assert.equal(live.status,'blocked');
  assert.equal(live.credentialRequested,false);
  assert.equal(live.credentialSupplierCalls,0);
  const r6=await runR6Admission(officialPrice).then(()=>null,error=>error);
  assert.ok(r6,'R6 admission must remain closed after R9');
  assert.match(r6.message,/dream_climate_r6_/);
});

test('actual Windows PowerShell stops the R10 secure entry before a credential and rejects a pin mismatch',t=>{
  const entry=path.join(r10PackageDirectory,'secure-input.ps1');
  const args=file=>['-NonInteractive','-NoProfile','-ExecutionPolicy','Bypass','-File',file,
    '-PriceFile',officialPrice];
  const matched=spawnSync('powershell.exe',args(entry),
    {encoding:'utf8',input:'',timeout:120000});
  assert.equal(matched.status,1,matched.stderr);
  assert.match(matched.stdout,/Admission ready: R10_OFFLINE_ADMISSION_PASSED/);
  assert.match(matched.stdout,/Worker preflight ready: first request 5538 bytes, reservation 35968 micro-CNY/);
  assert.match(matched.stderr,/NonInteractive mode/);
  assert.equal(fs.existsSync(path.join(r10PackageDirectory,'release.json')),false);
  assert.equal(fs.existsSync(r10StoreDirectory),false);

  const copied=fs.mkdtempSync(path.join(path.dirname(r10PackageDirectory),
    'single-run-r10-entry-'));
  t.after(()=>fs.rmSync(copied,{recursive:true,force:true}));
  fs.cpSync(r10PackageDirectory,copied,{recursive:true});
  const pinFile=path.join(copied,'execution-pin.ps1');
  const pinText=fs.readFileSync(pinFile,'utf8');
  assert.ok(pinText.includes(r10ExecutionPin));
  fs.writeFileSync(pinFile,pinText.replace(r10ExecutionPin,'0'.repeat(64)),'utf8');
  const mismatch=spawnSync('powershell.exe',args(path.join(copied,'secure-input.ps1')),
    {encoding:'utf8',input:'',timeout:120000});
  assert.equal(mismatch.status,1,mismatch.stderr);
  assert.equal(mismatch.stdout.includes('Admission ready'),false);
  assert.equal(mismatch.stdout.includes('Worker preflight ready'),false);
  assert.match(mismatch.stderr,/execution_pin_mismatch/);
  assert.equal(fs.existsSync(path.join(copied,'release.json')),false);
  assert.equal(fs.existsSync(r10StoreDirectory),false);
});

test('actual Windows PowerShell preserves R10 UTF-8 capture and receipt bytes',t=>{
  const parent=temporary();t.after(()=>fs.rmSync(parent,{recursive:true,force:true}));
  const stub=path.join(r10PackageDirectory,'utf8-stub.mjs');
  const script=path.join(r10PackageDirectory,'utf8-roundtrip.ps1');
  const run=(mode,extra=[],outName=mode)=>{
    const out=path.join(parent,`${outName}.json`);
    const result=spawnSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',
      script,'-NodeStub',stub,'-OutFile',out,'-Mode',mode,...extra],
    {encoding:'buffer',timeout:60000});
    assert.equal(result.status,0,result.stderr?.toString('utf8'));
    return {out,document:JSON.parse(strictText(fs.readFileSync(out)))};
  };
  const receiptDir=path.join(parent,'receipt');
  fs.mkdirSync(receiptDir);
  const releaseFile=path.join(parent,'release.json');
  const ok=run('ok',['-ReceiptDir',receiptDir,'-ReleaseOut',releaseFile]);
  assert.equal(ok.document.nodeExitCode,0);
  assert.equal(ok.document.decodeError,null);
  assert.equal(ok.document.stderrExact,'');
  const payload='\u4e2d\u6587'+String.fromCharCode(34)+'\u5f15\u53f7'+
    String.fromCharCode(34)+'\u4e0e\u53cd\u659c\u6760\\\u548c\u6362\u884c\n'+
    '\u7b2c\u4e8c\u884c\r\n\u7b2c\u4e09\u884c\ud83d\ude00\ud83c\udf19\ud840\udc0b';
  assert.equal([...payload].length,26);
  const worker=JSON.parse(ok.document.stdoutExact);
  assert.equal(worker.type,'result');
  assert.equal(worker.value.payload,payload);
  const receiptBytes=fs.readFileSync(ok.document.receiptFile);
  assert.equal(receiptBytes[0]===0xEF&&receiptBytes[1]===0xBB&&receiptBytes[2]===0xBF,false);
  const receipt=receiptDocument(ok.document.receiptFile);
  assert.equal(receipt.receipt.payload,payload);
  assert.equal([...receipt.receipt.payload].length,26);
  assert.deepEqual(readR10Release(releaseFile),r10ReleaseObject());

  const empty=run('empty');
  assert.equal(empty.document.nodeExitCode,0);
  assert.equal(empty.document.stdoutExact,'');
  assert.equal(empty.document.stderrExact,'');
  const error=run('error');
  assert.equal(error.document.nodeExitCode,3);
  assert.equal(error.document.stdoutExact,'');
  assert.equal(error.document.stderrExact,'stderr:'+payload+'\n');
  const garbage=run('garbage');
  assert.equal(garbage.document.nodeExitCode,0);
  assert.equal(garbage.document.decodeError,'stdout_invalid_utf8');
  assert.equal(garbage.document.stdoutExact,null);

  const before=hashBytes(receiptBytes);
  const second=run('ok',['-ReceiptDir',receiptDir],'ok-second');
  assert.notEqual(second.document.nodeExitCode,0);
  assert.equal(hashBytes(fs.readFileSync(ok.document.receiptFile)),before);
});
