import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {Store} from '../src/store.js';
import {hash} from '../src/contract.js';
import {inlineProtocolVersion} from '../src/inline-evidence-protocol.js';
import {readAppraisalView} from '../src/appraisal-view.js';
import {AppraisalReviewStore} from '../src/appraisal-review-store.js';
import {LocalFileAppraisalReviewAdapter} from '../src/appraisal-review-adapter.js';
import {buildAppraisalReviewDraft,projectAppraisalReviewDraft} from '../src/appraisal-review-memory.js';
import {readContentReview,renderContentReview} from '../src/content-review.js';
import {prepareInlineReviewDream} from '../test-support/inline-review-fixtures.js';
import {reviewActor,reviewRequest} from '../test-support/appraisal-review-fixtures.js';
async function setup(t){const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-inline-review-')),v=await prepareInlineReviewDream(directory);t.after(()=>{v.engine.close();fs.rmSync(directory,{recursive:true,force:true});});return {directory,...v,reviews:new AppraisalReviewStore(v.engine.store,reviewActor),adapter:new LocalFileAppraisalReviewAdapter(v.engine.store,reviewActor)};}
function reopen(t,directory){const store=new Store(directory);t.after(()=>store.close());return {store,reviews:new AppraisalReviewStore(store,reviewActor),adapter:new LocalFileAppraisalReviewAdapter(store,reviewActor)};}
function noBody(directory,needles){for(const file of fs.readdirSync(directory)){const p=path.join(directory,file);if(fs.statSync(p).isFile())for(const n of needles)assert.ok(!fs.readFileSync(p,'utf8').includes(n),file);}}
function child(directory,body){return spawnSync(process.execPath,['--input-type=module','-e',`import fs from 'node:fs';import path from 'node:path';import {Store} from ${JSON.stringify(new URL('../src/store.js',import.meta.url).href)};import {AppraisalReviewStore} from ${JSON.stringify(new URL('../src/appraisal-review-store.js',import.meta.url).href)};import {reviewActor,reviewRequest} from ${JSON.stringify(new URL('../test-support/appraisal-review-fixtures.js',import.meta.url).href)};const directory=${JSON.stringify(directory)},store=new Store(directory);${body}`],{encoding:'utf8',timeout:15000});}

test('inline view exposes copied program audit, distinct declarations and unknown appraisal without changing originals',async t=>{
  const {engine,dreamId,counter}=await setup(t),before=structuredClone(engine.store.state),view=readAppraisalView(engine.store,dreamId);
  assert.equal(view.status,'available');assert.equal(view.protocolVersion,inlineProtocolVersion);assert.equal(view.origin,'dream_appraisal_view');assert.equal(view.isRealityFact,false);assert.equal(view.semanticSupport,'not_assessed');
  assert.deepEqual(view.scenes.map(s=>s.affectDeclaration.kind),['unchanged','estimated']);assert.equal(view.scenes[0].affectChange.status,'not_stated');assert.equal(view.scenes[1].affectChange.status,'model_estimate');
  for(const s of view.scenes){assert.equal(s.affectDeclaration.verification,'shape_only');assert.equal(s.control.value,null);assert.deepEqual(s.inlineEvidenceAudit,before.entries[dreamId].scenes[s.sceneIndex].inlineEvidenceAudit);}
  view.sourceRefs=[];view.scenes[1].inlineEvidenceAudit.suppliedQuotedFields=99;assert.deepEqual(engine.store.state,before);assert.equal(counter.calls,3);
});
test('inline pure draft binds complete canonical chain and cannot certify a numeric magnitude',async t=>{
  const {reviews,dreamId}=await setup(t),context=reviews.context(dreamId),q=reviewRequest(),draft=buildAppraisalReviewDraft(context,q);
  assert.deepEqual(projectAppraisalReviewDraft(context,draft),draft);assert.equal(draft.recordDraft.parent.protocolVersion,inlineProtocolVersion);assert.equal(draft.recordDraft.parent.sceneFingerprint,hash(context.parent.scenes[1]));
  q.assessment.magnitude.valence='established';assert.throws(()=>buildAppraisalReviewDraft(context,q));
  assert.throws(()=>buildAppraisalReviewDraft(context,{...reviewRequest(),sceneIndex:0}));assert.ok(buildAppraisalReviewDraft(context,reviewRequest('unchanged',0)));
  context.parent.scenes[1].inlineEvidenceAudit.internedUniqueQuotes=99;assert.throws(()=>buildAppraisalReviewDraft(context,reviewRequest('earlier',0)));
});
test('inline managed adapter separates attributed reviews, immutable revisions and content; replay adds no generation or billing',async t=>{
  const {engine,adapter,reviews,dreamId,counter,directory}=await setup(t),original=engine.read(dreamId),billing=structuredClone(engine.store.state.billing),q=reviewRequest(),r=adapter.createReview({dreamId,request:q}).review;
  assert.equal(r.origin,'dream_appraisal_review');assert.equal(r.isRealityFact,false);assert.deepEqual(r.sourceRefs,original.sourceRefs);assert.equal(r.parent.protocolVersion,inlineProtocolVersion);
  assert.deepEqual(adapter.createReview({dreamId,request:q}).review,r);const revision=reviewRequest('revision');revision.supersedesReviewId=r.id;revision.assessment.direction.valence='apparent_conflict';reviews.create(dreamId,revision);
  assert.deepEqual(reviews.read(r.id),r);const bundle=adapter.readDreamReviewBundle({dreamId});assert.equal(bundle.reviews.length,2);assert.equal(bundle.dream.wake,undefined);assert.equal(bundle.dream.residue,undefined);assert.equal(adapter.capabilities().asteriaAdapter,'pending');
  const view=readContentReview(engine.store,dreamId),text=renderContentReview(view);assert.equal(view.narrative.wake.origin,'wake_note');assert.equal(view.qualityAssessed,false);assert.equal(view.semanticSupport,'not_assessed');assert.ok(text.indexOf('【先读梦】')<text.indexOf('【再看梦中评价与依据】'));assert.equal(view.reviews.length,2);
  q.assessment.note='caller mutation';bundle.reviews[0].sourceRefs=[];assert.deepEqual(engine.read(dreamId),original);assert.deepEqual(engine.store.state.billing,billing);assert.equal(counter.calls,3);
  engine.close();const back=reopen(t,directory);assert.deepEqual(back.reviews.create(dreamId,reviewRequest()),r);assert.equal(back.reviews.list(dreamId).length,2);assert.deepEqual(back.store.state.billing,billing);
});
for(const field of ['promptCandidateHash','billingProtocolVersion','executionOwner','inlineEvidenceAudit','sceneChain'])test(`inline review rejects tampered ${field} instead of relabeling it`,async t=>{
  const {engine,reviews,dreamId,runId}=await setup(t),r=reviews.create(dreamId,reviewRequest()),run=engine.store.state.runs[runId];
  if(field==='executionOwner')run.executionOwner.family='plain-fake-v1';else if(field==='inlineEvidenceAudit'){run.scenes[1].inlineEvidenceAudit.suppliedQuotedFields=99;engine.store.state.entries[dreamId].scenes=structuredClone(run.scenes);}else if(field==='sceneChain'){run.scenes[1].before.valence=.9;engine.store.state.entries[dreamId].scenes=structuredClone(run.scenes);}else run[field]='wrong';
  assert.throws(()=>readAppraisalView(engine.store,dreamId));assert.throws(()=>reviews.read(r.id));assert.throws(()=>readContentReview(engine.store,dreamId));
});
test('inline reviews reject caller provenance and same request conflict before writing',async t=>{
  const {engine,adapter,reviews,dreamId}=await setup(t),q=reviewRequest(),r=reviews.create(dreamId,q),before=structuredClone(engine.store.state);q.assessment.note='changed';assert.throws(()=>reviews.create(dreamId,q),/review_request_conflict/);
  assert.throws(()=>adapter.createReview({dreamId,request:{...reviewRequest('2'),sourceRefs:[]}}));assert.throws(()=>adapter.createReview({dreamId,request:reviewRequest('3'),reviewer:reviewActor}));assert.deepEqual(engine.store.state,before);assert.ok(reviews.read(r.id));
});
test('deleting only an inline review preserves original and sibling revision across restart',async t=>{
  const {engine,adapter,reviews,dreamId,directory}=await setup(t),original=engine.read(dreamId),billing=structuredClone(engine.store.state.billing),q=reviewRequest(),r=reviews.create(dreamId,q),next=reviewRequest('2');next.supersedesReviewId=r.id;reviews.create(dreamId,next);
  adapter.deleteReview({reviewId:dreamId});assert.deepEqual(engine.read(dreamId),original);adapter.deleteReview({reviewId:r.id});assert.equal(reviews.create(dreamId,q),null);assert.ok(reviews.read(next.id));assert.deepEqual(engine.read(dreamId),original);engine.close();const back=reopen(t,directory);assert.equal(back.reviews.create(dreamId,q),null);assert.ok(back.reviews.read(next.id));assert.deepEqual(back.store.state.billing,billing);
});
for(const operation of ['withdraw','delete'])test(`inline ${operation} removes originals, review descendants and cue cache after restart`,async t=>{
  const {engine,reviews,adapter,dreamId,sourceId,directory}=await setup(t),original=engine.read(dreamId),billing=structuredClone(engine.store.state.billing),q=reviewRequest(),r=reviews.create(dreamId,q);engine.recall(original.scenes[0].event.slice(0,4),'cached-inline-cue');
  if(operation==='withdraw')engine.store.withdraw(sourceId);else engine.deleteEntry(dreamId);
  assert.equal(adapter.readDreamReviewBundle({dreamId}),null);assert.equal(readContentReview(engine.store,dreamId),null);assert.equal(reviews.read(r.id),null);engine.close();const back=reopen(t,directory);assert.equal(back.adapter.readDreamReviewBundle({dreamId}),null);assert.equal(back.reviews.read(r.id),null);assert.throws(()=>back.reviews.create(dreamId,q),/review_parent_unavailable/);assert.deepEqual(back.store.state.billing,billing);noBody(directory,[q.assessment.note,...original.scenes.map(s=>s.event)]);
});
for(const operation of ['withdraw','delete'])test(`inline ${operation} journal wins after actual process death with stale review body`,async t=>{
  const {engine,reviews,dreamId,sourceId,directory}=await setup(t),q=reviewRequest(),r=reviews.create(dreamId,q);engine.close();const result=child(directory,`store.save=()=>{fs.writeFileSync(path.join(directory,'snapshot.tmp'),JSON.stringify({body:${JSON.stringify(q.assessment.note)}}));process.exit(87);};${operation==='withdraw'?`store.withdraw(${JSON.stringify(sourceId)});`:`store.deleteEntry(store.state.entries[${JSON.stringify(dreamId)}]);`}`);assert.equal(result.status,87,result.stderr);
  assert.ok(JSON.parse(fs.readFileSync(path.join(directory,'state.json'))).entries[r.id]);const back=reopen(t,directory);assert.equal(back.reviews.read(r.id),null);assert.equal(readContentReview(back.store,dreamId),null);noBody(directory,[q.assessment.note]);assert.equal(fs.existsSync(path.join(directory,'snapshot.tmp')),false);
});
test('inline review failed atomic save returns no success and no half-index on reopen',async t=>{
  const {engine,reviews,dreamId,directory}=await setup(t),rename=fs.renameSync;fs.renameSync=()=>{throw Error('synthetic-storage-failure');};try{assert.throws(()=>reviews.create(dreamId,reviewRequest()),/storage_io_failure/);}finally{fs.renameSync=rename;}assert.equal(engine.store.poisoned,true);engine.close();const back=reopen(t,directory);assert.equal(back.reviews.read(reviewRequest().id),null);
});
test('four independently fabricated old unknown holds survive inline review, revision, withdrawal and reopen unchanged',async t=>{
  const {prepareCoupledHistory}=await import('../test-support/coupled-trial-fixtures.js'),{prunedV2ReviewedConfig}=await import('../src/pruned-v2-reviewed-profile.js'),{BudgetLedger}=await import('../src/budget-ledger.js');
  const directory=prepareCoupledHistory(t),store=new Store(directory),ledger=new BudgetLedger(store),allowance={...prunedV2ReviewedConfig().allowance,id:'fourth-synthetic-before-inline-review'};
  ledger.approve(allowance);ledger.reserve(allowance.id,{requestId:'fourth-review-history',runId:'fourth-review-history',fingerprint:'c'.repeat(64),sourceRefs:[{id:'q-sparse-memory',version:'1'}],maxOutputTokens:400},allowance.pricing.checkedAt+1000);ledger.dispatch(allowance.id,'fourth-review-history');ledger.unknown(allowance.id,'fourth-review-history');
  const accounts=structuredClone(store.state.billing.accounts),unknowns=Object.values(accounts).flatMap(a=>Object.values(a.attempts)).filter(a=>a.status==='unknown');assert.equal(unknowns.length,4);assert.equal(unknowns.reduce((n,r)=>n+BigInt(r.chargedMicroCny),0n),8812800n);store.close();
  const {engine,dreamId,sourceId}=await prepareInlineReviewDream(directory);t.after(()=>engine.close());const reviews=new AppraisalReviewStore(engine.store,reviewActor),q=reviewRequest(),r=reviews.create(dreamId,q);reviews.create(dreamId,q);const revision=reviewRequest('revision');revision.supersedesReviewId=r.id;reviews.create(dreamId,revision);engine.store.withdraw(sourceId);
  for(const [id,account]of Object.entries(accounts))assert.deepEqual(engine.store.state.billing.accounts[id],account);engine.close();const back=new Store(directory);try{for(const [id,account]of Object.entries(accounts))assert.deepEqual(back.state.billing.accounts[id],account);assert.equal(new AppraisalReviewStore(back,reviewActor).read(r.id),null);}finally{back.close();}
});
test('inline fixed rehearsal reports mechanism only, no key reads or native requests',()=>{
  const r=spawnSync(process.execPath,['scripts/check-inline-review.mjs'],{encoding:'utf8',timeout:15000});assert.equal(r.status,0,r.stderr);const v=JSON.parse(r.stdout);assert.equal(v.stubGenerationCalls,3);assert.equal(v.reviewAdditionalCalls,0);assert.equal(v.nativeRequests,0);assert.equal(v.credentialReads,0);assert.equal(v.withdrawalSurvivesReopen,true);assert.equal(v.qualityAssessed,false);assert.equal(v.liveEntryAvailable,false);
});
