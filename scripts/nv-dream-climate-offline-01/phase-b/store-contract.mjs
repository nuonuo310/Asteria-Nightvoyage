import fs from 'node:fs';
import path from 'node:path';
import {fail} from '../../../src/store.js';
import {
  liveStoreBasename,liveStoreDirectory,liveStoreParent,liveStorePrefix
} from './config.mjs';

function existingAncestor(value){
  let current=path.resolve(value);
  while(!fs.existsSync(current))current=path.dirname(current);
  return current;
}

export function verifyDedicatedStorePath(directory=liveStoreDirectory){
  if(typeof directory!=='string'||!path.isAbsolute(directory)||path.resolve(directory)!==directory||
     path.dirname(directory)!==liveStoreParent||path.basename(directory)!==liveStoreBasename||
     !path.basename(directory).startsWith(liveStorePrefix))
    fail('dream_climate_live_dedicated_store_required');
  const ancestor=existingAncestor(path.dirname(directory));
  let cursor=ancestor;
  for(;;){
    const stat=fs.lstatSync(cursor);
    if(stat.isSymbolicLink())fail('dream_climate_live_store_path_symlink');
    if(cursor===path.dirname(cursor))break;
    cursor=path.dirname(cursor);
  }
  return {parent:liveStoreParent,prefix:liveStorePrefix,basename:liveStoreBasename,
    directory,realParent:fs.realpathSync(ancestor),realPathVerified:true};
}

export function assertLiveStoreAbsent(directory=liveStoreDirectory){
  let stat;
  try{stat=fs.lstatSync(directory);}catch(error){
    if(error.code==='ENOENT')return {exists:false,symlink:false};
    fail('dream_climate_live_store_path_unreadable');
  }
  if(stat.isSymbolicLink())fail('dream_climate_live_store_path_symlink');
  fail('dream_climate_live_store_already_exists');
}
