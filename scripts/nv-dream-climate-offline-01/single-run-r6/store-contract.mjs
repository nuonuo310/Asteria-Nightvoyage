import fs from 'node:fs';
import path from 'node:path';
import {fail} from '../../../src/store.js';
import {r6StoreBasename,r6StoreDirectory,r6StoreParent,r6StorePrefix} from './config.mjs';

export function assertR6StorePath(directory=r6StoreDirectory){
  if(typeof directory!=='string'||!path.isAbsolute(directory)||
     path.resolve(directory)!==path.resolve(r6StoreDirectory)||
     path.basename(directory)!==r6StoreBasename||path.dirname(directory)!==r6StoreParent)
    fail('dream_climate_r6_store_path_mismatch');
  return path.resolve(directory);
}

export function assertR6DirectoryAbsent(directory){
  if(typeof directory!=='string'||!path.isAbsolute(directory))
    fail('dream_climate_r6_store_path_mismatch');
  const resolved=path.resolve(directory);
  let stat;
  try{stat=fs.lstatSync(resolved);}catch(error){
    if(error.code==='ENOENT')return {directory:resolved,exists:false};
    fail('dream_climate_r6_store_path_unreadable');
  }
  if(stat.isSymbolicLink())fail('dream_climate_r6_store_path_symlink');
  fail('dream_climate_r6_store_already_exists');
}

export function assertR6StoreAbsent(directory=r6StoreDirectory){
  return assertR6DirectoryAbsent(assertR6StorePath(directory));
}

export {r6StoreBasename,r6StoreDirectory,r6StoreParent,r6StorePrefix};
