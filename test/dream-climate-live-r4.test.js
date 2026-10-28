import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {hash} from '../src/contract.js';
import {Store} from '../src/store.js';
import {
  r4AllowanceCapMicroCny,r4CallsPerRun,r4DiagnosticVersion,
  r4MaxCalls,r4PerCallMaximumMicroCny,r4RequestByteLimit,r4ReleasePath,r4RunId,
  r4RunRequestId,r4RunSessionId,r4ScenesPerRun,r4StoreBasename,r4StoreDirectory,
  r4WorstMicroCny
} from '../scripts/nv-dream-climate-offline-01/single-run-r4/config.mjs';
import {
  r4Matrix,r4MatrixHash
} from '../scripts/nv-dream-climate-offline-01/single-run-r4/matrix.mjs';
import {
  readR4Release,r4ExpectedReleaseHash,r4ReleaseObject,validateR4Release
} from '../scripts/nv-dream-climate-offline-01/single-run-r4/release.mjs';
import {
  r4PackageDirectory,verifyR4Identity
} from '../scripts/nv-dream-climate-offline-01/single-run-r4/identity.mjs';
import {r4PriceSnapshotHash} from '../scripts/nv-dream-climate-offline-01/single-run-r4/price.mjs';
import {
  verifyR4PriceEvidence
} from '../scripts/nv-dream-climate-offline-01/single-run-r4/price-check.mjs';
import {
  runR4DummyRehearsal
} from '../scripts/nv-dream-climate-offline-01/single-run-r4/dummy.mjs';
import {
  runR4Admission
} from '../scripts/nv-dream-climate-offline-01/single-run-r4/check-admission.mjs';
import {
  runR4Worker,staticR4Preflight
} from '../scripts/nv-dream-climate-offline-01/single-run-r4/worker.mjs';
import {
  DreamClimateSingleRunRuntime
} from '../scripts/nv-dream-climate-offline-01/single-run-r4/runtime.mjs';
import {
  extractR4Receipt
} from '../scripts/nv-dream-climate-offline-01/single-run-r4/records.mjs';
import {
  assertDirectoryAbsent,assertR4StoreAbsent,assertR4StorePath
} from '../scripts/nv-dream-climate-offline-01/single-run-r4/store-contract.mjs';
import {
  createDummySimulator
} from '../scripts/nv-dream-climate-offline-01/phase-b/dummy.mjs';
import {
  launchLive
} from '../scripts/nv-dream-climate-offline-01/phase-b/launcher.mjs';
import {
  liveReleaseObject
} from '../scripts/nv-dream-climate-offline-01/phase-b/release.mjs';
import {
  createLiveDispatchTelemetry
} from '../scripts/nv-dream-climate-offline-01/phase-b/telemetry.mjs';
import {
  createDeepSeekTransport,credentialEchoDetected
} from '../scripts/nv-dream-climate-offline-01/phase-b/transport.mjs';
import {
  assertBoundedDiagnostic
} from '../scripts/nv-dream-climate-offline-01/phase-b/diagnostics.mjs';
import {
  assertRequestBounds,buildDreamStageRequest
} from '../scripts/nv-dream-climate-offline-01/protocol.mjs';

const temporary=()=>fs.mkdtempSync(path.join(os.tmpdir(),'nv-dream-climate-r4-'));
const officialPrice=path.join(process.env.USERPROFILE??'','Desktop','deepseek-pricing-r1.html');
const ps1Path=path.join(r4PackageDirectory,'secure-input.ps1');
const wakeData=response=>JSON.parse(response.body.choices[0].message.content);
const setWakeData=(response,data)=>{
  response.body.choices[0].message.content=JSON.stringify(data);
};

function syntheticRuntime(t,{mutator,onDispatch,fault,simulator}={}){
  const parent=temporary();
  t.after(()=>fs.rmSync(parent,{recursive:true,force:true}));
  const directory=path.join(parent,r4StoreBasename);
  const base=createDummySimulator({onDispatch});
  let calls=0;
  const selected=simulator??(async request=>{
    calls++;
    const response=await base(request);
    const material=JSON.parse(request.body.messages[1].content);
    if(mutator)mutator({request,material,response,stage:material.stage,call:calls});
    return response;
  });
  const runtime=new DreamClimateSingleRunRuntime(directory,{enabled:true,simulator:selected,fault});
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

function assertDraftScenes(drafts){
  assert.equal(drafts.length,3);
  for(const [index,scene] of drafts.entries()){
    assert.equal(scene.index,index);
    assert.equal(typeof scene.event,'string');
    assert.ok(scene.event.length>0);
    assert.equal(typeof scene.appraisal,'object');
    assert.equal(typeof scene.before,'object');
    assert.equal(typeof scene.delta,'object');
    assert.equal(typeof scene.after,'object');
    assert.equal(typeof scene.appraisalBasis,'object');
    assert.equal(typeof scene.affectDeclaration,'object');
  }
}

function assertRawFilesDoNotContain(directory,values){
  const state=fs.readFileSync(path.join(directory,'state.json'),'utf8');
  for(const value of values)assert.equal(state.includes(value),false,value);
  assert.equal(state.includes('Authorization'),false);
}

test('R4 identity, matrix, release, budget and request size are exact',()=>{
  const identity=verifyR4Identity();
  assert.equal(identity.runCount,1);
  assert.equal(identity.maxCalls,4);
  assert.equal(identity.allowanceCapMicroCny,160000);
  assert.equal(identity.priceSnapshotHash,r4PriceSnapshotHash);
  assert.equal(identity.releaseHash,r4ExpectedReleaseHash);
  assert.equal(identity.executionFiles,15);
  assert.equal(identity.sharedExecutionFiles,10);
  assert.equal(r4PerCallMaximumMicroCny,35968);
  assert.equal(r4PerCallMaximumMicroCny*r4MaxCalls,r4WorstMicroCny);
  assert.equal(r4WorstMicroCny,143872);
  assert.ok(r4WorstMicroCny<=r4AllowanceCapMicroCny);
  assert.equal(r4ScenesPerRun,3);
  assert.equal(r4CallsPerRun,4);

  assert.equal(r4Matrix.length,1);
  assert.equal(r4Matrix[0].id,r4RunId);
  assert.equal(r4Matrix[0].plan.climate,'ordinary');
  assert.equal(r4Matrix[0].plan.mechanism,'transformation');
  assert.equal(r4Matrix[0].plan.foregroundAnchor,'cup_tap');
  assert.deepEqual(r4Matrix[0].plan.usedForegroundAnchors,[]);
  assert.deepEqual(r4Matrix[0].plan.usedMechanisms,[]);
  assert.equal(hash(r4Matrix),r4MatrixHash);

  assert.deepEqual(validateR4Release(r4ReleaseObject()),r4ReleaseObject());
  assert.equal(hash(r4ReleaseObject()),r4ExpectedReleaseHash);
  assert.equal(r4ReleaseObject().storeDirectory,r4StoreDirectory);
  assert.equal(r4ReleaseObject().runId,r4RunId);
  assert.equal(r4ReleaseObject().noRetry,true);
  assert.equal(r4ReleaseObject().maxRuns,1);
  assert.equal(r4ReleaseObject().maxCalls,4);
  assert.equal(r4ReleaseObject().allowanceCapMicroCny,160000);
  assert.equal(r4RunRequestId,`${r4RunId}-request`);
  assert.equal(r4RunSessionId,`${r4RunId}-session`);

  const request=buildDreamStageRequest({run:r4Matrix[0].plan,previousScenes:[],stage:'scene'});
  assert.equal(assertRequestBounds(request),4855);
  assert.ok(assertRequestBounds(request)<=r4RequestByteLimit);
});

test('secure-input release block is byte-identical to the pinned release object',()=>{
  const text=fs.readFileSync(ps1Path,'utf8');
  const match=text.match(/\$releaseJson = @'([\s\S]*?)'@/);
  assert.ok(match);
  const parsed=JSON.parse(match[1]);
  assert.equal(hash(parsed),r4ExpectedReleaseHash);
  assert.equal(r4ExpectedReleaseHash,
    'de4c1c85dd4bea5831b7ead3cc7fa9bb728326ac4846640fe56afb6bcdbb1a5f');
  assert.deepEqual(parsed,r4ReleaseObject());
  assert.equal((text.match(/Read-Host/g)??[]).length,1);
  assert.ok(text.indexOf('credential_required')<text.indexOf('Read-Host'));
  assert.equal(text.includes('GetEnvironmentVariable'),false);
  assert.equal(text.includes('$env:'),false);
  assert.ok(text.includes('SecureStringToBSTR'));
  assert.ok(text.includes('ZeroFreeBSTR'));
  assert.match(text,/reason = 'r4_worker_child_failed_after_credential'/);
  assert.match(text,/networkAttempts = \$null/);
  assert.match(text,/realModelRequests = \$null/);
  assert.match(text,/requestOutcomeKnown = \$false/);
});

test('one completed dream publishes exactly three scenes and one wake in four settled calls',async t=>{
  const countsAtWake=[];
  let runtime;
  const parent=temporary();t.after(()=>fs.rmSync(parent,{recursive:true,force:true}));
  const directory=path.join(parent,r4StoreBasename);
  const simulator=createDummySimulator({onDispatch:({stage})=>{
    if(stage==='wake')countsAtWake.push(Object.values(runtime.store.state.entries)
      .filter(entry=>entry.origin==='dream').length);
  }});
  runtime=new DreamClimateSingleRunRuntime(directory,{enabled:true,simulator});
  t.after(()=>{try{runtime.close();}catch{}});
  runtime.startBatch();
  const batch=await runtime.executeBatch();
  assert.equal(batch.runs.length,1);
  assert.equal(batch.runs[0].status,'completed');
  assert.deepEqual(countsAtWake,[0]);
  const receipt=runtime.readReceipt({now:Date.now()});
  assert.equal(receipt.status,'SINGLE_RUN_READY_FOR_MANUAL_CONTENT_REVIEW');
  assert.equal(receipt.extractionVersion,
    'nv-dream-climate-single-run-r4-receipt-v1');
  assert.equal(receipt.profile,'r4');
  assert.equal(receipt.completedRuns,1);
  assert.equal(receipt.requestedRuns,1);
  const run=receipt.runs[0];
  assert.equal(run.status,'completed');
  assert.equal(run.id,r4RunId);
  assert.equal(run.ordinal,1);
  assert.equal(run.climate,'ordinary');
  assert.equal(run.mechanism,'transformation');
  assert.equal(run.foregroundAnchor,'cup_tap');
  assert.deepEqual(run.usedForegroundAnchors,[]);
  assert.deepEqual(run.usedMechanisms,[]);
  assert.equal(run.scenes.length,3);
  assertDraftScenes(run.scenes);
  assert.equal(typeof run.wake.fragment,'string');
  assert.ok(run.scenes[run.wake.fragmentBasis.sceneIndex].event.includes(run.wake.fragment));
  assert.equal(run.wake.residue.label,'simulated_estimate');
  assert.equal(run.wake.residue.durationMs,3600000);
  assert.equal(run.firstFeeling.status,'present');
  assert.equal(typeof run.firstFeeling.text,'string');
  assert.equal(run.billing.calls,4);
  assert.deepEqual(run.billing.rows.map(row=>row.status),
    ['settled','settled','settled','settled']);
  assert.equal(run.billing.unknownReservedMicroCny,'0');
  assertSyntheticAccounting(run.billing);
  assert.equal(receipt.batch.calls,4);
  assert.equal(receipt.batch.combinedIsProviderCharged,false);
  assert.deepEqual(receipt.laterRecollections,[]);
  assert.equal(receipt.boundaries.laterRecollectionsEmpty,true);
  const dreamEntries=Object.values(runtime.store.state.entries)
    .filter(entry=>entry.origin==='dream');
  assert.equal(dreamEntries.length,1);
  assert.equal(dreamEntries[0].id,`r4-dream-${r4RunId}`);
  assert.ok(Object.hasOwn(runtime.store.state,'dreamClimateR4Journal'));
  assert.ok(Object.hasOwn(runtime.store.state,'dreamClimateR4Batch'));
  assert.equal(Object.hasOwn(runtime.store.state,'dreamClimateLiveBatch'),false);
  assert.equal(Object.hasOwn(runtime.store.state,'dreamClimateLiveJournal'),false);
  assert.equal(Object.hasOwn(runtime.store.state,'dreamClimateLiveBilling'),false);
  runtime.close();
  assert.equal(fs.existsSync(path.join(directory,'owner.lock')),false);
});

test('every firstFeeling form remains legal on its own single run',async t=>{
  const cases=[
    ['present',data=>{data.firstFeeling={status:'present',text:'玻璃杯边缘仍是温的。'};}],
    ['absent',data=>{data.firstFeeling={status:'absent'};}],
    ['uncertain',data=>{data.firstFeeling={status:'uncertain'};}]
  ];
  for(const [status,mutate] of cases){
    await t.test(status,async t=>{
      const value=syntheticRuntime(t,{mutator:wakeMutation(mutate)});
      const batch=await value.runtime.executeBatch();
      assert.equal(batch.runs[0].status,'completed');
      const receipt=value.runtime.readReceipt();
      const run=receipt.runs[0];
      assert.equal(run.firstFeeling.status,status);
      assert.equal(Object.hasOwn(run.firstFeeling,'text'),status==='present');
      assert.equal(run.billing.rows.length,4);
      assert.ok(run.billing.rows.every(row=>row.status==='settled'));
      assert.equal(value.calls(),4);
    });
  }
  await t.test('omitted',async t=>{
    const parent=temporary();t.after(()=>fs.rmSync(parent,{recursive:true,force:true}));
    const directory=path.join(parent,r4StoreBasename);
    const base=createDummySimulator();
    const runtime=new DreamClimateSingleRunRuntime(directory,{enabled:true,
      simulator:async request=>{
        const response=await base(request);
        const material=JSON.parse(request.body.messages[1].content);
        if(material.stage==='wake'){
          const data=wakeData(response);delete data.firstFeeling;setWakeData(response,data);
        }
        return response;
      }});
    t.after(()=>{try{runtime.close();}catch{}});
    runtime.startBatch();
    const batch=await runtime.executeBatch();
    assert.equal(batch.runs[0].status,'completed');
    const run=runtime.readReceipt().runs[0];
    assert.deepEqual(run.firstFeeling,{status:'omitted'});
    assert.equal(run.billing.rows.length,4);
    assert.ok(run.billing.rows.every(row=>row.status==='settled'));
  });
});

test('invalid wake keeps exact subreason, three drafts, settled usage and no retry',async t=>{
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
      const run=value.runtime.readReceipt().runs[0];
      assert.equal(run.status,'failed');
      assert.equal(run.error,subreason==='fragmentGrounding'?
        'wake_fragment_not_grounded':'invalid_wake');
      assert.deepEqual(run.validation,{subreason,originalError});
      assert.equal(run.scenesSaved,0);
      assert.equal(run.draftScenes,3);
      assertDraftScenes(run.draftSceneRecords);
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
      assert.equal(run.diagnostics[0].version,r4DiagnosticVersion);
      assert.equal(run.diagnostics[0].originalError,originalError);
      assert.equal(run.diagnostics[0].subreason,subreason);
      assert.equal(run.diagnostics[0].usageValidation,'verified');
      assert.equal(run.diagnostics[0].settlement,'settled');
      assert.equal(run.diagnostics[0].published,false);
      assert.equal(assertBoundedDiagnostic(run.diagnostics[0]),true);
      const calls=value.calls();
      const again=await value.runtime.executeRun(r4RunId);
      assert.equal(again.status,'failed');
      assert.equal(value.calls(),calls);
    });
  }
});

test('missing usage, rejected usage and transport failure hold only the fourth call unknown',async t=>{
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
      const batch=await value.runtime.executeBatch();
      assert.equal(batch.runs[0].status,'failed');
      const receipt=value.runtime.readReceipt();
      assert.equal(receipt.status,'PARTIAL_OR_FAILED');
      assert.equal(receipt.completedRuns,0);
      const run=receipt.runs[0];
      assert.notEqual(run.status,'completed');
      assert.equal(run.error,expectedError);
      assert.equal(run.draftSceneRecords.length,3);
      assert.equal(Object.keys(value.runtime.store.state.entries).length,0);
      assert.equal(value.calls(),4);
      assert.equal(run.billing.calls,4);
      assert.deepEqual(run.billing.rows.map(row=>row.status),
        ['settled','settled','settled','unknown']);
      assert.equal(run.billing.unknownReservedMicroCny,'35968');
      assert.notEqual(run.billing.settledChargeMicroCny,
        run.billing.combinedAccountingMicroCny);
      assertSyntheticAccounting(run.billing);
      const unknown=run.billing.rows.at(-1);
      assert.equal(unknown.chargeClass,'unknown_reserved_hold');
      assert.equal(unknown.settledChargeMicroCny,null);
      assert.equal(unknown.unknownReservedMicroCny,'35968');
      assert.equal(receipt.batch.combinedIsProviderCharged,false);
    });
  }
});

test('settlement survives a later diagnostic write failure without duplicate billing',async t=>{
  const value=syntheticRuntime(t,{mutator:wakeMutation(data=>{
    data.firstFeeling={status:'present'};
  })});
  const originalSave=value.runtime.store.save.bind(value.runtime.store);
  value.runtime.store.save=()=>{
    if(value.runtime.store.state.runs[r4RunId].diagnostics?.length)
      throw Error('storage_io_failure');
    return originalSave();
  };
  await assert.rejects(()=>value.runtime.executeBatch(),/storage_io_failure/);
  const rows=value.runtime.ledger.status('nv-dream-climate-one-dream-r4-001').attempts
    .filter(row=>row.runId===r4RunId);
  assert.equal(rows.length,4);
  assert.ok(rows.every(row=>row.status==='settled'));
  assert.equal(value.calls(),4);
  assert.equal(Object.keys(value.runtime.store.state.entries).length,0);
  value.runtime.close();
  const reader=new Store(value.directory);
  t.after(()=>{try{reader.close();}catch{}});
  const persisted=extractR4Receipt(reader);
  assert.equal(persisted.runs[0].status,'uncertain');
  assert.equal(persisted.runs[0].billing.rows.length,4);
  assert.ok(persisted.runs[0].billing.rows.every(row=>row.status==='settled'));
  assert.equal(persisted.runs[0].diagnostics.length,0);
  assert.equal(persisted.runs[0].draftSceneRecords.length,3);
});

test('publication save failure leaves no half dream and never rewrites settled usage',async t=>{
  const value=syntheticRuntime(t);
  const originalSave=value.runtime.store.save.bind(value.runtime.store);
  value.runtime.store.save=()=>{
    if(value.runtime.store.state.runs[r4RunId].status==='completed')
      throw Error('storage_io_failure');
    return originalSave();
  };
  const batch=await value.runtime.executeBatch();
  assert.equal(batch.runs[0].status,'failed');
  const run=value.runtime.readReceipt().runs[0];
  assert.equal(run.billing.rows.length,4);
  assert.ok(run.billing.rows.every(row=>row.status==='settled'));
  assert.equal(run.publication.status,'not_published');
  assert.equal(run.draftScenes,3);
  assert.equal(Object.keys(value.runtime.store.state.entries).length,0);
  assert.equal(Object.hasOwn(value.runtime.store.state,'dreamClimateR4Journal'),false);
  assert.equal(value.calls(),4);
  assert.equal(run.diagnostics.length,1);
  assert.equal(run.diagnostics[0].publication,'failed_not_published');
  assert.equal(run.diagnostics[0].settlement,'settled');
  const calls=value.calls();
  await value.runtime.executeBatch();
  assert.equal(value.calls(),calls);
});

function echoTransportRuntime(t,{credential,echoAtWake}){
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
        if(calls===4)echoAtWake(echoed);
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
  const directory=path.join(parent,r4StoreBasename);
  const runtime=new DreamClimateSingleRunRuntime(directory,{enabled:true,
    simulator:createDeepSeekTransport(credential,{requestImpl,telemetry})});
  t.after(()=>{try{runtime.close();}catch{}});
  runtime.startBatch();
  return {runtime,directory,telemetry,calls:()=>calls};
}

test('credential echo is detected in raw text, JSON escapes and unicode escapes',async t=>{
  const credential='DUMMY-R4-CREDENTIAL-ECHO';
  assert.equal(credentialEchoDetected(credential,credential),true);
  const escaped=[...credential].map(character=>'\\u'+character.codePointAt(0)
    .toString(16).padStart(4,'0')).join('');
  assert.equal(escaped.includes(credential),false);
  assert.equal(credentialEchoDetected(escaped,credential),true);
  const quoted='AB'+String.fromCharCode(34)+'CD-EF';
  assert.equal(credentialEchoDetected(JSON.stringify({value:quoted}),quoted),true);
  assert.equal(credentialEchoDetected('plain text',quoted),false);

  const cases=[
    ['raw content',echoed=>{echoed.choices[0].message.content=
      echoed.choices[0].message.content+credential;}],
    ['unicode escaped content',echoed=>{echoed.choices[0].message.content=
      echoed.choices[0].message.content+escaped;}],
    ['parsed json field',echoed=>{echoed.diagnosticEcho=credential;}]
  ];
  for(const [name,echoAtWake] of cases){
    await t.test(name,async t=>{
      const value=echoTransportRuntime(t,{credential,echoAtWake});
      await value.runtime.executeBatch();
      assert.deepEqual(value.telemetry.snapshot(),
        {networkAttempts:4,realModelRequests:4,requestOutcomeKnown:true});
      assert.equal(value.calls(),4);
      const run=value.runtime.readReceipt().runs[0];
      assert.notEqual(run.status,'completed');
      assert.equal(run.error,'provider_or_validation_failure');
      assert.equal(run.billing.rows.filter(row=>row.status==='settled').length,3);
      assert.equal(run.billing.rows.at(-1).status,'unknown');
      assert.equal(run.billing.unknownReservedMicroCny,'35968');
      assert.equal(Object.keys(value.runtime.store.state.entries).length,0);
      assert.equal(run.diagnostics.length,1);
      assert.equal(run.diagnostics[0].credentialEchoRejected,true);
      assert.equal(run.diagnostics[0].responseAvailable,false);
      assert.equal(JSON.stringify(run.diagnostics).includes(credential),false);
      assert.equal(JSON.stringify(run.diagnostics).includes(escaped),false);
      value.runtime.close();
      assertRawFilesDoNotContain(value.directory,[credential,escaped]);
    });
  }
});

test('fifth call, second run, restart and a foreign directory are refused',async t=>{
  const value=syntheticRuntime(t);
  await value.runtime.executeBatch();
  assert.equal(value.calls(),4);
  assert.equal(value.runtime.ledger.status('nv-dream-climate-one-dream-r4-001').calls,4);
  let fifth=false;
  try{value.runtime.assertCallCapacity();}catch(error){
    fifth=error.message==='dream_climate_live_total_call_limit';
  }
  assert.equal(fifth,true);
  await assert.rejects(()=>value.runtime.executeRun('nv-dream-climate-one-dream-r4-b'),
    /unknown_run/);
  const beforeRestart=value.runtime.ledger.status('nv-dream-climate-one-dream-r4-001').calls;
  const restarted=await value.runtime.executeRun(r4RunId);
  assert.equal(restarted.status,'completed');
  assert.equal(value.runtime.ledger.status('nv-dream-climate-one-dream-r4-001').calls,
    beforeRestart);
  assert.equal(value.calls(),4);
  const parent=temporary();t.after(()=>fs.rmSync(parent,{recursive:true,force:true}));
  const foreign=path.join(parent,r4StoreBasename);
  fs.mkdirSync(foreign);
  assert.throws(()=>assertDirectoryAbsent(foreign),
    /dream_climate_r4_store_already_exists/);
  assert.throws(()=>assertR4StorePath(foreign),
    /dream_climate_r4_store_path_mismatch/);
  assert.throws(()=>assertR4StoreAbsent(foreign),
    /dream_climate_r4_store_path_mismatch/);
});

test('only the exact R4 release opens R4 and identity drift is refused',t=>{
  const parent=temporary();t.after(()=>fs.rmSync(parent,{recursive:true,force:true}));
  assert.throws(()=>readR4Release(path.join(parent,'release.json')),
    /dream_climate_r4_release_required/);
  const old=path.join(parent,'old.json');
  fs.writeFileSync(old,JSON.stringify(liveReleaseObject()));
  assert.throws(()=>readR4Release(old),/dream_climate_r4_release_shape/);
  const tampered=path.join(parent,'tampered.json');
  fs.writeFileSync(tampered,
    JSON.stringify({...r4ReleaseObject(),allowanceCapMicroCny:999999}));
  assert.throws(()=>readR4Release(tampered),/dream_climate_r4_release_mismatch/);
  const exact=path.join(parent,'exact.json');
  fs.writeFileSync(exact,JSON.stringify(r4ReleaseObject()));
  assert.deepEqual(readR4Release(exact),r4ReleaseObject());
  const copy=path.join(parent,'pkg');
  fs.mkdirSync(copy);
  for(const name of fs.readdirSync(r4PackageDirectory))
    fs.copyFileSync(path.join(r4PackageDirectory,name),path.join(copy,name));
  assert.equal(verifyR4Identity({directory:copy}).identityHash,
    verifyR4Identity().identityHash);
  fs.appendFileSync(path.join(copy,'worker.mjs'),'\n// synthetic identity drift\n');
  assert.throws(()=>verifyR4Identity({directory:copy}),
    /invalid_dream_climate_r4_identity_manifest/);
});

test('the new R4 release cannot open the closed R3 entry',async()=>{
  const result=await launchLive('run');
  assert.equal(result.status,'blocked');
  assert.equal(result.ready,false);
  assert.equal(result.reason,'OFFLINE_REVIEW_REQUIRED_R3');
  assert.equal(result.liveEntryClosed,true);
  assert.equal(result.credentialSupplierCalls,0);
  assert.equal(result.networkAttempts,0);
  assert.equal(result.realModelRequests,0);
  assert.equal(result.requestOutcomeKnown,true);
  assert.equal(result.storeCreated,false);
  assert.equal(result.executed,false);
});

test('R4 price evidence pins the reviewed peak page and the 0.16 CNY cap',t=>{
  const parent=temporary();t.after(()=>fs.rmSync(parent,{recursive:true,force:true}));
  const file=path.join(parent,'pricing.html');
  fs.writeFileSync(file,'<html><body>unreviewed price page</body></html>');
  assert.throws(()=>verifyR4PriceEvidence(file),
    /dream_climate_r4_price_page_changed/);
  assert.throws(()=>verifyR4PriceEvidence(path.join(parent,'missing.html')),
    /dream_climate_r4_price_evidence_unreadable/);
  assert.throws(()=>verifyR4PriceEvidence('pricing.html'),
    /dream_climate_r4_price_evidence_path_required/);
  if(!fs.existsSync(officialPrice))return;
  const price=verifyR4PriceEvidence(officialPrice);
  assert.equal(price.pageSha256,
    '556097caba8adfeeed6455714bffd731c7f60db520fcee06a922eba5840663a3');
  assert.equal(price.inputMicroCnyPerMillion,2000000);
  assert.equal(price.outputMicroCnyPerMillion,8000000);
  assert.equal(price.worstMicroCny,143872);
  assert.equal(price.allowanceCapMicroCny,160000);
  assert.equal(price.maxOutputTokens,400);
  assert.equal(price.callsPerRun,4);
  assert.equal(price.maxRuns,1);
  assert.equal(price.contextTokenLimit,16384);
  assert.equal(price.modelAlias,'deepseek-flash');
  assert.equal(price.observedModelAlias,'DeepSeek-V4.1-Flash-1017');
});

test('dummy and admission stay exact-zero and never touch the real Store',async t=>{
  assert.equal(fs.existsSync(r4StoreDirectory),false);
  const dummy=await runR4DummyRehearsal();
  assert.equal(dummy.status,'R4_DUMMY_REHEARSAL_PASSED');
  assert.equal(dummy.ok,true);
  assert.equal(dummy.calls,4);
  assert.equal(dummy.dispatches.length,4);
  assert.equal(dummy.receipt.completedRuns,1);
  assert.equal(dummy.receipt.batch.calls,4);
  assert.ok(dummy.receipt.runs[0].billing.rows.every(row=>row.status==='settled'));
  assert.equal(dummy.fifthCallRefused,true);
  assert.equal(dummy.secondRunRefused,true);
  assert.equal(dummy.restartRefused,true);
  assert.equal(dummy.storeContract.existingDirectoryRefused,true);
  assert.equal(dummy.storeContract.ownerLockObserved,true);
  assert.equal(dummy.storeContract.ownerLockCleared,true);
  assert.equal(dummy.storeContract.storeDeleted,true);
  assert.deepEqual(dummy.boundaries,{networkAttempts:0,realModelRequests:0,
    credentialReads:0,requestOutcomeKnown:true,realUserStoreAccessed:false,
    realStoreCreated:false,paidCalls:0,costMicroCny:0,automaticRetries:0,
    secondRunStarted:false,laterRecollectionsEmpty:true});
  assert.equal(fs.existsSync(r4StoreDirectory),false);
  if(!fs.existsSync(officialPrice))return;
  const admission=await runR4Admission(officialPrice);
  assert.equal(admission.status,'R4_OFFLINE_ADMISSION_PASSED');
  assert.equal(admission.ok,true);
  assert.equal(admission.offlineReview,true);
  assert.equal(admission.secureInputReady,false);
  assert.equal(admission.releasePresent,false);
  assert.equal(admission.storeExists,false);
  assert.equal(admission.credentialSupplierCalls,0);
  assert.equal(admission.credentialRead,false);
  assert.equal(admission.networkAttempts,0);
  assert.equal(admission.realModelRequests,0);
  assert.equal(admission.requestOutcomeKnown,true);
  assert.equal(admission.realStoreCreated,false);
  assert.equal(admission.runCount,1);
  assert.equal(admission.maxCalls,4);
  assert.equal(admission.dummy.status,'R4_DUMMY_REHEARSAL_PASSED');
  assert.equal(admission.dummy.calls,4);
  assert.equal(admission.dummy.fifthCallRefused,true);
  assert.equal(admission.dummy.secondRunRefused,true);
  assert.equal(admission.dummy.restartRefused,true);
  assert.equal(fs.existsSync(r4StoreDirectory),false);
});

test('worker refuses before credential, keeps exact zero and revokes any release',async t=>{
  assert.equal(fs.existsSync(r4ReleasePath),false);
  await assert.rejects(()=>runR4Worker('preflight',{
    priceFile:path.join(os.tmpdir(),'missing-pricing.html')}),
  /dream_climate_r4_release_required/);
  const absent=await runR4Worker('run',{
    priceFile:path.join(os.tmpdir(),'missing-pricing.html')});
  assert.equal(absent.status,'blocked');
  assert.equal(absent.ready,false);
  assert.equal(absent.reason,'dream_climate_r4_release_required');
  assert.equal(absent.credentialRequested,false);
  assert.equal(absent.credentialDelivered,false);
  assert.equal(absent.credentialPersisted,false);
  assert.equal(absent.networkAttempts,0);
  assert.equal(absent.realModelRequests,0);
  assert.equal(absent.requestOutcomeKnown,true);
  assert.equal(absent.storeCreated,false);
  assert.equal(absent.storeExists,false);
  assert.equal(absent.executed,false);
  assert.equal(absent.releaseRevoked,true);
  assert.equal(absent.automaticRetry,false);
  if(!fs.existsSync(officialPrice))return;
  t.after(()=>{try{fs.rmSync(r4ReleasePath,{force:true});}catch{}});
  fs.writeFileSync(r4ReleasePath,JSON.stringify(r4ReleaseObject()));
  const preflight=staticR4Preflight(officialPrice);
  assert.equal(preflight.nextRequestBytes,4855);
  assert.equal(preflight.nextReservationMicroCny,35968);
  assert.equal(preflight.release.allowanceCapMicroCny,160000);
  const input=new PassThrough();
  const pending=runR4Worker('run',{priceFile:officialPrice,credentialSource:input});
  input.end(JSON.stringify({unexpected:true}));
  const refused=await pending;
  assert.equal(refused.status,'blocked');
  assert.equal(refused.reason,'dream_climate_r4_credential_source_unavailable');
  assert.equal(refused.credentialRequested,true);
  assert.equal(refused.credentialDelivered,false);
  assert.equal(refused.credentialPersisted,false);
  assert.equal(refused.networkAttempts,0);
  assert.equal(refused.realModelRequests,0);
  assert.equal(refused.requestOutcomeKnown,true);
  assert.equal(refused.storeCreated,false);
  assert.equal(refused.executed,false);
  assert.equal(refused.automaticRetry,false);
  assert.equal(refused.releaseRevoked,true);
  assert.equal(fs.existsSync(r4ReleasePath),false);
  assert.equal(fs.existsSync(r4StoreDirectory),false);
});
