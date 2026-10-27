import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {hash} from '../../../src/contract.js';
import {
  phaseAHead,phaseAIdentityHash,phaseAParent,phaseAPriceSnapshotHash,phaseAPromptHash,
  phaseASourceHash,phaseATree,phaseBExpectedReleaseHash,phaseBIdentityVersion
} from './config.mjs';

const directory=fileURLToPath(new URL('.',import.meta.url));
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const executionName=name=>name.endsWith('.mjs')||name.endsWith('.ps1');
const files=fs.readdirSync(directory,{withFileTypes:true}).filter(entry=>entry.isFile()&&executionName(entry.name))
  .map(entry=>entry.name).sort((left,right)=>left.localeCompare(right,'en'));
const executionFiles={};
for(const name of files){
  const bytes=fs.readFileSync(path.join(directory,name));
  const text=bytes.toString('utf8');
  if(!Buffer.from(text,'utf8').equals(bytes))throw Error('invalid_utf8');
  executionFiles[name]=digest(Buffer.from(text.replaceAll('\r\n','\n'),'utf8'));
}
const manifest={schemaVersion:1,identityVersion:phaseBIdentityVersion,phaseAHead,phaseATree,phaseAParent,
  phaseAIdentityHash,phaseAPromptHash,phaseASourceHash,phaseAPriceSnapshotHash,
  releaseHash:phaseBExpectedReleaseHash,executionFiles};
fs.writeFileSync(path.join(directory,'identity.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({phaseBIdentityHash:hash(manifest),executionFiles:files.length},null,2));
