import fs from 'node:fs';
import path from 'node:path';
import {fail} from '../../../src/store.js';
import {r4StoreBasename,r4StoreDirectory,r4StoreParent,r4StorePrefix} from './config.mjs';

export function assertR4StorePath(directory=r4StoreDirectory){
  if(typeof directory!=='string'||!path.isAbsolute(directory)||
     path.resolve(directory)!==path.resolve(r4StoreDirectory)||
     path.basename(directory)!==r4StoreBasename||path.dirname(directory)!==r4StoreParent)
    fail('dream_climate_r4_store_path_mismatch');
  return path.resolve(directory);
}

export function assertDirectoryAbsent(directory){
  if(typeof directory!=='string'||!path.isAbsolute(directory))
    fail('dream_climate_r4_store_path_mismatch');
  const resolved=path.resolve(directory);
  let stat;
  try{stat=fs.lstatSync(resolved);}catch(error){
    if(error.code==='ENOENT')return {directory:resolved,exists:false};
    fail('dream_climate_r4_store_path_unreadable');
  }
  if(stat.isSymbolicLink())fail('dream_climate_r4_store_path_symlink');
  fail('dream_climate_r4_store_already_exists');
}

export function assertR4StoreAbsent(directory=r4StoreDirectory){
  return assertDirectoryAbsent(assertR4StorePath(directory));
}

export {r4StoreBasename,r4StoreDirectory,r4StoreParent,r4StorePrefix};
