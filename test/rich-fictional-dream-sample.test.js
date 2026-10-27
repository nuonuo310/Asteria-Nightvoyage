import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {hash} from '../src/contract.js';
import {verifyRichSampleIdentity} from '../scripts/nv-rich-fictional-dream-sample-01/identity.mjs';
import {launchRichSampleLive} from '../scripts/nv-rich-fictional-dream-sample-01/live-launcher.mjs';
import {offlineSampleFirstFeelings,offlineSampleSceneEvents} from '../scripts/nv-rich-fictional-dream-sample-01/offline-sample.mjs';
import {
  assertRequestBounds,assertRichSamplePriceSnapshot,buildRichSampleRequest,
  richSampleAllowanceId,richSampleCanonicalSnapshot,richSampleFixedSnapshot,
  richSampleMaxCalls,richSampleMaxOutputTokens,richSamplePriceSnapshot,
  richSampleRequestByteLimit,richSampleRunIds,richSampleScenesPerRun,
  richSampleSource,richSampleSourceRefs
} from '../scripts/nv-rich-fictional-dream-sample-01/protocol.mjs';
import {extractRichSampleReceipt} from '../scripts/nv-rich-fictional-dream-sample-01/records.mjs';
import {readRichSampleReceiptDirectory} from '../scripts/nv-rich-fictional-dream-sample-01/receipt.mjs';
import {RichDreamSampleRuntime} from '../scripts/nv-rich-fictional-dream-sample-01/runtime.mjs';

const at=Date.parse('2026-10-27T12:00:00Z');
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const packageDirectory=path.join(root,'scripts','nv-rich-fictional-dream-sample-01');

function directory(t){
  const value=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-rich-dream-sample-test-'));
  t.after(()=>fs.rmSync(value,{recursive:true,force:true}));
  return value;
}
function http(data){
  return {status:200,body:{model:'deepseek-flash',choices:[{finish_reason:'stop',
    message:{role:'assistant',content:JSON.stringify(data)}}],
    usage:{prompt_tokens:900,completion_tokens:80,total_tokens:980}}};
}
function sceneData(runOrdinal,index,events=offlineSampleSceneEvents){
  return {event:events[runOrdinal]?.[index]??`Fake scene ${runOrdinal}/${index}`,
    appraisal:{goalEffect:0,control:.5,uncertainty:.5},
    basis:{goal:null,control:null,uncertainty:null},affect:{kind:'unchanged'}};
}
function simulator(capture,{feelings=offlineSampleFirstFeelings,wakeMutator}={}){
  return request=>{
    const index=capture.length,runOrdinal=Math.floor(index/4);
    capture.push(structuredClone(request));
    const material=JSON.parse(request.body.messages[1].content);
    if(material.stage==='scene')return http(sceneData(runOrdinal,material.sceneIndex));
    const data={fragment:material.previousScenes[2].event,associations:[],
      residue:.1,firstFeeling:structuredClone(feelings[runOrdinal]??feelings[0])};
    if(wakeMutator)wakeMutator(data,{runOrdinal,material,index});
    return http(data);
  };
}
function setup(t,{simulatorFactory=simulator,fault,now=()=>at}={}){
  const dir=directory(t),capture=[];
  const engine=new RichDreamSampleRuntime(dir,{simulator:simulatorFactory(capture),enabled:true,now,fault});
  t.after(()=>{try{engine.close();}catch{}});
  return {dir,capture,engine};
}
function sourceExact(material){
  return material?.sources?.length===1&&material.sources[0].id===richSampleSource.id&&
    material.sources[0].version===richSampleSource.version&&material.sources[0].text===richSampleSource.text;
}

test('three fixed runs capture twelve real requests and publish three managed dreams',async t=>{
  const {dir,capture,engine}=setup(t),batch=engine.startBatch();
  assert.equal(batch.runIds.length,3);assert.equal(new Set(batch.runIds).size,3);
  assert.equal(new Set(batch.requestIds).size,3);assert.equal(new Set(batch.sessionIds).size,3);
  const status=await engine.executeBatch(),receipt=extractRichSampleReceipt(engine.store,{now:at});
  assert.equal(capture.length,richSampleMaxCalls);
  assert.ok(status.runs.every(run=>run.status==='completed'&&run.scenesSaved===richSampleScenesPerRun));
  assert.deepEqual(capture.map(request=>JSON.parse(request.body.messages[1].content).stage),
    ['scene','scene','scene','wake','scene','scene','scene','wake','scene','scene','scene','wake']);
  assert.deepEqual(capture.map(request=>JSON.parse(request.body.messages[1].content).sceneIndex),
    [0,1,2,3,0,1,2,3,0,1,2,3]);
  const materials=capture.map(request=>JSON.parse(request.body.messages[1].content));
  assert.ok(materials.every(sourceExact));
  for(let run=0;run<3;run++){
    for(let index=0;index<4;index++){
      const material=materials[run*4+index];
      assert.equal(material.previousScenes.length,index);
      const expected=index===0?{valence:0,arousal:.2}:material.previousScenes.at(-1).after;
      assert.deepEqual(material.previousAffect,expected);
    }
  }
  for(let index=0;index<4;index++){
    const systems=[0,1,2].map(run=>capture[run*4+index].body.messages[0].content);
    assert.equal(new Set(systems).size,1);
  }
  assert.ok(capture.every(request=>request.body.model==='deepseek-flash'&&request.body.max_tokens===400&&
    request.body.stream===false&&request.body.thinking.type==='disabled'&&
    request.body.response_format.type==='json_object'&&
    Buffer.byteLength(JSON.stringify(request.body))<=richSampleRequestByteLimit));
  assert.equal(receipt.status,'READY_FOR_MANUAL_REVIEW');assert.equal(receipt.runs.length,3);
  assert.deepEqual(receipt.runs.map(run=>run.firstFeeling.status),['present','absent','uncertain']);
  assert.equal(receipt.runs[0].firstFeeling.text,offlineSampleFirstFeelings[0].text);
  assert.equal(Object.hasOwn(receipt.runs[0].firstFeeling,'textBasis'),true);
  for(const run of receipt.runs){
    assert.equal(run.scenes.length,3);assert.equal(run.billing.calls,4);
    assert.deepEqual(run.billing.rows.map(row=>row.stage),['scene','scene','scene','wake']);
    assert.ok(run.billing.rows.every(row=>row.status==='settled'&&row.sourceRefs.length===1&&
      row.sourceRefs[0].id===richSampleSource.id&&row.sourceRefs[0].version===richSampleSource.version));
    assert.equal(run.wake.residue.label,'simulated_estimate');
    assert.equal(run.wake.residue.currentStrength,run.wake.residue.baseStrength);
    assert.ok(run.scenes.every((scene,index)=>scene.index===index&&scene.evidence&&scene.before&&scene.delta&&scene.after));
  }
  assert.equal(JSON.stringify(receipt).includes('deepseek'),false);
  assert.equal(receipt.boundaries.laterRecollectionsEmpty,true);
  assert.equal(receipt.boundaries.qualityAssessed,false);
  const before=fs.readFileSync(path.join(dir,'state.json'));
  extractRichSampleReceipt(engine.store,{now:at});
  assert.deepEqual(fs.readFileSync(path.join(dir,'state.json')),before);
  assert.equal(Object.keys(engine.store.state.entries).length,6);
  assert.equal(Object.values(engine.store.state.entries).filter(entry=>entry.origin==='dream').length,3);
});

for(const mode of ['present','absent','uncertain','omitted']){
  test(`firstFeeling ${mode} is preserved without a fallback mapping`,async t=>{
    const feeling=mode==='present'?{status:'present',text:'Fake waking text.'}:{status:mode};
    const {capture,engine}=setup(t,{simulatorFactory:capture=>simulator(capture,{
      feelings:[feeling,feeling,feeling],
      wakeMutator:(data,{runOrdinal})=>{if(mode==='omitted')delete data.firstFeeling;}
    })});
    engine.startBatch();await engine.executeBatch();
    assert.equal(capture.length,12);
    const receipt=extractRichSampleReceipt(engine.store,{now:at});
    assert.ok(receipt.runs.every(run=>run.status==='completed'));
    if(mode==='omitted')assert.ok(receipt.runs.every(run=>run.firstFeeling.status==='omitted'));
    else assert.ok(receipt.runs.every(run=>run.firstFeeling.status===mode));
    if(mode==='absent'||mode==='uncertain')assert.ok(receipt.runs.every(run=>!Object.hasOwn(run.firstFeeling,'text')));
  });
}

test('an invalid firstFeeling fails only that run without retry, replacement or fabricated receipt',async t=>{
  const {capture,engine}=setup(t,{simulatorFactory:capture=>simulator(capture,{
    wakeMutator:(data,{runOrdinal})=>{
      if(runOrdinal===0)data.firstFeeling={status:'absent',text:'forbidden'};
    }
  })});
  engine.startBatch();
  const first=await engine.executeBatch();
  assert.equal(capture.length,12);assert.deepEqual(first.runs.map(run=>run.status),['failed','completed','completed']);
  assert.equal(first.runs[0].error,'invalid_wake');
  const second=await engine.executeBatch();
  assert.equal(capture.length,12);assert.deepEqual(second.runs.map(run=>run.status),['failed','completed','completed']);
  assert.throws(()=>engine.resumeRun(richSampleRunIds[0]),/rich_sample_resume_requires_committed_prefix/);
  assert.equal(engine.batch().runIds.length,3);
  assert.equal(engine.rows(richSampleRunIds[0]).filter(row=>row.status==='unknown').length,1);
  assert.equal(Object.values(engine.store.state.entries).filter(entry=>entry.runId===richSampleRunIds[0]).length,0);
});

test('cancellation suppresses a late body and the next run starts with an isolated prefix',async t=>{
  let release,started;
  const firstStarted=new Promise(resolve=>{started=resolve;});
  const capture=[];
  const base=simulator(capture);
  const delayed=request=>{
    if(capture.length===0){
      capture.push(structuredClone(request));
      return new Promise(resolve=>{release=()=>resolve(http(sceneData(0,0)));started();});
    }
    return base(request);
  };
  const engine=new RichDreamSampleRuntime(directory(t),{simulator:delayed,enabled:true,now:()=>at});
  t.after(()=>{try{engine.close();}catch{}});
  engine.startBatch();
  const pending=engine.executeRun(richSampleRunIds[0]);
  await firstStarted;
  engine.cancel(richSampleRunIds[0]);
  release();
  const cancelled=await pending;
  assert.equal(cancelled.status,'cancelled');assert.equal(cancelled.scenesSaved,0);
  assert.equal(engine.rows(richSampleRunIds[0])[0].status,'unknown');
  assert.throws(()=>engine.resumeRun(richSampleRunIds[0]),/rich_sample_resume_requires_committed_prefix/);
  const second=await engine.executeRun(richSampleRunIds[1]);
  assert.equal(second.status,'completed');
  const secondFirst=JSON.parse(capture[1].body.messages[1].content);
  assert.equal(secondFirst.previousScenes.length,0);assert.ok(sourceExact(secondFirst));
  assert.ok(engine.rows(richSampleRunIds[1]).every(row=>row.runId===richSampleRunIds[1]));
  assert.equal(engine.run(richSampleRunIds[0]).scenes.length,0);
});

test('only an explicit clean committed prefix can be resumed',async t=>{
  let faultOnce=true;
  const {capture,engine}=setup(t,{fault:label=>{
    if(faultOnce&&label==='rich_sample_scene_saved'){faultOnce=false;throw Error('simulated_crash');}
  }});
  engine.startBatch();
  const stopped=await engine.executeRun(richSampleRunIds[0]);
  assert.equal(stopped.status,'uncertain');assert.equal(stopped.scenesSaved,1);
  assert.equal(engine.rows(richSampleRunIds[0]).length,1);
  assert.equal(engine.rows(richSampleRunIds[0])[0].status,'settled');
  const resumed=await engine.resumeRun(richSampleRunIds[0]);
  assert.equal(resumed.status,'completed');assert.equal(capture.length,4);
  assert.deepEqual(capture.map(request=>JSON.parse(request.body.messages[1].content).sceneIndex),[0,1,2,3]);
  const receipt=extractRichSampleReceipt(engine.store,{now:at});
  assert.equal(receipt.runs[0].scenes.length,3);assert.equal(receipt.runs[0].billing.calls,4);
  assert.equal(receipt.runs[0].scenes[0].event,offlineSampleSceneEvents[0][0]);
});

test('the ledger rejects a thirteenth call and a fourth run after the fixed twelve-call batch',async t=>{
  const {engine}=setup(t);
  engine.startBatch();await engine.executeBatch();
  const reservation={requestId:'nv-rich-sample-thirteenth',runId:'nv-rich-sample-fourth-run',
    fingerprint:hash({extra:'thirteenth'}),sourceRefs:[...richSampleSourceRefs],maxOutputTokens:400};
  assert.throws(()=>engine.ledger.reserve(richSampleAllowanceId,reservation,at),/allowance_exhausted/);
  assert.equal(engine.ledger.status(richSampleAllowanceId).calls,richSampleMaxCalls);
  assert.equal(engine.ledger.status(richSampleAllowanceId).runs,3);
});

test('a later recollection is rejected instead of being silently read as generated residue',async t=>{
  const {engine}=setup(t);
  engine.startBatch();await engine.executeBatch();
  const dream=Object.values(engine.store.state.entries).find(entry=>entry.origin==='dream');
  engine.store.state.entries['tampered-later-recollection']={schemaVersion:1,
    id:'tampered-later-recollection',runId:dream.runId,materialKind:'fictional',
    origin:'recollection',isRealityFact:false,sourceRefs:dream.sourceRefs,
    derivedFrom:[dream.id],text:'A later thought must not be generated now.'};
  engine.store.save();
  assert.throws(()=>extractRichSampleReceipt(engine.store,{now:at}),/rich_sample_later_recollection_not_empty/);
});

test('request, price, source and inventory drift all fail closed',t=>{
  const oversized={body:{model:'deepseek-flash',max_tokens:400,stream:false,
    thinking:{type:'disabled'},response_format:{type:'json_object'},
    messages:[{role:'user',content:'x'.repeat(richSampleRequestByteLimit+1)}]}};
  assert.throws(()=>assertRequestBounds(oversized),/rich_sample_request_too_large/);
  assert.throws(()=>assertRichSamplePriceSnapshot({...richSamplePriceSnapshot,
    inputMicroCnyPerMillion:1}),/rich_sample_price_snapshot_mismatch/);
  const changedSource=richSampleFixedSnapshot();changedSource.sources[0].text+=' drift';
  assert.throws(()=>buildRichSampleRequest({snapshot:changedSource,scenes:[],stage:'scene',index:0}),
    /rich_sample_fixed_source_required/);
  const copy=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-rich-dream-sample-identity-'));
  t.after(()=>fs.rmSync(copy,{recursive:true,force:true}));
  fs.cpSync(packageDirectory,copy,{recursive:true});
  fs.appendFileSync(path.join(copy,'runtime.mjs'),'\n// inventory drift\n');
  assert.throws(()=>verifyRichSampleIdentity({packageDirectory:copy,repositoryRoot:root}),
    /rich_sample_execution_file_changed/);
  const extraCopy=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-rich-dream-sample-extra-'));
  t.after(()=>fs.rmSync(extraCopy,{recursive:true,force:true}));
  fs.cpSync(packageDirectory,extraCopy,{recursive:true});
  fs.writeFileSync(path.join(extraCopy,'unlisted.mjs'),'export const hidden = true;\n');
  assert.throws(()=>verifyRichSampleIdentity({packageDirectory:extraCopy,repositoryRoot:root}),
    /invalid_rich_sample_identity_manifest/);
});

test('a non-dedicated Store is refused before it can be created',t=>{
  const parent=directory(t),wrong=path.join(parent,'ordinary-store');
  assert.throws(()=>new RichDreamSampleRuntime(wrong,{simulator:()=>{throw Error('unused');},enabled:true,now:()=>at}),
    /rich_sample_dedicated_store_required/);
  assert.equal(fs.existsSync(wrong),false);
});

test('Phase A live and receipt entries refuse before Store, credential or network access',t=>{
  const parent=directory(t),storePath=path.join(parent,'live-dream-store');
  let supplierCalls=0,fetchCalls=0;
  const nativeFetch=globalThis.fetch;
  globalThis.fetch=()=>{fetchCalls++;throw Error('network_forbidden');};
  try{
    const result=launchRichSampleLive(storePath,{credentialSupplier:()=>{supplierCalls++;return 'SENTINEL';}});
    assert.equal(result.status,'refused');assert.equal(result.reason,'rich_sample_phase_b_release_required');
    assert.equal(result.credentialSupplierCalls,0);assert.equal(result.networkAttempts,0);
    const receipt=readRichSampleReceiptDirectory(storePath);
    assert.equal(receipt.status,'refused');assert.equal(receipt.reason,'rich_sample_phase_b_release_required');
    assert.equal(supplierCalls,0);assert.equal(fetchCalls,0);
    assert.equal(fs.existsSync(storePath),false);
    assert.equal(fs.existsSync(path.join(storePath,'owner.lock')),false);
  }finally{globalThis.fetch=nativeFetch;}
});

test('fixed offline checker completes twelve fake calls without reading a sentinel key or network',()=>{
  const result=spawnSync(process.execPath,
    ['scripts/nv-rich-fictional-dream-sample-01/offline-check.mjs'],
    {cwd:root,encoding:'utf8',timeout:30000,
      env:{...process.env,NIGHTVOYAGE_DEEPSEEK_KEY:'DUMMY-SENTINEL-MUST-NOT-APPEAR'}});
  assert.equal(result.status,0,result.stderr);assert.equal(result.stderr,'');
  assert.equal(result.stdout.includes('DUMMY-SENTINEL-MUST-NOT-APPEAR'),false);
  const receipt=JSON.parse(result.stdout);
  assert.equal(receipt.status,'COMPLETE_SYNTHETIC_ONLY');
  assert.equal(receipt.requestCapture.count,12);assert.equal(receipt.requestCapture.stages.length,12);
  assert.equal(receipt.runs.every(run=>run.billingCalls===4&&run.settledRows===4),true);
  assert.equal(receipt.boundaries.credentialReads,0);assert.equal(receipt.boundaries.networkAttempts,0);
  assert.equal(receipt.boundaries.realModelRequests,0);assert.equal(receipt.boundaries.automaticRetries,0);
});
