import fs from 'node:fs';
import path from 'node:path';
import {fail} from '../../../src/store.js';
import {r8StoreBasename,r8StoreDirectory,r8StoreParent,r8StorePrefix} from './config.mjs';

export function assertR8StorePath(directory=r8StoreDirectory){
  if(typeof directory!=='string'||!path.isAbsolute(directory)||
     path.resolve(directory)!==path.resolve(r8StoreDirectory)||
     path.basename(directory)!==r8StoreBasename||path.dirname(directory)!==r8StoreParent)
    fail('dream_climate_r8_store_path_mismatch');
  return path.resolve(directory);
}

export function assertR8DirectoryAbsent(directory){
  if(typeof directory!=='string'||!path.isAbsolute(directory))
    fail('dream_climate_r8_store_path_mismatch');
  const resolved=path.resolve(directory);
  let stat;
  try{stat=fs.lstatSync(resolved);}catch(error){
    if(error.code==='ENOENT')return {directory:resolved,exists:false};
    fail('dream_climate_r8_store_path_unreadable');
  }
  if(stat.isSymbolicLink())fail('dream_climate_r8_store_path_symlink');
  fail('dream_climate_r8_store_already_exists');
}

export function assertR8StoreAbsent(directory=r8StoreDirectory){
  return assertR8DirectoryAbsent(assertR8StorePath(directory));
}

export {r8StoreBasename,r8StoreDirectory,r8StoreParent,r8StorePrefix};
