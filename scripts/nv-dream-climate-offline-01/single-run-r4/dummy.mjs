// Local-only R4 dummy rehearsal. It never imports the HTTPS transport, never
// reads a credential or environment secret and never touches the real Store.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Store,fail} from '../../../src/store.js';
import {createDummySimulator} from '../phase-b/dummy.mjs';
import {r4AllowanceId,r4RunId,r4StoreBasename} from './config.mjs';
import {extractR4Receipt} from './records.mjs';
import {DreamClimateSingleRunRuntime} from './runtime.mjs';
import {assertDirectoryAbsent} from './store-contract.mjs';

export async function runR4DummyRehearsal({temporaryRoot=os.tmpdir(),now=()=>Date.now()}={}){
  if(typeof temporaryRoot!=='string'||!path.isAbsolute(temporaryRoot))
    fail('invalid_dream_climate_r4_dummy_root');
  if(typeof now!=='function')fail('invalid_dream_climate_r4_dummy_clock');
  let parent,runtime,reader;
  let ownerLockObserved=false,ownerLockCleared=false,storeDeleted=false;
  try{
    parent=fs.mkdtempSync(path.join(path.resolve(temporaryRoot),
      'nightvoyage-dream-climate-r4-dummy-'));
    const directory=path.join(parent,r4StoreBasename);
    const dispatches=[];
    runtime=new DreamClimateSingleRunRuntime(directory,{enabled:true,now,
      simulator:createDummySimulator({onDispatch:value=>dispatches.push(value)})});
    runtime.startBatch();
    ownerLockObserved=fs.existsSync(path.join(directory,'owner.lock'));
    await runtime.executeBatch();
    const batch=runtime.batchStatus();
    const calls=runtime.ledger.status(r4AllowanceId).calls;
    let fifthCallRefused=false,secondRunRefused=false,restartRefused=false;
    try{runtime.assertCallCapacity();}catch(error){
      fifthCallRefused=error.message==='dream_climate_live_total_call_limit';
    }
    try{await runtime.executeRun('nv-dream-climate-one-dream-r4-b');}
    catch(error){secondRunRefused=error.message==='unknown_run';}
    const beforeRestart=runtime.ledger.status(r4AllowanceId).calls;
    const restarted=await runtime.executeRun(r4RunId);
    restartRefused=restarted.status==='completed'&&
      runtime.ledger.status(r4AllowanceId).calls===beforeRestart;
    runtime.close();runtime=undefined;
    ownerLockCleared=!fs.existsSync(path.join(directory,'owner.lock'));
    reader=new Store(directory);
    const receipt=extractR4Receipt(reader,{now:now()});
    reader.close();reader=undefined;
    let existingDirectoryRefused=false;
    try{assertDirectoryAbsent(directory);}catch(error){
      existingDirectoryRefused=error.message==='dream_climate_r4_store_already_exists';
    }
    fs.rmSync(parent,{recursive:true,force:true});
    storeDeleted=!fs.existsSync(parent);
    const allCompleted=batch.runs.length===1&&batch.runs.every(run=>run.status==='completed');
    const ok=allCompleted&&calls===4&&dispatches.length===4&&
      receipt.completedRuns===1&&receipt.batch.calls===4&&fifthCallRefused&&
      secondRunRefused&&restartRefused&&existingDirectoryRefused&&
      ownerLockObserved&&ownerLockCleared&&storeDeleted;
    return {status:ok?'R4_DUMMY_REHEARSAL_PASSED':'R4_DUMMY_REHEARSAL_FAILED',ok,receipt,
      storeContract:{basename:r4StoreBasename,ownerLockObserved,ownerLockCleared,
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
    if(typeof error?.message==='string'&&error.message.startsWith('dream_climate_r4_'))throw error;
    fail('dream_climate_r4_dummy_rehearsal_failed');
  }
}
