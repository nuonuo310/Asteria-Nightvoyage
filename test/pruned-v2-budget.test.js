import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { BudgetedNightvoyage } from '../src/budgeted-runtime.js';
import { BudgetLedger, validateAllowance } from '../src/budget-ledger.js';
import { GatedDeepSeekClient } from '../src/gated-deepseek-client.js';
import { Store } from '../src/store.js';
import { normalizeAppraisalScene } from '../src/appraisal-rehearsal.js';
import { compactSceneData } from '../src/compact-appraisal-protocol.js';
import { normalizePrunedV2Scene, normalizePrunedV2Checkpoint, buildPrunedV2Request, prunedCompactV2Version, prunedV2Diagnostic, reviewedPrunedV2Diagnostic } from '../src/compact-v2-protocol.js';
import { compactV2Version } from '../src/compact-v2-offline.js';
import { readAppraisalView } from '../src/appraisal-view.js';
import { singleSceneProposal } from '../src/single-scene-diagnostic.js';
import { neutral } from '../src/contract.js';

const probes=JSON.parse(fs.readFileSync(new URL('../fixtures/appraisal-probes.json',import.meta.url)));
const fixture=JSON.parse(fs.readFileSync(new URL('../fixtures/quality/sparse-context.json',import.meta.url)));
const seed=()=>{const s=structuredClone(fixture);s.sources[0].grant.modelEgress=true;return s;};
const wire=i=>{const v=compactSceneData(normalizeAppraisalScene(probes.scenes[i],neutral()));v.evidence.push('梦');return v;};
const allowance=()=>({id:'v2-stub-bound',mode:'stub',approved:true,expiresAt:Date.now()+60000,protocolVersion:prunedCompactV2Version,
  limits:{maxRuns:1,maxCalls:3,maxMicroCny:1000000},pricing:{model:'deepseek-flash',contextTokenLimit:1000,inputMicroCnyPerMillion:1000000,outputMicroCnyPerMillion:2000000,reference:'https://api-docs.deepseek.com/TEST-ONLY',checkedAt:1}});
function directory(t){const d=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-v2-billing-'));t.after(()=>fs.rmSync(d,{recursive:true,force:true}));return d;}
const http=data=>new Response(JSON.stringify({model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(data)}}],usage:{prompt_tokens:100,completion_tokens:80,total_tokens:180}}));
function simulator(counter,mutate=()=>{}){return async(_url,r)=>{counter.calls++;const m=JSON.parse(JSON.parse(r.body).messages[1].content),data=m.stage==='wake'?{fragment:m.previousScenes.at(-1).event.split('。')[0]+'。',residue:0.1,associations:[]}:wire(m.sceneIndex);mutate(data,m);return http(data);};}
function setup(t,options={}){const d=directory(t),counter={calls:0},a=allowance(),e=new BudgetedNightvoyage(d,{allowance:a,mode:'stub',enabled:true,protocol:'compact-appraisal-v2',credential:'DUMMY-V2-BUDGET',fetchImpl:simulator(counter),...options});t.after(()=>e.close());return {d,e,a,counter};}
test('allowance binding is optional for legacy records, immutable when present and rejects unreviewed/offline versions',t=>{
  const d=directory(t),s=new Store(d),l=new BudgetLedger(s),legacy=allowance();delete legacy.protocolVersion;
  assert.equal(Object.hasOwn(validateAllowance(legacy),'protocolVersion'),false);l.approve(legacy);
  assert.throws(()=>l.approve({...legacy,protocolVersion:prunedCompactV2Version}),/allowance_conflict/);
  for(const version of [compactV2Version,'arbitrary',null,{}])assert.throws(()=>validateAllowance({...legacy,protocolVersion:version}),/invalid_allowance_protocol/);
  l.approve({...allowance(),id:'bound'});assert.equal(l.status('bound').allowance.protocolVersion,prunedCompactV2Version);s.close();
});
test('gated v2 and offline v2 checkpoints have distinct identities and preserve counts',()=>{
  const first=normalizePrunedV2Scene(wire(0),neutral());assert.equal(first.appraisalBasis.protocolVersion,prunedCompactV2Version);assert.deepEqual(normalizePrunedV2Checkpoint(first,neutral()),first);
  const request=buildPrunedV2Request({stage:'scene',index:1,snapshot:fixture,scenes:[first]},{model:'deepseek-flash'}),m=JSON.parse(request.body.messages[1].content);
  assert.equal(request.protocolVersion,prunedCompactV2Version);assert.equal(m.previousScenes[0].appraisalBasis.protocolVersion,prunedCompactV2Version);assert.equal(m.previousScenes[0].normalizationAudit.discardedUnusedQuoteCount,1);
  const old=structuredClone(first);old.appraisalBasis.protocolVersion=compactV2Version;assert.throws(()=>normalizePrunedV2Checkpoint(old,neutral()),/invalid_pruned_v2/);
  assert.throws(()=>buildPrunedV2Request({stage:'scene',index:1,snapshot:fixture,scenes:[old]},{model:'deepseek-flash'}),/invalid_pruned_v2/);
});
test('v2 without a matching immutable allowance binding is blocked before reservation or dispatch',async t=>{
  const d=directory(t),s=new Store(d),l=new BudgetLedger(s),a=allowance();delete a.protocolVersion;l.approve(a);let calls=0;
  const client=new GatedDeepSeekClient(s,{mode:'stub',enabled:true,protocol:'compact-appraisal-v2',fetchImpl:async()=>{calls++;return http(wire(0));}});
  const args={allowanceId:a.id,requestId:'scope',runId:'scope',credential:'dummy',payload:{stage:'scene',index:0,snapshot:seed(),scenes:[]}};
  await assert.rejects(client.send(args),/allowance_protocol_mismatch/);assert.equal(calls,0);assert.equal(l.status(a.id).calls,0);client.close();
  const bound=allowance();bound.id='new-bound';l.approve(bound);const old=new GatedDeepSeekClient(s,{mode:'stub',enabled:true,protocol:'compact-appraisal-v1',fetchImpl:async()=>{calls++;}});
  await assert.rejects(old.send({...args,allowanceId:bound.id}),/allowance_protocol_mismatch/);assert.equal(calls,0);assert.equal(l.status(bound.id).calls,0);old.close();s.close();
});
test('default v2 transport stays disabled and live HTTP override is still forbidden',async t=>{
  const d=directory(t),s=new Store(d),l=new BudgetLedger(s),a={...allowance(),mode:'live'};l.approve(a);
  const oldFetch=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('native fetch forbidden by test');};
  try {const c=new GatedDeepSeekClient(s,{mode:'live',protocol:'compact-appraisal-v2'});
    await assert.rejects(c.send({allowanceId:a.id,requestId:'default',runId:'default',credential:'dummy',payload:{stage:'scene',index:0,snapshot:seed(),scenes:[]}}),/transport_disabled/);c.close();
    assert.throws(()=>new GatedDeepSeekClient(s,{mode:'live',protocol:'compact-appraisal-v2',fetchImpl:()=>{}}),/override_forbidden/);assert.equal(calls,0);
  }finally{globalThis.fetch=oldFetch;s.close();}
});
test('integrated v2 commits audits, scenes and three settled rows atomically without touching an older hold',async t=>{
  const {e,a,counter}=setup(t),l=e.client.ledger,old={...a,id:'legacy-hold'};delete old.protocolVersion;l.approve(old);l.reserve(old.id,{requestId:'prior',runId:'prior',fingerprint:'a'.repeat(64),sourceRefs:[{id:'q-sparse-memory',version:'1'}],maxOutputTokens:400});l.unknown(old.id,'prior');const oldAccount=structuredClone(l.account(old.id));
  const id=e.start('v2-loop','v2-loop',seed());assert.equal(e.run(id).billingProtocolVersion,prunedCompactV2Version);assert.equal(e.run(id).appraisalProtocolVersion,prunedCompactV2Version);
  assert.equal((await e.execute(id)).status,'completed');const p=e.result(id),view=readAppraisalView(e.store,p.dream.id);assert.equal(counter.calls,3);assert.ok(p.receipt.billing.every(r=>r.status==='settled'));
  assert.ok(p.dream.scenes.every(s=>s.normalizationAudit.discardedUnusedQuoteCount===1));assert.equal(view.protocolVersion,prunedCompactV2Version);assert.equal(view.scenes[0].control.value,null);assert.equal(view.isRealityFact,false);assert.deepEqual(l.account(old.id),oldAccount);
  await e.execute(id);assert.equal(counter.calls,3);assert.equal(singleSceneProposal().protocolVersion,'compact-appraisal-quotes-v1');
});
test('invalid v2 quotes and later affect rules retain typed body-free rejection and full unknown reservation',async t=>{
  for(const [mutate,check]of [[x=>x.evidence.push('not in event'),'invalid_compact_evidence'],[x=>x.delta.arousal=0.1,'affect_change_requires_evidence']]){
    const counter={calls:0},{d,e,a}=setup(t,{fetchImpl:simulator(counter,mutate)}),id=e.start('invalid','invalid',seed());await e.execute(id);const row=e.status(id).billing[0];
    assert.equal(e.result(id).dream,null);assert.equal(row.status,'unknown');assert.equal(row.chargedMicroCny,row.reservedMicroCny);assert.equal(row.validationDiagnostic.protocolVersion,prunedCompactV2Version);assert.equal(row.validationDiagnostic.check,check);
    assert.ok(!fs.readFileSync(path.join(d,'state.json'),'utf8').includes(probes.scenes[0].event));e.close();
    const next=new BudgetedNightvoyage(d,{allowance:a,mode:'stub',enabled:true,protocol:'compact-appraisal-v2',credential:'dummy',fetchImpl:simulator(counter)});await next.resume(id,{retryUnknown:true});assert.equal(counter.calls,1);assert.equal(next.result(id).dream,null);next.close();
  }
});
test('v2 diagnostic metadata strips arbitrary text and is accepted only by its bound account',t=>{
  const {e,a}=setup(t),l=e.client.ledger,d=prunedV2Diagnostic('invalid_compact_reference');assert.deepEqual(reviewedPrunedV2Diagnostic({...d,text:'DUMMY-NOT-PERSISTED'}),d);
  assert.equal(reviewedPrunedV2Diagnostic({...d,check:'DUMMY-NOT-PERSISTED'}),null);const requestId='metadata';l.reserve(a.id,{requestId,runId:'meta',fingerprint:'b'.repeat(64),sourceRefs:[{id:'q-sparse-memory',version:'1'}],maxOutputTokens:400});l.unknown(a.id,requestId,{...d,text:'DUMMY-NOT-PERSISTED'});
  assert.deepEqual(l.attempt(a.id,requestId).validationDiagnostic,d);assert.ok(!JSON.stringify(l.status(a.id)).includes('DUMMY-NOT-PERSISTED'));
  const old={...a,id:'old'};delete old.protocolVersion;l.approve(old);l.reserve(old.id,{requestId,runId:'meta',fingerprint:'c'.repeat(64),sourceRefs:[{id:'q-sparse-memory',version:'1'}],maxOutputTokens:400});l.unknown(old.id,requestId,d);assert.equal(l.attempt(old.id,requestId).validationDiagnostic,undefined);
});
test('v2 wake rejection cannot publish a dream or trigger a fourth repair call',async t=>{
  const counter={calls:0},{e}=setup(t,{fetchImpl:simulator(counter,(data,m)=>{if(m.stage==='wake')data.fragment='从未发生的新后续。';})}),id=e.start('wake','wake',seed());await e.execute(id);
  assert.equal(e.status(id).error,'wake_fragment_not_grounded');assert.equal(e.result(id).dream,null);assert.equal(e.status(id).billing[2].status,'unknown');await e.resume(id,{retryUnknown:true});assert.equal(counter.calls,3);
});
test('v2 cancellation and withdrawal suppress late output and purge counts/view/recall',async t=>{
  let begin,deliver;const started=new Promise(resolve=>begin=resolve),cancelled=setup(t,{fetchImpl:()=>{begin();return new Promise(resolve=>deliver=resolve);}}),id=cancelled.e.start('cancel','cancel',seed()),work=cancelled.e.execute(id);await started;cancelled.e.cancel(id);assert.equal((await work).status,'cancelled');deliver(http(wire(0)));await new Promise(resolve=>setImmediate(resolve));assert.equal(cancelled.e.result(id).dream,null);
  const {d,e,counter}=setup(t),good=e.start('good','good',seed());await e.execute(good);const entry=e.result(good).dream.id;e.recall('小船','cue');e.withdraw('q-sparse-memory');assert.equal(readAppraisalView(e.store,entry),null);assert.deepEqual(e.recall('小船','cue'),[]);assert.ok(!fs.readFileSync(path.join(d,'state.json'),'utf8').includes('normalizationAudit'));assert.equal(counter.calls,3);
});
test('v2 run identity cannot switch allowance or protocol through execute/resume',async t=>{
  const {d,e,a}=setup(t),id=e.start('identity','identity',seed());assert.throws(()=>{e.client.protocol='compact-appraisal-v1';},TypeError);e.close();
  for(const options of [{protocol:'compact-appraisal-v1'},{protocol:'compact-appraisal-v2',allowance:{...a,id:'other'}}]){
    const next=new BudgetedNightvoyage(d,{allowance:a,mode:'stub',enabled:true,credential:'dummy',fetchImpl:async()=>{throw Error('forbidden dispatch');},...options});assert.throws(()=>next.execute(id),/billing_run_identity_mismatch/);assert.throws(()=>next.resume(id,{retryUnknown:true}),/billing_run_identity_mismatch/);next.close();}
});
test('v2 atomic settlement failure reopens with neither audit nor scene and retains unknown hold',async t=>{
  const {d,e,a,counter}=setup(t),send=e.client.fetchImpl;e.client.fetchImpl=async(...args)=>{const r=await send(...args);fs.mkdirSync(path.join(d,'snapshot.tmp'));return r;};const id=e.start('io','io',seed());await assert.rejects(e.execute(id));e.close();fs.rmdirSync(path.join(d,'snapshot.tmp'));
  const next=new BudgetedNightvoyage(d,{allowance:a,mode:'stub',enabled:true,protocol:'compact-appraisal-v2',credential:'dummy',fetchImpl:simulator(counter)}),row=next.status(id).billing[0];assert.equal(next.status(id).stagesSaved,0);assert.equal(next.result(id).dream,null);assert.equal(row.status,'unknown');assert.equal(row.chargedMicroCny,row.reservedMicroCny);assert.ok(!fs.readFileSync(path.join(d,'state.json'),'utf8').includes('normalizationAudit'));next.close();
});
test('actual exit after v2 atomic scene commit resumes only the remaining two paid-path simulator stages',async t=>{
  const d=directory(t),a=allowance(),script=`import fs from 'node:fs';import {BudgetedNightvoyage} from './src/budgeted-runtime.js';const input=JSON.parse(fs.readFileSync('fixtures/quality/sparse-context.json'));input.sources[0].grant.modelEgress=true;const e=new BudgetedNightvoyage(process.argv[1],{allowance:JSON.parse(process.argv[2]),mode:'stub',enabled:true,protocol:'compact-appraisal-v2',credential:'dummy',fetchImpl:async()=>new Response(${JSON.stringify(JSON.stringify({model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(wire(0))}}],usage:{prompt_tokens:100,completion_tokens:80,total_tokens:180}}))}),fault:p=>{if(p==='scene_saved')process.exit(7);}});await e.execute(e.start('exit','exit',input));`;
  const child=spawnSync(process.execPath,['--input-type=module','-e',script,d,JSON.stringify(a)],{cwd:new URL('..',import.meta.url),encoding:'utf8'});assert.equal(child.status,7,child.stderr);
  const counter={calls:0},e=new BudgetedNightvoyage(d,{allowance:a,mode:'stub',enabled:true,protocol:'compact-appraisal-v2',credential:'dummy',fetchImpl:simulator(counter)}),id=e.store.state.requests.exit.runId;
  assert.equal(e.run(id).scenes[0].normalizationAudit.discardedUnusedQuoteCount,1);assert.equal(e.status(id).billing[0].status,'settled');assert.equal((await e.resume(id,{retryUnknown:true})).status,'completed');assert.equal(counter.calls,2);assert.equal(e.status(id).billing.length,3);e.close();
});
test('actual exit after dispatch keeps unknown v2 hold and explicit resume cannot send again',async t=>{
  const d=directory(t),a=allowance(),script=`import fs from 'node:fs';import {BudgetedNightvoyage} from './src/budgeted-runtime.js';const input=JSON.parse(fs.readFileSync('fixtures/quality/sparse-context.json'));input.sources[0].grant.modelEgress=true;const e=new BudgetedNightvoyage(process.argv[1],{allowance:JSON.parse(process.argv[2]),mode:'stub',enabled:true,protocol:'compact-appraisal-v2',credential:'dummy',fetchImpl:async()=>{throw Error('must not reach simulator');},fault:p=>{if(p==='dispatched')process.exit(8);}});await e.execute(e.start('dispatch','dispatch',input));`;
  const child=spawnSync(process.execPath,['--input-type=module','-e',script,d,JSON.stringify(a)],{cwd:new URL('..',import.meta.url),encoding:'utf8'});assert.equal(child.status,8,child.stderr);const counter={calls:0},e=new BudgetedNightvoyage(d,{allowance:a,mode:'stub',enabled:true,protocol:'compact-appraisal-v2',credential:'dummy',fetchImpl:simulator(counter)}),id=e.store.state.requests.dispatch.runId;
  assert.equal(e.status(id).billing[0].status,'unknown');await e.resume(id,{retryUnknown:true});assert.equal(counter.calls,0);assert.equal(e.result(id).dream,null);e.close();
});
test('v2 allowance call cap and missing egress block before any over-limit dispatch',async t=>{
  const a=allowance();a.limits.maxCalls=1;const {e,counter}=setup(t,{allowance:a}),id=e.start('cap','cap',seed());await e.execute(id);assert.equal(counter.calls,1);assert.equal(e.status(id).stagesSaved,1);assert.equal(e.result(id).dream,null);
  const denied=setup(t),nid=denied.e.start('denied','denied',fixture);await denied.e.execute(nid);assert.equal(denied.counter.calls,0);assert.equal(denied.e.status(nid).billing.length,0);
});
