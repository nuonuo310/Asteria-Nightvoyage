import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {offlineReviewReceipt} from './offline-gate.mjs';

// Pure R2 classification retained for regression tests. It never touches a
// Store or network and is not a live-entry bypass.
export function blockedLauncherReceipt(reason,{
  credentialSupplierCalls=0,credentialDelivered=false
}={}){
  const known=!credentialDelivered;
  return {status:'blocked',ready:false,reason,credentialSupplierCalls,
    networkAttempts:known?0:null,realModelRequests:known?0:null,
    requestOutcomeKnown:known,storeCreated:known?false:null};
}

export function launchLive(action){
  return Promise.resolve(offlineReviewReceipt({requestedAction:
    typeof action==='string'?action:null}));
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const action=process.argv[2]??null;
  const value=await launchLive(action);
  console.log(JSON.stringify(value,null,2));
  process.exitCode=1;
}
