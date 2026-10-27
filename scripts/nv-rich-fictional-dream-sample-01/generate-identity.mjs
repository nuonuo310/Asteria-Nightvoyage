// Build the new package manifest after every execution file is final.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {hash} from '../../src/contract.js';
import {inlineEntryInventory} from '../../src/inline-entry-preflight.js';
import {richSampleAuthorizationVersion} from './authorization.mjs';
import {richSampleInventoryVersion} from './identity.mjs';
import {
  richSampleAllowanceId,richSampleExtractionVersion,
  richSampleMaxCalls,richSampleMaxOutputTokens,richSampleNormalizationVersion,
  richSamplePriceSnapshot,richSamplePriceSnapshotHash,richSamplePromptHash,
  richSamplePromptVersion,richSampleProtocolVersion,richSampleRequestByteLimit,
  richSampleRunCount,richSampleRuntimeVersion,richSampleSource,richSampleSourceHash
} from './protocol.mjs';

const packageDirectory=fileURLToPath(new URL('.',import.meta.url));
const repositoryRoot=path.resolve(packageDirectory,'../..');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const normalizedDigest=file=>digest(Buffer.from(fs.readFileSync(file,'utf8').replaceAll('\r\n','\n'),'utf8'));

const executionFiles=Object.fromEntries(fs.readdirSync(packageDirectory,{withFileTypes:true})
  .filter(entry=>entry.isFile()&&entry.name.endsWith('.mjs'))
  .map(entry=>entry.name).sort((left,right)=>left.localeCompare(right,'en'))
  .map(name=>[name,normalizedDigest(path.join(packageDirectory,name))]));
const core=inlineEntryInventory(repositoryRoot);
const manifest={
  schemaVersion:1,reviewVersion:richSampleInventoryVersion,
  protocolVersion:richSampleProtocolVersion,runtimeVersion:richSampleRuntimeVersion,
  promptVersion:richSamplePromptVersion,normalizationVersion:richSampleNormalizationVersion,
  extractionVersion:richSampleExtractionVersion,authorizationVersion:richSampleAuthorizationVersion,
  source:{id:richSampleSource.id,version:richSampleSource.version,sha256:richSampleSourceHash},
  promptHash:richSamplePromptHash,priceSnapshotHash:richSamplePriceSnapshotHash,
  allowanceId:richSampleAllowanceId,allowanceCapMicroCny:richSamplePriceSnapshot.allowanceCapMicroCny,
  maxRuns:richSampleRunCount,maxCalls:richSampleMaxCalls,maxOutputTokens:richSampleMaxOutputTokens,
  requestByteLimit:richSampleRequestByteLimit,
  coreInventoryHash:hash(core),coreInventoryFiles:Object.keys(core).length,
  executionFiles
};
fs.writeFileSync(path.join(packageDirectory,'identity.json'),JSON.stringify(manifest,null,2)+'\n',{encoding:'utf8',mode:0o600});
console.log(JSON.stringify({status:'IDENTITY_WRITTEN',identityHash:hash(manifest),
  executionFiles:Object.keys(executionFiles).length,coreInventoryFiles:Object.keys(core).length},null,2));
