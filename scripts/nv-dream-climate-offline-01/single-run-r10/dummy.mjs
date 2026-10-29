// Local-only R10 dummy rehearsal. It never imports the HTTPS transport, never
// reads a credential or environment secret and never touches the real Store.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Store,fail} from '../../../src/store.js';
import {createDummySimulator} from '../phase-b/dummy.mjs';
import {r10AllowanceId,r10RunId,r10StoreBasename} from './config.mjs';
import {extractR10Receipt} from './records.mjs';
import {DreamClimateR10Runtime} from './runtime.mjs';
import {assertR10DirectoryAbsent} from './store-contract.mjs';

export async function runR10DummyRehearsal({temporaryRoot=os.tmpdir(),now=()=>Date.now()}={}){
  if(typeof temporaryRoot!=='string'||!path.isAbsolute(temporaryRoot))
    fail('invalid_dream_climate_r10_dummy_root');
  if(typeof now!=='function')fail('invalid_dream_climate_r10_dummy_clock');
  let parent,runtime,reader;
  let ownerLockObserved=false,ownerLockCleared=false,storeDeleted=false;
  try{
    parent=fs.mkdtempSync(path.join(path.resolve(temporaryRoot),
      'nightvoyage-dream-climate-r10-dummy-'));
    const directory=path.join(parent,r10StoreBasename);
    const dispatches=[];
    runtime=new DreamClimateR10Runtime(directory,{enabled:true,now,
      simulator:createDummySimulator({onDispatch:value=>dispatches.push(value)})});
    runtime.startBatch();
    ownerLockObserved=fs.existsSync(path.join(directory,'owner.lock'));
    await runtime.executeBatch();
    const batch=runtime.batchStatus();
    const calls=runtime.ledger.status(r10AllowanceId).calls;
    let fifthCallRefused=false,secondRunRefused=false,restartRefused=false;
    try{runtime.assertCallCapacity();}catch(error){
      fifthCallRefused=error.message==='dream_climate_live_total_call_limit';
    }
    try{await runtime.executeRun('nv-dream-climate-one-dream-r10-b');}
    catch(error){secondRunRefused=error.message==='unknown_run';}
    const beforeRestart=runtime.ledger.status(r10AllowanceId).calls;
    const restarted=await runtime.executeRun(r10RunId);
    restartRefused=restarted.status==='completed'&&
      runtime.ledger.status(r10AllowanceId).calls===beforeRestart;
    runtime.close();runtime=undefined;
    ownerLockCleared=!fs.existsSync(path.join(directory,'owner.lock'));
    reader=new Store(directory);
    const receipt=extractR10Receipt(reader,{now:now()});
    reader.close();reader=undefined;
    let existingDirectoryRefused=false;
    try{assertR10DirectoryAbsent(directory);}catch(error){
      existingDirectoryRefused=error.message==='dream_climate_r10_store_already_exists';
    }
    fs.rmSync(parent,{recursive:true,force:true});
    storeDeleted=!fs.existsSync(parent);
    const allCompleted=batch.runs.length===1&&batch.runs.every(run=>run.status==='completed');
    const ok=allCompleted&&calls===4&&dispatches.length===4&&
      receipt.completedRuns===1&&receipt.batch.calls===4&&fifthCallRefused&&
      secondRunRefused&&restartRefused&&existingDirectoryRefused&&
      ownerLockObserved&&ownerLockCleared&&storeDeleted;
    return {status:ok?'R10_DUMMY_REHEARSAL_PASSED':'R10_DUMMY_REHEARSAL_FAILED',ok,receipt,
      storeContract:{basename:r10StoreBasename,ownerLockObserved,ownerLockCleared,
        storeDeleted,existingDirectoryRefused},
      calls,dispatches,fifthCallRefused,secondRunRefused,restartRefused,
      boundaries:{networkAttempts:0,realModelRequests:0,credentialReads:0,
        requestOutcomeKnown:true,realUserStoreAccessed:false,realStoreCreated:false,
        paidCalls:0,costMicroCny:0,automaticRetries:0,secondRunStarted:false,
        laterRecollectionsEmpty:true}};
  }catch(error){
    if(runtime){try{runtime.close();}catch{}}
    if(reader){try{reader.close();}catch{}}
    if(parent){try{fs.rmSync(parent,{recursive:true,force:true});}catch{}}
    if(typeof error?.message==='string'&&error.message.startsWith('dream_climate_r10_'))throw error;
    fail('dream_climate_r10_dummy_rehearsal_failed');
  }
}
