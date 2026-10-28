// New-package inventory only. It never refreshes or re-signs the old paid
// release identities; the reused src/fixtures/package.json inventory is pinned
// separately as read-only evidence.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {hash} from '../../src/contract.js';
import {inlineEntryInventory} from '../../src/inline-entry-preflight.js';
import {fail} from '../../src/store.js';
import {
  dreamClimateExtractionVersion,dreamClimateInventoryVersion,
  dreamClimateNormalizationVersion,dreamClimatePromptHash,
  dreamClimatePromptVersion,dreamClimateProtocolVersion,
  dreamClimateRuntimeVersion,dreamClimateSource,dreamClimateSourceHash,
  dreamClimateWeights
} from './protocol.mjs';

const packageDirectory=fileURLToPath(new URL('.',import.meta.url));
const repositoryRoot=path.resolve(packageDirectory,'../..');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const normalizedDigest=file=>{
  const bytes=fs.readFileSync(file),text=bytes.toString('utf8');
  if(!Buffer.from(text,'utf8').equals(bytes))fail('dream_climate_invalid_utf8');
  return digest(Buffer.from(text.replaceAll('\r\n','\n'),'utf8'));
};
const same=(left,right)=>hash(left)===hash(right);

export function createDreamClimateIdentityManifest({root=repositoryRoot,directory=packageDirectory}={}){
  const packageRoot=fs.realpathSync(path.resolve(directory));
  const repoRoot=fs.realpathSync(path.resolve(root));
  const executionFiles={};
  for(const entry of fs.readdirSync(packageRoot,{withFileTypes:true})
    .filter(entry=>entry.isFile()&&entry.name.endsWith('.mjs'))
    .sort((left,right)=>left.name.localeCompare(right.name,'en'))) {
    executionFiles[entry.name]=normalizedDigest(path.join(packageRoot,entry.name));
  }
  if(Object.keys(executionFiles).length===0)fail('dream_climate_inventory_empty');
  const coreInventory=inlineEntryInventory(repoRoot);
  return {
    schemaVersion:1,
    inventoryVersion:dreamClimateInventoryVersion,
    protocolVersion:dreamClimateProtocolVersion,
    runtimeVersion:dreamClimateRuntimeVersion,
    promptVersion:dreamClimatePromptVersion,
    normalizationVersion:dreamClimateNormalizationVersion,
    extractionVersion:dreamClimateExtractionVersion,
    source:{id:dreamClimateSource.id,version:dreamClimateSource.version,sha256:dreamClimateSourceHash},
    promptHash:dreamClimatePromptHash,
    climateWeights:structuredClone(dreamClimateWeights),
    oldPaidCoreInventoryHash:hash(coreInventory),
    oldPaidCoreInventoryFiles:Object.keys(coreInventory).length,
    executionFiles
  };
}

export function verifyDreamClimateIdentity({root=repositoryRoot,directory=packageDirectory}={}){
  const packageRoot=fs.realpathSync(path.resolve(directory));
  let manifest;
  try{
    const bytes=fs.readFileSync(path.join(packageRoot,'identity.json'));
    const text=bytes.toString('utf8');
    if(!Buffer.from(text,'utf8').equals(bytes))fail('dream_climate_invalid_utf8');
    manifest=JSON.parse(text);
  }catch(error){
    if(error?.message==='dream_climate_invalid_utf8')throw error;
    fail('invalid_dream_climate_identity_manifest');
  }
  const current=createDreamClimateIdentityManifest({root,directory});
  if(!manifest||manifest.schemaVersion!==1||
     manifest.inventoryVersion!==dreamClimateInventoryVersion||
     manifest.protocolVersion!==dreamClimateProtocolVersion||
     manifest.runtimeVersion!==dreamClimateRuntimeVersion||
     manifest.promptVersion!==dreamClimatePromptVersion||
     manifest.normalizationVersion!==dreamClimateNormalizationVersion||
     manifest.extractionVersion!==dreamClimateExtractionVersion||
     !manifest.source||manifest.source.id!==dreamClimateSource.id||
     manifest.source.version!==dreamClimateSource.version||
     manifest.source.sha256!==dreamClimateSourceHash||
     manifest.promptHash!==dreamClimatePromptHash||!same(manifest.climateWeights,dreamClimateWeights)||
     manifest.oldPaidCoreInventoryHash!==current.oldPaidCoreInventoryHash||
     manifest.oldPaidCoreInventoryFiles!==current.oldPaidCoreInventoryFiles||
     !manifest.executionFiles||typeof manifest.executionFiles!=='object'||
     Array.isArray(manifest.executionFiles))fail('invalid_dream_climate_identity_manifest');
  const declared=Object.keys(manifest.executionFiles).sort((left,right)=>left.localeCompare(right,'en'));
  const actual=Object.keys(current.executionFiles).sort((left,right)=>left.localeCompare(right,'en'));
  if(declared.length!==actual.length||declared.some((name,index)=>name!==actual[index])) {
    fail('dream_climate_execution_file_set_changed');
  }
  if(!same(manifest,current))fail('dream_climate_source_inventory_changed');
  return {...current,sourceHash:dreamClimateSourceHash,identityHash:hash(manifest)};
}

export function dreamClimateIdentity(){
  return verifyDreamClimateIdentity();
}
