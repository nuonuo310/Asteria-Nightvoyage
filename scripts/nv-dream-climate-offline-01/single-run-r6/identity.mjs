// Independent R6 identity. It pins the frozen R5 offline candidate, the fixed
// single-run profile, every reused Phase B execution file and an explicit
// reviewed execution digest that cannot be refreshed from current code alone.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {hash} from '../../../src/contract.js';
import {copy,fail} from '../../../src/store.js';
import {dreamClimateIdentity} from '../identity.mjs';
import {r6OfflineExecutionFiles} from './config.mjs';
import {
  r6AllowanceCapMicroCny,r6AllowanceId,r6AuthorityCommit,r6CallsPerRun,
  r6DiagnosticVersion,r6Endpoint,r6ExecutionPin,r6ExtractionVersion,
  r6IdentityVersion,r6MaxCalls,r6MaxOutputTokens,r6ModelAlias,
  r6NormalizationVersion,r6ObservedModelAlias,r6OfflineHead,
  r6OfflineIdentityHash,r6OfflineParent,r6OfflinePromptHash,
  r6OfflineSourceHash,r6OfflineTree,r6PerCallMaximumMicroCny,
  r6PricePageSha256,r6ProfileVersion,r6ProtocolVersion,r6ReceiptFileName,
  r6RequestByteLimit,r6RunCount,r6RunId,r6RuntimeVersion,r6ScenesPerRun,
  r6StoreBasename,r6StoreDirectory,r6StoreParent,r6StorePrefix,
  r6TransportVersion,r6WorstMicroCny
} from './config.mjs';
import {assertR6Matrix,r6Matrix,r6MatrixHash} from './matrix.mjs';
import {r6PriceSnapshotHash} from './price.mjs';
import {r6ExpectedReleaseHash} from './release.mjs';

const packageDirectory=fileURLToPath(new URL('.',import.meta.url));
const sharedDirectory=path.resolve(packageDirectory,'../phase-b');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const exact=(value,names)=>value&&typeof value==='object'&&!Array.isArray(value)&&
  Object.keys(value).length===names.length&&names.every(name=>Object.hasOwn(value,name));
const unpinnedFiles=new Set(['execution-pin.mjs','execution-pin.ps1']);
const sharedNames=Object.freeze(['config.mjs','diagnostics.mjs','dummy.mjs','identity.mjs',
  'matrix.mjs','profile.mjs','records.mjs','runtime.mjs','telemetry.mjs','transport.mjs']);

function normalizedDigest(file){
  const bytes=fs.readFileSync(file),text=bytes.toString('utf8');
  if(!Buffer.from(text,'utf8').equals(bytes))fail('dream_climate_r6_invalid_utf8');
  return digest(Buffer.from(text.replaceAll('\r\n','\n'),'utf8'));
}

function executionFiles(directory){
  const result={};
  for(const entry of fs.readdirSync(directory,{withFileTypes:true})
    .filter(entry=>entry.isFile()&&(entry.name.endsWith('.mjs')||entry.name.endsWith('.ps1')))
    .filter(entry=>!unpinnedFiles.has(entry.name))
    .sort((left,right)=>left.name.localeCompare(right.name,'en'))) {
    result[entry.name]=normalizedDigest(path.join(directory,entry.name));
  }
  if(Object.keys(result).length===0)fail('dream_climate_r6_inventory_empty');
  return result;
}

function sharedExecutionFiles(directory=sharedDirectory){
  const result={};
  for(const name of sharedNames)result[name]=normalizedDigest(path.join(directory,name));
  return result;
}

export function r6ExecutionContract(){
  return {
    authorityCommit:r6AuthorityCommit,
    offline:{head:r6OfflineHead,tree:r6OfflineTree,parent:r6OfflineParent,
      identityHash:r6OfflineIdentityHash,promptHash:r6OfflinePromptHash,
      sourceHash:r6OfflineSourceHash},
    profileVersion:r6ProfileVersion,runtimeVersion:r6RuntimeVersion,
    protocolVersion:r6ProtocolVersion,normalizationVersion:r6NormalizationVersion,
    transportVersion:r6TransportVersion,extractionVersion:r6ExtractionVersion,
    diagnosticVersion:r6DiagnosticVersion,
    runId:r6RunId,allowanceId:r6AllowanceId,
    allowanceCapMicroCny:r6AllowanceCapMicroCny,
    perCallMaximumMicroCny:r6PerCallMaximumMicroCny,worstMicroCny:r6WorstMicroCny,
    runCount:r6RunCount,maxCalls:r6MaxCalls,scenesPerRun:r6ScenesPerRun,
    callsPerRun:r6CallsPerRun,requestByteLimit:r6RequestByteLimit,
    maxOutputTokens:r6MaxOutputTokens,modelAlias:r6ModelAlias,
    observedModelAlias:r6ObservedModelAlias,endpoint:r6Endpoint,
    matrixHash:r6MatrixHash,priceSnapshotHash:r6PriceSnapshotHash,
    pricePageSha256:r6PricePageSha256,storeDirectory:r6StoreDirectory,
    receiptFileName:r6ReceiptFileName,noRetry:true
  };
}

export function r6ExecutionDigest({executionContract=r6ExecutionContract(),
  executionFiles:files,sharedExecutionFiles:shared}={}){
  if(!files||!shared)fail('dream_climate_r6_execution_inventory_required');
  return hash({executionContract,executionFiles:files,sharedExecutionFiles:shared});
}

export function assertR6ExecutionPin(value){
  if(typeof value!=='string'||value!==r6ExecutionPin)
    fail('dream_climate_r6_execution_pin_mismatch');
  return true;
}

export function createR6IdentityManifest({directory=packageDirectory,
  shared=sharedDirectory}={}){
  const packageRoot=fs.realpathSync(path.resolve(directory));
  const sharedRoot=fs.realpathSync(path.resolve(shared));
  const offline=dreamClimateIdentity();
  if(offline.identityHash!==r6OfflineIdentityHash||offline.promptHash!==r6OfflinePromptHash||
     offline.sourceHash!==r6OfflineSourceHash)fail('dream_climate_r6_offline_identity_changed');
  if(hash(offline.executionFiles)!==hash(r6OfflineExecutionFiles))
    fail('dream_climate_r6_offline_blob_changed');
  assertR6Matrix();
  const files=executionFiles(packageRoot),sharedFiles=sharedExecutionFiles(sharedRoot);
  const executionContract=r6ExecutionContract();
  const executionDigest=r6ExecutionDigest({executionContract,executionFiles:files,
    sharedExecutionFiles:sharedFiles});
  return {
    schemaVersion:1,identityVersion:r6IdentityVersion,
    authorityCommit:r6AuthorityCommit,
    offline:{head:r6OfflineHead,tree:r6OfflineTree,parent:r6OfflineParent,
      identityHash:r6OfflineIdentityHash,promptHash:r6OfflinePromptHash,
      sourceHash:r6OfflineSourceHash,executionFiles:copy(r6OfflineExecutionFiles)},
    matrix:copy(r6Matrix),matrixHash:r6MatrixHash,
    executionContract,executionDigest,
    priceSnapshotHash:r6PriceSnapshotHash,pricePageSha256:r6PricePageSha256,
    modelAlias:r6ModelAlias,observedModelAlias:r6ObservedModelAlias,endpoint:r6Endpoint,
    requestByteLimit:r6RequestByteLimit,maxOutputTokens:r6MaxOutputTokens,
    scenesPerRun:r6ScenesPerRun,callsPerRun:r6CallsPerRun,runCount:r6RunCount,
    maxCalls:r6MaxCalls,allowanceId:r6AllowanceId,
    allowanceCapMicroCny:r6AllowanceCapMicroCny,
    perCallMaximumMicroCny:r6PerCallMaximumMicroCny,worstMicroCny:r6WorstMicroCny,
    store:{parent:r6StoreParent,prefix:r6StorePrefix,basename:r6StoreBasename,
      directory:r6StoreDirectory,runId:r6RunId,receipt:r6ReceiptFileName},
    protocolVersion:r6ProtocolVersion,transportVersion:r6TransportVersion,
    extractionVersion:r6ExtractionVersion,runtimeVersion:r6RuntimeVersion,
    profileVersion:r6ProfileVersion,releaseHash:r6ExpectedReleaseHash,noRetry:true,
    executionFiles:files,sharedExecutionFiles:sharedFiles
  };
}

export function validateR6IdentityManifest(manifest,current){
  const names=['schemaVersion','identityVersion','authorityCommit','offline','matrix',
    'matrixHash','executionContract','executionDigest','priceSnapshotHash','pricePageSha256',
    'modelAlias','observedModelAlias','endpoint','requestByteLimit','maxOutputTokens',
    'scenesPerRun','callsPerRun','runCount','maxCalls','allowanceId','allowanceCapMicroCny',
    'perCallMaximumMicroCny','worstMicroCny','store','protocolVersion','transportVersion',
    'extractionVersion','runtimeVersion','profileVersion','releaseHash','noRetry',
    'executionFiles','sharedExecutionFiles'];
  if(!exact(manifest,names)||!current||hash(manifest)!==hash(current))
    fail('invalid_dream_climate_r6_identity_manifest');
  assertR6ExecutionPin(manifest.executionDigest);
  assertR6ExecutionPin(current.executionDigest);
  return manifest;
}

export function verifyR6Identity({directory=packageDirectory,shared=sharedDirectory}={}){
  const packageRoot=fs.realpathSync(path.resolve(directory));
  let manifest;
  try{
    const bytes=fs.readFileSync(path.join(packageRoot,'identity.json'));
    const text=bytes.toString('utf8');
    if(!Buffer.from(text,'utf8').equals(bytes))fail('dream_climate_r6_invalid_utf8');
    manifest=JSON.parse(text);
  }catch(error){
    if(error?.message==='dream_climate_r6_invalid_utf8')throw error;
    fail('invalid_dream_climate_r6_identity_manifest');
  }
  const current=createR6IdentityManifest({directory:packageRoot,shared});
  validateR6IdentityManifest(manifest,current);
  return {
    identityVersion:r6IdentityVersion,identityHash:hash(manifest),
    executionDigest:manifest.executionDigest,executionPin:r6ExecutionPin,
    offlineIdentityHash:r6OfflineIdentityHash,matrixHash:r6MatrixHash,
    priceSnapshotHash:r6PriceSnapshotHash,releaseHash:r6ExpectedReleaseHash,
    allowanceId:r6AllowanceId,allowanceCapMicroCny:r6AllowanceCapMicroCny,
    maxCalls:r6MaxCalls,runCount:r6RunCount,requestByteLimit:r6RequestByteLimit,
    executionFiles:Object.keys(manifest.executionFiles).length,
    sharedExecutionFiles:Object.keys(manifest.sharedExecutionFiles).length
  };
}

export {packageDirectory as r6PackageDirectory,sharedDirectory as r6SharedDirectory};
