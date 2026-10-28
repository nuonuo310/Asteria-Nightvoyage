// R5 closed entry. The R4 live run path (credential pipe, Store creation and
// HTTPS transport) was removed, not left reachable. Only the credential-free
// preflight remains for offline checks and tests.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {fail} from '../../../src/store.js';
import {assertRequestBounds,buildDreamStageRequest} from '../protocol.mjs';
import {createLiveDispatchTelemetry} from '../phase-b/telemetry.mjs';
import {
  r4AllowanceCapMicroCny,r4AllowanceId,r4CallsPerRun,r4Endpoint,r4MaxCalls,
  r4MaxOutputTokens,r4PerCallMaximumMicroCny,r4PricePageSha256,r4ReleasePath,
  r4RequestByteLimit,r4RunCount,r4RunId,r4ScenesPerRun,r4StoreDirectory,
  r4WorstMicroCny,r4WorkerVersion
} from './config.mjs';
import {r4ExpectedReleaseHash,readR4Release} from './release.mjs';
import {verifyR4Identity} from './identity.mjs';
import {verifyR4PriceEvidence} from './price-check.mjs';
import {r4Matrix} from './matrix.mjs';
import {r4PriceSnapshotHash} from './price.mjs';
import {assertR4StoreAbsent} from './store-contract.mjs';

export const r4OfflineReviewReason='OFFLINE_REVIEW_REQUIRED_R5';

function storeExists(){return fs.existsSync(r4StoreDirectory);}

function blocked(reason){
  const dispatch=createLiveDispatchTelemetry().snapshot();
  return {status:'blocked',ready:false,reason,workerVersion:r4WorkerVersion,profile:'r4',
    offlineReview:true,liveEntryClosed:true,
    credentialRequested:false,credentialDelivered:false,credentialPersisted:false,
    storeDirectory:r4StoreDirectory,storeExists:storeExists(),storeCreated:false,
    ownerLockCleared:null,releaseRevoked:!fs.existsSync(r4ReleasePath),
    networkAttempts:dispatch.networkAttempts,realModelRequests:dispatch.realModelRequests,
    requestOutcomeKnown:dispatch.requestOutcomeKnown,automaticRetry:false,
    replacementRun:false,secondRun:false,executed:false};
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

export async function runR4Worker(action,{priceFile,releaseFile=r4ReleasePath}={}){
  if(action==='preflight')return readyReceipt(staticR4Preflight(priceFile,{releaseFile}));
  if(action==='run')return blocked(r4OfflineReviewReason);
  fail('invalid_dream_climate_r4_worker_action');
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
