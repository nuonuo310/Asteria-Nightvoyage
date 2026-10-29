import fs from 'node:fs';
import path from 'node:path';
import {fail} from '../../../src/store.js';
import {r10StoreBasename,r10StoreDirectory,r10StoreParent,r10StorePrefix} from './config.mjs';

export function assertR10StorePath(directory=r10StoreDirectory){
  if(typeof directory!=='string'||!path.isAbsolute(directory)||
     path.resolve(directory)!==path.resolve(r10StoreDirectory)||
     path.basename(directory)!==r10StoreBasename||path.dirname(directory)!==r10StoreParent)
    fail('dream_climate_r10_store_path_mismatch');
  return path.resolve(directory);
}

export function assertR10DirectoryAbsent(directory){
  if(typeof directory!=='string'||!path.isAbsolute(directory))
    fail('dream_climate_r10_store_path_mismatch');
  const resolved=path.resolve(directory);
  let stat;
  try{stat=fs.lstatSync(resolved);}catch(error){
    if(error.code==='ENOENT')return {directory:resolved,exists:false};
    fail('dream_climate_r10_store_path_unreadable');
  }
  if(stat.isSymbolicLink())fail('dream_climate_r10_store_path_symlink');
  fail('dream_climate_r10_store_already_exists');
}

export function assertR10StoreAbsent(directory=r10StoreDirectory){
  return assertR10DirectoryAbsent(assertR10StorePath(directory));
}

export {r10StoreBasename,r10StoreDirectory,r10StoreParent,r10StorePrefix};
