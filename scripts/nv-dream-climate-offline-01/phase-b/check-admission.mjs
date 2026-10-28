import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {fail} from '../../../src/store.js';
import {runDummyRehearsal} from './dummy.mjs';
import {verifyLiveIdentity} from './identity.mjs';
import {liveOfflineReviewReason} from './offline-gate.mjs';

export async function runAdmission(priceFile){
  if(typeof priceFile!=='string'||!path.isAbsolute(priceFile))
    fail('dream_climate_live_price_evidence_path_required');
  const identity=verifyLiveIdentity();
  const dummy=await runDummyRehearsal();
  return {status:liveOfflineReviewReason,ok:dummy.ok,offlineReview:true,
    liveEntryClosed:true,liveAdmissionReady:false,
    releaseHash:identity.releaseHash,liveIdentityHash:identity.liveIdentityHash,
    offlineIdentityHash:identity.offlineIdentityHash,matrixHash:identity.matrixHash,
    priceSnapshotHash:identity.priceSnapshotHash,
    dummy:{status:dummy.status,completedRuns:dummy.receipt.completedRuns,calls:dummy.calls,
      thirteenthRefused:dummy.thirteenthRefused,fourthRunRefused:dummy.fourthRunRefused,
      retryRefused:dummy.retryRefused,ownerLockObserved:dummy.storeContract.ownerLockObserved,
      ownerLockCleared:dummy.storeContract.ownerLockCleared,
      storeDeleted:dummy.storeContract.storeDeleted},
    credentialSupplierCalls:0,credentialRead:false,
    networkAttempts:0,realModelRequests:0,requestOutcomeKnown:true,
    realStoreCreated:false};
}

if(import.meta.url===pathToFileURL(process.argv[1]??'').href){
  const args=process.argv.slice(2);
  if(args.length!==2||args[0]!=='--price-file'||!path.isAbsolute(args[1])){
    console.error('Usage: node check-admission.mjs --price-file <absolute path>');
    process.exitCode=1;
  }else{
    try{
      const value=await runAdmission(args[1]);
      console.log(JSON.stringify(value,null,2));
      if(!value.ok)process.exitCode=1;
    }catch(error){
      console.error(error?.message??'dream_climate_live_admission_refused');
      process.exitCode=1;
    }
  }
}
