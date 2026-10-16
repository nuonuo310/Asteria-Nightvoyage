import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { Store } from '../src/store.js';
import { BudgetLedger } from '../src/budget-ledger.js';
import { hash } from '../src/contract.js';
import { initQualityBatch } from '../src/quality-config.js';
import { pricingProfile, profileExpiresAt } from '../src/trial-config.js';
import { compactTrialId, initCompactTrial, readCompactTrial, compactTrialPreflight } from '../src/compact-trial-config.js';
import { diagnosticId, singleSceneProposal, initSingleSceneDiagnostic, readSingleSceneConfig, singleScenePreflight, singleSceneState, executeSingleSceneDiagnostic } from '../src/single-scene-diagnostic.js';

const now=pricingProfile.checkedAt+1000,key='DUMMY-LOCAL-DIAGNOSTIC-SECRET',event='梦里的人望着桌上独立虚构的纸片。';
function setup(t,{failed=true,otherUnknown=false}={}) {
  const d=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-single-diagnostic-'));t.after(()=>fs.rmSync(d,{recursive:true,force:true}));
  const q=initQualityBatch(d,{budgetCny:3,approvedCases:['courtyard-cloth','drawer-and-orbit','sparse-context'],approveFictionalEgress:true,now});
  let s=new Store(d),l=new BudgetLedger(s);
  for(let i=0;i<9;i++){const id=`quality-${i}`;l.reserve(q.allowance.id,{requestId:id,runId:`quality-${Math.floor(i/3)}`,fingerprint:hash(id),sourceRefs:[{id:'q-sparse-memory',version:'1'}],maxOutputTokens:400},now);
    l.dispatch(q.allowance.id,id);l.settle(q.allowance.id,id,{model:'deepseek-flash',usage:{inputTokens:100,outputTokens:50,totalTokens:150}});}
  s.close();const c=initCompactTrial(d,{budgetCny:3,approvedCase:'sparse-context',approveFictionalEgress:true,now});
  if(failed){s=new Store(d);l=new BudgetLedger(s);const id='prior-local-fictional-failure';
    s.state.requests[compactTrialId]={runId:id};s.state.runs[id]={id,status:'failed',error:'compact_appraisal_invalid',scenes:[],sourceIds:['q-sparse-memory'],
      billingAllowanceId:compactTrialId,billingProtocolVersion:c.protocolVersion,appraisalProtocolVersion:c.protocolVersion};s.save();
    const requestId=`stage-${id}-scene-0`;l.reserve(compactTrialId,{requestId,runId:id,fingerprint:hash(id),sourceRefs:c.sourceRefs,maxOutputTokens:400},now);l.dispatch(compactTrialId,requestId);l.unknown(compactTrialId,requestId);
    if(otherUnknown){const a={...c.allowance,id:'another-unresolved'};l.approve(a);l.reserve(a.id,{requestId:'another',runId:'another',fingerprint:hash('another'),sourceRefs:c.sourceRefs,maxOutputTokens:400},now);}
    s.close();}
  return d;
}
const approve=d=>initSingleSceneDiagnostic(d,{budgetCny:3,approvedCase:'sparse-context',approveFictionalEgress:true,approvePreservedHold:true,now});
const readDisk=d=>JSON.parse(fs.readFileSync(path.join(d,'state.json')));
const body=()=>({event,appraisal:{goalEffect:0,control:0.5,uncertainty:0.5},delta:{valence:0,arousal:0},evidence:[],links:{goal:null,control:null,uncertainty:null,affect:null}});
function cli(d,args,{behavior='ok',credential=true,clock=now}={}) {
  const count=path.join(d,'test-dispatch-count.json'),moduleUrl=new URL('../src/gated-deepseek-client.js',import.meta.url).href,storeUrl=new URL('../src/store.js',import.meta.url).href;
  const preload=`import fs from 'node:fs';import {Store} from ${JSON.stringify(storeUrl)};import {GatedDeepSeekClient} from ${JSON.stringify(moduleUrl)};
    Date.now=()=>${clock};const behavior=${JSON.stringify(behavior)},count=${JSON.stringify(count)},id=${JSON.stringify(diagnosticId)};
    let activeStore;const originalSend=GatedDeepSeekClient.prototype.send;GatedDeepSeekClient.prototype.send=function(...args){activeStore=this.store;return originalSend.apply(this,args);};
    const save=Store.prototype.save;Store.prototype.save=function(...args){save.apply(this,args);const record=this.state.protocolDiagnostics?.[id];
      if(behavior==='exit-after-start'&&record?.status==='running'&&!Object.keys(this.state.billing.accounts[id].attempts).length)process.exit(7);
      if(behavior==='exit-after-commit'&&record?.status==='accepted')process.exit(7);};
    globalThis.fetch=async(_url,r)=>{const n=fs.existsSync(count)?JSON.parse(fs.readFileSync(count)).calls:0;fs.writeFileSync(count,JSON.stringify({calls:n+1}));
      if(behavior==='forbid')throw Error('Unexpected local simulator dispatch');
      const request=JSON.parse(r.body),m=JSON.parse(request.messages[1].content);
      if(m.stage!=='scene'||m.sceneIndex!==0||m.previousScenes.length||request.max_tokens!==400||request.stream!==false||request.thinking.type!=='disabled'||request.tools)throw Error('Test request shape mismatch');
      if(behavior==='exit-in-flight')process.exit(7);if(behavior==='cancel')process.emit('SIGINT');if(behavior==='withdraw')activeStore.withdraw('q-sparse-memory');
      if(behavior==='http-error')return new Response(${JSON.stringify(key)},{status:401});
      const data=${JSON.stringify(body())};if(behavior==='invalid')data.links.control=99;
      return new Response(JSON.stringify({model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:behavior==='bad-json'?'not JSON':JSON.stringify(data)}}],usage:{prompt_tokens:100,completion_tokens:80,total_tokens:180}}));};`;
  const env={...process.env};if(credential)env.NIGHTVOYAGE_DEEPSEEK_KEY=key;else delete env.NIGHTVOYAGE_DEEPSEEK_KEY;
  const r=spawnSync(process.execPath,['--import',`data:text/javascript,${encodeURIComponent(preload)}`,'src/single-scene-cli.js',...args,'--data-dir',d],{cwd:new URL('..',import.meta.url),encoding:'utf8',env,timeout:10000});
  assert.ok(!`${r.stdout}${r.stderr}`.includes(key));return r;
}
const calls=d=>fs.existsSync(path.join(d,'test-dispatch-count.json'))?JSON.parse(fs.readFileSync(path.join(d,'test-dispatch-count.json'))).calls:0;
test('single-scene proposal requires new approval and missing-config preflight is read-only',t=>{
  const d=path.join(setup(t),'absent'),p=singleSceneProposal();assert.equal(p.maxAdditionalCalls,1);assert.equal(p.paidEvaluationApproved,false);assert.equal(p.fixtureEgressApproved,false);assert.equal(p.persistsGeneratedBody,false);
  assert.equal(singleScenePreflight(d,now).reason,'single_scene_approval_required');assert.equal(fs.existsSync(d),false);
  p.protocolSourcePins['validation-diagnostic.js']='changed';assert.notEqual(singleSceneProposal().protocolSourcePins['validation-diagnostic.js'],'changed');
});
test('diagnostic init needs fixed fee, case, egress, preserved-hold acknowledgement and exact old failure',t=>{
  const d=setup(t);for(const options of [{},{budgetCny:3,approvedCase:'sparse-context',approveFictionalEgress:true},
    {budgetCny:1,approvedCase:'sparse-context',approveFictionalEgress:true,approvePreservedHold:true},
    {budgetCny:3,approvedCase:'courtyard-cloth',approveFictionalEgress:true,approvePreservedHold:true}])
    assert.throws(()=>initSingleSceneDiagnostic(d,{...options,now}),/explicit_diagnostic_approval/);
  assert.throws(()=>approve(setup(t,{failed:false})),/expected_prior/);
  assert.throws(()=>approve(setup(t,{otherUnknown:true})),/other_unsettled/);
  const absent=path.join(d,'absent');assert.throws(()=>approve(absent));assert.equal(fs.existsSync(absent),false);
});
test('diagnostic approval is immutable and preserves every old account and the unresolved hold',t=>{
  const d=setup(t),before=readDisk(d).billing.accounts;approve(d);approve(d);const after=readDisk(d).billing.accounts;
  for(const [id,value]of Object.entries(before))assert.deepEqual(after[id],value);
  const c=readSingleSceneConfig(d);assert.equal(c.allowance.limits.maxCalls,1);assert.equal(singleScenePreflight(d,now).previousCompactTrial.heldOrSpentMicroCny,'2203200');
  const f=path.join(d,`${diagnosticId}.json`),bad=structuredClone(c);bad.allowance.limits.maxCalls=2;fs.writeFileSync(f,JSON.stringify(bad));assert.throws(()=>readSingleSceneConfig(d),/not_reviewed/);
});
test('diagnostic CLI rejects absent approval, key, live flag, resume and arbitrary overrides without dispatch',t=>{
  const d=setup(t);assert.equal(cli(d,['run','--live'],{behavior:'forbid'}).status,1);approve(d);
  for(const args of [['run'],['run','--live','--resume'],['run','--live','--model','other'],['run','--live','--live']])assert.equal(cli(d,args,{behavior:'forbid'}).status,1);
  const missing=cli(d,['run','--live'],{behavior:'forbid',credential:false});assert.match(missing.stderr,/credential_required/);assert.equal(calls(d),0);assert.equal(readDisk(d).protocolDiagnostics,undefined);
});
test('valid one-scene response settles atomically with metadata only; repeat init/run cannot dispatch again',t=>{
  const d=setup(t);approve(d);const old=readDisk(d).billing.accounts[compactTrialId],r=cli(d,['run','--live']);assert.equal(r.status,0,r.stderr);
  const result=JSON.parse(r.stdout);assert.equal(result.protocolValidation,'accepted');assert.equal(result.diagnosticAllowance.calls,1);assert.equal(result.billing[0].status,'settled');assert.equal(result.qualityAssessed,false);
  assert.equal(result.persistedGeneratedBody,false);assert.ok(!r.stdout.includes(event));assert.ok(!fs.readFileSync(path.join(d,'state.json'),'utf8').includes(event));
  assert.deepEqual(readDisk(d).billing.accounts[compactTrialId],old);assert.equal(Object.keys(readDisk(d).entries).length,0);assert.equal(readDisk(d).protocolDiagnostics[diagnosticId].status,'accepted');
  approve(d);assert.equal(cli(d,['run','--live'],{behavior:'forbid',credential:false}).status,1);assert.equal(calls(d),1);
  const read=cli(d,['read'],{credential:false,behavior:'forbid'});assert.equal(read.status,0,read.stderr);assert.equal(JSON.parse(read.stdout).protocolValidation,'accepted');assert.equal(calls(d),1);
});
test('invalid new scene retains exact rejection class and full new hold, with no body, retry or old-hold release',t=>{
  const d=setup(t);approve(d);const r=cli(d,['run','--live'],{behavior:'invalid'});assert.equal(r.status,1,r.stderr);const value=JSON.parse(r.stdout);
  assert.equal(value.protocolValidation,'rejected');assert.equal(value.validationDiagnostic.check,'invalid_compact_reference');assert.equal(value.diagnosticAllowance.heldOrSpentMicroCny,'2203200');assert.equal(value.previousCompactTrial.heldOrSpentMicroCny,'2203200');
  assert.ok(!fs.readFileSync(path.join(d,'state.json'),'utf8').includes(event));assert.equal(cli(d,['run','--live'],{behavior:'forbid'}).status,1);assert.equal(calls(d),1);
  assert.equal(compactTrialPreflight(d,now).reason,'unsettled_attempt_requires_review');
});
test('HTTP, malformed JSON, cancellation and withdrawal consume at most one call and suppress all bodies',t=>{
  for(const behavior of ['http-error','bad-json','cancel','withdraw']){const d=setup(t);approve(d);const r=cli(d,['run','--live'],{behavior});assert.equal(r.status,1,r.stderr);
    const value=JSON.parse(r.stdout);assert.equal(value.protocolValidation,'not_assessed');assert.equal(value.diagnosticAllowance.calls,1);assert.equal(value.billing[0].status,'unknown');assert.equal(value.billing[0].validationDiagnostic,undefined);
    assert.ok(!fs.readFileSync(path.join(d,'state.json'),'utf8').includes(event));assert.equal(cli(d,['run','--live'],{behavior:'forbid'}).status,1);assert.equal(calls(d),1);
    if(behavior==='withdraw')assert.equal(value.reason,'source_withdrawn');if(behavior==='cancel')assert.equal(value.diagnosticStatus,'cancelled');}
});
test('actual child exit before reservation, in-flight and after commit cannot cause a second request',t=>{
  for(const behavior of ['exit-after-start','exit-in-flight','exit-after-commit']){const d=setup(t);approve(d);const r=cli(d,['run','--live'],{behavior});assert.equal(r.status,7,r.stderr);
    const before=calls(d),read=cli(d,['read'],{credential:false,behavior:'forbid'});assert.equal(read.status,0,read.stderr);const state=JSON.parse(read.stdout);assert.equal(state.ready,false);
    if(behavior==='exit-after-start'){assert.equal(before,0);assert.equal(state.reason,'diagnostic_already_started');}
    if(behavior==='exit-in-flight'){assert.equal(state.billing[0].status,'unknown');assert.equal(state.diagnosticStatus,'interrupted');}
    if(behavior==='exit-after-commit'){assert.equal(state.billing[0].status,'settled');assert.equal(state.protocolValidation,'accepted');}
    assert.equal(cli(d,['run','--live'],{behavior:'forbid'}).status,1);assert.equal(calls(d),before);assert.ok(!fs.readFileSync(path.join(d,'state.json'),'utf8').includes(event));}
});
test('diagnostic expiry and withdrawal block before credentials/dispatch and never refresh approvals',t=>{
  const d=setup(t);approve(d);assert.equal(singleScenePreflight(d,profileExpiresAt).reason,'pricing_or_allowance_expired');
  assert.equal(cli(d,['run','--live'],{behavior:'forbid',clock:profileExpiresAt}).status,1);assert.equal(calls(d),0);
  assert.throws(()=>initSingleSceneDiagnostic(d,{budgetCny:3,approvedCase:'sparse-context',approveFictionalEgress:true,approvePreservedHold:true,now:profileExpiresAt}),/expired/);
  const s=new Store(d);s.withdraw('q-sparse-memory');s.close();assert.equal(singleScenePreflight(d,now).reason,'source_withdrawn');assert.throws(()=>approve(d),/source_withdrawn/);assert.equal(cli(d,['run','--live'],{behavior:'forbid'}).status,1);assert.equal(calls(d),0);
});
test('cancel before dispatch consumes no budget but durably blocks repeating the diagnostic',async t=>{
  const d=setup(t);const c=approve(d),s=new Store(d),controller=new AbortController();controller.abort();const oldNow=Date.now;Date.now=()=>now;
  try {const result=await executeSingleSceneDiagnostic(s,c,{credential:key,signal:controller.signal});assert.equal(result.diagnosticAllowance.calls,0);assert.equal(result.diagnosticStatus,'cancelled');assert.equal(singleSceneState(s,c).ready,false);}finally{Date.now=oldNow;s.close();}
});
test('failure of initial diagnostic persistence prevents any HTTP request',async t=>{
  const d=setup(t),c=approve(d),s=new Store(d),oldNow=Date.now,oldFetch=globalThis.fetch;Date.now=()=>now;let dispatched=0;globalThis.fetch=async()=>{dispatched++;throw Error('local sentinel');};
  fs.mkdirSync(path.join(d,'snapshot.tmp'));
  try {await assert.rejects(executeSingleSceneDiagnostic(s,c,{credential:key}),/storage_io_failure/);assert.equal(dispatched,0);}finally{Date.now=oldNow;globalThis.fetch=oldFetch;s.close();fs.rmdirSync(path.join(d,'snapshot.tmp'));}
  assert.equal(readDisk(d).protocolDiagnostics,undefined);
});
test('overlapping execution and a second store owner cannot dispatch a duplicate diagnostic',async t=>{
  const d=setup(t),c=approve(d),s=new Store(d),oldNow=Date.now,oldFetch=globalThis.fetch;Date.now=()=>now;
  let release,begun,dispatches=0;const started=new Promise(resolve=>begun=resolve);
  globalThis.fetch=async()=>{dispatches++;begun();return new Promise(resolve=>release=resolve);};
  try {
    const work=executeSingleSceneDiagnostic(s,c,{credential:key});await started;
    await assert.rejects(executeSingleSceneDiagnostic(s,c,{credential:key}),/diagnostic_preflight_blocked/);
    assert.throws(()=>new Store(d),/store_busy/);
    release(new Response(JSON.stringify({model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(body())}}],usage:{prompt_tokens:100,completion_tokens:80,total_tokens:180}})));
    assert.equal((await work).protocolValidation,'accepted');assert.equal(dispatches,1);
  }finally{Date.now=oldNow;globalThis.fetch=oldFetch;s.close();}
});
test('failure of atomic settlement cannot leave accepted metadata without its settled row',async t=>{
  const d=setup(t),c=approve(d),s=new Store(d),oldNow=Date.now,oldFetch=globalThis.fetch;Date.now=()=>now;
  globalThis.fetch=async()=>{fs.mkdirSync(path.join(d,'snapshot.tmp'));return new Response(JSON.stringify({model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(body())}}],usage:{prompt_tokens:100,completion_tokens:80,total_tokens:180}}));};
  try {await assert.rejects(executeSingleSceneDiagnostic(s,c,{credential:key}),/storage_io_failure/);}finally{Date.now=oldNow;globalThis.fetch=oldFetch;s.close();fs.rmdirSync(path.join(d,'snapshot.tmp'));}
  const reopened=new Store(d);
  try {const state=singleSceneState(reopened,c,now);assert.equal(state.protocolValidation,'not_assessed');assert.equal(state.diagnosticStatus,'interrupted');assert.equal(state.billing[0].status,'unknown');assert.equal(state.diagnosticAllowance.heldOrSpentMicroCny,'2203200');
    assert.ok(!fs.readFileSync(path.join(d,'state.json'),'utf8').includes(event));assert.equal(state.ready,false);
  }finally{reopened.close();}
});
