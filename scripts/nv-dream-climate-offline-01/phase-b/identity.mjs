// Independent R1 live identity. It pins the frozen offline candidate and every
// live execution file without refreshing or reinterpreting any #107 identity.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {hash} from '../../../src/contract.js';
import {copy,fail} from '../../../src/store.js';
import {dreamClimateIdentity} from '../identity.mjs';
import {
  liveAllowanceCapMicroCny,liveAllowanceId,liveCallsPerRun,liveEndpoint,
  liveExpectedReleaseHash,liveExtractionVersion,liveIdentityVersion,liveMaxCalls,
  liveMaxOutputTokens,liveModelAlias,liveObservedModelAlias,livePerCallMaximumMicroCny,
  livePricePageSha256,liveRequestByteLimit,liveRunCount,liveScenesPerRun,
  liveStoreBasename,liveStoreDirectory,liveStoreParent,liveStorePrefix,
  liveTransportVersion,liveWorstMicroCny,offlineExecutionFiles,offlineHead,
  offlineIdentityHash,offlineParent,offlinePromptHash,offlineSourceHash,offlineTree
} from './config.mjs';
import {assertLiveMatrix,liveMatrix,liveMatrixHash} from './matrix.mjs';
import {livePriceSnapshotHash} from './price.mjs';

const packageDirectory=fileURLToPath(new URL('.',import.meta.url));
const repositoryRoot=path.resolve(packageDirectory,'../../..');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const exact=(value,names)=>value&&typeof value==='object'&&!Array.isArray(value)&&
  Object.keys(value).length===names.length&&names.every(name=>Object.hasOwn(value,name));

function normalizedDigest(file){
  const bytes=fs.readFileSync(file),text=bytes.toString('utf8');
  if(!Buffer.from(text,'utf8').equals(bytes))fail('dream_climate_live_invalid_utf8');
  return digest(Buffer.from(text.replaceAll('\r\n','\n'),'utf8'));
}

function executionFiles(directory){
  const result={};
  for(const entry of fs.readdirSync(directory,{withFileTypes:true})
    .filter(entry=>entry.isFile()&&(entry.name.endsWith('.mjs')||entry.name.endsWith('.ps1')))
    .sort((left,right)=>left.name.localeCompare(right.name,'en'))) {
    result[entry.name]=normalizedDigest(path.join(directory,entry.name));
  }
  if(Object.keys(result).length===0)fail('dream_climate_live_inventory_empty');
  return result;
}

export function createLiveIdentityManifest({directory=packageDirectory}={}){
  const packageRoot=fs.realpathSync(path.resolve(directory));
  const offline=dreamClimateIdentity();
  if(offline.identityHash!==offlineIdentityHash||offline.promptHash!==offlinePromptHash||
     offline.sourceHash!==offlineSourceHash)fail('dream_climate_live_offline_identity_changed');
  const offlineHashes=offline.executionFiles;
  if(hash(offlineHashes)!==hash(offlineExecutionFiles))fail('dream_climate_live_offline_blob_changed');
  assertLiveMatrix();
  return {
    schemaVersion:1,
    identityVersion:liveIdentityVersion,
    offline:{head:offlineHead,tree:offlineTree,parent:offlineParent,
      identityHash:offlineIdentityHash,promptHash:offlinePromptHash,
      sourceHash:offlineSourceHash,executionFiles:copy(offlineExecutionFiles)},
    matrix:copy(liveMatrix),matrixHash:liveMatrixHash,
    priceSnapshotHash:livePriceSnapshotHash,pricePageSha256:livePricePageSha256,
    modelAlias:liveModelAlias,observedModelAlias:liveObservedModelAlias,endpoint:liveEndpoint,
    requestByteLimit:liveRequestByteLimit,maxOutputTokens:liveMaxOutputTokens,
    scenesPerRun:liveScenesPerRun,callsPerRun:liveCallsPerRun,runCount:liveRunCount,
    maxCalls:liveMaxCalls,allowanceId:liveAllowanceId,
    allowanceCapMicroCny:liveAllowanceCapMicroCny,
    perCallMaximumMicroCny:livePerCallMaximumMicroCny,worstMicroCny:liveWorstMicroCny,
    store:{parent:liveStoreParent,prefix:liveStorePrefix,basename:liveStoreBasename,
      directory:liveStoreDirectory},
    transportVersion:liveTransportVersion,extractionVersion:liveExtractionVersion,
    releaseHash:liveExpectedReleaseHash,noRetry:true,
    executionFiles:executionFiles(packageRoot)
  };
}

export function validateLiveIdentityManifest(manifest,current){
  const names=['schemaVersion','identityVersion','offline','matrix','matrixHash',
    'priceSnapshotHash','pricePageSha256','modelAlias','observedModelAlias','endpoint',
    'requestByteLimit','maxOutputTokens','scenesPerRun','callsPerRun','runCount',
    'maxCalls','allowanceId','allowanceCapMicroCny','perCallMaximumMicroCny',
    'worstMicroCny','store','transportVersion','extractionVersion','releaseHash',
    'noRetry','executionFiles'];
  if(!exact(manifest,names)||!current||hash(manifest)!==hash(current))
    fail('invalid_dream_climate_live_identity_manifest');
  return manifest;
}

export function verifyLiveIdentity({directory=packageDirectory}={}){
  const packageRoot=fs.realpathSync(path.resolve(directory));
  let manifest;
  try{
    const bytes=fs.readFileSync(path.join(packageRoot,'identity.json'));
    const text=bytes.toString('utf8');
    if(!Buffer.from(text,'utf8').equals(bytes))fail('dream_climate_live_invalid_utf8');
    manifest=JSON.parse(text);
  }catch(error){
    if(error?.message==='dream_climate_live_invalid_utf8')throw error;
    fail('invalid_dream_climate_live_identity_manifest');
  }
  const current=createLiveIdentityManifest({directory:packageRoot});
  validateLiveIdentityManifest(manifest,current);
  return {
    identityVersion:liveIdentityVersion,liveIdentityHash:hash(manifest),
    offlineIdentityHash:offlineIdentityHash,matrixHash:liveMatrixHash,
    priceSnapshotHash:livePriceSnapshotHash,releaseHash:liveExpectedReleaseHash,
    allowanceId:liveAllowanceId,allowanceCapMicroCny:liveAllowanceCapMicroCny,
    maxCalls:liveMaxCalls,runCount:liveRunCount,requestByteLimit:liveRequestByteLimit,
    executionFiles:Object.keys(manifest.executionFiles).length,
    offlineExecutionFiles:Object.keys(manifest.offline.executionFiles).length
  };
}

export {packageDirectory as livePackageDirectory,repositoryRoot as liveRepositoryRoot};
