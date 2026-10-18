import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Store} from '../src/store.js';
import {prepareInlineReviewDream} from '../test-support/inline-review-fixtures.js';
import {invokeDreambook,checkDreambookReader} from '../test-support/dreambook-reader-check.js';
import {dreambookCatalog} from '../scripts/dreambook.mjs';
async function setup(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-book-test-')),directory=path.join(root,'book'),ready=await prepareInlineReviewDream(directory);t.after(()=>{ready.engine.close();fs.rmSync(root,{recursive:true,force:true});});return{root,directory,...ready};}
test('dreambook command lists metadata, reads separated original/wake/reviews, and suppresses withdrawn content after reopen',async()=>{
  const result=await checkDreambookReader();assert.equal(result.catalogBodyFree,true);assert.equal(result.originalDreamAndWakeUnchanged,true);assert.equal(result.userStoreAccessed,false);assert.equal(result.qualityAssessed,false);
});
test('help, missing defaults and absent explicit storage never create a new book',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-book-absent-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  assert.equal(invokeDreambook([],{localAppData:root}).status,0);assert.deepEqual(fs.readdirSync(root),[]);
  for(const args of [['list'],['read','--latest'],['list','--data-dir',path.join(root,'absent')]]){
    const child=invokeDreambook(args,{localAppData:root});assert.equal(child.status,1);assert.match(child.stderr,/existing_dreambook_store_required/);assert.equal(child.stdout,'');assert.deepEqual(fs.readdirSync(root),[]);
  }
});
test('default directory resolves the existing local book without using old trial selectors',async t=>{
  const {root,directory,engine,dreamId}=await setup(t);engine.close();
  const data=path.join(root,'local'),target=path.join(data,'Nightvoyage','first-fictional-trial');fs.mkdirSync(path.dirname(target),{recursive:true});fs.renameSync(directory,target);
  const list=invokeDreambook(['list'],{localAppData:data});assert.equal(list.status,0,list.stderr);assert.equal(JSON.parse(list.stdout).dreams[0].id,dreamId);
  const read=invokeDreambook(['read','--latest'],{localAppData:data});assert.equal(read.status,0,read.stderr);assert.match(read.stdout,/【先读梦】/);
});
test('unknown/generation/fee flags, duplicate selectors and relative paths fail before opening an owned Store',async t=>{
  const {directory,engine,dreamId}=await setup(t),before=fs.readFileSync(path.join(directory,'state.json'),'utf8');
  for(const args of [['read'],['run','--live'],['list','--dream-id',dreamId],['read','--latest','--dream-id',dreamId],['read','--latest','--latest'],['read','--latest','--data-dir','.'],['read','--latest','--key','PRIVATE_SENTINEL'],['help','--data-dir',directory]]){
    const r=invokeDreambook(args);assert.equal(r.status,1);assert.equal(r.stdout,'');assert.equal(r.stderr.includes('PRIVATE_SENTINEL'),false);assert.equal(r.stderr.includes(directory),false);
  }
  assert.equal(fs.readFileSync(path.join(directory,'state.json'),'utf8'),before);engine.close();
});
test('newest unsupported dream is not silently replaced by an older readable dream',async t=>{
  const {directory,engine,dreamId}=await setup(t),entry=engine.store.state.entries[dreamId],run=engine.store.state.runs[entry.runId];
  const id='fictional-unsupported-dream',runId='fictional-unsupported-run';
  engine.store.state.entries[id]={...structuredClone(entry),id,runId};engine.store.state.runs[runId]={...structuredClone(run),id:runId,entryId:id,appraisalProtocolVersion:'fictional-unsupported-protocol'};engine.store.save();engine.close();
  const list=invokeDreambook(['list','--data-dir',directory]);assert.equal(list.status,0);assert.equal(JSON.parse(list.stdout).dreams.at(-1).protocolSupported,false);
  const latest=invokeDreambook(['read','--latest','--data-dir',directory]);assert.equal(latest.status,1);assert.match(latest.stderr,/unsupported_review_parent/);assert.equal(latest.stdout,'');
  const explicit=invokeDreambook(['read','--dream-id',dreamId,'--data-dir',directory]);assert.equal(explicit.status,0,explicit.stderr);
});
test('catalog rejects malformed provenance instead of leaking arbitrary body fields',async t=>{
  const {engine,dreamId}=await setup(t);engine.store.state.entries[dreamId].sourceRefs[0].note='PRIVATE_CATALOG_BODY';
  assert.throws(()=>dreambookCatalog(engine.store),/invalid_dreambook_entry/);
});
test('active Store owner blocks reading; corrupt content is sanitized and never emitted',async t=>{
  const {directory,engine,dreamId}=await setup(t);
  const busy=invokeDreambook(['read','--latest','--data-dir',directory]);assert.equal(busy.status,1);assert.match(busy.stderr,/store_busy/);assert.equal(busy.stdout,'');
  engine.store.state.entries[dreamId].wake.fragment='PRIVATE_CORRUPT_WAKE_BODY';engine.store.save();engine.close();
  const bad=invokeDreambook(['read','--latest','--data-dir',directory]);assert.equal(bad.status,1);assert.equal(bad.stdout,'');assert.equal(bad.stderr.includes('PRIVATE_CORRUPT_WAKE_BODY'),false);
});
test('parent deletion leaves no fallback body or independent review entry to select as a dream',async t=>{
  const {directory,engine,dreamId}=await setup(t);engine.deleteEntry(dreamId);engine.close();
  const list=invokeDreambook(['list','--data-dir',directory]);assert.equal(list.status,0);assert.deepEqual(JSON.parse(list.stdout).dreams,[]);
  const read=invokeDreambook(['read','--latest','--data-dir',directory]);assert.equal(read.status,0);assert.match(read.stdout,/当前没有/);
  const store=new Store(directory);try{assert.equal(store.state.entries[dreamId],undefined);}finally{store.close();}
});
