import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fictionalSourceProbeSource,runFictionalSourceProbe} from '../scripts/fictional-source-probe.mjs';

test('fixed fictional source reaches both scenes and wake while the read view keeps distinct layers',async()=>{
  assert.equal(fictionalSourceProbeSource.text,'两个虚构人物曾在雨停后走过一条小街。一个人轻敲杯沿两下，说有件事下次再讲；另一个人保留了一张折过的车票，票面日期后来模糊了。除此之外没有关于两人关系、那件事的内容或后来结局的资料。');
  const receipt=await runFictionalSourceProbe();
  assert.equal(receipt.status,'BOUNDARY_HOLDS_SYNTHETIC_ONLY');assert.equal(receipt.ok,true);
  assert.equal(receipt.requestCapture.count,3);
  assert.deepEqual(receipt.requestCapture.stages,['scene','scene','wake']);
  assert.deepEqual(receipt.requestCapture.indexes,[0,1,2]);
  assert.equal(receipt.requestCapture.sourceInEveryRequest,true);
  assert.equal(receipt.requestCapture.firstHasSource,true);
  assert.equal(receipt.requestCapture.secondHasSourceAndFirstScene,true);
  assert.equal(receipt.requestCapture.wakeHasTwoScenes,true);
  assert.equal(receipt.requestCapture.allSourceRefsMatch,true);
  assert.ok(receipt.requestCapture.requests.every(request=>request.sourceTextSha256===receipt.source.textSha256));
  assert.equal(receipt.view.dreamScenesExact,true);assert.equal(receipt.view.fragmentExact,true);
  assert.equal(receipt.view.feelingExact,true);assert.equal(receipt.view.recollectionExact,true);
  assert.equal(receipt.view.layersDistinct,true);assert.equal(receipt.view.layersOrdered,true);
  assert.equal(receipt.store.stateBytesUnchanged,true);assert.equal(receipt.store.stateSha256Before,receipt.store.stateSha256After);
  assert.equal(receipt.store.storeClosedOnStop,true);assert.equal(receipt.store.temporaryStoreRemoved,true);
  assert.equal(receipt.boundaries.userStoreAccessed,false);assert.equal(receipt.boundaries.keyReads,0);
  assert.equal(receipt.boundaries.networkAttempts,0);assert.equal(receipt.boundaries.realModelRequests,0);
  assert.equal(receipt.judgement.qualityAssessed,false);
  assert.equal(receipt.judgement.sampleResponseRole,'prewritten_fake_values_not_model_works');
});
