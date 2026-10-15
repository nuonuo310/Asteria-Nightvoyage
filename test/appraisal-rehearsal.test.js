import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Nightvoyage } from '../src/engine.js';
import { neutral } from '../src/contract.js';
import { Store } from '../src/store.js';
import { normalizeAppraisalScene, buildAppraisalRehearsalRequest, OfflineAppraisalProvider, AppraisalRehearsal, appraisalProtocolVersion } from '../src/appraisal-rehearsal.js';
import { qualityProposal } from '../src/quality-config.js';

const probes=JSON.parse(fs.readFileSync(new URL('../fixtures/appraisal-probes.json',import.meta.url)));
const seed=JSON.parse(fs.readFileSync(new URL('../fixtures/quality/sparse-context.json',import.meta.url)));
const settings={model:'deepseek-flash'},probe=i=>structuredClone(probes.scenes[i]);
const payload=scenes=>({stage:'scene',index:scenes.length,snapshot:structuredClone(seed),scenes});
const response=data=>({status:200,body:{model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(data)}}],usage:{prompt_tokens:100,completion_tokens:80,total_tokens:180}}});
function simulator(counter,{novelWake=false}={}) {return async request=>{
  counter.calls++;const m=JSON.parse(request.body.messages[1].content);
  return response(m.stage==='wake'?{fragment:novelWake?'A new aftermath outside both scenes.':m.previousScenes.at(-1).event,residue:0.1,associations:[]}:probe(m.sceneIndex));
};}
function directory(t) {const d=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-appraisal-'));t.after(()=>fs.rmSync(d,{recursive:true,force:true}));return d;}
function setup(t,options={}) {
  const d=directory(t),counter={calls:0};const e=new AppraisalRehearsal(d,{...settings,simulator:simulator(counter),...options});
  t.after(()=>e.close());return {d,e,counter};
}
test('ordinary scene may have no goal, no affect movement and explicitly unknown appraisal',()=>{
  const data=probe(0);data.appraisalBasis={origin:'reality',semanticSupport:'verified'};
  const result=normalizeAppraisalScene(data,neutral());assert.equal(result.appraisal.goalEffect,0);assert.deepEqual(result.delta,{valence:0,arousal:0});
  assert.equal(result.appraisalBasis.evidence.goal,null);assert.equal(result.appraisalBasis.evidence.controlExcerpt,null);
  assert.equal(result.appraisalBasis.verification,'literal_excerpt_only');assert.equal(result.appraisalBasis.semanticSupport,'not_assessed');assert.equal(result.appraisalBasis.isRealityFact,false);
});
test('nonzero goal effects need separate bounded goal and outcome excerpts from current scene',()=>{
  for(const index of [1,2]){
    const raw=probe(index),value=normalizeAppraisalScene(raw,neutral());assert.equal(value.appraisal.goalEffect,raw.appraisal.goalEffect);
    for(const change of [p=>p.basis.goal=null,p=>delete p.basis.goal.outcomeExcerpt,p=>p.basis.goal.goalExcerpt='Only in a previous scene',p=>p.basis.goal.outcomeExcerpt='Only in the memory seed']){
      const p=probe(index);change(p);assert.throws(()=>normalizeAppraisalScene(p,neutral()),/goal_requires_evidence|excerpt_not_grounded/);
    }
  }
  const zero=probe(0);zero.basis.goal={goalExcerpt:'一片叶子',outcomeExcerpt:'一片叶子'};assert.throws(()=>normalizeAppraisalScene(zero,neutral()),/neutral_goal/);
});
test('control, uncertainty and affect require quotes or explicitly constrained missing values',()=>{
  for(const change of [p=>p.appraisal.control=0,p=>p.appraisal.uncertainty=1,p=>p.delta.valence=0.1,p=>p.delta.arousal=0.1]){
    const p=probe(0);change(p);assert.throws(()=>normalizeAppraisalScene(p,neutral()),/requires_placeholder|requires_evidence/);
  }
  const independent=normalizeAppraisalScene(probe(3),neutral());assert.equal(independent.appraisal.goalEffect,0);assert.notEqual(independent.delta.arousal,0);
});
test('quote bounds reject whitespace, imagined citations and arbitrary evidence metadata',()=>{
  for(const bad of ['', ' ', 'Not present', '梦'.repeat(161)]){
    const p=probe(1);p.basis.affectExcerpt=bad;assert.throws(()=>normalizeAppraisalScene(p,neutral()),/excerpt_not_grounded/);
  }
  for(const bad of [null,[],{}, {...probe(0).basis,hiddenReasoning:'Do not retain this narrative'}]){
    const p=probe(0);p.basis=bad;assert.throws(()=>normalizeAppraisalScene(p,neutral()),/invalid_appraisal_evidence/);
  }
});
test('literal evidence is not promoted to semantic proof even if quotes are irrelevant',()=>{
  const p=probe(0);p.appraisal.goalEffect=-1;p.basis.goal={goalExcerpt:'一片叶子',outcomeExcerpt:'一片叶子'};
  const value=normalizeAppraisalScene(p,neutral());assert.equal(value.appraisalBasis.semanticSupport,'not_assessed');
  // Deliberately irrelevant quotes satisfy structure only. Human review must reject this claim.
});
test('candidate request stays offline, whitelists normalized channels and preserves earlier protocol pins',()=>{
  const p=payload([]);p.privateConfiguration='PRIVATE-SENTINEL';p.snapshot.channels.affect.value={valence:-1,arousal:1};
  const request=buildAppraisalRehearsalRequest(p,settings),m=JSON.parse(request.body.messages[1].content);
  assert.equal(request.protocolVersion,appraisalProtocolVersion);assert.equal('endpoint' in request,false);assert.equal('headers' in request,false);assert.equal('tools' in request.body,false);assert.equal(request.body.max_tokens,400);
  assert.deepEqual(m.previousAffect,neutral());assert.equal('value' in m.channels.affect,false);assert.ok(!JSON.stringify(request).includes('PRIVATE-SENTINEL'));
  assert.equal(qualityProposal().protocolVersion,'deepseek-chat-json-v2-grounded-wake');assert.equal(qualityProposal().modelEgressApproved,false);
});
test('checkpoint request preserves program-owned evidence and rejects forged verification claims',()=>{
  const first=normalizeAppraisalScene(probe(1),neutral()),p=payload([first]);const request=buildAppraisalRehearsalRequest(p,settings);
  assert.deepEqual(JSON.parse(request.body.messages[1].content).previousScenes[0].appraisalBasis,first.appraisalBasis);
  p.scenes[0].appraisalBasis.semanticSupport='verified';assert.throws(()=>buildAppraisalRehearsalRequest(p,settings),/invalid_appraisal_checkpoint/);
  const q=payload([first]);q.scenes[0].appraisalBasis.evidence.affectExcerpt='Later unsupported words';assert.throws(()=>buildAppraisalRehearsalRequest(q,settings),/excerpt_not_grounded/);
});
test('rehearsal requires an explicit simulator and cannot read credentials or dispatch native fetch',async t=>{
  assert.throws(()=>new OfflineAppraisalProvider(settings),/simulator_required/);
  assert.throws(()=>new OfflineAppraisalProvider({...settings,simulator(){},maxOutputTokens:401}),/invalid_appraisal_settings/);
  let native=0;const old=globalThis.fetch;globalThis.fetch=()=>{native++;throw Error('Native HTTP forbidden');};t.after(()=>{globalThis.fetch=old;});
  const {e,counter}=setup(t),id=e.start('local','local',seed);assert.equal((await e.execute(id)).status,'completed');assert.equal(counter.calls,3);assert.equal(native,0);
});
test('candidate evidence and wake basis persist, reopen, recall and append without overwriting original',async t=>{
  const {d,e,counter}=setup(t),id=e.start('local','local',seed);await e.execute(id);const result=e.result(id);
  assert.equal(result.receipt.status,'completed');assert.equal(result.dream.origin,'dream');assert.equal(result.dream.isRealityFact,false);assert.equal(result.dream.scenes[1].appraisalBasis.verification,'literal_excerpt_only');assert.equal(result.wake.fragmentBasis.sceneIndex,1);
  const original=structuredClone(result.dream);e.append(original.id,'recollection','完全虚构的后来回想。');assert.deepEqual(e.result(id).dream,original);
  assert.equal(e.start('local','local',seed),id);await e.execute(id);assert.equal(counter.calls,3);e.close();
  const next=new AppraisalRehearsal(d,{...settings,simulator:simulator(counter)});assert.deepEqual(next.result(id).dream,original);assert.equal(next.recall('小船','rehearsal-cue')[0].isRealityFact,false);next.close();
});
test('invalid scene evidence fails on its first attempt without an implicit repair call',async t=>{
  let calls=0;const {e}=setup(t,{simulator:async()=>{calls++;const p=probe(0);p.delta.valence=0.2;return response(p);}}),id=e.start('invalid','invalid',seed);
  assert.equal((await e.execute(id)).status,'failed');assert.equal(e.status(id).budget.calls,1);assert.equal(e.status(id).stagesSaved,0);assert.equal(e.result(id).dream,null);assert.equal(calls,1);
});
test('wake still rejects invented aftermath without fourth repair request',async t=>{
  const counter={calls:0},{e}=setup(t,{simulator:simulator(counter,{novelWake:true})}),id=e.start('bad-wake','bad-wake',seed);
  assert.equal((await e.execute(id)).status,'failed');assert.equal(e.status(id).stagesSaved,2);assert.equal(e.result(id).dream,null);assert.equal(counter.calls,3);
});
test('cancellation aborts simulator and ignores late candidate evidence',async t=>{
  let start,deliver,signal;const started=new Promise(resolve=>start=resolve);
  const {e}=setup(t,{simulator:(_,{signal:s})=>{signal=s;start();return new Promise(resolve=>deliver=resolve);}}),id=e.start('cancel','cancel',seed),work=e.execute(id);
  await started;e.cancel(id);assert.equal((await work).status,'cancelled');assert.equal(signal.aborted,true);deliver(response(probe(1)));await new Promise(resolve=>setImmediate(resolve));assert.equal(e.result(id).dream,null);assert.equal(e.status(id).stagesSaved,0);
});
test('withdrawal purges quoted evidence and original bodies through restart and cached recall',async t=>{
  const {d,e,counter}=setup(t),id=e.start('withdraw','withdraw',seed);await e.execute(id);e.recall('小船','withdraw-cue');e.withdraw('q-sparse-memory');e.close();
  const next=new AppraisalRehearsal(d,{...settings,simulator:simulator(counter)});assert.equal(next.result(id).dream,null);assert.deepEqual(next.recall('小船','withdraw-cue'),[]);
  assert.throws(()=>next.start('withdraw','withdraw',seed),/source_withdrawn/);assert.ok(!fs.readFileSync(path.join(d,'state.json'),'utf8').includes('小船'));next.close();
});
test('source withdrawal during simulation suppresses late evidence before any checkpoint',async t=>{
  let start,deliver;const started=new Promise(resolve=>start=resolve);
  const {e}=setup(t,{simulator:()=>{start();return new Promise(resolve=>deliver=resolve);}}),id=e.start('withdraw-live','withdraw-live',seed),work=e.execute(id);
  await started;e.withdraw('q-sparse-memory');assert.equal((await work).status,'revoked');deliver(response(probe(1)));await new Promise(resolve=>setImmediate(resolve));assert.equal(e.result(id).dream,null);assert.equal(e.status(id).stagesSaved,0);
});
test('deletion clears nested evidence while a saved checkpoint can resume without regeneration',async t=>{
  let crash=true;const {d,e,counter}=setup(t,{fault:phase=>{if(phase==='scene_saved'&&crash){crash=false;throw Error('simulated_crash');}}}),id=e.start('checkpoint','checkpoint',seed);
  assert.equal((await e.execute(id)).status,'uncertain');assert.equal(e.status(id).stagesSaved,1);e.close();
  const next=new AppraisalRehearsal(d,{...settings,simulator:simulator(counter)});assert.equal((await next.resume(id,{retryUnknown:true})).status,'completed');assert.equal(counter.calls,3);
  next.deleteEntry(next.result(id).dream.id);assert.equal(next.result(id).dream,null);assert.ok(!fs.readFileSync(path.join(d,'state.json'),'utf8').includes('小船'));next.close();
});
test('candidate refuses executing an existing v2/fake run or sharing its request identity',async t=>{
  const d=directory(t),old=new Nightvoyage(d),id=old.start('old','old',seed);old.close();
  const e=new AppraisalRehearsal(d,{...settings,simulator:simulator({calls:0})});t.after(()=>e.close());
  assert.throws(()=>e.execute(id),/protocol_mismatch/);assert.throws(()=>e.resume(id,{retryUnknown:true}),/protocol_mismatch/);assert.throws(()=>e.start('old','old',seed),/request_conflict/);
});
test('actual process exit preserves candidate basis in a committed checkpoint',async t=>{
  const d=directory(t),counter={calls:0};
  const source=`import fs from 'node:fs';import {AppraisalRehearsal} from './src/appraisal-rehearsal.js';const probes=JSON.parse(fs.readFileSync('fixtures/appraisal-probes.json'));const seed=JSON.parse(fs.readFileSync('fixtures/quality/sparse-context.json'));const e=new AppraisalRehearsal(process.argv[1],{model:'deepseek-flash',simulator:async()=>({status:200,body:{model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(probes.scenes[0])}}],usage:{prompt_tokens:100,completion_tokens:80,total_tokens:180}}}),fault:p=>{if(p==='scene_saved')process.exit(7);}});await e.execute(e.start('process','process',seed));`;
  const child=spawnSync(process.execPath,['--input-type=module','-e',source,d],{cwd:fileURLToPath(new URL('..',import.meta.url)),encoding:'utf8'});assert.equal(child.status,7,child.stderr);
  const e=new AppraisalRehearsal(d,{...settings,simulator:simulator(counter)});t.after(()=>e.close());const id=e.store.state.requests.process.runId;
  assert.equal(e.status(id).status,'uncertain');assert.equal(e.run(id).scenes[0].appraisalBasis.verification,'literal_excerpt_only');
  assert.equal((await e.resume(id,{retryUnknown:true})).status,'completed');assert.equal(counter.calls,2);
});
