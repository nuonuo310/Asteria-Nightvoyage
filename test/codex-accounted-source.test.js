import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {buildManifest,verifyInventory} from '../scripts/codex-accounted-source-inventory.mjs';
import {createSourceFixture,rewriteManifest,fixtureDefinitions} from '../test-support/codex-accounted-source-fixtures.js';

const readManifest=fixture=>JSON.parse(fs.readFileSync(fixture.manifestPath,'utf8'));
const verify=fixture=>{
 const manifest=readManifest(fixture);
 return verifyInventory({repoRoot:fixture.root,manifest,manifestHash:fixture.manifestHash,expectedManifestHash:fixture.manifestHash});
};
const codes=result=>new Set(result.diagnostics.map(item=>item.code));
const hasDiagnostic=(result,code,relative)=>result.diagnostics.some(item=>item.code===code&&(!relative||item.path===relative));
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
