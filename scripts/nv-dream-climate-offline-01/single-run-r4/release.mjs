import fs from 'node:fs';
import {hash} from '../../../src/contract.js';
import {copy,fail} from '../../../src/store.js';
import {
  r4AllowanceCapMicroCny,r4AllowanceId,r4AuthorityCommit,r4CallsPerRun,
  r4MaxCalls,r4OfflineHead,r4OfflineIdentityHash,r4OfflineParent,
  r4OfflinePromptHash,r4OfflineSourceHash,r4OfflineTree,r4PerCallMaximumMicroCny,
  r4PricePageSha256,r4ProtocolVersion,r4ReleasePath,r4RunCount,r4RunId,
  r4RuntimeVersion,r4ScenesPerRun,r4StoreDirectory,r4WorstMicroCny
} from './config.mjs';
import {r4MatrixHash} from './matrix.mjs';
import {r4PriceSnapshotHash} from './price.mjs';

export const r4ReleaseKeys=Object.freeze([
  'status','profile','authorityCommit','offlineHead','offlineTree','offlineParent',
  'offlineIdentityHash','offlinePromptHash','offlineSourceHash','protocolVersion',
  'runtimeVersion','matrixHash','priceSnapshotHash','pricePageSha256','allowanceId',
  'allowanceCapMicroCny','perCallMaximumMicroCny','worstMicroCny','maxRuns','maxCalls',
  'scenesPerRun','callsPerRun','runId','storeDirectory','noRetry'
]);

const exact=(value,names)=>value&&typeof value==='object'&&!Array.isArray(value)&&
  Object.keys(value).length===names.length&&names.every(name=>Object.hasOwn(value,name));

export function r4ReleaseObject(){
  return {
    status:'approved_once',profile:'nv-dream-climate-single-run-r4-v1',
    authorityCommit:r4AuthorityCommit,
    offlineHead:r4OfflineHead,offlineTree:r4OfflineTree,offlineParent:r4OfflineParent,
    offlineIdentityHash:r4OfflineIdentityHash,offlinePromptHash:r4OfflinePromptHash,
    offlineSourceHash:r4OfflineSourceHash,protocolVersion:r4ProtocolVersion,
    runtimeVersion:r4RuntimeVersion,matrixHash:r4MatrixHash,
    priceSnapshotHash:r4PriceSnapshotHash,pricePageSha256:r4PricePageSha256,
    allowanceId:r4AllowanceId,allowanceCapMicroCny:r4AllowanceCapMicroCny,
    perCallMaximumMicroCny:r4PerCallMaximumMicroCny,worstMicroCny:r4WorstMicroCny,
    maxRuns:r4RunCount,maxCalls:r4MaxCalls,scenesPerRun:r4ScenesPerRun,
    callsPerRun:r4CallsPerRun,runId:r4RunId,storeDirectory:r4StoreDirectory,
    noRetry:true
  };
}

export const r4ExpectedReleaseHash=hash(r4ReleaseObject());

export function validateR4Release(value){
  if(!exact(value,r4ReleaseKeys))fail('dream_climate_r4_release_shape');
  if(hash(value)!==r4ExpectedReleaseHash)fail('dream_climate_r4_release_mismatch');
  const expected=r4ReleaseObject();
  if(hash(value)!==hash(expected)||value.status!==expected.status||value.noRetry!==true)
    fail('dream_climate_r4_release_mismatch');
  return copy(value);
}

export function readR4Release(file=r4ReleasePath){
  let bytes;
  try{bytes=fs.readFileSync(file);}catch(error){
    fail(error.code==='ENOENT'?'dream_climate_r4_release_required':
      'dream_climate_r4_release_unreadable');
  }
  try{
    const text=bytes.toString('utf8');
    if(!Buffer.from(text,'utf8').equals(bytes))fail('dream_climate_r4_release_invalid_utf8');
    return validateR4Release(JSON.parse(text));
  }catch(error){
    if(typeof error?.message==='string'&&error.message.startsWith('dream_climate_r4_'))
      throw error;
    fail('dream_climate_r4_release_invalid_json');
  }
}

export function revokeR4Release(file=r4ReleasePath){
  fs.rmSync(file,{force:true});
  return !fs.existsSync(file);
}

if(r4PerCallMaximumMicroCny*r4MaxCalls!==r4WorstMicroCny||
   r4WorstMicroCny>r4AllowanceCapMicroCny)
  fail('dream_climate_r4_budget_mismatch');
