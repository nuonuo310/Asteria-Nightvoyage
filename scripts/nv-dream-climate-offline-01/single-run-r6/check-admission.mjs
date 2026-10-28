import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {fail} from '../../../src/store.js';
import {r6ReleasePath,r6StoreDirectory} from './config.mjs';
import {runR6DummyRehearsal} from './dummy.mjs';
import {verifyR6Identity} from './identity.mjs';
import {verifyR6PriceEvidence} from './price-check.mjs';
import {assertR6StoreAbsent} from './store-contract.mjs';

export const r6AdmissionStatus='R6_OFFLINE_ADMISSION_PASSED';

export async function runR6Admission(priceFile){
  if(typeof priceFile!=='string'||!path.isAbsolute(priceFile))
    fail('dream_climate_r6_price_evidence_path_required');
  const identity=verifyR6Identity();
  const price=verifyR6PriceEvidence(priceFile);
  const store=assertR6StoreAbsent();
  const dummy=await runR6DummyRehearsal();
  return {status:r6AdmissionStatus,ok:dummy.ok,offlineReview:true,
    liveEntryClosed:false,secureInputReady:true,
    releasePresent:fs.existsSync(r6ReleasePath),storeExists:store.exists,
    storeDirectory:r6StoreDirectory,receiptFile:'receipt.json',
    releaseHash:identity.releaseHash,r6IdentityHash:identity.identityHash,
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
      const value=await runR6Admission(args[1]);
      console.log(JSON.stringify(value,null,2));
      if(!value.ok)process.exitCode=1;
    }catch(error){
      console.error(error?.message??'dream_climate_r6_admission_refused');
      process.exitCode=1;
    }
  }
}
