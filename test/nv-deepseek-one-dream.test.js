import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {Store} from '../src/store.js';
import {Nightvoyage} from '../src/engine.js';
import {LocalFileAppraisalReviewAdapter} from '../src/appraisal-review-adapter.js';
import {readOneDreamContract,validateOneDreamContract,oneDreamFixtureSummary} from '../scripts/nv-deepseek-one-dream/contract.mjs';
import {initOneDreamAuthorization} from '../scripts/nv-deepseek-one-dream/authorization.mjs';
import {OneDreamRuntime} from '../scripts/nv-deepseek-one-dream/runtime.mjs';
import {createOneDreamLoopback,oneDreamLoopbackScenes} from '../scripts/nv-deepseek-one-dream/local-http.mjs';
import {runOneDreamSession} from '../scripts/nv-deepseek-one-dream/session.mjs';
import {launchOneDream} from '../scripts/nv-deepseek-one-dream/entry.mjs';
import {oneDreamAllowanceId,oneDreamAuthorizationField,oneDreamLocalCredential,oneDreamLoopbackKind} from '../scripts/nv-deepseek-one-dream/policy.mjs';
import {prepareOneDreamHistory} from '../test-support/nv-one-dream-fixtures.mjs';
import {dreambookCatalog,runDreambook} from '../scripts/dreambook.mjs';
import {readDreambookView,readDreambookLaterRecords} from '../scripts/dreambook-view-records.mjs';
import {renderDreambookViewHtml} from '../scripts/dreambook-view-html.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const now=Date.parse('2026-10-24T17:00:00Z');
const contractHash='c3a87c6085a5551bd1622ad5303ab5f8f810ab02a2009b9fb1712b1c33ba84c5';
const fixtureHash='401d3ae218ebe569d33f85c2ae2a35e82cf87837c108f4f83dc12210495f4f7c';
const oldAccountIds=['compact-appraisal-trial-20261015','compact-single-scene-diagnostic-20261015','pruned-v2-dream-trial-20261015','scene-continuity-dream-trial-20261016'];
const sceneData=index=>({event:oneDreamLoopbackScenes[index],appraisal:{goalEffect:0,control:.5,uncertainty:.5},basis:{goal:null,control:null,uncertainty:null},affect:{kind:'unchanged'}});
function dataFor(material){
  if(material?.stage==='scene'&&(material.sceneIndex===0||material.sceneIndex===1))return sceneData(material.sceneIndex);
  if(material?.stage==='wake'&&Array.isArray(material.previousScenes)&&material.previousScenes.some(scene=>scene.event.includes('纸船在长椅上轻轻转动')))return {fragment:'纸船在长椅上轻轻转动',residue:.12,associations:[]};
  return null;
}
function envelope(material,usage={prompt_tokens:180,completion_tokens:90,total_tokens:270}){
  return {model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(dataFor(material))}}],usage};
}
async function waitForPost(loopback,count=1){
  for(let i=0;i<200;i++){if(loopback.posts>=count)return;await new Promise(resolve=>setTimeout(resolve,5));}
  throw Error('one_dream_loopback_wait_timeout');
}
async function withRuntime(t,{handler,timeoutMs=60000},run){
  const h=prepareOneDreamHistory(t,{mode:'stub'}),loopback=await createOneDreamLoopback({handler});
  let engine;
  try{
    engine=new OneDreamRuntime(h.directory,{mode:'offline',loopback,enabled:true,timeoutMs});
    const gate=engine.prepare({dispatchKind:'rehearsal',create:true});
    engine.credential=oneDreamLocalCredential;
    return await run({h,loopback,engine,id:gate.id});
  }finally{
    try{engine?.close();}catch{}
    await loopback.close();
  }
}
async function rehearsed(t){
  const h=prepareOneDreamHistory(t,{mode:'stub'});
  const value=await runOneDreamSession('rehearse',h.directory,null,()=>{throw Error('unexpected_credential');});
  return {h,value};
}

test('fresh contract is exact, closes on expiry or drift, and pins the old source/history boundary',()=>{
  const {contract,contractHash:actual}=readOneDreamContract({now});
  const fixture=oneDreamFixtureSummary();
  assert.equal(actual,contractHash);
  assert.equal(fixture.fixtureHash,fixtureHash);
  assert.equal(contract.id,'nv-deepseek-one-dream-fresh-admission-20261025');
  assert.equal(contract.material.fixturePath,'examples/deepseek-one-dream-20261025.json');
  assert.equal(contract.limits.maxRuns,1);
  assert.equal(contract.limits.maxCalls,3);
  assert.equal(contract.limits.scenes,2);
  assert.equal(contract.limits.wakeCalls,1);
  assert.equal(contract.limits.perCallOutputTokens,400);
  assert.equal(contract.limits.additionalBudgetMicroCny,'3000000');
  assert.equal(contract.pricing.fullPerCallReservationMicroCny,'2100352');
  assert.equal(contract.pricing.expiresAt,Date.parse('2026-10-25T16:45:00Z'));
  assert.equal(contract.source.legacyContractHash,'8c1d8a58070f5100de2714845754ceddac75f1de424656d52d26b59dcc1fcdef');
  assert.equal(contract.source.legacyInventoryHash,'b4a06baeaeb4d9cf572bb349117d651db993957f413518a4b7ea1caf975a908d');
  assert.equal(contract.source.legacyExpiresAt,1792334940000);
  assert.equal(contract.source.legacyReusable,false);
  assert.equal(contract.source.oldSourceAdmissionChanged,false);
  assert.equal(contract.history.legacyUnknownHolds,4);
  assert.equal(contract.history.legacyHeldMicroCny,'8812800');
  assert.equal(contract.paidEvaluationApproved,false);
  assert.equal(contract.fictionalEgressApproved,false);
  assert.equal(contract.liveEntryAvailable,true);
  assert.equal(contract.implementationReady,true);
  assert.throws(()=>readOneDreamContract({now:contract.pricing.expiresAt}),/one_dream_contract_expired/);
  const changed=structuredClone(contract);changed.limits.maxCalls=4;
  assert.throws(()=>validateOneDreamContract(changed,{now}),/one_dream_contract_mismatch/);
  assert.equal(fs.readFileSync(path.join(root,'docs/proposals/deepseek-one-dream-20261025.json'),'utf8').includes('3000001'),false);
});

test('offline rehearsal saves exactly two original scenes and one wake, with three settled calls and unchanged old accounts',async t=>{
  const {h,value}=await rehearsed(t);
  const fixture=oneDreamFixtureSummary();
  assert.equal(value.status,'completed');
  assert.equal(value.scenesSaved,2);
  assert.equal(value.stagesSaved,2);
  assert.equal(value.wakeSaved,true);
  assert.equal(value.billingCalls,3);
  assert.equal(value.settledCalls,3);
  assert.equal(value.heldOrSpentMicroCny,'3240');
  assert.deepEqual(value.models,['deepseek-flash']);
  assert.equal(value.loopbackPosts,3);
  assert.equal(value.providerNetworkRequests,0);
  assert.equal(value.credentialRequested,false);
  assert.equal(value.appraisalView.status,'available');
  assert.equal(value.appraisalView.scenes.length,2);
  const store=new Store(h.directory);
  try{
    const entries=Object.values(store.state.entries);
    const dream=entries.find(entry=>entry.origin==='dream');
    assert.ok(dream);assert.equal(dream.scenes.length,2);assert.equal(dream.wake.origin,'wake_note');assert.equal(dream.wake.materialKind,'fictional');
    assert.equal(dream.isRealityFact,false);assert.equal(dream.wake.isRealityFact,false);
    const account=store.state.billing.accounts[oneDreamAllowanceId];
    assert.equal(account.runIds.length,1);
    assert.equal(Object.keys(account.attempts).length,3);
    assert.ok(Object.values(account.attempts).every(row=>row.status==='settled'));
    for(const id of oldAccountIds)assert.deepEqual(store.state.billing.accounts[id],h.oldAccounts[id]);
    assert.equal(store.state[oneDreamAuthorizationField].mode,'stub');
    assert.equal(store.state[oneDreamAuthorizationField].terms.dispatchKind,'rehearsal');
  }finally{store.close();}
  assert.equal(fixture.fixtureHash,fixtureHash);
});

test('completed no-Key replay creates no new call and preflight reports the saved completion',async t=>{
  const {h}=await rehearsed(t);
  let keys=0;
  const replay=await launchOneDream('rehearse',h.directory,{credentialSupplier:()=>{keys++;throw Error('PRIVATE-KEY-SENTINEL');}});
  assert.equal(replay.status,'completed');
  assert.equal(replay.credentialSupplierCalls,0);
  assert.equal(keys,0);
  const preflight=await runOneDreamSession('preflight',h.directory,null,()=>{keys++;throw Error('PRIVATE-KEY-SENTINEL');});
  assert.equal(preflight.ready,false);
  assert.equal(preflight.reason,'completed_replay_available');
  assert.equal(preflight.credentialRequested,false);
  assert.equal(keys,0);
  const store=new Store(h.directory);
  try{assert.equal(Object.keys(store.state.billing.accounts[oneDreamAllowanceId].attempts).length,3);}
  finally{store.close();}
});

test('completed dream is readable in Dreambook with split original, wake, later records, and opinion but no provider/model label',async t=>{
  const {h}=await rehearsed(t);
  const catalogueStore=new Store(h.directory);
  const dreamId=dreambookCatalog(catalogueStore).dreams.at(-1).id;
  catalogueStore.close();
  const night=new Nightvoyage(h.directory);
  const laterText='这是独立保存的虚构后来回想，不是原梦正文。';
  const laterId=night.append(dreamId,'recollection',laterText);
  night.close();
  const store=new Store(h.directory);
  try{
    const adapter=new LocalFileAppraisalReviewAdapter(store,{actorId:'fictional-one-dream-reviewer',kind:'assistant'});
    adapter.createReview({dreamId,request:{id:'review-fictional-one-dream',requestId:'review-fictional-one-dream',sceneIndex:1,
      assessment:{eventRelevance:'not_applicable',direction:{valence:'not_applicable',arousal:'not_applicable'},magnitude:{valence:'not_applicable',arousal:'not_applicable'},note:'独立虚构意见，不代表人工验收；该幕声明为 unchanged。'},supersedesReviewId:null}});
    const view=readDreambookView(store,dreamId);
    assert.equal(view.narrative.dream.origin,'dream');
    assert.equal(view.narrative.wake.origin,'wake_note');
    assert.equal(view.narrative.dream.scenes.length,2);
    const laterRecords=readDreambookLaterRecords(store,dreamId);
    assert.deepEqual(laterRecords.map(record=>record.origin),['recollection']);
    assert.ok(laterRecords.some(record=>record.text===laterText));
    const html=renderDreambookViewHtml(view,{demo:false,laterRecords});
    for(const marker of ['已保存的原梦','醒来之后','后来记录（非原梦）','模拟评价与依据','独立评审意见'])assert.ok(html.includes(marker),marker);
    assert.ok(html.includes(laterText));
    assert.ok(html.includes('fictional-one-dream-reviewer'));
    assert.equal(/DeepSeek|deepseek-flash|provider|adapter/i.test(html),false);
    assert.equal(/https?:\/\//i.test(html),false);
  }finally{store.close();}
  assert.equal(laterId.length>0,true);
});

test('missing authorization refuses both preflight and run before any credential supplier call or account creation',async t=>{
  const h=prepareOneDreamHistory(t,{authorize:false});
  let keys=0;const supplier=()=>{keys++;throw Error('PRIVATE-KEY-SENTINEL');};
  const preflight=await runOneDreamSession('preflight',h.directory,null,supplier);
  assert.equal(preflight.ready,false);
  assert.equal(preflight.reason,'fresh_explicit_one_dream_approval_required');
  assert.equal(preflight.credentialRequested,false);
  const run=await launchOneDream('run',h.directory,{credentialSupplier:supplier});
  assert.equal(run.status,'blocked');
  assert.equal(run.credentialSupplierCalls,0);
  assert.equal(run.credentialRequested,false);
  assert.equal(keys,0);
  const store=new Store(h.directory);
  try{
    assert.equal(store.state[oneDreamAuthorizationField],undefined);
    assert.equal(store.state.billing.accounts[oneDreamAllowanceId],undefined);
    for(const id of oldAccountIds)assert.deepEqual(store.state.billing.accounts[id],h.oldAccounts[id]);
  }finally{store.close();}
});

test('wrong checkout path, held owner, and changed preserved history all fail closed without a key',async t=>{
  const inside=await launchOneDream('preflight',path.join(root,'fixtures'),{credentialSupplier:()=>{throw Error('PRIVATE-KEY-SENTINEL');}});
  assert.equal(inside.status,'blocked');
  assert.equal(inside.credentialSupplierCalls,0);
  const h=prepareOneDreamHistory(t,{mode:'stub'});
  const held=new Store(h.directory);
  const owner=await launchOneDream('preflight',h.directory,{credentialSupplier:()=>{throw Error('PRIVATE-KEY-SENTINEL');}});
  held.close();
  assert.equal(owner.status,'blocked');
  assert.equal(owner.credentialSupplierCalls,0);
  const changed=prepareOneDreamHistory(t,{mode:'stub'});
  const store=new Store(changed.directory);
  try{
    const oldId=oldAccountIds[0],row=Object.values(store.state.billing.accounts[oldId].attempts)[0];
    assert.ok(row);row.chargedMicroCny='0';store.save();
  }finally{store.close();}
  const history=await launchOneDream('preflight',changed.directory,{credentialSupplier:()=>{throw Error('PRIVATE-KEY-SENTINEL');}});
  assert.equal(history.status,'blocked');
  assert.equal(history.credentialSupplierCalls,0);
});

test('budget reservation stops after one high-usage call without attempting a second paid request',async t=>{
  await withRuntime(t,{handler:({material,respond})=>respond(200,envelope(material,{prompt_tokens:1048576,completion_tokens:400,total_tokens:1048976}))},async({engine,id,loopback})=>{
    const status=await engine.execute(id);
    assert.equal(status.status,'failed');
    assert.equal(loopback.posts,1);
    const rows=Object.values(engine.store.state.billing.accounts[oneDreamAllowanceId].attempts);
    assert.equal(rows.length,1);
    assert.equal(rows[0].status,'settled');
    assert.equal(rows[0].chargedMicroCny,'2100352');
    assert.equal(rows[0].usage.inputTokens,1048576);
    assert.equal(engine.run(id).scenes.length,1);
  });
});

for(const failureAt of [0,1])test(`provider failure at scene ${failureAt+1} preserves the committed prefix, holds the failed call, and sends no later stage`,async t=>{
  await withRuntime(t,{handler:({material,respond})=>material.stage==='scene'&&material.sceneIndex===failureAt?respond(503):respond(200,envelope(material))},async({engine,id,loopback})=>{
    const status=await engine.execute(id);
    assert.equal(status.status,'failed');
    assert.equal(loopback.posts,failureAt+1);
    assert.equal(engine.run(id).scenes.length,failureAt);
    const rows=Object.values(engine.store.state.billing.accounts[oneDreamAllowanceId].attempts);
    assert.equal(rows.length,failureAt+1);
    assert.equal(rows.at(-1).status,'unknown');
    assert.equal(rows.at(-1).chargedMicroCny,'2100352');
    assert.equal(rows.slice(0,failureAt).every(row=>row.status==='settled'),true);
  });
});

test('invalid provider body and missing usage both fail closed with an unknown full hold',async t=>{
  await withRuntime(t,{handler:({respond})=>respond(200,{model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify({event:'unbounded'})}}],usage:{prompt_tokens:180,completion_tokens:90,total_tokens:270}})},async({engine,id})=>{
    const status=await engine.execute(id);assert.equal(status.status,'failed');
    const row=Object.values(engine.store.state.billing.accounts[oneDreamAllowanceId].attempts)[0];
    assert.equal(row.status,'unknown');assert.equal(row.chargedMicroCny,'2100352');
  });
  await withRuntime(t,{handler:({material,respond})=>respond(200,{model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(dataFor(material))}}]})},async({engine,id})=>{
    const status=await engine.execute(id);assert.equal(status.status,'failed');
    const row=Object.values(engine.store.state.billing.accounts[oneDreamAllowanceId].attempts)[0];
    assert.equal(row.status,'unknown');assert.equal(row.chargedMicroCny,'2100352');
  });
});

test('timeout holds the full reservation and suppresses a late response body',async t=>{
  const h=prepareOneDreamHistory(t,{mode:'stub'});let posts=0,resolveLate;
  const lateSeen=new Promise(resolve=>{resolveLate=resolve;});
  const loopback=Object.freeze({kind:oneDreamLoopbackKind,host:'127.0.0.1',async transport(_endpoint,request){
    posts++;await new Promise(resolve=>setTimeout(resolve,300));
    const material=JSON.parse(JSON.parse(request.body).messages[1].content),body=envelope(material);
    resolveLate();return new Response(JSON.stringify(body),{status:200,headers:{'content-type':'application/json'}});
  }});
  const engine=new OneDreamRuntime(h.directory,{mode:'offline',loopback,enabled:true,timeoutMs:100});
  t.after(()=>{try{engine.close();}catch{}});
  const gate=engine.prepare({dispatchKind:'rehearsal',create:true});engine.credential=oneDreamLocalCredential;
  const status=await engine.execute(gate.id);
  assert.equal(status.status,'failed');assert.equal(posts,1);
  const row=Object.values(engine.store.state.billing.accounts[oneDreamAllowanceId].attempts)[0];
  assert.equal(row.status,'unknown');assert.equal(row.chargedMicroCny,'2100352');
  await lateSeen;await new Promise(resolve=>setTimeout(resolve,20));
  assert.equal(engine.run(gate.id).scenes.length,0);
});

test('cancel holds an ambiguous attempt and a later handler reply cannot publish a saved scene',async t=>{
  await withRuntime(t,{handler:async({material,respond})=>{await new Promise(resolve=>setTimeout(resolve,80));respond(200,envelope(material));}},async({engine,id,loopback})=>{
    const pending=engine.execute(id);
    await waitForPost(loopback);
    engine.cancel(id);
    const status=await pending;
    assert.equal(status.status,'cancelled');
    const row=Object.values(engine.store.state.billing.accounts[oneDreamAllowanceId].attempts)[0];
    assert.equal(row.status,'unknown');assert.equal(row.chargedMicroCny,'2100352');
    await new Promise(resolve=>setTimeout(resolve,120));
    assert.equal(engine.run(id).scenes.length,0);
    assert.equal(engine.run(id).wake,undefined);
  });
});

test('source withdrawal blocks the saved body and later read while leaving the billing record intact',async t=>{
  const {h,value}=await rehearsed(t);
  assert.equal(value.status,'completed');
  const store=new Store(h.directory);
  try{store.withdraw('fiction-night-station-source');}finally{store.close();}
  const read=await runOneDreamSession('read',h.directory,null,()=>{throw Error('PRIVATE-KEY-SENTINEL');});
  assert.equal(read.dream,null);
  assert.equal(read.wake,null);
  assert.equal(JSON.stringify(read).includes(oneDreamLoopbackScenes[0]),false);
  const catalogue=runDreambook(['read','--data-dir',h.directory,'--latest']);
  assert.equal(catalogue,'当前没有可查看的已保存梦境。');
  const reopened=new Store(h.directory);
  try{assert.equal(dreambookCatalog(reopened).dreams.length,0);assert.equal(Object.keys(reopened.state.billing.accounts[oneDreamAllowanceId].attempts).length,3);}
  finally{reopened.close();}
});

test('authorization is one-use: duplicate init reuses the same run/terms rather than creating another allowance',async t=>{
  const h=prepareOneDreamHistory(t,{mode:'stub'});
  const store=new Store(h.directory);
  try{
    const again=initOneDreamAuthorization(store,{confirmation:h.confirmation,mode:'stub',now});
    assert.equal(again.termsHash,h.record.termsHash);
    assert.equal(again.terms.requestId,'nv-deepseek-one-dream-20261025');
    assert.equal(again.terms.sessionId,'nv-deepseek-one-dream-20261025');
    assert.equal(Object.keys(store.state.billing.accounts[oneDreamAllowanceId].attempts).length,0);
  }finally{store.close();}
});

test('dedicated no-Key checker proves the offline loop and reader without provider access',()=>{
  const run=spawnSync(process.execPath,['scripts/check-nv-deepseek-one-dream.mjs'],{cwd:root,encoding:'utf8',timeout:30000});
  assert.equal(run.status,0,run.stderr);
  assert.equal(run.stderr,'');
  const value=JSON.parse(run.stdout);
  assert.equal(value.status,'passed');
  assert.equal(value.rehearsal.status,'completed');
  assert.equal(value.rehearsal.scenesSaved,2);
  assert.equal(value.rehearsal.wakeSaved,true);
  assert.equal(value.rehearsal.settledCalls,3);
  assert.equal(value.credentialSupplierCalls,0);
  assert.equal(value.providerNetworkRequests,0);
  assert.equal(value.reader.providerOrModelLabelVisible,false);
  assert.equal(value.reader.oldAccountsUnchanged,true);
  assert.equal(value.liveRequestStarted,false);
});
