import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {config} from '../src/contract.js';
import {GeneratedWakeRehearsal} from '../src/generated-wake-runtime.js';
import {generatedWakeFixture} from '../fixtures/generated-wake-offline.js';

const root=fileURLToPath(new URL('..',import.meta.url));
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');

test('the closeout manifest records fixed provenance, R10 facts and non-blocking boundaries',()=>{
  const manifest=read('docs/v1-closure/NIGHTVOYAGE-V1-CLOSEOUT.md');
  for(const value of [
    'b640f7f3942fd7b7742e936a41d787ac15af8f03',
    '249d38ab6eb65aeab3207771062b0e51b962bd4d',
    'nv-dream-climate-one-dream-r10-a',
    'e6eb5e63050a12fa2eb8c3fe36347a97da98d78055038a0467cfce4e8042e6d6',
    '4/4 settled',
    '16924 micro-CNY',
    'Unknown hold | 0',
    'Structured scene affect remained neutral/unchanged',
    'Memory/Mind integration',
    'Natural later recollection',
    'Dynamic dream climate',
    'Fuller structured affect semantics'
  ])assert.ok(manifest.includes(value),value);
  assert.match(manifest,/not a provider invoice or provider billing confirmation/);
  assert.match(manifest,/R10 body text and real Store are not copied into this repository/);
  assert.match(manifest,/synthetic fixture in this branch is not presented as the R10 result/);
  assert.match(manifest,/No R11 was started/);
});

test('the closeout manifest names both firstFeeling surfaces without claiming a shared journal',()=>{
  const manifest=read('docs/v1-closure/NIGHTVOYAGE-V1-CLOSEOUT.md');
  assert.match(manifest,/generated runtime writes the automatic generated-wake form/);
  assert.match(manifest,/explicit recorder remains a separate caller-requested capability/);
  assert.match(manifest,/is not used by the generated runtime/);
  assert.match(manifest,/wakeFirstFeeling/);
  assert.match(manifest,/generatedWakeJournal/);
});

test('excluded #105, #107 and R1-R10 artifacts are absent from the candidate tree',()=>{
  for(const relative of [
    'scripts/fictional-source-probe.mjs',
    'scripts/nv-rich-fictional-dream-sample-01',
    'scripts/nv-dream-climate-offline-01',
    'scripts/nv-dream-climate-offline-01/phase-b',
    'scripts/nv-dream-climate-offline-01/single-run-r4',
    'scripts/nv-dream-climate-offline-01/single-run-r6',
    'scripts/nv-dream-climate-offline-01/single-run-r8',
    'scripts/nv-dream-climate-offline-01/single-run-r10',
    'docs/validation/dream-climate-live-r10.md',
    'docs/validation/dream-climate-offline-v1.md',
    'docs/examples/dream-climate-offline-v1.md'
  ])assert.equal(fs.existsSync(path.join(root,relative)),false,relative);
  const leaked=fs.readdirSync(path.join(root,'docs','validation')).filter(name=>
    /^dream-climate-(?:live|offline)-r\d+/.test(name));
  assert.deepEqual(leaked,[]);
  assert.equal(fs.existsSync(path.join(root,'owner.lock')),false);
});

test('the shared config stays at its base bound while the generated runtime carries the closeout bound locally',t=>{
  assert.throws(()=>config({scenes:3}),/invalid_config/);
  assert.throws(()=>config({maxCalls:4}),/invalid_config/);
  assert.equal(config().scenes,2);
  assert.equal(config().maxCalls,3);

  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-closeout-bound-'));
  let engine;
  try{
    engine=new GeneratedWakeRehearsal(directory,{allowance:structuredClone(generatedWakeFixture.allowance),
      simulator:()=>{throw Error('synthetic simulator must not run');},enabled:false});
    const id=engine.start('closeout-bound','closeout-bound',structuredClone(generatedWakeFixture.snapshot));
    const run=engine.run(id);
    assert.equal(run.config.scenes,3);
    assert.equal(run.config.maxCalls,4);
  }finally{
    engine?.close();
    fs.rmSync(directory,{recursive:true,force:true});
  }
});
