// Project-owned parse-only graph for the independent one-dream paid surface.
// It does not edit or rebind the older inline source review manifest.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {isBuiltin,registerHooks} from 'node:module';

const root=fileURLToPath(new URL('../..',import.meta.url));
export const oneDreamGraphPath='scripts/nv-deepseek-one-dream/runtime-graph.json';
export const oneDreamGraphEntry='scripts/nv-deepseek-one-dream/session.mjs';
const fail=code=>{throw Error(code);};
export const digestText=text=>createHash('sha256').update(text).digest('hex');
export const normalizeText=text=>text.replaceAll('\r\n','\n');
export function canonicalPath(value){
  let current=path.resolve(value);
  for(;;){const stat=fs.lstatSync(current);if(stat.isSymbolicLink())fail('one_dream_unsafe_source_path');const parent=path.dirname(current);if(parent===current)break;current=parent;}
  return path.resolve(value);
}
export function readSafeText(repositoryRoot,relative,max=2097152){
  const base=canonicalPath(repositoryRoot),filename=path.join(base,relative);canonicalPath(filename);
  const stat=fs.lstatSync(filename);if(!stat.isFile()||stat.size>max)fail('one_dream_unsafe_source_file');
  const bytes=fs.readFileSync(filename),text=bytes.toString('utf8');
  if(!Buffer.from(text).equals(bytes))fail('one_dream_source_utf8_invalid');
  return normalizeText(text);
}
export function readSafeJson(repositoryRoot,relative,max=2097152){
  try{return JSON.parse(readSafeText(repositoryRoot,relative,max));}catch{fail('one_dream_source_json_invalid');}
}
function permitted(relative){
  return /^src\/[A-Za-z0-9_.\/-]+\.js$/.test(relative)||
    /^scripts\/nv-deepseek-one-dream\/[A-Za-z0-9_.\/-]+\.mjs$/.test(relative);
}
export function buildOneDreamGraph(repositoryRoot=root,entry=oneDreamGraphEntry){
  if(typeof vm.SourceTextModule!=='function')fail('one_dream_parse_only_vm_flag_required');
  if(!permitted(entry))fail('one_dream_graph_entry_invalid');
  const base=canonicalPath(repositoryRoot),files={},edges={},builtins=new Set();
  const visit=relative=>{
    if(Object.hasOwn(files,relative))return;
    if(!permitted(relative))fail('one_dream_graph_path_rejected');
    const source=readSafeText(base,relative),filename=path.join(base,relative);
    files[relative]=digestText(source);edges[relative]=[];
    const parsed=new vm.SourceTextModule(source,{identifier:pathToFileURL(filename).href});
    for(const request of parsed.moduleRequests){
      if(request.phase!=='evaluation'||Object.keys(request.attributes??{}).length)fail('one_dream_graph_attribute_rejected');
      const specifier=request.specifier;
      if(specifier.startsWith('node:')){if(!isBuiltin(specifier))fail('one_dream_graph_builtin_invalid');builtins.add(specifier);edges[relative].push(specifier);continue;}
      if(!specifier.startsWith('./')&&!specifier.startsWith('../'))fail('one_dream_graph_bare_import_rejected');
      const next=new URL(specifier,pathToFileURL(filename));if(next.search||next.hash||next.protocol!=='file:')fail('one_dream_graph_url_rejected');
      const local=path.relative(base,fileURLToPath(next)).split(path.sep).join('/');
      if(!permitted(local))fail('one_dream_graph_path_rejected');
      edges[relative].push(local);visit(local);
    }
  };
  visit(entry);
  return {schemaVersion:1,kind:'parse_only_static_esm_graph',entry,files:Object.fromEntries(Object.entries(files).sort()),edges:Object.fromEntries(Object.entries(edges).sort()),builtins:[...builtins].sort(),evaluated:false,dynamicImportClosureProved:false};
}
export function graphText(graph){return JSON.stringify(graph,null,2)+'\n';}
export function writeOneDreamGraph(repositoryRoot=root){
  const base=canonicalPath(repositoryRoot),graph=buildOneDreamGraph(base),filename=path.join(base,oneDreamGraphPath);
  fs.writeFileSync(filename,graphText(graph),{encoding:'utf8',flag:'w'});
  return {graph,filename,graphHash:digestText(normalizeText(fs.readFileSync(filename,'utf8')))};
}
export function verifyOneDreamGraph({repositoryRoot=root,contract,graphPath=oneDreamGraphPath}={}){
  if(!contract?.source||contract.source.entry!==oneDreamGraphEntry||contract.source.graphPath!==graphPath)fail('one_dream_graph_contract_mismatch');
  const text=readSafeText(repositoryRoot,graphPath),hash=digestText(text);
  if(hash!==contract.source.graphHash)fail('one_dream_graph_hash_mismatch');
  let graph;try{graph=JSON.parse(text);}catch{fail('one_dream_graph_invalid');}
  if(graph?.entry!==oneDreamGraphEntry||!graph.files||!graph.edges||!Array.isArray(graph.builtins))fail('one_dream_graph_invalid');
  for(const [relative,pinned]of Object.entries(graph.files)){
    if(!permitted(relative)||digestText(readSafeText(repositoryRoot,relative))!==pinned)fail('one_dream_graph_file_mismatch');
    if(contract.source.codeFiles?.[relative]!==undefined&&contract.source.codeFiles[relative]!==pinned)fail('one_dream_graph_file_mismatch');
  }
  return graph;
}
export function constrainOneDreamModules(graph,repositoryRoot=root){
  const base=canonicalPath(repositoryRoot),allowed=new Map(Object.entries(graph.files).map(([relative,hash])=>[pathToFileURL(canonicalPath(path.join(base,relative))).href,hash])),builtins=new Set(graph.builtins);
  if(!allowed.size)fail('one_dream_graph_empty');
  const check=url=>{
    if(url.startsWith('node:')){if(!builtins.has(url))fail('one_dream_module_builtin_rejected');return;}
    const pin=allowed.get(url);if(!pin)fail('one_dream_module_path_rejected');
    if(digestText(readSafeText(base,path.relative(base,fileURLToPath(url)).split(path.sep).join('/')))!==pin)fail('one_dream_module_hash_mismatch');
  };
  return registerHooks({resolve(specifier,context,next){const result=next(specifier,context);check(result.url);return result;},load(url,context,next){check(url);const result=next(url,context);if(url.startsWith('file:')&&result.format!=='module')fail('one_dream_module_format_rejected');return result;}});
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{const value=writeOneDreamGraph();console.log(JSON.stringify({graphPath:oneDreamGraphPath,entry:value.graph.entry,files:Object.keys(value.graph.files).length,builtins:value.graph.builtins.length,graphHash:value.graphHash},null,2));}
  catch{console.error('one_dream_graph_write_failed');process.exitCode=1;}
}
