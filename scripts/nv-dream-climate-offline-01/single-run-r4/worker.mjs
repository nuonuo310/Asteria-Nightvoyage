import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readInlineCredentialFrame} from '../../../src/inline-credential-pipe.js';
import {Store,fail} from '../../../src/store.js';
import {assertRequestBounds,buildDreamStageRequest} from '../protocol.mjs';
import {createLiveDispatchTelemetry} from '../phase-b/telemetry.mjs';
import {createDeepSeekTransport} from '../phase-b/transport.mjs';
import {
  r4AllowanceCapMicroCny,r4AllowanceId,r4CallsPerRun,r4Endpoint,r4MaxCalls,
  r4MaxOutputTokens,r4PerCallMaximumMicroCny,r4PricePageSha256,r4ReleasePath,
  r4RequestByteLimit,r4RunCount,r4RunId,r4ScenesPerRun,r4StoreDirectory,
  r4WorstMicroCny,r4WorkerVersion
} from './config.mjs';
import {r4ExpectedReleaseHash,readR4Release,revokeR4Release} from './release.mjs';
import {verifyR4Identity} from './identity.mjs';
import {verifyR4PriceEvidence} from './price-check.mjs';
import {r4Matrix} from './matrix.mjs';
import {r4PriceSnapshotHash} from './price.mjs';
import {extractR4Receipt} from './records.mjs';
import {DreamClimateSingleRunRuntime} from './runtime.mjs';
import {assertR4StoreAbsent} from './store-contract.mjs';

function storeExists(){return fs.existsSync(r4StoreDirectory);}
function ownerLockCleared(){return !fs.existsSync(path.join(r4StoreDirectory,'owner.lock'));}

function blocked(reason,{credentialRequested=false,credentialDelivered=false,
  telemetry=createLiveDispatchTelemetry(),storeCreated=false,
  requestOutcomeKnown=undefined}={}){
  const dispatch=telemetry.snapshot();
  const known=requestOutcomeKnown===undefined?dispatch.requestOutcomeKnown:
    requestOutcomeKnown;
  return {status:'blocked',ready:false,reason,workerVersion:r4WorkerVersion,profile:'r4',
    credentialRequested,credentialDelivered,credentialPersisted:false,
    storeDirectory:r4StoreDirectory,storeExists:storeExists(),storeCreated,
    ownerLockCleared:storeCreated?ownerLockCleared():null,
    releaseRevoked:!fs.existsSync(r4ReleasePath),
    networkAttempts:known?dispatch.networkAttempts:null,
    realModelRequests:known?dispatch.realModelRequests:null,
    requestOutcomeKnown:known,automaticRetry:false,replacementRun:false,
    secondRun:false,executed:known&&dispatch.realModelRequests>0};
}

export function staticR4Preflight(priceFile,{releaseFile=r4ReleasePath}={}){
  const release=readR4Release(releaseFile);
  const identity=verifyR4Identity();
  const price=verifyR4PriceEvidence(priceFile);
  assertR4StoreAbsent();
  const request=buildDreamStageRequest({run:r4Matrix[0].plan,previousScenes:[],stage:'scene'});
  const nextRequestBytes=assertRequestBounds(request);
  if(nextRequestBytes>r4RequestByteLimit||r4PerCallMaximumMicroCny!==35968||
     r4PerCallMaximumMicroCny*r4MaxCalls!==r4WorstMicroCny||
     r4WorstMicroCny>r4AllowanceCapMicroCny)fail('dream_climate_r4_budget_mismatch');
  if(release.storeDirectory!==r4StoreDirectory||
     release.allowanceId!==r4AllowanceId||release.runId!==r4RunId||
     release.allowanceCapMicroCny!==r4AllowanceCapMicroCny||
     release.perCallMaximumMicroCny!==r4PerCallMaximumMicroCny||
     release.worstMicroCny!==r4WorstMicroCny||release.maxRuns!==r4RunCount||
     release.maxCalls!==r4MaxCalls||release.scenesPerRun!==r4ScenesPerRun||
     release.callsPerRun!==r4CallsPerRun||release.noRetry!==true||
     release.pricePageSha256!==r4PricePageSha256||
     release.priceSnapshotHash!==r4PriceSnapshotHash)
    fail('dream_climate_r4_release_mismatch');
  return {release,identity,price,nextRequestBytes,nextReservationMicroCny:r4PerCallMaximumMicroCny};
}

function readyReceipt(state){
  return {status:'ready',ready:true,workerVersion:r4WorkerVersion,profile:'r4',
    credentialRequested:false,credentialDelivered:false,credentialSupplierCalls:0,
    storeCreated:false,storeExists:storeExists(),networkAttempts:0,realModelRequests:0,
    requestOutcomeKnown:true,release:state.release,releaseHash:r4ExpectedReleaseHash,
    r4Identity:state.identity,price:state.price,priceEvidence:state.price,
    nextRequestBytes:state.nextRequestBytes,nextReservationMicroCny:state.nextReservationMicroCny,
    runCount:r4RunCount,scenesPerRun:r4ScenesPerRun,maxCalls:r4MaxCalls,
    allowanceCapMicroCny:r4AllowanceCapMicroCny,priceSnapshotHash:state.identity.priceSnapshotHash,
    maxOutputTokens:r4MaxOutputTokens,transportEndpoint:r4Endpoint,
    storeDirectory:r4StoreDirectory};
}

export async function runR4Worker(action,{priceFile,credentialSource=process.stdin,
  releaseFile=r4ReleasePath,createRuntime,now=Date.now}={}){
  if(action==='preflight'){
    const state=staticR4Preflight(priceFile,{releaseFile});
    return readyReceipt(state);
  }
  if(action!=='run')fail('invalid_dream_climate_r4_worker_action');
  let runtime,store,credential,credentialRequested=false,credentialDelivered=false;
  let storeCreated=false;
  const telemetry=createLiveDispatchTelemetry();
  try{
    const state=staticR4Preflight(priceFile,{releaseFile});
    process.stdout.write(JSON.stringify({type:'credential_required',
      releaseHash:r4ExpectedReleaseHash,r4IdentityHash:state.identity.identityHash,
      pricePageSha256:state.price.pageSha256,nextRequestBytes:state.nextRequestBytes,
      nextReservationMicroCny:state.nextReservationMicroCny})+'\n');
    credentialRequested=true;
    credential=await readInlineCredentialFrame(credentialSource,{timeoutMs:30000});
    credentialDelivered=true;
    const checked=staticR4Preflight(priceFile,{releaseFile});
    const simulator=createDeepSeekTransport(credential,{telemetry});
    const runtimeFactory=createRuntime??((directory,options)=>
      new DreamClimateSingleRunRuntime(directory,options));
    runtime=runtimeFactory(r4StoreDirectory,{enabled:true,simulator,now});
    storeCreated=true;
    runtime.startBatch();
    await runtime.executeBatch();
    runtime.close();runtime=undefined;
    credential=undefined;
    revokeR4Release(releaseFile);
    store=new Store(r4StoreDirectory);
    const receipt=extractR4Receipt(store,{now:now()});
    store.close();store=undefined;
    const completed=receipt.completedRuns===1;
    const dispatch=telemetry.snapshot();
    return {...receipt,batchStatus:completed?'SINGLE_RUN_COMPLETE':'SINGLE_RUN_FAILED',
      release:{...checked.release,hash:r4ExpectedReleaseHash},
      r4Identity:checked.identity,priceEvidence:checked.price,
      storeDirectory:r4StoreDirectory,transportEndpoint:r4Endpoint,
      stoppedAfterNonCompletedRun:!completed,releaseRevoked:true,storeClosed:true,
      credentialRequested:true,credentialPersisted:false,automaticRetry:false,
      replacementRun:false,secondRun:false,laterRecollectionsEmpty:true,
      networkAttempts:dispatch.networkAttempts,realModelRequests:dispatch.realModelRequests,
      requestOutcomeKnown:dispatch.requestOutcomeKnown,storeCreated:true,
      ownerLockCleared:ownerLockCleared()};
  }catch(error){
    if(runtime){try{runtime.close();}catch{}}
    if(store){try{store.close();}catch{}}
    credential=undefined;
    revokeR4Release(releaseFile);
    const reason=error?.message==='credential_pipe_refused'?
      'dream_climate_r4_credential_source_unavailable':
      (typeof error?.message==='string'&&error.message?
        error.message:'dream_climate_r4_worker_failed');
    return blocked(reason,{credentialRequested,credentialDelivered,telemetry,storeCreated});
  }finally{
    credential=undefined;
    if(runtime){try{runtime.close();}catch{}}
    if(store){try{store.close();}catch{}}
    revokeR4Release(releaseFile);
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
      const value=await runR4Worker(action,{priceFile});
      console.log(JSON.stringify({type:'result',value}));
      if(value.status==='blocked')process.exitCode=1;
    }catch(error){
      console.error(error?.message??'dream_climate_r4_worker_refused');
      process.exitCode=1;
    }
  }
}
