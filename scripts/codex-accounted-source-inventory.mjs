// Offline repository-source inventory for the accounted Codex fixture path only.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

export const inventoryVersion='codex-accounted-source-inventory-v1';
export const manifestVersion='codex-accounted-source-manifest-v1';
export const hashPolicy='text_utf8_crlf_to_lf_sha256_v1; binary_raw_sha256_v1';
export const edgeClasses=Object.freeze([
 'relative_static_import','relative_static_reexport','literal_dynamic_import','node_builtin',
 'reviewed_repository_child_program','fixed_repository_data','fixed_repository_config',
 'reviewed_external_program','generated_workspace_state_exclusion'
]);

export const defaultRoots=Object.freeze([
 {id:'accounted_checker',kind:'accounted_checker',path:'scripts/check-codex-accounted-dream.mjs'},
 {id:'standalone_reading_projection',kind:'standalone_reading_projection',path:'scripts/accounted-codex-content-view.mjs'}
]);

export const defaultExplicitEdges=Object.freeze([
 {id:'accounted_fixture_snapshot',kind:'fixed_repository_data',from:'scripts/check-codex-accounted-dream.mjs',to:'examples/adapter-boundary.snapshot.json',
  sourceToken:"new URL('../examples/adapter-boundary.snapshot.json',import.meta.url)",reviewNote:'Fixed fictional snapshot read before engine construction; literal URL only.'},
 {id:'accounted_peer_child',kind:'reviewed_repository_child_program',from:'scripts/codex-accounted-stage-owner.mjs',to:'test-support/codex-request-observer-peer.mjs',
  sourceToken:"new URL('../test-support/codex-request-observer-peer.mjs',import.meta.url)",reviewNote:'Only repository child selected by the accounted stage owner; native binary stays external.'},
 {id:'fixture_peer_child',kind:'reviewed_repository_child_program',from:'scripts/codex-fixture-stage-owner.mjs',to:'test-support/codex-request-observer-peer.mjs',
  sourceToken:"new URL('../test-support/codex-request-observer-peer.mjs',import.meta.url)",reviewNote:'Only repository child selected by the non-accounted fixture owner; native binary stays external.'},
 {id:'rpc_peer_child',kind:'reviewed_repository_child_program',from:'scripts/codex-pipe-rehearsal.mjs',to:'test-support/codex-rpc-peer-child.mjs',
  sourceToken:"new URL('../test-support/codex-rpc-peer-child.mjs',import.meta.url)",reviewNote:'Fixed local RPC rehearsal peer, selected by a literal URL.'}
]);

export const defaultFixedInputs=Object.freeze([
 {path:'package.json',kind:'fixed_repository_config',reviewNote:'ES module mode and Node >=24 engine contract for the checked entry.'}
]);

export const defaultExternalPrograms=Object.freeze([
 {id:'native_codex_version_probe',kind:'supplied_native_binary',from:'scripts/check-codex-accounted-dream.mjs',
  sourceToken:"spawnSync(options.executable,['--version']",reviewNote:'Installed codex executable is a supplied external input; no binary hash is available.'},
 {id:'native_codex_accounted_stage',kind:'supplied_native_binary',from:'scripts/codex-accounted-stage-owner.mjs',
  sourceToken:"launch.kind==='native'?launch.binary:process.execPath",reviewNote:'Native stage executable is supplied at runtime and is not repository source.'},
 {id:'native_codex_fixture_stage',kind:'supplied_native_binary',from:'scripts/codex-fixture-stage-owner.mjs',
  sourceToken:"launch.kind==='native'?launch.binary:process.execPath",reviewNote:'Native stage executable is supplied at runtime and is not repository source.'},
 {id:'windows_url_opener',kind:'platform_executable',from:'scripts/chatgpt-plan-login.mjs',
  sourceToken:"spawn(path.join(root,'System32','rundll32.exe')",reviewNote:'Operating-system URL opener reached only by the separate login source; not exercised by this checker.'}
]);

export const defaultRuntimeInputs=Object.freeze([
 {id:'node_runtime',kind:'node_platform',requirement:'Node.js >=24',verifiedByInventory:false,note:'Version is reported by the checker, not pinned to a binary hash.'},
 {id:'native_codex_executable',kind:'supplied_native_binary',status:'unverified',note:'Path, version and content are not validated by the offline inventory.'},
 {id:'windows_url_opener',kind:'platform_executable',status:'unverified',note:'System32/rundll32.exe is an external platform dependency.'},
 {id:'generated_workspace_state',kind:'generated_workspace_state',status:'excluded',note:'Temporary workspaces, books and Store state are runtime data and are never scanned.'},
 {id:'real_provider_route',kind:'authenticated_route',status:'unverified',note:'No credentials, account data, entitlement or real model request is checked.'}
]);

export const defaultExclusions=Object.freeze([
 'Node built-ins and their platform implementations',
 'The installed native Codex executable and its platform package',
 'The operating-system URL opener and other host executables',
 'Generated temporary workspaces, books, Store state and relay journals',
 'Dynamic behavior, authenticated forwarding, model entitlement and production admission'
]);

const textExtensions=new Set(['.js','.mjs','.json']);
const digest=value=>createHash('sha256').update(value).digest('hex');
const posix=value=>value.split(path.sep).join('/');
const lineAt=(source,index)=>source.slice(0,index).split('\n').length;

function diagnostic(code,pathValue=null,line=null){return {code,path:pathValue,line};}
function compareDiagnostics(a,b){return (a.code??'').localeCompare(b.code??'')||(a.path??'').localeCompare(b.path??'')||(a.line??0)-(b.line??0);}

export function normalizeText(source){
 if(typeof source!=='string')throw Error('source_text_invalid');
 return source.replace(/\r\n?/g,'\n');
}

export function hashText(value){return digest(Buffer.from(normalizeText(value),'utf8'));}

function isContained(root,target){
 const relative=path.relative(root,target);
 return relative===''||relative!=='..'&&!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative);
}

function readSafeFile(root,relative){
 if(typeof relative!=='string'||!relative||relative.includes('\0')||path.isAbsolute(relative))return {diagnostic:diagnostic('path_escape',String(relative))};
 const clean=path.posix.normalize(relative.split('\\').join('/'));
 if(clean==='.'||clean==='..'||clean.startsWith('../')||clean.startsWith('/')||path.posix.isAbsolute(clean))return {diagnostic:diagnostic('path_escape',relative)};
 let cursor=root;
 for(const segment of clean.split('/')){
  cursor=path.join(cursor,segment);
  let stat;
  try{stat=fs.lstatSync(cursor);}catch(error){
   if(error?.code==='ENOENT')return {diagnostic:diagnostic('source_file_missing',clean)};
   return {diagnostic:diagnostic('source_stat_failed',clean)};
  }
  if(stat.isSymbolicLink())return {diagnostic:diagnostic('symlink_path',clean)};
 }
 try{
  const real=fs.realpathSync(cursor);
  if(!isContained(root,real))return {diagnostic:diagnostic('path_escape',clean)};
  const stat=fs.lstatSync(cursor);
  if(!stat.isFile())return {diagnostic:diagnostic('not_a_file',clean)};
  return {path:clean,absolute:cursor,stat,bytes:fs.readFileSync(cursor)};
 }catch{return {diagnostic:diagnostic('source_read_failed',clean)};}
}

function codeView(source){
 const chars=[...source];
 for(let i=0;i<chars.length;i++){
  const ch=chars[i];
  if(ch==='\''||ch==='"'||ch==='`'){
   const quote=ch;
   let closed=false;
   for(i++;i<chars.length;i++){
    const current=chars[i];
    if(current==='\\'){chars[i]=' ';if(i+1<chars.length){chars[i+1]=' ';i++;}continue;}
    if(current===quote){closed=true;break;}
    if(current==='\n'||current==='\r'){chars[i]='\n';continue;}
    chars[i]=' ';
   }
   if(!closed)return chars.join('');
   continue;
  }
  if(ch==='/'&&chars[i+1]==='/'){
   chars[i]=' ';chars[i+1]=' ';
   while(i+1<chars.length&&chars[i+1]!=='\n'){i++;if(chars[i]!=='\r')chars[i]=' ';}
   continue;
  }
  if(ch==='/'&&chars[i+1]==='*'){
   chars[i]=' ';chars[i+1]=' ';
   i+=2;
   while(i<chars.length){
    if(chars[i]==='*'&&chars[i+1]==='/'){chars[i]=' ';chars[i+1]=' ';i++;break;}
    if(chars[i]!=='\n'&&chars[i]!=='\r')chars[i]=' ';i++;
   }
  }
 }
 return chars.join('');
}

function identifierAt(view,index,name){
 if(view.slice(index,index+name.length)!==name)return false;
 const before=index===0?'':view[index-1],after=view[index+name.length]??'';
 return !/[A-Za-z0-9_$]/.test(before)&&!/[A-Za-z0-9_$]/.test(after);
}

function literalAt(source,index){
 let cursor=index;while(cursor<source.length&&/\s/.test(source[cursor]))cursor++;
 const quote=source[cursor];if(quote!=='\''&&quote!=='"')return null;
 let value='';
 for(cursor++;cursor<source.length;cursor++){
  const ch=source[cursor];
  if(ch===quote)return {value,end:cursor+1};
  if(ch==='\\'){
   cursor++;if(cursor>=source.length)return null;
   const escaped=source[cursor],map={n:'\n',r:'\r',t:'\t','\\':'\\','\'':'\'','"':'"'};
   value+=Object.hasOwn(map,escaped)?map[escaped]:escaped;
  }else value+=ch;
 }
 return null;
}

function firstQuoteBeforeStatementEnd(view,start){
 let braces=0,parens=0;
 for(let i=start;i<view.length;i++){
  const ch=view[i];
  if(ch==='{')braces++;else if(ch==='}')braces=Math.max(0,braces-1);
  else if(ch==='(')parens++;else if(ch===')')parens=Math.max(0,parens-1);
  else if((ch==='\''||ch==='"')&&braces===0&&parens===0)return i;
  else if((ch===';'||ch==='\n')&&braces===0&&parens===0)return -1;
 }
 return -1;
}

function fromQuoteBeforeStatementEnd(view,start){
 let braces=0,parens=0;
 for(let i=start;i<view.length;i++){
  const ch=view[i];
  if(ch==='{')braces++;else if(ch==='}')braces=Math.max(0,braces-1);
  else if(ch==='(')parens++;else if(ch===')')parens=Math.max(0,parens-1);
  if(braces===0&&parens===0&&identifierAt(view,i,'from')){
   for(let cursor=i+4;cursor<view.length;cursor++){
    const next=view[cursor];
    if(next==='\''||next==='"')return cursor;
    if(next===';'||next==='\n')return -1;
   }
  }
  if((ch===';'||ch==='\n')&&braces===0&&parens===0)return -1;
 }
 return -1;
}

function scanModule(relative,source){
 const view=codeView(source),references=[],diagnostics=[];
 for(let index=0;index<view.length;index++){
  if(identifierAt(view,index,'import')){
   let cursor=index+6;while(cursor<view.length&&/\s/.test(view[cursor]))cursor++;
   if(view[cursor]==='.')continue;
   if(view[cursor]==='('){
    cursor++;while(cursor<view.length&&/\s/.test(view[cursor]))cursor++;
    const literal=literalAt(source,cursor);
    if(!literal){diagnostics.push(diagnostic('computed_code_load',relative,lineAt(source,index)));continue;}
    references.push({specifier:literal.value,kind:'literal_dynamic_import',line:lineAt(source,index)});
    continue;
   }
   const quote=firstQuoteBeforeStatementEnd(view,index+6);
   if(quote<0){diagnostics.push(diagnostic('unsupported_import_syntax',relative,lineAt(source,index)));continue;}
   const literal=literalAt(source,quote);
   if(!literal){diagnostics.push(diagnostic('unsupported_import_syntax',relative,lineAt(source,index)));continue;}
   references.push({specifier:literal.value,kind:'relative_static_import',line:lineAt(source,index)});
   continue;
  }
  if(identifierAt(view,index,'export')){
   const quote=fromQuoteBeforeStatementEnd(view,index+6);
   if(quote<0)continue;
   const literal=literalAt(source,quote);
   if(!literal){diagnostics.push(diagnostic('unsupported_import_syntax',relative,lineAt(source,index)));continue;}
   references.push({specifier:literal.value,kind:'relative_static_reexport',line:lineAt(source,index)});
  }
 }
 for(const pattern of [/\brequire\s*\(/g,/\bcreateRequire\s*\(/g,/\bnew\s+Function\s*\(/g,/\beval\s*\(/g,/\bimport\.meta\.resolve\s*\(/g,/\bvm\./g]){
  for(const match of view.matchAll(pattern))diagnostics.push(diagnostic('computed_code_load',relative,lineAt(source,match.index)));
 }
 const seen=new Set(),unique=diagnostics.filter(item=>{const key=item.code+'\0'+item.path+'\0'+item.line;if(seen.has(key))return false;seen.add(key);return true;});
 return {references,diagnostics:unique};
}

function classifySpecifier(relative,reference){
 const specifier=reference.specifier;
 if(specifier.startsWith('node:'))return {edge:{from:relative,to:specifier,kind:'node_builtin',importMode:reference.kind,line:reference.line},target:null};
 if(specifier.startsWith('.')){
  const target=path.posix.normalize(path.posix.join(path.posix.dirname(relative),specifier.split('\\').join('/')));
  if(target==='..'||target.startsWith('../')||target.startsWith('/')||path.posix.isAbsolute(target))return {diagnostic:diagnostic('path_escape',relative,reference.line)};
  return {edge:{from:relative,to:target,kind:reference.kind,importMode:reference.kind,line:reference.line},target};
 }
 if(specifier.startsWith('/')||path.isAbsolute(specifier))return {diagnostic:diagnostic('path_escape',relative,reference.line)};
 if(/^(?:data|http|https|file):/.test(specifier))return {diagnostic:diagnostic('unsupported_specifier',relative,reference.line)};
 return {diagnostic:diagnostic('unreviewed_package',relative,reference.line)};
}

function normalizeDefinitions(definitions={}){
 return {roots:definitions.roots??defaultRoots,explicitEdges:definitions.explicitEdges??defaultExplicitEdges,fixedInputs:definitions.fixedInputs??defaultFixedInputs,
  externalPrograms:definitions.externalPrograms??defaultExternalPrograms,runtimeInputs:definitions.runtimeInputs??defaultRuntimeInputs,
  exclusions:definitions.exclusions??defaultExclusions,authority:definitions.authority??null};
}

export function buildInventory({repoRoot,definitions={}}={}){
 if(typeof repoRoot!=='string')throw Error('repo_root_invalid');
 const root=fs.realpathSync(repoRoot),defs=normalizeDefinitions(definitions);
 const files=new Map(),edges=[],diagnostics=[],queue=[],sourceTexts=new Map(),nodeBuiltins=new Set(),explicitUsed=new Set(),externalUsed=new Set();
 const enqueue=(relative,role)=>{if(typeof relative==='string')queue.push({relative:posix(relative),role});};
 for(const item of defs.roots)enqueue(item.path,`root:${item.kind}`);
 for(const item of defs.fixedInputs)enqueue(item.path,item.kind);

 function addFile(relative,role){
  const clean=posix(relative);
  if(files.has(clean)){files.get(clean).roles.add(role);return true;}
  const read=readSafeFile(root,clean);
  if(read.diagnostic){diagnostics.push(read.diagnostic);return false;}
  const extension=path.extname(clean).toLowerCase(),isText=textExtensions.has(extension);
  let normalized=read.bytes,policy='binary_raw_sha256_v1',text=null;
  if(isText){
   try{text=normalizeText(new TextDecoder('utf-8',{fatal:true}).decode(read.bytes));}
   catch{diagnostics.push(diagnostic('text_decode_failed',clean));return false;}
   normalized=Buffer.from(text,'utf8');policy='text_utf8_crlf_to_lf_sha256_v1';
  }
  const record={path:clean,kind:/\.(?:js|mjs)$/.test(extension)?'source':isText?'fixed_data':'binary',
   roles:new Set([role]),bytes:normalized.length,hashPolicy:policy,sha256:digest(normalized)};
  files.set(clean,record);
  if(text!==null&&record.kind==='source'){
   sourceTexts.set(clean,text);
   const scan=scanModule(clean,text);diagnostics.push(...scan.diagnostics);
   for(const reference of scan.references){
    const classified=classifySpecifier(clean,reference);
    if(classified.diagnostic){diagnostics.push(classified.diagnostic);continue;}
    edges.push(classified.edge);
    if(classified.edge.kind==='node_builtin')nodeBuiltins.add(classified.edge.to);
    else if(classified.target)enqueue(classified.target,'relative_static_import');
   }
  }
  return true;
 }

 while(queue.length){const item=queue.shift();addFile(item.relative,item.role);}

 for(const item of defs.explicitEdges){
  const source=sourceTexts.get(item.from);
  if(!source){diagnostics.push(diagnostic('explicit_edge_source_absent',item.from));continue;}
  if(typeof item.sourceToken!=='string'||!source.includes(item.sourceToken)){diagnostics.push(diagnostic('explicit_edge_source_mismatch',item.from));continue;}
  explicitUsed.add(item.id);
  edges.push({from:item.from,to:posix(item.to),kind:item.kind,line:lineAt(source,source.indexOf(item.sourceToken)),reviewNote:item.reviewNote??null,edgeId:item.id});
  addFile(item.to,item.kind);
  while(queue.length){const next=queue.shift();addFile(next.relative,next.role);}
 }

 for(const item of defs.externalPrograms){
  const source=sourceTexts.get(item.from);
  if(!source||typeof item.sourceToken!=='string'||!source.includes(item.sourceToken)){
   diagnostics.push(diagnostic('external_program_source_mismatch',item.from??null));continue;
  }
  externalUsed.add(item.id);
  edges.push({from:item.from,to:`external:${item.id}`,kind:'reviewed_external_program',line:lineAt(source,source.indexOf(item.sourceToken)),reviewNote:item.reviewNote??null,edgeId:item.id});
 }

 for(const [relative,text] of sourceTexts){
  if(/\bspawn(?:Sync)?\s*\(/.test(codeView(text))){
   const hasChild=defs.explicitEdges.some(edge=>edge.from===relative&&edge.kind==='reviewed_repository_child_program');
   const hasExternal=defs.externalPrograms.some(item=>item.from===relative);
   if(!hasChild&&!hasExternal)diagnostics.push(diagnostic('unclassified_executable_edge',relative));
  }
 }
 for(const item of defs.explicitEdges)if(!explicitUsed.has(item.id))diagnostics.push(diagnostic('explicit_edge_unvisited',item.from??null));
 for(const item of defs.externalPrograms)if(!externalUsed.has(item.id))diagnostics.push(diagnostic('external_program_unvisited',item.from??null));

 const sortedFiles=[...files.values()].map(record=>({path:record.path,kind:record.kind,roles:[...record.roles].sort((a,b)=>a.localeCompare(b)),
  bytes:record.bytes,hashPolicy:record.hashPolicy,sha256:record.sha256})).sort((a,b)=>a.path.localeCompare(b.path));
 const sortedEdges=edges.map(edge=>({...edge})).sort((a,b)=>a.from.localeCompare(b.from)||a.line-b.line||a.kind.localeCompare(b.kind)||a.to.localeCompare(b.to));
 const uniqueDiagnostics=[...new Map(diagnostics.map(item=>[item.code+'\0'+(item.path??'')+'\0'+(item.line??''),item])).values()].sort(compareDiagnostics);
 const closureHash=digest(Buffer.from(sortedFiles.map(item=>item.path+'\0'+item.sha256+'\n').join(''),'utf8'));
 const edgesHash=digest(Buffer.from(JSON.stringify(sortedEdges),'utf8'));
 const counts={files:sortedFiles.length,sourceFiles:sortedFiles.filter(item=>item.kind==='source').length,
  fixedDataFiles:sortedFiles.filter(item=>item.kind==='fixed_data').length,
  fixedConfigFiles:sortedFiles.filter(item=>item.roles.includes('fixed_repository_config')).length,
  childPrograms:sortedFiles.filter(item=>item.roles.includes('reviewed_repository_child_program')).length,
  edges:sortedEdges.length,relativeStaticImports:sortedEdges.filter(item=>item.kind==='relative_static_import').length,
  relativeStaticReexports:sortedEdges.filter(item=>item.kind==='relative_static_reexport').length,
  literalDynamicImports:sortedEdges.filter(item=>item.importMode==='literal_dynamic_import').length,nodeBuiltins:nodeBuiltins.size,
  explicitDataEdges:sortedEdges.filter(item=>item.kind==='fixed_repository_data').length,
  explicitChildEdges:sortedEdges.filter(item=>item.kind==='reviewed_repository_child_program').length,
  reviewedExternalProgramEdges:sortedEdges.filter(item=>item.kind==='reviewed_external_program').length};
 return {files:sortedFiles,edges:sortedEdges,edgesHash,nodeBuiltins:[...nodeBuiltins].sort((a,b)=>a.localeCompare(b)),closureHash,counts,diagnostics:uniqueDiagnostics};
}

export function buildManifest({repoRoot,definitions={}}={}){
 const defs=normalizeDefinitions(definitions),inventory=buildInventory({repoRoot,definitions:defs});
 return {manifestVersion,contractVersion:inventoryVersion,authority:defs.authority,
  hashPolicy:{text:'UTF-8 decoded, CRLF and lone CR normalized to LF, SHA-256 of normalized UTF-8 bytes.',binary:'Exact bytes, SHA-256.',manifest:'Same text policy.'},
  edgeClasses:[...edgeClasses],roots:defs.roots.map(({id,kind,path:value})=>({id,kind,path:posix(value)})),
  explicitEdges:defs.explicitEdges.map(({id,kind,from,to,sourceToken,reviewNote})=>({id,kind,from,to:posix(to),sourceToken,reviewNote})),
  fixedInputs:defs.fixedInputs.map(({path:value,kind,reviewNote})=>({path:posix(value),kind,reviewNote})),
  runtimeInputs:defs.runtimeInputs,externalPrograms:defs.externalPrograms.map(({id,kind,from,sourceToken,reviewNote})=>({id,kind,from,sourceToken,reviewNote})),
  exclusions:defs.exclusions,counts:inventory.counts,closureHash:inventory.closureHash,edgesHash:inventory.edgesHash,files:inventory.files,
  nodeBuiltins:inventory.nodeBuiltins,unresolved:inventory.diagnostics};
}

export function hashManifest(value){return hashText(JSON.stringify(value,null,2)+'\n');}

function inventoryMismatchDiagnostics(expected,actual){
 const diagnostics=[],actualFiles=new Map(actual.files.map(item=>[item.path,item]));
 for(const item of expected.files??[]){
  const current=actualFiles.get(item.path);
  if(!current){diagnostics.push(diagnostic('source_file_missing',item.path));continue;}
  if(current.sha256!==item.sha256)diagnostics.push(diagnostic('source_file_hash_mismatch',item.path));
  if(current.kind!==item.kind||JSON.stringify(current.roles)!==JSON.stringify(item.roles))diagnostics.push(diagnostic('source_file_role_mismatch',item.path));
  actualFiles.delete(item.path);
 }
 for(const relative of actualFiles.keys())diagnostics.push(diagnostic('unreviewed_source_file',relative));
 if(expected.edgesHash!==actual.edgesHash)diagnostics.push(diagnostic('source_edge_mismatch'));
 if(JSON.stringify(expected.nodeBuiltins??[])!==JSON.stringify(actual.nodeBuiltins)||JSON.stringify(expected.counts??{})!==JSON.stringify(actual.counts)||expected.closureHash!==actual.closureHash)diagnostics.push(diagnostic('manifest_inventory_mismatch'));
 return diagnostics.sort(compareDiagnostics);
}

export function verifyInventory({repoRoot,manifest,manifestHash,expectedManifestHash}={}){
 if(!manifest||typeof manifest!=='object'||Array.isArray(manifest)||manifest.manifestVersion!==manifestVersion||manifest.contractVersion!==inventoryVersion){
  return {status:'blocked',diagnostics:[diagnostic('manifest_invalid')],sideEffectsStarted:false};
 }
 if(Array.isArray(manifest.unresolved)&&manifest.unresolved.length){
  return {status:'blocked',diagnostics:[diagnostic('manifest_unresolved')],manifestHash:manifestHash??null,sideEffectsStarted:false};
 }
 if(typeof expectedManifestHash==='string'&&manifestHash!==expectedManifestHash){
  return {status:'blocked',diagnostics:[diagnostic('manifest_hash_mismatch')],manifestHash:manifestHash??null,sideEffectsStarted:false};
 }
 const definitions={roots:manifest.roots,explicitEdges:manifest.explicitEdges,fixedInputs:manifest.fixedInputs,
  externalPrograms:manifest.externalPrograms,runtimeInputs:manifest.runtimeInputs,exclusions:manifest.exclusions,authority:manifest.authority};
 let current;
 try{current=buildInventory({repoRoot,definitions});}
 catch{return {status:'blocked',diagnostics:[diagnostic('inventory_scan_failed')],manifestHash:manifestHash??null,sideEffectsStarted:false};}
 if(current.diagnostics.length)return {status:'blocked',diagnostics:current.diagnostics,manifestHash:manifestHash??null,sideEffectsStarted:false};
 const mismatch=inventoryMismatchDiagnostics(manifest,current);
 if(mismatch.length)return {status:'blocked',diagnostics:mismatch,manifestHash:manifestHash??null,sideEffectsStarted:false};
 return {status:'verified',diagnostics:[],manifestHash:manifestHash??null,closureHash:current.closureHash,counts:current.counts,
  files:current.files,edgesHash:current.edgesHash,nodeBuiltins:current.nodeBuiltins,sideEffectsStarted:false};
}
