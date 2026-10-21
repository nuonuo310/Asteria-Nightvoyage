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
 'reviewed_executable_occurrence','generated_workspace_state_exclusion'
]);

export const defaultRoots=Object.freeze([
 {id:'accounted_checker',kind:'accounted_checker',path:'scripts/check-codex-accounted-dream.mjs'},
 {id:'standalone_reading_projection',kind:'standalone_reading_projection',path:'scripts/accounted-codex-content-view.mjs'}
]);

export const defaultExplicitEdges=Object.freeze([
 {id:'accounted_fixture_snapshot',kind:'fixed_repository_data',from:'scripts/check-codex-accounted-dream.mjs',to:'examples/adapter-boundary.snapshot.json',
  sourceToken:"new URL('../examples/adapter-boundary.snapshot.json',import.meta.url)",sourceSha256:'a4266aea5fb793bcb70929c307557eae0dee45a5a9a25c9c4c6c6738e0505235',occurrence:0,
  reviewNote:'Fixed fictional snapshot read before engine construction; literal URL only.'},
 {id:'accounted_peer_child',kind:'reviewed_repository_child_program',from:'scripts/codex-accounted-stage-owner.mjs',to:'test-support/codex-request-observer-peer.mjs',
  sourceToken:"new URL('../test-support/codex-request-observer-peer.mjs',import.meta.url)",sourceSha256:'081ac2fac8ace70e212923261738440bf14b297c23026e62b949abb87b883725',occurrence:0,
  reviewNote:'Only repository child selected by the accounted stage owner; native binary stays external.'},
 {id:'fixture_peer_child',kind:'reviewed_repository_child_program',from:'scripts/codex-fixture-stage-owner.mjs',to:'test-support/codex-request-observer-peer.mjs',
  sourceToken:"new URL('../test-support/codex-request-observer-peer.mjs',import.meta.url)",sourceSha256:'0dbe32f5727404e70f49c4ff6585ce9e3c83aaaa8d698143518fdd2134f95b10',occurrence:0,
  reviewNote:'Only repository child selected by the non-accounted fixture owner; native binary stays external.'},
 {id:'rpc_peer_child',kind:'reviewed_repository_child_program',from:'scripts/codex-pipe-rehearsal.mjs',to:'test-support/codex-rpc-peer-child.mjs',
  sourceToken:"new URL('../test-support/codex-rpc-peer-child.mjs',import.meta.url)",sourceSha256:'2d2c45bd43c11d6486753435635279963dc2d1ad34d463949de17da70487f905',occurrence:0,
  reviewNote:'Fixed local RPC rehearsal peer, selected by a literal URL.'}
]);

export const defaultFixedInputs=Object.freeze([
 {path:'package.json',kind:'fixed_repository_config',reviewNote:'ES module mode and Node >=24 engine contract for the checked entry.'}
]);

export const defaultExternalPrograms=Object.freeze([
 {id:'native_codex_executable',kind:'supplied_native_binary',status:'unverified',note:'Path, version and content are outside this repository-source inventory.'},
 {id:'windows_url_opener',kind:'platform_executable',status:'unverified',note:'System32/rundll32.exe is an external platform dependency.'}
]);

export const defaultExecutableOccurrences=Object.freeze([
 {id:'accounted_native_version_probe',kind:'supplied_native_binary',from:'scripts/check-codex-accounted-dream.mjs',
  sourceToken:"spawnSync(options.executable,['--version']",sourceSha256:'a4266aea5fb793bcb70929c307557eae0dee45a5a9a25c9c4c6c6738e0505235',occurrence:0,
  reviewNote:'Exact reviewed native version-probe call; the executable is supplied externally.'},
 {id:'accounted_stage_launch',kind:'repository_child_or_supplied_native',from:'scripts/codex-accounted-stage-owner.mjs',
  sourceToken:'spawn(executable,childArgs',sourceSha256:'081ac2fac8ace70e212923261738440bf14b297c23026e62b949abb87b883725',occurrence:0,
  reviewNote:'Exact reviewed stage launch; the peer child and supplied native branch are separately inventoried.'},
 {id:'fixture_stage_launch',kind:'repository_child_or_supplied_native',from:'scripts/codex-fixture-stage-owner.mjs',
  sourceToken:'spawn(executable,childArgs',sourceSha256:'0dbe32f5727404e70f49c4ff6585ce9e3c83aaaa8d698143518fdd2134f95b10',occurrence:0,
  reviewNote:'Exact reviewed fixture-stage launch; native execution remains unverified.'},
 {id:'rpc_peer_launch',kind:'repository_child',from:'scripts/codex-pipe-rehearsal.mjs',
  sourceToken:"spawn(process.execPath,[fileURLToPath(new URL('../test-support/codex-rpc-peer-child.mjs',import.meta.url))",sourceSha256:'2d2c45bd43c11d6486753435635279963dc2d1ad34d463949de17da70487f905',occurrence:0,
  reviewNote:'Exact reviewed local RPC peer launch.'},
 {id:'windows_url_opener_launch',kind:'platform_executable',from:'scripts/chatgpt-plan-login.mjs',
  sourceToken:"spawn(path.join(root,'System32','rundll32.exe')",sourceSha256:'4d05b3c8cd2ec0e6a40d8454bcab78cb015c48f2a17c3f5a617da63f2595b390',occurrence:0,
  reviewNote:'Exact reviewed platform URL-opener call; not exercised by this checker.'}
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
 // UTF-16 code-unit array: indexes remain identical to source string offsets.
 const chars=source.split('');
 const mask=index=>{if(index<chars.length&&chars[index]!=='\n'&&chars[index]!=='\r')chars[index]=' ';};
 function scanTemplate(index){
  while(index<chars.length){
   const ch=source[index];
   if(ch==='\\'){mask(index);mask(index+1);index+=2;continue;}
   if(ch==='`'){mask(index);return index+1;}
   if(ch==='$'&&source[index+1]==='{'){mask(index);mask(index+1);index=scanCode(index+2,true);continue;}
   mask(index);index++;
  }
  return index;
 }
 function scanCode(index,stopAtBrace){
  let braceDepth=0;
  while(index<chars.length){
   const ch=source[index];
   if(ch==='\''||ch==='"'){
    const quote=ch;index++;
    while(index<chars.length){
     if(source[index]==='\\'){mask(index);mask(index+1);index+=2;continue;}
     if(source[index]===quote){index++;break;}
     mask(index);index++;
    }
    continue;
   }
   if(ch==='`'){mask(index);index=scanTemplate(index+1);continue;}
   if(ch==='/'&&source[index+1]==='/'){mask(index);mask(index+1);index+=2;while(index<chars.length&&source[index]!=='\n'){mask(index);index++;}continue;}
   if(ch==='/'&&source[index+1]==='*'){
    mask(index);mask(index+1);index+=2;
    while(index<chars.length){if(source[index]==='*'&&source[index+1]==='/'){mask(index);mask(index+1);index+=2;break;}mask(index);index++;}
    continue;
   }
   if(stopAtBrace&&ch==='{'){braceDepth++;index++;continue;}
   if(stopAtBrace&&ch==='}'){if(braceDepth===0){mask(index);return index+1;}braceDepth--;index++;continue;}
   index++;
  }
  return index;
 }
 scanCode(0,false);return chars.join('');
}

function isCodeOrigin(source,view,token,index){
 if(view[index]!==source[index])return false;
 if(/[A-Za-z_$]/.test(token[0]??'')){
  const before=index===0?'':source[index-1];
  if(/[A-Za-z0-9_$]/.test(before))return false;
  if(/[A-Za-z0-9_$]/.test(token[token.length-1]??'')){
   const after=source[index+token.length]??'';
   if(/[A-Za-z0-9_$]/.test(after))return false;
  }
 }
 return true;
}

function findTokenOccurrences(source,view,token){
 const occurrences=[];
 if(typeof token!=='string'||!token)return occurrences;
 let cursor=0;
 while((cursor=source.indexOf(token,cursor))>=0){
  if(isCodeOrigin(source,view,token,cursor))occurrences.push(cursor);
  cursor+=Math.max(1,token.length);
 }
 return occurrences;
}

function escapeRegExp(value){return value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}

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
  if(ch!=='\\'){value+=ch;continue;}
  cursor++;if(cursor>=source.length)return null;
  const escaped=source[cursor],map={n:'\n',r:'\r',t:'\t',b:'\b',f:'\f',v:'\v','\\':'\\','\'':'\'','"':'"','/':'/'};
  if(Object.hasOwn(map,escaped)){value+=map[escaped];continue;}
  if(escaped==='x'){
   const hex=source.slice(cursor+1,cursor+3);if(!/^[0-9A-Fa-f]{2}$/.test(hex))return null;
   value+=String.fromCharCode(Number.parseInt(hex,16));cursor+=2;continue;
  }
  if(escaped==='u'){
   if(source[cursor+1]==='{'){
    const end=source.indexOf('}',cursor+2);if(end<0)return null;
    const hex=source.slice(cursor+2,end);if(!/^[0-9A-Fa-f]{1,6}$/.test(hex))return null;
    value+=String.fromCodePoint(Number.parseInt(hex,16));cursor=end;continue;
   }
   const hex=source.slice(cursor+1,cursor+5);if(!/^[0-9A-Fa-f]{4}$/.test(hex))return null;
   value+=String.fromCharCode(Number.parseInt(hex,16));cursor+=4;continue;
  }
  if(escaped==='\n')continue;
  value+=escaped;
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

const executableFunctions=new Set(['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork']);

function childProcessAliases(source,index,quote){
 const prefix=source.slice(index+6,quote).replace(/\bfrom\s*$/,'').trim();
 if(!prefix)return {names:new Set(),namespaces:new Set(),invalid:false};
 const names=new Set(),namespaces=new Set();
 const namespace=prefix.match(/^\*\s+as\s+([A-Za-z_$][\w$]*)$/);
 if(namespace){namespaces.add(namespace[1]);return {names,namespaces,invalid:false};}
 const braces=prefix.match(/\{([\s\S]*)\}/);
 if(braces){
  for(const raw of braces[1].split(',')){
   const value=raw.trim();if(!value)continue;
   const match=value.match(/^(?:type\s+)?([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/);
   if(!match)return {names,namespaces,invalid:true};
   if(executableFunctions.has(match[1]))names.add(match[2]??match[1]);
  }
  return {names,namespaces,invalid:false};
 }
 const defaultImport=prefix.match(/^([A-Za-z_$][\w$]*)(?:\s*,|$)/);
 if(defaultImport)namespaces.add(defaultImport[1]);
 return {names,namespaces,invalid:!defaultImport};
}

function executableCalls(relative,source,view,names,namespaces,skipRanges){
 const calls=[],diagnostics=[],skipped=index=>skipRanges.some(([start,end])=>index>=start&&index<end);
 for(let index=0;index<view.length;){
  if(!/[A-Za-z_$]/.test(view[index])){index++;continue;}
  let end=index+1;while(end<view.length&&/[A-Za-z0-9_$]/.test(view[end]))end++;
  const name=view.slice(index,end),previous=index===0?'':view[index-1];
  if(names.has(name)&&previous!=='.'&&!skipped(index)){
   let cursor=end;while(cursor<view.length&&/\s/.test(view[cursor]))cursor++;
   if(view[cursor]==='(')calls.push({index,line:lineAt(source,index),name});
   else diagnostics.push(diagnostic('unsupported_executable_usage',relative,lineAt(source,index)));
  }
  if(namespaces.has(name)&&!skipped(index)){
   let cursor=end;while(cursor<view.length&&/\s/.test(view[cursor]))cursor++;
   if(view[cursor]==='.'){
    cursor++;while(cursor<view.length&&/\s/.test(view[cursor]))cursor++;
    let memberEnd=cursor+1;while(memberEnd<view.length&&/[A-Za-z0-9_$]/.test(view[memberEnd]))memberEnd++;
    const member=view.slice(cursor,memberEnd);
    let callAt=memberEnd;while(callAt<view.length&&/\s/.test(view[callAt]))callAt++;
    if(executableFunctions.has(member)){
     if(view[callAt]==='(')calls.push({index,line:lineAt(source,index),name:`${name}.${member}`});
     else diagnostics.push(diagnostic('unsupported_executable_usage',relative,lineAt(source,index)));
    }
   }else diagnostics.push(diagnostic('unsupported_executable_usage',relative,lineAt(source,index)));
  }
  index=end;
 }
 return {calls,diagnostics};
}

function scanModule(relative,source){
 const view=codeView(source),references=[],diagnostics=[],executableNames=new Set(),executableNamespaces=new Set(),skipRanges=[],localExportStarts=[];
 for(let index=0;index<view.length;index++){
  if(identifierAt(view,index,'import')){
   let cursor=index+6;while(cursor<view.length&&/\s/.test(view[cursor]))cursor++;
   if(view[cursor]==='.')continue;
   if(view[cursor]==='('){
    cursor++;while(cursor<view.length&&/\s/.test(view[cursor]))cursor++;
    const literal=literalAt(source,cursor);
    if(!literal){diagnostics.push(diagnostic('computed_code_load',relative,lineAt(source,index)));continue;}
    let after=literal.end;while(after<view.length&&/\s/.test(view[after]))after++;
    if(view[after]!==')'){diagnostics.push(diagnostic('computed_code_load',relative,lineAt(source,index)));continue;}
    references.push({specifier:literal.value,kind:'literal_dynamic_import',line:lineAt(source,index)});
    if(literal.value==='node:child_process')diagnostics.push(diagnostic('unreviewed_executable_import',relative,lineAt(source,index)));
    continue;
   }
   const quote=firstQuoteBeforeStatementEnd(view,index+6);
   if(quote<0){diagnostics.push(diagnostic('unsupported_import_syntax',relative,lineAt(source,index)));continue;}
   const literal=literalAt(source,quote);
   if(!literal){diagnostics.push(diagnostic('unsupported_import_syntax',relative,lineAt(source,index)));continue;}
    if(literal.value==='node:child_process'){
     const aliases=childProcessAliases(source,index,quote);
     if(aliases.invalid)diagnostics.push(diagnostic('unsupported_import_syntax',relative,lineAt(source,index)));
     for(const name of aliases.names)executableNames.add(name);
     for(const name of aliases.namespaces)executableNamespaces.add(name);
    }
    skipRanges.push([index,literal.end]);
    references.push({specifier:literal.value,kind:'relative_static_import',line:lineAt(source,index)});
    continue;
   }
   if(identifierAt(view,index,'export')){
    const quote=fromQuoteBeforeStatementEnd(view,index+6);
    if(quote<0){localExportStarts.push(index);continue;}
    const literal=literalAt(source,quote);
    if(!literal){diagnostics.push(diagnostic('unsupported_import_syntax',relative,lineAt(source,index)));continue;}
    skipRanges.push([index,literal.end]);
    if(literal.value==='node:child_process')diagnostics.push(diagnostic('unreviewed_executable_export',relative,lineAt(source,index)));
    references.push({specifier:literal.value,kind:'relative_static_reexport',line:lineAt(source,index)});
   }
  }
  for(const start of localExportStarts){
   let end=start;while(end<view.length&&view[end]!==';'&&view[end]!=='\n')end++;
   const segment=view.slice(start,end);
   for(const name of [...executableNames,...executableNamespaces]){
    if(new RegExp('\\b'+escapeRegExp(name)+'\\b').test(segment))diagnostics.push(diagnostic('unreviewed_executable_export',relative,lineAt(source,start)));
   }
  }
  for(const pattern of [/\brequire\s*\(/g,/\bcreateRequire\s*\(/g,/\bnew\s+Function\s*\(/g,/\beval\s*\(/g,/\bimport\.meta\.resolve\s*\(/g,/\bvm\./g,/\bprocess\.getBuiltinModule\s*\(/g,/\bprocess\.binding\s*\(/g]){
   for(const match of view.matchAll(pattern))diagnostics.push(diagnostic('computed_code_load',relative,lineAt(source,match.index)));
  }
  const executable=executableCalls(relative,source,view,executableNames,executableNamespaces,skipRanges);
  diagnostics.push(...executable.diagnostics);
  const seen=new Set(),unique=diagnostics.filter(item=>{const key=item.code+'\0'+item.path+'\0'+item.line;if(seen.has(key))return false;seen.add(key);return true;});
  return {references,diagnostics:unique,executableCalls:executable.calls,view};
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
  executableOccurrences:definitions.executableOccurrences??defaultExecutableOccurrences,
  exclusions:definitions.exclusions??defaultExclusions,authority:definitions.authority??null};
}

export function buildInventory({repoRoot,definitions={}}={}){
 if(typeof repoRoot!=='string')throw Error('repo_root_invalid');
 const root=fs.realpathSync(repoRoot),defs=normalizeDefinitions(definitions);
 const files=new Map(),edges=[],diagnostics=[],queue=[],sourceTexts=new Map(),sourceViews=new Map(),executableCallsBySource=new Map(),
  nodeBuiltins=new Set(),explicitUsed=new Set(),executableUsed=new Set();
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
   sourceViews.set(clean,scan.view);executableCallsBySource.set(clean,scan.executableCalls);
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
  const source=sourceTexts.get(item.from),view=sourceViews.get(item.from),file=files.get(item.from);
  if(!source||!view||!file){diagnostics.push(diagnostic('explicit_edge_source_absent',item.from));continue;}
  if(typeof item.sourceSha256!=='string'||item.sourceSha256!==file.sha256){diagnostics.push(diagnostic('explicit_edge_hash_mismatch',item.from));continue;}
  const matches=findTokenOccurrences(source,view,item.sourceToken),occurrence=item.occurrence??0;
  if(!Number.isInteger(occurrence)||occurrence<0||occurrence>=matches.length){diagnostics.push(diagnostic('explicit_edge_source_mismatch',item.from));continue;}
  const index=matches[occurrence];
  explicitUsed.add(item.id);
  edges.push({from:item.from,to:posix(item.to),kind:item.kind,line:lineAt(source,index),reviewNote:item.reviewNote??null,edgeId:item.id});
  addFile(item.to,item.kind);
  while(queue.length){const next=queue.shift();addFile(next.relative,next.role);}
 }

 for(const item of defs.executableOccurrences){
  const source=sourceTexts.get(item.from),view=sourceViews.get(item.from),file=files.get(item.from);
  if(!source||!view||!file){diagnostics.push(diagnostic('executable_occurrence_unreviewed',item.from??null));continue;}
  if(typeof item.sourceSha256!=='string'||item.sourceSha256!==file.sha256){diagnostics.push(diagnostic('executable_occurrence_hash_mismatch',item.from));continue;}
  const matches=findTokenOccurrences(source,view,item.sourceToken),occurrence=item.occurrence??0;
  if(!Number.isInteger(occurrence)||occurrence<0||occurrence>=matches.length){diagnostics.push(diagnostic('executable_occurrence_unreviewed',item.from));continue;}
  const index=matches[occurrence],key=item.from+'\0'+index;
  const call=(executableCallsBySource.get(item.from)??[]).find(candidate=>candidate.index===index&&!executableUsed.has(key));
  if(!call){diagnostics.push(diagnostic('executable_occurrence_unreviewed',item.from));continue;}
  executableUsed.add(key);
  edges.push({from:item.from,to:`executable:${item.id}`,kind:'reviewed_executable_occurrence',line:call.line,reviewNote:item.reviewNote??null,edgeId:item.id});
 }
 for(const [relative,calls] of executableCallsBySource){
  for(const call of calls)if(!executableUsed.has(relative+'\0'+call.index))diagnostics.push(diagnostic('unclassified_executable_call',relative,call.line));
 }
 for(const item of defs.explicitEdges)if(!explicitUsed.has(item.id))diagnostics.push(diagnostic('explicit_edge_unvisited',item.from??null));

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
  reviewedExecutableOccurrenceEdges:sortedEdges.filter(item=>item.kind==='reviewed_executable_occurrence').length};
 return {files:sortedFiles,edges:sortedEdges,edgesHash,nodeBuiltins:[...nodeBuiltins].sort((a,b)=>a.localeCompare(b)),closureHash,counts,diagnostics:uniqueDiagnostics};
}

export function buildManifest({repoRoot,definitions={}}={}){
 const defs=normalizeDefinitions(definitions),inventory=buildInventory({repoRoot,definitions:defs});
 return {manifestVersion,contractVersion:inventoryVersion,authority:defs.authority,
  hashPolicy:{text:'UTF-8 decoded, CRLF and lone CR normalized to LF, SHA-256 of normalized UTF-8 bytes.',binary:'Exact bytes, SHA-256.',manifest:'Same text policy.'},
  edgeClasses:[...edgeClasses],roots:defs.roots.map(({id,kind,path:value})=>({id,kind,path:posix(value)})),
  explicitEdges:defs.explicitEdges.map(({id,kind,from,to,sourceToken,sourceSha256,occurrence,reviewNote})=>({id,kind,from,to:posix(to),sourceToken,sourceSha256,occurrence,reviewNote})),
  fixedInputs:defs.fixedInputs.map(({path:value,kind,reviewNote})=>({path:posix(value),kind,reviewNote})),
  runtimeInputs:defs.runtimeInputs,externalPrograms:defs.externalPrograms.map(({id,kind,status,note})=>({id,kind,status,note})),
  executableOccurrences:defs.executableOccurrences.map(({id,kind,from,sourceToken,sourceSha256,occurrence,reviewNote})=>({id,kind,from,sourceToken,sourceSha256,occurrence,reviewNote})),
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
  externalPrograms:manifest.externalPrograms,executableOccurrences:manifest.executableOccurrences,runtimeInputs:manifest.runtimeInputs,
  exclusions:manifest.exclusions,authority:manifest.authority};
 let current;
 try{current=buildInventory({repoRoot,definitions});}
 catch{return {status:'blocked',diagnostics:[diagnostic('inventory_scan_failed')],manifestHash:manifestHash??null,sideEffectsStarted:false};}
 if(current.diagnostics.length)return {status:'blocked',diagnostics:current.diagnostics,manifestHash:manifestHash??null,sideEffectsStarted:false};
 const mismatch=inventoryMismatchDiagnostics(manifest,current);
 if(mismatch.length)return {status:'blocked',diagnostics:mismatch,manifestHash:manifestHash??null,sideEffectsStarted:false};
 return {status:'verified',diagnostics:[],manifestHash:manifestHash??null,closureHash:current.closureHash,counts:current.counts,
  files:current.files,edgesHash:current.edgesHash,nodeBuiltins:current.nodeBuiltins,sideEffectsStarted:false};
}
