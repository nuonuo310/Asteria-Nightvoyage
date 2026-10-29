// R10 single-dream worker. The live path is closed until the secure entry has
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
  r10AllowanceCapMicroCny,r10AllowanceId,r10CallsPerRun,r10Endpoint,r10MaxCalls,
  r10MaxOutputTokens,r10PerCallMaximumMicroCny,r10PricePageSha256,r10ReceiptFileName,
  r10ReleasePath,r10RequestByteLimit,r10RunCount,r10RunId,r10ScenesPerRun,
  r10StoreBasename,r10StoreDirectory,r10WorstMicroCny,r10WorkerVersion
} from './config.mjs';
import {
  r10ExpectedReleaseHash,readR10Release,revokeR10Release
} from './release.mjs';
import {verifyR10Identity} from './identity.mjs';
import {verifyR10PriceEvidence} from './price-check.mjs';
import {r10Matrix} from './matrix.mjs';
import {r10PriceSnapshotHash} from './price.mjs';
import {extractR10Receipt} from './records.mjs';
import {DreamClimateR10Runtime} from './runtime.mjs';
import {
  assertR10DirectoryAbsent,assertR10StoreAbsent
} from './store-contract.mjs';
import {r10ReceiptPath,writeR10Receipt} from './receipt.mjs';

function syntheticStoreDirectory(root){
  if(typeof root!=='string'||!path.isAbsolute(root))
    fail('dream_climate_r10_synthetic_store_root_invalid');
  const resolved=path.resolve(root),temporary=path.resolve(os.tmpdir());
  const relative=path.relative(temporary,resolved);
  if(relative.startsWith('..')||path.isAbsolute(relative))
    fail('dream_climate_r10_synthetic_store_root_invalid');
  return path.join(resolved,r10StoreBasename);
}

function blocked(reason,{credentialRequested=false,credentialDelivered=false,
  telemetry=createLiveDispatchTelemetry(),storeCreated=false,
  requestOutcomeKnown=undefined,receiptWrite=null,storeDirectory=r10StoreDirectory,
  releaseFile=r10ReleasePath}={}){
  const dispatch=telemetry.snapshot();
  const known=requestOutcomeKnown===undefined?dispatch.requestOutcomeKnown:
    requestOutcomeKnown;
  return {status:'blocked',ready:false,reason,workerVersion:r10WorkerVersion,profile:'r10',
    credentialRequested,credentialDelivered,credentialPersisted:false,
    storeDirectory,storeExists:fs.existsSync(storeDirectory),storeCreated,
    ownerLockCleared:storeCreated?!fs.existsSync(path.join(storeDirectory,'owner.lock')):null,
    releaseRevoked:!fs.existsSync(releaseFile),
    receiptFile:r10ReceiptPath(storeDirectory),
    receiptWritten:receiptWrite?.written===true,
    receiptWriteFailed:receiptWrite!==null&&receiptWrite?.written!==true,
    receiptWriteError:receiptWrite?.error??null,
    networkAttempts:known?dispatch.networkAttempts:null,
    realModelRequests:known?dispatch.realModelRequests:null,
    requestOutcomeKnown:known,automaticRetry:false,replacementRun:false,
    secondRun:false,executed:known&&dispatch.realModelRequests>0};
}

export function staticR10Preflight(priceFile,{releaseFile=r10ReleasePath,
  syntheticStoreRoot}={}){
  const release=readR10Release(releaseFile);
  const identity=verifyR10Identity();
  const price=verifyR10PriceEvidence(priceFile);
  const storeDirectory=syntheticStoreRoot===undefined?r10StoreDirectory:
    syntheticStoreDirectory(syntheticStoreRoot);
  if(syntheticStoreRoot===undefined)assertR10StoreAbsent();
  else assertR10DirectoryAbsent(storeDirectory);
  const request=buildDreamStageRequest({run:r10Matrix[0].plan,previousScenes:[],stage:'scene'});
  const nextRequestBytes=assertRequestBounds(request);
  if(nextRequestBytes>r10RequestByteLimit||r10PerCallMaximumMicroCny!==35968||
     r10PerCallMaximumMicroCny*r10MaxCalls!==r10WorstMicroCny||
     r10WorstMicroCny>r10AllowanceCapMicroCny)fail('dream_climate_r10_budget_mismatch');
  if(release.executionDigest!==identity.executionDigest||
     release.executionDigest!==identity.executionPin)
    fail('dream_climate_r10_execution_pin_mismatch');
  if(release.storeDirectory!==r10StoreDirectory||
     release.receiptFile!==r10ReceiptFileName||
     release.allowanceId!==r10AllowanceId||release.runId!==r10RunId||
     release.allowanceCapMicroCny!==r10AllowanceCapMicroCny||
     release.perCallMaximumMicroCny!==r10PerCallMaximumMicroCny||
     release.worstMicroCny!==r10WorstMicroCny||release.maxRuns!==r10RunCount||
     release.maxCalls!==r10MaxCalls||release.scenesPerRun!==r10ScenesPerRun||
     release.callsPerRun!==r10CallsPerRun||release.noRetry!==true||
     release.pricePageSha256!==r10PricePageSha256||
     release.priceSnapshotHash!==r10PriceSnapshotHash)
    fail('dream_climate_r10_release_mismatch');
  return {release,identity,price,storeDirectory,nextRequestBytes,
    nextReservationMicroCny:r10PerCallMaximumMicroCny};
}

function readyReceipt(state){
  return {status:'ready',ready:true,workerVersion:r10WorkerVersion,profile:'r10',
    credentialRequested:false,credentialDelivered:false,credentialSupplierCalls:0,
    storeCreated:false,storeExists:fs.existsSync(state.storeDirectory),
    networkAttempts:0,realModelRequests:0,
    requestOutcomeKnown:true,release:state.release,releaseHash:r10ExpectedReleaseHash,
    r10Identity:state.identity,price:state.price,priceEvidence:state.price,
    nextRequestBytes:state.nextRequestBytes,nextReservationMicroCny:state.nextReservationMicroCny,
    runCount:r10RunCount,scenesPerRun:r10ScenesPerRun,maxCalls:r10MaxCalls,
    allowanceCapMicroCny:r10AllowanceCapMicroCny,priceSnapshotHash:state.identity.priceSnapshotHash,
    maxOutputTokens:r10MaxOutputTokens,transportEndpoint:r10Endpoint,
    storeDirectory:state.storeDirectory,receiptFile:r10ReceiptPath(state.storeDirectory)};
}

function receiptEnvelope({status,reason,receipt,dispatch,credentialRequested,
  credentialDelivered,storeCreated,now,storeDirectory}){
  return {schemaVersion:1,status,reason:reason??null,profile:'r10',
    runId:r10RunId,storeDirectory,
    credentialRequested,credentialDelivered,credentialPersisted:false,
    storeCreated,networkAttempts:dispatch.requestOutcomeKnown?dispatch.networkAttempts:null,
    realModelRequests:dispatch.requestOutcomeKnown?dispatch.realModelRequests:null,
    requestOutcomeKnown:dispatch.requestOutcomeKnown,
    automaticRetry:false,recordedAt:now(),receipt:receipt??null};
}

export async function runR10Worker(action,{priceFile,credentialSource=process.stdin,
  releaseFile=r10ReleasePath,createRuntime,now=Date.now,syntheticStoreRoot,
  noticeStream=process.stdout}={}){
  const preflight=()=>staticR10Preflight(priceFile,{releaseFile,syntheticStoreRoot});
  if(action==='preflight')return readyReceipt(preflight());
  if(action!=='run')fail('invalid_dream_climate_r10_worker_action');
  let runtime,store,credential,credentialRequested=false,credentialDelivered=false;
  let storeCreated=false;
  const telemetry=createLiveDispatchTelemetry();
  try{
    const state=preflight();
    noticeStream.write(JSON.stringify({type:'credential_required',
      releaseHash:r10ExpectedReleaseHash,r10IdentityHash:state.identity.identityHash,
      executionDigest:state.identity.executionDigest,
      pricePageSha256:state.price.pageSha256,nextRequestBytes:state.nextRequestBytes,
      nextReservationMicroCny:state.nextReservationMicroCny})+'\n');
    credentialRequested=true;
    credential=await readInlineCredentialFrame(credentialSource,{timeoutMs:30000});
    credentialDelivered=true;
    const checked=preflight();
    const simulator=createDeepSeekTransport(credential,{telemetry});
    const runtimeFactory=createRuntime??((directory,options)=>
      new DreamClimateR10Runtime(directory,options));
    runtime=runtimeFactory(state.storeDirectory,{enabled:true,simulator,now});
    storeCreated=true;
    runtime.startBatch();
    await runtime.executeBatch();
    runtime.close();runtime=undefined;
    credential=undefined;
    revokeR10Release(releaseFile);
    store=new Store(state.storeDirectory);
    const receipt=extractR10Receipt(store,{now:now()});
    store.close();store=undefined;
    const completed=receipt.completedRuns===1;
    const dispatch=telemetry.snapshot();
    const receiptWrite=writeR10Receipt(state.storeDirectory,receiptEnvelope({
      status:completed?'completed':'blocked',
      reason:completed?null:'SINGLE_RUN_NOT_COMPLETED',
      receipt,dispatch,credentialRequested,credentialDelivered,storeCreated,now,
      storeDirectory:state.storeDirectory}),
    {now});
    return {...receipt,batchStatus:completed?'SINGLE_RUN_COMPLETE':'SINGLE_RUN_FAILED',
      release:{...checked.release,hash:r10ExpectedReleaseHash},
      r10Identity:checked.identity,priceEvidence:checked.price,
      storeDirectory:state.storeDirectory,transportEndpoint:r10Endpoint,
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
    revokeR10Release(releaseFile);
    const reason=error?.message==='credential_pipe_refused'?
      'dream_climate_r10_credential_source_unavailable':
      (typeof error?.message==='string'&&error.message?
        error.message:'dream_climate_r10_worker_failed');
    const dispatch=telemetry.snapshot();
    let receipt=null,receiptWrite=null;
    const fallbackDirectory=syntheticStoreRoot===undefined?r10StoreDirectory:
      syntheticStoreDirectory(syntheticStoreRoot);
    if(fs.existsSync(fallbackDirectory)){
      try{
        const reader=new Store(fallbackDirectory);
        try{receipt=extractR10Receipt(reader,{now:now()});}finally{reader.close();}
      }catch{}
      if(!fs.existsSync(r10ReceiptPath(fallbackDirectory))){
        receiptWrite=writeR10Receipt(fallbackDirectory,receiptEnvelope({
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
    revokeR10Release(releaseFile);
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
      const value=await runR10Worker(action,{priceFile});
      process.stdout.write(JSON.stringify({type:'result',value})+'\n');
      if(value.status!=='SINGLE_RUN_READY_FOR_MANUAL_CONTENT_REVIEW')process.exitCode=1;
    }catch(error){
      console.error(error?.message??'dream_climate_r10_worker_refused');
      process.exitCode=1;
    }
  }
}
