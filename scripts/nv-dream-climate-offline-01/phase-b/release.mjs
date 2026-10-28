import fs from 'node:fs';
import {hash} from '../../../src/contract.js';
import {copy,fail} from '../../../src/store.js';
import {
  liveAllowanceCapMicroCny,liveExpectedReleaseHash,liveMaxCalls,liveRunCount,
  livePricePageSha256,liveReleaseKeys,liveReleasePath,liveStoreDirectory,
  offlineHead,offlineIdentityHash,offlineParent,offlinePromptHash,offlineSourceHash,offlineTree
} from './config.mjs';
import {livePriceSnapshotHash} from './price.mjs';

const exact=(value,names)=>value&&typeof value==='object'&&!Array.isArray(value)&&
  Object.keys(value).length===names.length&&names.every(name=>Object.hasOwn(value,name));

export function liveReleaseObject(){
  return {
    status:'approved_once',offlineHead,offlineTree,offlineParent,
    offlineIdentityHash,offlinePromptHash,offlineSourceHash,
    priceSnapshotHash:livePriceSnapshotHash,pricePageSha256:livePricePageSha256,
    allowanceCapMicroCny:liveAllowanceCapMicroCny,maxRuns:liveRunCount,maxCalls:liveMaxCalls,
    storeDirectory:liveStoreDirectory,noRetry:true
  };
}

export function validateLiveRelease(value){
  if(!exact(value,liveReleaseKeys))fail('dream_climate_live_release_shape');
  if(hash(value)!==liveExpectedReleaseHash)fail('dream_climate_live_release_mismatch');
  const expected=liveReleaseObject();
  if(hash(value)!==hash(expected)||value.status!==expected.status||value.noRetry!==true) {
    fail('dream_climate_live_release_mismatch');
  }
  return copy(value);
}

export function readLiveRelease(file=liveReleasePath){
  let bytes;
  try{bytes=fs.readFileSync(file);}catch(error){
    fail(error.code==='ENOENT'?'dream_climate_live_release_required':'dream_climate_live_release_unreadable');
  }
  try{
    const text=bytes.toString('utf8');
    if(!Buffer.from(text,'utf8').equals(bytes))fail('dream_climate_live_release_invalid_utf8');
    return validateLiveRelease(JSON.parse(text));
  }catch(error){
    if(typeof error?.message==='string'&&error.message.startsWith('dream_climate_live_'))throw error;
    fail('dream_climate_live_release_invalid_json');
  }
}

export function revokeLiveRelease(file=liveReleasePath){
  fs.rmSync(file,{force:true});
  return !fs.existsSync(file);
}

if(hash(liveReleaseObject())!==liveExpectedReleaseHash)fail('dream_climate_live_release_pin_mismatch');
