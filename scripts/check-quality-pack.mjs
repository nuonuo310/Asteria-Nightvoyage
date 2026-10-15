// Offline fixture admission and fake-loop check; no live provider or credential access.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { snapshot } from '../src/contract.js';
import { FileSnapshotAdapter } from '../src/adapters.js';
import { Nightvoyage } from '../src/engine.js';
const root=fileURLToPath(new URL('..',import.meta.url));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'fixtures/quality/manifest.json'),'utf8'));
assert.equal(manifest.modelEgressApproved,false);
assert.equal(manifest.paidEvaluationApproved,false);
const seen=new Set(),results=[];
for(const item of manifest.cases){
  const file=path.join(root,'fixtures/quality',item.snapshot),input=JSON.parse(fs.readFileSync(file,'utf8'));
  assert.equal(input.materialKind,'fictional');assert.ok(!seen.has(input.id));seen.add(input.id);
  assert.ok(input.sources.every(s=>s.grant.modelEgress===false));
  const normalized=snapshot(input);assert.deepEqual(new FileSnapshotAdapter().read(file),normalized);
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-quality-offline-'));
  let engine;
  try {
    engine=new Nightvoyage(directory);const id=engine.start('offline-pack','offline-pack',input);await engine.execute(id);
    const result=engine.result(id);assert.equal(result.receipt.status,'completed');assert.equal(result.receipt.budget.calls,3);
    assert.equal(result.dream.materialKind,'fictional');assert.equal(result.dream.origin,'dream');assert.equal(result.dream.isRealityFact,false);
    assert.deepEqual(result.dream.sourceRefs,normalized.sources.map(s=>({id:s.id,version:s.version})));
    assert.deepEqual(result.dream.scenes[0].before,normalized.channels.affect.value??{valence:0,arousal:0.2});
    engine.close();engine=new Nightvoyage(directory);assert.equal(engine.result(id).receipt.status,'completed');
    results.push({caseId:item.id,contractAccepted:true,fileAdapterMatches:true,allSourcesNoEgress:true,fakeLoopCompleted:true,fakeCalls:3,reopened:true,qualityAssessed:false});
  } finally {engine?.close();fs.rmSync(directory,{recursive:true,force:true});}
}
console.log(JSON.stringify({command:'node scripts/check-quality-pack.mjs',node:process.version,platform:process.platform,cases:results.length,fakeCalls:results.length*3,realModelRequests:0,qualityAssessed:false,results},null,2));
