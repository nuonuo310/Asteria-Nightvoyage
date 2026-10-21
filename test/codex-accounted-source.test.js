import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {buildInventory,buildManifest,hashText,verifyInventory,verifyReviewedInventory} from '../scripts/codex-accounted-source-inventory.mjs';
import {createSourceFixture,rewriteManifest,fixtureDefinitions,createReviewedFixtureRegistry} from '../test-support/codex-accounted-source-fixtures.js';

const readManifest=fixture=>JSON.parse(fs.readFileSync(fixture.manifestPath,'utf8'));
const verify=fixture=>{
 const manifest=readManifest(fixture);
 return verifyInventory({repoRoot:fixture.root,manifest,manifestHash:fixture.manifestHash,expectedManifestHash:fixture.manifestHash});
};
const review=fixture=>{
 const manifest=buildManifest({repoRoot:fixture.root,definitions:fixtureDefinitions});
 const manifestHash=rewriteManifest(fixture,manifest);
 return verifyInventory({repoRoot:fixture.root,manifest,manifestHash,expectedManifestHash:manifestHash});
};
const registryText=registry=>JSON.stringify(registry,null,2)+'\n';
const registryHash=registry=>hashText(registryText(registry));
const reviewed= (fixture,registry=createReviewedFixtureRegistry(),options={})=>{
 const manifest=options.manifest??buildManifest({repoRoot:fixture.root,definitions:fixtureDefinitions});
 const manifestHash=rewriteManifest(fixture,manifest),actualRegistryHash=registryHash(registry);
 const result=verifyReviewedInventory({repoRoot:fixture.root,manifest,manifestHash,expectedManifestHash:manifestHash,
  registry,registryHash:actualRegistryHash,expectedRegistryHash:options.expectedRegistryHash??actualRegistryHash});
 return {manifest,manifestHash,registryHash:actualRegistryHash,result};
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
 const candidate=verify(fixture);
 assert.equal(candidate.status,'candidate_only');
 assert.equal(candidate.reviewStatus,'candidate_requires_review');
 assert.equal(candidate.admissionVerified,false);
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

test('multiline and comment-separated imports and re-exports are inventoried or refused',t=>{
 const star=createSourceFixture(t);
 write(star,'scripts/dep-x.mjs','export const depX=true;\n');
 write(star,'scripts/dep-c.mjs',"export *\n/* gap */\nfrom './dep-x.mjs';\n");
 const starInventory=inventory(star);
 assert.ok(starInventory.edges.some(edge=>edge.from==='scripts/dep-c.mjs'&&edge.to==='scripts/dep-x.mjs'&&edge.kind==='relative_static_reexport'));
 assert.ok(starInventory.files.some(file=>file.path==='scripts/dep-x.mjs'));
 assert.equal(starInventory.diagnostics.length,0);
 assert.equal(review(star).status,'candidate_only');

 const named=createSourceFixture(t);
 write(named,'scripts/dep-x.mjs','export const depX=true;\n');
 write(named,'scripts/dep-c.mjs',"export {\n depX\n}\n/* gap */ from\n './dep-x.mjs';\n");
 const namedInventory=inventory(named);
 assert.ok(namedInventory.edges.some(edge=>edge.from==='scripts/dep-c.mjs'&&edge.to==='scripts/dep-x.mjs'&&edge.kind==='relative_static_reexport'));
 assert.equal(namedInventory.diagnostics.length,0);
 assert.equal(review(named).status,'candidate_only');

 const imported=createSourceFixture(t);
 write(imported,'scripts/dep-x.mjs','export const depX=true;\n');
 write(imported,'scripts/dep-c.mjs',"import {\n depX\n}\nfrom './dep-x.mjs';\nexport const value=depX;\n");
 const importedInventory=inventory(imported);
 assert.ok(importedInventory.edges.some(edge=>edge.from==='scripts/dep-c.mjs'&&edge.to==='scripts/dep-x.mjs'&&edge.kind==='relative_static_import'));
 assert.equal(importedInventory.diagnostics.length,0);
 assert.equal(review(imported).status,'candidate_only');

 const missing=createSourceFixture(t);
 write(missing,'scripts/dep-c.mjs',"export *\n from './missing.mjs';\n");
 assert.ok(hasDiagnostic(inventory(missing),'source_file_missing','scripts/missing.mjs'));
 assert.equal(review(missing).status,'blocked');
});

test('default, named, namespace, and computed child_process forms fail closed',t=>{
 const cases=[
  ["import cp, {spawn} from 'node:child_process';\ncp.spawn(process.execPath,['./dep-x.mjs']);\n",'unclassified_executable_call',2],
  ["import cp, * as ns from 'node:child_process';\nns.exec(process.execPath);\n",'unclassified_executable_call',2],
  ["import {default as cp} from 'node:child_process';\ncp.execFile('x');\n",'unclassified_executable_call',2],
  ["import {\n spawn as launch\n}\nfrom 'node:child_process';\nlaunch(process.execPath);\n",'unclassified_executable_call',5],
  ["import cp from 'node:child_process';\ncp['spawn'](process.execPath);\n",'unsupported_executable_usage',2]
 ];
 for(const [source,code,line] of cases){
  const fixture=createSourceFixture(t);
  write(fixture,'scripts/dep-x.mjs','export const depX=true;\n');
  write(fixture,'scripts/dep-c.mjs',source);
  const built=inventory(fixture);
  assert.ok(hasDiagnostic(built,code,'scripts/dep-c.mjs',line),`${code}@${line}`);
  assert.equal(review(fixture).status,'blocked');
 }

 const source="import cp, {spawn} from 'node:child_process';\ncp.spawn(process.execPath,['one']);\nspawn(process.execPath,['two']);\n";
 const definitions={...fixtureDefinitions,executableOccurrences:[{id:'reviewed_one',kind:'repository_child',from:'scripts/dep-c.mjs',
  sourceToken:"cp.spawn(process.execPath,['one']",sourceSha256:hashText(source),occurrence:0}]};
 const occurrence=createSourceFixture(t);
 write(occurrence,'scripts/dep-c.mjs',source);
 const occurrenceInventory=inventory(occurrence,definitions);
 assert.equal(occurrenceInventory.edges.filter(edge=>edge.kind==='reviewed_executable_occurrence').length,1);
 assert.ok(hasDiagnostic(occurrenceInventory,'unclassified_executable_call','scripts/dep-c.mjs',3));
});

test('regex literals stay lexical while division, strings, and templates expose following code',t=>{
 const cases=[
  ["const re = /\"/; await import(moduleName); // \"\n",1],
  ["const re = /[//]/; await import(moduleName); //\n",1],
  ["const re = /[/*]/; await import(moduleName); /* \" */\n",1],
  ["if (flag) /[//]/.test(text);\nawait import(moduleName); //\n",2],
  ["if (flag) {}\nconst re = /[//]/;\nawait import(moduleName); //\n",3],
  ["function f() {}\nconst re = /[//]/;\nawait import(moduleName); //\n",3],
  ["function f(){ return /\"/; }\nawait import(moduleName); //\n",2],
  ["const ratio = width / height / 2;\nawait import(moduleName); //\n",2],
  ["const value = call() / 2;\nawait import(moduleName); //\n",2],
  ["const value = list[0] / 2;\nawait import(moduleName); //\n",2],
  ["const url = 'https://example.invalid/a';\nawait import(moduleName); //\n",2],
  ["const text = `await import('./dep-x.mjs')`;\nawait import(moduleName); //\n",2]
 ];
 for(const [source,line] of cases){
  const fixture=createSourceFixture(t);
  write(fixture,'scripts/dep-x.mjs','export const depX=true;\n');
  write(fixture,'scripts/dep-c.mjs',source);
  const built=inventory(fixture);
  assert.ok(hasDiagnostic(built,'computed_code_load','scripts/dep-c.mjs',line),`computed_code_load@${line}`);
  assert.equal(built.edges.some(edge=>edge.from==='scripts/dep-c.mjs'&&edge.to==='scripts/dep-x.mjs'),false);
  assert.equal(review(fixture).status,'blocked');
 }

 const safe=createSourceFixture(t);
 write(safe,'scripts/dep-c.mjs',"const re = /[//]/;\nconst home = process.env['HOME'];\nexport const ok=home;\n");
 const safeInventory=inventory(safe);
 assert.equal(safeInventory.diagnostics.length,0);
 assert.equal(review(safe).status,'candidate_only');
});

test('UTF-16 offsets keep lines correct after astral characters',t=>{
 const fixture=createSourceFixture(t);
 write(fixture,'scripts/dep-e.mjs','export const depE=true;\n');
 write(fixture,'scripts/dep-c.mjs',"const mark='\u{1F600}\u{1F600}\u{1F600}\u{1F600}';\nconst text=`${await import('./dep-e.mjs')}`;\n");
 const covered=inventory(fixture);
 assert.ok(covered.edges.some(edge=>edge.from==='scripts/dep-c.mjs'&&edge.to==='scripts/dep-e.mjs'&&edge.line===2));
 const executable=createSourceFixture(t);
 write(executable,'scripts/dep-c.mjs',"const mark='\u{1F600}\u{1F600}';\nimport {spawn as launch} from 'node:child_process';\nlaunch(process.execPath,['./dep-d.mjs']);\n");
 assert.ok(hasDiagnostic(inventory(executable),'unclassified_executable_call','scripts/dep-c.mjs',3));
});

test('reviewed exact-source registry admits only the explicit fixture closure',t=>{
 const fixture=createSourceFixture(t),{manifest,result}=reviewed(fixture);
 assert.equal(manifest.reviewStatus,'candidate_requires_review');
 assert.equal(result.status,'verified');
 assert.equal(result.reviewMode,'exact_reviewed_source_registry');
 assert.equal(result.counts.files,10);
 assert.equal(result.counts.edges,11);
 assert.equal(result.diagnostics.length,0);
 const crlf=createSourceFixture(t,{crlf:true});
 assert.equal(reviewed(crlf).result.status,'verified');
});

test('reviewed admission blocks a missing target even when the referencing hash is approved',t=>{
 const fixture=createSourceFixture(t),manifest=buildManifest({repoRoot:fixture.root,definitions:fixtureDefinitions});
 fs.rmSync(path.join(fixture.root,'scripts/dep-d.mjs'));
 const {result}=reviewed(fixture,createReviewedFixtureRegistry(),{manifest});
 assert.equal(result.status,'blocked');
 assert.ok(hasDiagnostic(result,'source_file_missing','scripts/dep-d.mjs'));
});

test('division probes cannot be auto-approved by a freshly minted candidate manifest',t=>{
 const sources=[
  "const f = function(){} / 2; await import(moduleName); //\n",
  "const x = obj.return / 2; await import(moduleName); //\n"
 ];
 for(const source of sources){
  const fixture=createSourceFixture(t);
  write(fixture,'scripts/dep-x.mjs','export const depX=true;\n');
  write(fixture,'scripts/dep-c.mjs',source);
  const {manifest,result}=reviewed(fixture);
  assert.equal(manifest.unresolved.length,0);
  assert.equal(manifest.reviewStatus,'candidate_requires_review');
  assert.equal(result.status,'blocked');
  assert.ok(hasDiagnostic(result,'reviewed_source_hash_mismatch','scripts/dep-c.mjs'));
 }
});

test('a reachable source omitted from the reviewed registry blocks admission',t=>{
 const fixture=createSourceFixture(t),source="export {depX} from './dep-x.mjs';\n";
 write(fixture,'scripts/dep-x.mjs','export const depX=true;\n');
 write(fixture,'scripts/dep-c.mjs',source);
 const registry=structuredClone(createReviewedFixtureRegistry()),record=registry.files.find(file=>file.path==='scripts/dep-c.mjs');
 record.sha256=hashText(source);record.bytes=Buffer.byteLength(source);
 record.edges=[{to:'scripts/dep-x.mjs',kind:'relative_static_reexport',importMode:'relative_static_reexport',line:1}];
 const {result}=reviewed(fixture,registry);
 assert.equal(result.status,'blocked');
 assert.ok(hasDiagnostic(result,'reviewed_source_unrecorded','scripts/dep-x.mjs'));
});

test('registry tamper, edge omission, stale edge and owner omission block admission',t=>{
 const fixture=createSourceFixture(t),base=createReviewedFixtureRegistry(),baseHash=registryHash(base);
 const tampered=structuredClone(base);tampered.files.find(file=>file.path==='scripts/checker.mjs').sha256='0'.repeat(64);
 let result=reviewed(fixture,tampered,{expectedRegistryHash:baseHash}).result;
 assert.equal(result.status,'blocked');
 assert.ok(hasDiagnostic(result,'reviewed_registry_hash_mismatch'));
 result=reviewed(fixture,tampered).result;
 assert.equal(result.status,'blocked');
 assert.ok(hasDiagnostic(result,'reviewed_source_hash_mismatch','scripts/checker.mjs'));

 const missing=structuredClone(base),missingChecker=missing.files.find(file=>file.path==='scripts/checker.mjs');
 missingChecker.edges=missingChecker.edges.filter(edge=>edge.to!=='scripts/dep-a.mjs');
 result=reviewed(fixture,missing).result;
 assert.equal(result.status,'blocked');
 assert.ok(hasDiagnostic(result,'reviewed_edge_unrecorded','scripts/checker.mjs',1));

 const stale=structuredClone(base),staleChecker=stale.files.find(file=>file.path==='scripts/checker.mjs');
 staleChecker.edges.push({to:'node:path',kind:'node_builtin',importMode:'relative_static_import',line:7});
 result=reviewed(fixture,stale).result;
 assert.equal(result.status,'blocked');
 assert.ok(hasDiagnostic(result,'reviewed_edge_not_observed','scripts/checker.mjs',7));

 const noOwner=structuredClone(base);delete noOwner.reviewPolicy.reviewOwner;
 result=reviewed(fixture,noOwner).result;
 assert.equal(result.status,'blocked');
 assert.ok(hasDiagnostic(result,'reviewed_registry_owner_missing'));
});

test('the no-argument checker reports a bounded verified inventory without absolute paths',()=>{
 const checker=path.resolve('scripts/check-codex-accounted-source.mjs');
 const result=spawnSync(process.execPath,[checker],{cwd:path.resolve('.'),encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
 assert.equal(result.status,0,result.stderr);
 const report=JSON.parse(result.stdout);
 assert.equal(report.status,'repository_source_inventory_verified');
 assert.equal(report.reviewMode,'exact_reviewed_source_registry');
 assert.equal(report.discoveryReviewStatus,'candidate_requires_review');
 assert.equal(report.reviewedRegistry.path,'docs/proposals/codex-accounted-source-reviewed-registry-v1.json');
 assert.match(report.reviewedRegistry.sha256,/^[0-9a-f]{64}$/);
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
