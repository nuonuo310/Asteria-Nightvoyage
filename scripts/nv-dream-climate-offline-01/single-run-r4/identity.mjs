// Independent R4 identity. It pins the frozen offline candidate, the fixed
// single-run profile, the reused Phase B execution files and the R4 release.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {hash} from '../../../src/contract.js';
import {copy,fail} from '../../../src/store.js';
import {dreamClimateIdentity} from '../identity.mjs';
import {offlineExecutionFiles} from '../phase-b/config.mjs';
import {
  r4AllowanceCapMicroCny,r4AllowanceId,r4AuthorityCommit,r4CallsPerRun,
  r4Endpoint,r4ExtractionVersion,r4IdentityVersion,r4MaxCalls,r4MaxOutputTokens,
  r4ModelAlias,r4ObservedModelAlias,r4OfflineHead,r4OfflineIdentityHash,
  r4OfflineParent,r4OfflinePromptHash,r4OfflineSourceHash,r4OfflineTree,
  r4PerCallMaximumMicroCny,r4PricePageSha256,r4RequestByteLimit,r4RunCount,
  r4RunId,r4RuntimeVersion,r4ScenesPerRun,r4StoreBasename,r4StoreDirectory,
  r4StoreParent,r4StorePrefix,r4TransportVersion,r4WorstMicroCny
} from './config.mjs';
import {assertR4Matrix,r4Matrix,r4MatrixHash} from './matrix.mjs';
import {r4PriceSnapshotHash} from './price.mjs';
import {r4ExpectedReleaseHash} from './release.mjs';

const packageDirectory=fileURLToPath(new URL('.',import.meta.url));
const sharedDirectory=path.resolve(packageDirectory,'../phase-b');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const exact=(value,names)=>value&&typeof value==='object'&&!Array.isArray(value)&&
  Object.keys(value).length===names.length&&names.every(name=>Object.hasOwn(value,name));
const sharedNames=Object.freeze(['config.mjs','diagnostics.mjs','dummy.mjs','identity.mjs',
  'matrix.mjs','profile.mjs','records.mjs','runtime.mjs','telemetry.mjs','transport.mjs']);

function normalizedDigest(file){
  const bytes=fs.readFileSync(file),text=bytes.toString('utf8');
  if(!Buffer.from(text,'utf8').equals(bytes))fail('dream_climate_r4_invalid_utf8');
  return digest(Buffer.from(text.replaceAll('\r\n','\n'),'utf8'));
}

function executionFiles(directory){
  const result={};
  for(const entry of fs.readdirSync(directory,{withFileTypes:true})
    .filter(entry=>entry.isFile()&&(entry.name.endsWith('.mjs')||entry.name.endsWith('.ps1')))
    .sort((left,right)=>left.name.localeCompare(right.name,'en'))) {
    result[entry.name]=normalizedDigest(path.join(directory,entry.name));
  }
  if(Object.keys(result).length===0)fail('dream_climate_r4_inventory_empty');
  return result;
}

function sharedExecutionFiles(directory=sharedDirectory){
  const result={};
  for(const name of sharedNames)result[name]=normalizedDigest(path.join(directory,name));
  return result;
}

export function createR4IdentityManifest({directory=packageDirectory,
  shared=sharedDirectory}={}){
  const packageRoot=fs.realpathSync(path.resolve(directory));
  const sharedRoot=fs.realpathSync(path.resolve(shared));
  const offline=dreamClimateIdentity();
  if(offline.identityHash!==r4OfflineIdentityHash||offline.promptHash!==r4OfflinePromptHash||
     offline.sourceHash!==r4OfflineSourceHash)fail('dream_climate_r4_offline_identity_changed');
  if(hash(offline.executionFiles)!==hash(offlineExecutionFiles))
    fail('dream_climate_r4_offline_blob_changed');
  assertR4Matrix();
  return {
    schemaVersion:1,identityVersion:r4IdentityVersion,
    authorityCommit:r4AuthorityCommit,
    offline:{head:r4OfflineHead,tree:r4OfflineTree,parent:r4OfflineParent,
      identityHash:r4OfflineIdentityHash,promptHash:r4OfflinePromptHash,
      sourceHash:r4OfflineSourceHash,executionFiles:copy(offlineExecutionFiles)},
    matrix:copy(r4Matrix),matrixHash:r4MatrixHash,
    priceSnapshotHash:r4PriceSnapshotHash,pricePageSha256:r4PricePageSha256,
    modelAlias:r4ModelAlias,observedModelAlias:r4ObservedModelAlias,endpoint:r4Endpoint,
    requestByteLimit:r4RequestByteLimit,maxOutputTokens:r4MaxOutputTokens,
    scenesPerRun:r4ScenesPerRun,callsPerRun:r4CallsPerRun,runCount:r4RunCount,
    maxCalls:r4MaxCalls,allowanceId:r4AllowanceId,
    allowanceCapMicroCny:r4AllowanceCapMicroCny,
    perCallMaximumMicroCny:r4PerCallMaximumMicroCny,worstMicroCny:r4WorstMicroCny,
    store:{parent:r4StoreParent,prefix:r4StorePrefix,basename:r4StoreBasename,
      directory:r4StoreDirectory,runId:r4RunId},
    transportVersion:r4TransportVersion,extractionVersion:r4ExtractionVersion,
    runtimeVersion:r4RuntimeVersion,releaseHash:r4ExpectedReleaseHash,noRetry:true,
    executionFiles:executionFiles(packageRoot),
    sharedExecutionFiles:sharedExecutionFiles(sharedRoot)
  };
}

export function validateR4IdentityManifest(manifest,current){
  const names=['schemaVersion','identityVersion','authorityCommit','offline','matrix',
    'matrixHash','priceSnapshotHash','pricePageSha256','modelAlias','observedModelAlias',
    'endpoint','requestByteLimit','maxOutputTokens','scenesPerRun','callsPerRun','runCount',
    'maxCalls','allowanceId','allowanceCapMicroCny','perCallMaximumMicroCny','worstMicroCny',
    'store','transportVersion','extractionVersion','runtimeVersion','releaseHash','noRetry',
    'executionFiles','sharedExecutionFiles'];
  if(!exact(manifest,names)||!current||hash(manifest)!==hash(current))
    fail('invalid_dream_climate_r4_identity_manifest');
  return manifest;
}

export function verifyR4Identity({directory=packageDirectory,shared=sharedDirectory}={}){
  const packageRoot=fs.realpathSync(path.resolve(directory));
  let manifest;
  try{
    const bytes=fs.readFileSync(path.join(packageRoot,'identity.json'));
    const text=bytes.toString('utf8');
    if(!Buffer.from(text,'utf8').equals(bytes))fail('dream_climate_r4_invalid_utf8');
    manifest=JSON.parse(text);
  }catch(error){
    if(error?.message==='dream_climate_r4_invalid_utf8')throw error;
    fail('invalid_dream_climate_r4_identity_manifest');
  }
  const current=createR4IdentityManifest({directory:packageRoot,shared});
  validateR4IdentityManifest(manifest,current);
  return {
    identityVersion:r4IdentityVersion,identityHash:hash(manifest),
    offlineIdentityHash:r4OfflineIdentityHash,matrixHash:r4MatrixHash,
    priceSnapshotHash:r4PriceSnapshotHash,releaseHash:r4ExpectedReleaseHash,
    allowanceId:r4AllowanceId,allowanceCapMicroCny:r4AllowanceCapMicroCny,
    maxCalls:r4MaxCalls,runCount:r4RunCount,requestByteLimit:r4RequestByteLimit,
    executionFiles:Object.keys(manifest.executionFiles).length,
    sharedExecutionFiles:Object.keys(manifest.sharedExecutionFiles).length
  };
}

export {packageDirectory as r4PackageDirectory,sharedDirectory as r4SharedDirectory};
