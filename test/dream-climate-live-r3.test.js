import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {Store} from '../src/store.js';
import {
  liveReleasePath,liveStoreBasename
} from '../scripts/nv-dream-climate-offline-01/phase-b/config.mjs';
import {
  assertBoundedDiagnostic,buildStageDiagnostic,liveDiagnosticByteLimit
} from '../scripts/nv-dream-climate-offline-01/phase-b/diagnostics.mjs';
import {
  createDummySimulator,runDummyRehearsal
} from '../scripts/nv-dream-climate-offline-01/phase-b/dummy.mjs';
import {liveRunIds} from '../scripts/nv-dream-climate-offline-01/phase-b/matrix.mjs';
import {
  blockedLauncherReceipt,launchLive
} from '../scripts/nv-dream-climate-offline-01/phase-b/launcher.mjs';
import {extractLiveReceipt} from '../scripts/nv-dream-climate-offline-01/phase-b/records.mjs';
import {liveReleaseObject,revokeLiveRelease} from '../scripts/nv-dream-climate-offline-01/phase-b/release.mjs';
import {DreamClimateLiveRuntime} from '../scripts/nv-dream-climate-offline-01/phase-b/runtime.mjs';
import {runSecureConsole} from '../scripts/nv-dream-climate-offline-01/phase-b/secure-console.mjs';
import {createLiveDispatchTelemetry} from '../scripts/nv-dream-climate-offline-01/phase-b/telemetry.mjs';
import {createDeepSeekTransport} from '../scripts/nv-dream-climate-offline-01/phase-b/transport.mjs';
import {runLiveWorker} from '../scripts/nv-dream-climate-offline-01/phase-b/worker.mjs';

const temporary=()=>fs.mkdtempSync(path.join(os.tmpdir(),'nv-dream-climate-live-r3-'));
const wakeData=response=>JSON.parse(response.body.choices[0].message.content);
const setWakeData=(response,data)=>{
  response.body.choices[0].message.content=JSON.stringify(data);
};

function syntheticRuntime(t,{mutator,onDispatch,fault,simulator}={}){
  const parent=temporary();
  t.after(()=>fs.rmSync(parent,{recursive:true,force:true}));
  const directory=path.join(parent,liveStoreBasename);
  const base=createDummySimulator({onDispatch});
  let calls=0;
  const selected=simulator??(async request=>{
    calls++;
    const response=await base(request);
    const material=JSON.parse(request.body.messages[1].content);
    if(mutator)await mutator({request,material,response,stage:material.stage,call:calls});
    return response;
  });
  let runtime;
  runtime=new DreamClimateLiveRuntime(directory,{enabled:true,simulator:selected,fault});
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

function assertSyntheticAccounting(billing){
  assert.equal(billing.settledChargeMicroCny,
    (BigInt(billing.settledChargeMicroCny)).toString());
  assert.equal(billing.unknownReservedMicroCny,
    (BigInt(billing.unknownReservedMicroCny)).toString());
  assert.equal(BigInt(billing.combinedAccountingMicroCny),
    BigInt(billing.settledChargeMicroCny)+BigInt(billing.unknownReservedMicroCny));
  assert.equal(billing.combinedIsProviderCharged,false);
}

test('valid wakes publish atomically and every firstFeeling form remains valid',async t=>{
  const dreamCountsAtWake=[];
  let runtime;
  const parent=temporary();t.after(()=>fs.rmSync(parent,{recursive:true,force:true}));
  const directory=path.join(parent,liveStoreBasename);
  const simulator=createDummySimulator({onDispatch:({stage})=>{
    if(stage==='wake')dreamCountsAtWake.push(Object.values(runtime.store.state.entries)
      .filter(entry=>entry.origin==='dream').length);
  }});
  runtime=new DreamClimateLiveRuntime(directory,{enabled:true,simulator});
  t.after(()=>{try{runtime.close();}catch{}});
  runtime.startBatch();
  await runtime.executeBatch();
  assert.deepEqual(dreamCountsAtWake,[0,1,2]);
  const receipt=runtime.readReceipt();
  assert.deepEqual(receipt.runs.map(run=>run.firstFeeling.status),
    ['present','absent','omitted']);
  for(const run of receipt.runs){
    assert.equal(run.status,'completed');
    assert.equal(run.billing.rows.length,4);
    assert.ok(run.billing.rows.every(row=>row.status==='settled'));
    assert.equal(run.billing.unknownReservedMicroCny,'0');
    assertSyntheticAccounting(run.billing);
    assert.ok(run.scenes[run.wake.fragmentBasis.sceneIndex].event.includes(run.wake.fragment));
  }

  const uncertain=syntheticRuntime(t,{mutator:wakeMutation(data=>{
    data.firstFeeling={status:'uncertain'};
  })});
  const status=await uncertain.runtime.executeRun(liveRunIds[0]);
  assert.equal(status.status,'completed');
  const value=uncertain.runtime.readReceipt();
  assert.equal(value.runs[0].firstFeeling.status,'uncertain');
  assert.equal(Object.hasOwn(value.runs[0].firstFeeling,'text'),false);
  assert.equal(value.runs[0].billing.rows.length,4);
  assert.ok(value.runs[0].billing.rows.every(row=>row.status==='settled'));
});

test('invalid wake fields keep exact subreasons, three drafts and one settled usage',async t=>{
  const cases=[
    ['extra field',data=>{data.unexpected='synthetic';},'invalid_generated_wake_response','response'],
    ['invalid firstFeeling',data=>{data.firstFeeling={status:'present'};},
      'invalid_generated_wake_first_feeling','firstFeeling'],
    ['invalid residue',data=>{data.residue=.31;},
      'invalid_generated_wake_residue','residue'],
    ['invalid associations',data=>{data.associations=['a','b'];},
      'invalid_generated_wake_associations','associations'],
    ['nonliteral fragment',data=>{data.fragment='这段文字不在这三幕里';},
      'generated_wake_fragment_not_grounded','fragmentGrounding']
  ];
  for(const [name,mutate,originalError,subreason] of cases){
    await t.test(name,async t=>{
      const value=syntheticRuntime(t,{mutator:wakeMutation(mutate)});
      const batch=await value.runtime.executeBatch();
      assert.equal(batch.runs[0].status,'failed');
      const receipt=value.runtime.readReceipt(),run=receipt.runs[0];
      assert.equal(run.status,'failed');
      assert.equal(run.error,subreason==='fragmentGrounding'?
        'wake_fragment_not_grounded':'invalid_wake');
      assert.deepEqual(run.validation,{subreason,originalError});
      assert.equal(run.draftScenes,3);
      assert.equal(run.draftSceneRecords.length,3);
      assert.ok(run.draftSceneRecords.every((scene,index)=>scene.index===index&&
        typeof scene.event==='string'&&scene.appraisal&&scene.before&&scene.delta&&
        scene.after&&scene.appraisalBasis&&scene.affectDeclaration));
      assert.deepEqual(run.publication,{status:'not_published',wakeRecorded:false,
        firstFeelingRecorded:false,residueCreated:false});
      assert.equal(Object.keys(value.runtime.store.state.entries).length,0);
      assert.equal(value.calls(),4);
      assert.equal(run.billing.calls,4);
      assert.deepEqual(run.billing.rows.map(row=>row.status),
        ['settled','settled','settled','settled']);
      assert.equal(run.billing.unknownReservedMicroCny,'0');
      assertSyntheticAccounting(run.billing);
      assert.equal(run.diagnostics.length,1);
      assert.equal(run.diagnostics[0].originalError,originalError);
      assert.equal(run.diagnostics[0].subreason,subreason);
      assert.equal(run.diagnostics[0].usageValidation,'verified');
      assert.equal(run.diagnostics[0].settlement,'settled');
      assert.equal(run.diagnostics[0].published,false);
      assert.equal(run.diagnostics[0].parsedJson.unexpected==='synthetic',
        name==='extra field');
      assert.equal(assertBoundedDiagnostic(run.diagnostics[0]),true);
      assert.ok(Buffer.byteLength(JSON.stringify(run.diagnostics[0]))<=liveDiagnosticByteLimit);
      assert.equal(receipt.runs[1].status,'queued');
      assert.equal(receipt.runs[2].status,'queued');
      const calls=value.calls();
      await value.runtime.executeBatch();
      assert.equal(value.calls(),calls);
      await assert.rejects(()=>value.runtime.executeRun(liveRunIds[1]),
        /dream_climate_live_previous_run_incomplete/);
      assert.equal(value.calls(),calls);
    });
  }
});

test('missing usage, rejected usage and transport failure stay unknown without fake charge',async t=>{
  const cases=[
    ['missing usage',({stage,response})=>{
      if(stage==='wake')delete response.body.usage;
    },'provider_or_validation_failure'],
    ['out-of-range usage',({stage,response})=>{
      if(stage!=='wake')return;
      response.body.usage.prompt_tokens=196609;
      response.body.usage.total_tokens=196609+response.body.usage.completion_tokens;
    },'usage_exceeds_reviewed_bounds'],
    ['transport failure',({stage})=>{
      if(stage==='wake')throw Error('provider_http_failure');
    },'provider_or_validation_failure']
  ];
  for(const [name,mutator,expectedError] of cases){
    await t.test(name,async t=>{
      const value=syntheticRuntime(t,{mutator});
      await value.runtime.executeBatch();
      const receipt=value.runtime.readReceipt(),run=receipt.runs[0];
      assert.notEqual(run.status,'completed');
      assert.equal(run.error,expectedError);
      assert.equal(run.draftSceneRecords.length,3);
      assert.equal(Object.keys(value.runtime.store.state.entries).length,0);
      assert.equal(value.calls(),4);
      assert.equal(run.billing.calls,4);
      assert.deepEqual(run.billing.rows.map(row=>row.status),
        ['settled','settled','settled','unknown']);
      assert.equal(run.billing.settledChargeMicroCny,
        run.billing.rows.filter(row=>row.status==='settled')
          .reduce((sum,row)=>sum+BigInt(row.chargedMicroCny),0n).toString());
      assert.equal(run.billing.unknownReservedMicroCny,'35968');
      assert.notEqual(run.billing.settledChargeMicroCny,
        run.billing.combinedAccountingMicroCny);
      assertSyntheticAccounting(run.billing);
      const unknown=run.billing.rows.at(-1);
      assert.equal(unknown.chargeClass,'unknown_reserved_hold');
      assert.equal(unknown.settledChargeMicroCny,null);
      assert.equal(unknown.unknownReservedMicroCny,'35968');
      assert.ok(run.diagnostics.length<=1);
      if(run.diagnostics.length){
        assert.equal(run.diagnostics[0].settlement,'unknown');
        assert.equal(assertBoundedDiagnostic(run.diagnostics[0]),true);
      }
      assert.equal(receipt.batch.combinedIsProviderCharged,false);
      assert.equal(BigInt(receipt.batch.combinedAccountingMicroCny)-
        BigInt(receipt.batch.unknownReservedMicroCny),
        BigInt(receipt.batch.settledChargeMicroCny));
      assert.equal(receipt.runs[1].status,'queued');
      assert.equal(receipt.runs[2].status,'queued');
    });
  }
});

test('settlement survives a later diagnostic write failure without duplicate billing',async t=>{
  const value=syntheticRuntime(t,{mutator:wakeMutation(data=>{
    data.firstFeeling={status:'present'};
  })});
  const runId=liveRunIds[0];
  const originalSave=value.runtime.store.save.bind(value.runtime.store);
  value.runtime.store.save=()=>{
    if(value.runtime.store.state.runs[runId].diagnostics?.length)
      throw Error('storage_io_failure');
    return originalSave();
  };
  await assert.rejects(()=>value.runtime.executeBatch(),/storage_io_failure/);
  const rows=value.runtime.ledger.status('nv-dream-climate-live-r1-001').attempts
    .filter(row=>row.runId===runId);
  assert.equal(rows.length,4);
  assert.ok(rows.every(row=>row.status==='settled'));
  assert.equal(value.calls(),4);
  assert.equal(Object.keys(value.runtime.store.state.entries).length,0);
  value.runtime.close();
  const reader=new Store(value.directory);
  t.after(()=>{try{reader.close();}catch{}});
  const receipt=extractLiveReceipt(reader);
  const persisted=receipt.runs[0];
  assert.equal(persisted.status,'uncertain');
  assert.equal(persisted.billing.rows.length,4);
  assert.ok(persisted.billing.rows.every(row=>row.status==='settled'));
  assert.equal(persisted.diagnostics.length,0);
  assert.equal(persisted.draftSceneRecords.length,3);
});

test('publication save failure leaves no half dream and never rewrites settled usage',async t=>{
  const value=syntheticRuntime(t);
  const runId=liveRunIds[0];
  const originalSave=value.runtime.store.save.bind(value.runtime.store);
  value.runtime.store.save=()=>{
    if(value.runtime.store.state.runs[runId].status==='completed')
      throw Error('storage_io_failure');
    return originalSave();
  };
  const batch=await value.runtime.executeBatch();
  assert.equal(batch.runs[0].status,'failed');
  const receipt=value.runtime.readReceipt(),run=receipt.runs[0];
  assert.equal(run.billing.rows.length,4);
  assert.ok(run.billing.rows.every(row=>row.status==='settled'));
  assert.equal(run.publication.status,'not_published');
  assert.equal(run.draftSceneRecords.length,3);
  assert.equal(Object.keys(value.runtime.store.state.entries).length,0);
  assert.equal(Object.hasOwn(value.runtime.store.state,'dreamClimateLiveJournal'),false);
  assert.equal(value.calls(),4);
  assert.equal(run.diagnostics.length,1);
  assert.equal(run.diagnostics[0].publication,'failed_not_published');
  assert.equal(run.diagnostics[0].settlement,'settled');
  const calls=value.calls();
  await value.runtime.executeBatch();
  assert.equal(value.calls(),calls);
});

test('oversized and credential-echo responses never become publishable text or leak',async t=>{
  await t.test('oversized content',async t=>{
    const marker='Z'.repeat(4000);
    const value=syntheticRuntime(t,{mutator:({stage,response})=>{
      if(stage==='wake')response.body.choices[0].message.content=marker;
    }});
    await value.runtime.executeBatch();
    const receipt=value.runtime.readReceipt(),run=receipt.runs[0];
    assert.equal(run.error,'provider_or_validation_failure');
    assert.equal(run.billing.rows.filter(row=>row.status==='settled').length,3);
    assert.equal(run.billing.rows.at(-1).status,'unknown');
    assert.equal(run.draftSceneRecords.length,3);
    assert.equal(Object.keys(value.runtime.store.state.entries).length,0);
    assert.equal(run.diagnostics.length,1);
    assert.equal(run.diagnostics[0].contentByteLength,4000);
    assert.equal(run.diagnostics[0].diagnosticOmission.reason,
      'unparsed_content_not_retained');
    assert.equal(assertBoundedDiagnostic(run.diagnostics[0]),true);
    assert.equal(JSON.stringify(run.diagnostics[0]).includes('ZZZZZZZZZZZZZZZZ'),false);
    const hostile=buildStageDiagnostic({runId:'synthetic',requestId:'synthetic-wake',
      stage:'wake',errorCode:'invalid_generated_wake_response',
      response:{body:{choices:[{message:{content:'{}'}}]}},
      parsed:{data:{payload:'Q'.repeat(20000)}},usageValidation:'verified',
      settlement:'settled'});
    assert.ok(Buffer.byteLength(JSON.stringify(hostile))<=liveDiagnosticByteLimit);
    assert.equal(hostile.diagnosticOmission.reason,'diagnostic_size_limit_exceeded');
    assert.equal(JSON.stringify(hostile).includes('Q'.repeat(64)),false);
    assert.equal(assertBoundedDiagnostic(hostile),true);
    value.runtime.close();
    const disk=fs.readFileSync(path.join(value.directory,'state.json'),'utf8');
    assert.equal(disk.includes('Z'.repeat(64)),false);
  });

  await t.test('credential echo rejected before diagnostic persistence',async t=>{
    const credential='DUMMY-R3-CREDENTIAL-ECHO';
    const telemetry=createLiveDispatchTelemetry();
    const base=createDummySimulator();
    let calls=0;
    const requestImpl=(url,options,callback)=>{
      calls++;
      const req=new EventEmitter();
      req.setTimeout=()=>{};req.destroy=()=>{};
      req.end=payload=>{
        const body=JSON.parse(payload.toString('utf8'));
        Promise.resolve(base({body})).then(response=>{
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
    const directory=path.join(parent,liveStoreBasename);
    const runtime=new DreamClimateLiveRuntime(directory,{enabled:true,
      simulator:createDeepSeekTransport(credential,{requestImpl,telemetry})});
    t.after(()=>{try{runtime.close();}catch{}});
    runtime.startBatch();
    await runtime.executeBatch();
    assert.deepEqual(telemetry.snapshot(),
      {networkAttempts:4,realModelRequests:4,requestOutcomeKnown:true});
    assert.equal(calls,4);
    const receipt=runtime.readReceipt(),run=receipt.runs[0];
    assert.equal(run.billing.rows.filter(row=>row.status==='settled').length,3);
    assert.equal(run.billing.rows.at(-1).status,'unknown');
    assert.equal(run.diagnostics.length,1);
    assert.equal(run.diagnostics[0].credentialEchoRejected,true);
    assert.equal(run.diagnostics[0].responseAvailable,false);
    assert.equal(JSON.stringify(run.diagnostics).includes(credential),false);
    runtime.close();
    const disk=fs.readFileSync(path.join(directory,'state.json'),'utf8');
    assert.equal(disk.includes(credential),false);
    assert.equal(disk.includes('Authorization'),false);
    assert.equal(fs.existsSync(path.join(directory,'owner.lock')),false);
  });
});

test('real entries refuse with and without the byte-exact old release',async t=>{
  const original=fs.existsSync(liveReleasePath)?fs.readFileSync(liveReleasePath):null;
  t.after(()=>{
    if(original===null)revokeLiveRelease(liveReleasePath);
    else fs.writeFileSync(liveReleasePath,original);
  });
  for(const present of [false,true]){
    if(present)fs.writeFileSync(liveReleasePath,JSON.stringify(liveReleaseObject()));
    else revokeLiveRelease(liveReleasePath);
    let supplierCalls=0;
    const result=await launchLive('run',{priceFile:path.join(os.tmpdir(),'not-read.html'),
      credentialSupplier:()=>{supplierCalls++;return 'DUMMY-R3-SENTINEL';}});
    assert.equal(result.status,'blocked',String(present));
    assert.equal(result.reason,'OFFLINE_REVIEW_REQUIRED_R3',String(present));
    assert.equal(result.credentialSupplierCalls,0,String(present));
    assert.equal(result.networkAttempts,0,String(present));
    assert.equal(result.realModelRequests,0,String(present));
    assert.equal(result.requestOutcomeKnown,true,String(present));
    assert.equal(result.storeCreated,false,String(present));
    assert.equal(supplierCalls,0,String(present));
  }
  const input=new PassThrough();
  const secure=await runSecureConsole({priceFile:path.join(os.tmpdir(),'not-read.html'),input});
  assert.equal(secure.reason,'OFFLINE_REVIEW_REQUIRED_R3');
  assert.equal(secure.credentialSupplierCalls,0);
  assert.equal(input.listenerCount('data'),0);
  assert.equal(input.listenerCount('readable'),0);
  const worker=await runLiveWorker('run',{credentialSource:{on(){throw Error('read');}}});
  assert.equal(worker.reason,'OFFLINE_REVIEW_REQUIRED_R3');
  assert.equal(worker.credentialSupplierCalls,0);
  assert.equal(worker.networkAttempts,0);
  assert.equal(worker.storeCreated,false);
  const before=blockedLauncherReceipt('before_transport');
  assert.equal(before.requestOutcomeKnown,true);
  const unknown=blockedLauncherReceipt('after_delivery',{credentialDelivered:true,
    credentialSupplierCalls:1});
  assert.equal(unknown.networkAttempts,null);
  assert.equal(unknown.realModelRequests,null);
  assert.equal(unknown.requestOutcomeKnown,false);
  assert.equal(unknown.storeCreated,null);
});

test('dummy remains exact-zero and the thirteen/fourth/retry guards remain closed',async()=>{
  const value=await runDummyRehearsal();
  assert.equal(value.status,'DUMMY_REHEARSAL_PASSED');
  assert.equal(value.calls,12);
  assert.equal(value.receipt.completedRuns,3);
  assert.equal(value.thirteenthRefused,true);
  assert.equal(value.fourthRunRefused,true);
  assert.equal(value.retryRefused,true);
  assert.equal(value.boundaries.networkAttempts,0);
  assert.equal(value.boundaries.realModelRequests,0);
  assert.equal(value.boundaries.credentialReads,0);
  assert.equal(value.boundaries.realStoreCreated,false);
});
