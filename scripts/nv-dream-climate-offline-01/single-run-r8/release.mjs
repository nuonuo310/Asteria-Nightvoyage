import fs from 'node:fs';
import {hash} from '../../../src/contract.js';
import {copy,fail} from '../../../src/store.js';
import {
  r8AllowanceCapMicroCny,r8AllowanceId,r8AuthorityCommit,r8CallsPerRun,
  r8ExecutionPin,r8IdentityVersion,r8MaxCalls,r8OfflineHead,
  r8OfflineIdentityHash,r8OfflineParent,r8OfflinePromptHash,
  r8OfflineSourceHash,r8OfflineTree,r8PerCallMaximumMicroCny,
  r8PricePageSha256,r8ProtocolVersion,r8ReceiptFileName,r8ReleasePath,
  r8RunCount,r8RunId,r8RuntimeVersion,r8ScenesPerRun,r8StoreDirectory,
  r8WorstMicroCny
} from './config.mjs';
import {r8MatrixHash} from './matrix.mjs';
import {r8PriceSnapshotHash} from './price.mjs';
import {dreamClimateIdentity} from '../identity.mjs';

export const r8ReleaseKeys=Object.freeze([
  'status','profile','authorityCommit','identityVersion','executionDigest',
  'offlineHead','offlineTree','offlineParent','offlineIdentityHash','offlinePromptHash',
  'offlineSourceHash','protocolVersion','runtimeVersion','matrixHash','priceSnapshotHash',
  'pricePageSha256','allowanceId','allowanceCapMicroCny','perCallMaximumMicroCny',
  'worstMicroCny','maxRuns','maxCalls','scenesPerRun','callsPerRun','runId',
  'storeDirectory','receiptFile','noRetry'
]);

const exact=(value,names)=>value&&typeof value==='object'&&!Array.isArray(value)&&
  Object.keys(value).length===names.length&&names.every(name=>Object.hasOwn(value,name));

export function r8ReleaseObject(){
  return {
    status:'approved_once',profile:'nv-dream-climate-single-run-r8-v1',
    authorityCommit:r8AuthorityCommit,identityVersion:r8IdentityVersion,
    executionDigest:r8ExecutionPin,
    offlineHead:r8OfflineHead,offlineTree:r8OfflineTree,offlineParent:r8OfflineParent,
    offlineIdentityHash:r8OfflineIdentityHash,offlinePromptHash:r8OfflinePromptHash,
    offlineSourceHash:r8OfflineSourceHash,protocolVersion:r8ProtocolVersion,
    runtimeVersion:r8RuntimeVersion,matrixHash:r8MatrixHash,
    priceSnapshotHash:r8PriceSnapshotHash,pricePageSha256:r8PricePageSha256,
    allowanceId:r8AllowanceId,allowanceCapMicroCny:r8AllowanceCapMicroCny,
    perCallMaximumMicroCny:r8PerCallMaximumMicroCny,worstMicroCny:r8WorstMicroCny,
    maxRuns:r8RunCount,maxCalls:r8MaxCalls,scenesPerRun:r8ScenesPerRun,
    callsPerRun:r8CallsPerRun,runId:r8RunId,storeDirectory:r8StoreDirectory,
    receiptFile:r8ReceiptFileName,noRetry:true
  };
}

export const r8ExpectedReleaseHash=hash(r8ReleaseObject());

export function validateR8Release(value){
  if(!exact(value,r8ReleaseKeys))fail('dream_climate_r8_release_shape');
  if(hash(value)!==r8ExpectedReleaseHash)fail('dream_climate_r8_release_mismatch');
  let current;
  try{current=dreamClimateIdentity();}catch{fail('dream_climate_r8_release_superseded');}
  if(current.identityHash!==r8OfflineIdentityHash)fail('dream_climate_r8_release_superseded');
  const expected=r8ReleaseObject();
  if(hash(value)!==hash(expected)||value.status!==expected.status||
     value.noRetry!==true||value.executionDigest!==r8ExecutionPin)
    fail('dream_climate_r8_release_mismatch');
  return copy(value);
}

export function readR8Release(file=r8ReleasePath){
  let bytes;
  try{bytes=fs.readFileSync(file);}catch(error){
    fail(error.code==='ENOENT'?'dream_climate_r8_release_required':
      'dream_climate_r8_release_unreadable');
  }
  try{
    const text=bytes.toString('utf8');
    if(!Buffer.from(text,'utf8').equals(bytes))fail('dream_climate_r8_release_invalid_utf8');
    return validateR8Release(JSON.parse(text));
  }catch(error){
    if(typeof error?.message==='string'&&error.message.startsWith('dream_climate_r8_'))
      throw error;
    fail('dream_climate_r8_release_invalid_json');
  }
}

export function revokeR8Release(file=r8ReleasePath){
  fs.rmSync(file,{force:true});
  return !fs.existsSync(file);
}

if(r8PerCallMaximumMicroCny*r8MaxCalls!==r8WorstMicroCny||
   r8WorstMicroCny>r8AllowanceCapMicroCny)
  fail('dream_climate_r8_budget_mismatch');
