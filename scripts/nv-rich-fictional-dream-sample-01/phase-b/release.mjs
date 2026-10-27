import fs from 'node:fs';
import {hash} from '../../../src/contract.js';
import {fail} from '../../../src/store.js';
import {
  phaseAHead,phaseAIdentityHash,phaseAPriceSnapshotHash,phaseAPromptHash,phaseASourceHash,
  phaseATree,phaseBAllowanceCapMicroCny,phaseBExpectedReleaseHash,phaseBMaxCalls,phaseBMaxRuns,
  phaseBReleaseKeys,phaseBReleasePath,phaseBStoreDirectory
} from './config.mjs';

const exact=(value,names)=>value&&typeof value==='object'&&!Array.isArray(value)&&
  Object.keys(value).length===names.length&&names.every(name=>Object.hasOwn(value,name));

export function validatePhaseBRelease(value){
  if(!exact(value,phaseBReleaseKeys))fail('rich_sample_phase_b_release_shape');
  if(hash(value)!==phaseBExpectedReleaseHash)fail('rich_sample_phase_b_release_mismatch');
  if(value.status!=='approved_once'||value.phaseAHead!==phaseAHead||value.phaseATree!==phaseATree||
     value.identityHash!==phaseAIdentityHash||value.promptHash!==phaseAPromptHash||
     value.sourceHash!==phaseASourceHash||value.priceSnapshotHash!==phaseAPriceSnapshotHash||
     value.allowanceCapMicroCny!==phaseBAllowanceCapMicroCny||value.maxRuns!==phaseBMaxRuns||
     value.maxCalls!==phaseBMaxCalls||value.storeDirectory!==phaseBStoreDirectory||
     value.noRetry!==true)fail('rich_sample_phase_b_release_mismatch');
  return structuredClone(value);
}

export function readPhaseBRelease(file=phaseBReleasePath){
  let bytes;
  try{bytes=fs.readFileSync(file);}
  catch(error){fail(error.code==='ENOENT'?'rich_sample_phase_b_release_required':'rich_sample_phase_b_release_unreadable');}
  let value;
  try{
    const text=bytes.toString('utf8');
    if(!Buffer.from(text,'utf8').equals(bytes))fail('rich_sample_phase_b_release_invalid_utf8');
    value=JSON.parse(text);
  }catch(error){if(error.message.startsWith('rich_sample_'))throw error;fail('rich_sample_phase_b_release_invalid_json');}
  return validatePhaseBRelease(value);
}

export function revokePhaseBRelease(file=phaseBReleasePath){
  fs.rmSync(file,{force:true});
  return !fs.existsSync(file);
}
