import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { Store } from '../src/store.js';
import { Nightvoyage } from '../src/engine.js';
import { BudgetLedger } from '../src/budget-ledger.js';
import { hash } from '../src/contract.js';
import { initTrial, pricingProfile, profileExpiresAt } from '../src/trial-config.js';
import { qualityBatchId, qualityProposal, qualityRequestId, verifiedQualityFixture, initQualityBatch, readQualityConfig, qualityInput, qualityPreflight } from '../src/quality-config.js';

const now=pricingProfile.checkedAt+1000,ids=['courtyard-cloth','drawer-and-orbit','sparse-context'];
const approve=directory=>initQualityBatch(directory,{budgetCny:3,approvedCases:ids,approveFictionalEgress:true,now});
function directory(t) {const d=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-quality-test-'));t.after(()=>fs.rmSync(d,{recursive:true,force:true}));return d;}
// Child-process native-fetch replacement is test-only: no provider network is contacted.
// Freeze only the test child's clock so evidence remains reproducible after review expiry.
function cli(directory,args,{key=true,behavior='ok'}={}) {
  const countFile=path.join(directory,'test-simulator-count.json');
  // Use the actual file URL (rather than URL.pathname) for Windows drives and spaces.
  const providerUrl=new URL('../src/fake-provider.js',import.meta.url).href;
  const runtimeUrl=new URL('../src/budgeted-runtime.js',import.meta.url).href;
  const preload=`import fs from 'node:fs';import {FakeProvider} from ${JSON.stringify(providerUrl)};import {BudgetedNightvoyage} from ${JSON.stringify(runtimeUrl)};
    Date.now=()=>${now};const fake=new FakeProvider();let calls=0;
    if(${JSON.stringify(behavior)}==='exit-after-scene'){const stage=BudgetedNightvoyage.prototype.stage;BudgetedNightvoyage.prototype.stage=async function(...args){await stage.apply(this,args);process.exit(7);};}
    globalThis.fetch=async(url,request)=>{calls++;fs.writeFileSync(${JSON.stringify(countFile)},JSON.stringify({calls}));
      if(${JSON.stringify(behavior)}==='forbid')throw Error('UNEXPECTED_TEST_DISPATCH');
      if(${JSON.stringify(behavior)}==='exit-second'&&calls===2)process.exit(7);
      if(${JSON.stringify(behavior)}==='cancel-first'&&calls===1)process.emit('SIGINT');
      const material=JSON.parse(JSON.parse(request.body).messages[1].content);
      const data=material.stage==='wake'?{fragment:${JSON.stringify(behavior)}==='bad-wake'?'A novel invented aftermath never present in either scene.':material.previousScenes.at(-1).event,residue:0.1,associations:[]}:
        await fake.generate({stage:material.stage,index:material.sceneIndex});
      return new Response(JSON.stringify({model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(data)}}],usage:{prompt_tokens:100,completion_tokens:50,total_tokens:150}}));};`;
  const env={...process.env};if(key)env.NIGHTVOYAGE_DEEPSEEK_KEY='DUMMY-QUALITY-SENTINEL';else delete env.NIGHTVOYAGE_DEEPSEEK_KEY;
  const result=spawnSync(process.execPath,['--import',`data:text/javascript,${encodeURIComponent(preload)}`,'src/quality-cli.js',...args,'--data-dir',directory],{cwd:new URL('..',import.meta.url),encoding:'utf8',env});
  assert.ok(!`${result.stdout}${result.stderr}`.includes('DUMMY-QUALITY-SENTINEL'));
  return result;
}
test('quality proposal pins only three fictional cases and keeps all egress disabled',()=>{
  const p=qualityProposal();assert.deepEqual(p.cases.map(c=>c.id),ids);assert.equal(p.modelEgressApproved,false);assert.equal(p.paidEvaluationApproved,false);
  for(const id of ids){const lf=fs.readFileSync(new URL(`../fixtures/quality/${id}.json`,import.meta.url),'utf8').replace(/\r\n/g,'\n');
    const f=verifiedQualityFixture(id,Buffer.from(lf));assert.ok(f.sources.every(s=>s.grant.modelEgress===false));
    assert.deepEqual(verifiedQualityFixture(id,Buffer.from(lf.replace(/\n/g,'\r\n'))),f);
    for(const changed of [lf+' ',lf.replace('false','true'),lf.replace(/\n/,'\n '),lf.replace(/\n/g,'\r')])assert.throws(()=>verifiedQualityFixture(id,Buffer.from(changed)),/fixture_changed/);
  }
  for(const id of ['empty-platform','../paper-harbor','__proto__','constructor'])assert.throws(()=>qualityRequestId(id),/not_reviewed/);
});
test('missing approval preflight is read-only and never creates a directory or account',t=>{
  const parent=directory(t),d=path.join(parent,'not-created');const check=qualityPreflight(d,undefined,now);
  assert.equal(check.ready,false);assert.equal(check.reason,'quality_approval_required');assert.equal(check.credentialRead,false);assert.equal(fs.existsSync(d),false);
});
test('quality init needs exact case, fee and egress approval; invalid requests create no data',t=>{
  const parent=directory(t),d=path.join(parent,'not-created');
  for(const options of [{},{budgetCny:3,approvedCases:ids},{budgetCny:1,approvedCases:ids,approveFictionalEgress:true},{budgetCny:3,approvedCases:[...ids,'weather-room'],approveFictionalEgress:true}])
    assert.throws(()=>initQualityBatch(d,{...options,now}),/explicit_quality_approval/);
  assert.throws(()=>initQualityBatch(d,{budgetCny:3,approvedCases:ids,approveFictionalEgress:true,now:profileExpiresAt}),/expired/);
  assert.equal(fs.existsSync(d),false);
});
test('new quality allowance preserves prior accounts, immutable config and no-egress source files',t=>{
  const d=directory(t),old=initTrial(d,{budgetCny:3,approveFictionalEgress:true,now});let store=new Store(d),ledger=new BudgetLedger(store);
  ledger.reserve(old.allowance.id,{requestId:'old',runId:'old-run',fingerprint:hash('old'),sourceRefs:[{id:'fiction-paper',version:'1'}],maxOutputTokens:400},now);
  const prior=structuredClone(store.state.billing.accounts[old.allowance.id]);store.close();
  const c=approve(d);approve(d);const state=qualityPreflight(d,ids[0],now);assert.equal(state.batch.calls,0);assert.equal(state.allAllowances.calls,1);assert.equal(state.allAllowances.heldOrSpentMicroCny,'2203200');
  // Prior unknown holds remain in their original allowance, never refunded or reset.
  store=new Store(d);assert.deepEqual(store.state.billing.accounts[old.allowance.id].attempts.old.chargedMicroCny,prior.attempts.old.chargedMicroCny);assert.equal(Object.keys(store.state.billing.accounts).length,2);store.close();
  assert.ok(qualityInput(c,ids[0]).sources.every(s=>s.grant.modelEgress));
  assert.ok(verifiedQualityFixture(ids[0],fs.readFileSync(new URL('../fixtures/quality/courtyard-cloth.json',import.meta.url))).sources.every(s=>!s.grant.modelEgress));
  const file=path.join(d,`${qualityBatchId}.json`),changed=JSON.parse(fs.readFileSync(file));changed.allowance.limits.maxCalls=90;fs.writeFileSync(file,JSON.stringify(changed));
  assert.throws(()=>readQualityConfig(d),/not_reviewed/);assert.throws(()=>approve(d),/not_reviewed/);
});
test('quality CLI default gates, unknown arguments and absent key never dispatch',t=>{
  const d=directory(t);
  for(const args of [['run',ids[0]],['run',ids[0],'--live'],['init'],['run','weather-room','--live'],['run',ids[0],'--live','--live'],['run',ids[0],'--live','--data-dir']]){
    const r=cli(d,args,{behavior:'forbid'});assert.equal(r.status,1,r.stderr);
  }
  approve(d);const missing=cli(d,['run',ids[0],'--live'],{key:false,behavior:'forbid'});assert.equal(missing.status,1);assert.match(missing.stderr,/credential_required/);
  assert.equal(fs.existsSync(path.join(d,'test-simulator-count.json')),false);assert.equal(qualityPreflight(d,ids[0],now).batch.calls,0);
});
test('quality CLI registers case order and persists three simulator dreams, replay and cap',t=>{
  const d=directory(t);approve(d);
  const outOfOrder=cli(d,['run',ids[1],'--live'],{behavior:'forbid'});assert.equal(outOfOrder.status,1);assert.match(outOfOrder.stdout,/previous_case_incomplete/);
  for(const caseId of ids){const r=cli(d,['run',caseId,'--live']);assert.equal(r.status,0,r.stderr);const value=JSON.parse(r.stdout);
    assert.equal(value.receipt.status,'completed');assert.equal(value.receipt.budget.calls,3);assert.equal(value.wake.fragmentBasis.kind,'scene_excerpt');assert.equal(value.dream.isRealityFact,false);
    const replay=cli(d,['run',caseId,'--live'],{key:false,behavior:'forbid'});assert.equal(replay.status,0,replay.stderr);assert.equal(JSON.parse(replay.stdout).receipt.id,value.receipt.id);
    assert.equal(qualityPreflight(d,caseId,now).reason,'completed_replay_available');
  }
  const check=qualityPreflight(d,undefined,now);assert.equal(check.reason,'call_limit_reached');assert.equal(check.batch.calls,9);assert.equal(check.batch.runs,3);approve(d);assert.equal(qualityPreflight(d,undefined,now).batch.calls,9);
});
test('invalid quality wake is retained as a failed case, blocks later cases and cannot repair',t=>{
  const d=directory(t);approve(d);const r=cli(d,['run',ids[0],'--live'],{behavior:'bad-wake'});assert.equal(r.status,1,r.stderr);
  const value=JSON.parse(r.stdout);assert.equal(value.dream,null);assert.equal(value.receipt.error,'wake_fragment_not_grounded');assert.equal(value.receipt.budget.calls,3);
  const later=cli(d,['run',ids[1],'--live'],{behavior:'forbid'});assert.equal(later.status,1);assert.match(later.stdout,/unsettled_attempt_requires_review/);
  const retry=cli(d,['run',ids[0],'--live','--resume'],{behavior:'forbid'});assert.equal(retry.status,1);
  assert.equal(JSON.parse(fs.readFileSync(path.join(d,'test-simulator-count.json'))).calls,3);assert.equal(qualityPreflight(d,undefined,now).batch.calls,3);
});
test('process exit during quality dispatch preserves saved scene and full unknown hold',t=>{
  const d=directory(t);approve(d);const r=cli(d,['run',ids[0],'--live'],{behavior:'exit-second'});assert.equal(r.status,7,r.stderr);
  const state=qualityPreflight(d,ids[0],now);assert.equal(state.reason,'unsettled_attempt_requires_review');assert.equal(state.cases[0].stagesSaved,1);assert.equal(state.batch.calls,2);assert.ok(BigInt(state.batch.heldOrSpentMicroCny)>=2203200n);
  const retry=cli(d,['run',ids[0],'--live','--resume'],{behavior:'forbid'});assert.equal(retry.status,1);assert.equal(JSON.parse(fs.readFileSync(path.join(d,'test-simulator-count.json'))).calls,2);
});
test('quality CLI resumes a committed scene only on explicit request and never regenerates it',t=>{
  const d=directory(t);approve(d);assert.equal(cli(d,['run',ids[0],'--live'],{behavior:'exit-after-scene'}).status,7);
  const before=qualityPreflight(d,ids[0],now);assert.equal(before.ready,true);assert.equal(before.cases[0].stagesSaved,1);assert.equal(before.batch.calls,1);
  const implicit=cli(d,['run',ids[0],'--live'],{behavior:'forbid'});assert.equal(implicit.status,1);assert.match(implicit.stderr,/explicit_resume_required/);
  const resumed=cli(d,['run',ids[0],'--live','--resume']);assert.equal(resumed.status,0,resumed.stderr);assert.equal(JSON.parse(resumed.stdout).receipt.status,'completed');
  assert.equal(JSON.parse(fs.readFileSync(path.join(d,'test-simulator-count.json'))).calls,2);assert.equal(qualityPreflight(d,ids[0],now).batch.calls,3);
});
test('quality withdrawal purges bodies across read, replay and reinitialization',t=>{
  const d=directory(t);const c=approve(d);assert.equal(cli(d,['run',ids[0],'--live']).status,0);
  const engine=new Nightvoyage(d),id=engine.store.state.requests[qualityRequestId(ids[0])].runId;engine.recall('lantern','quality-cue');engine.withdraw(c.cases[0].sourceRefs[0].id);engine.close();
  for(const args of [['read',ids[0]],['run',ids[0],'--live'],['run',ids[1],'--live']]){const r=cli(d,args,{key:false,behavior:'forbid'});assert.ok(!r.stdout.includes('Paper lanterns'));if(args[0]==='read')assert.equal(JSON.parse(r.stdout).dream,null);else assert.equal(r.status,1);}
  assert.equal(qualityPreflight(d,undefined,now).reason,'source_withdrawn');assert.throws(()=>approve(d),/source_withdrawn/);
  const reader=new Nightvoyage(d);assert.equal(reader.result(id).dream,null);assert.deepEqual(reader.recall('lantern','quality-cue'),[]);reader.close();
  assert.ok(!fs.readFileSync(path.join(d,'state.json'),'utf8').includes('Paper lanterns'));
});
test('cancelled quality case blocks later cases and terminal replay cannot spend',t=>{
  const d=directory(t),c=approve(d),e=new Nightvoyage(d),request=qualityRequestId(ids[0]);const id=e.start(request,request,qualityInput(c,ids[0]));e.run(id).billingAllowanceId=c.allowance.id;e.cancel(id);e.close();
  assert.equal(qualityPreflight(d,ids[0],now).reason,'case_stopped');assert.equal(qualityPreflight(d,ids[1],now).reason,'another_case_requires_review');
  assert.equal(cli(d,['run',ids[0],'--live','--resume'],{behavior:'forbid'}).status,1);assert.equal(qualityPreflight(d,undefined,now).batch.calls,0);
});
test('quality CLI in-flight cancellation suppresses late output and blocks remaining cases',t=>{
  const d=directory(t);approve(d);const r=cli(d,['run',ids[0],'--live'],{behavior:'cancel-first'});assert.equal(r.status,1,r.stderr);
  const value=JSON.parse(r.stdout);assert.equal(value.receipt.status,'cancelled');assert.equal(value.dream,null);assert.equal(value.receipt.budget.calls,1);
  assert.equal(value.receipt.budget.heldOrSpentMicroCny,'2203200');assert.equal(qualityPreflight(d,ids[1],now).reason,'unsettled_attempt_requires_review');
  assert.equal(cli(d,['run',ids[1],'--live'],{behavior:'forbid'}).status,1);assert.equal(JSON.parse(fs.readFileSync(path.join(d,'test-simulator-count.json'))).calls,1);
});
test('fake-only request cannot impersonate a quality run and expiry never extends allowance',async t=>{
  const d=directory(t),c=approve(d),e=new Nightvoyage(d),request=qualityRequestId(ids[0]);const input=qualityInput(c,ids[0]),id=e.start(request,request,input);await e.execute(id);e.close();
  const r=cli(d,['run',ids[0],'--live'],{behavior:'forbid'});assert.equal(r.status,1);assert.match(r.stderr,/quality_run_conflict/);
  const other=directory(t);approve(other);assert.equal(qualityPreflight(other,ids[0],profileExpiresAt).reason,'pricing_or_allowance_expired');assert.equal(qualityPreflight(other,ids[0],NaN).ready,false);
});
