import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {fail} from '../../../src/store.js';
import {r10ReleasePath,r10StoreDirectory} from './config.mjs';
import {runR10DummyRehearsal} from './dummy.mjs';
import {verifyR10Identity} from './identity.mjs';
import {verifyR10PriceEvidence} from './price-check.mjs';
import {assertR10StoreAbsent} from './store-contract.mjs';

export const r10AdmissionStatus='R10_OFFLINE_ADMISSION_PASSED';

export async function runR10Admission(priceFile){
  if(typeof priceFile!=='string'||!path.isAbsolute(priceFile))
    fail('dream_climate_r10_price_evidence_path_required');
  const identity=verifyR10Identity();
  const price=verifyR10PriceEvidence(priceFile);
  const store=assertR10StoreAbsent();
  const dummy=await runR10DummyRehearsal();
  return {status:r10AdmissionStatus,ok:dummy.ok,offlineReview:true,
    liveEntryClosed:false,secureInputReady:true,
    releasePresent:fs.existsSync(r10ReleasePath),storeExists:store.exists,
    storeDirectory:r10StoreDirectory,receiptFile:'receipt.json',
    releaseHash:identity.releaseHash,r10IdentityHash:identity.identityHash,
    executionDigest:identity.executionDigest,executionPin:identity.executionPin,
    offlineIdentityHash:identity.offlineIdentityHash,matrixHash:identity.matrixHash,
    priceSnapshotHash:identity.priceSnapshotHash,pricePageSha256:price.pageSha256,
    runCount:identity.runCount,maxCalls:identity.maxCalls,
    dummy:{status:dummy.status,completedRuns:dummy.receipt.completedRuns,calls:dummy.calls,
      fifthCallRefused:dummy.fifthCallRefused,secondRunRefused:dummy.secondRunRefused,
      restartRefused:dummy.restartRefused,
      ownerLockObserved:dummy.storeContract.ownerLockObserved,
      ownerLockCleared:dummy.storeContract.ownerLockCleared,
      storeDeleted:dummy.storeContract.storeDeleted,
      existingDirectoryRefused:dummy.storeContract.existingDirectoryRefused},
    credentialSupplierCalls:0,credentialRead:false,
    networkAttempts:0,realModelRequests:0,requestOutcomeKnown:true,
    realStoreCreated:false};
}

if(import.meta.url===pathToFileURL(process.argv[1]??'').href){
  const args=process.argv.slice(2);
  if(args.length!==2||args[0]!=='--price-file'||!path.isAbsolute(args[1])){
    console.error('Usage: node check-admission.mjs --price-file <absolute saved pricing HTML>');
    process.exitCode=1;
  }else{
    try{
      const value=await runR10Admission(args[1]);
      console.log(JSON.stringify(value,null,2));
      if(!value.ok)process.exitCode=1;
    }catch(error){
      console.error(error?.message??'dream_climate_r10_admission_refused');
      process.exitCode=1;
    }
  }
}
