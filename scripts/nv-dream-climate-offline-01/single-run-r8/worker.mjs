// R8 single-dream worker. The live path is closed until the secure entry has
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
  r8AllowanceCapMicroCny,r8AllowanceId,r8CallsPerRun,r8Endpoint,r8MaxCalls,
  r8MaxOutputTokens,r8PerCallMaximumMicroCny,r8PricePageSha256,r8ReceiptFileName,
  r8ReleasePath,r8RequestByteLimit,r8RunCount,r8RunId,r8ScenesPerRun,
  r8StoreBasename,r8StoreDirectory,r8WorstMicroCny,r8WorkerVersion
} from './config.mjs';
import {
  r8ExpectedReleaseHash,readR8Release,revokeR8Release
} from './release.mjs';
import {verifyR8Identity} from './identity.mjs';
import {verifyR8PriceEvidence} from './price-check.mjs';
import {r8Matrix} from './matrix.mjs';
import {r8PriceSnapshotHash} from './price.mjs';
import {extractR8Receipt} from './records.mjs';
import {DreamClimateR8Runtime} from './runtime.mjs';
import {
  assertR8DirectoryAbsent,assertR8StoreAbsent
} from './store-contract.mjs';
import {r8ReceiptPath,writeR8Receipt} from './receipt.mjs';

function syntheticStoreDirectory(root){
  if(typeof root!=='string'||!path.isAbsolute(root))
    fail('dream_climate_r8_synthetic_store_root_invalid');
  const resolved=path.resolve(root),temporary=path.resolve(os.tmpdir());
  const relative=path.relative(temporary,resolved);
  if(relative.startsWith('..')||path.isAbsolute(relative))
    fail('dream_climate_r8_synthetic_store_root_invalid');
  return path.join(resolved,r8StoreBasename);
}

function blocked(reason,{credentialRequested=false,credentialDelivered=false,
  telemetry=createLiveDispatchTelemetry(),storeCreated=false,
  requestOutcomeKnown=undefined,receiptWrite=null,storeDirectory=r8StoreDirectory,
  releaseFile=r8ReleasePath}={}){
  const dispatch=telemetry.snapshot();
  const known=requestOutcomeKnown===undefined?dispatch.requestOutcomeKnown:
    requestOutcomeKnown;
  return {status:'blocked',ready:false,reason,workerVersion:r8WorkerVersion,profile:'r8',
    credentialRequested,credentialDelivered,credentialPersisted:false,
    storeDirectory,storeExists:fs.existsSync(storeDirectory),storeCreated,
    ownerLockCleared:storeCreated?!fs.existsSync(path.join(storeDirectory,'owner.lock')):null,
    releaseRevoked:!fs.existsSync(releaseFile),
    receiptFile:r8ReceiptPath(storeDirectory),
    receiptWritten:receiptWrite?.written===true,
    receiptWriteFailed:receiptWrite!==null&&receiptWrite?.written!==true,
    receiptWriteError:receiptWrite?.error??null,
    networkAttempts:known?dispatch.networkAttempts:null,
    realModelRequests:known?dispatch.realModelRequests:null,
    requestOutcomeKnown:known,automaticRetry:false,replacementRun:false,
    secondRun:false,executed:known&&dispatch.realModelRequests>0};
}

export function staticR8Preflight(priceFile,{releaseFile=r8ReleasePath,
  syntheticStoreRoot}={}){
  const release=readR8Release(releaseFile);
  const identity=verifyR8Identity();
  const price=verifyR8PriceEvidence(priceFile);
  const storeDirectory=syntheticStoreRoot===undefined?r8StoreDirectory:
    syntheticStoreDirectory(syntheticStoreRoot);
  if(syntheticStoreRoot===undefined)assertR8StoreAbsent();
  else assertR8DirectoryAbsent(storeDirectory);
  const request=buildDreamStageRequest({run:r8Matrix[0].plan,previousScenes:[],stage:'scene'});
  const nextRequestBytes=assertRequestBounds(request);
  if(nextRequestBytes>r8RequestByteLimit||r8PerCallMaximumMicroCny!==35968||
     r8PerCallMaximumMicroCny*r8MaxCalls!==r8WorstMicroCny||
     r8WorstMicroCny>r8AllowanceCapMicroCny)fail('dream_climate_r8_budget_mismatch');
  if(release.executionDigest!==identity.executionDigest||
     release.executionDigest!==identity.executionPin)
    fail('dream_climate_r8_execution_pin_mismatch');
  if(release.storeDirectory!==r8StoreDirectory||
     release.receiptFile!==r8ReceiptFileName||
     release.allowanceId!==r8AllowanceId||release.runId!==r8RunId||
     release.allowanceCapMicroCny!==r8AllowanceCapMicroCny||
     release.perCallMaximumMicroCny!==r8PerCallMaximumMicroCny||
     release.worstMicroCny!==r8WorstMicroCny||release.maxRuns!==r8RunCount||
     release.maxCalls!==r8MaxCalls||release.scenesPerRun!==r8ScenesPerRun||
     release.callsPerRun!==r8CallsPerRun||release.noRetry!==true||
     release.pricePageSha256!==r8PricePageSha256||
     release.priceSnapshotHash!==r8PriceSnapshotHash)
    fail('dream_climate_r8_release_mismatch');
  return {release,identity,price,storeDirectory,nextRequestBytes,
    nextReservationMicroCny:r8PerCallMaximumMicroCny};
}

function readyReceipt(state){
  return {status:'ready',ready:true,workerVersion:r8WorkerVersion,profile:'r8',
    credentialRequested:false,credentialDelivered:false,credentialSupplierCalls:0,
    storeCreated:false,storeExists:fs.existsSync(state.storeDirectory),
    networkAttempts:0,realModelRequests:0,
    requestOutcomeKnown:true,release:state.release,releaseHash:r8ExpectedReleaseHash,
    r8Identity:state.identity,price:state.price,priceEvidence:state.price,
    nextRequestBytes:state.nextRequestBytes,nextReservationMicroCny:state.nextReservationMicroCny,
    runCount:r8RunCount,scenesPerRun:r8ScenesPerRun,maxCalls:r8MaxCalls,
    allowanceCapMicroCny:r8AllowanceCapMicroCny,priceSnapshotHash:state.identity.priceSnapshotHash,
    maxOutputTokens:r8MaxOutputTokens,transportEndpoint:r8Endpoint,
    storeDirectory:state.storeDirectory,receiptFile:r8ReceiptPath(state.storeDirectory)};
}

function receiptEnvelope({status,reason,receipt,dispatch,credentialRequested,
  credentialDelivered,storeCreated,now,storeDirectory}){
  return {schemaVersion:1,status,reason:reason??null,profile:'r8',
    runId:r8RunId,storeDirectory,
    credentialRequested,credentialDelivered,credentialPersisted:false,
    storeCreated,networkAttempts:dispatch.requestOutcomeKnown?dispatch.networkAttempts:null,
    realModelRequests:dispatch.requestOutcomeKnown?dispatch.realModelRequests:null,
    requestOutcomeKnown:dispatch.requestOutcomeKnown,
    automaticRetry:false,recordedAt:now(),receipt:receipt??null};
}

export async function runR8Worker(action,{priceFile,credentialSource=process.stdin,
  releaseFile=r8ReleasePath,createRuntime,now=Date.now,syntheticStoreRoot,
  noticeStream=process.stdout}={}){
  const preflight=()=>staticR8Preflight(priceFile,{releaseFile,syntheticStoreRoot});
  if(action==='preflight')return readyReceipt(preflight());
  if(action!=='run')fail('invalid_dream_climate_r8_worker_action');
  let runtime,store,credential,credentialRequested=false,credentialDelivered=false;
  let storeCreated=false;
  const telemetry=createLiveDispatchTelemetry();
  try{
    const state=preflight();
    noticeStream.write(JSON.stringify({type:'credential_required',
      releaseHash:r8ExpectedReleaseHash,r8IdentityHash:state.identity.identityHash,
      executionDigest:state.identity.executionDigest,
      pricePageSha256:state.price.pageSha256,nextRequestBytes:state.nextRequestBytes,
      nextReservationMicroCny:state.nextReservationMicroCny})+'\n');
    credentialRequested=true;
    credential=await readInlineCredentialFrame(credentialSource,{timeoutMs:30000});
    credentialDelivered=true;
    const checked=preflight();
    const simulator=createDeepSeekTransport(credential,{telemetry});
    const runtimeFactory=createRuntime??((directory,options)=>
      new DreamClimateR8Runtime(directory,options));
    runtime=runtimeFactory(state.storeDirectory,{enabled:true,simulator,now});
    storeCreated=true;
    runtime.startBatch();
    await runtime.executeBatch();
    runtime.close();runtime=undefined;
    credential=undefined;
    revokeR8Release(releaseFile);
    store=new Store(state.storeDirectory);
    const receipt=extractR8Receipt(store,{now:now()});
    store.close();store=undefined;
    const completed=receipt.completedRuns===1;
    const dispatch=telemetry.snapshot();
    const receiptWrite=writeR8Receipt(state.storeDirectory,receiptEnvelope({
      status:completed?'completed':'blocked',
      reason:completed?null:'SINGLE_RUN_NOT_COMPLETED',
      receipt,dispatch,credentialRequested,credentialDelivered,storeCreated,now,
      storeDirectory:state.storeDirectory}),
    {now});
    return {...receipt,batchStatus:completed?'SINGLE_RUN_COMPLETE':'SINGLE_RUN_FAILED',
      release:{...checked.release,hash:r8ExpectedReleaseHash},
      r8Identity:checked.identity,priceEvidence:checked.price,
      storeDirectory:state.storeDirectory,transportEndpoint:r8Endpoint,
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
    revokeR8Release(releaseFile);
    const reason=error?.message==='credential_pipe_refused'?
      'dream_climate_r8_credential_source_unavailable':
      (typeof error?.message==='string'&&error.message?
        error.message:'dream_climate_r8_worker_failed');
    const dispatch=telemetry.snapshot();
    let receipt=null,receiptWrite=null;
    const fallbackDirectory=syntheticStoreRoot===undefined?r8StoreDirectory:
      syntheticStoreDirectory(syntheticStoreRoot);
    if(fs.existsSync(fallbackDirectory)){
      try{
        const reader=new Store(fallbackDirectory);
        try{receipt=extractR8Receipt(reader,{now:now()});}finally{reader.close();}
      }catch{}
      if(!fs.existsSync(r8ReceiptPath(fallbackDirectory))){
        receiptWrite=writeR8Receipt(fallbackDirectory,receiptEnvelope({
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
    revokeR8Release(releaseFile);
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
      const value=await runR8Worker(action,{priceFile});
      process.stdout.write(JSON.stringify({type:'result',value})+'\n');
      if(value.status!=='SINGLE_RUN_READY_FOR_MANUAL_CONTENT_REVIEW')process.exitCode=1;
    }catch(error){
      console.error(error?.message??'dream_climate_r8_worker_refused');
      process.exitCode=1;
    }
  }
}
