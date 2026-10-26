// Rebuild the exact pre-wake source identity from the frozen manifest hashes.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';

const repositoryRoot=fileURLToPath(new URL('..',import.meta.url));
const manifestPath='src/inline-entry-review.json';
const paidContractPath='docs/proposals/inline-paid-entry-windows-20261017.json';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');

function exactBytes(relative){
  const bytes=fs.readFileSync(path.join(repositoryRoot,relative));
  const text=bytes.toString('utf8');
  if(!Buffer.from(text).equals(bytes))throw Error('historical_source_not_utf8');
  return {bytes,hash:digest(text.replaceAll('\r\n','\n'))};
}

function historicalInventory(directory){
  const files={};
  const add=relative=>{const {hash}=exactBytesFrom(directory,relative);files[relative]=hash;};
  const walk=relative=>{
    for(const entry of fs.readdirSync(path.join(directory,relative),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en'))){
      const next=relative+'/'+entry.name;
      if(next===manifestPath)continue;
      if(entry.isDirectory())walk(next);
      else if(entry.isFile())add(next);
      else throw Error('historical_source_unsafe_inventory_path');
    }
  };
  walk('src');walk('fixtures');add('package.json');
  return Object.fromEntries(Object.entries(files).sort(([a],[b])=>a.localeCompare(b,'en')));
}

function exactBytesFrom(directory,relative){
  const bytes=fs.readFileSync(path.join(directory,relative));
  const text=bytes.toString('utf8');
  if(!Buffer.from(text).equals(bytes))throw Error('historical_source_not_utf8');
  return {bytes,hash:digest(text.replaceAll('\r\n','\n'))};
}

function copyExact(directory,relative,expected){
  const source=path.join(repositoryRoot,relative),target=path.join(directory,relative),{bytes,hash}=exactBytes(relative);
  if(expected!==undefined&&hash!==expected)throw Error('historical_source_pin_mismatch');
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target,bytes);
}

export function createFrozenInlineEntrySource(){
  const profile=JSON.parse(fs.readFileSync(path.join(repositoryRoot,manifestPath),'utf8'));
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-frozen-inline-entry-'));
  try{
    for(const [relative,expected]of Object.entries(profile.files))copyExact(directory,relative,expected);
    copyExact(directory,manifestPath);
    copyExact(directory,paidContractPath);
    fs.cpSync(path.join(repositoryRoot,'test-support'),path.join(directory,'test-support'),{recursive:true});
    if(JSON.stringify(historicalInventory(directory))!==JSON.stringify(profile.files))throw Error('historical_source_inventory_mismatch');
    return {directory,cleanup:()=>fs.rmSync(directory,{recursive:true,force:true})};
  }catch(error){
    fs.rmSync(directory,{recursive:true,force:true});
    throw error;
  }
}

export function materializeFrozenInlineEntrySource(t){
  const frozen=createFrozenInlineEntrySource();
  t.after(frozen.cleanup);
  return frozen.directory;
}

export function frozenModule(directory,relative){
  return import(pathToFileURL(path.join(directory,relative)).href);
}
