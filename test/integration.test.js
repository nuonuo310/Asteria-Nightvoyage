import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { BudgetedNightvoyage } from '../src/budgeted-runtime.js';
import { FakeProvider } from '../src/fake-provider.js';
import { Store } from '../src/store.js';
import { initTrial,preflight,readTrial,trialFixture,verifiedFixture,pricingProfile,profileExpiresAt } from '../src/trial-config.js';
const fixture=JSON.parse(fs.readFileSync(new URL('../fixtures/paper-harbor.json',import.meta.url)));
test('pinned fictional fixture accepts LF and Windows CRLF with identical content and grants',()=>{
 const lf=fs.readFileSync(new URL('../fixtures/paper-harbor.json',import.meta.url),'utf8').replace(/\r\n/g,'\n');
 assert.deepEqual(verifiedFixture(Buffer.from(lf)),fixture);
 assert.deepEqual(verifiedFixture(Buffer.from(lf.replace(/\n/g,'\r\n'))),fixture);
 assert.equal(verifiedFixture(Buffer.from(lf)).sources[0].grant.modelEgress,false);
});
test('newline normalization never authorizes modified fictional material or permissions',()=>{
 const text=fs.readFileSync(new URL('../fixtures/paper-harbor.json',import.meta.url),'utf8').replace(/\r\n/g,'\n');
 for(const changed of [text+' ',text.replace('false','true'),text.replace('An invented','A real'),text.replace(/\n/g,'\r'),text.replace(/\n/,'\n ')]){
  assert.notEqual(changed,text);assert.throws(()=>verifiedFixture(Buffer.from(changed)),/fixture_changed/);
 }
});
const grant=()=>{const f=structuredClone(fixture);f.sources[0].grant.modelEgress=true;return f;};
const allowance=()=>({id:'integration-stub',mode:'stub',approved:true,expiresAt:Date.now()+60000,limits:{maxRuns:3,maxCalls:9,maxMicroCny:1000000},pricing:{model:'deepseek-flash',contextTokenLimit:1000,inputMicroCnyPerMillion:1000000,outputMicroCnyPerMillion:2000000,reference:'https://api-docs.deepseek.com/TEST-ONLY',checkedAt:1}});
function simulator(counter){const fake=new FakeProvider();return async(_url,request)=>{counter.calls++;const body=JSON.parse(request.body),material=JSON.parse(body.messages[1].content);const data=material.stage==='wake'?{fragment:material.previousScenes.at(-1).event,residue:0.1,associations:[]}:await fake.generate({stage:material.stage,index:material.sceneIndex});return new Response(JSON.stringify({model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(data)}}],usage:{prompt_tokens:100,completion_tokens:50,total_tokens:150}}));};}
function setup(t,{fault=()=>{},config=allowance()}={}){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-integrated-')),counter={calls:0};const engine=new BudgetedNightvoyage(dir,{allowance:config,credential:'dummy-local-key',enabled:true,mode:'stub',fetchImpl:simulator(counter),fault});t.after(()=>{engine.close();fs.rmSync(dir,{recursive:true,force:true});});return {dir,engine,counter,config};}
test('integrated budgeted loop atomically publishes two scenes, wake, recall and three settled rows',async t=>{
 const {engine:e,counter}=setup(t),id=e.start('r','s',grant());assert.equal((await e.execute(id)).status,'completed');const result=e.result(id);
 assert.equal(result.dream.scenes.length,2);assert.deepEqual(result.wake.fragmentBasis,{kind:'scene_excerpt',sceneIndex:1});assert.equal(result.wake.fragment,result.dream.scenes[1].event);assert.equal(result.receipt.budget.calls,3);assert.equal(result.receipt.budget.input,300);assert.equal(result.receipt.billing.every(t=>t.status==='settled'),true);assert.equal(counter.calls,3);assert.equal(e.recall('lantern','cue')[0].isRealityFact,false);
 assert.equal(e.start('r','s',grant()),id);await e.execute(id);assert.equal(counter.calls,3);
});
test('three dreams share the same nine-call allowance and fourth run is blocked',async t=>{
 const {engine:e,counter}=setup(t);for(let i=0;i<3;i++){const id=e.start(`r${i}`,`s${i}`,grant());assert.equal((await e.execute(id)).status,'completed');}
 const id=e.start('four','four',grant());assert.equal((await e.execute(id)).status,'failed');assert.equal(counter.calls,9);assert.equal(e.client.ledger.status(e.allowanceId).calls,9);
});
test('crash after a committed scene resumes from that checkpoint without paying for it again',async t=>{
 let crash=true;const {engine:e,dir,config,counter}=setup(t,{fault:phase=>{if(phase==='scene_saved'&&crash){crash=false;throw new Error('simulated_crash');}}});
 const id=e.start('r','s',grant());assert.equal((await e.execute(id)).status,'uncertain');assert.equal(e.status(id).stagesSaved,1);e.close();
 const next=new BudgetedNightvoyage(dir,{allowance:config,credential:'dummy',enabled:true,mode:'stub',fetchImpl:simulator(counter)});
 assert.equal((await next.resume(id,{retryUnknown:true})).status,'completed');assert.equal(counter.calls,3);assert.equal(next.status(id).billing.length,3);next.close();
});
test('settlement write failure exposes neither output nor committed dream; reopen retains unknown hold',async t=>{
 const {engine:e,dir,config,counter}=setup(t);const real=e.client.fetchImpl;
 e.client.fetchImpl=async(...args)=>{const response=await real(...args);fs.mkdirSync(path.join(dir,'snapshot.tmp'));return response;};
 const id=e.start('r','s',grant());await assert.rejects(e.execute(id),/storage_io_failure|request_failed/);e.close();fs.rmdirSync(path.join(dir,'snapshot.tmp'));
 const next=new BudgetedNightvoyage(dir,{allowance:config,credential:'dummy',enabled:true,mode:'stub',fetchImpl:simulator(counter)});
 assert.equal(next.status(id).stagesSaved,0);assert.equal(next.status(id).billing[0].status,'unknown');assert.equal(next.result(id).dream,null);
 assert.equal((await next.resume(id,{retryUnknown:true})).status,'uncertain');assert.equal(counter.calls,1);next.close();
});
test('actual process death after atomic scene settlement cannot split ledger and checkpoint',t=>{
 const {engine:e,dir,config,counter}=setup(t);e.close();
 const script=`import fs from 'node:fs';import {BudgetedNightvoyage} from './src/budgeted-runtime.js';import {FakeProvider} from './src/fake-provider.js';const fake=new FakeProvider();const fixture=JSON.parse(fs.readFileSync('fixtures/paper-harbor.json'));fixture.sources[0].grant.modelEgress=true;const e=new BudgetedNightvoyage(process.argv[1],{allowance:JSON.parse(process.argv[2]),credential:'dummy',enabled:true,mode:'stub',fetchImpl:async(_,i)=>{const m=JSON.parse(JSON.parse(i.body).messages[1].content);const d=m.stage==='wake'?{fragment:m.previousScenes.at(-1).event,residue:0.1,associations:[]}:await fake.generate({stage:m.stage,index:m.sceneIndex});return new Response(JSON.stringify({model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(d)}}],usage:{prompt_tokens:100,completion_tokens:50,total_tokens:150}}));},fault:p=>{if(p==='scene_saved')process.exit(75);}});await e.execute(e.start('child','child',fixture));`;
 const child=spawnSync(process.execPath,['--input-type=module','-e',script,dir,JSON.stringify(config)],{cwd:new URL('..',import.meta.url),encoding:'utf8'});assert.equal(child.status,75,child.stderr);
 const next=new BudgetedNightvoyage(dir,{allowance:config,credential:'dummy',enabled:true,mode:'stub',fetchImpl:simulator(counter)});const id=next.start('child','child',grant());assert.equal(next.status(id).stagesSaved,1);assert.equal(next.status(id).billing[0].status,'settled');return next.resume(id,{retryUnknown:true}).then(r=>{assert.equal(r.status,'completed');assert.equal(counter.calls,2);next.close();});
});
test('withdrawal removes integrated dream bodies while accounting holds remain body-free',async t=>{
 const {engine:e,dir}=setup(t),id=e.start('r','s',grant());await e.execute(id);e.recall('lantern','cue');e.withdraw('fiction-paper');assert.equal(e.result(id).dream,null);assert.deepEqual(e.recall('lantern','cue'),[]);assert.equal(e.status(id).billing.length,3);
 const body=fs.readFileSync(path.join(dir,'state.json'),'utf8');assert.ok(!body.includes('Paper lanterns'));assert.ok(!body.includes('An invented character'));assert.ok(!body.includes('dummy-local-key'));
});
test('default integrated runtime is still disabled and does not dispatch',async t=>{
 const {engine:e,counter}=setup(t);e.client.enabled=false;const id=e.start('r','s',grant());assert.equal((await e.execute(id)).status,'failed');assert.equal(counter.calls,0);assert.equal(e.status(id).billing.length,0);
});
test('one-CNY reviewed trial is rejected at credential-free preflight; cap is never raised',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-trial-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const now=pricingProfile.checkedAt+1000;
 initTrial(dir,{budgetCny:'1',approveFictionalEgress:true,now});const check=preflight(dir,now);assert.equal(check.ready,false);assert.equal(check.reason,'reservation_exceeds_remaining_budget');assert.equal(check.budgetCny,1);assert.equal(check.nextReservationCny,2.2032);assert.equal(check.credentialRead,false);
 assert.throws(()=>initTrial(dir,{budgetCny:'3',approveFictionalEgress:true,now}),/trial_config_conflict/);
});
test('trial init requires explicit egress and budget, pins fictional fixture and expires pricing',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-trial-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const now=pricingProfile.checkedAt+1000;
 assert.throws(()=>initTrial(dir,{budgetCny:'1',now}),/explicit_trial/);assert.throws(()=>initTrial(dir,{budgetCny:'1',approveFictionalEgress:true,now:profileExpiresAt}),/expired/);
 const c=initTrial(dir,{budgetCny:'3',approveFictionalEgress:true,now});assert.equal(trialFixture(c).sources[0].grant.modelEgress,true);assert.equal(preflight(dir,now).ready,true);
 const changed=structuredClone(c);changed.allowance.pricing.inputMicroCnyPerMillion=1;fs.writeFileSync(path.join(dir,'trial.json'),JSON.stringify(changed));assert.throws(()=>readTrial(dir),/not_reviewed/);
});
test('CLI help and blocked preflight run without a key and never expose environment sentinel',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-cli-trial-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));initTrial(dir,{budgetCny:'1',approveFictionalEgress:true,now:pricingProfile.checkedAt+1000});
 const run=spawnSync(process.execPath,['src/trial-cli.js','run','1','--live','--data-dir',dir],{cwd:new URL('..',import.meta.url),encoding:'utf8',env:{...process.env,NIGHTVOYAGE_DEEPSEEK_KEY:'DUMMY-SENTINEL-MUST-NOT-PRINT'}});
 assert.equal(run.status,1);assert.ok(!run.stdout.includes('DUMMY'));assert.ok(!run.stderr.includes('DUMMY'));
 const store=new Store(dir);assert.equal(Object.keys(store.state.billing.accounts[readTrial(dir).allowance.id].attempts).length,0);store.close();
});
test('credential-free completed replay reports persisted billing usage rather than fake zero counters',async t=>{
 const {engine:e,dir}=setup(t),id=e.start('r','s',grant());await e.execute(id);e.close();
 const {Nightvoyage}=await import('../src/engine.js');const reader=new Nightvoyage(dir);const result=reader.result(id);
 assert.equal(result.receipt.budget.calls,3);assert.equal(result.receipt.budget.input,300);assert.equal(result.receipt.billing.length,3);assert.equal(result.receipt.budget.kind,'provider_usage_and_reservations');reader.close();
});

test('invented wake events cannot publish or trigger a fourth repair call',async t=>{
 const {engine:e,dir,config,counter}=setup(t);const original=e.client.fetchImpl;
 e.client.fetchImpl=async(url,request)=>{
  if(JSON.parse(JSON.parse(request.body).messages[1].content).stage!=='wake')return original(url,request);
  counter.calls++;return new Response(JSON.stringify({model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify({fragment:'An unrelated invented event occurs after waking.',residue:0.1,associations:[]})}}],usage:{prompt_tokens:100,completion_tokens:50,total_tokens:150}}));
 };
 const id=e.start('bad-wake','bad-wake',grant());assert.equal((await e.execute(id)).status,'failed');
 assert.equal(e.result(id).dream,null);assert.equal(e.status(id).error,'wake_fragment_not_grounded');assert.equal(e.status(id).stagesSaved,2);assert.equal(counter.calls,3);assert.equal(e.status(id).billing.at(-1).status,'unknown');e.close();
 const next=new BudgetedNightvoyage(dir,{allowance:config,credential:'dummy',enabled:true,mode:'stub',fetchImpl:simulator(counter)});
 assert.equal((await next.resume(id,{retryUnknown:true})).status,'uncertain');assert.equal(counter.calls,3);assert.equal(next.result(id).dream,null);next.close();
});
