import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {hash} from '../../../src/contract.js';
import {fail} from '../../../src/store.js';
import {verifyRichSampleIdentity} from '../identity.mjs';
import {
  phaseAHead,phaseAIdentityHash,phaseAParent,phaseAPriceSnapshotHash,phaseAPromptHash,
  phaseASourceHash,phaseATree,phaseBExpectedReleaseHash,phaseBIdentityVersion
} from './config.mjs';

const defaultPackageDirectory=fileURLToPath(new URL('.',import.meta.url));
const defaultRepositoryRoot=path.resolve(defaultPackageDirectory,'../../..');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const normalizedDigest=file=>{
  const bytes=fs.readFileSync(file),text=bytes.toString('utf8');
  if(!Buffer.from(text,'utf8').equals(bytes))fail('rich_sample_phase_b_invalid_utf8');
  return digest(Buffer.from(text.replaceAll('\r\n','\n'),'utf8'));
};
const readJson=file=>{
  const bytes=fs.readFileSync(file),text=bytes.toString('utf8');
  if(!Buffer.from(text,'utf8').equals(bytes))fail('rich_sample_phase_b_invalid_utf8');
  try{return JSON.parse(text);}catch{fail('invalid_rich_sample_phase_b_identity');}
};
const object=value=>value&&typeof value==='object'&&!Array.isArray(value);

export function verifyPhaseBIdentity({packageDirectory=defaultPackageDirectory,repositoryRoot=defaultRepositoryRoot}={}){
  const packageRoot=fs.realpathSync(path.resolve(packageDirectory));
  const repoRoot=fs.realpathSync(path.resolve(repositoryRoot));
  const phaseA=verifyRichSampleIdentity({packageDirectory:path.resolve(packageRoot,'..'),repositoryRoot:repoRoot});
  const manifest=readJson(path.join(packageRoot,'identity.json'));
  if(!object(manifest)||manifest.schemaVersion!==1||manifest.identityVersion!==phaseBIdentityVersion||
     manifest.phaseAHead!==phaseAHead||manifest.phaseATree!==phaseATree||manifest.phaseAParent!==phaseAParent||
     manifest.phaseAIdentityHash!==phaseAIdentityHash||manifest.phaseAPromptHash!==phaseAPromptHash||
     manifest.phaseASourceHash!==phaseASourceHash||manifest.phaseAPriceSnapshotHash!==phaseAPriceSnapshotHash||
     manifest.releaseHash!==phaseBExpectedReleaseHash||!object(manifest.executionFiles))fail('invalid_rich_sample_phase_b_identity');
  if(phaseA.identityHash!==phaseAIdentityHash||phaseA.promptHash!==phaseAPromptHash||
     phaseA.sourceHash!==phaseASourceHash||phaseA.priceSnapshotHash!==phaseAPriceSnapshotHash)fail('rich_sample_phase_a_identity_changed');
  const actual=fs.readdirSync(packageRoot,{withFileTypes:true}).filter(entry=>entry.isFile()&&entry.name.endsWith('.mjs'))
    .map(entry=>entry.name).sort((left,right)=>left.localeCompare(right,'en'));
  const declared=Object.keys(manifest.executionFiles).sort((left,right)=>left.localeCompare(right,'en'));
  if(actual.length!==declared.length||actual.some((name,index)=>name!==declared[index]))fail('invalid_rich_sample_phase_b_identity');
  for(const [relative,expected] of Object.entries(manifest.executionFiles)){
    if(typeof relative!=='string'||!relative||path.isAbsolute(relative)||relative.includes('..'))fail('invalid_rich_sample_phase_b_identity');
    let value;
    try{value=normalizedDigest(path.join(packageRoot,relative));}catch{fail('rich_sample_phase_b_execution_file_missing');}
    if(value!==expected)fail('rich_sample_phase_b_execution_file_changed');
  }
  return {
    identityVersion:phaseBIdentityVersion,
    phaseBIdentityHash:hash(manifest),
    phaseAIdentityHash:phaseA.identityHash,
    phaseAHead,phaseATree,phaseAParent,
    promptHash:phaseA.promptHash,sourceHash:phaseA.sourceHash,
    priceSnapshotHash:phaseA.priceSnapshotHash,releaseHash:manifest.releaseHash,
    executionFiles:actual.length
  };
}
