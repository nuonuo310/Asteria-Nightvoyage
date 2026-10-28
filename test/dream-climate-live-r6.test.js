import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {EventEmitter} from 'node:events';
import {Readable} from 'node:stream';
import {spawnSync} from 'node:child_process';
import {hash} from '../src/contract.js';
import {Store} from '../src/store.js';
import {
  r6AllowanceCapMicroCny,r6CallsPerRun,r6ExecutionPin,r6MaxCalls,
  r6MaxOutputTokens,r6PerCallMaximumMicroCny,r6RequestByteLimit,r6RunId,r6ScenesPerRun,
  r6StoreBasename,r6StoreDirectory,r6WorstMicroCny
} from '../scripts/nv-dream-climate-offline-01/single-run-r6/config.mjs';
import {r6Matrix,r6MatrixHash} from '../scripts/nv-dream-climate-offline-01/single-run-r6/matrix.mjs';
import {
  readR6Release,r6ExpectedReleaseHash,r6ReleaseObject,validateR6Release
} from '../scripts/nv-dream-climate-offline-01/single-run-r6/release.mjs';
import {
  createR6IdentityManifest,r6PackageDirectory,r6SharedDirectory,
  validateR6IdentityManifest,verifyR6Identity
} from '../scripts/nv-dream-climate-offline-01/single-run-r6/identity.mjs';
import {r6PriceSnapshotHash} from '../scripts/nv-dream-climate-offline-01/single-run-r6/price.mjs';
import {verifyR6PriceEvidence} from '../scripts/nv-dream-climate-offline-01/single-run-r6/price-check.mjs';
import {runR6DummyRehearsal} from '../scripts/nv-dream-climate-offline-01/single-run-r6/dummy.mjs';
import {runR6Admission} from '../scripts/nv-dream-climate-offline-01/single-run-r6/check-admission.mjs';
import {
  runR6Worker,staticR6Preflight
} from '../scripts/nv-dream-climate-offline-01/single-run-r6/worker.mjs';
import {DreamClimateR6Runtime} from '../scripts/nv-dream-climate-offline-01/single-run-r6/runtime.mjs';
import {writeR6Receipt} from '../scripts/nv-dream-climate-offline-01/single-run-r6/receipt.mjs';
import {assertR6DirectoryAbsent,assertR6StorePath} from '../scripts/nv-dream-climate-offline-01/single-run-r6/store-contract.mjs';
import {createDummySimulator} from '../scripts/nv-dream-climate-offline-01/phase-b/dummy.mjs';
import {
  createLiveDispatchTelemetry
} from '../scripts/nv-dream-climate-offline-01/phase-b/telemetry.mjs';
import {createDeepSeekTransport} from '../scripts/nv-dream-climate-offline-01/phase-b/transport.mjs';
import {assertBoundedDiagnostic} from '../scripts/nv-dream-climate-offline-01/phase-b/diagnostics.mjs';
import {assertRequestBounds,buildDreamStageRequest} from '../scripts/nv-dream-climate-offline-01/protocol.mjs';
import {runR4Worker} from '../scripts/nv-dream-climate-offline-01/single-run-r4/worker.mjs';
import {runLiveWorker} from '../scripts/nv-dream-climate-offline-01/phase-b/worker.mjs';

const officialPrice=path.join(process.env.USERPROFILE??'','Desktop','deepseek-pricing-r1.html');
const temporary=()=>fs.mkdtempSync(path.join(os.tmpdir(),'nv-dream-climate-r6-'));
const strictText=bytes=>new TextDecoder('utf-8',{fatal:true}).decode(bytes);
const receiptDocument=file=>JSON.parse(strictText(fs.readFileSync(file)));
const wakeData=response=>JSON.parse(response.body.choices[0].message.content);
const setWakeData=(response,data)=>{
  response.body.choices[0].message.content=JSON.stringify(data);
};

function syntheticRuntime(t,{mutator,fault,simulator}={}){
  const parent=temporary();
  t.after(()=>fs.rmSync(parent,{recursive:true,force:true}));
  const directory=path.join(parent,r6StoreBasename);
  const base=createDummySimulator();
  let calls=0;
  const selected=simulator??(async request=>{
    calls++;
    const response=await base(request);
    const material=JSON.parse(request.body.messages[1].content);
    if(mutator)mutator({request,material,response,stage:material.stage,call:calls});
    return response;
  });
  const runtime=new DreamClimateR6Runtime(directory,{enabled:true,simulator:selected,fault});
  t.after(()=>{try{runtime.close();}catch{}});
  runtime.startBatch();
  return {runtime,directory,parent,calls:()=>calls};
}

function wakeMutation(mutator){
  return ({stage,response})=>{
    if(stage!=='wake')return;
    const data=wakeData(response);mutator(data);setWakeData(response,data);
  };
}

function assertAccounting(billing){
  assert.equal(billing.settledChargeMicroCny,(BigInt(billing.settledChargeMicroCny)).toString());
  assert.equal(billing.unknownReservedMicroCny,(BigInt(billing.unknownReservedMicroCny)).toString());
  assert.equal(BigInt(billing.combinedAccountingMicroCny),
    BigInt(billing.settledChargeMicroCny)+BigInt(billing.unknownReservedMicroCny));
  assert.equal(billing.combinedIsProviderCharged,false);
}

function assertDraftScenes(run){
  assert.equal(run.draftSceneRecords.length,3);
  for(const [index,scene] of run.draftSceneRecords.entries()){
    assert.equal(scene.index,index);
    for(const name of ['event','appraisal','before','delta','after','appraisalBasis',
      'affectDeclaration'])assert.ok(scene[name]!==undefined,name);
  }
}

function workerSimulator({mutator}={}){
  const base=createDummySimulator();
  let calls=0;
  return {calls:()=>calls,createRuntime:(directory,options)=>
    new DreamClimateR6Runtime(directory,{...options,simulator:async request=>{
      calls++;
      const response=await base(request);
      const material=JSON.parse(request.body.messages[1].content);
      if(mutator)mutator({request,material,response,stage:material.stage,call:calls});
      return response;
    }})};
}

async function syntheticWorker(t,{mutator}={}){
  const parent=temporary();
  t.after(()=>fs.rmSync(parent,{recursive:true,force:true}));
  const releaseFile=path.join(parent,'release.json');
  fs.writeFileSync(releaseFile,JSON.stringify(r6ReleaseObject()),'utf8');
  const notices=[];
  const injected=workerSimulator({mutator});
  const value=await runR6Worker('run',{priceFile:officialPrice,releaseFile,
    syntheticStoreRoot:parent,
    credentialSource:Readable.from([Buffer.from(JSON.stringify({
      credential:'sk-DUMMY-R6-ONLY'}),'utf8')]),
    noticeStream:{write:value=>notices.push(String(value))},
    createRuntime:injected.createRuntime});
  const directory=path.join(parent,r6StoreBasename);
  return {value,parent,directory,releaseFile,notices,calls:injected.calls,
    receiptFile:path.join(directory,'receipt.json')};
}

test('R6 identity, matrix, release, price and request size are exact',()=>{
  const identity=verifyR6Identity();
  assert.equal(identity.executionDigest,r6ExecutionPin);
  assert.equal(identity.executionPin,r6ExecutionPin);
  assert.equal(identity.identityHash,'f6df1c3f2334cf0aa84bb818375e9e2129dadd155f7e0be1cc06ec5e066b2d6d');
  assert.equal(identity.releaseHash,'fbc473149d39fe917cbff0f47a851e5fce95c8baab78cf867f67b21e61998daa');
  assert.equal(identity.executionFiles,19);
  assert.equal(identity.sharedExecutionFiles,10);
  assert.equal(identity.runCount,1);
  assert.equal(identity.maxCalls,4);
  assert.equal(identity.allowanceCapMicroCny,160000);
  assert.equal(identity.priceSnapshotHash,r6PriceSnapshotHash);
  assert.equal(r6PerCallMaximumMicroCny,35968);
  assert.equal(r6PerCallMaximumMicroCny*r6MaxCalls,r6WorstMicroCny);
  assert.equal(r6WorstMicroCny,143872);
  assert.ok(r6WorstMicroCny<=r6AllowanceCapMicroCny);
  assert.equal(r6ScenesPerRun,3);
  assert.equal(r6CallsPerRun,4);
  assert.equal(r6MaxOutputTokens,400);
  assert.equal(r6RequestByteLimit,16384);

  assert.equal(r6Matrix.length,1);
  assert.equal(r6Matrix[0].id,r6RunId);
  assert.equal(r6Matrix[0].plan.climate,'ordinary');
  assert.equal(r6Matrix[0].plan.mechanism,'transformation');
  assert.equal(r6Matrix[0].plan.foregroundAnchor,'cup_tap');
  assert.deepEqual(r6Matrix[0].plan.usedForegroundAnchors,[]);
  assert.deepEqual(r6Matrix[0].plan.usedMechanisms,[]);
  assert.equal(hash(r6Matrix),r6MatrixHash);

  assert.deepEqual(validateR6Release(r6ReleaseObject()),r6ReleaseObject());
  assert.equal(hash(r6ReleaseObject()),r6ExpectedReleaseHash);
  assert.equal(r6ReleaseObject().executionDigest,r6ExecutionPin);
  assert.equal(r6ReleaseObject().storeDirectory,r6StoreDirectory);
  assert.equal(r6ReleaseObject().noRetry,true);
  assert.equal(r6ReleaseObject().maxRuns,1);
  assert.equal(r6ReleaseObject().maxCalls,4);
  assert.equal(r6ReleaseObject().allowanceCapMicroCny,160000);

  const request=buildDreamStageRequest({run:r6Matrix[0].plan,previousScenes:[],stage:'scene'});
  assert.equal(assertRequestBounds(request),4855);
  assert.equal(request.body.model,'deepseek-flash');
  assert.equal(request.body.max_tokens,400);
  assert.equal(request.body.stream,false);
  const price=verifyR6PriceEvidence(officialPrice);
  assert.equal(price.pageSha256,'556097caba8adfeeed6455714bffd731c7f60db520fcee06a922eba5840663a3');
  assert.equal(price.inputMicroCnyPerMillion,2000000);
  assert.equal(price.outputMicroCnyPerMillion,8000000);
  assert.equal(price.worstMicroCny,143872);
});

test('R6 dummy completes one dream in four calls and closes retry boundaries',async()=>{
  const value=await runR6DummyRehearsal();
  assert.equal(value.status,'R6_DUMMY_REHEARSAL_PASSED');
  assert.equal(value.ok,true);
  assert.equal(value.calls,4);
  assert.deepEqual(value.dispatches.map(item=>item.stage),['scene','scene','scene','wake']);
  assert.equal(value.receipt.completedRuns,1);
  assert.equal(value.receipt.runs[0].billing.rows.length,4);
  assert.ok(value.receipt.runs[0].billing.rows.every(row=>row.status==='settled'));
  assert.equal(value.receipt.runs[0].scenes.length,3);
  assert.equal(value.receipt.runs[0].firstFeeling.status,'present');
  assert.equal(value.receipt.laterRecollections.length,0);
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

test('R6 success accepts every firstFeeling form and one string association',async t=>{
  for(const status of ['present','absent','uncertain','omitted']){
    await t.test(status,async t=>{
      const value=syntheticRuntime(t,{mutator:wakeMutation(data=>{
        data.associations=['synthetic single association'];
        if(status==='omitted')delete data.firstFeeling;
        else if(status!=='present')data.firstFeeling={status};
      })});
      const batch=await value.runtime.executeBatch();
      assert.equal(batch.runs[0].status,'completed');
      const receipt=value.runtime.readReceipt(),run=receipt.runs[0];
      assert.equal(run.firstFeeling.status,status);
      assert.equal(run.wake.associations.length<=1,true);
      if(status!=='present')assert.equal(Object.hasOwn(run.firstFeeling,'text'),false);
      assert.equal(run.billing.rows.length,4);
      assert.ok(run.billing.rows.every(row=>row.status==='settled'));
      assert.equal(run.scenes.length,3);
      assert.equal(typeof run.dreamId,'string');
      assert.equal(value.calls(),4);
      assertAccounting(run.billing);
    });
  }
});

test('object associations are rejected while three drafts and settled usage remain',async t=>{
  const value=syntheticRuntime(t,{mutator:wakeMutation(data=>{
    data.associations=[{question:'synthetic object is invalid'}];
  })});
  const batch=await value.runtime.executeBatch();
  assert.equal(batch.runs[0].status,'failed');
  const receipt=value.runtime.readReceipt(),run=receipt.runs[0];
  assert.equal(run.error,'invalid_wake');
  assert.deepEqual(run.validation,{subreason:'associations',
    originalError:'invalid_generated_wake_associations'});
  assertDraftScenes(run);
  assert.deepEqual(run.publication,{status:'not_published',wakeRecorded:false,
    firstFeelingRecorded:false,residueCreated:false});
  assert.deepEqual(run.billing.rows.map(row=>row.status),['settled','settled','settled','settled']);
  assert.equal(run.billing.unknownReservedMicroCny,'0');
  assert.equal(Object.keys(value.runtime.store.state.entries).length,0);
  assert.equal(value.calls(),4);
  const calls=value.calls();
  await value.runtime.executeBatch();
  assert.equal(value.calls(),calls);
  await assert.rejects(()=>value.runtime.executeRun('nv-dream-climate-one-dream-r6-b'),/unknown_run/);
});

test('unknown usage and transport failure stay unknown without publication',async t=>{
  const cases=[
    ['missing usage',({stage,response})=>{if(stage==='wake')delete response.body.usage;}],
    ['transport failure',({stage})=>{if(stage==='wake')throw Error('provider_http_failure');}]
  ];
  for(const [name,mutator] of cases){
    await t.test(name,async t=>{
      const value=syntheticRuntime(t,{mutator});
      await value.runtime.executeBatch();
      const run=value.runtime.readReceipt().runs[0];
      assert.notEqual(run.status,'completed');
      assert.deepEqual(run.billing.rows.map(row=>row.status),
        ['settled','settled','settled','unknown']);
      assert.equal(run.billing.unknownReservedMicroCny,'35968');
      assert.equal(run.billing.rows.at(-1).settledChargeMicroCny,null);
      assert.equal(run.publication.status,'not_published');
      assertDraftScenes(run);
      assert.equal(Object.keys(value.runtime.store.state.entries).length,0);
      assert.equal(value.calls(),4);
      if(run.diagnostics.length){
        assert.equal(run.diagnostics[0].settlement,'unknown');
        assert.equal(assertBoundedDiagnostic(run.diagnostics[0]),true);
      }
      assertAccounting(run.billing);
    });
  }
});

test('publication failure keeps settled usage and no half dream',async t=>{
  const value=syntheticRuntime(t);
  const originalSave=value.runtime.store.save.bind(value.runtime.store);
  value.runtime.store.save=()=>{
    if(value.runtime.store.state.runs[r6RunId].status==='completed')
      throw Error('storage_io_failure');
    return originalSave();
  };
  const batch=await value.runtime.executeBatch();
  assert.equal(batch.runs[0].status,'failed');
  const run=value.runtime.readReceipt().runs[0];
  assert.ok(run.billing.rows.every(row=>row.status==='settled'));
  assert.equal(run.publication.status,'not_published');
  assertDraftScenes(run);
  assert.equal(Object.keys(value.runtime.store.state.entries).length,0);
  assert.equal(value.calls(),4);
  assert.equal(run.diagnostics[0].publication,'failed_not_published');
  assert.equal(run.diagnostics[0].settlement,'settled');
});

test('credential echo is rejected before diagnostics or publication',async t=>{
  const credential='sk-DUMMY-R6-ECHO';
  const telemetry=createLiveDispatchTelemetry();
  const base=createDummySimulator();
  let calls=0;
  const requestImpl=(url,options,callback)=>{
    calls++;
    const req=new EventEmitter();
    req.setTimeout=()=>{};req.destroy=()=>{};
    req.end=payload=>{
      const request={body:JSON.parse(payload.toString('utf8'))};
      Promise.resolve(base(request)).then(response=>{
        const echoed=structuredClone(response.body);
        if(calls===4)echoed.diagnosticEcho=credential;
        const res=new EventEmitter();
        res.statusCode=200;res.headers={'content-type':'application/json'};res.resume=()=>{};
        setImmediate(()=>{
          callback(res);
          res.emit('data',Buffer.from(JSON.stringify(echoed),'utf8'));
          res.emit('end');
        });
      });
    };
    return req;
  };
  const parent=temporary();t.after(()=>fs.rmSync(parent,{recursive:true,force:true}));
  const directory=path.join(parent,r6StoreBasename);
  const runtime=new DreamClimateR6Runtime(directory,{enabled:true,
    simulator:createDeepSeekTransport(credential,{requestImpl,telemetry})});
  t.after(()=>{try{runtime.close();}catch{}});
  runtime.startBatch();
  await runtime.executeBatch();
  assert.deepEqual(telemetry.snapshot(),{networkAttempts:4,realModelRequests:4,requestOutcomeKnown:true});
  assert.equal(calls,4);
  const run=runtime.readReceipt().runs[0];
  assert.deepEqual(run.billing.rows.map(row=>row.status),
    ['settled','settled','settled','unknown']);
  assert.equal(run.diagnostics[0].credentialEchoRejected,true);
  assert.equal(run.diagnostics[0].responseAvailable,false);
  assert.equal(JSON.stringify(run.diagnostics).includes(credential),false);
  runtime.close();
  const disk=fs.readFileSync(path.join(directory,'state.json'),'utf8');
  assert.equal(disk.includes(credential),false);
  assert.equal(disk.includes('Authorization'),false);
  assert.equal(Object.keys(runtime.store.state.entries).length,0);
});

test('execution pin and identity drift reject old or regenerated approvals',t=>{
  const current=createR6IdentityManifest();
  assert.equal(current.executionDigest,r6ExecutionPin);
  assert.deepEqual(validateR6IdentityManifest(current,current),current);
  assert.throws(()=>validateR6IdentityManifest({...current,noRetry:false},current),
    /invalid_dream_climate_r6_identity_manifest|dream_climate_r6_execution_pin_mismatch/);
  assert.throws(()=>validateR6Release({...r6ReleaseObject(),
    executionDigest:'0'.repeat(64)}),/dream_climate_r6_release_mismatch/);
  const parent=temporary();t.after(()=>fs.rmSync(parent,{recursive:true,force:true}));
  const copied=path.join(parent,'package');
  fs.cpSync(r6PackageDirectory,copied,{recursive:true});
  fs.appendFileSync(path.join(copied,'worker.mjs'),'\n// synthetic synchronized drift\n','utf8');
  const drifted=createR6IdentityManifest({directory:copied,shared:r6SharedDirectory});
  assert.notEqual(drifted.executionDigest,r6ExecutionPin);
  assert.throws(()=>validateR6IdentityManifest(drifted,drifted),
    /dream_climate_r6_execution_pin_mismatch/);
});

test('fixed Store contract refuses existing directories and path drift',t=>{
  assert.equal(assertR6StorePath(),path.resolve(r6StoreDirectory));
  const parent=temporary();t.after(()=>fs.rmSync(parent,{recursive:true,force:true}));
  const existing=path.join(parent,r6StoreBasename);
  fs.mkdirSync(existing);
  assert.throws(()=>assertR6DirectoryAbsent(existing),/dream_climate_r6_store_already_exists/);
  assert.throws(()=>assertR6StorePath(path.join(parent,'other')),/dream_climate_r6_store_path_mismatch/);
});

test('admission is credential-free and leaves no release or real Store',async()=>{
  const value=await runR6Admission(officialPrice);
  assert.equal(value.status,'R6_OFFLINE_ADMISSION_PASSED');
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
  assert.equal(value.dummy.status,'R6_DUMMY_REHEARSAL_PASSED');
  assert.equal(value.dummy.calls,4);
  assert.equal(fs.existsSync(path.join(r6PackageDirectory,'release.json')),false);
  const source=fs.readFileSync(path.join(r6PackageDirectory,'secure-input.ps1'),'utf8');
  assert.equal((source.match(/Read-Host/g)??[]).length,1);
  for(const forbidden of ['$env:','Get-Clipboard','Get-ChildItem Env:','ConvertTo-SecureString'])
    assert.equal(source.includes(forbidden),false,forbidden);
});

test('synthetic worker writes a non-overwriting UTF-8 success receipt',async t=>{
  const value=await syntheticWorker(t);
  assert.equal(value.value.status,'SINGLE_RUN_READY_FOR_MANUAL_CONTENT_REVIEW');
  assert.equal(value.value.batchStatus,'SINGLE_RUN_COMPLETE');
  assert.equal(value.value.completedRuns,1);
  assert.equal(value.calls(),4);
  assert.equal(value.value.credentialRequested,true);
  assert.equal(value.value.credentialDelivered,true);
  assert.equal(value.value.credentialPersisted,false);
  assert.equal(value.value.requestOutcomeKnown,true);
  assert.equal(value.value.automaticRetry,false);
  assert.equal(value.value.replacementRun,false);
  assert.equal(value.value.secondRun,false);
  assert.equal(value.value.releaseRevoked,true);
  assert.equal(value.value.receiptWritten,true);
  assert.equal(fs.existsSync(value.releaseFile),false);
  assert.equal(fs.existsSync(r6StoreDirectory),false);
  assert.equal(value.notices.length,1);
  const notice=JSON.parse(value.notices[0]);
  assert.equal(notice.type,'credential_required');
  assert.equal(notice.nextRequestBytes,4855);
  assert.equal(notice.nextReservationMicroCny,35968);
  const bytes=fs.readFileSync(value.receiptFile);
  assert.equal(bytes[0]===0xEF&&bytes[1]===0xBB&&bytes[2]===0xBF,false);
  const document=receiptDocument(value.receiptFile);
  assert.equal(document.encoding,'UTF-8');
  assert.equal(document.materialKind,'fictional');
  assert.equal(document.isRealityFact,false);
  assert.equal(document.receipt.status,'completed');
  assert.equal(document.receipt.receipt.completedRuns,1);
  assert.equal(document.receipt.receipt.runs[0].scenes.length,3);
  assert.equal(JSON.stringify(document).includes('sk-DUMMY-R6-ONLY'),false);
  assert.equal(JSON.stringify(document).includes('Authorization'),false);
  const original=R6Hash(bytes);
  const second=writeR6Receipt(value.directory,document);
  assert.equal(second.written,false);
  assert.equal(second.error,'EEXIST');
  assert.equal(R6Hash(fs.readFileSync(value.receiptFile)),original);
});

function R6Hash(bytes){return crypto.createHash('sha256').update(bytes).digest('hex');}

test('synthetic worker failure keeps drafts and writes a readable receipt',async t=>{
  const value=await syntheticWorker(t,{mutator:wakeMutation(data=>{
    data.associations=[{question:'synthetic invalid object'}];
  })});
  assert.equal(value.value.status,'PARTIAL_OR_FAILED');
  assert.equal(value.value.batchStatus,'SINGLE_RUN_FAILED');
  assert.equal(value.calls(),4);
  assert.equal(value.value.receiptWritten,true);
  assert.equal(value.value.requestOutcomeKnown,true);
  assert.equal(value.value.automaticRetry,false);
  assert.equal(value.value.secondRun,false);
  assert.equal(fs.existsSync(value.releaseFile),false);
  const document=receiptDocument(value.receiptFile),run=document.receipt.receipt.runs[0];
  assert.equal(document.receipt.status,'blocked');
  assert.equal(run.status,'failed');
  assert.equal(run.error,'invalid_wake');
  assert.deepEqual(run.validation,{subreason:'associations',
    originalError:'invalid_generated_wake_associations'});
  assertDraftScenes(run);
  assert.deepEqual(run.billing.rows.map(row=>row.status),
    ['settled','settled','settled','settled']);
  assert.equal(run.publication.status,'not_published');
  assert.equal(document.receipt.receipt.completedRuns,0);
  assert.equal(fs.readFileSync(value.receiptFile,'utf8').includes('sk-DUMMY-R6-ONLY'),false);
});

test('actual Windows PowerShell preserves UTF-8 capture and receipt bytes',t=>{
  const parent=temporary();t.after(()=>fs.rmSync(parent,{recursive:true,force:true}));
  const stub=path.join(r6PackageDirectory,'utf8-stub.mjs');
  const script=path.join(r6PackageDirectory,'utf8-roundtrip.ps1');
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
  assert.deepEqual(readR6Release(releaseFile),r6ReleaseObject());

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

  const before=R6Hash(receiptBytes);
  const second=run('ok',['-ReceiptDir',receiptDir],'ok-second');
  assert.notEqual(second.document.nodeExitCode,0);
  assert.equal(R6Hash(fs.readFileSync(ok.document.receiptFile)),before);
});

test('old R3/R4/R5 entries remain closed and old releases cannot authorize R6',async()=>{
  const r5=spawnSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',
    path.join(r6PackageDirectory,'..','single-run-r4','secure-input.ps1')],
  {encoding:'utf8',timeout:30000});
  assert.equal(r5.status,2);
  assert.ok(r5.stderr.includes('OFFLINE_REVIEW_REQUIRED_R5'));
  const r4=await runR4Worker('run',{priceFile:path.join(os.tmpdir(),'missing-pricing.html')});
  assert.equal(r4.reason,'OFFLINE_REVIEW_REQUIRED_R5');
  assert.equal(r4.credentialRequested,false);
  const r3=await runLiveWorker('run');
  assert.equal(r3.credentialSupplierCalls,0);
  assert.equal(r3.credentialRequested,false);
  assert.throws(()=>validateR6Release({...r6ReleaseObject(),
    profile:'nv-dream-climate-single-run-r4-v1'}),/dream_climate_r6_release_mismatch/);
});
