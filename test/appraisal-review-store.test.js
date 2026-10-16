import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {AppraisalReviewStore} from '../src/appraisal-review-store.js';
import {Store} from '../src/store.js';
import {Nightvoyage} from '../src/engine.js';
import {readAppraisalView} from '../src/appraisal-view.js';
import {coupledTrialPinsMatch} from '../src/coupled-trial-config.js';
import {prepareReviewDream,reviewActor,reviewRequest} from '../test-support/appraisal-review-fixtures.js';
const copy=structuredClone;
async function setup(t){const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-review-store-'));const prepared=await prepareReviewDream(directory);t.after(()=>{prepared.engine.close();fs.rmSync(directory,{recursive:true,force:true});});return {directory,...prepared,reviews:new AppraisalReviewStore(prepared.engine.store,reviewActor)};}
function reopened(t,directory){const store=new Store(directory);t.after(()=>store.close());return {store,reviews:new AppraisalReviewStore(store,reviewActor)};}
const disk=d=>JSON.parse(fs.readFileSync(path.join(d,'state.json'),'utf8'));
function noBody(directory,needles){for(const file of fs.readdirSync(directory)){const p=path.join(directory,file);if(fs.statSync(p).isFile()){const text=fs.readFileSync(p,'utf8');for(const needle of needles)assert.ok(!text.includes(needle),`${file} contains removed body`);}}}
function child(directory,body){const url=p=>pathToFileURL(path.resolve(p)).href;return spawnSync(process.execPath,['--input-type=module','-e',`import fs from 'node:fs';import path from 'node:path';import {Store} from ${JSON.stringify(url('src/store.js'))};import {AppraisalReviewStore} from ${JSON.stringify(url('src/appraisal-review-store.js'))};import {reviewActor,reviewRequest} from ${JSON.stringify(url('test-support/appraisal-review-fixtures.js'))};const directory=${JSON.stringify(directory)};const store=new Store(directory);${body}`],{encoding:'utf8',timeout:15000});}

test('managed reviews atomically persist with same Store, typed provenance and no original/billing changes',async t=>{
  const {engine,reviews,dreamId,directory,counter}=await setup(t),original=engine.read(dreamId),view=readAppraisalView(engine.store,dreamId),billing=copy(engine.store.state.billing),r=reviews.create(dreamId,reviewRequest());
  assert.equal(r.origin,'dream_appraisal_review');assert.equal(r.isRealityFact,false);assert.equal(r.materialKind,'fictional');assert.equal(r.runId,original.runId);assert.deepEqual(r.sourceRefs,original.sourceRefs);assert.deepEqual(reviews.read(r.id),r);assert.deepEqual(reviews.list(dreamId),[r]);assert.deepEqual(engine.read(dreamId),original);assert.deepEqual(readAppraisalView(engine.store,dreamId),view);assert.deepEqual(engine.store.state.billing,billing);assert.equal(counter.calls,3);assert.equal(Object.hasOwn(r,'runtimeSupported'),false);
  engine.close();const next=reopened(t,directory);assert.deepEqual(next.reviews.read(r.id),r);assert.deepEqual(next.store.state.billing,billing);
});
test('same request across owners and reopen replays exactly once; changed payload conflicts',async t=>{
  const {engine,reviews,dreamId,directory}=await setup(t),request=reviewRequest(),r=reviews.create(dreamId,request);assert.deepEqual(reviews.create(dreamId,request),r);assert.deepEqual(new AppraisalReviewStore(engine.store,reviewActor).create(dreamId,request),r);
  engine.close();const next=reopened(t,directory);assert.deepEqual(next.reviews.create(dreamId,request),r);assert.equal(next.reviews.list(dreamId).length,1);request.assessment.note='changed';assert.throws(()=>next.reviews.create(dreamId,request),/review_request_conflict/);
});
test('immutable revisions require same reviewer and exact parent version; parallel reviewers coexist',async t=>{
  const {engine,reviews,dreamId}=await setup(t),r=reviews.create(dreamId,reviewRequest()),next=reviewRequest('2');next.supersedesReviewId=r.id;next.assessment.direction.valence='apparent_conflict';reviews.create(dreamId,next);assert.deepEqual(reviews.read(r.id),r);assert.equal(reviews.list(dreamId).length,2);
  const other=new AppraisalReviewStore(engine.store,{actorId:'other-person',kind:'person'}),third=reviewRequest('3');third.supersedesReviewId=r.id;assert.throws(()=>other.create(dreamId,third),/review_revision_conflict/);third.supersedesReviewId=null;other.create(dreamId,third);assert.equal(reviews.list(dreamId).length,3);assert.equal(reviews.list(dreamId)[2].reviewer.kind,'person');
  const differentScene=reviewRequest('4',0);differentScene.supersedesReviewId=r.id;assert.throws(()=>reviews.create(dreamId,differentScene),/review_revision_conflict/);
});
test('same managed ID cannot overwrite another review or an ordinary entry',async t=>{
  const {reviews,dreamId}=await setup(t),r=reviews.create(dreamId,reviewRequest()),q=reviewRequest('2');q.id=r.id;assert.throws(()=>reviews.create(dreamId,q),/review_id_conflict/);q.id=dreamId;assert.throws(()=>reviews.create(dreamId,q),/review_id_conflict/);
});
test('caller and returned mutations cannot change provenance, reviewer, or original records',async t=>{
  const {engine,reviews,dreamId}=await setup(t),actor={actorId:'mutable-actor',kind:'assistant'},adapter=new AppraisalReviewStore(engine.store,actor);actor.kind='person';const q=reviewRequest(),r=adapter.create(dreamId,q);q.assessment.note='changed';r.sourceRefs=[];r.reviewer.kind='person';const saved=reviews.read(r.id);assert.equal(saved.reviewer.kind,'assistant');assert.ok(saved.sourceRefs.length);assert.notEqual(saved.assessment.note,'changed');const all=reviews.list(dreamId);all[0].assessment.note='changed';assert.notEqual(reviews.read(r.id).assessment.note,'changed');
});
test('unknown fields, private/invalid shape and getters fail before any write',async t=>{
  const {reviews,dreamId,directory}=await setup(t),before=fs.readFileSync(path.join(directory,'state.json'),'utf8');
  for(const change of [q=>q.sourceRefs=[],q=>q.assessment.direction.valence='correct',q=>q.sceneIndex=2,q=>q.id='__proto__',q=>q.supersedesReviewId='missing-review',q=>q.assessment.note='x'.repeat(601)]){const q=reviewRequest();change(q);assert.throws(()=>reviews.create(dreamId,q));}
  const q=reviewRequest();let invoked=0;Object.defineProperty(q,'assessment',{enumerable:true,get(){invoked++;return {};}});assert.throws(()=>reviews.create(dreamId,q));assert.equal(invoked,0);assert.equal(fs.readFileSync(path.join(directory,'state.json'),'utf8'),before);
});
test('actual source withdrawal clears all revisions and notes through base Store and restart',async t=>{
  const {engine,reviews,dreamId,directory,sourceId}=await setup(t),q=reviewRequest(),one=reviews.create(dreamId,q),next=reviewRequest('2');next.assessment.note='fictional-revision-marker';next.supersedesReviewId=one.id;reviews.create(dreamId,next);const event=engine.read(dreamId).scenes[1].event;
  engine.store.withdraw(sourceId);assert.equal(reviews.read(one.id),null);assert.deepEqual(reviews.list(dreamId),[]);assert.throws(()=>reviews.create(dreamId,q),/review_parent_unavailable/);engine.close();const back=reopened(t,directory);assert.equal(back.reviews.read(one.id),null);noBody(directory,[q.assessment.note,next.assessment.note,event]);assert.ok(back.store.state.appraisalReviewIndex.requests[q.requestId]);
});
test('parent dream deletion uses existing generic journal to remove reviews, revisions and notes',async t=>{
  const {engine,reviews,dreamId,directory}=await setup(t),q=reviewRequest(),first=reviews.create(dreamId,q),next=reviewRequest('2');next.supersedesReviewId=first.id;next.assessment.note='unique-fictional-revision';reviews.create(dreamId,next);engine.deleteEntry(dreamId);assert.deepEqual(reviews.list(dreamId),[]);assert.equal(reviews.read(first.id),null);engine.close();const back=reopened(t,directory);assert.equal(back.reviews.read(first.id),null);noBody(directory,[q.assessment.note,next.assessment.note]);
});
test('deleting one review preserves independent sibling revision but its old receipt cannot resurrect it',async t=>{
  const {engine,reviews,dreamId,directory}=await setup(t),q=reviewRequest(),r=reviews.create(dreamId,q),next=reviewRequest('2');next.supersedesReviewId=r.id;const revision=reviews.create(dreamId,next);engine.deleteEntry(r.id);assert.equal(reviews.create(dreamId,q),null);assert.equal(reviews.read(revision.id).supersedesReviewId,r.id);const collision=reviewRequest('3');collision.id=r.id;assert.throws(()=>reviews.create(dreamId,collision),/review_id_conflict/);engine.close();const back=reopened(t,directory);assert.equal(back.reviews.create(dreamId,q),null);assert.ok(back.reviews.read(revision.id));
});
test('review text is neither cue content nor wake, original, residue, or policy state',async t=>{
  const {engine,reviews,dreamId}=await setup(t),original=engine.read(dreamId),q=reviewRequest();q.assessment.note='独立虚构特殊检索词';const r=reviews.create(dreamId,q);assert.deepEqual(engine.recall(q.assessment.note,'review-cue'),[]);assert.deepEqual(engine.read(dreamId),original);assert.equal(engine.list().find(e=>e.id===r.id).origin,'dream_appraisal_review');assert.throws(()=>engine.append(dreamId,'dream_appraisal_review','wrong-channel'),/invalid_append/);
});
test('durable deletion or withdrawal tombstones win over stale in-memory body before a purge',async t=>{
  const {engine,reviews,dreamId}=await setup(t),r=reviews.create(dreamId,reviewRequest());engine.store.deletions.push({entryId:r.id,runId:r.runId,wholeRun:false});assert.equal(reviews.read(r.id),null);engine.store.deletions=[];engine.store.withdrawn.push(r.sourceRefs[0].id);assert.equal(reviews.read(r.id),null);
});
test('malformed canonical chain, mismatched parent/run/source and tampered records fail closed',async t=>{
  const {engine,reviews,dreamId}=await setup(t),r=reviews.create(dreamId,reviewRequest()),parent=copy(engine.store.state.entries[dreamId]),run=copy(engine.store.state.runs[parent.runId]);
  for(const change of [()=>engine.store.state.entries[dreamId].scenes[0].after.valence=.2,()=>engine.store.state.runs[parent.runId].entryId='different',()=>engine.store.state.runs[parent.runId].sourceIds=[],()=>engine.store.state.entries[dreamId].sourceRefs[0].version='2']){change();assert.throws(()=>reviews.read(r.id));engine.store.state.entries[dreamId]=copy(parent);engine.store.state.runs[parent.runId]=copy(run);}
  engine.store.state.entries[r.id].assessment.note='tampered';assert.throws(()=>reviews.read(r.id),/invalid_review_record/);
});
test('invalid or body-carrying receipt metadata is rejected, never returned as review content',async t=>{
  const {engine,reviews,dreamId}=await setup(t),r=reviews.create(dreamId,reviewRequest()),index=copy(engine.store.state.appraisalReviewIndex);
  for(const change of [i=>i.version=2,i=>i.requests[reviewRequest().requestId].body='DUMMY-BODY',i=>i.requests[reviewRequest().requestId].entryId='constructor']){engine.store.state.appraisalReviewIndex=copy(index);change(engine.store.state.appraisalReviewIndex);assert.throws(()=>reviews.read(r.id));}
});
test('closed or poisoned Store and second owners cannot save or return review bodies',async t=>{
  const {engine,reviews,dreamId,directory}=await setup(t),r=reviews.create(dreamId,reviewRequest());assert.throws(()=>new Store(directory),/store_busy/);engine.store.poisoned=true;assert.throws(()=>reviews.read(r.id),/store_unavailable/);assert.throws(()=>reviews.create(dreamId,reviewRequest('2')),/store_unavailable/);engine.close();assert.throws(()=>reviews.read(r.id),/store_unavailable/);
});
test('failed atomic write publishes no in-memory success/half-index; reopen has no review',async t=>{
  const {engine,reviews,dreamId,directory}=await setup(t),rename=fs.renameSync;fs.renameSync=()=>{throw Error('DUMMY-PRIVATE-FAILURE');};try{assert.throws(()=>reviews.create(dreamId,reviewRequest()),/^Error: storage_io_failure$/);}finally{fs.renameSync=rename;}
  assert.equal(engine.store.poisoned,true);assert.equal(engine.store.state.entries[reviewRequest().id],undefined);engine.close();const back=reopened(t,directory);assert.equal(back.reviews.read(reviewRequest().id),null);assert.equal(fs.existsSync(path.join(directory,'snapshot.tmp')),false);
});
test('ambiguous failure after atomic commit cannot duplicate saved review on reopen',async t=>{
  const {engine,reviews,dreamId,directory}=await setup(t),save=engine.store.save.bind(engine.store);engine.store.save=()=>{save();throw Error('DUMMY-AFTER-COMMIT');};assert.throws(()=>reviews.create(dreamId,reviewRequest()),/storage_io_failure/);assert.throws(()=>reviews.read(reviewRequest().id),/store_unavailable/);engine.close();const back=reopened(t,directory);const r=back.reviews.create(dreamId,reviewRequest());assert.equal(r.id,reviewRequest().id);assert.equal(back.reviews.list(dreamId).length,1);
});
for(const point of ['before_review_commit','after_review_commit'])test(`actual process exit at ${point} reopens deterministically without another generation`,async t=>{
  const {engine,dreamId,directory}=await setup(t);engine.close();const run=child(directory,`const reviews=new AppraisalReviewStore(store,reviewActor,{fault:p=>{if(p===${JSON.stringify(point)})process.exit(86);}});reviews.create(${JSON.stringify(dreamId)},reviewRequest());`);assert.equal(run.status,86,run.stderr);const back=reopened(t,directory);assert.equal(Boolean(back.reviews.read(reviewRequest().id)),point==='after_review_commit');back.reviews.create(dreamId,reviewRequest());assert.equal(back.reviews.list(dreamId).length,1);assert.equal(Object.keys(back.store.state.runs).length,1);assert.equal(Object.values(back.store.state.billing.accounts)[0].attempts&&Object.keys(Object.values(back.store.state.billing.accounts)[0].attempts).length,3);
});
for(const operation of ['withdraw','delete'])test(`actual crash after ${operation} journal removes review bodies and abandoned temp on reopen`,async t=>{
  const {engine,reviews,dreamId,directory,sourceId}=await setup(t),q=reviewRequest(),r=reviews.create(dreamId,q);engine.close();const run=child(directory,`store.save=()=>{fs.writeFileSync(path.join(directory,'snapshot.tmp'),JSON.stringify({body:${JSON.stringify(q.assessment.note)}}));process.exit(87);};${operation==='withdraw'?`store.withdraw(${JSON.stringify(sourceId)});`:`store.deleteEntry(store.state.entries[${JSON.stringify(dreamId)}]);`}`);assert.equal(run.status,87,run.stderr);assert.ok(disk(directory).entries[r.id]);const back=reopened(t,directory);assert.equal(back.reviews.read(r.id),null);noBody(directory,[q.assessment.note]);assert.equal(fs.existsSync(path.join(directory,'snapshot.tmp')),false);
});
test('new review layer preserves old completed engine history and all reviewed source pins',async t=>{
  const {engine,reviews,dreamId,directory}=await setup(t),r=reviews.create(dreamId,reviewRequest()),billing=copy(engine.store.state.billing);assert.equal(coupledTrialPinsMatch(),true);engine.close();const legacy=new Nightvoyage(directory);t.after(()=>legacy.close());assert.ok(legacy.read(dreamId));assert.deepEqual(legacy.store.state.billing,billing);legacy.store.withdraw(r.sourceRefs[0].id);assert.equal(legacy.read(r.id),null);
});
for(const operation of ['withdraw','delete'])for(const point of ['before_review_commit','after_review_commit'])test(`${operation} during ${point} cannot publish a stale review body`,async t=>{
  const {engine,dreamId,directory,sourceId}=await setup(t),q=reviewRequest(),reviews=new AppraisalReviewStore(engine.store,reviewActor,{fault:p=>{if(p===point){if(operation==='withdraw')engine.store.withdraw(sourceId);else engine.deleteEntry(dreamId);}}});
  if(point==='before_review_commit')assert.throws(()=>reviews.create(dreamId,q),/review_parent_unavailable/);else assert.equal(reviews.create(dreamId,q),null);
  noBody(directory,[q.assessment.note]);engine.close();const back=reopened(t,directory);assert.equal(back.reviews.read(q.id),null);
});
test('reentrant adapters cannot duplicate or overwrite a pending same-Store write',async t=>{
  const {engine,dreamId}=await setup(t);let blocked=0;const second=new AppraisalReviewStore(engine.store,reviewActor),first=new AppraisalReviewStore(engine.store,reviewActor,{fault:p=>{if(p==='before_review_commit'){assert.throws(()=>second.create(dreamId,reviewRequest('2')),/review_write_busy/);blocked++;}}});first.create(dreamId,reviewRequest());assert.equal(blocked,1);assert.equal(first.list(dreamId).length,1);assert.ok(second.create(dreamId,reviewRequest('2')));
});
test('review receipts have an explicit bounded capacity and retain deletion identity',async t=>{
  const {engine,reviews,dreamId}=await setup(t);reviews.create(dreamId,reviewRequest());const template=copy(engine.store.state.appraisalReviewIndex.requests[reviewRequest().requestId]);for(let i=2;i<=100;i++)engine.store.state.appraisalReviewIndex.requests[`mock-request-${i}`]={...template,entryId:`mock-deleted-${i}`};assert.throws(()=>reviews.create(dreamId,reviewRequest('101')),/review_capacity_reached/);assert.ok(reviews.read(reviewRequest().id));
});
test('three independently fabricated unknown holds survive review save/replay/revision and withdrawal unchanged',async t=>{
  const {prepareCoupledHistory}=await import('../test-support/coupled-trial-fixtures.js');const directory=prepareCoupledHistory(t),{engine,dreamId,sourceId}=await prepareReviewDream(directory);t.after(()=>engine.close());const reviews=new AppraisalReviewStore(engine.store,reviewActor),billing=copy(engine.store.state.billing);const unknowns=Object.values(billing.accounts).flatMap(a=>Object.values(a.attempts)).filter(a=>a.status==='unknown');assert.equal(unknowns.length,3);assert.equal(unknowns.reduce((n,r)=>n+BigInt(r.chargedMicroCny),0n),6609600n);
  const q=reviewRequest(),one=reviews.create(dreamId,q);reviews.create(dreamId,q);const next=reviewRequest('2');next.supersedesReviewId=one.id;reviews.create(dreamId,next);engine.store.withdraw(sourceId);assert.deepEqual(engine.store.state.billing,billing);engine.close();const store=new Store(directory);try{assert.deepEqual(store.state.billing,billing);assert.equal(new AppraisalReviewStore(store,reviewActor).read(one.id),null);}finally{store.close();}
});
test('fixed managed rehearsal uses only simulator calls and checks disk purge and immutable billing',()=>{
  const run=spawnSync(process.execPath,['scripts/check-appraisal-review-store.mjs'],{cwd:new URL('..',import.meta.url),encoding:'utf8',timeout:15000});assert.equal(run.status,0,run.stderr);const r=JSON.parse(run.stdout);assert.equal(r.fakeGenerationCalls,3);assert.equal(r.realModelRequests,0);assert.equal(r.credentialReads,0);assert.equal(r.managedFilesContainNoReviewNotesAfterWithdrawal,true);assert.equal(r.billingUnchanged,true);assert.equal(r.liveSourcePinsUnchanged,true);assert.equal(r.engineAdapterMethodsAvailable,false);
});
