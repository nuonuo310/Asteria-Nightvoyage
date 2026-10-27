import fs from 'node:fs';
import path from 'node:path';
import {launchPhaseB} from './launcher.mjs';
import {readPhaseBRelease} from './release.mjs';
import {verifyPhaseBIdentity} from './identity.mjs';
import {verifyPhaseBPriceEvidence} from './price-check.mjs';
import {phaseBExpectedReleaseHash,phaseBStoreDirectory} from './config.mjs';

const args=process.argv.slice(2);
if(args.length!==2||args[0]!=='--price-file'||!path.isAbsolute(args[1])){
  console.error('Usage: node scripts/nv-rich-fictional-dream-sample-01/phase-b/check-admission.mjs --price-file <absolute saved official pricing HTML>');
  process.exitCode=1;
}else{
  let supplierCalls=0;
  const release=readPhaseBRelease(),identity=verifyPhaseBIdentity(),price=verifyPhaseBPriceEvidence(args[1]);
  const result=await launchPhaseB('preflight',{priceFile:args[1],credentialSupplier:()=>{supplierCalls++;throw Error('sentinel_must_not_be_called');}});
  const storeExists=fs.existsSync(phaseBStoreDirectory);
  const ok=result.status==='ready'&&result.ready===true&&result.credentialSupplierCalls===0&&
    supplierCalls===0&&result.storeCreated===false&&result.networkAttempts===0&&storeExists===false&&
    result.releaseHash===phaseBExpectedReleaseHash&&identity.phaseBIdentityHash===result.phaseBIdentity.phaseBIdentityHash&&
    price.pageSha256===result.price.pageSha256;
  const evidence={status:ok?'READY_FOR_ONE_LIVE_BATCH':'ADMISSION_CHECK_FAILED',ok,
    phaseAHead:identity.phaseAHead,phaseATree:identity.phaseATree,phaseAIdentityHash:identity.phaseAIdentityHash,
    phaseBIdentityHash:identity.phaseBIdentityHash,releaseHash:phaseBExpectedReleaseHash,
    release,price,nextRequestBytes:result.nextRequestBytes,nextReservationMicroCny:result.nextReservationMicroCny,
    runCount:result.runCount,scenesPerRun:result.scenesPerRun,maxCalls:result.maxCalls,
    allowanceCapMicroCny:result.allowanceCapMicroCny,storeDirectory:phaseBStoreDirectory,storeExists,
    sentinelSupplierCalls:supplierCalls,credentialSupplierCalls:result.credentialSupplierCalls,
    networkAttempts:0,realModelRequests:0,credentialRead:false,phaseBExecuted:false};
  console.log(JSON.stringify(evidence,null,2));
  if(!ok)process.exitCode=1;
}
