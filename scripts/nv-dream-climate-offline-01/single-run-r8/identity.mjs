// Independent R8 identity. It pins the frozen R5 offline candidate, the fixed
// single-run profile, every reused Phase B execution file and an explicit
// reviewed execution digest that cannot be refreshed from current code alone.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {hash} from '../../../src/contract.js';
import {copy,fail} from '../../../src/store.js';
import {dreamClimateIdentity} from '../identity.mjs';
import {r8OfflineExecutionFiles} from './config.mjs';
import {
  r8AllowanceCapMicroCny,r8AllowanceId,r8AuthorityCommit,r8CallsPerRun,
  r8DiagnosticVersion,r8Endpoint,r8ExecutionPin,r8ExtractionVersion,
  r8IdentityVersion,r8MaxCalls,r8MaxOutputTokens,r8ModelAlias,
  r8NormalizationVersion,r8ObservedModelAlias,r8OfflineHead,
  r8OfflineIdentityHash,r8OfflineParent,r8OfflinePromptHash,
  r8OfflineSourceHash,r8OfflineTree,r8PerCallMaximumMicroCny,
  r8PricePageSha256,r8ProfileVersion,r8ProtocolVersion,r8ReceiptFileName,
  r8RequestByteLimit,r8RunCount,r8RunId,r8RuntimeVersion,r8ScenesPerRun,
  r8StoreBasename,r8StoreDirectory,r8StoreParent,r8StorePrefix,
  r8TransportVersion,r8WorstMicroCny
} from './config.mjs';
import {assertR8Matrix,r8Matrix,r8MatrixHash} from './matrix.mjs';
import {r8PriceSnapshotHash} from './price.mjs';
import {r8ExpectedReleaseHash} from './release.mjs';

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
  if(!Buffer.from(text,'utf8').equals(bytes))fail('dream_climate_r8_invalid_utf8');
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
  if(Object.keys(result).length===0)fail('dream_climate_r8_inventory_empty');
  return result;
}

function sharedExecutionFiles(directory=sharedDirectory){
  const result={};
  for(const name of sharedNames)result[name]=normalizedDigest(path.join(directory,name));
  return result;
}

export function r8ExecutionContract(){
  return {
    authorityCommit:r8AuthorityCommit,
    offline:{head:r8OfflineHead,tree:r8OfflineTree,parent:r8OfflineParent,
      identityHash:r8OfflineIdentityHash,promptHash:r8OfflinePromptHash,
      sourceHash:r8OfflineSourceHash},
    profileVersion:r8ProfileVersion,runtimeVersion:r8RuntimeVersion,
    protocolVersion:r8ProtocolVersion,normalizationVersion:r8NormalizationVersion,
    transportVersion:r8TransportVersion,extractionVersion:r8ExtractionVersion,
    diagnosticVersion:r8DiagnosticVersion,
    runId:r8RunId,allowanceId:r8AllowanceId,
    allowanceCapMicroCny:r8AllowanceCapMicroCny,
    perCallMaximumMicroCny:r8PerCallMaximumMicroCny,worstMicroCny:r8WorstMicroCny,
    runCount:r8RunCount,maxCalls:r8MaxCalls,scenesPerRun:r8ScenesPerRun,
    callsPerRun:r8CallsPerRun,requestByteLimit:r8RequestByteLimit,
    maxOutputTokens:r8MaxOutputTokens,modelAlias:r8ModelAlias,
    observedModelAlias:r8ObservedModelAlias,endpoint:r8Endpoint,
    matrixHash:r8MatrixHash,priceSnapshotHash:r8PriceSnapshotHash,
    pricePageSha256:r8PricePageSha256,storeDirectory:r8StoreDirectory,
    receiptFileName:r8ReceiptFileName,noRetry:true
  };
}

export function r8ExecutionDigest({executionContract=r8ExecutionContract(),
  executionFiles:files,sharedExecutionFiles:shared}={}){
  if(!files||!shared)fail('dream_climate_r8_execution_inventory_required');
  return hash({executionContract,executionFiles:files,sharedExecutionFiles:shared});
}

export function assertR8ExecutionPin(value){
  if(typeof value!=='string'||value!==r8ExecutionPin)
    fail('dream_climate_r8_execution_pin_mismatch');
  return true;
}

export function createR8IdentityManifest({directory=packageDirectory,
  shared=sharedDirectory}={}){
  const packageRoot=fs.realpathSync(path.resolve(directory));
  const sharedRoot=fs.realpathSync(path.resolve(shared));
  const offline=dreamClimateIdentity();
  if(offline.identityHash!==r8OfflineIdentityHash||offline.promptHash!==r8OfflinePromptHash||
     offline.sourceHash!==r8OfflineSourceHash)fail('dream_climate_r8_offline_identity_changed');
  if(hash(offline.executionFiles)!==hash(r8OfflineExecutionFiles))
    fail('dream_climate_r8_offline_blob_changed');
  assertR8Matrix();
  const files=executionFiles(packageRoot),sharedFiles=sharedExecutionFiles(sharedRoot);
  const executionContract=r8ExecutionContract();
  const executionDigest=r8ExecutionDigest({executionContract,executionFiles:files,
    sharedExecutionFiles:sharedFiles});
  return {
    schemaVersion:1,identityVersion:r8IdentityVersion,
    authorityCommit:r8AuthorityCommit,
    offline:{head:r8OfflineHead,tree:r8OfflineTree,parent:r8OfflineParent,
      identityHash:r8OfflineIdentityHash,promptHash:r8OfflinePromptHash,
      sourceHash:r8OfflineSourceHash,executionFiles:copy(r8OfflineExecutionFiles)},
    matrix:copy(r8Matrix),matrixHash:r8MatrixHash,
    executionContract,executionDigest,
    priceSnapshotHash:r8PriceSnapshotHash,pricePageSha256:r8PricePageSha256,
    modelAlias:r8ModelAlias,observedModelAlias:r8ObservedModelAlias,endpoint:r8Endpoint,
    requestByteLimit:r8RequestByteLimit,maxOutputTokens:r8MaxOutputTokens,
    scenesPerRun:r8ScenesPerRun,callsPerRun:r8CallsPerRun,runCount:r8RunCount,
    maxCalls:r8MaxCalls,allowanceId:r8AllowanceId,
    allowanceCapMicroCny:r8AllowanceCapMicroCny,
    perCallMaximumMicroCny:r8PerCallMaximumMicroCny,worstMicroCny:r8WorstMicroCny,
    store:{parent:r8StoreParent,prefix:r8StorePrefix,basename:r8StoreBasename,
      directory:r8StoreDirectory,runId:r8RunId,receipt:r8ReceiptFileName},
    protocolVersion:r8ProtocolVersion,transportVersion:r8TransportVersion,
    extractionVersion:r8ExtractionVersion,runtimeVersion:r8RuntimeVersion,
    profileVersion:r8ProfileVersion,releaseHash:r8ExpectedReleaseHash,noRetry:true,
    executionFiles:files,sharedExecutionFiles:sharedFiles
  };
}

export function validateR8IdentityManifest(manifest,current){
  const names=['schemaVersion','identityVersion','authorityCommit','offline','matrix',
    'matrixHash','executionContract','executionDigest','priceSnapshotHash','pricePageSha256',
    'modelAlias','observedModelAlias','endpoint','requestByteLimit','maxOutputTokens',
    'scenesPerRun','callsPerRun','runCount','maxCalls','allowanceId','allowanceCapMicroCny',
    'perCallMaximumMicroCny','worstMicroCny','store','protocolVersion','transportVersion',
    'extractionVersion','runtimeVersion','profileVersion','releaseHash','noRetry',
    'executionFiles','sharedExecutionFiles'];
  if(!exact(manifest,names)||!current||hash(manifest)!==hash(current))
    fail('invalid_dream_climate_r8_identity_manifest');
  assertR8ExecutionPin(manifest.executionDigest);
  assertR8ExecutionPin(current.executionDigest);
  return manifest;
}

export function verifyR8Identity({directory=packageDirectory,shared=sharedDirectory}={}){
  const packageRoot=fs.realpathSync(path.resolve(directory));
  let manifest;
  try{
    const bytes=fs.readFileSync(path.join(packageRoot,'identity.json'));
    const text=bytes.toString('utf8');
    if(!Buffer.from(text,'utf8').equals(bytes))fail('dream_climate_r8_invalid_utf8');
    manifest=JSON.parse(text);
  }catch(error){
    if(error?.message==='dream_climate_r8_invalid_utf8')throw error;
    fail('invalid_dream_climate_r8_identity_manifest');
  }
  const current=createR8IdentityManifest({directory:packageRoot,shared});
  validateR8IdentityManifest(manifest,current);
  return {
    identityVersion:r8IdentityVersion,identityHash:hash(manifest),
    executionDigest:manifest.executionDigest,executionPin:r8ExecutionPin,
    offlineIdentityHash:r8OfflineIdentityHash,matrixHash:r8MatrixHash,
    priceSnapshotHash:r8PriceSnapshotHash,releaseHash:r8ExpectedReleaseHash,
    allowanceId:r8AllowanceId,allowanceCapMicroCny:r8AllowanceCapMicroCny,
    maxCalls:r8MaxCalls,runCount:r8RunCount,requestByteLimit:r8RequestByteLimit,
    executionFiles:Object.keys(manifest.executionFiles).length,
    sharedExecutionFiles:Object.keys(manifest.sharedExecutionFiles).length
  };
}

export {packageDirectory as r8PackageDirectory,sharedDirectory as r8SharedDirectory};
