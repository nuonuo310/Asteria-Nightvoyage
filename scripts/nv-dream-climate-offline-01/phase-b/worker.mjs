import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readInlineCredentialFrame} from '../../../src/inline-credential-pipe.js';
import {Store,fail} from '../../../src/store.js';
import {
  assertRequestBounds,buildDreamStageRequest,dreamClimateMaxCalls,
  dreamClimateRequestByteLimit,dreamClimateScenesPerRun
} from '../protocol.mjs';
import {
  liveAllowanceCapMicroCny,liveConfigVersion,liveExpectedReleaseHash,
  liveMaxCalls,liveMaxOutputTokens,livePerCallMaximumMicroCny,liveReleasePath,
  liveRunCount,liveStoreDirectory,liveTransportVersion,liveWorkerVersion,
  liveWorstMicroCny,offlineHead,offlineParent,offlineTree
} from './config.mjs';
import {assertLiveMatrix,liveMatrix,liveRunIds} from './matrix.mjs';
import {verifyLiveIdentity} from './identity.mjs';
import {readLiveRelease,revokeLiveRelease} from './release.mjs';
import {verifyLivePriceEvidence} from './price-check.mjs';
import {assertLiveStoreAbsent,verifyDedicatedStorePath} from './store-contract.mjs';
import {DreamClimateLiveRuntime} from './runtime.mjs';
import {extractLiveReceipt} from './records.mjs';
import {createLiveDispatchTelemetry} from './telemetry.mjs';
import {createDeepSeekTransport} from './transport.mjs';

const exact=(value,names)=>value&&typeof value==='object'&&!Array.isArray(value)&&
  Object.keys(value).length===names.length&&names.every(name=>Object.hasOwn(value,name));

function parseProof(text){
  let value;
  try{value=JSON.parse(text);}catch{fail('dream_climate_live_offline_proof_invalid');}
  if(!exact(value,['head','tree','parent'])||value.head!==offlineHead||
     value.tree!==offlineTree||value.parent!==offlineParent)
    fail('dream_climate_live_offline_identity_changed');
  return value;
}

function staticPreflight(priceFile,proofText){
  const release=readLiveRelease();
  const identity=verifyLiveIdentity();
  const proof=parseProof(proofText);
  const price=verifyLivePriceEvidence(priceFile,{now:Date.now()});
  const storePath=verifyDedicatedStorePath();
  const storeAbsent=assertLiveStoreAbsent();
  assertLiveMatrix();
  const request=buildDreamStageRequest({run:liveMatrix[0].plan,previousScenes:[],stage:'scene'});
  const nextRequestBytes=assertRequestBounds(request);
  if(nextRequestBytes>dreamClimateRequestByteLimit||
     livePerCallMaximumMicroCny!==35968||
     livePerCallMaximumMicroCny*dreamClimateMaxCalls!==liveWorstMicroCny||
     liveWorstMicroCny>liveAllowanceCapMicroCny)
    fail('dream_climate_live_budget_mismatch');
  if(release.storeDirectory!==liveStoreDirectory||
     release.allowanceCapMicroCny!==liveAllowanceCapMicroCny||
     release.maxRuns!==liveRunCount||release.maxCalls!==liveMaxCalls||release.noRetry!==true)
    fail('dream_climate_live_release_mismatch');
  return {release,identity,proof,price,storePath,storeAbsent,nextRequestBytes,
    nextReservationMicroCny:livePerCallMaximumMicroCny};
}

function totalCharged(receipt){
  return receipt.runs.reduce((sum,run)=>sum+BigInt(run.billing?.rows?.reduce((inner,row)=>
    inner+BigInt(row.chargedMicroCny??0),0n)??0n),0n).toString();
}

export function buildBlockedWorkerReceipt(reason,{
  credentialRequested=false,telemetry=createLiveDispatchTelemetry()
}={}){
  const dispatch=telemetry.snapshot();
  return {status:'blocked',ready:false,reason,workerVersion:liveWorkerVersion,
    credentialRequested,releaseRevoked:!fs.existsSync(liveReleasePath),
    storeExists:fs.existsSync(liveStoreDirectory),
    storeCreated:fs.existsSync(liveStoreDirectory),
    ownerLockCleared:!fs.existsSync(path.join(liveStoreDirectory,'owner.lock')),
    credentialPersisted:false,
    networkAttempts:dispatch.networkAttempts,realModelRequests:dispatch.realModelRequests,
    requestOutcomeKnown:dispatch.requestOutcomeKnown,automaticRetry:false,
    executed:dispatch.realModelRequests>0};
}

export async function runLiveWorker(action,{priceFile,proofText,credentialSource=process.stdin}={}){
  const telemetry=createLiveDispatchTelemetry();
  if(action==='preflight'){
    const state=staticPreflight(priceFile,proofText);
    const dispatch=telemetry.snapshot();
    return {status:'ready',ready:true,workerVersion:liveWorkerVersion,
      configVersion:liveConfigVersion,credentialRequested:false,credentialSupplierCalls:0,
      storeCreated:false,networkAttempts:dispatch.networkAttempts,
      realModelRequests:dispatch.realModelRequests,
      requestOutcomeKnown:dispatch.requestOutcomeKnown,release:state.release,
      liveIdentity:state.identity,price:state.price,storePath:state.storePath,
      storeAbsent:state.storeAbsent,nextRequestBytes:state.nextRequestBytes,
      nextReservationMicroCny:state.nextReservationMicroCny,runCount:liveRunIds.length,
      scenesPerRun:dreamClimateScenesPerRun,maxCalls:liveMaxCalls,
      allowanceCapMicroCny:liveAllowanceCapMicroCny,releaseHash:liveExpectedReleaseHash,
      maxOutputTokens:liveMaxOutputTokens,transportVersion:liveTransportVersion,
      storeDirectory:liveStoreDirectory};
  }
  if(action!=='run')fail('invalid_dream_climate_live_action');
  let runtime,store,credential,credentialRequested=false;
  try{
    const state=staticPreflight(priceFile,proofText);
    process.stdout.write(JSON.stringify({type:'credential_required',
      releaseHash:liveExpectedReleaseHash,liveIdentityHash:state.identity.liveIdentityHash,
      pricePageSha256:state.price.pageSha256,nextRequestBytes:state.nextRequestBytes,
      nextReservationMicroCny:state.nextReservationMicroCny})+'\n');
    credentialRequested=true;
    credential=await readInlineCredentialFrame(credentialSource,{timeoutMs:30000});
    const checked=staticPreflight(priceFile,proofText);
    runtime=new DreamClimateLiveRuntime(liveStoreDirectory,{enabled:true,
      simulator:createDeepSeekTransport(credential,{telemetry})});
    runtime.startBatch();
    let stopped=false;
    for(const runId of liveRunIds){
      const status=await runtime.executeRun(runId);
      if(status.status!=='completed'){stopped=true;break;}
    }
    runtime.close();runtime=undefined;
    credential=undefined;
    const releaseRevoked=revokeLiveRelease();
    store=new Store(liveStoreDirectory);
    const receipt=extractLiveReceipt(store,{now:Date.now()});
    store.close();store=undefined;
    const ownerLockCleared=!fs.existsSync(path.join(liveStoreDirectory,'owner.lock'));
    const allCompleted=receipt.completedRuns===liveRunCount;
    const dispatch=telemetry.snapshot();
    return {...receipt,batchStatus:allCompleted?'COMPLETE_ONE_LIVE_BATCH':'PARTIAL_FAILED_ONE_LIVE_BATCH',
      release:{...checked.release,hash:liveExpectedReleaseHash},liveIdentity:checked.identity,
      priceEvidence:checked.price,storeDirectory:liveStoreDirectory,
      transportVersion:liveTransportVersion,stoppedAfterNonCompletedRun:stopped,
      releaseRevoked,storeClosed:true,ownerLockCleared,credentialRequested:true,
      storeCreated:true,
      networkAttempts:dispatch.networkAttempts,realModelRequests:dispatch.realModelRequests,
      requestOutcomeKnown:dispatch.requestOutcomeKnown,
      credentialPersisted:false,automaticRetry:false,replacementRun:false,fourthRun:false,
      executed:dispatch.realModelRequests>0,
      laterRecollectionsEmpty:true,totalChargedMicroCny:totalCharged(receipt),
      totalReservedMicroCny:String(livePerCallMaximumMicroCny*liveMaxCalls)};
  }catch(error){
    if(runtime){try{runtime.close();}catch{}}
    if(store){try{store.close();}catch{}}
    credential=undefined;
    if(action==='run')revokeLiveRelease();
    const reason=error?.message==='credential_pipe_refused'?
      'dream_climate_live_credential_source_unavailable':
      (typeof error?.message==='string'&&error.message?error.message:
        'dream_climate_live_worker_failed');
    return buildBlockedWorkerReceipt(reason,{credentialRequested,telemetry});
  }finally{
    credential=undefined;
    if(runtime){try{runtime.close();}catch{}}
    if(store){try{store.close();}catch{}}
  }
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2),action=args.shift(),flags={};
  while(args.length){
    const key=args.shift();
    if(!['--price-file','--offline-proof'].includes(key)||Object.hasOwn(flags,key)||!args.length)break;
    flags[key]=args.shift();
  }
  if(!['preflight','run'].includes(action)||!flags['--price-file']||
     !path.isAbsolute(flags['--price-file'])||!flags['--offline-proof']){
    console.error('Usage: node worker.mjs preflight|run --price-file <absolute pricing HTML> --offline-proof <json>');
    process.exitCode=1;
  }else{
    try{
      const value=await runLiveWorker(action,{priceFile:flags['--price-file'],
        proofText:flags['--offline-proof']});
      console.log(JSON.stringify({type:'result',value}));
      if(value.status==='blocked')process.exitCode=1;
    }catch{console.error('dream_climate_live_worker_refused');process.exitCode=1;}
  }
}
