// Test-only frozen source view. Never a production admission or dispatch path.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

export const legacyManifestPath='src/inline-entry-review.json';
export const legacyManifestHash='21e08f5444ef0923d9bdc8bc9b2736a1f491601cb3dd960a5b4107ff37d52d6a';
const legacyManifestFileCount=86;
const childMarker='NIGHTVOYAGE_LEGACY_SOURCE_VIEW_CHILD';
const viewPrefix='nightvoyage-legacy-source-';
const closeoutOnlyScripts=new Set(['scripts/generated-wake-story-html.mjs','scripts/wake-first-feeling-demo.mjs']);
const fail=code=>{throw Error(code);};

function normalizedHash(bytes){
  const text=bytes.toString('utf8');
  if(!Buffer.from(text).equals(bytes))fail('legacy_source_not_utf8');
  return createHash('sha256').update(text.replaceAll('\r\n','\n')).digest('hex');
}

function safeRelative(relative){
  if(typeof relative!=='string'||!relative||relative.includes('\0')||path.isAbsolute(relative)||/^[A-Za-z]:/.test(relative))fail('legacy_source_path_unsafe');
  const normalized=relative.replaceAll('\\','/');
  if(normalized.split('/').some(part=>part==='..'||part===''))fail('legacy_source_path_unsafe');
  return normalized;
}

function assertPlainPath(root,relative){
  const base=path.resolve(root),target=path.resolve(base,relative),prefix=base+path.sep;
  if(target!==base&&!target.startsWith(prefix))fail('legacy_source_path_unsafe');
  let current=target;
  for(;;){
    let stat;
    try{stat=fs.lstatSync(current);}catch(error){if(error?.code==='ENOENT')fail('legacy_source_path_missing');fail('legacy_source_path_unsafe');}
    if(stat.isSymbolicLink())fail('legacy_source_path_unsafe');
    const parent=path.dirname(current);
    if(parent===current||current===base)break;
    current=parent;
  }
  return target;
}

function readPlainFile(root,relative,expectedHash){
  const normalized=safeRelative(relative),filename=assertPlainPath(root,normalized),stat=fs.lstatSync(filename);
  if(!stat.isFile()||stat.size>8388608)fail('legacy_source_file_invalid');
  const bytes=fs.readFileSync(filename);
  if(expectedHash!==undefined&&normalizedHash(bytes)!==expectedHash)fail('legacy_source_hash_mismatch');
  return bytes;
}

export function verifyLegacyFile(root,relative,expectedHash){
  return readPlainFile(root,relative,expectedHash);
}

function writePlain(destination,relative,bytes){
  const normalized=safeRelative(relative),filename=path.join(destination,normalized);
  fs.mkdirSync(path.dirname(filename),{recursive:true});
  fs.writeFileSync(filename,bytes,{flag:'wx'});
}

function copyTree(sourceRoot,destinationRoot,relative,{excluded=new Set()}={}){
  const normalized=safeRelative(relative),source=assertPlainPath(sourceRoot,normalized);
  for(const entry of fs.readdirSync(source,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en'))){
    const child=`${normalized}/${entry.name}`;
    if(excluded.has(child))continue;
    if(entry.isSymbolicLink())fail('legacy_source_path_unsafe');
    if(entry.isDirectory())copyTree(sourceRoot,destinationRoot,child,{excluded});
    else if(entry.isFile())writePlain(destinationRoot,child,readPlainFile(sourceRoot,child));
    else fail('legacy_source_file_invalid');
  }
}

function walkProductView(root){
  const files=[];
  const walk=relative=>{
    const directory=assertPlainPath(root,relative);
    for(const entry of fs.readdirSync(directory,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en'))){
      const child=`${relative}/${entry.name}`;
      if(entry.isSymbolicLink())fail('legacy_view_shape_mismatch');
      if(entry.isDirectory())walk(child);
      else if(entry.isFile())files.push(child);
      else fail('legacy_view_shape_mismatch');
    }
  };
  walk('src');walk('fixtures');
  files.push('package.json');
  return files.filter(file=>file!==legacyManifestPath).sort((a,b)=>a.localeCompare(b,'en'));
}

export function validateLegacyViewShape(root,manifest){
  const expected=Object.keys(manifest?.files??{}).sort((a,b)=>a.localeCompare(b,'en'));
  const actual=walkProductView(root);
  if(expected.length!==legacyManifestFileCount||JSON.stringify(actual)!==JSON.stringify(expected))fail('legacy_view_shape_mismatch');
  return {sourceFiles:actual.length,manifestPath:legacyManifestPath};
}

export function cleanupLegacyView(directory,{remove=fs.rmSync}={}){
  const resolved=path.resolve(directory),temporary=path.resolve(os.tmpdir()),prefix=temporary+path.sep;
  if(!resolved.startsWith(prefix)||!path.basename(resolved).startsWith(viewPrefix))fail('legacy_view_cleanup_refused');
  try{remove(resolved,{recursive:true,force:true});}catch{fail('legacy_view_cleanup_failed');}
  if(fs.existsSync(resolved))fail('legacy_view_cleanup_failed');
}

function readManifest(root){
  const bytes=readPlainFile(root,legacyManifestPath,legacyManifestHash);
  let value;
  try{value=JSON.parse(bytes.toString('utf8'));}catch{fail('legacy_manifest_invalid');}
  const files=value?.files;
  if(!files||typeof files!=='object'||Array.isArray(files))fail('legacy_manifest_invalid');
  const entries=Object.entries(files);
  if(entries.length!==legacyManifestFileCount||entries.some(([relative,digest])=>
    !/^(?:src|fixtures)\//.test(relative)&&relative!=='package.json'||
    !/^[a-f0-9]{64}$/.test(digest)))fail('legacy_manifest_invalid');
  return {value,files:Object.fromEntries(entries)};
}

export function materializeLegacySourceView({repositoryRoot,testRelative}={}){
  const root=path.resolve(repositoryRoot??fileURLToPath(new URL('..',import.meta.url)));
  const manifest=readManifest(root),directory=fs.mkdtempSync(path.join(os.tmpdir(),viewPrefix));
  try{
    for(const relative of Object.keys(manifest.files).sort((a,b)=>a.localeCompare(b,'en')))
      writePlain(directory,relative,readPlainFile(root,relative,manifest.files[relative]));
    writePlain(directory,legacyManifestPath,readPlainFile(root,legacyManifestPath,legacyManifestHash));
    copyTree(root,directory,'examples');
    copyTree(root,directory,'docs/proposals');
    copyTree(root,directory,'test-support');
    copyTree(root,directory,'scripts',{excluded:closeoutOnlyScripts});
    if(typeof testRelative==='string')writePlain(directory,safeRelative(testRelative),readPlainFile(root,testRelative));
    validateLegacyViewShape(directory,manifest.value);
    return {directory,manifest:manifest.value};
  }catch(error){
    try{cleanupLegacyView(directory);}catch{}
    throw error;
  }
}

export function parseLegacyTap(output){
  const results=[];
  for(const raw of String(output).split(/\r?\n/)){
    const match=/^(not ok|ok) \d+ - (.*?)(?: # (SKIP|TODO).*)?$/.exec(raw);
    if(!match)continue;
    results.push({name:match[2],passed:match[1]==='ok'&&!match[3],directive:match[3]??null});
  }
  return results;
}

export function runLegacySuite(testFileUrl){
  if(process.env[childMarker]==='1')return false;
  const filename=fileURLToPath(testFileUrl),root=path.resolve(path.dirname(filename),'..');
  const relative=path.relative(root,filename).replaceAll('\\','/');
  let view,result,cleanupError;
  try{
    view=materializeLegacySourceView({repositoryRoot:root,testRelative:relative});
    const environment={...process.env,[childMarker]:'1'};
    delete environment.NODE_TEST_CONTEXT;
    result=spawnSync(process.execPath,['--test','--test-reporter=tap',path.join(view.directory,relative)],{
      cwd:view.directory,encoding:'utf8',env:environment,timeout:300000,maxBuffer:33554432,windowsHide:true
    });
  }catch(error){
    test(`legacy source view: ${relative}`,()=>assert.fail(error.message));
    return true;
  }finally{
    if(view){try{cleanupLegacyView(view.directory);}catch(error){cleanupError=error;}}
  }
  const output=`${result.stdout??''}${result.stderr??''}`,results=parseLegacyTap(result.stdout??'');
  if(cleanupError)test(`legacy source cleanup: ${relative}`,()=>assert.fail(cleanupError.message));
  if(!results.length||result.error||result.status===null){
    test(`legacy source runner: ${relative}`,()=>assert.fail(`legacy_child_runner_failed\n${output.slice(0,12000)}`));
    return true;
  }
  for(const item of results){
    test(item.name,()=>{
      if(!item.passed)assert.fail(`legacy_child_test_failed${item.directive?`_${item.directive}`:''}\n${output.slice(0,12000)}`);
    });
  }
  if(result.status!==0&&results.every(item=>item.passed))
    test(`legacy source status: ${relative}`,()=>assert.fail(`legacy_child_status_failed\n${output.slice(0,12000)}`));
  return true;
}
