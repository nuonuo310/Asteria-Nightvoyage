import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {PassThrough} from 'node:stream';
import {fileURLToPath} from 'node:url';
import {hash} from '../src/contract.js';
import {launchInlinePaid} from '../src/inline-paid-entry.js';
import {launchRichSampleLive} from '../scripts/nv-rich-fictional-dream-sample-01/live-launcher.mjs';
import {
  liveAllowanceCapMicroCny,liveExpectedReleaseHash,liveMaxCalls,liveRunCount,
  liveStoreBasename,liveStoreDirectory,liveStoreParent,liveStorePrefix
} from '../scripts/nv-dream-climate-offline-01/phase-b/config.mjs';
import {
  createLiveIdentityManifest,validateLiveIdentityManifest,verifyLiveIdentity
} from '../scripts/nv-dream-climate-offline-01/phase-b/identity.mjs';
import {
  assertLiveMatrix,liveMatrix,liveMatrixHash,liveRunIds
} from '../scripts/nv-dream-climate-offline-01/phase-b/matrix.mjs';
import {
  readLiveRelease,revokeLiveRelease,validateLiveRelease,liveReleaseObject
} from '../scripts/nv-dream-climate-offline-01/phase-b/release.mjs';
import {verifyLivePriceEvidence} from '../scripts/nv-dream-climate-offline-01/phase-b/price-check.mjs';
import {
  assertLiveStoreAbsent,verifyDedicatedStorePath
} from '../scripts/nv-dream-climate-offline-01/phase-b/store-contract.mjs';
import {
  DreamClimateLiveRuntime,liveAllowance
} from '../scripts/nv-dream-climate-offline-01/phase-b/runtime.mjs';
import {
  createDummySimulator,runDummyRehearsal
} from '../scripts/nv-dream-climate-offline-01/phase-b/dummy.mjs';
import {runSecureConsole} from '../scripts/nv-dream-climate-offline-01/phase-b/secure-console.mjs';

const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const packageDirectory=path.join(root,'scripts','nv-dream-climate-offline-01','phase-b');
const temporary=()=>fs.mkdtempSync(path.join(os.tmpdir(),'nv-dream-climate-live-r1-'));
const wait=milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds));
let dummyPromise;
const dummy=()=>dummyPromise??=runDummyRehearsal();

test('R1 release is exact, hash-pinned and fails closed when absent or changed',t=>{
  const directory=temporary();t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const file=path.join(directory,'release.json'),release=liveReleaseObject();
  assert.equal(liveExpectedReleaseHash,
    'ee7ab9fbb6f71b582b442d27000d17f153dbfff1ac378ae4691cbfc869401bae');
  assert.equal(Object.keys(release).length,14);
  assert.equal(hash(release),liveExpectedReleaseHash);
  assert.deepEqual(validateLiveRelease(release),release);
  fs.writeFileSync(file,JSON.stringify(release));
  assert.deepEqual(readLiveRelease(file),release);
  fs.writeFileSync(file,JSON.stringify({...release,maxCalls:13}));
  assert.throws(()=>readLiveRelease(file),/dream_climate_live_release_mismatch/);
  assert.throws(()=>readLiveRelease(path.join(directory,'missing.json')),
    /dream_climate_live_release_required/);
  assert.equal(revokeLiveRelease(file),true);
});

test('live identity pins the frozen five blobs, matrix, price and every new execution file',()=>{
  const manifest=createLiveIdentityManifest();
  const current=createLiveIdentityManifest();
  assert.deepEqual(validateLiveIdentityManifest(manifest,current),manifest);
  assert.equal(manifest.offline.identityHash,
    'f88fccb0349b0004db6c81deb0261f3d620f06480ab24b4a9c3aee2f94cfae28');
  assert.deepEqual(Object.keys(manifest.offline.executionFiles).sort(),[
    'fixtures.mjs','generate-identity.mjs','identity.mjs','offline-check.mjs','protocol.mjs'
  ]);
  assert.equal(manifest.matrixHash,liveMatrixHash);
  assert.equal(manifest.releaseHash,liveExpectedReleaseHash);
  assert.equal(manifest.store.directory,liveStoreDirectory);
  assert.equal(manifest.maxCalls,12);
  assert.equal(manifest.allowanceCapMicroCny,480000);
  const onDisk=JSON.parse(fs.readFileSync(path.join(packageDirectory,'identity.json'),'utf8'));
  const verified=verifyLiveIdentity();
  assert.equal(verified.liveIdentityHash,hash(onDisk));
  const altered=structuredClone(manifest);altered.matrixHash='0'.repeat(64);
  assert.throws(()=>validateLiveIdentityManifest(altered,current),
    /invalid_dream_climate_live_identity_manifest/);
});

test('fixed matrix is exact, unique and rejects duplicate or fourth assignments',()=>{
  assertLiveMatrix();
  assert.deepEqual(liveMatrix.map(entry=>entry.plan.climate),
    ['ordinary','uneasy','nightmare']);
  assert.deepEqual(liveMatrix.map(entry=>entry.plan.mechanism),
    ['transformation','spatial_dislocation','temporal_recurrence']);
  assert.deepEqual(liveMatrix.map(entry=>entry.plan.foregroundAnchor),
    ['cup_tap','rain_street','ticket_date']);
  assert.deepEqual(liveMatrix.map(entry=>entry.plan.usedForegroundAnchors),
    [[],['cup_tap'],['cup_tap','rain_street']]);
  assert.deepEqual(liveMatrix.map(entry=>entry.plan.usedMechanisms),
    [[],['transformation'],['transformation','spatial_dislocation']]);
  const altered=structuredClone(liveMatrix);altered[1].plan.mechanism='transformation';
  assert.throws(()=>assertLiveMatrix(altered),/dream_climate_live_matrix_mismatch/);
  assert.throws(()=>assertLiveMatrix(structuredClone(liveMatrix).slice(0,2)),
    /dream_climate_live_matrix_mismatch/);
});

test('dedicated Store is path-exact and dummy proves owner.lock plus cleanup in a temp basename Store',async t=>{
  assert.equal(liveStoreDirectory,
    'C:\\Users\\Administrator\\AppData\\Local\\Nightvoyage\\nightvoyage-dream-climate-live-01');
  assert.equal(liveStoreParent,path.dirname(liveStoreDirectory));
  assert.equal(liveStoreBasename,path.basename(liveStoreDirectory));
  assert.ok(liveStoreBasename.startsWith(liveStorePrefix));
  const contract=verifyDedicatedStorePath();
  assert.equal(contract.directory,liveStoreDirectory);
  assert.equal(contract.realPathVerified,true);
  assert.throws(()=>verifyDedicatedStorePath(path.join(os.tmpdir(),liveStoreBasename)),
    /dream_climate_live_dedicated_store_required/);
  const parent=temporary();t.after(()=>fs.rmSync(parent,{recursive:true,force:true}));
  const absent=path.join(parent,liveStoreBasename);
  assert.deepEqual(assertLiveStoreAbsent(absent),{exists:false,symlink:false});
  fs.mkdirSync(absent);
  assert.throws(()=>assertLiveStoreAbsent(absent),/dream_climate_live_store_already_exists/);
  const value=await dummy();
  assert.equal(value.status,'DUMMY_REHEARSAL_PASSED');
  assert.equal(value.storeContract.ownerLockObserved,true);
  assert.equal(value.storeContract.ownerLockCleared,true);
  assert.equal(value.storeContract.storeDeleted,true);
});

test('price evidence requires the exact official page digest and reviewed text',t=>{
  const directory=temporary();t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const file=path.join(directory,'pricing.html');
  fs.writeFileSync(file,'<html><body>模型 deepseek-flash 百万tokens输入 高峰时段 2元 百万tokens输出 高峰时段 8元</body></html>');
  assert.throws(()=>verifyLivePriceEvidence(file),/dream_climate_live_price_page_changed/);
  assert.throws(()=>verifyLivePriceEvidence(path.join(directory,'missing.html')),
    /dream_climate_live_price_evidence_unreadable/);
  const official=path.join(process.env.USERPROFILE??'','Desktop','deepseek-pricing-r1.html');
  if(fs.existsSync(official)){
    const value=verifyLivePriceEvidence(official);
    assert.equal(value.pageSha256,
      '556097caba8adfeeed6455714bffd731c7f60db520fcee06a922eba5840663a3');
    assert.equal(value.inputMicroCnyPerMillion,2000000);
    assert.equal(value.outputMicroCnyPerMillion,8000000);
  }
});

test('dummy completes three fixed runs, twelve calls and isolated per-run ledgers with full records',async()=>{
  const value=await dummy();
  assert.equal(value.ok,true);
  assert.equal(value.calls,12);
  assert.equal(value.receipt.completedRuns,3);
  assert.equal(value.receipt.batch.calls,12);
  assert.ok(BigInt(value.receipt.batch.chargedMicroCny)<=BigInt(liveAllowanceCapMicroCny));
  assert.equal(value.thirteenthRefused,true);
  assert.equal(value.fourthRunRefused,true);
  assert.equal(value.retryRefused,true);
  assert.deepEqual(value.dispatches.map(item=>`${item.stage}:${item.sceneIndex}`),
    ['scene:0','scene:1','scene:2','wake:3','scene:0','scene:1','scene:2','wake:3',
      'scene:0','scene:1','scene:2','wake:3']);
  assert.deepEqual(value.receipt.runs.map(run=>run.status),['completed','completed','completed']);
  assert.deepEqual(value.receipt.runs.map(run=>run.climate),
    ['ordinary','uneasy','nightmare']);
  assert.deepEqual(value.receipt.runs.map(run=>run.mechanism),
    ['transformation','spatial_dislocation','temporal_recurrence']);
  assert.deepEqual(value.receipt.runs.map(run=>run.foregroundAnchor),
    ['cup_tap','rain_street','ticket_date']);
  assert.deepEqual(value.receipt.runs.map(run=>run.firstFeeling.status),
    ['present','absent','omitted']);
  for(const run of value.receipt.runs){
    assert.equal(run.scenes.length,3);
    assert.equal(run.billing.calls,4);
    assert.equal(run.billing.rows.length,4);
    assert.deepEqual(run.billing.rows.map(row=>row.status),['settled','settled','settled','settled']);
    assert.ok(run.billing.rows.every(row=>row.usage.inputTokens<=16384));
    const source=run.scenes[run.wake.fragmentBasis.sceneIndex].event;
    assert.ok(source.includes(run.wake.fragment));
  }
  assert.deepEqual(value.boundaries.laterRecollectionsEmpty,true);
  assert.equal(value.boundaries.networkAttempts,0);
  assert.equal(value.boundaries.realModelRequests,0);
  assert.equal(value.boundaries.credentialReads,0);
  assert.equal(value.boundaries.realStoreCreated,false);
  assert.equal(value.boundaries.paidCalls,0);
  assert.equal(value.boundaries.costMicroCny,0);
  assert.equal(value.boundaries.automaticRetries,0);
  assert.equal(value.boundaries.fourthRunStarted,false);
  assert.equal(value.receipt.laterRecollections.length,0);
  assert.equal(value.receipt.boundaries.climateMappedToFirstFeeling,false);
  assert.equal(value.receipt.boundaries.climateMappedToResidue,false);
  assert.equal(liveAllowance.limits.maxRuns,liveRunCount);
  assert.equal(liveAllowance.limits.maxCalls,liveMaxCalls);
});

test('cancelled in-flight response arriving late never publishes a dream or wake',async t=>{
  const parent=temporary();t.after(()=>fs.rmSync(parent,{recursive:true,force:true}));
  const directory=path.join(parent,liveStoreBasename);
  let pendingResponse,lateArrived=false,runtime;
  const dummySimulator=createDummySimulator({onDispatch:()=>{if(lateArrived)throw Error('late_dispatch');}});
  runtime=new DreamClimateLiveRuntime(directory,{enabled:true,
    simulator:request=>new Promise(resolve=>{
      pendingResponse=()=>{lateArrived=true;resolve(dummySimulator(request));};
    }),
    fault:name=>{
      if(name==='dream_climate_live_dispatched')setTimeout(()=>runtime.cancel(liveRunIds[0]),5);
    }});
  runtime.startBatch();
  const status=await runtime.executeRun(liveRunIds[0]);
  assert.ok(['cancelled','failed','uncertain'].includes(status.status));
  assert.equal(typeof pendingResponse,'function');
  pendingResponse();
  await wait(20);
  const receipt=runtime.readReceipt();
  assert.equal(receipt.completedRuns,0);
  const run=receipt.runs[0];
  assert.notEqual(run.status,'completed');
  assert.equal(run.billing.calls,1);
  assert.equal(run.billing.rows[0].status,'unknown');
  assert.equal(run.scenesSaved,0);
  assert.equal(lateArrived,true);
  const entries=Object.values(runtime.store.state.entries);
  assert.equal(entries.length,0);
  runtime.close();runtime=undefined;
  assert.equal(fs.existsSync(path.join(directory,'owner.lock')),false);
});

test('secure console now refuses before stdin, credential supplier or live launch',async()=>{
  const input=new PassThrough();
  const result=await runSecureConsole({priceFile:path.join(root,'package.json'),input});
  assert.equal(result.status,'blocked');
  assert.equal(result.reason,'OFFLINE_REVIEW_REQUIRED_R3');
  assert.equal(result.credentialSupplierCalls,0);
  assert.equal(result.networkAttempts,0);
  assert.equal(result.realModelRequests,0);
  assert.equal(result.storeCreated,false);
  assert.equal(input.listenerCount('data'),0);
  assert.equal(input.listenerCount('readable'),0);
});

test('secure-input and launchers contain only the R3 offline refusal path',()=>{
  const ps=fs.readFileSync(path.join(packageDirectory,'secure-input.ps1'),'utf8');
  const launcher=fs.readFileSync(path.join(packageDirectory,'launcher.mjs'),'utf8');
  const worker=fs.readFileSync(path.join(packageDirectory,'worker.mjs'),'utf8');
  assert.equal(ps.includes('Read-Host'),false);
  assert.equal(ps.includes('SecureString'),false);
  assert.equal(ps.includes('OFFLINE_REVIEW_REQUIRED_R3'),true);
  assert.equal(ps.includes('NIGHTVOYAGE_DEEPSEEK_KEY'),false);
  assert.equal(ps.includes('Get-Clipboard'),false);
  assert.equal(ps.includes('Get-Credential'),false);
  assert.equal(ps.includes('Set-Content'),false);
  assert.equal(ps.includes('$env:'),false);
  assert.equal(ps.includes('nightvoyage-dream-climate-live-01'),false);
  assert.equal(ps.includes('New-Object'),false);
  assert.equal(ps.includes('api.deepseek.com'),false);
  assert.equal(ps.includes('--climate'),false);
  assert.equal(ps.includes('forceClimate'),false);
  assert.equal(launcher.includes('process.env.NIGHTVOYAGE'),false);
  assert.equal(worker.includes('process.env.NIGHTVOYAGE'),false);
  assert.equal(launcher.includes('OFFLINE_REVIEW_REQUIRED_R3'),false);
  assert.equal(launcher.includes('offlineReviewReceipt'),true);
  assert.equal(worker.includes('offlineReviewReceipt'),true);
});

test('old paid and rich live entries still refuse before credentials, Store or network',async t=>{
  const parent=temporary();t.after(()=>fs.rmSync(parent,{recursive:true,force:true}));
  const storePath=path.join(parent,'ordinary-store');
  let supplierCalls=0,fetchCalls=0;
  const nativeFetch=globalThis.fetch;
  globalThis.fetch=()=>{fetchCalls++;throw Error('network_forbidden');};
  try{
    const rich=launchRichSampleLive(storePath,{credentialSupplier:()=>{
      supplierCalls++;return 'SENTINEL';
    }});
    assert.equal(rich.status,'refused');
    assert.equal(rich.reason,'rich_sample_phase_b_release_required');
    assert.equal(rich.credentialSupplierCalls,0);
    let paidError;
    try{
      await launchInlinePaid('preflight',storePath,{credentialSupplier:()=>{
        supplierCalls++;return 'SENTINEL';
      }});
    }catch(error){paidError=error.message;}
    assert.equal(paidError,'inline_paid_entry_refused');
  }finally{globalThis.fetch=nativeFetch;}
  assert.equal(supplierCalls,0);
  assert.equal(fetchCalls,0);
  assert.equal(fs.existsSync(storePath),false);
  assert.equal(fs.existsSync(path.join(storePath,'owner.lock')),false);
});
