// Parse-only static ESM graph plus a scoped resolution/load constraint. Not a sandbox.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {registerHooks,isBuiltin} from 'node:module';
import {createHash} from 'node:crypto';
const fail=()=>{throw Error('inline_dependency_constraint_failed');};
const digest=text=>createHash('sha256').update(text).digest('hex');
const canonical=p=>{let current=path.resolve(p);for(;;){if(fs.lstatSync(current).isSymbolicLink())fail();const parent=path.dirname(current);if(parent===current)break;current=parent;}return path.resolve(p);};
export function inlineDependencyGraph(repositoryRoot=fileURLToPath(new URL('..',import.meta.url)),entry='src/inline-authorized-runtime.js'){
  if(typeof vm.SourceTextModule!=='function')throw Error('parse_only_vm_flag_required');
  const base=canonical(repositoryRoot),files={},builtins=new Set(),edges={};
  const visit=relative=>{
    if(Object.hasOwn(files,relative))return;
    if(!/^src\/[\w/-]+\.js$/.test(relative))fail();const filename=canonical(path.join(base,relative));if(!filename.startsWith(base+path.sep)||fs.statSync(filename).size>2097152)fail();const bytes=fs.readFileSync(filename),source=bytes.toString('utf8').replaceAll('\r\n','\n');if(!Buffer.from(bytes.toString('utf8')).equals(bytes))fail();files[relative]=digest(source);
    const parsed=new vm.SourceTextModule(source,{identifier:pathToFileURL(filename).href});edges[relative]=[];
    for(const request of parsed.moduleRequests){if(request.phase!=='evaluation'||Object.keys(request.attributes).length)fail();const s=request.specifier;if(s.startsWith('node:')&&isBuiltin(s)){builtins.add(s);edges[relative].push(s);}else{if(!s.startsWith('./')&&!s.startsWith('../'))fail();const next=new URL(s,pathToFileURL(filename));if(next.search||next.hash||next.protocol!=='file:')fail();const local=path.relative(base,fileURLToPath(next)).split(path.sep).join('/');edges[relative].push(local);visit(local);}}
  };
  visit(entry);return {schemaVersion:1,kind:'parse_only_static_esm_graph',entry,files:Object.fromEntries(Object.entries(files).sort()),edges:Object.fromEntries(Object.entries(edges).sort()),builtins:[...builtins].sort(),evaluated:false,dynamicImportClosureProved:false};
}
export function constrainInlineModules(graph,repositoryRoot=fileURLToPath(new URL('..',import.meta.url))){
  const base=canonical(repositoryRoot),allowed=new Map(Object.entries(graph.files).map(([p,h])=>[pathToFileURL(canonical(path.join(base,p))).href,h])),builtins=new Set(graph.builtins);
  if(!allowed.size)fail();
  const check=url=>{if(url.startsWith('node:')){if(!builtins.has(url))fail();return;}const pin=allowed.get(url);if(!pin)fail();const p=canonical(fileURLToPath(url));if(digest(fs.readFileSync(p,'utf8').replaceAll('\r\n','\n'))!==pin)fail();};
  return registerHooks({resolve(specifier,context,next){const result=next(specifier,context);check(result.url);return result;},load(url,context,next){check(url);const result=next(url,context);if(url.startsWith('file:')&&result.format!=='module')fail();if(url.startsWith('file:')&&digest(Buffer.from(result.source).toString('utf8').replaceAll('\r\n','\n'))!==allowed.get(url))fail();return result;}});
}
