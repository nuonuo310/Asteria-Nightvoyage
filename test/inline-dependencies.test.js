import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
const moduleUrl=new URL('../src/inline-entry-dependencies.js',import.meta.url).href;
function child(code,flag=true){return spawnSync(process.execPath,[...(flag?['--experimental-vm-modules']:[]),'--input-type=module','-e',`import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {inlineDependencyGraph,constrainInlineModules} from ${JSON.stringify(moduleUrl)};${code}`],{encoding:'utf8',timeout:15000});}
function project(t,files){const d=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-graph-'));t.after(()=>fs.rmSync(d,{recursive:true,force:true}));fs.mkdirSync(path.join(d,'src'));fs.writeFileSync(path.join(d,'package.json'),'{"type":"module"}');for(const [p,b]of Object.entries(files))fs.writeFileSync(path.join(d,'src',p),b);return d;}
test('V8 parses import/reexport cycles without evaluating source or accepting lookalike comment imports',t=>{
  const d=project(t,{'a.js':"import './b.js';export * from './b.js';// import 'bad-package';\nglobalThis.graphSentinel=true;",'b.js':"import './a.js';export const value=1;"});const r=child(`const g=inlineDependencyGraph(${JSON.stringify(d)},'src/a.js');assert.equal(Object.keys(g.files).length,2);assert.equal(globalThis.graphSentinel,undefined);assert.equal(g.evaluated,false);`);assert.equal(r.status,0,r.stderr);
});
for(const bad of ["import 'unreviewed-package';","import '../outside.js';","import 'data:text/javascript,export default 1';","import './b.js?alias';"])test(`static graph rejects unsupported dependency ${bad}`,t=>{const d=project(t,{'a.js':bad,'b.js':'export const ok=1;'});const r=child(`assert.throws(()=>inlineDependencyGraph(${JSON.stringify(d)},'src/a.js'));`);assert.equal(r.status,0,r.stderr);});
test('missing VM flag fails explicitly instead of using regex dependency guesses',()=>{const r=child("assert.throws(()=>inlineDependencyGraph(),/parse_only_vm_flag_required/);",false);assert.equal(r.status,0,r.stderr);});
test('constraint hashes actual loaded bytes and rejects post-graph edits before module evaluation',t=>{const d=project(t,{'a.js':'globalThis.changedModuleExecuted=true;export const ok=1;'});const r=child(`const g=inlineDependencyGraph(${JSON.stringify(d)},'src/a.js');fs.appendFileSync(${JSON.stringify(path.join(d,'src/a.js'))},'// changed');const h=constrainInlineModules(g,${JSON.stringify(d)});try{await assert.rejects(import(${JSON.stringify(pathToFileURL(path.join(d,'src/a.js')).href)}),/inline_dependency_constraint_failed/);assert.equal(globalThis.changedModuleExecuted,undefined);}finally{h.deregister();}`);assert.equal(r.status,0,r.stderr);});
test('static graph blocks symbolic links and source outside the reviewed project',t=>{const d=project(t,{'a.js':"import './b.js';",'real.js':'export const ok=1;'});fs.symlinkSync(path.join(d,'src/real.js'),path.join(d,'src/b.js'));const r=child(`assert.throws(()=>inlineDependencyGraph(${JSON.stringify(d)},'src/a.js'));`);assert.equal(r.status,0,r.stderr);});
