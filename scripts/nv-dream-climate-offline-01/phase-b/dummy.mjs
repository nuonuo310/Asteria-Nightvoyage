// Local-only dummy rehearsal. It never imports the HTTPS transport and never
// reads a credential, environment secret, user Store or balance.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Store,fail} from '../../../src/store.js';
import {dreamClimateFixtureCases} from '../fixtures.mjs';
import {liveStoreBasename} from './config.mjs';
import {liveRunIds} from './matrix.mjs';
import {extractLiveReceipt} from './records.mjs';
import {DreamClimateLiveRuntime} from './runtime.mjs';

const fixtureByRun=new Map(dreamClimateFixtureCases.map(value=>[
  `${value.run.climate}/${value.run.mechanism}/${value.run.foregroundAnchor}`,value
]));

function fixtureFor(material){
  const value=fixtureByRun.get(`${material.climate}/${material.mechanism}/${material.foregroundAnchor}`);
  if(!value)fail('dream_climate_live_dummy_fixture_missing');
  return value;
}

export function createDummySimulator({onDispatch=()=>{}}={}){
  if(typeof onDispatch!=='function')fail('invalid_dream_climate_live_dummy_simulator');
  let calls=0;
  return async function dummySimulator(request){
    const material=JSON.parse(request.body.messages[1].content);
    const fixture=fixtureFor(material);
    let data;
    if(material.stage==='scene'){
      if(!Number.isSafeInteger(material.sceneIndex)||material.sceneIndex<0||material.sceneIndex>2)
        fail('dream_climate_live_dummy_stage_mismatch');
      data=fixture.scenes[material.sceneIndex];
    }else if(material.stage==='wake'){
      if(material.sceneIndex!==3)fail('dream_climate_live_dummy_stage_mismatch');
      data=fixture.wake;
    }else fail('dream_climate_live_dummy_stage_mismatch');
    calls++;
    onDispatch({call:calls,stage:material.stage,sceneIndex:material.sceneIndex,
      climate:material.climate,mechanism:material.mechanism,
      foregroundAnchor:material.foregroundAnchor});
    const content=JSON.stringify(data);
    const inputTokens=Buffer.byteLength(JSON.stringify(request.body),'utf8');
    const outputTokens=120;
    return {status:200,body:{model:'deepseek-flash',choices:[{finish_reason:'stop',
      message:{role:'assistant',content}}],usage:{prompt_tokens:inputTokens,
      completion_tokens:outputTokens,total_tokens:inputTokens+outputTokens}}};
  };
}

export async function runDummyRehearsal({temporaryRoot=os.tmpdir(),now=()=>Date.now()}={}){
  if(typeof temporaryRoot!=='string'||!path.isAbsolute(temporaryRoot))
    fail('invalid_dream_climate_live_dummy_root');
  if(typeof now!=='function')fail('invalid_dream_climate_live_dummy_clock');
  let parent,runtime,reader;
  let ownerLockObserved=false,ownerLockCleared=false,storeDeleted=false;
  try{
    parent=fs.mkdtempSync(path.join(path.resolve(temporaryRoot),
      'nightvoyage-dream-climate-live-dummy-'));
    const directory=path.join(parent,liveStoreBasename);
    const dispatches=[];
    runtime=new DreamClimateLiveRuntime(directory,{enabled:true,now,
      simulator:createDummySimulator({onDispatch:value=>dispatches.push(value)})});
    runtime.startBatch();
    ownerLockObserved=fs.existsSync(path.join(directory,'owner.lock'));
    await runtime.executeBatch();
    const batch=runtime.batchStatus();
    const calls=runtime.ledger.status('nv-dream-climate-live-r1-001').calls;
    let thirteenthRefused=false,fourthRunRefused=false,retryRefused=false;
    try{runtime.assertCallCapacity();}catch(error){thirteenthRefused=error.message===
      'dream_climate_live_total_call_limit';}
    try{runtime.run('nv-dream-climate-live-d');
      fourthRunRefused=false;}catch(error){fourthRunRefused=error.message==='unknown_run';}
    const beforeRetry=runtime.ledger.status('nv-dream-climate-live-r1-001').calls;
    await runtime.executeRun(liveRunIds[0]);
    retryRefused=runtime.ledger.status('nv-dream-climate-live-r1-001').calls===beforeRetry;
    runtime.close();runtime=undefined;
    ownerLockCleared=!fs.existsSync(path.join(directory,'owner.lock'));
    reader=new Store(directory);
    const receipt=extractLiveReceipt(reader,{now:now()});
    reader.close();reader=undefined;
    fs.rmSync(parent,{recursive:true,force:true});
    storeDeleted=!fs.existsSync(parent);
    const allCompleted=batch.runs.every(run=>run.status==='completed');
    const ok=allCompleted&&calls===12&&dispatches.length===12&&receipt.completedRuns===3&&
      receipt.batch.calls===12&&thirteenthRefused&&fourthRunRefused&&retryRefused&&
      ownerLockObserved&&ownerLockCleared&&storeDeleted;
    return {status:ok?'DUMMY_REHEARSAL_PASSED':'DUMMY_REHEARSAL_FAILED',ok,receipt,
      storeContract:{basename:liveStoreBasename,ownerLockObserved,ownerLockCleared,storeDeleted},
      calls,dispatches,thirteenthRefused,fourthRunRefused,retryRefused,
      boundaries:{networkAttempts:0,realModelRequests:0,credentialReads:0,
        realUserStoreAccessed:false,realStoreCreated:false,paidCalls:0,costMicroCny:0,
        automaticRetries:0,fourthRunStarted:false,laterRecollectionsEmpty:true}};
  }catch(error){
    if(runtime){try{runtime.close();}catch{}}
    if(reader){try{reader.close();}catch{}}
    if(parent){try{fs.rmSync(parent,{recursive:true,force:true});}catch{}}
    if(typeof error?.message==='string'&&error.message.startsWith('dream_climate_live_'))throw error;
    fail('dream_climate_live_dummy_rehearsal_failed');
  }
}
