import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {EventEmitter} from 'node:events';
import {
  liveExpectedReleaseHash,livePricePageSha256,liveReleasePath,liveStoreBasename
} from '../scripts/nv-dream-climate-offline-01/phase-b/config.mjs';
import {runDummyRehearsal,createDummySimulator} from '../scripts/nv-dream-climate-offline-01/phase-b/dummy.mjs';
import {verifyLiveIdentity} from '../scripts/nv-dream-climate-offline-01/phase-b/identity.mjs';
import {
  blockedLauncherReceipt,launchLive
} from '../scripts/nv-dream-climate-offline-01/phase-b/launcher.mjs';
import {liveRunIds} from '../scripts/nv-dream-climate-offline-01/phase-b/matrix.mjs';
import {liveReleaseObject,revokeLiveRelease} from '../scripts/nv-dream-climate-offline-01/phase-b/release.mjs';
import {DreamClimateLiveRuntime} from '../scripts/nv-dream-climate-offline-01/phase-b/runtime.mjs';
import {createLiveDispatchTelemetry} from '../scripts/nv-dream-climate-offline-01/phase-b/telemetry.mjs';
import {createDeepSeekTransport} from '../scripts/nv-dream-climate-offline-01/phase-b/transport.mjs';
import {buildBlockedWorkerReceipt} from '../scripts/nv-dream-climate-offline-01/phase-b/worker.mjs';

const temporary=()=>fs.mkdtempSync(path.join(os.tmpdir(),'nv-dream-climate-live-r2-'));
const officialPrice=()=>path.join(process.env.USERPROFILE??'','Desktop','deepseek-pricing-r1.html');

function fakeProvider({failAt=null}={}){
  const simulator=createDummySimulator();
  let calls=0;
  const requestImpl=(url,options,callback)=>{
    calls++;
    const req=new EventEmitter();
    req.setTimeout=()=>{};
    req.destroy=()=>{};
    req.end=payload=>{
      const body=JSON.parse(payload.toString('utf8'));
      if(calls===failAt){
        setTimeout(()=>req.emit('error',Error('provider_http_failure')),0);
        return;
      }
      Promise.resolve(simulator({body})).then(response=>{
        const res=new EventEmitter();
        res.statusCode=response.status;res.headers={'content-type':'application/json'};
        res.resume=()=>{};
        setImmediate(()=>{
          callback(res);
          res.emit('data',Buffer.from(JSON.stringify(response.body),'utf8'));
          res.emit('end');
        });
      }).catch(error=>setTimeout(()=>req.emit('error',error),0));
    };
    return req;
  };
  return {requestImpl,calls:()=>calls};
}

async function openRuntime(t,{failAt=null}={}){
  const parent=temporary();
  t.after(()=>fs.rmSync(parent,{recursive:true,force:true}));
  const directory=path.join(parent,liveStoreBasename);
  const telemetry=createLiveDispatchTelemetry();
  const provider=fakeProvider({failAt});
  const runtime=new DreamClimateLiveRuntime(directory,{enabled:true,
    simulator:createDeepSeekTransport('DUMMY-R2-KEY',{requestImpl:provider.requestImpl,telemetry})});
  t.after(()=>{try{runtime.close();}catch{}});
  runtime.startBatch();
  return {runtime,telemetry,provider};
}

test('dispatch telemetry separates pre-credential zero from post-dispatch failure',()=>{
  const telemetry=createLiveDispatchTelemetry();
  assert.deepEqual(telemetry.snapshot(),
    {networkAttempts:0,realModelRequests:0,requestOutcomeKnown:true});
  const before=buildBlockedWorkerReceipt('before_transport',{credentialRequested:true,telemetry});
  assert.equal(before.networkAttempts,0);
  assert.equal(before.realModelRequests,0);
  assert.equal(before.requestOutcomeKnown,true);
  telemetry.recordNetworkAttempt();
  telemetry.recordRealModelRequest();
  const after=buildBlockedWorkerReceipt('after_dispatch',{credentialRequested:true,telemetry});
  assert.equal(after.networkAttempts,1);
  assert.equal(after.realModelRequests,1);
  assert.equal(after.requestOutcomeKnown,true);
  assert.equal(after.executed,true);
});

test('first live dispatch failure reports 1/1 and leaves the only ledger row unknown',async t=>{
  const {runtime,telemetry,provider}=await openRuntime(t,{failAt:1});
  const status=await runtime.executeRun(liveRunIds[0]);
  assert.notEqual(status.status,'completed');
  assert.deepEqual(telemetry.snapshot(),
    {networkAttempts:1,realModelRequests:1,requestOutcomeKnown:true});
  assert.equal(provider.calls(),1);
  const receipt=runtime.readReceipt(),run=receipt.runs[0];
  assert.equal(run.billing.calls,1);
  assert.equal(run.billing.rows.length,1);
  assert.equal(run.billing.rows[0].status,'unknown');
  await runtime.executeRun(liveRunIds[0]);
  assert.equal(provider.calls(),1);
});

test('two successful calls followed by a third failure report 3/3 without retry',async t=>{
  const {runtime,telemetry,provider}=await openRuntime(t,{failAt:3});
  const status=await runtime.executeRun(liveRunIds[0]);
  assert.notEqual(status.status,'completed');
  assert.deepEqual(telemetry.snapshot(),
    {networkAttempts:3,realModelRequests:3,requestOutcomeKnown:true});
  assert.equal(provider.calls(),3);
  const receipt=runtime.readReceipt(),run=receipt.runs[0];
  assert.equal(run.billing.calls,3);
  assert.deepEqual(run.billing.rows.map(row=>row.status),['settled','settled','unknown']);
  await runtime.executeRun(liveRunIds[0]);
  assert.equal(provider.calls(),3);
});

test('successful fake live transport reports 12/12 matching twelve ledger rows',async t=>{
  const {runtime,telemetry,provider}=await openRuntime(t);
  const statuses=[];
  for(const runId of liveRunIds){
    const status=await runtime.executeRun(runId);statuses.push(status.status);
    if(status.status!=='completed')break;
  }
  assert.deepEqual(statuses,['completed','completed','completed']);
  assert.deepEqual(telemetry.snapshot(),
    {networkAttempts:12,realModelRequests:12,requestOutcomeKnown:true});
  assert.equal(provider.calls(),12);
  const receipt=runtime.readReceipt();
  assert.equal(receipt.completedRuns,3);
  assert.equal(receipt.batch.calls,12);
  assert.equal(receipt.runs.flatMap(run=>run.billing.rows).length,12);
  assert.ok(receipt.runs.flatMap(run=>run.billing.rows)
    .every(row=>row.status==='settled'));
});

test('R2 child-unknown classification remains conservative without a live child',()=>{
  const before=blockedLauncherReceipt('before_transport');
  assert.equal(before.networkAttempts,0);
  assert.equal(before.realModelRequests,0);
  assert.equal(before.requestOutcomeKnown,true);
  assert.equal(before.storeCreated,false);
  const abnormal=blockedLauncherReceipt('worker_failed_after_delivery',{
    credentialSupplierCalls:1,credentialDelivered:true});
  assert.equal(abnormal.status,'blocked');
  assert.equal(abnormal.credentialSupplierCalls,1);
  assert.equal(abnormal.networkAttempts,null);
  assert.equal(abnormal.realModelRequests,null);
  assert.equal(abnormal.requestOutcomeKnown,false);
  assert.equal(abnormal.storeCreated,null);
});

test('live launcher refuses R3 before supplier, Store or network',async()=>{
  let supplierCalls=0;
  const value=await launchLive('run',{priceFile:path.join(os.tmpdir(),'not-read.html'),
    credentialSupplier:()=>{supplierCalls++;return 'DUMMY-R2-KEY';}});
  assert.equal(value.status,'blocked');
  assert.equal(value.reason,'OFFLINE_REVIEW_REQUIRED_R3');
  assert.equal(value.offlineReview,true);
  assert.equal(value.credentialSupplierCalls,0);
  assert.equal(value.networkAttempts,0);
  assert.equal(value.realModelRequests,0);
  assert.equal(value.requestOutcomeKnown,true);
  assert.equal(value.storeCreated,false);
  assert.equal(supplierCalls,0);
});

test('preflight is closed and dummy stays at exact zero with known outcome',async()=>{
  const preflight=await launchLive('preflight',{priceFile:path.join(os.tmpdir(),'not-read.html')});
  assert.equal(preflight.status,'blocked');
  assert.equal(preflight.reason,'OFFLINE_REVIEW_REQUIRED_R3');
  assert.equal(preflight.networkAttempts,0);
  assert.equal(preflight.realModelRequests,0);
  assert.equal(preflight.requestOutcomeKnown,true);
  assert.equal(preflight.storeCreated,false);
  const dummy=await runDummyRehearsal();
  assert.equal(dummy.ok,true);
  assert.equal(dummy.calls,12);
  assert.equal(dummy.boundaries.networkAttempts,0);
  assert.equal(dummy.boundaries.realModelRequests,0);
  assert.equal(dummy.boundaries.requestOutcomeKnown,true);
});
