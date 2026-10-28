// R6 single-dream worker. The live path is closed until the secure entry has
// completed admission, written one temporary release and received the exact
// credential_required notice. It never reads a Key from the environment,
// clipboard, command line or any Store.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readInlineCredentialFrame} from '../../../src/inline-credential-pipe.js';
import {Store,fail} from '../../../src/store.js';
import {assertRequestBounds,buildDreamStageRequest} from '../protocol.mjs';
import {createLiveDispatchTelemetry} from '../phase-b/telemetry.mjs';
import {createDeepSeekTransport} from '../phase-b/transport.mjs';
import {
  r6AllowanceCapMicroCny,r6AllowanceId,r6CallsPerRun,r6Endpoint,r6MaxCalls,
  r6MaxOutputTokens,r6PerCallMaximumMicroCny,r6PricePageSha256,r6ReceiptFileName,
  r6ReleasePath,r6RequestByteLimit,r6RunCount,r6RunId,r6ScenesPerRun,
  r6StoreBasename,r6StoreDirectory,r6WorstMicroCny,r6WorkerVersion
} from './config.mjs';
import {
  r6ExpectedReleaseHash,readR6Release,revokeR6Release
} from './release.mjs';
import {verifyR6Identity} from './identity.mjs';
import {verifyR6PriceEvidence} from './price-check.mjs';
import {r6Matrix} from './matrix.mjs';
import {r6PriceSnapshotHash} from './price.mjs';
import {extractR6Receipt} from './records.mjs';
import {DreamClimateR6Runtime} from './runtime.mjs';
import {
  assertR6DirectoryAbsent,assertR6StoreAbsent
} from './store-contract.mjs';
import {r6ReceiptPath,writeR6Receipt} from './receipt.mjs';

function syntheticStoreDirectory(root){
  if(typeof root!=='string'||!path.isAbsolute(root))
    fail('dream_climate_r6_synthetic_store_root_invalid');
  const resolved=path.resolve(root),temporary=path.resolve(os.tmpdir());
  const relative=path.relative(temporary,resolved);
  if(relative.startsWith('..')||path.isAbsolute(relative))
    fail('dream_climate_r6_synthetic_store_root_invalid');
  return path.join(resolved,r6StoreBasename);
}

function blocked(reason,{credentialRequested=false,credentialDelivered=false,
  telemetry=createLiveDispatchTelemetry(),storeCreated=false,
  requestOutcomeKnown=undefined,receiptWrite=null,storeDirectory=r6StoreDirectory,
  releaseFile=r6ReleasePath}={}){
  const dispatch=telemetry.snapshot();
  const known=requestOutcomeKnown===undefined?dispatch.requestOutcomeKnown:
    requestOutcomeKnown;
  return {status:'blocked',ready:false,reason,workerVersion:r6WorkerVersion,profile:'r6',
    credentialRequested,credentialDelivered,credentialPersisted:false,
    storeDirectory,storeExists:fs.existsSync(storeDirectory),storeCreated,
    ownerLockCleared:storeCreated?!fs.existsSync(path.join(storeDirectory,'owner.lock')):null,
    releaseRevoked:!fs.existsSync(releaseFile),
    receiptFile:r6ReceiptPath(storeDirectory),
    receiptWritten:receiptWrite?.written===true,
    receiptWriteFailed:receiptWrite!==null&&receiptWrite?.written!==true,
    receiptWriteError:receiptWrite?.error??null,
    networkAttempts:known?dispatch.networkAttempts:null,
    realModelRequests:known?dispatch.realModelRequests:null,
    requestOutcomeKnown:known,automaticRetry:false,replacementRun:false,
    secondRun:false,executed:known&&dispatch.realModelRequests>0};
}

export function staticR6Preflight(priceFile,{releaseFile=r6ReleasePath,
  syntheticStoreRoot}={}){
  const release=readR6Release(releaseFile);
  const identity=verifyR6Identity();
  const price=verifyR6PriceEvidence(priceFile);
  const storeDirectory=syntheticStoreRoot===undefined?r6StoreDirectory:
    syntheticStoreDirectory(syntheticStoreRoot);
  if(syntheticStoreRoot===undefined)assertR6StoreAbsent();
  else assertR6DirectoryAbsent(storeDirectory);
  const request=buildDreamStageRequest({run:r6Matrix[0].plan,previousScenes:[],stage:'scene'});
  const nextRequestBytes=assertRequestBounds(request);
  if(nextRequestBytes>r6RequestByteLimit||r6PerCallMaximumMicroCny!==35968||
     r6PerCallMaximumMicroCny*r6MaxCalls!==r6WorstMicroCny||
     r6WorstMicroCny>r6AllowanceCapMicroCny)fail('dream_climate_r6_budget_mismatch');
  if(release.executionDigest!==identity.executionDigest||
     release.executionDigest!==identity.executionPin)
    fail('dream_climate_r6_execution_pin_mismatch');
  if(release.storeDirectory!==r6StoreDirectory||
     release.receiptFile!==r6ReceiptFileName||
     release.allowanceId!==r6AllowanceId||release.runId!==r6RunId||
     release.allowanceCapMicroCny!==r6AllowanceCapMicroCny||
     release.perCallMaximumMicroCny!==r6PerCallMaximumMicroCny||
     release.worstMicroCny!==r6WorstMicroCny||release.maxRuns!==r6RunCount||
     release.maxCalls!==r6MaxCalls||release.scenesPerRun!==r6ScenesPerRun||
     release.callsPerRun!==r6CallsPerRun||release.noRetry!==true||
     release.pricePageSha256!==r6PricePageSha256||
     release.priceSnapshotHash!==r6PriceSnapshotHash)
    fail('dream_climate_r6_release_mismatch');
  return {release,identity,price,storeDirectory,nextRequestBytes,
    nextReservationMicroCny:r6PerCallMaximumMicroCny};
}

function readyReceipt(state){
  return {status:'ready',ready:true,workerVersion:r6WorkerVersion,profile:'r6',
    credentialRequested:false,credentialDelivered:false,credentialSupplierCalls:0,
    storeCreated:false,storeExists:fs.existsSync(state.storeDirectory),
    networkAttempts:0,realModelRequests:0,
    requestOutcomeKnown:true,release:state.release,releaseHash:r6ExpectedReleaseHash,
    r6Identity:state.identity,price:state.price,priceEvidence:state.price,
    nextRequestBytes:state.nextRequestBytes,nextReservationMicroCny:state.nextReservationMicroCny,
    runCount:r6RunCount,scenesPerRun:r6ScenesPerRun,maxCalls:r6MaxCalls,
    allowanceCapMicroCny:r6AllowanceCapMicroCny,priceSnapshotHash:state.identity.priceSnapshotHash,
    maxOutputTokens:r6MaxOutputTokens,transportEndpoint:r6Endpoint,
    storeDirectory:state.storeDirectory,receiptFile:r6ReceiptPath(state.storeDirectory)};
}

function receiptEnvelope({status,reason,receipt,dispatch,credentialRequested,
  credentialDelivered,storeCreated,now,storeDirectory}){
  return {schemaVersion:1,status,reason:reason??null,profile:'r6',
    runId:r6RunId,storeDirectory,
    credentialRequested,credentialDelivered,credentialPersisted:false,
    storeCreated,networkAttempts:dispatch.requestOutcomeKnown?dispatch.networkAttempts:null,
    realModelRequests:dispatch.requestOutcomeKnown?dispatch.realModelRequests:null,
    requestOutcomeKnown:dispatch.requestOutcomeKnown,
    automaticRetry:false,recordedAt:now(),receipt:receipt??null};
}

export async function runR6Worker(action,{priceFile,credentialSource=process.stdin,
  releaseFile=r6ReleasePath,createRuntime,now=Date.now,syntheticStoreRoot,
  noticeStream=process.stdout}={}){
  const preflight=()=>staticR6Preflight(priceFile,{releaseFile,syntheticStoreRoot});
  if(action==='preflight')return readyReceipt(preflight());
  if(action!=='run')fail('invalid_dream_climate_r6_worker_action');
  let runtime,store,credential,credentialRequested=false,credentialDelivered=false;
  let storeCreated=false;
  const telemetry=createLiveDispatchTelemetry();
  try{
    const state=preflight();
    noticeStream.write(JSON.stringify({type:'credential_required',
      releaseHash:r6ExpectedReleaseHash,r6IdentityHash:state.identity.identityHash,
      executionDigest:state.identity.executionDigest,
      pricePageSha256:state.price.pageSha256,nextRequestBytes:state.nextRequestBytes,
      nextReservationMicroCny:state.nextReservationMicroCny})+'\n');
    credentialRequested=true;
    credential=await readInlineCredentialFrame(credentialSource,{timeoutMs:30000});
    credentialDelivered=true;
    const checked=preflight();
    const simulator=createDeepSeekTransport(credential,{telemetry});
    const runtimeFactory=createRuntime??((directory,options)=>
      new DreamClimateR6Runtime(directory,options));
    runtime=runtimeFactory(state.storeDirectory,{enabled:true,simulator,now});
    storeCreated=true;
    runtime.startBatch();
    await runtime.executeBatch();
    runtime.close();runtime=undefined;
    credential=undefined;
    revokeR6Release(releaseFile);
    store=new Store(state.storeDirectory);
    const receipt=extractR6Receipt(store,{now:now()});
    store.close();store=undefined;
    const completed=receipt.completedRuns===1;
    const dispatch=telemetry.snapshot();
    const receiptWrite=writeR6Receipt(state.storeDirectory,receiptEnvelope({
      status:completed?'completed':'blocked',
      reason:completed?null:'SINGLE_RUN_NOT_COMPLETED',
      receipt,dispatch,credentialRequested,credentialDelivered,storeCreated,now,
      storeDirectory:state.storeDirectory}),
    {now});
    return {...receipt,batchStatus:completed?'SINGLE_RUN_COMPLETE':'SINGLE_RUN_FAILED',
      release:{...checked.release,hash:r6ExpectedReleaseHash},
      r6Identity:checked.identity,priceEvidence:checked.price,
      storeDirectory:state.storeDirectory,transportEndpoint:r6Endpoint,
      stoppedAfterNonCompletedRun:!completed,releaseRevoked:true,storeClosed:true,
      credentialRequested:true,credentialDelivered:true,credentialPersisted:false,
      automaticRetry:false,
      replacementRun:false,secondRun:false,laterRecollectionsEmpty:true,
      networkAttempts:dispatch.networkAttempts,realModelRequests:dispatch.realModelRequests,
      requestOutcomeKnown:dispatch.requestOutcomeKnown,storeCreated:true,
      ownerLockCleared:!fs.existsSync(path.join(state.storeDirectory,'owner.lock')),
      receiptFile:receiptWrite.path,receiptWritten:receiptWrite.written,
      receiptWriteFailed:!receiptWrite.written,receiptWriteError:receiptWrite.error,
      receiptBytes:receiptWrite.bytes,receiptSha256:receiptWrite.sha256};
  }catch(error){
    if(runtime){try{runtime.close();}catch{}}
    if(store){try{store.close();}catch{}}
    credential=undefined;
    revokeR6Release(releaseFile);
    const reason=error?.message==='credential_pipe_refused'?
      'dream_climate_r6_credential_source_unavailable':
      (typeof error?.message==='string'&&error.message?
        error.message:'dream_climate_r6_worker_failed');
    const dispatch=telemetry.snapshot();
    let receipt=null,receiptWrite=null;
    const fallbackDirectory=syntheticStoreRoot===undefined?r6StoreDirectory:
      syntheticStoreDirectory(syntheticStoreRoot);
    if(fs.existsSync(fallbackDirectory)){
      try{
        const reader=new Store(fallbackDirectory);
        try{receipt=extractR6Receipt(reader,{now:now()});}finally{reader.close();}
      }catch{}
      if(!fs.existsSync(r6ReceiptPath(fallbackDirectory))){
        receiptWrite=writeR6Receipt(fallbackDirectory,receiptEnvelope({
          status:'blocked',reason,receipt,dispatch,credentialRequested,
          credentialDelivered,storeCreated:true,now,
          storeDirectory:fallbackDirectory}),{now});
      }
    }
    return blocked(reason,{credentialRequested,credentialDelivered,telemetry,storeCreated,
      receiptWrite,storeDirectory:fallbackDirectory,releaseFile});
  }finally{
    credential=undefined;
    if(runtime){try{runtime.close();}catch{}}
    if(store){try{store.close();}catch{}}
    revokeR6Release(releaseFile);
  }
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2),action=args.shift();
  let priceFile;
  if(args.length===2&&args[0]==='--price-file'&&path.isAbsolute(args[1]))priceFile=args[1];
  if(!['preflight','run'].includes(action)||!priceFile){
    console.error('Usage: node worker.mjs preflight|run --price-file <absolute saved pricing HTML>');
    process.exitCode=1;
  }else{
    try{
      const value=await runR6Worker(action,{priceFile});
      process.stdout.write(JSON.stringify({type:'result',value})+'\n');
      if(value.status!=='SINGLE_RUN_READY_FOR_MANUAL_CONTENT_REVIEW')process.exitCode=1;
    }catch(error){
      console.error(error?.message??'dream_climate_r6_worker_refused');
      process.exitCode=1;
    }
  }
}
