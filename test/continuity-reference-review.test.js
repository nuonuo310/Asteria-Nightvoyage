import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {referenceProbes,checkContinuityReferences} from '../scripts/check-continuity-references.mjs';
for(const [id,,expected] of referenceProbes)test(`fictional reference counterexample: ${id}`,()=>{const result=checkContinuityReferences().results.find(x=>x.id===id);assert.equal(result.actual,expected);assert.equal(result.scriptedOnly,true);});
test('reference command returns aggregate evidence only, no credentials, HTTP, Store or diagnosis of discarded body',()=>{
  const r=spawnSync(process.execPath,['scripts/check-continuity-references.mjs'],{cwd:new URL('..',import.meta.url),encoding:'utf8'});assert.equal(r.status,0,r.stderr);const v=JSON.parse(r.stdout);assert.equal(v.scriptedCases,11);assert.equal(v.firstSceneBodyMatchesBaseline,true);assert.equal(v.currentTrialPinsMatch,true);assert.equal(v.realModelRequests,0);assert.equal(v.credentialReads,0);assert.equal(v.storeOpened,false);assert.equal(v.liveFailureSpecificReference,'unknown');assert.equal(v.discardedLiveResponseAvailable,false);assert.equal(v.qualityAssessed,false);assert.ok(!r.stdout.includes('梦里的人望着桌边的纸片'));
});
