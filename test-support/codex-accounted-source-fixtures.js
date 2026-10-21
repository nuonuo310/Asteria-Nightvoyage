// Independent temporary fixture tree; no repository entry is imported or executed.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildManifest,hashText,hashPolicy,inventoryVersion,reviewedRegistryVersion} from '../scripts/codex-accounted-source-inventory.mjs';

export const fixtureDefinitions={
 roots:[
  {id:'fixture_checker',kind:'accounted_checker',path:'scripts/checker.mjs'},
  {id:'fixture_reading',kind:'standalone_reading_projection',path:'scripts/reading.mjs'}
 ],
 explicitEdges:[
  {id:'fixture_data',kind:'fixed_repository_data',from:'scripts/checker.mjs',to:'data/config.json',
   sourceToken:"new URL('../data/config.json',import.meta.url)",sourceSha256:'44953cf976a27cff456855d09f98f4eb4733b73f1e6c6496769cb86a783baa37',occurrence:0,
   reviewNote:'Independent fixed fixture data.'},
  {id:'fixture_child',kind:'reviewed_repository_child_program',from:'scripts/checker.mjs',to:'test-support/child-peer.mjs',
   sourceToken:"new URL('../test-support/child-peer.mjs',import.meta.url)",sourceSha256:'44953cf976a27cff456855d09f98f4eb4733b73f1e6c6496769cb86a783baa37',occurrence:0,
   reviewNote:'Independent local child program.'}
 ],
 fixedInputs:[{path:'package.json',kind:'fixed_repository_config',reviewNote:'Fixture ESM configuration.'}],
 externalPrograms:[],
 executableOccurrences:[],
 runtimeInputs:[{id:'node_runtime',kind:'node_platform',requirement:'Node.js >=24',verifiedByInventory:false}],
 exclusions:['No external executable or generated state is part of this fixture.'],
 authority:{envelope:'fixture',commit:'fixture'}
};

const fixtureFiles={
 'package.json':'{"name":"source-admission-fixture","private":true,"type":"module"}\n',
 'scripts/checker.mjs':"import {depA} from './dep-a.mjs';\nimport fs from 'node:fs';\nexport {depC} from './dep-c.mjs';\nconst data=new URL('../data/config.json',import.meta.url);\nconst peer=new URL('../test-support/child-peer.mjs',import.meta.url);\nconst dynamic=await import('./dep-d.mjs');\n",
 'scripts/reading.mjs':"import './dep-a.mjs';\nexport const reading=true;\n",
 'scripts/dep-a.mjs':"import './dep-b.mjs';\nexport {depC} from './dep-c.mjs';\nexport const depA=true;\n",
 'scripts/dep-b.mjs':"import './dep-a.mjs';\nexport const depB=true;\n",
 'scripts/dep-c.mjs':'export const depC=true;\n',
 'scripts/dep-d.mjs':'export const depD=true;\n',
 'test-support/child-peer.mjs':"import '../src/child-dep.js';\nexport const peer=true;\n",
 'src/child-dep.js':'export const child=true;\n',
 'data/config.json':'{"fictional":true}\n'
};

const fixtureReviewOwner={identity:'fixture-reviewer',kind:'exact_source_hash_review'};
const fixtureRoles={
 'package.json':['fixed_repository_config'],
 'data/config.json':['fixed_repository_data'],
 'scripts/checker.mjs':['root:accounted_checker'],
 'scripts/reading.mjs':['root:standalone_reading_projection'],
 'scripts/dep-a.mjs':['relative_static_import'],
 'scripts/dep-b.mjs':['relative_static_import'],
 'scripts/dep-c.mjs':['relative_static_import'],
 'scripts/dep-d.mjs':['relative_static_import'],
 'test-support/child-peer.mjs':['reviewed_repository_child_program'],
 'src/child-dep.js':['relative_static_import']
};
const fixtureEdges={
 'scripts/checker.mjs':[
  {to:'scripts/dep-a.mjs',kind:'relative_static_import',importMode:'relative_static_import',line:1},
  {to:'node:fs',kind:'node_builtin',importMode:'relative_static_import',line:2},
  {to:'scripts/dep-c.mjs',kind:'relative_static_reexport',importMode:'relative_static_reexport',line:3},
  {to:'data/config.json',kind:'fixed_repository_data',line:4,edgeId:'fixture_data',reviewNote:'Independent fixed fixture data.'},
  {to:'test-support/child-peer.mjs',kind:'reviewed_repository_child_program',line:5,edgeId:'fixture_child',reviewNote:'Independent local child program.'},
  {to:'scripts/dep-d.mjs',kind:'literal_dynamic_import',importMode:'literal_dynamic_import',line:6}
 ],
 'scripts/dep-a.mjs':[
  {to:'scripts/dep-b.mjs',kind:'relative_static_import',importMode:'relative_static_import',line:1},
  {to:'scripts/dep-c.mjs',kind:'relative_static_reexport',importMode:'relative_static_reexport',line:2}
 ],
 'scripts/dep-b.mjs':[{to:'scripts/dep-a.mjs',kind:'relative_static_import',importMode:'relative_static_import',line:1}],
 'scripts/reading.mjs':[{to:'scripts/dep-a.mjs',kind:'relative_static_import',importMode:'relative_static_import',line:1}],
 'test-support/child-peer.mjs':[{to:'src/child-dep.js',kind:'relative_static_import',importMode:'relative_static_import',line:1}]
};

export function createReviewedFixtureRegistry(){
 const files=Object.entries(fixtureFiles).map(([relative,source])=>({path:relative,kind:/\.(?:js|mjs)$/.test(relative)?'source':'fixed_data',
  roles:fixtureRoles[relative],bytes:Buffer.byteLength(source),hashPolicy,sha256:hashText(source),reviewOwner:fixtureReviewOwner,
  edges:fixtureEdges[relative]??[]}));
 const byPath=new Map(files.map(file=>[file.path,file]));
 return {registryVersion:reviewedRegistryVersion,inventoryVersion,status:'reviewed_exact_source_registry',hashPolicy,
  authority:fixtureDefinitions.authority,
  reviewPolicy:{mode:'exact_normalized_source_hash_and_explicit_edges',discoveryRole:'non_authoritative_candidate_only',
   reviewOwner:fixtureReviewOwner,note:'Fixture-only explicit review registry; not human acceptance.'},
  roots:fixtureDefinitions.roots.map(root=>({...root,sha256:byPath.get(root.path).sha256})),
  fixedInputs:fixtureDefinitions.fixedInputs.map(input=>({...input,sha256:byPath.get(input.path).sha256})),
  explicitEdges:fixtureDefinitions.explicitEdges,executableOccurrences:[],externalPrograms:[],
  runtimeInputs:fixtureDefinitions.runtimeInputs,exclusions:fixtureDefinitions.exclusions,files,unresolved:[]};
}

export function createSourceFixture(t,{crlf=false,reverse=false}={}){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-source-admission-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const entries=Object.entries(fixtureFiles),order=reverse?[...entries].reverse():entries;
 for(const [relative,source] of order){
  const file=path.join(root,relative);fs.mkdirSync(path.dirname(file),{recursive:true});
  const text=crlf&&/\.(?:js|mjs|json)$/.test(relative)?source.replace(/\n/g,'\r\n'):source;
  fs.writeFileSync(file,text);
 }
 const manifest=buildManifest({repoRoot:root,definitions:fixtureDefinitions});
 const manifestText=JSON.stringify(manifest,null,2)+'\n',manifestPath=path.join(root,'manifest.json');
 fs.writeFileSync(manifestPath,manifestText);
 return {root,manifest,manifestPath,manifestHash:hashText(manifestText)};
}

export function rewriteManifest(fixture,value){
 const text=JSON.stringify(value,null,2)+'\n';fs.writeFileSync(fixture.manifestPath,text);return hashText(text);
}
