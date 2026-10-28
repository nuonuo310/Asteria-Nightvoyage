import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {runDummyRehearsal} from './dummy.mjs';
import {verifyLiveIdentity} from './identity.mjs';
import {launchLive} from './launcher.mjs';
import {verifyLivePriceEvidence} from './price-check.mjs';
import {readLiveRelease} from './release.mjs';
import {liveExpectedReleaseHash} from './config.mjs';
import {assertLiveStoreAbsent,verifyDedicatedStorePath} from './store-contract.mjs';

export async function runAdmission(priceFile){
  let supplierCalls=0;
  const release=readLiveRelease();
  const identity=verifyLiveIdentity();
  const price=verifyLivePriceEvidence(priceFile);
  const storePath=verifyDedicatedStorePath();
  const storeAbsent=assertLiveStoreAbsent();
  const dummy=await runDummyRehearsal();
  const preflight=await launchLive('preflight',{priceFile,credentialSupplier:()=>{
    supplierCalls++;throw Error('sentinel_must_not_be_called');
  }});
  assertLiveStoreAbsent();
  const requestBytes=dummy.receipt.runs.flatMap(run=>run.billing.rows)
    .map(row=>row.usage?.inputTokens??0);
  const maxRequestBytes=Math.max(preflight.nextRequestBytes??0,...requestBytes);
  const ok=dummy.ok===true&&preflight.status==='ready'&&preflight.ready===true&&
    preflight.credentialSupplierCalls===0&&preflight.credentialRequested===false&&
    preflight.storeCreated===false&&preflight.networkAttempts===0&&
    preflight.realModelRequests===0&&preflight.requestOutcomeKnown===true&&supplierCalls===0&&
    preflight.releaseHash===liveExpectedReleaseHash&&
    preflight.liveIdentity?.liveIdentityHash===identity.liveIdentityHash&&
    preflight.price?.pageSha256===price.pageSha256&&
    dummy.receipt.completedRuns===3&&dummy.receipt.batch.calls===12&&
    dummy.boundaries.networkAttempts===0&&dummy.boundaries.realModelRequests===0&&
    dummy.boundaries.realStoreCreated===false;
  return {status:ok?'READY_FOR_USER_SECURE_INPUT_R2':'ADMISSION_CHECK_FAILED',ok,
    releaseHash:liveExpectedReleaseHash,liveIdentityHash:identity.liveIdentityHash,
    offlineIdentityHash:identity.offlineIdentityHash,matrixHash:identity.matrixHash,
    pricePageSha256:price.pageSha256,priceSnapshotHash:price.priceSnapshotHash??identity.priceSnapshotHash,
    release,price,storePath,storeAbsent,storeExistsAfter:false,
    nextRequestBytes:preflight.nextRequestBytes,maxRequestBytes,
    nextReservationMicroCny:preflight.nextReservationMicroCny,
    maxCalls:identity.maxCalls,runCount:identity.runCount,
    allowanceCapMicroCny:identity.allowanceCapMicroCny,
    dummy:{status:dummy.status,completedRuns:dummy.receipt.completedRuns,calls:dummy.calls,
      thirteenthRefused:dummy.thirteenthRefused,fourthRunRefused:dummy.fourthRunRefused,
      retryRefused:dummy.retryRefused,ownerLockObserved:dummy.storeContract.ownerLockObserved,
      ownerLockCleared:dummy.storeContract.ownerLockCleared,storeDeleted:dummy.storeContract.storeDeleted},
    sentinelSupplierCalls:supplierCalls,credentialSupplierCalls:preflight.credentialSupplierCalls,
    credentialRead:false,networkAttempts:0,realModelRequests:0,requestOutcomeKnown:true,
    realStoreCreated:false};
}

if(import.meta.url===pathToFileURL(process.argv[1]??'').href){
  const args=process.argv.slice(2);
  if(args.length!==2||args[0]!=='--price-file'||!path.isAbsolute(args[1])){
    console.error('Usage: node check-admission.mjs --price-file <absolute saved official pricing HTML>');
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
