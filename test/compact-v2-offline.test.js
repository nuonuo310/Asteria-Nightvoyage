import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { normalizeCompactV2Scene, normalizeCompactV2Checkpoint, buildCompactV2Request, CompactV2Rehearsal, OfflineCompactV2Provider, compactV2Version } from '../src/compact-v2-offline.js';
import { normalizeAppraisalScene } from '../src/appraisal-rehearsal.js';
import { compactSceneData, normalizeCompactScene } from '../src/compact-appraisal-protocol.js';
import { GatedDeepSeekClient } from '../src/gated-deepseek-client.js';
import { neutral } from '../src/contract.js';
import { readAppraisalView } from '../src/appraisal-view.js';
import { singleSceneProposal } from '../src/single-scene-diagnostic.js';

const probes=JSON.parse(fs.readFileSync(new URL('../fixtures/appraisal-probes.json',import.meta.url)));
const seed=JSON.parse(fs.readFileSync(new URL('../fixtures/quality/sparse-context.json',import.meta.url)));
const wire=i=>{const value=compactSceneData(normalizeAppraisalScene(probes.scenes[i],neutral()));value.evidence.push('梦');return value;};
function directory(t){const d=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-v2-test-'));t.after(()=>fs.rmSync(d,{recursive:true,force:true}));return d;}
const response=data=>({status:200,body:{model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(data)}}],usage:{prompt_tokens:100,completion_tokens:80,total_tokens:180}}});
function simulator(counter,mutate=()=>{}){return async request=>{counter.calls++;const m=JSON.parse(request.body.messages[1].content),data=m.stage==='wake'?{fragment:m.previousScenes.at(-1).event.split('。')[0]+'。',residue:0.1,associations:[]}:wire(m.sceneIndex);mutate(data,m);return response(data);};}
function setup(t,options={}){const d=directory(t),counter={calls:0},e=new CompactV2Rehearsal(d,{model:'deepseek-flash',simulator:simulator(counter),...options});t.after(()=>e.close());return {d,counter,e};}
test('v2 preserves event, numbers and linked evidence while stamping program-owned pruning counts',()=>{
  for(let i=0;i<4;i++){const raw=wire(i),before=structuredClone(raw),expected=normalizeAppraisalScene(probes.scenes[i],neutral()),value=normalizeCompactV2Scene(raw,neutral());
    assert.equal(value.event,raw.event);assert.deepEqual(value.appraisal,expected.appraisal);assert.deepEqual(value.delta,expected.delta);assert.deepEqual(value.appraisalBasis.evidence,expected.appraisalBasis.evidence);
    assert.equal(value.appraisalBasis.protocolVersion,compactV2Version);assert.equal(value.appraisalBasis.semanticSupport,'not_assessed');assert.equal(value.normalizationAudit.discardedUnusedQuoteCount,1);
    assert.equal(value.normalizationAudit.receivedQuoteCount,value.normalizationAudit.keptQuoteCount+1);assert.deepEqual(raw,before);assert.throws(()=>normalizeCompactScene(raw,neutral()),/unused/);
    raw.normalizationAudit={discardedUnusedQuoteCount:99,text:'DUMMY-UNTRUSTED-AUDIT'};assert.deepEqual(normalizeCompactV2Scene(raw,neutral()),value);
  }
});
test('v2 audit is idempotent across checkpoints and rejects forged counts, versions and extra fields',()=>{
  const saved=normalizeCompactV2Scene(wire(1),neutral());assert.deepEqual(normalizeCompactV2Checkpoint(saved,neutral()),saved);
  for(const mutate of [x=>x.normalizationAudit.receivedQuoteCount=6,x=>x.normalizationAudit.keptQuoteCount=0,x=>x.normalizationAudit.discardedUnusedQuoteCount=99,
    x=>x.normalizationAudit.text='extra',x=>x.appraisalBasis.protocolVersion='compact-appraisal-quotes-v1',x=>x.after.valence=1]){
    const changed=structuredClone(saved);mutate(changed);assert.throws(()=>normalizeCompactV2Checkpoint(changed,neutral()),/invalid_compact_v2/);}
  const noUnused=compactSceneData(normalizeAppraisalScene(probes.scenes[0],neutral()));assert.equal(normalizeCompactV2Scene(noUnused,neutral()).normalizationAudit.discardedUnusedQuoteCount,0);
});
test('v2 never conceals malformed unused quotes and still enforces later missing-basis rules',()=>{
  for(const mutate of [x=>x.evidence.push('not in event'),x=>x.evidence.push('梦'),x=>x.links.control=99,x=>x.links.extra=null,
    x=>{x.event='波'.repeat(65);x.evidence=[x.event];},x=>x.appraisal.goalEffect=-1,x=>x.appraisal.control=0,x=>x.delta.arousal=0.1]){
    const x=wire(0);mutate(x);assert.throws(()=>normalizeCompactV2Scene(x,neutral()));}
});
test('v2 request stays bounded and validates distinct checkpoints without changing live source pins',()=>{
  const first=normalizeCompactV2Scene(wire(0),neutral()),request=buildCompactV2Request({stage:'scene',index:1,snapshot:seed,scenes:[first]},{model:'deepseek-flash'}),m=JSON.parse(request.body.messages[1].content);
  assert.equal(request.protocolVersion,compactV2Version);assert.equal(request.body.max_tokens,400);assert.equal(request.body.stream,false);assert.equal(request.body.thinking.type,'disabled');assert.equal(request.body.tools,undefined);assert.equal(request.headers,undefined);
  assert.deepEqual(m.previousScenes[0].normalizationAudit,first.normalizationAudit);assert.equal(singleSceneProposal().protocolVersion,'compact-appraisal-quotes-v1');
  first.normalizationAudit.discardedUnusedQuoteCount=99;assert.throws(()=>buildCompactV2Request({stage:'scene',index:1,snapshot:seed,scenes:[first]},{model:'deepseek-flash'}),/invalid_compact_v2/);
  assert.throws(()=>new GatedDeepSeekClient(null,{protocol:'compact-appraisal-v2-unreviewed'}),/unreviewed_transport_protocol/);
});
test('v2 cannot run without explicit local simulator and rejects malformed responses with no repair call',async t=>{
  assert.throws(()=>new OfflineCompactV2Provider({model:'deepseek-flash'}),/simulator_required/);
  const counter={calls:0},{e}=setup(t,{simulator:simulator(counter,data=>{if(data.links)data.links.control=99;})}),id=e.start('invalid','invalid',seed);
  assert.equal((await e.execute(id)).status,'failed');assert.equal(counter.calls,1);assert.equal(e.result(id).dream,null);
});
test('v2 full fictional loop persists audit and view, reopens with no replay calls and preserves original during append',async t=>{
  const {d,e,counter}=setup(t),id=e.start('loop','loop',seed);assert.equal(e.run(id).appraisalProtocolVersion,compactV2Version);assert.equal((await e.execute(id)).status,'completed');assert.equal(counter.calls,3);
  const packet=e.result(id),entry=packet.dream.id,original=e.read(entry),view=readAppraisalView(e.store,entry);
  assert.equal(view.protocolVersion,compactV2Version);assert.equal(view.scenes[0].control.value,null);assert.equal(view.scenes[1].control.status,'model_estimate');assert.equal(view.scenes[0].normalizationAudit.discardedUnusedQuoteCount,1);assert.equal(view.isRealityFact,false);
  e.append(entry,'recollection','独立虚构的后来回想。');assert.deepEqual(e.read(entry),original);e.close();
  const reopened=new CompactV2Rehearsal(d,{model:'deepseek-flash',simulator:simulator(counter)});await reopened.execute(id);assert.equal(counter.calls,3);assert.deepEqual(reopened.read(entry),original);assert.equal(readAppraisalView(reopened.store,entry).status,'available');reopened.close();
});
test('v2 cancellation suppresses late simulator output and wake never invents an aftermath',async t=>{
  let begun,deliver;const started=new Promise(resolve=>begun=resolve),{e}=setup(t,{simulator:()=>{begun();return new Promise(resolve=>deliver=resolve);}}),id=e.start('cancel','cancel',seed),work=e.execute(id);await started;e.cancel(id);assert.equal((await work).status,'cancelled');deliver(response(wire(0)));await new Promise(resolve=>setImmediate(resolve));assert.equal(e.result(id).dream,null);
  const counter={calls:0},bad=setup(t,{simulator:simulator(counter,(data,m)=>{if(m.stage==='wake')data.fragment='从未在梦中发生的后续。';})}),bid=bad.e.start('wake','wake',seed);await bad.e.execute(bid);assert.equal(counter.calls,3);assert.equal(bad.e.result(bid).dream,null);assert.equal(bad.e.status(bid).error,'wake_fragment_not_grounded');
});
test('v2 withdrawal removes scenes, nested audit/evidence, view and recall after reopening',async t=>{
  const {d,e,counter}=setup(t),id=e.start('withdraw','withdraw',seed);await e.execute(id);const packet=e.result(id);assert.equal(e.recall('小船','cue').length,1);e.withdraw('q-sparse-memory');assert.equal(readAppraisalView(e.store,packet.dream.id),null);e.close();
  const reopened=new CompactV2Rehearsal(d,{model:'deepseek-flash',simulator:simulator(counter)});assert.deepEqual(reopened.recall('小船','cue'),[]);assert.equal(reopened.result(id).dream,null);
  const disk=fs.readFileSync(path.join(d,'state.json'),'utf8');assert.ok(!disk.includes(probes.scenes[1].event));assert.ok(!disk.includes('discardedUnusedQuoteCount'));assert.equal(counter.calls,3);reopened.close();
});
test('v2 rejects cross-version execute/resume and cannot read a tampered audit from a managed dream',async t=>{
  const {e}=setup(t),id=e.start('identity','identity',seed);e.run(id).appraisalProtocolVersion='compact-appraisal-quotes-v1';assert.throws(()=>e.execute(id),/identity_mismatch/);assert.throws(()=>e.resume(id),/identity_mismatch/);e.run(id).appraisalProtocolVersion=compactV2Version;
  await e.execute(id);const packet=e.result(id);e.store.state.entries[packet.dream.id].scenes[0].normalizationAudit.discardedUnusedQuoteCount=99;assert.throws(()=>readAppraisalView(e.store,packet.dream.id),/invalid_appraisal_view_record/);
});
test('v2 actual child exit after scene checkpoint resumes remaining fake stages without regenerating it',async t=>{
  const d=directory(t),script=`import fs from 'node:fs';import {CompactV2Rehearsal} from './src/compact-v2-offline.js';const seed=JSON.parse(fs.readFileSync('fixtures/quality/sparse-context.json'));const raw=${JSON.stringify(wire(0))};const e=new CompactV2Rehearsal(process.argv[1],{model:'deepseek-flash',simulator:async()=>(${JSON.stringify(response(wire(0)))}),fault:p=>{if(p==='scene_saved')process.exit(7);}});await e.execute(e.start('exit','exit',seed));`;
  const child=spawnSync(process.execPath,['--input-type=module','-e',script,d],{cwd:new URL('..',import.meta.url),encoding:'utf8'});assert.equal(child.status,7,child.stderr);
  const counter={calls:0},e=new CompactV2Rehearsal(d,{model:'deepseek-flash',simulator:simulator(counter)}),id=e.store.state.requests.exit.runId;
  assert.equal(e.run(id).scenes[0].normalizationAudit.discardedUnusedQuoteCount,1);assert.equal((await e.resume(id,{retryUnknown:true})).status,'completed');assert.equal(counter.calls,2);assert.equal(e.status(id).budget.calls,3);e.close();
});
test('v2 save failure cannot publish a dream or partially persisted normalization audit',async t=>{
  const {d,e}=setup(t),id=e.start('io','io',seed),save=e.store.save.bind(e.store);e.store.save=()=>{if(e.run(id).scenes.length)fs.mkdirSync(path.join(d,'snapshot.tmp'));return save();};
  await assert.rejects(e.execute(id));e.close();fs.rmdirSync(path.join(d,'snapshot.tmp'));
  const next=new CompactV2Rehearsal(d,{model:'deepseek-flash',simulator:simulator({calls:0})});assert.equal(next.status(id).stagesSaved,0);assert.equal(next.result(id).dream,null);next.close();
});
test('v2 offline command reports fake-only persistence, explicit audit counts, no duplicates and withdrawal',()=>{
  const r=spawnSync(process.execPath,['scripts/check-compact-v2-offline.mjs'],{cwd:new URL('..',import.meta.url),encoding:'utf8'});assert.equal(r.status,0,r.stderr);const p=JSON.parse(r.stdout);
  assert.equal(p.fakeStageCalls,3);assert.equal(p.realModelRequests,0);assert.equal(p.duplicateCalls,0);assert.equal(p.absentControlValue,null);assert.equal(p.withdrawalViewNull,true);assert.equal(p.liveProtocolEnabled,false);assert.equal(p.qualityAssessed,false);
  assert.ok(p.normalizationAudits.every(a=>a.discardedUnusedQuoteCount===1));
});
