import fs from 'node:fs';
import {hash} from '../../../src/contract.js';
import {copy,fail} from '../../../src/store.js';
import {
  r10AllowanceCapMicroCny,r10AllowanceId,r10AuthorityCommit,r10CallsPerRun,
  r10ExecutionPin,r10IdentityVersion,r10MaxCalls,r10OfflineHead,
  r10OfflineIdentityHash,r10OfflineParent,r10OfflinePromptHash,
  r10OfflineSourceHash,r10OfflineTree,r10PerCallMaximumMicroCny,
  r10PricePageSha256,r10ProtocolVersion,r10ReceiptFileName,r10ReleasePath,
  r10RunCount,r10RunId,r10RuntimeVersion,r10ScenesPerRun,r10StoreDirectory,
  r10WorstMicroCny
} from './config.mjs';
import {r10MatrixHash} from './matrix.mjs';
import {r10PriceSnapshotHash} from './price.mjs';
import {dreamClimateIdentity} from '../identity.mjs';

export const r10ReleaseKeys=Object.freeze([
  'status','profile','authorityCommit','identityVersion','executionDigest',
  'offlineHead','offlineTree','offlineParent','offlineIdentityHash','offlinePromptHash',
  'offlineSourceHash','protocolVersion','runtimeVersion','matrixHash','priceSnapshotHash',
  'pricePageSha256','allowanceId','allowanceCapMicroCny','perCallMaximumMicroCny',
  'worstMicroCny','maxRuns','maxCalls','scenesPerRun','callsPerRun','runId',
  'storeDirectory','receiptFile','noRetry'
]);

const exact=(value,names)=>value&&typeof value==='object'&&!Array.isArray(value)&&
  Object.keys(value).length===names.length&&names.every(name=>Object.hasOwn(value,name));

export function r10ReleaseObject(){
  return {
    status:'approved_once',profile:'nv-dream-climate-single-run-r10-v1',
    authorityCommit:r10AuthorityCommit,identityVersion:r10IdentityVersion,
    executionDigest:r10ExecutionPin,
    offlineHead:r10OfflineHead,offlineTree:r10OfflineTree,offlineParent:r10OfflineParent,
    offlineIdentityHash:r10OfflineIdentityHash,offlinePromptHash:r10OfflinePromptHash,
    offlineSourceHash:r10OfflineSourceHash,protocolVersion:r10ProtocolVersion,
    runtimeVersion:r10RuntimeVersion,matrixHash:r10MatrixHash,
    priceSnapshotHash:r10PriceSnapshotHash,pricePageSha256:r10PricePageSha256,
    allowanceId:r10AllowanceId,allowanceCapMicroCny:r10AllowanceCapMicroCny,
    perCallMaximumMicroCny:r10PerCallMaximumMicroCny,worstMicroCny:r10WorstMicroCny,
    maxRuns:r10RunCount,maxCalls:r10MaxCalls,scenesPerRun:r10ScenesPerRun,
    callsPerRun:r10CallsPerRun,runId:r10RunId,storeDirectory:r10StoreDirectory,
    receiptFile:r10ReceiptFileName,noRetry:true
  };
}

export const r10ExpectedReleaseHash=hash(r10ReleaseObject());

export function validateR10Release(value){
  if(!exact(value,r10ReleaseKeys))fail('dream_climate_r10_release_shape');
  if(hash(value)!==r10ExpectedReleaseHash)fail('dream_climate_r10_release_mismatch');
  let current;
  try{current=dreamClimateIdentity();}catch{fail('dream_climate_r10_release_superseded');}
  if(current.identityHash!==r10OfflineIdentityHash)fail('dream_climate_r10_release_superseded');
  const expected=r10ReleaseObject();
  if(hash(value)!==hash(expected)||value.status!==expected.status||
     value.noRetry!==true||value.executionDigest!==r10ExecutionPin)
    fail('dream_climate_r10_release_mismatch');
  return copy(value);
}

export function readR10Release(file=r10ReleasePath){
  let bytes;
  try{bytes=fs.readFileSync(file);}catch(error){
    fail(error.code==='ENOENT'?'dream_climate_r10_release_required':
      'dream_climate_r10_release_unreadable');
  }
  try{
    const text=bytes.toString('utf8');
    if(!Buffer.from(text,'utf8').equals(bytes))fail('dream_climate_r10_release_invalid_utf8');
    return validateR10Release(JSON.parse(text));
  }catch(error){
    if(typeof error?.message==='string'&&error.message.startsWith('dream_climate_r10_'))
      throw error;
    fail('dream_climate_r10_release_invalid_json');
  }
}

export function revokeR10Release(file=r10ReleasePath){
  fs.rmSync(file,{force:true});
  return !fs.existsSync(file);
}

if(r10PerCallMaximumMicroCny*r10MaxCalls!==r10WorstMicroCny||
   r10WorstMicroCny>r10AllowanceCapMicroCny)
  fail('dream_climate_r10_budget_mismatch');
