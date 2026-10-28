import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {liveWorkerVersion} from './config.mjs';
import {createLiveDispatchTelemetry} from './telemetry.mjs';
import {offlineReviewReceipt} from './offline-gate.mjs';

export function buildBlockedWorkerReceipt(reason,{
  credentialRequested=false,telemetry=createLiveDispatchTelemetry()
}={}){
  const dispatch=telemetry.snapshot();
  return {status:'blocked',ready:false,reason,workerVersion:liveWorkerVersion,
    credentialRequested,credentialPersisted:false,
    storeExists:null,storeCreated:false,ownerLockCleared:null,releaseRevoked:false,
    networkAttempts:dispatch.networkAttempts,realModelRequests:dispatch.realModelRequests,
    requestOutcomeKnown:dispatch.requestOutcomeKnown,automaticRetry:false,
    executed:dispatch.realModelRequests>0};
}

export async function runLiveWorker(action){
  return offlineReviewReceipt({requestedAction:typeof action==='string'?action:null,
    workerVersion:liveWorkerVersion});
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const value=await runLiveWorker(process.argv[2]??null);
  console.log(JSON.stringify({type:'result',value}));
  process.exitCode=1;
}
