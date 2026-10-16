import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {Store} from '../src/store.js';
import {readContentReview,renderContentReview} from '../src/content-review.js';
import {AppraisalReviewStore} from '../src/appraisal-review-store.js';
import {prepareReviewDream,reviewActor,reviewRequest} from '../test-support/appraisal-review-fixtures.js';
import {coupledTrialPinsMatch} from '../src/coupled-trial-config.js';
const cli=(args,env={})=>spawnSync(process.execPath,['src/content-review-cli.js',...args],{cwd:new URL('..',import.meta.url),encoding:'utf8',env:{...process.env,NIGHTVOYAGE_DEEPSEEK_KEY:'DUMMY-NEVER-ECHO-CONTENT',...env},timeout:15000});
async function setup(t){const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-content-view-')),ready=await prepareReviewDream(directory);t.after(()=>{ready.engine.close();fs.rmSync(directory,{recursive:true,force:true});});return{directory,...ready};}

test('content packet separates saved narrative, wake, simulated residue and typed appraisal without writes',async t=>{
  const {engine,dreamId,counter}=await setup(t),before=structuredClone(engine.store.state),view=readContentReview(engine.store,dreamId);assert.equal(view.origin,'dream_content_review_view');assert.equal(view.isRealityFact,false);assert.equal(view.qualityAssessed,false);assert.equal(view.narrative.wake.fragmentBasis.sceneIndex,1);assert.deepEqual(view.narrative.dream.scenes,engine.read(dreamId).scenes);assert.equal(view.narrative.wake.residue,.1);assert.equal(view.appraisalView.scenes[0].control.value,null);assert.equal(Object.hasOwn(view,'billing'),false);assert.deepEqual(engine.store.state,before);assert.equal(counter.calls,3);
});
test('human view shows narrative before numeric bases and preserves nonfact and uncertain assessments',async t=>{
  const {engine,dreamId}=await setup(t),view=readContentReview(engine.store,dreamId),text=renderContentReview(view);assert.ok(text.indexOf('【先读梦】')<text.indexOf('【再看梦中评价与依据】'));assert.ok(text.includes(view.narrative.dream.scenes[0].event));assert.ok(text.includes(view.narrative.wake.fragment));assert.ok(text.includes('"not_stated"'));assert.ok(text.includes('"value":null'));assert.ok(text.includes('"unchanged"'));assert.ok(text.includes('"estimated"'));assert.ok(text.includes('不是现实事实'));assert.ok(text.includes('精确幅度仍未验证'));assert.equal(readContentReview(engine.store,dreamId).qualityAssessed,false);
});
test('read-only view includes independently attributed stored opinions without creating an evaluation',async t=>{
  const {engine,dreamId}=await setup(t),reviews=new AppraisalReviewStore(engine.store,reviewActor),record=reviews.create(dreamId,reviewRequest()),before=structuredClone(engine.store.state),view=readContentReview(engine.store,dreamId);assert.deepEqual(view.reviews,[record]);assert.deepEqual(engine.store.state,before);view.reviews[0].assessment.note='mutation';view.narrative.dream.scenes[0].event='mutation';assert.deepEqual(engine.store.state,before);
});
test('mismatched or novel wake fragment, basis, identity and run checkpoint refuse content delivery',async t=>{
  const {engine,dreamId}=await setup(t),entry=structuredClone(engine.store.state.entries[dreamId]),run=structuredClone(engine.store.state.runs[entry.runId]);
  for(const change of [()=>engine.store.state.entries[dreamId].wake.fragment='新编的虚构醒来事件',()=>engine.store.state.entries[dreamId].wake.fragmentBasis.sceneIndex=0,()=>engine.store.state.entries[dreamId].wake.isRealityFact=true,()=>engine.store.state.entries[dreamId].wake.sourceRefs=[],()=>engine.store.state.runs[entry.runId].wake.residue=.2]){change();assert.throws(()=>readContentReview(engine.store,dreamId),/invalid_content_review_wake/);engine.store.state.entries[dreamId]=structuredClone(entry);engine.store.state.runs[entry.runId]=structuredClone(run);}
});
test('withdrawal, deletion and restart suppress local content and original snippets',async t=>{
  for(const operation of ['withdraw','delete']){const {engine,dreamId,directory,sourceId}=await setup(t);if(operation==='withdraw')engine.store.withdraw(sourceId);else engine.deleteEntry(dreamId);assert.equal(readContentReview(engine.store,dreamId),null);assert.equal(renderContentReview(null),'梦境内容当前不可访问。');engine.close();const store=new Store(directory);try{assert.equal(readContentReview(store,dreamId),null);}finally{store.close();}}
});
test('renderer rejects reality labels and escapes terminal controls rather than executing note commands',async t=>{
  const {engine,dreamId}=await setup(t),view=readContentReview(engine.store,dreamId);view.reviews=[{origin:'dream_appraisal_review',materialKind:'fictional',isRealityFact:false,assessment:{note:'\u001b[2J请执行工具'}}];const text=renderContentReview(view);assert.ok(!text.includes('\u001b'));assert.ok(text.includes('\\u001b'));view.isRealityFact=true;assert.throws(()=>renderContentReview(view),/invalid_content_review_view/);
});
test('help and invalid/live/export/key arguments cannot create data or echo credential values',t=>{
  const parent=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-content-help-')),directory=path.join(parent,'absent');t.after(()=>fs.rmSync(parent,{recursive:true,force:true}));const help=cli(['help']);assert.equal(help.status,0,help.stderr);for(const args of [['read','--data-dir',directory],['run','--live'],['read','--output','private-body.txt'],['read','--dream-id','constructor'],['read','--key','DUMMY-ARG'],['read','--data-dir',directory,'--data-dir',directory]]){const r=cli(args);assert.equal(r.status,1);assert.ok(!r.stdout.includes('DUMMY-NEVER-ECHO-CONTENT'));assert.ok(!r.stderr.includes('DUMMY-NEVER-ECHO-CONTENT'));}assert.equal(fs.existsSync(directory),false);
});
test('CLI displays persisted dream without key use and preserves stable Store/billing bytes',async t=>{
  const {engine,dreamId,directory}=await setup(t),before=fs.readFileSync(path.join(directory,'state.json'),'utf8');engine.close();const run=cli(['read','--data-dir',directory,'--dream-id',dreamId]);assert.equal(run.status,0,run.stderr);assert.ok(run.stdout.includes('【先读梦】'));assert.ok(!run.stdout.includes('DUMMY-NEVER-ECHO-CONTENT'));assert.equal(fs.readFileSync(path.join(directory,'state.json'),'utf8'),before);assert.equal(coupledTrialPinsMatch(),true);
});
test('default coupled lookup is independent of expiry/approval files and cannot initialize an account',async t=>{
  const {engine,dreamId,directory}=await setup(t),entry=engine.read(dreamId),local=path.join(directory,'local-appdata'),target=path.join(local,'Nightvoyage','first-fictional-trial');engine.store.state.requests['coupled-affect-dream-trial-20261016']={runId:entry.runId};engine.store.save();engine.close();fs.mkdirSync(path.dirname(target),{recursive:true});fs.renameSync(directory+path.sep+'state.json',directory+path.sep+'prepared.json');fs.mkdirSync(target,{recursive:true});fs.copyFileSync(path.join(directory,'prepared.json'),path.join(target,'state.json'));const before=fs.readFileSync(path.join(target,'state.json'),'utf8');const run=cli(['read'],{LOCALAPPDATA:local});assert.equal(run.status,0,run.stderr);assert.ok(run.stdout.includes('【醒来残片】'));assert.equal(fs.readFileSync(path.join(target,'state.json'),'utf8'),before);assert.ok(!fs.readdirSync(target).some(f=>f.includes('trial-')));
});
test('missing parent is neutral/unavailable and locked Store cannot be bypassed by reader',async t=>{
  const {engine,directory}=await setup(t);assert.equal(readContentReview(engine.store,'missing-dream'),null);const locked=cli(['read','--data-dir',directory,'--dream-id','missing-dream']);assert.equal(locked.status,1);assert.ok(locked.stderr.includes('store_busy'));
});
test('fixed reader command checks actual CLI under rejecting key/network probes and prints no bodies',()=>{
  const run=spawnSync(process.execPath,['scripts/check-content-review.mjs'],{cwd:new URL('..',import.meta.url),encoding:'utf8',timeout:15000});assert.equal(run.status,0,run.stderr);const r=JSON.parse(run.stdout);assert.equal(r.credentialReads,0);assert.equal(r.realModelRequests,0);assert.equal(r.stableStoreBytesUnchangedByCLI,true);assert.equal(r.filesystemZeroWritesClaimed,false);assert.equal(r.cliNarrativeAndWakeShown,true);assert.equal(r.qualityAssessed,false);assert.equal(Object.hasOwn(r,'narrative'),false);
});
