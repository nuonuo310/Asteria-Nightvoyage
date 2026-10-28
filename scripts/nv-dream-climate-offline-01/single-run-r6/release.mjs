import fs from 'node:fs';
import {hash} from '../../../src/contract.js';
import {copy,fail} from '../../../src/store.js';
import {
  r6AllowanceCapMicroCny,r6AllowanceId,r6AuthorityCommit,r6CallsPerRun,
  r6ExecutionPin,r6IdentityVersion,r6MaxCalls,r6OfflineHead,
  r6OfflineIdentityHash,r6OfflineParent,r6OfflinePromptHash,
  r6OfflineSourceHash,r6OfflineTree,r6PerCallMaximumMicroCny,
  r6PricePageSha256,r6ProtocolVersion,r6ReceiptFileName,r6ReleasePath,
  r6RunCount,r6RunId,r6RuntimeVersion,r6ScenesPerRun,r6StoreDirectory,
  r6WorstMicroCny
} from './config.mjs';
import {r6MatrixHash} from './matrix.mjs';
import {r6PriceSnapshotHash} from './price.mjs';

export const r6ReleaseKeys=Object.freeze([
  'status','profile','authorityCommit','identityVersion','executionDigest',
  'offlineHead','offlineTree','offlineParent','offlineIdentityHash','offlinePromptHash',
  'offlineSourceHash','protocolVersion','runtimeVersion','matrixHash','priceSnapshotHash',
  'pricePageSha256','allowanceId','allowanceCapMicroCny','perCallMaximumMicroCny',
  'worstMicroCny','maxRuns','maxCalls','scenesPerRun','callsPerRun','runId',
  'storeDirectory','receiptFile','noRetry'
]);

const exact=(value,names)=>value&&typeof value==='object'&&!Array.isArray(value)&&
  Object.keys(value).length===names.length&&names.every(name=>Object.hasOwn(value,name));

export function r6ReleaseObject(){
  return {
    status:'approved_once',profile:'nv-dream-climate-single-run-r6-v1',
    authorityCommit:r6AuthorityCommit,identityVersion:r6IdentityVersion,
    executionDigest:r6ExecutionPin,
    offlineHead:r6OfflineHead,offlineTree:r6OfflineTree,offlineParent:r6OfflineParent,
    offlineIdentityHash:r6OfflineIdentityHash,offlinePromptHash:r6OfflinePromptHash,
    offlineSourceHash:r6OfflineSourceHash,protocolVersion:r6ProtocolVersion,
    runtimeVersion:r6RuntimeVersion,matrixHash:r6MatrixHash,
    priceSnapshotHash:r6PriceSnapshotHash,pricePageSha256:r6PricePageSha256,
    allowanceId:r6AllowanceId,allowanceCapMicroCny:r6AllowanceCapMicroCny,
    perCallMaximumMicroCny:r6PerCallMaximumMicroCny,worstMicroCny:r6WorstMicroCny,
    maxRuns:r6RunCount,maxCalls:r6MaxCalls,scenesPerRun:r6ScenesPerRun,
    callsPerRun:r6CallsPerRun,runId:r6RunId,storeDirectory:r6StoreDirectory,
    receiptFile:r6ReceiptFileName,noRetry:true
  };
}

export const r6ExpectedReleaseHash=hash(r6ReleaseObject());

export function validateR6Release(value){
  if(!exact(value,r6ReleaseKeys))fail('dream_climate_r6_release_shape');
  if(hash(value)!==r6ExpectedReleaseHash)fail('dream_climate_r6_release_mismatch');
  const expected=r6ReleaseObject();
  if(hash(value)!==hash(expected)||value.status!==expected.status||
     value.noRetry!==true||value.executionDigest!==r6ExecutionPin)
    fail('dream_climate_r6_release_mismatch');
  return copy(value);
}

export function readR6Release(file=r6ReleasePath){
  let bytes;
  try{bytes=fs.readFileSync(file);}catch(error){
    fail(error.code==='ENOENT'?'dream_climate_r6_release_required':
      'dream_climate_r6_release_unreadable');
  }
  try{
    const text=bytes.toString('utf8');
    if(!Buffer.from(text,'utf8').equals(bytes))fail('dream_climate_r6_release_invalid_utf8');
    return validateR6Release(JSON.parse(text));
  }catch(error){
    if(typeof error?.message==='string'&&error.message.startsWith('dream_climate_r6_'))
      throw error;
    fail('dream_climate_r6_release_invalid_json');
  }
}

export function revokeR6Release(file=r6ReleasePath){
  fs.rmSync(file,{force:true});
  return !fs.existsSync(file);
}

if(r6PerCallMaximumMicroCny*r6MaxCalls!==r6WorstMicroCny||
   r6WorstMicroCny>r6AllowanceCapMicroCny)
  fail('dream_climate_r6_budget_mismatch');
