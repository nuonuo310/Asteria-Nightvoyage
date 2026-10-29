// Independent R10 identity. It pins the frozen R9 offline candidate, the fixed
// single-run profile, every reused Phase B execution file and an explicit
// reviewed execution digest that cannot be refreshed from current code alone.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {hash} from '../../../src/contract.js';
import {copy,fail} from '../../../src/store.js';
import {dreamClimateIdentity} from '../identity.mjs';
import {r10OfflineExecutionFiles} from './config.mjs';
import {
  r10AllowanceCapMicroCny,r10AllowanceId,r10AuthorityCommit,r10CallsPerRun,
  r10DiagnosticVersion,r10Endpoint,r10ExecutionPin,r10ExtractionVersion,
  r10IdentityVersion,r10MaxCalls,r10MaxOutputTokens,r10ModelAlias,
  r10NormalizationVersion,r10ObservedModelAlias,r10OfflineHead,
  r10OfflineIdentityHash,r10OfflineParent,r10OfflinePromptHash,
  r10OfflineSourceHash,r10OfflineTree,r10PerCallMaximumMicroCny,
  r10PricePageSha256,r10ProfileVersion,r10ProtocolVersion,r10ReceiptFileName,
  r10RequestByteLimit,r10RunCount,r10RunId,r10RuntimeVersion,r10ScenesPerRun,
  r10StoreBasename,r10StoreDirectory,r10StoreParent,r10StorePrefix,
  r10TransportVersion,r10WorstMicroCny
} from './config.mjs';
import {assertR10Matrix,r10Matrix,r10MatrixHash} from './matrix.mjs';
import {r10PriceSnapshotHash} from './price.mjs';
import {r10ExpectedReleaseHash} from './release.mjs';

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
  if(!Buffer.from(text,'utf8').equals(bytes))fail('dream_climate_r10_invalid_utf8');
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
  if(Object.keys(result).length===0)fail('dream_climate_r10_inventory_empty');
  return result;
}

function sharedExecutionFiles(directory=sharedDirectory){
  const result={};
  for(const name of sharedNames)result[name]=normalizedDigest(path.join(directory,name));
  return result;
}

export function r10ExecutionContract(){
  return {
    authorityCommit:r10AuthorityCommit,
    offline:{head:r10OfflineHead,tree:r10OfflineTree,parent:r10OfflineParent,
      identityHash:r10OfflineIdentityHash,promptHash:r10OfflinePromptHash,
      sourceHash:r10OfflineSourceHash},
    profileVersion:r10ProfileVersion,runtimeVersion:r10RuntimeVersion,
    protocolVersion:r10ProtocolVersion,normalizationVersion:r10NormalizationVersion,
    transportVersion:r10TransportVersion,extractionVersion:r10ExtractionVersion,
    diagnosticVersion:r10DiagnosticVersion,
    runId:r10RunId,allowanceId:r10AllowanceId,
    allowanceCapMicroCny:r10AllowanceCapMicroCny,
    perCallMaximumMicroCny:r10PerCallMaximumMicroCny,worstMicroCny:r10WorstMicroCny,
    runCount:r10RunCount,maxCalls:r10MaxCalls,scenesPerRun:r10ScenesPerRun,
    callsPerRun:r10CallsPerRun,requestByteLimit:r10RequestByteLimit,
    maxOutputTokens:r10MaxOutputTokens,modelAlias:r10ModelAlias,
    observedModelAlias:r10ObservedModelAlias,endpoint:r10Endpoint,
    matrixHash:r10MatrixHash,priceSnapshotHash:r10PriceSnapshotHash,
    pricePageSha256:r10PricePageSha256,storeDirectory:r10StoreDirectory,
    receiptFileName:r10ReceiptFileName,noRetry:true
  };
}

export function r10ExecutionDigest({executionContract=r10ExecutionContract(),
  executionFiles:files,sharedExecutionFiles:shared}={}){
  if(!files||!shared)fail('dream_climate_r10_execution_inventory_required');
  return hash({executionContract,executionFiles:files,sharedExecutionFiles:shared});
}

export function assertR10ExecutionPin(value){
  if(typeof value!=='string'||value!==r10ExecutionPin)
    fail('dream_climate_r10_execution_pin_mismatch');
  return true;
}

export function createR10IdentityManifest({directory=packageDirectory,
  shared=sharedDirectory}={}){
  const packageRoot=fs.realpathSync(path.resolve(directory));
  const sharedRoot=fs.realpathSync(path.resolve(shared));
  const offline=dreamClimateIdentity();
  if(offline.identityHash!==r10OfflineIdentityHash||offline.promptHash!==r10OfflinePromptHash||
     offline.sourceHash!==r10OfflineSourceHash)fail('dream_climate_r10_offline_identity_changed');
  if(hash(offline.executionFiles)!==hash(r10OfflineExecutionFiles))
    fail('dream_climate_r10_offline_blob_changed');
  assertR10Matrix();
  const files=executionFiles(packageRoot),sharedFiles=sharedExecutionFiles(sharedRoot);
  const executionContract=r10ExecutionContract();
  const executionDigest=r10ExecutionDigest({executionContract,executionFiles:files,
    sharedExecutionFiles:sharedFiles});
  return {
    schemaVersion:1,identityVersion:r10IdentityVersion,
    authorityCommit:r10AuthorityCommit,
    offline:{head:r10OfflineHead,tree:r10OfflineTree,parent:r10OfflineParent,
      identityHash:r10OfflineIdentityHash,promptHash:r10OfflinePromptHash,
      sourceHash:r10OfflineSourceHash,executionFiles:copy(r10OfflineExecutionFiles)},
    matrix:copy(r10Matrix),matrixHash:r10MatrixHash,
    executionContract,executionDigest,
    priceSnapshotHash:r10PriceSnapshotHash,pricePageSha256:r10PricePageSha256,
    modelAlias:r10ModelAlias,observedModelAlias:r10ObservedModelAlias,endpoint:r10Endpoint,
    requestByteLimit:r10RequestByteLimit,maxOutputTokens:r10MaxOutputTokens,
    scenesPerRun:r10ScenesPerRun,callsPerRun:r10CallsPerRun,runCount:r10RunCount,
    maxCalls:r10MaxCalls,allowanceId:r10AllowanceId,
    allowanceCapMicroCny:r10AllowanceCapMicroCny,
    perCallMaximumMicroCny:r10PerCallMaximumMicroCny,worstMicroCny:r10WorstMicroCny,
    store:{parent:r10StoreParent,prefix:r10StorePrefix,basename:r10StoreBasename,
      directory:r10StoreDirectory,runId:r10RunId,receipt:r10ReceiptFileName},
    protocolVersion:r10ProtocolVersion,transportVersion:r10TransportVersion,
    extractionVersion:r10ExtractionVersion,runtimeVersion:r10RuntimeVersion,
    profileVersion:r10ProfileVersion,releaseHash:r10ExpectedReleaseHash,noRetry:true,
    executionFiles:files,sharedExecutionFiles:sharedFiles
  };
}

export function validateR10IdentityManifest(manifest,current){
  const names=['schemaVersion','identityVersion','authorityCommit','offline','matrix',
    'matrixHash','executionContract','executionDigest','priceSnapshotHash','pricePageSha256',
    'modelAlias','observedModelAlias','endpoint','requestByteLimit','maxOutputTokens',
    'scenesPerRun','callsPerRun','runCount','maxCalls','allowanceId','allowanceCapMicroCny',
    'perCallMaximumMicroCny','worstMicroCny','store','protocolVersion','transportVersion',
    'extractionVersion','runtimeVersion','profileVersion','releaseHash','noRetry',
    'executionFiles','sharedExecutionFiles'];
  if(!exact(manifest,names)||!current||hash(manifest)!==hash(current))
    fail('invalid_dream_climate_r10_identity_manifest');
  assertR10ExecutionPin(manifest.executionDigest);
  assertR10ExecutionPin(current.executionDigest);
  return manifest;
}

export function verifyR10Identity({directory=packageDirectory,shared=sharedDirectory}={}){
  const packageRoot=fs.realpathSync(path.resolve(directory));
  let manifest;
  try{
    const bytes=fs.readFileSync(path.join(packageRoot,'identity.json'));
    const text=bytes.toString('utf8');
    if(!Buffer.from(text,'utf8').equals(bytes))fail('dream_climate_r10_invalid_utf8');
    manifest=JSON.parse(text);
  }catch(error){
    if(error?.message==='dream_climate_r10_invalid_utf8')throw error;
    fail('invalid_dream_climate_r10_identity_manifest');
  }
  const current=createR10IdentityManifest({directory:packageRoot,shared});
  validateR10IdentityManifest(manifest,current);
  return {
    identityVersion:r10IdentityVersion,identityHash:hash(manifest),
    executionDigest:manifest.executionDigest,executionPin:r10ExecutionPin,
    offlineIdentityHash:r10OfflineIdentityHash,matrixHash:r10MatrixHash,
    priceSnapshotHash:r10PriceSnapshotHash,releaseHash:r10ExpectedReleaseHash,
    allowanceId:r10AllowanceId,allowanceCapMicroCny:r10AllowanceCapMicroCny,
    maxCalls:r10MaxCalls,runCount:r10RunCount,requestByteLimit:r10RequestByteLimit,
    executionFiles:Object.keys(manifest.executionFiles).length,
    sharedExecutionFiles:Object.keys(manifest.sharedExecutionFiles).length
  };
}

export {packageDirectory as r10PackageDirectory,sharedDirectory as r10SharedDirectory};
