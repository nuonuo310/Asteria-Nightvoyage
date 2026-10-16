import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { neutral } from '../src/contract.js';
import { normalizeAppraisalScene } from '../src/appraisal-rehearsal.js';
import { normalizeCompactScene, normalizeCompactCheckpoint, compactSceneData, buildCompactAppraisalRequest, compactProtocolVersion } from '../src/compact-appraisal-protocol.js';
import { BudgetedNightvoyage } from '../src/budgeted-runtime.js';
import { readAppraisalView } from '../src/appraisal-view.js';
import { qualityProposal } from '../src/quality-config.js';

const probes=JSON.parse(fs.readFileSync(new URL('../fixtures/appraisal-probes.json',import.meta.url)));
const seed=JSON.parse(fs.readFileSync(new URL('../fixtures/quality/sparse-context.json',import.meta.url)));
const wire=i=>compactSceneData(normalizeAppraisalScene(probes.scenes[i],neutral()));
const grant=()=>{const x=structuredClone(seed);x.sources[0].grant.modelEgress=true;return x;};
const allowance=()=>({id:'compact-stub',mode:'stub',approved:true,expiresAt:Date.now()+60000,limits:{maxRuns:1,maxCalls:3,maxMicroCny:1000000},pricing:{model:'deepseek-flash',contextTokenLimit:1000,inputMicroCnyPerMillion:1000000,outputMicroCnyPerMillion:2000000,reference:'https://api-docs.deepseek.com/TEST-ONLY',checkedAt:1}});
function simulator(counter,{invalid=false,badWake=false}={}) {return async(_url,request)=>{
  counter.calls++;const m=JSON.parse(JSON.parse(request.body).messages[1].content),data=m.stage==='wake'?{fragment:badWake?'A novel aftermath outside the saved scenes.':m.previousScenes.at(-1).event,residue:0.1,associations:[]}:wire(m.sceneIndex);
  if (invalid&&m.stage==='scene')data.links.control=99;
  return new Response(JSON.stringify({model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(data)}}],usage:{prompt_tokens:100,completion_tokens:80,total_tokens:180}}));
};}
function directory(t){const d=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-compact-'));t.after(()=>fs.rmSync(d,{recursive:true,force:true}));return d;}
function setup(t,options={}){const d=directory(t),counter={calls:0},config=allowance();const e=new BudgetedNightvoyage(d,{allowance:config,credential:'DUMMY-LOCAL-COMPACT',enabled:true,mode:'stub',protocol:'compact-appraisal-v1',fetchImpl:simulator(counter),...options});t.after(()=>e.close());return {d,e,counter,config};}
test('quote table round-trips existing fictional probes with smaller JSON and shared references',()=>{
  for(const p of probes.scenes){const old=normalizeAppraisalScene(p,neutral()),raw=compactSceneData(old),value=normalizeCompactScene(raw,neutral());
    assert.deepEqual(value.appraisalBasis.evidence,old.appraisalBasis.evidence);assert.equal(value.appraisalBasis.protocolVersion,compactProtocolVersion);assert.equal(value.appraisalBasis.semanticSupport,'not_assessed');
    assert.ok(Buffer.byteLength(JSON.stringify(raw))<Buffer.byteLength(JSON.stringify({event:p.event,appraisal:p.appraisal,delta:p.delta,basis:p.basis})));
  }
  const data=wire(1);assert.equal(data.links.goal[1],data.links.control);assert.equal(new Set(data.evidence).size,data.evidence.length);
});
test('invalid, duplicate, unused and out-of-bounds quote references are rejected',()=>{
  for(const mutate of [x=>x.links.control=99,x=>x.links.control=-1,x=>x.links.control='1',x=>x.links.control=0.5,x=>x.links.goal=[0],x=>x.evidence.push(x.evidence[0]),x=>x.evidence.push('not in event'),x=>x.links.extra=null]){
    const raw=wire(1);mutate(raw);assert.throws(()=>normalizeCompactScene(raw,neutral()),/compact_/);
  }
  const raw=wire(0);raw.evidence=['一片叶子'];assert.throws(()=>normalizeCompactScene(raw,neutral()),/unused_compact/);
});
test('quotes have a 64-codepoint bound, literal grounding and missing-value rules',()=>{
  const raw=wire(0);raw.evidence=['波'.repeat(65)];raw.event=raw.evidence[0];raw.links.control=0;assert.throws(()=>normalizeCompactScene(raw,neutral()),/invalid_compact_evidence/);
  raw.evidence=['😀'.repeat(64)];raw.event=raw.evidence[0];assert.equal(normalizeCompactScene(raw,neutral()).appraisal.control,0.5);
  for(const mutate of [x=>x.appraisal.goalEffect=-1,x=>x.appraisal.control=0,x=>x.appraisal.uncertainty=1,x=>x.delta.arousal=0.1]){const x=wire(0);mutate(x);assert.throws(()=>normalizeCompactScene(x,neutral()),/requires_/);}
});
test('candidate request validates checkpoints, keeps limits and does not change old prompt pin',()=>{
  const first=normalizeCompactScene(wire(0),neutral()),p={stage:'scene',index:1,snapshot:seed,scenes:[first]},request=buildCompactAppraisalRequest(p,{model:'deepseek-flash'});
  assert.equal(request.body.max_tokens,400);assert.equal(request.endpoint,'https://api.deepseek.com/chat/completions');assert.equal('tools' in request.body,false);assert.equal('headers' in request,false);
  assert.equal(qualityProposal().protocolVersion,'deepseek-chat-json-v2-grounded-wake');assert.equal(qualityProposal().modelEgressApproved,false);
  first.appraisalBasis.semanticSupport='verified';assert.throws(()=>buildCompactAppraisalRequest(p,{model:'deepseek-flash'}),/invalid_compact_checkpoint/);
});
test('compact integrated loop atomically persists evidence and charges exactly three simulator calls',async t=>{
  const {e,counter}=setup(t),id=e.start('compact','compact',grant());assert.equal((await e.execute(id)).status,'completed');const result=e.result(id);
  assert.equal(counter.calls,3);assert.equal(result.receipt.billing.length,3);assert.ok(result.receipt.billing.every(r=>r.status==='settled'));assert.equal(e.run(id).billingProtocolVersion,compactProtocolVersion);
  const view=readAppraisalView(e.store,result.dream.id);assert.equal(view.status,'available');assert.equal(view.scenes[0].control.value,null);assert.equal(view.scenes[1].control.status,'model_estimate');assert.equal(view.isRealityFact,false);assert.equal(result.wake.fragmentBasis.sceneIndex,1);
  assert.equal(e.start('compact','compact',grant()),id);await e.execute(id);assert.equal(counter.calls,3);
});
test('compact invalid evidence publishes no body, keeps hold and never repairs after reopen',async t=>{
  const counter={calls:0},{d,e,config}=setup(t,{fetchImpl:simulator(counter,{invalid:true})}),id=e.start('invalid','invalid',grant());
  assert.equal((await e.execute(id)).status,'failed');assert.equal(e.status(id).error,'compact_appraisal_invalid');assert.equal(counter.calls,1);assert.equal(e.result(id).dream,null);assert.equal(e.status(id).billing[0].status,'unknown');e.close();
  const next=new BudgetedNightvoyage(d,{allowance:config,credential:'dummy',enabled:true,mode:'stub',protocol:'compact-appraisal-v1',fetchImpl:simulator(counter)});
  await next.resume(id,{retryUnknown:true});assert.equal(counter.calls,1);assert.equal(next.result(id).dream,null);next.close();
});
test('compact wake has no novel aftermath or fourth repair call',async t=>{
  const counter={calls:0},{e}=setup(t,{fetchImpl:simulator(counter,{badWake:true})}),id=e.start('bad-wake','bad-wake',grant());await e.execute(id);
  assert.equal(counter.calls,3);assert.equal(e.status(id).error,'wake_fragment_not_grounded');assert.equal(e.result(id).dream,null);
});
test('run protocol and allowance cannot switch through execute/resume and protocol is immutable',async t=>{
  const {d,e,config,counter}=setup(t),id=e.start('identity','identity',grant());assert.throws(()=>{e.client.protocol='grounded-wake-v2';},TypeError);e.close();
  const old=new BudgetedNightvoyage(d,{allowance:config,credential:'dummy',enabled:true,mode:'stub',fetchImpl:simulator(counter)});assert.throws(()=>old.execute(id),/identity_mismatch/);assert.throws(()=>old.resume(id,{retryUnknown:true}),/identity_mismatch/);old.close();
  const other=new BudgetedNightvoyage(d,{allowance:{...config,id:'different'},credential:'dummy',enabled:true,mode:'stub',protocol:'compact-appraisal-v1',fetchImpl:simulator(counter)});assert.throws(()=>other.execute(id),/identity_mismatch/);other.close();assert.equal(counter.calls,0);
});
test('default v2 queued runs remain compatible with legacy missing protocol metadata',async t=>{
  const {d,e,config,counter}=setup(t);e.close();const old=new BudgetedNightvoyage(d,{allowance:config,credential:'dummy',enabled:true,mode:'stub',fetchImpl:async(_url,r)=>{
    counter.calls++;const m=JSON.parse(JSON.parse(r.body).messages[1].content),data=m.stage==='wake'?{fragment:m.previousScenes.at(-1).event,residue:0.1,associations:[]}:probes.scenes[0];
    return new Response(JSON.stringify({model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(data)}}],usage:{prompt_tokens:100,completion_tokens:80,total_tokens:180}}));}});
  const id=old.start('legacy','legacy',grant());delete old.run(id).billingProtocolVersion;delete old.run(id).executionOwner;old.store.save();assert.equal((await old.execute(id)).status,'completed');assert.equal(counter.calls,3);old.close();
});
test('compact cancellation ignores late body and withdrawal purges nested evidence and view',async t=>{
  let start,deliver;const begun=new Promise(resolve=>start=resolve);const {e}=setup(t,{fetchImpl:()=>{start();return new Promise(resolve=>deliver=resolve);}}),id=e.start('cancel','cancel',grant()),work=e.execute(id);await begun;e.cancel(id);assert.equal((await work).status,'cancelled');deliver(new Response('{}'));await new Promise(resolve=>setImmediate(resolve));assert.equal(e.result(id).dream,null);
  const next=setup(t),good=next.e.start('good','good',grant());await next.e.execute(good);const entryId=next.e.result(good).dream.id;next.e.withdraw('q-sparse-memory');assert.equal(readAppraisalView(next.e.store,entryId),null);assert.ok(!fs.readFileSync(path.join(next.d,'state.json'),'utf8').includes('小船'));
});
test('compact settlement failure cannot publish evidence or refund an unknown reservation',async t=>{
  const {e,d,config,counter}=setup(t),real=e.client.fetchImpl;e.client.fetchImpl=async(...args)=>{const response=await real(...args);fs.mkdirSync(path.join(d,'snapshot.tmp'));return response;};const id=e.start('io','io',grant());await assert.rejects(e.execute(id));e.close();fs.rmdirSync(path.join(d,'snapshot.tmp'));
  const next=new BudgetedNightvoyage(d,{allowance:config,credential:'dummy',enabled:true,mode:'stub',protocol:'compact-appraisal-v1',fetchImpl:simulator(counter)});assert.equal(next.status(id).stagesSaved,0);assert.equal(next.result(id).dream,null);assert.equal(next.status(id).billing[0].status,'unknown');next.close();
});
test('actual exit after compact scene commit reopens with billing and evidence together',async t=>{
  const d=directory(t),config=allowance();const script=`import fs from 'node:fs';import {BudgetedNightvoyage} from './src/budgeted-runtime.js';import {compactSceneData} from './src/compact-appraisal-protocol.js';import {normalizeAppraisalScene} from './src/appraisal-rehearsal.js';const probes=JSON.parse(fs.readFileSync('fixtures/appraisal-probes.json'));const seed=JSON.parse(fs.readFileSync('fixtures/quality/sparse-context.json'));seed.sources[0].grant.modelEgress=true;const e=new BudgetedNightvoyage(process.argv[1],{allowance:JSON.parse(process.argv[2]),credential:'dummy',enabled:true,mode:'stub',protocol:'compact-appraisal-v1',fetchImpl:async()=>new Response(JSON.stringify({model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(compactSceneData(normalizeAppraisalScene(probes.scenes[0],{valence:0,arousal:0.2})))}}],usage:{prompt_tokens:100,completion_tokens:80,total_tokens:180}})),fault:p=>{if(p==='scene_saved')process.exit(7);}});await e.execute(e.start('process','process',seed));`;
  const child=spawnSync(process.execPath,['--input-type=module','-e',script,d,JSON.stringify(config)],{cwd:new URL('..',import.meta.url),encoding:'utf8'});assert.equal(child.status,7,child.stderr);
  const counter={calls:0},e=new BudgetedNightvoyage(d,{allowance:config,credential:'dummy',enabled:true,mode:'stub',protocol:'compact-appraisal-v1',fetchImpl:simulator(counter)});const id=e.store.state.requests.process.runId;assert.equal(e.status(id).stagesSaved,1);assert.equal(e.status(id).billing[0].status,'settled');assert.equal(e.run(id).scenes[0].appraisalBasis.protocolVersion,compactProtocolVersion);assert.equal((await e.resume(id,{retryUnknown:true})).status,'completed');assert.equal(counter.calls,2);e.close();
});
