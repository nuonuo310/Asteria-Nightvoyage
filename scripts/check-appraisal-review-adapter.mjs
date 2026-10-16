// Public fictional end-to-end adapter example. Temporary external Store, no live access.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {Store} from '../src/store.js';
import {LocalFileAppraisalReviewAdapter} from '../src/appraisal-review-adapter.js';
import {coupledTrialPinsMatch} from '../src/coupled-trial-config.js';
import {prepareReviewDream,reviewActor,reviewRequest} from '../test-support/appraisal-review-fixtures.js';
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-review-contract-'));
const env=process.env,fetch=globalThis.fetch;let calls=0,keyReads=0,engine,store;
globalThis.fetch=()=>{calls++;throw Error('native_fetch_forbidden');};
process.env=new Proxy(env,{get(t,k){if(k==='NIGHTVOYAGE_DEEPSEEK_KEY'){keyReads++;throw Error('credential_forbidden');}return Reflect.get(t,k);}});
try {
  const ready=await prepareReviewDream(directory);engine=ready.engine;const {dreamId,sourceId,counter}=ready;
  const adapter=new LocalFileAppraisalReviewAdapter(engine.store,reviewActor),original=engine.read(dreamId),billing=structuredClone(engine.store.state.billing);
  const input={dreamId,request:reviewRequest()},first=adapter.createReview(input);assert.deepEqual(adapter.createReview(input),first);
  const bundle=adapter.readDreamReviewBundle({dreamId});assert.equal(bundle.reviews.length,1);assert.equal(bundle.reviews[0].origin,'dream_appraisal_review');assert.equal(bundle.dream.origin,'dream');assert.equal(bundle.appraisalView.origin,'dream_appraisal_view');assert.equal(bundle.isRealityFact,false);assert.deepEqual(engine.read(dreamId),original);assert.deepEqual(engine.store.state.billing,billing);
  const cap=adapter.capabilities();engine.close();store=new Store(directory);const next=new LocalFileAppraisalReviewAdapter(store,reviewActor);assert.deepEqual(next.readReview({reviewId:first.review.id}),first);store.withdraw(sourceId);assert.equal(next.readDreamReviewBundle({dreamId}),null);assert.deepEqual(next.listReviews({dreamId}).reviews,[]);assert.equal(next.readReview({reviewId:first.review.id}).review,null);assert.deepEqual(store.state.billing,billing);
  assert.equal(calls,0);assert.equal(keyReads,0);assert.equal(coupledTrialPinsMatch(),false);
  console.log(JSON.stringify({command:'node scripts/check-appraisal-review-adapter.mjs',node:process.version,platform:process.platform,contractVersion:cap.contractVersion,adapter:cap.adapter,asteriaAdapter:cap.asteriaAdapter,fakeGenerationCalls:counter.calls,realModelRequests:calls,credentialReads:keyReads,typedOutputsSeparate:true,originalUnchanged:true,billingUnchanged:true,reopened:true,duplicateReviewWrites:0,withdrawalSuppressesAllViews:true,liveSourcePinsUnchanged:coupledTrialPinsMatch(),qualityAssessed:false,semanticSupport:'not_assessed'},null,2));
}finally{store?.close();engine?.close();globalThis.fetch=fetch;process.env=env;fs.rmSync(directory,{recursive:true,force:true});}
