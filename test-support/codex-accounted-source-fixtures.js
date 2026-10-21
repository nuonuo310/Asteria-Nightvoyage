// Independent temporary fixture tree; no repository entry is imported or executed.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildManifest,hashText} from '../scripts/codex-accounted-source-inventory.mjs';

export const fixtureDefinitions={
 roots:[
  {id:'fixture_checker',kind:'accounted_checker',path:'scripts/checker.mjs'},
  {id:'fixture_reading',kind:'standalone_reading_projection',path:'scripts/reading.mjs'}
 ],
 explicitEdges:[
  {id:'fixture_data',kind:'fixed_repository_data',from:'scripts/checker.mjs',to:'data/config.json',
   sourceToken:"new URL('../data/config.json',import.meta.url)",reviewNote:'Independent fixed fixture data.'},
  {id:'fixture_child',kind:'reviewed_repository_child_program',from:'scripts/checker.mjs',to:'test-support/child-peer.mjs',
   sourceToken:"new URL('../test-support/child-peer.mjs',import.meta.url)",reviewNote:'Independent local child program.'}
 ],
 fixedInputs:[{path:'package.json',kind:'fixed_repository_config',reviewNote:'Fixture ESM configuration.'}],
 externalPrograms:[],
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
