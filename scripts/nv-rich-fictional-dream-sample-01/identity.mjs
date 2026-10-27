// New package inventory. The manifest pins every new execution blob plus the
// entire existing src/fixtures/package.json inventory it reuses.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {hash} from '../../src/contract.js';
import {inlineEntryInventory} from '../../src/inline-entry-preflight.js';
import {fail} from '../../src/store.js';
import {richSampleAuthorizationVersion} from './authorization.mjs';
import {richSampleExtractionVersion,richSampleNormalizationVersion,richSamplePromptHash,richSamplePromptVersion,richSamplePriceSnapshotHash,richSampleProtocolVersion,richSampleRuntimeVersion,richSampleSource,richSampleSourceHash} from './protocol.mjs';

export const richSampleInventoryVersion='nv-rich-fictional-dream-sample-inventory-v1';
const defaultPackageDirectory=fileURLToPath(new URL('.',import.meta.url));
const defaultRepositoryRoot=path.resolve(defaultPackageDirectory,'../..');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const normalizedDigest=file=>{
  const bytes=fs.readFileSync(file),text=bytes.toString('utf8');
  if(!Buffer.from(text,'utf8').equals(bytes))fail('rich_sample_invalid_utf8');
  return digest(Buffer.from(text.replaceAll('\r\n','\n'),'utf8'));
};
const readJson=file=>{
  const bytes=fs.readFileSync(file),text=bytes.toString('utf8');
  if(!Buffer.from(text,'utf8').equals(bytes))fail('rich_sample_invalid_utf8');
  try{return JSON.parse(text);}catch{fail('invalid_rich_sample_identity_manifest');}
};
const object=value=>value&&typeof value==='object'&&!Array.isArray(value);

export function verifyRichSampleIdentity({packageDirectory=defaultPackageDirectory,repositoryRoot=defaultRepositoryRoot}={}){
  const packageRoot=fs.realpathSync(path.resolve(packageDirectory));
  const repoRoot=fs.realpathSync(path.resolve(repositoryRoot));
  const manifest=readJson(path.join(packageRoot,'identity.json'));
  if(!object(manifest)||manifest.schemaVersion!==1||manifest.reviewVersion!==richSampleInventoryVersion||
     manifest.protocolVersion!==richSampleProtocolVersion||manifest.runtimeVersion!==richSampleRuntimeVersion||
     manifest.promptVersion!==richSamplePromptVersion||manifest.normalizationVersion!==richSampleNormalizationVersion||
     manifest.extractionVersion!==richSampleExtractionVersion||manifest.authorizationVersion!==richSampleAuthorizationVersion||
     !object(manifest.source)||manifest.source.id!==richSampleSource.id||manifest.source.version!==richSampleSource.version||
     manifest.source.sha256!==richSampleSourceHash||manifest.promptHash!==richSamplePromptHash||
     manifest.priceSnapshotHash!==richSamplePriceSnapshotHash||!object(manifest.executionFiles))fail('invalid_rich_sample_identity_manifest');
  const actualExecutionFiles=fs.readdirSync(packageRoot,{withFileTypes:true})
    .filter(entry=>entry.isFile()&&entry.name.endsWith('.mjs')).map(entry=>entry.name)
    .sort((left,right)=>left.localeCompare(right,'en'));
  const declaredExecutionFiles=Object.keys(manifest.executionFiles).sort((left,right)=>left.localeCompare(right,'en'));
  if(actualExecutionFiles.length!==declaredExecutionFiles.length||
     actualExecutionFiles.some((name,index)=>name!==declaredExecutionFiles[index]))fail('invalid_rich_sample_identity_manifest');
  const core=inlineEntryInventory(repoRoot),coreInventoryHash=hash(core);
  if(manifest.coreInventoryHash!==coreInventoryHash||manifest.coreInventoryFiles!==Object.keys(core).length)fail('rich_sample_core_inventory_changed');
  for(const [relative,expected] of Object.entries(manifest.executionFiles)){
    if(typeof relative!=='string'||!relative||path.isAbsolute(relative)||relative.includes('..'))fail('invalid_rich_sample_identity_manifest');
    let actual;
    try{actual=normalizedDigest(path.join(packageRoot,relative));}catch{fail('rich_sample_execution_file_missing');}
    if(actual!==expected)fail('rich_sample_execution_file_changed');
  }
  return {
    inventoryVersion:richSampleInventoryVersion,protocolVersion:richSampleProtocolVersion,
    runtimeVersion:richSampleRuntimeVersion,promptVersion:richSamplePromptVersion,
    normalizationVersion:richSampleNormalizationVersion,extractionVersion:richSampleExtractionVersion,
    authorizationVersion:richSampleAuthorizationVersion,identityHash:hash(manifest),
    coreInventoryHash,coreInventoryFiles:Object.keys(core).length,
    sourceHash:richSampleSourceHash,promptHash:richSamplePromptHash,priceSnapshotHash:richSamplePriceSnapshotHash
  };
}

export function richSampleIdentity(){return verifyRichSampleIdentity();}
