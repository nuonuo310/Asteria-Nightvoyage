import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {buildInventory,buildManifest,hashText,verifyInventory} from '../scripts/codex-accounted-source-inventory.mjs';
import {createSourceFixture,rewriteManifest,fixtureDefinitions} from '../test-support/codex-accounted-source-fixtures.js';

const readManifest=fixture=>JSON.parse(fs.readFileSync(fixture.manifestPath,'utf8'));
const verify=fixture=>{
 const manifest=readManifest(fixture);
 return verifyInventory({repoRoot:fixture.root,manifest,manifestHash:fixture.manifestHash,expectedManifestHash:fixture.manifestHash});
};
const codes=result=>new Set(result.diagnostics.map(item=>item.code));
const hasDiagnostic=(result,code,relative,line)=>result.diagnostics.some(item=>item.code===code&&(!relative||item.path===relative)&&(!line||item.line===line));
function treeSnapshot(root){
 const output=[];
 for(const entry of fs.readdirSync(root,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
  const absolute=path.join(root,entry.name),relative=path.relative(root,absolute).split(path.sep).join('/');
  if(entry.isDirectory())output.push(...treeSnapshot(absolute));
  else output.push([relative,fs.readFileSync(absolute).toString('base64')]);
 }
 return output;
}
function append(fixture,relative,text){fs.appendFileSync(path.join(fixture.root,relative),text);}
function write(fixture,relative,text){const file=path.join(fixture.root,relative);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,text);}
const inventory=(fixture,definitions=fixtureDefinitions)=>buildInventory({repoRoot:fixture.root,definitions});

test('inventory covers imports, re-exports, dynamic imports, child and data edges deterministically',t=>{
 const fixture=createSourceFixture(t),first=buildManifest({repoRoot:fixture.root,definitions:fixtureDefinitions});
 const second=buildManifest({repoRoot:fixture.root,definitions:fixtureDefinitions});
 assert.deepEqual(second,first);
 assert.equal(first.unresolved.length,0);
 assert.ok(first.counts.relativeStaticImports>=5);
 assert.equal(first.counts.relativeStaticReexports,2);
 assert.equal(first.counts.literalDynamicImports,1);
 assert.equal(first.counts.explicitChildEdges,1);
 assert.equal(first.counts.explicitDataEdges,1);
 assert.ok(first.files.some(item=>item.path==='test-support/child-peer.mjs'));
 assert.ok(first.files.some(item=>item.path==='data/config.json'));
 assert.equal(verify(fixture).status,'verified');
});

test('CRLF and file creation order do not change the reviewed inventory',t=>{
 const lf=createSourceFixture(t),crlf=createSourceFixture(t,{crlf:true}),reverse=createSourceFixture(t,{reverse:true});
 const base=buildManifest({repoRoot:lf.root,definitions:fixtureDefinitions});
 const windows=buildManifest({repoRoot:crlf.root,definitions:fixtureDefinitions});
 const reordered=buildManifest({repoRoot:reverse.root,definitions:fixtureDefinitions});
 assert.equal(windows.closureHash,base.closureHash);
 assert.equal(windows.edgesHash,base.edgesHash);
 assert.deepEqual(windows.files,base.files);
 assert.equal(reordered.closureHash,base.closureHash);
 assert.deepEqual(reordered.files,base.files);
});

test('a deeper dependency alteration is detected beyond the root file',t=>{
 const fixture=createSourceFixture(t);append(fixture,'scripts/dep-c.mjs','export const changed=true;\n');
 const result=verify(fixture);
 assert.equal(result.status,'blocked');
 assert.ok(hasDiagnostic(result,'source_file_hash_mismatch','scripts/dep-c.mjs'));
});

test('missing nested source and unreviewed package fail closed',t=>{
 const missing=createSourceFixture(t);fs.rmSync(path.join(missing.root,'scripts/dep-b.mjs'));
 assert.ok(hasDiagnostic(verify(missing),'source_file_missing','scripts/dep-b.mjs'));
 const packageFixture=createSourceFixture(t);append(packageFixture,'scripts/dep-c.mjs',"import 'fixture-package';\n");
 assert.ok(hasDiagnostic(verify(packageFixture),'unreviewed_package','scripts/dep-c.mjs'));
});

test('computed executable loading and path escape are unresolved',t=>{
 const computed=createSourceFixture(t);append(computed,'scripts/dep-c.mjs',"const moduleName='./dep-d.mjs';\nawait import(moduleName);\n");
 assert.ok(hasDiagnostic(verify(computed),'computed_code_load','scripts/dep-c.mjs'));
 const escaped=createSourceFixture(t);append(escaped,'scripts/dep-c.mjs',"import '../../outside.mjs';\n");
 assert.ok(hasDiagnostic(verify(escaped),'path_escape','scripts/dep-c.mjs'));
});

test('a symlinked dependency is refused instead of traversed',t=>{
 const fixture=createSourceFixture(t),outside=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-source-outside-'));
 t.after(()=>fs.rmSync(outside,{recursive:true,force:true}));
 const target=path.join(outside,'outside.mjs');fs.writeFileSync(target,'export const outside=true;\n');
 const dependency=path.join(fixture.root,'scripts/dep-c.mjs');fs.rmSync(dependency);
 try{fs.symlinkSync(target,dependency,'file');}catch(error){
  if(['EPERM','EACCES','UNKNOWN'].includes(error.code)){t.skip('file symlink unavailable in this environment');return;}
  throw error;
 }
 const result=verify(fixture);
 assert.equal(result.status,'blocked');
 assert.ok(hasDiagnostic(result,'symlink_path','scripts/dep-c.mjs'));
});

test('manifest tampering is detected by the pinned manifest hash',t=>{
 const fixture=createSourceFixture(t),manifest=readManifest(fixture);
 manifest.counts.files+=1;
 const changedHash=rewriteManifest(fixture,manifest);
 const result=verifyInventory({repoRoot:fixture.root,manifest,manifestHash:changedHash,expectedManifestHash:fixture.manifestHash});
 assert.equal(result.status,'blocked');
 assert.ok(hasDiagnostic(result,'manifest_hash_mismatch'));
});

test('blocked verification refuses before side effects and leaves the fixture unchanged',t=>{
 const fixture=createSourceFixture(t);append(fixture,'scripts/dep-c.mjs',"const moduleName='./dep-d.mjs';\nawait import(moduleName);\n");
 const before=treeSnapshot(fixture.root),result=verify(fixture),after=treeSnapshot(fixture.root);
 assert.equal(result.status,'blocked');
 assert.equal(result.sideEffectsStarted,false);
 assert.deepEqual(after,before);
 assert.ok(codes(result).has('computed_code_load'));
});

test('template interpolation is scanned as code while raw template text stays inert',t=>{
 const positive=createSourceFixture(t);
 write(positive,'scripts/dep-e.mjs','export const depE=true;\n');
 append(positive,'scripts/dep-c.mjs',"const text=`${await import('./dep-e.mjs')}`;\n");
 const covered=inventory(positive);
 assert.equal(covered.diagnostics.length,0);
 assert.ok(covered.edges.some(edge=>edge.from==='scripts/dep-c.mjs'&&edge.to==='scripts/dep-e.mjs'&&edge.kind==='literal_dynamic_import'));
 const computed=createSourceFixture(t);
 write(computed,'scripts/dep-e.mjs','export const depE=true;\n');
 append(computed,'scripts/dep-c.mjs',"const suffix='e';\nconst text=`${await import('./dep-'+suffix+'.mjs')}`;\n");
 assert.ok(hasDiagnostic(inventory(computed),'computed_code_load','scripts/dep-c.mjs'));
 const inert=createSourceFixture(t);
 append(inert,'scripts/dep-c.mjs',"// import './phantom.mjs'\nconst raw=`import './phantom.mjs'`;\nconst quoted='import \\'./phantom.mjs\\'';\n");
 const inertInventory=inventory(inert);
 assert.equal(inertInventory.diagnostics.length,0);
 assert.equal(inertInventory.files.some(item=>item.path.includes('phantom')),false);
});

test('dynamic import concatenation fails closed and escaped literals still resolve',t=>{
 const computed=createSourceFixture(t);
 write(computed,'scripts/dep-e.mjs','export const depE=true;\n');
 append(computed,'scripts/dep-c.mjs',"const suffix='e';\nawait import('./dep-'+suffix+'.mjs');\n");
 assert.ok(hasDiagnostic(inventory(computed),'computed_code_load','scripts/dep-c.mjs'));
 const escaped=createSourceFixture(t);
 write(escaped,'scripts/dep-e.mjs','export const depE=true;\n');
 append(escaped,'scripts/dep-c.mjs',"await import('./dep\\x2de.mjs');\n");
 const result=inventory(escaped);
 assert.equal(result.diagnostics.length,0);
 assert.ok(result.edges.some(edge=>edge.from==='scripts/dep-c.mjs'&&edge.to==='scripts/dep-e.mjs'));
});

test('aliased and namespaced executable launches fail closed without a reviewed occurrence',t=>{
 const sources=[
  "import {spawn as launch} from 'node:child_process';\nlaunch(process.execPath,['./dep-d.mjs']);\n",
  "import * as cp from 'node:child_process';\ncp.spawn(process.execPath,['./dep-d.mjs']);\n"
 ];
 for(const source of sources){
  const fixture=createSourceFixture(t);write(fixture,'scripts/dep-c.mjs',source);
  const result=inventory(fixture);
  assert.ok(hasDiagnostic(result,'unclassified_executable_call','scripts/dep-c.mjs',2));
  assert.equal(result.edges.some(edge=>edge.kind==='reviewed_executable_occurrence'),false);
 }
});

test('a reviewed executable occurrence covers exactly one hash-bound call',t=>{
 const source="import {spawn} from 'node:child_process';\nspawn(process.execPath,['one']);\n";
 const definitions={...fixtureDefinitions,executableOccurrences:[{id:'reviewed_one',kind:'repository_child',from:'scripts/dep-c.mjs',
  sourceToken:"spawn(process.execPath,['one']",sourceSha256:hashText(source),occurrence:0}]};
 const accepted=createSourceFixture(t);write(accepted,'scripts/dep-c.mjs',source);
 const acceptedInventory=inventory(accepted,definitions);
 assert.equal(acceptedInventory.diagnostics.length,0);
 assert.equal(acceptedInventory.edges.filter(edge=>edge.kind==='reviewed_executable_occurrence').length,1);
 const extraSource=source+"spawn(process.execPath,['two']);\n";
 const extraDefinitions={...definitions,executableOccurrences:[{...definitions.executableOccurrences[0],sourceSha256:hashText(extraSource)}]};
 const extra=createSourceFixture(t);write(extra,'scripts/dep-c.mjs',extraSource);
 const extraInventory=inventory(extra,extraDefinitions);
 assert.ok(hasDiagnostic(extraInventory,'unclassified_executable_call','scripts/dep-c.mjs',3));
 assert.equal(extraInventory.edges.filter(edge=>edge.kind==='reviewed_executable_occurrence').length,1);
 const wrongHash={...definitions,executableOccurrences:[{...definitions.executableOccurrences[0],sourceSha256:'0'.repeat(64)}]};
 assert.ok(hasDiagnostic(inventory(accepted,wrongHash),'executable_occurrence_hash_mismatch','scripts/dep-c.mjs'));
 const commentOnly=createSourceFixture(t);write(commentOnly,'scripts/dep-c.mjs',"// spawn(process.execPath,['one'])\n");
 const commentDefinitions={...fixtureDefinitions,executableOccurrences:[{...definitions.executableOccurrences[0],
  sourceSha256:hashText("// spawn(process.execPath,['one'])\n")}]};
 assert.ok(hasDiagnostic(inventory(commentOnly,commentDefinitions),'executable_occurrence_unreviewed','scripts/dep-c.mjs'));
});

test('child and data review records reject tokens that appear only in comments',t=>{
 const source="// new URL('../data/config.json',import.meta.url)\nexport const depC=true;\n";
 const fixture=createSourceFixture(t);write(fixture,'scripts/dep-c.mjs',source);
 const definitions={...fixtureDefinitions,explicitEdges:[{id:'phantom_data',kind:'fixed_repository_data',from:'scripts/dep-c.mjs',to:'data/config.json',
  sourceToken:"new URL('../data/config.json',import.meta.url)",sourceSha256:hashText(source),occurrence:0}]};
 assert.ok(hasDiagnostic(inventory(fixture,definitions),'explicit_edge_source_mismatch','scripts/dep-c.mjs'));
});

test('re-exporting child_process loading fails closed',t=>{
 const fixture=createSourceFixture(t);
 write(fixture,'scripts/dep-c.mjs',"export {spawn} from 'node:child_process';\n");
 assert.ok(hasDiagnostic(inventory(fixture),'unreviewed_executable_export','scripts/dep-c.mjs'));
});

test('UTF-16 offsets keep lines correct after astral characters',t=>{
 const fixture=createSourceFixture(t);
 write(fixture,'scripts/dep-e.mjs','export const depE=true;\n');
 write(fixture,'scripts/dep-c.mjs',"const mark='😀😀😀😀';\nconst text=`${await import('./dep-e.mjs')}`;\n");
 const covered=inventory(fixture);
 assert.ok(covered.edges.some(edge=>edge.from==='scripts/dep-c.mjs'&&edge.to==='scripts/dep-e.mjs'&&edge.line===2));
 const executable=createSourceFixture(t);
 write(executable,'scripts/dep-c.mjs',"const mark='😀😀';\nimport {spawn as launch} from 'node:child_process';\nlaunch(process.execPath,['./dep-d.mjs']);\n");
 assert.ok(hasDiagnostic(inventory(executable),'unclassified_executable_call','scripts/dep-c.mjs',3));
});

test('the no-argument checker reports a bounded verified inventory without absolute paths',()=>{
 const checker=path.resolve('scripts/check-codex-accounted-source.mjs');
 const result=spawnSync(process.execPath,[checker],{cwd:path.resolve('.'),encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
 assert.equal(result.status,0,result.stderr);
 const report=JSON.parse(result.stdout);
 assert.equal(report.status,'repository_source_inventory_verified');
 assert.equal(report.generationEnabled,false);
 assert.equal(report.productionAdmission,false);
 assert.equal(report.credentialsRead,false);
 assert.equal(report.realModelRequests,0);
 assert.equal(report.nativeChildProcessesStarted,0);
 assert.equal(report.authOperationsStarted,0);
 assert.equal(report.userStateDirectoriesCreated,0);
 assert.equal(report.realProviderStatus,'unverified');
 assert.equal(report.externalBinaryStatus,'unverified');
 assert.equal(report.entitlementStatus,'unverified');
 assert.equal(report.diagnostics.length,0);
 assert.ok(report.counts.files>0&&report.counts.edges>0);
 assert.doesNotMatch(result.stdout,/[A-Za-z]:[\\/]/);
});
