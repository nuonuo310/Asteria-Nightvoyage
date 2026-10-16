import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { normalizeCoupledScene, normalizeCoupledCheckpoint, buildCoupledRequest, CoupledAffectRehearsal, OfflineCoupledAffectProvider, coupledAffectVersion } from '../src/coupled-affect-offline.js';
import { normalizeAppraisalScene } from '../src/appraisal-rehearsal.js';
import { compactSceneData, normalizeCompactScene } from '../src/compact-appraisal-protocol.js';
import { GatedDeepSeekClient } from '../src/gated-deepseek-client.js';
import { neutral } from '../src/contract.js';
import { readAppraisalView } from '../src/appraisal-view.js';
import { singleSceneProposal } from '../src/single-scene-diagnostic.js';

const probes=JSON.parse(fs.readFileSync(new URL('../fixtures/appraisal-probes.json',import.meta.url)));
const seed=JSON.parse(fs.readFileSync(new URL('../fixtures/quality/sparse-context.json',import.meta.url)));
const pairs=JSON.parse(fs.readFileSync(new URL('../fixtures/coupled-affect-review.json',import.meta.url))).cases;
const wire=i=>{const value=structuredClone(pairs[i].coupled);value.evidence.push('梦');return value;};
function directory(t){const d=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-v2-test-'));t.after(()=>fs.rmSync(d,{recursive:true,force:true}));return d;}
const response=data=>({status:200,body:{model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(data)}}],usage:{prompt_tokens:100,completion_tokens:80,total_tokens:180}}});
function simulator(counter,mutate=()=>{}){return async request=>{counter.calls++;const m=JSON.parse(request.body.messages[1].content),data=m.stage==='wake'?{fragment:m.previousScenes.at(-1).event.split('。')[0]+'。',residue:0.1,associations:[]}:wire(m.sceneIndex);mutate(data,m);return response(data);};}
function setup(t,options={}){const d=directory(t),counter={calls:0},e=new CoupledAffectRehearsal(d,{model:'deepseek-flash',simulator:simulator(counter),...options});t.after(()=>e.close());return {d,counter,e};}
test('coupled preserves event, numbers and linked evidence while stamping program-owned pruning counts',()=>{
  for(let i=0;i<4;i++){const raw=wire(i),before=structuredClone(raw),expected=normalizeAppraisalScene(probes.scenes[i],neutral()),value=normalizeCoupledScene(raw,neutral());
    assert.equal(value.event,raw.event);assert.deepEqual(value.appraisal,expected.appraisal);assert.deepEqual(value.delta,expected.delta);assert.equal(value.affectDeclaration.kind,raw.affect.kind);assert.deepEqual(value.appraisalBasis.evidence,expected.appraisalBasis.evidence);
    assert.equal(value.appraisalBasis.protocolVersion,coupledAffectVersion);assert.equal(value.appraisalBasis.semanticSupport,'not_assessed');assert.equal(value.normalizationAudit.discardedUnusedQuoteCount,1);
    assert.equal(value.normalizationAudit.receivedQuoteCount,value.normalizationAudit.keptQuoteCount+1);assert.deepEqual(raw,before);assert.throws(()=>normalizeCompactScene(raw,neutral()));
    raw.normalizationAudit={discardedUnusedQuoteCount:99,text:'DUMMY-UNTRUSTED-AUDIT'};assert.throws(()=>normalizeCoupledScene(raw,neutral()),/invalid_coupled_scene_shape/);
  }
});
test('coupled audit is idempotent across checkpoints and rejects forged counts, versions and extra fields',()=>{
  const saved=normalizeCoupledScene(wire(1),neutral());assert.deepEqual(normalizeCoupledCheckpoint(saved,neutral()),saved);
  for(const mutate of [x=>x.normalizationAudit.receivedQuoteCount=6,x=>x.normalizationAudit.keptQuoteCount=0,x=>x.normalizationAudit.discardedUnusedQuoteCount=99,
    x=>x.normalizationAudit.text='extra',x=>x.appraisalBasis.protocolVersion='compact-appraisal-quotes-v1',x=>x.after.valence=1]){
    const changed=structuredClone(saved);mutate(changed);assert.throws(()=>normalizeCoupledCheckpoint(changed,neutral()),/invalid_(compact_v2|coupled)/);}
  const noUnused=structuredClone(pairs[0].coupled);assert.equal(normalizeCoupledScene(noUnused,neutral()).normalizationAudit.discardedUnusedQuoteCount,0);
});
test('coupled never conceals malformed unused quotes and still enforces later missing-basis rules',()=>{
  for(const mutate of [x=>x.evidence.push('not in event'),x=>x.evidence.push('梦'),x=>x.links.control=99,x=>x.links.extra=null,
    x=>{x.event='波'.repeat(65);x.evidence=[x.event];},x=>x.appraisal.goalEffect=-1,x=>x.appraisal.control=0,x=>x.affect={kind:'estimated',delta:{valence:0,arousal:0.1}}]){
    const x=wire(0);mutate(x);assert.throws(()=>normalizeCoupledScene(x,neutral()));}
});
test('coupled request stays bounded and validates distinct checkpoints without changing live source pins',()=>{
  const first=normalizeCoupledScene(wire(0),neutral()),request=buildCoupledRequest({stage:'scene',index:1,snapshot:seed,scenes:[first]},{model:'deepseek-flash'}),m=JSON.parse(request.body.messages[1].content);
  assert.equal(request.protocolVersion,coupledAffectVersion);assert.equal(request.body.max_tokens,400);assert.equal(request.body.stream,false);assert.equal(request.body.thinking.type,'disabled');assert.equal(request.body.tools,undefined);assert.equal(request.headers,undefined);
  assert.deepEqual(m.previousScenes[0].normalizationAudit,first.normalizationAudit);assert.throws(()=>singleSceneProposal(),/compact_protocol_source_changed/);
  first.normalizationAudit.discardedUnusedQuoteCount=99;assert.throws(()=>buildCoupledRequest({stage:'scene',index:1,snapshot:seed,scenes:[first]},{model:'deepseek-flash'}),/invalid_(compact_v2|coupled)/);
  assert.throws(()=>new GatedDeepSeekClient(null,{protocol:coupledAffectVersion}),/unreviewed_transport_protocol/);
});
test('coupled cannot run without explicit local simulator and rejects malformed responses with no repair call',async t=>{
  assert.throws(()=>new OfflineCoupledAffectProvider({model:'deepseek-flash'}),/simulator_required/);
  const counter={calls:0},{e}=setup(t,{simulator:simulator(counter,data=>{if(data.links)data.links.control=99;})}),id=e.start('invalid','invalid',seed);
  assert.equal((await e.execute(id)).status,'failed');assert.equal(counter.calls,1);assert.equal(e.result(id).dream,null);
});
test('coupled full fictional loop persists audit and view, reopens with no replay calls and preserves original during append',async t=>{
  const {d,e,counter}=setup(t),id=e.start('loop','loop',seed);assert.equal(e.run(id).appraisalProtocolVersion,coupledAffectVersion);assert.equal((await e.execute(id)).status,'completed');assert.equal(counter.calls,3);
  const packet=e.result(id),entry=packet.dream.id,original=e.read(entry),view=readAppraisalView(e.store,entry);
  assert.equal(view.protocolVersion,coupledAffectVersion);assert.equal(view.scenes[0].control.value,null);assert.equal(view.scenes[1].control.status,'model_estimate');assert.equal(view.scenes[0].normalizationAudit.discardedUnusedQuoteCount,1);assert.equal(view.isRealityFact,false);
  e.append(entry,'recollection','独立虚构的后来回想。');assert.deepEqual(e.read(entry),original);e.close();
  const reopened=new CoupledAffectRehearsal(d,{model:'deepseek-flash',simulator:simulator(counter)});await reopened.execute(id);assert.equal(counter.calls,3);assert.deepEqual(reopened.read(entry),original);assert.equal(readAppraisalView(reopened.store,entry).status,'available');reopened.close();
});
test('coupled cancellation suppresses late simulator output and wake never invents an aftermath',async t=>{
  let begun,deliver;const started=new Promise(resolve=>begun=resolve),{e}=setup(t,{simulator:()=>{begun();return new Promise(resolve=>deliver=resolve);}}),id=e.start('cancel','cancel',seed),work=e.execute(id);await started;e.cancel(id);assert.equal((await work).status,'cancelled');deliver(response(wire(0)));await new Promise(resolve=>setImmediate(resolve));assert.equal(e.result(id).dream,null);
  const counter={calls:0},bad=setup(t,{simulator:simulator(counter,(data,m)=>{if(m.stage==='wake')data.fragment='从未在梦中发生的后续。';})}),bid=bad.e.start('wake','wake',seed);await bad.e.execute(bid);assert.equal(counter.calls,3);assert.equal(bad.e.result(bid).dream,null);assert.equal(bad.e.status(bid).error,'wake_fragment_not_grounded');
});
test('coupled withdrawal removes scenes, nested audit/evidence, view and recall after reopening',async t=>{
  const {d,e,counter}=setup(t),id=e.start('withdraw','withdraw',seed);await e.execute(id);const packet=e.result(id);assert.equal(e.recall('小船','cue').length,1);e.withdraw('q-sparse-memory');assert.equal(readAppraisalView(e.store,packet.dream.id),null);e.close();
  const reopened=new CoupledAffectRehearsal(d,{model:'deepseek-flash',simulator:simulator(counter)});assert.deepEqual(reopened.recall('小船','cue'),[]);assert.equal(reopened.result(id).dream,null);
  const disk=fs.readFileSync(path.join(d,'state.json'),'utf8');assert.ok(!disk.includes(probes.scenes[1].event));assert.ok(!disk.includes('discardedUnusedQuoteCount'));assert.equal(counter.calls,3);reopened.close();
});
test('coupled rejects cross-version execute/resume and cannot read a tampered audit from a managed dream',async t=>{
  const {e}=setup(t),id=e.start('identity','identity',seed);e.run(id).appraisalProtocolVersion='compact-appraisal-quotes-v1';assert.throws(()=>e.execute(id),/identity_mismatch/);assert.throws(()=>e.resume(id),/identity_mismatch/);e.run(id).appraisalProtocolVersion=coupledAffectVersion;
  await e.execute(id);const packet=e.result(id);e.store.state.entries[packet.dream.id].scenes[0].normalizationAudit.discardedUnusedQuoteCount=99;assert.throws(()=>readAppraisalView(e.store,packet.dream.id),/invalid_appraisal_view_record/);
});
test('coupled actual child exit after scene checkpoint resumes remaining fake stages without regenerating it',async t=>{
  const d=directory(t),script=`import fs from 'node:fs';import {CoupledAffectRehearsal} from './src/coupled-affect-offline.js';const seed=JSON.parse(fs.readFileSync('fixtures/quality/sparse-context.json'));const raw=${JSON.stringify(wire(0))};const e=new CoupledAffectRehearsal(process.argv[1],{model:'deepseek-flash',simulator:async()=>(${JSON.stringify(response(wire(0)))}),fault:p=>{if(p==='scene_saved')process.exit(7);}});await e.execute(e.start('exit','exit',seed));`;
  const child=spawnSync(process.execPath,['--input-type=module','-e',script,d],{cwd:new URL('..',import.meta.url),encoding:'utf8'});assert.equal(child.status,7,child.stderr);
  const counter={calls:0},e=new CoupledAffectRehearsal(d,{model:'deepseek-flash',simulator:simulator(counter)}),id=e.store.state.requests.exit.runId;
  assert.equal(e.run(id).scenes[0].normalizationAudit.discardedUnusedQuoteCount,1);assert.equal((await e.resume(id,{retryUnknown:true})).status,'completed');assert.equal(counter.calls,2);assert.equal(e.status(id).budget.calls,3);e.close();
});
test('coupled save failure cannot publish a dream or partially persisted normalization audit',async t=>{
  const {d,e}=setup(t),id=e.start('io','io',seed),save=e.store.save.bind(e.store);e.store.save=()=>{if(e.run(id).scenes.length)fs.mkdirSync(path.join(d,'snapshot.tmp'));return save();};
  await assert.rejects(e.execute(id));e.close();fs.rmdirSync(path.join(d,'snapshot.tmp'));
  const next=new CoupledAffectRehearsal(d,{model:'deepseek-flash',simulator:simulator({calls:0})});assert.equal(next.status(id).stagesSaved,0);assert.equal(next.result(id).dream,null);next.close();
});
test('coupled offline command reports fake-only persistence, explicit audit counts, no duplicates and withdrawal',()=>{
  const r=spawnSync(process.execPath,['scripts/check-coupled-affect-offline.mjs'],{cwd:new URL('..',import.meta.url),encoding:'utf8'});assert.equal(r.status,0,r.stderr);const p=JSON.parse(r.stdout);
  assert.equal(p.fakeStageCalls,3);assert.equal(p.realModelRequests,0);assert.equal(p.duplicateCalls,0);assert.equal(p.absentControlValue,null);assert.equal(p.withdrawalViewNull,true);assert.equal(p.liveProtocolEnabled,false);assert.equal(p.qualityAssessed,false);
  assert.ok(p.normalizationAudits.every(a=>a.discardedUnusedQuoteCount===1));
});

test('coupled branch declarations cannot be forged or silently change on checkpoint/view reads',async t=>{
  const v=normalizeCoupledScene(wire(0),neutral());assert.equal(v.affectDeclaration.kind,'unchanged');
  for(const change of [x=>x.affectDeclaration.kind='estimated',x=>x.affectDeclaration.extra='ignored',x=>delete x.affectDeclaration,x=>x.delta.arousal=.1]){const r=structuredClone(v);change(r);assert.throws(()=>normalizeCoupledCheckpoint(r,neutral()));}
  const {e}=setup(t),id=e.start('declaration','declaration',seed);await e.execute(id);const view=readAppraisalView(e.store,e.result(id).dream.id);
  assert.equal(view.scenes[0].affectDeclaration.kind,'unchanged');assert.equal(view.scenes[0].affectDeclaration.verification,'shape_only');assert.equal(view.scenes[1].affectDeclaration.kind,'estimated');assert.equal(view.scenes[0].affectChange.value,null);
});
test('coupled request supplies only the paired wire example and validates source/policy before dispatch',()=>{
  const r=buildCoupledRequest({stage:'scene',index:0,snapshot:seed,scenes:[]},{model:'deepseek-flash'}),system=r.body.messages[0].content;
  const examples=system.split('\n').filter(x=>x.startsWith('JSON shape example:'));assert.equal(examples.length,1);const example=JSON.parse(examples[0].slice('JSON shape example: '.length));assert.equal(example.affect.kind,'unchanged');assert.equal(example.delta,undefined);assert.equal(example.links.affect,undefined);assert.ok(!system.includes('Return event, appraisal, delta, evidence and links only.'));
  const real=structuredClone(seed);real.materialKind='real';assert.throws(()=>buildCoupledRequest({stage:'scene',index:0,snapshot:real,scenes:[]},{model:'deepseek-flash'}));
});
test('coupled raw response byte and output token limits reject before publishing or repairing',async t=>{
  for(const make of [()=>{const r=response(wire(0));r.body.usage.completion_tokens=401;r.body.usage.total_tokens=501;return r;},()=>{const r=response(wire(0));r.body.choices[0].message.content=' '.repeat(1201);return r;}]){
    let calls=0;const {e}=setup(t,{simulator:async()=>{calls++;return make();}}),id=e.start('bound','bound',seed);await e.execute(id);assert.equal(calls,1);assert.equal(e.result(id).dream,null);assert.equal(e.status(id).stagesSaved,0);
  }
});
test('coupled cancellation before dispatch and call budget do not create extra stages',async t=>{
  const one=setup(t),id=one.e.start('queued-cancel','queued-cancel',seed);one.e.cancel(id);await one.e.execute(id);assert.equal(one.counter.calls,0);
  const limited=setup(t),lid=limited.e.start('limited','limited',seed,{maxCalls:1});await limited.e.execute(lid);assert.equal(limited.counter.calls,1);assert.equal(limited.e.status(lid).stagesSaved,1);assert.equal(limited.e.result(lid).dream,null);
});
test('coupled withdrawal in flight and deletion remove declaration/evidence/recall bodies',async t=>{
  let begin,deliver;const begun=new Promise(resolve=>begin=resolve),x=setup(t,{simulator:()=>{begin();return new Promise(resolve=>deliver=resolve);}}),id=x.e.start('revoke-flight','revoke-flight',seed),work=x.e.execute(id);
  await begun;x.e.withdraw('q-sparse-memory');assert.equal((await work).status,'revoked');deliver(response(wire(0)));await new Promise(resolve=>setImmediate(resolve));assert.equal(x.e.result(id).dream,null);assert.ok(!fs.readFileSync(path.join(x.d,'state.json'),'utf8').includes('affectDeclaration'));
  const good=setup(t),gid=good.e.start('delete','delete',seed);await good.e.execute(gid);const entry=good.e.result(gid).dream.id;assert.equal(good.e.recall('小船','deleted-cue').length,1);good.e.deleteEntry(entry);assert.equal(readAppraisalView(good.e.store,entry),null);assert.deepEqual(good.e.recall('小船','deleted-cue'),[]);assert.ok(!fs.readFileSync(path.join(good.d,'state.json'),'utf8').includes('affectDeclaration'));
});
test('actual coupled process exit after dispatch reopens uncertain without automatic or unapproved resume calls',async t=>{
  const d=directory(t),script=`import fs from 'node:fs';import {CoupledAffectRehearsal} from './src/coupled-affect-offline.js';const seed=JSON.parse(fs.readFileSync('fixtures/quality/sparse-context.json'));const e=new CoupledAffectRehearsal(process.argv[1],{model:'deepseek-flash',simulator:async()=>{throw Error('forbidden');},fault:p=>{if(p==='dispatched')process.exit(7);}});await e.execute(e.start('dispatch','dispatch',seed));`;
  const child=spawnSync(process.execPath,['--input-type=module','-e',script,d],{cwd:new URL('..',import.meta.url),encoding:'utf8'});assert.equal(child.status,7,child.stderr);
  const counter={calls:0},e=new CoupledAffectRehearsal(d,{model:'deepseek-flash',simulator:simulator(counter)}),id=e.store.state.requests.dispatch.runId;
  assert.equal((await e.execute(id)).status,'uncertain');await assert.rejects(e.resume(id),/ambiguous_attempt/);assert.equal(counter.calls,0);assert.equal(e.status(id).budget.calls,1);assert.equal(e.result(id).dream,null);e.close();
});
test('coupled timeout discards delayed response and cancel after a saved scene prevents wake dispatch',async t=>{
  let deliver;const x=setup(t,{simulator:()=>new Promise(resolve=>deliver=resolve)}),id=x.e.start('timeout','timeout',seed,{timeoutMs:5});await x.e.execute(id);assert.equal(x.e.status(id).error,'timeout');deliver(response(wire(0)));await new Promise(resolve=>setImmediate(resolve));assert.equal(x.e.status(id).stagesSaved,0);assert.equal(x.e.result(id).dream,null);
  const y=setup(t);y.e.fault=p=>{if(p==='scene_saved')y.e.cancel(y.e.store.state.requests['saved-cancel'].runId);};const cid=y.e.start('saved-cancel','saved-cancel',seed),disk=JSON.parse(fs.readFileSync(path.join(y.d,'state.json'))).runs[cid];
  assert.equal(disk.appraisalProtocolVersion,coupledAffectVersion);assert.equal(disk.affectEncodingVersion,'explicit-affect-union-v1');await y.e.execute(cid);assert.equal(y.counter.calls,1);assert.equal(y.e.status(cid).status,'cancelled');assert.equal(y.e.status(cid).stagesSaved,1);assert.equal(y.e.result(cid).dream,null);
});
