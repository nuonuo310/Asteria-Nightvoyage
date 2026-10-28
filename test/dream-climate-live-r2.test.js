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
import {launchLive} from '../scripts/nv-dream-climate-offline-01/phase-b/launcher.mjs';
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

test('launcher reports unknown after credential delivery and an abnormal worker',async t=>{
  const price=officialPrice();
  if(!fs.existsSync(price))return t.skip('official saved pricing HTML unavailable');
  const parent=temporary();t.after(()=>fs.rmSync(parent,{recursive:true,force:true}));
  const identity=verifyLiveIdentity();
  const header={type:'credential_required',releaseHash:liveExpectedReleaseHash,
    liveIdentityHash:identity.liveIdentityHash,pricePageSha256:livePricePageSha256,
    nextRequestBytes:4855,nextReservationMicroCny:35968};
  const cases=[
    ['exit',`process.stdout.write(${JSON.stringify(JSON.stringify(header))}+'\\n');
process.stdin.once('data',()=>process.exit(23));`],
    ['malformed',`process.stdout.write(${JSON.stringify(JSON.stringify(header))}+'\\n');
process.stdin.once('data',()=>{process.stdout.write('{not-json}\\n');setTimeout(()=>process.exit(24),10);});`]
  ];
  for(const [name,source] of cases){
    const worker=path.join(parent,`${name}-worker.mjs`);fs.writeFileSync(worker,source);
    const result=await launchLive('run',{priceFile:price,workerPath:worker,timeoutMs:5000,
      credentialSupplier:()=> 'DUMMY-R2-KEY'});
    assert.equal(result.status,'blocked',name);
    assert.equal(result.credentialSupplierCalls,1,name);
    assert.equal(result.networkAttempts,null,name);
    assert.equal(result.realModelRequests,null,name);
    assert.equal(result.requestOutcomeKnown,false,name);
    assert.equal(result.storeCreated,null,name);
  }
});

test('launcher preserves positive worker counts instead of replacing them with unknown',async t=>{
  const price=officialPrice();
  if(!fs.existsSync(price))return t.skip('official saved pricing HTML unavailable');
  const parent=temporary();t.after(()=>fs.rmSync(parent,{recursive:true,force:true}));
  const identity=verifyLiveIdentity();
  const header={type:'credential_required',releaseHash:liveExpectedReleaseHash,
    liveIdentityHash:identity.liveIdentityHash,pricePageSha256:livePricePageSha256,
    nextRequestBytes:4855,nextReservationMicroCny:35968};
  const result={status:'blocked',ready:false,reason:'simulated_after_dispatch',
    storeCreated:true,networkAttempts:1,realModelRequests:1,requestOutcomeKnown:true};
  const worker=path.join(parent,'counted-worker.mjs');
  fs.writeFileSync(worker,`process.stdout.write(${JSON.stringify(JSON.stringify(header))}+'\\n');
process.stdin.once('data',()=>{process.stdout.write(${JSON.stringify(JSON.stringify({type:'result',value:result}))}+'\\n');process.exit(0);});`);
  const value=await launchLive('run',{priceFile:price,workerPath:worker,timeoutMs:5000,
    credentialSupplier:()=> 'DUMMY-R2-KEY'});
  assert.equal(value.status,'blocked');
  assert.equal(value.credentialSupplierCalls,1);
  assert.equal(value.networkAttempts,1);
  assert.equal(value.realModelRequests,1);
  assert.equal(value.requestOutcomeKnown,true);
  assert.equal(value.storeCreated,true);
});

test('preflight and dummy stay at exact zero with known outcome',async t=>{
  const price=officialPrice();
  if(!fs.existsSync(price))return t.skip('official saved pricing HTML unavailable');
  if(fs.existsSync(liveReleasePath))return t.skip('temporary release path already occupied');
  fs.writeFileSync(liveReleasePath,JSON.stringify(liveReleaseObject()));
  t.after(()=>revokeLiveRelease(liveReleasePath));
  const preflight=await launchLive('preflight',{priceFile:price});
  assert.equal(preflight.status,'ready');
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
