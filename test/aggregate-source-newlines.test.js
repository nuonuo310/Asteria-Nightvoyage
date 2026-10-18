import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {aggregateTrialProposal} from '../scripts/aggregate-plan-trial.mjs';
test('actual parser comparison suite accepts LF and CRLF project copies but still rejects edited source',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-source-newlines-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const files=new Set([...Object.keys(aggregateTrialProposal().sourcePins),
  'scripts/offline-aggregate-envelope.mjs','test/offline-aggregate-envelope.test.js',
  'test-support/envelope-event-budget-fixtures.js','test-support/offline-plan-envelope-fixtures.js','test-support/plan-output-shape-cases.js']);
 // A nested node:test child must be its own runner, not inherit the parent's IPC mode.
 const childEnv={...process.env};delete childEnv.NODE_TEST_CONTEXT;
 const run=(directory)=>spawnSync(process.execPath,['--test','test/offline-aggregate-envelope.test.js'],{cwd:directory,env:childEnv,encoding:'utf8',timeout:15000});
 for(const ending of ['lf','crlf']){
  const directory=path.join(root,ending);
  for(const file of files){const out=path.join(directory,file);fs.mkdirSync(path.dirname(out),{recursive:true});const text=fs.readFileSync(new URL('../'+file,import.meta.url),'utf8').replaceAll('\r\n','\n');fs.writeFileSync(out,ending==='crlf'?text.replaceAll('\n','\r\n'):text);}
  const source=fs.readFileSync(path.join(directory,'scripts/offline-aggregate-envelope.mjs'),'utf8');assert.equal(source.includes('\r\n'),ending==='crlf');
  const result=run(directory);assert.equal(result.status,0,(result.stdout+result.stderr).slice(-3000));
  fs.appendFileSync(path.join(directory,'scripts/offline-aggregate-envelope.mjs'),ending==='crlf'?'\r\n// synthetic unreviewed edit\r\n':'\n// synthetic unreviewed edit\n');
  const changed=run(directory);assert.notEqual(changed.status,0);assert.ok(changed.stdout.includes('candidate bound changes no output indices'));
 }
});
