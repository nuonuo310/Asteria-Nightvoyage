import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {fail} from '../../../src/store.js';
import {RichDreamSampleRuntime} from '../runtime.mjs';
import {launchPhaseB} from './launcher.mjs';
import {readPhaseBRelease} from './release.mjs';
import {verifyPhaseBIdentity} from './identity.mjs';
import {verifyPhaseBPriceEvidence} from './price-check.mjs';
import {
  phaseBExpectedReleaseHash,phaseBStoreBasename,phaseBStoreDirectory,phaseBStorePrefix
} from './config.mjs';

export function verifyDedicatedStoreContract({directory=phaseBStoreDirectory,temporaryRoot=os.tmpdir()}={}){
  const resolved=path.resolve(directory),basename=path.basename(resolved);
  if(directory!==phaseBStoreDirectory||resolved!==directory||basename!==phaseBStoreBasename||
     !basename.startsWith(phaseBStorePrefix))fail('rich_sample_dedicated_store_required');
  let parent,runtime,simulatorCalls=0;
  try{
    parent=fs.mkdtempSync(path.join(path.resolve(temporaryRoot),'nightvoyage-rich-dream-sample-probe-'));
    const probe=path.join(parent,phaseBStoreBasename);
    runtime=new RichDreamSampleRuntime(probe,{enabled:false,simulator:()=>{
      simulatorCalls++;throw Error('dummy_simulator_unexpected');
    }});
    const constructed=fs.existsSync(probe);
    const ownerLockObserved=fs.existsSync(path.join(probe,'owner.lock'));
    runtime.close();runtime=undefined;
    const closed=!fs.existsSync(path.join(probe,'owner.lock'));
    fs.rmSync(parent,{recursive:true,force:true});
    const deleted=!fs.existsSync(parent);
    if(!constructed||!ownerLockObserved||!closed||!deleted||simulatorCalls!==0)
      fail('rich_sample_store_contract_probe_failed');
    return {basename,prefix:phaseBStorePrefix,constructed,ownerLockObserved,closed,deleted,
      simulatorCalls,networkAttempts:0};
  }catch(error){
    if(runtime){try{runtime.close();}catch{}}
    if(parent){try{fs.rmSync(parent,{recursive:true,force:true});}catch{}}
    if(typeof error?.message==='string'&&error.message.startsWith('rich_sample_'))throw error;
    fail('rich_sample_store_contract_probe_failed');
  }
}

async function runAdmission(priceFile){
  let supplierCalls=0;
  const release=readPhaseBRelease(),identity=verifyPhaseBIdentity(),price=verifyPhaseBPriceEvidence(priceFile);
  const storeContract=verifyDedicatedStoreContract();
  const result=await launchPhaseB('preflight',{priceFile,credentialSupplier:()=>{supplierCalls++;throw Error('sentinel_must_not_be_called');}});
  const storeExists=fs.existsSync(phaseBStoreDirectory);
  const ok=result.status==='ready'&&result.ready===true&&result.credentialSupplierCalls===0&&
    supplierCalls===0&&result.storeCreated===false&&result.networkAttempts===0&&storeExists===false&&
    result.storeDirectory===phaseBStoreDirectory&&storeContract.constructed===true&&
    storeContract.ownerLockObserved===true&&storeContract.closed===true&&storeContract.deleted===true&&
    storeContract.simulatorCalls===0&&storeContract.networkAttempts===0&&
    result.releaseHash===phaseBExpectedReleaseHash&&identity.phaseBIdentityHash===result.phaseBIdentity.phaseBIdentityHash&&
    price.pageSha256===result.price.pageSha256;
  const evidence={status:ok?'READY_FOR_ONE_LIVE_BATCH':'ADMISSION_CHECK_FAILED',ok,
    phaseAHead:identity.phaseAHead,phaseATree:identity.phaseATree,phaseAIdentityHash:identity.phaseAIdentityHash,
    phaseBIdentityHash:identity.phaseBIdentityHash,releaseHash:phaseBExpectedReleaseHash,
    release,price,nextRequestBytes:result.nextRequestBytes,nextReservationMicroCny:result.nextReservationMicroCny,
    runCount:result.runCount,scenesPerRun:result.scenesPerRun,maxCalls:result.maxCalls,
    allowanceCapMicroCny:result.allowanceCapMicroCny,storeDirectory:phaseBStoreDirectory,storeExists,storeContract,
    sentinelSupplierCalls:supplierCalls,credentialSupplierCalls:result.credentialSupplierCalls,
    networkAttempts:0,realModelRequests:0,credentialRead:false,phaseBExecuted:false};
  console.log(JSON.stringify(evidence,null,2));
  if(!ok)process.exitCode=1;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2);
  if(args.length!==2||args[0]!=='--price-file'||!path.isAbsolute(args[1])){
    console.error('Usage: node scripts/nv-rich-fictional-dream-sample-01/phase-b/check-admission.mjs --price-file <absolute saved official pricing HTML>');
    process.exitCode=1;
  }else{
    runAdmission(args[1]).catch(()=>{console.error('rich_sample_admission_refused');process.exitCode=1;});
  }
}
