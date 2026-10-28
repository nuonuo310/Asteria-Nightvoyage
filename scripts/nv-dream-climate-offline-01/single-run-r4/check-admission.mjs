import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {fail} from '../../../src/store.js';
import {r4ReleasePath,r4StoreDirectory} from './config.mjs';
import {runR4DummyRehearsal} from './dummy.mjs';
import {verifyR4Identity} from './identity.mjs';
import {verifyR4PriceEvidence} from './price-check.mjs';
import {assertR4StoreAbsent} from './store-contract.mjs';
import fs from 'node:fs';

export const r4AdmissionStatus='R4_OFFLINE_ADMISSION_PASSED';

export async function runR4Admission(priceFile){
  if(typeof priceFile!=='string'||!path.isAbsolute(priceFile))
    fail('dream_climate_r4_price_evidence_path_required');
  const identity=verifyR4Identity();
  const price=verifyR4PriceEvidence(priceFile);
  const store=assertR4StoreAbsent();
  const dummy=await runR4DummyRehearsal();
  return {status:r4AdmissionStatus,ok:dummy.ok,offlineReview:true,
    liveEntryClosed:true,secureInputReady:false,
    releasePresent:fs.existsSync(r4ReleasePath),storeExists:store.exists,
    storeDirectory:r4StoreDirectory,
    releaseHash:identity.releaseHash,r4IdentityHash:identity.identityHash,
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
      const value=await runR4Admission(args[1]);
      console.log(JSON.stringify(value,null,2));
      if(!value.ok)process.exitCode=1;
    }catch(error){
      console.error(error?.message??'dream_climate_r4_admission_refused');
      process.exitCode=1;
    }
  }
}
