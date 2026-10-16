// Fixed fictional managed rehearsal; local simulator only, never a live trial.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {Store} from '../src/store.js';
import {AppraisalReviewStore} from '../src/appraisal-review-store.js';
import {coupledTrialPinsMatch} from '../src/coupled-trial-config.js';
import {prepareReviewDream,reviewActor,reviewRequest} from '../test-support/appraisal-review-fixtures.js';
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-review-rehearsal-'));
const oldFetch=globalThis.fetch,oldEnv=process.env;let nativeRequests=0,keyReads=0,engine,store;
globalThis.fetch=()=>{nativeRequests++;throw Error('offline_only');};
process.env=new Proxy(oldEnv,{get(t,k){if(k==='NIGHTVOYAGE_DEEPSEEK_KEY'){keyReads++;throw Error('credential_forbidden');}return Reflect.get(t,k);}});
try {
  const ready=await prepareReviewDream(directory);engine=ready.engine;
  const {dreamId,sourceId,counter}=ready,original=engine.read(dreamId),billing=structuredClone(engine.store.state.billing),reviews=new AppraisalReviewStore(engine.store,reviewActor);
  const request=reviewRequest(),first=reviews.create(dreamId,request);assert.deepEqual(reviews.create(dreamId,request),first);
  const next=reviewRequest('2');next.supersedesReviewId=first.id;next.assessment.note='独立虚构修订备注。';reviews.create(dreamId,next);
  assert.deepEqual(engine.read(dreamId),original);assert.deepEqual(engine.store.state.billing,billing);engine.close();
  store=new Store(directory);let reopened=new AppraisalReviewStore(store,reviewActor);assert.equal(reopened.list(dreamId).length,2);assert.deepEqual(reopened.create(dreamId,request),first);
  store.withdraw(sourceId);assert.equal(reopened.read(first.id),null);store.close();store=new Store(directory);reopened=new AppraisalReviewStore(store,reviewActor);assert.deepEqual(reopened.list(dreamId),[]);assert.deepEqual(store.state.billing,billing);
  for(const filename of fs.readdirSync(directory)){const file=path.join(directory,filename);if(fs.statSync(file).isFile()){const text=fs.readFileSync(file,'utf8');assert.ok(!text.includes(request.assessment.note));assert.ok(!text.includes(next.assessment.note));}}
  assert.equal(counter.calls,3);assert.equal(nativeRequests,0);assert.equal(keyReads,0);assert.equal(coupledTrialPinsMatch(),false);
  console.log(JSON.stringify({command:'node scripts/check-appraisal-review-store.mjs',node:process.version,platform:process.platform,stage:'B_managed_storage',fakeGenerationCalls:counter.calls,realModelRequests:nativeRequests,credentialReads:keyReads,managedRecords:2,reopened:true,duplicateReviewWrites:0,originalUnchanged:true,billingUnchanged:true,revisionPreservesOriginal:true,withdrawalAfterReopenNull:true,managedFilesContainNoReviewNotesAfterWithdrawal:true,liveSourcePinsUnchanged:coupledTrialPinsMatch(),engineAdapterMethodsAvailable:false,semanticSupport:'not_assessed',qualityAssessed:false},null,2));
} finally {store?.close();engine?.close();globalThis.fetch=oldFetch;process.env=oldEnv;fs.rmSync(directory,{recursive:true,force:true});}
