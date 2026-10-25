import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {Store} from '../src/store.js';
import {Nightvoyage} from '../src/engine.js';
import {LocalFileAppraisalReviewAdapter} from '../src/appraisal-review-adapter.js';
import {readOneDreamContract,validateOneDreamContract,oneDreamFixtureSummary} from '../scripts/nv-deepseek-fresh-dream-02/contract.mjs';
import {initOneDreamAuthorization,readOneDreamAuthorization} from '../scripts/nv-deepseek-fresh-dream-02/authorization.mjs';
import {providerResponse} from '../scripts/nv-deepseek-fresh-dream-02/client.mjs';
import {DiagnosticOneDreamRuntime} from '../scripts/nv-deepseek-fresh-dream-02/diagnostic.mjs';
import {OneDreamLedger} from '../scripts/nv-deepseek-fresh-dream-02/ledger.mjs';
import {createOneDreamLoopback,oneDreamLoopbackScenes,oneDreamLoopbackWakeFragment} from '../scripts/nv-deepseek-fresh-dream-02/local-http.mjs';
import {runOneDreamSession} from '../scripts/nv-deepseek-fresh-dream-02/session.mjs';
import {launchOneDream} from '../scripts/nv-deepseek-fresh-dream-02/entry.mjs';
import {oneDreamAllowanceId,oneDreamAuthorizationField,oneDreamLocalCredential,oneDreamLoopbackKind} from '../scripts/nv-deepseek-fresh-dream-02/policy.mjs';
import {verifyOneDreamGraph} from '../scripts/nv-deepseek-fresh-dream-02/source.mjs';
import {classifyFailure,classifyNativeTransport} from '../scripts/nv-deepseek-failure-diagnostics/classify.mjs';
import {diagnosticJournalPath,readDiagnosticReceipts} from '../scripts/nv-deepseek-failure-diagnostics/journal.mjs';
import {prepareFreshDream02History,freshDreamTestNow,priorOneDreamAllowanceId,randomizeLegacyUnknownIdentities} from '../test-support/nv-fresh-dream-02-fixtures.mjs';
import {createLocalHttpsPeer,localHttpsCa} from '../test-support/nv-fresh-dream-02-https-fixture.mjs';
import {dreambookCatalog,runDreambook} from '../scripts/dreambook.mjs';
import {readDreambookView,readDreambookLaterRecords} from '../scripts/dreambook-view-records.mjs';
import {renderDreambookViewHtml} from '../scripts/dreambook-view-html.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const now=freshDreamTestNow;
const oldAccountIds=['compact-appraisal-trial-20261015','compact-single-scene-diagnostic-20261015','pruned-v2-dream-trial-20261015','scene-continuity-dream-trial-20261016'];
const sceneData=index=>({event:oneDreamLoopbackScenes[index],appraisal:{goalEffect:0,control:.5,uncertainty:.5},basis:{goal:null,control:null,uncertainty:null},affect:{kind:'unchanged'}});
function dataFor(material){
  if(material?.stage==='scene'&&(material.sceneIndex===0||material.sceneIndex===1))return sceneData(material.sceneIndex);
  if(material?.stage==='wake'&&Array.isArray(material.previousScenes)&&material.previousScenes.some(scene=>scene.event.includes(oneDreamLoopbackWakeFragment)))return {fragment:oneDreamLoopbackWakeFragment,residue:.12,associations:[]};
  return null;
}
function envelope(material,usage={prompt_tokens:180,completion_tokens:90,total_tokens:270}){return {model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(dataFor(material))}}],usage};}
function materialFrom(request){return JSON.parse(JSON.parse(request.body).messages[1].content);}
function transportLoopback(transport){
  let posts=0;const requests=[];
  return Object.freeze({kind:oneDreamLoopbackKind,host:'127.0.0.1',requests,async transport(endpoint,request){const index=posts++;requests.push(request);return transport(endpoint,request,index);},get posts(){return posts;}});
}
async function waitForPost(loopback,count=1){for(let i=0;i<400;i++){if(loopback.posts>=count)return;await new Promise(resolve=>setTimeout(resolve,5));}throw Error('fresh_dream_loopback_wait_timeout');}
async function withRuntime(t,{transport,timeoutMs=60000,fault},run){
  const h=prepareFreshDream02History(t,{mode:'stub'}),loopback=transport?transportLoopback(transport):await createOneDreamLoopback();
  let engine=new DiagnosticOneDreamRuntime(h.directory,{mode:'offline',loopback,enabled:true,timeoutMs,fault});
  t.after(async()=>{
    try{engine?.close();}catch{}
    if(typeof loopback.close==='function')await loopback.close();
  });
  const gate=engine.prepare({dispatchKind:'rehearsal',create:true});engine.credential=oneDreamLocalCredential;
  return await run({h,engine,gate,loopback});
}
async function failedRun(t,options={}){return withRuntime(t,options,async context=>{const status=await context.engine.execute(context.gate.id);return {...context,status,receipts:readDiagnosticReceipts(context.h.directory)};});}
async function localHttpsFailure(t,mode){
  const h=prepareFreshDream02History(t,{mode:'live'}),peer=await createLocalHttpsPeer(mode);t.after(()=>peer.close());
  let engine=new DiagnosticOneDreamRuntime(h.directory,{mode:'live',enabled:true,timeoutMs:5000});
  t.after(()=>{try{engine?.close();}catch{}});
  engine.client.providerTransport=(_endpoint,request)=>providerResponse(peer.url,request,{ca:mode==='tls'?undefined:localHttpsCa});
  const gate=engine.prepare({dispatchKind:'provider',create:true});engine.credential=oneDreamLocalCredential;
  const status=await engine.execute(gate.id),attempt=rowsFor(engine)[0],before=readDiagnosticReceipts(h.directory);
  engine.close();engine=undefined;
  const after=readDiagnosticReceipts(h.directory);
  return {h,peer,status,attempt,before,after};
}
function rowsFor(engine){return Object.values(engine.store.state.billing.accounts[oneDreamAllowanceId].attempts);}
async function rehearsed(t){const h=prepareFreshDream02History(t,{mode:'stub'});const value=await runOneDreamSession('rehearse',h.directory,null,()=>{throw Error('unexpected_credential');});return {h,value};}

test('fresh contract pins exact alias, rates, local hold bound, source graph, and both preserved unknown groups',()=>{
  const {contract,contractHash}=readOneDreamContract({now}),fixture=oneDreamFixtureSummary();
  assert.match(contractHash,/^[a-f0-9]{64}$/);
  assert.equal(contract.id,'nv-deepseek-fresh-dream-02-fresh-admission-20261025');
  assert.equal(contract.material.fixturePath,'examples/deepseek-fresh-dream-02-20261025.json');
  assert.equal(contract.provider.model,'deepseek-flash');
  assert.equal(contract.provider.observedRevision,'DeepSeek-V4.1-Flash-1017');
  assert.equal(contract.provider.aliasRevisionPinned,false);
  assert.equal(contract.pricing.currency,'CNY');
  assert.equal(contract.pricing.inputMicroCnyPerMillion,2000000);
  assert.equal(contract.pricing.outputMicroCnyPerMillion,8000000);
  assert.equal(contract.pricing.contextTokenLimit,1048576);
  assert.equal(contract.pricing.inputTokenBound,65536);
  assert.equal(contract.pricing.fullPerCallReservationMicroCny,'134272');
  assert.equal(contract.pricing.aggregateThreeCallReservationMicroCny,'402816');
  assert.equal(contract.pricing.worstCaseFitsAggregateCeiling,true);
  assert.equal(contract.pricing.publicDocsRecheck.pricingStatus,200);
  assert.equal(contract.pricing.publicDocsRecheck.pricingBytes,26182);
  assert.equal(contract.pricing.publicDocsRecheck.revisionMatched,true);
  assert.equal(contract.pricing.publicDocsRecheck.ratesMatched,true);
  assert.equal(contract.pricing.publicDocsRecheck.modelsApiRequestMade,false);
  assert.equal(contract.pricing.uncertainty.providerUsageAndBillUnknown,true);
  assert.equal(contract.limits.maxRuns,1);
  assert.equal(contract.limits.maxCalls,3);
  assert.equal(contract.limits.scenes,2);
  assert.equal(contract.limits.wakeCalls,1);
  assert.equal(contract.limits.perCallOutputTokens,400);
  assert.equal(contract.limits.additionalBudgetMicroCny,'3000000');
  assert.equal(contract.history.requiredLegacyAccounts,5);
  assert.equal(contract.history.legacyUnknownHolds,5);
  assert.equal(contract.history.legacyReservedMicroCny,'10913152');
  assert.equal(contract.history.legacyHeldMicroCny,'10913152');
  assert.equal(contract.history.publicRowIdentitiesDisclosed,false);
  assert.equal(contract.history.privateBaselineSchemaVersion,2);
  assert.equal(contract.history.unknownHoldGroups.length,2);
  assert.equal(contract.history.unknownHoldGroups[0].heldMicroCny,'8812800');
  assert.equal(contract.history.unknownHoldGroups[1].heldMicroCny,'2100352');
  assert.deepEqual(contract.history.unknownHoldGroups.map(group=>[group.kind,group.accounts,group.holds,group.eachReservedMicroCny,group.eachChargedMicroCny,group.heldMicroCny]),[
    ['four_earlier_independent_unknowns',4,4,'2203200','2203200','8812800'],
    ['later_one_dream_unknown',1,1,'2100352','2100352','2100352']
  ]);
  assert.equal(Object.hasOwn(contract.history,'reviewedUnknownRows'),false);
  assert.equal(Object.hasOwn(contract.history,'reviewedUnknownRowsHash'),false);
  assert.equal(Object.hasOwn(contract.history.unknownHoldGroups[1],'allowanceId'),false);
  const historyText=JSON.stringify(contract.history);
  for(const marker of ['compact-appraisal-trial-20261015','stage-old-failed-scene-0','old-failed','8bb422c5c4d4a79a233b38b813c66472201b9f70d947ae8fa3c55f340cec6250',priorOneDreamAllowanceId,'prior-one-dream-run','b'.repeat(64),'q-sparse-memory','fiction-night-station-source'])assert.equal(historyText.includes(marker),false,marker);
  assert.equal(/[a-f0-9]{64}/.test(historyText),false);
  assert.equal(contract.source.legacyReusable,false);
  assert.equal(contract.source.priorOneDreamReusable,false);
  assert.equal(contract.source.priorOneDreamUnknownHoldMicroCny,'2100352');
  assert.equal(contract.paidEvaluationApproved,false);
  assert.equal(contract.fictionalEgressApproved,false);
  assert.equal(contract.liveEntryAvailable,true);
  assert.equal(contract.implementationReady,true);
  assert.equal(fixture.contractHash,contractHash);
  assert.equal(fixture.fixtureFileHash,contract.material.fixtureFileHash);
  const graph=verifyOneDreamGraph({repositoryRoot:root,contract});
  assert.equal(graph.entry,'scripts/nv-deepseek-fresh-dream-02/session.mjs');
  assert.ok(Object.hasOwn(graph.files,'scripts/nv-deepseek-fresh-dream-02/diagnostic.mjs'));
  assert.ok(Object.hasOwn(graph.files,'scripts/nv-deepseek-failure-diagnostics/classify.mjs'));
  assert.throws(()=>readOneDreamContract({now:contract.pricing.expiresAt}),/one_dream_contract_expired/);
  const changed=structuredClone(contract);changed.limits.maxCalls=4;
  assert.throws(()=>validateOneDreamContract(changed,{now}),/one_dream_contract_mismatch/);
});

test('offline rehearsal saves two ordered scenes and one wake with a separate allowance and unchanged old accounts',async t=>{
  const {h,value}=await rehearsed(t);
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
    const entries=Object.values(store.state.entries),dream=entries.find(entry=>entry.origin==='dream');
    assert.ok(dream);assert.equal(dream.scenes.length,2);assert.equal(dream.wake.origin,'wake_note');
    assert.equal(dream.wake.materialKind,'fictional');assert.equal(dream.isRealityFact,false);assert.equal(dream.wake.isRealityFact,false);
    const account=store.state.billing.accounts[oneDreamAllowanceId];
    assert.equal(account.runIds.length,1);assert.equal(Object.keys(account.attempts).length,3);
    assert.ok(Object.values(account.attempts).every(row=>row.status==='settled'));
    for(const id of oldAccountIds)assert.deepEqual(store.state.billing.accounts[id],h.oldAccounts[id]);
    assert.deepEqual(store.state.billing.accounts[priorOneDreamAllowanceId],h.oldAccounts[priorOneDreamAllowanceId]);
    assert.equal(store.state[oneDreamAuthorizationField].mode,'stub');
    assert.equal(store.state[oneDreamAuthorizationField].terms.dispatchKind,'rehearsal');
    const baseline=store.state[oneDreamAuthorizationField].terms.baseline;
    assert.equal(baseline.schemaVersion,2);assert.equal(baseline.unknownRows.length,5);assert.equal(baseline.unknownAccounts,5);
    assert.equal(baseline.unknownReservedMicroCny,'10913152');assert.equal(baseline.unknownChargedMicroCny,'10913152');
    assert.ok(baseline.unknownRows.every(row=>Object.keys(row).length===8&&row.fingerprint.length===64&&row.sourceRefs.length>0));
  }finally{store.close();}
});

test('completed no-Key replay and preflight create no call and no credential request',async t=>{
  const {h}=await rehearsed(t);let keys=0;
  const replay=await launchOneDream('rehearse',h.directory,{credentialSupplier:()=>{keys++;throw Error('PRIVATE-KEY-SENTINEL');}});
  assert.equal(replay.status,'completed');assert.equal(replay.credentialSupplierCalls,0);
  const preflight=await runOneDreamSession('preflight',h.directory,null,()=>{keys++;throw Error('PRIVATE-KEY-SENTINEL');});
  assert.equal(preflight.ready,false);assert.equal(preflight.reason,'completed_replay_available');assert.equal(preflight.credentialRequested,false);
  assert.equal(keys,0);
  const store=new Store(h.directory);
  try{assert.equal(Object.keys(store.state.billing.accounts[oneDreamAllowanceId].attempts).length,3);}finally{store.close();}
});

test('completed dream reads as original, wake, later record and attributed opinion without a provider or model label',async t=>{
  const {h}=await rehearsed(t);
  const catalogueStore=new Store(h.directory),dreamId=dreambookCatalog(catalogueStore).dreams.at(-1).id;catalogueStore.close();
  const night=new Nightvoyage(h.directory),laterText='Separately saved fictional recollection, not original dream text.';
  const laterId=night.append(dreamId,'recollection',laterText);night.close();
  const store=new Store(h.directory);
  try{
    const adapter=new LocalFileAppraisalReviewAdapter(store,{actorId:'fictional-fresh-dream-reviewer',kind:'assistant'});
    adapter.createReview({dreamId,request:{id:'review-fictional-fresh-dream',requestId:'review-fictional-fresh-dream',sceneIndex:1,
      assessment:{eventRelevance:'not_applicable',direction:{valence:'not_applicable',arousal:'not_applicable'},magnitude:{valence:'not_applicable',arousal:'not_applicable'},note:'Fictional independent opinion; not human acceptance.'},supersedesReviewId:null}});
    const view=readDreambookView(store,dreamId);
    assert.equal(view.narrative.dream.origin,'dream');assert.equal(view.narrative.wake.origin,'wake_note');assert.equal(view.narrative.dream.scenes.length,2);
    const laterRecords=readDreambookLaterRecords(store,dreamId);
    assert.deepEqual(laterRecords.map(record=>record.origin),['recollection']);assert.ok(laterRecords.some(record=>record.text===laterText));
    const html=renderDreambookViewHtml(view,{demo:false,laterRecords});
    assert.ok(html.includes(laterText));assert.ok(html.includes('fictional-fresh-dream-reviewer'));
    assert.equal(/DeepSeek|deepseek-flash|provider|adapter/i.test(html),false);
    assert.equal(/https?:\/\//i.test(html),false);
  }finally{store.close();}
  assert.equal(laterId.length>0,true);
});

test('missing authorization refuses preflight and run before a credential supplier call or allowance creation',async t=>{
  const h=prepareFreshDream02History(t,{authorize:false});let keys=0;
  const supplier=()=>{keys++;throw Error('PRIVATE-KEY-SENTINEL');};
  const preflight=await runOneDreamSession('preflight',h.directory,null,supplier);
  assert.equal(preflight.ready,false);assert.equal(preflight.reason,'fresh_explicit_one_dream_approval_required');assert.equal(preflight.credentialRequested,false);
  const run=await launchOneDream('run',h.directory,{credentialSupplier:supplier});
  assert.equal(run.status,'blocked');assert.equal(run.credentialSupplierCalls,0);assert.equal(run.credentialRequested,false);assert.equal(keys,0);
  const store=new Store(h.directory);
  try{
    assert.equal(store.state[oneDreamAuthorizationField],undefined);assert.equal(store.state.billing.accounts[oneDreamAllowanceId],undefined);
    for(const id of [...oldAccountIds,priorOneDreamAllowanceId])assert.deepEqual(store.state.billing.accounts[id],h.oldAccounts[id]);
  }finally{store.close();}
});

test('wrong checkout path, held owner, and changed preserved history fail closed without a key',async t=>{
  const inside=await launchOneDream('preflight',path.join(root,'fixtures'),{credentialSupplier:()=>{throw Error('PRIVATE-KEY-SENTINEL');}});
  assert.equal(inside.status,'blocked');assert.equal(inside.credentialSupplierCalls,0);
  const h=prepareFreshDream02History(t,{mode:'stub'});const held=new Store(h.directory);
  const owner=await launchOneDream('preflight',h.directory,{credentialSupplier:()=>{throw Error('PRIVATE-KEY-SENTINEL');}});held.close();
  assert.equal(owner.status,'blocked');assert.equal(owner.credentialSupplierCalls,0);
  const changed=prepareFreshDream02History(t,{mode:'stub'}),store=new Store(changed.directory);
  try{const row=store.state.billing.accounts[priorOneDreamAllowanceId].attempts[`stage-prior-one-dream-run-scene-0`];row.chargedMicroCny='2100351';store.save();}finally{store.close();}
  const history=await launchOneDream('preflight',changed.directory,{credentialSupplier:()=>{throw Error('PRIVATE-KEY-SENTINEL');}});
  assert.equal(history.status,'blocked');assert.equal(history.credentialSupplierCalls,0);
});

test('a fourth call is refused after three full worst-case holds fit exactly under the aggregate ceiling',async t=>{
  const h=prepareFreshDream02History(t,{mode:'stub'}),store=new Store(h.directory);
  try{
    const ledger=new OneDreamLedger(store),sources=[{id:'fiction-glass-orchard-source',version:'1'}];
    for(let i=0;i<3;i++)ledger.reserve(oneDreamAllowanceId,{requestId:`budget-${i}`,runId:'budget-run',fingerprint:'c'.repeat(64),sourceRefs:sources,maxOutputTokens:400},now);
    const status=ledger.status(oneDreamAllowanceId);
    assert.equal(status.calls,3);assert.equal(status.heldOrSpentMicroCny,'402816');
    assert.throws(()=>ledger.reserve(oneDreamAllowanceId,{requestId:'budget-3',runId:'budget-run',fingerprint:'c'.repeat(64),sourceRefs:sources,maxOutputTokens:400},now),/one_dream_allowance_exhausted/);
  }finally{store.close();}
});

for(const failureAt of [0,1])test(`provider failure at scene ${failureAt+1} keeps the committed prefix, holds a full unknown reservation, and sends no later stage`,async t=>{
  await withRuntime(t,{transport:async(_endpoint,request)=>{const material=materialFrom(request);return material.stage==='scene'&&material.sceneIndex===failureAt?new Response(null,{status:503}):new Response(JSON.stringify(envelope(material)),{status:200});}},async({engine,gate,loopback})=>{
    const status=await engine.execute(gate.id);assert.equal(status.status,'failed');assert.equal(loopback.posts,failureAt+1);assert.equal(engine.run(gate.id).scenes.length,failureAt);
    const rows=rowsFor(engine);assert.equal(rows.length,failureAt+1);assert.equal(rows.at(-1).status,'unknown');assert.equal(rows.at(-1).chargedMicroCny,'134272');
    assert.equal(rows.slice(0,failureAt).every(row=>row.status==='settled'),true);
  });
});

test('invalid dream body and missing usage both fail closed with an unknown full hold',async t=>{
  await withRuntime(t,{transport:async()=>new Response(JSON.stringify({model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify({event:'unbounded'})}}],usage:{prompt_tokens:180,completion_tokens:90,total_tokens:270}}),{status:200})},async({engine,gate})=>{
    const status=await engine.execute(gate.id);assert.equal(status.status,'failed');const row=rowsFor(engine)[0];assert.equal(row.status,'unknown');assert.equal(row.chargedMicroCny,'134272');
  });
  await withRuntime(t,{transport:async(_endpoint,request)=>new Response(JSON.stringify({model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(dataFor(materialFrom(request)))}}]}),{status:200})},async({engine,gate})=>{
    const status=await engine.execute(gate.id);assert.equal(status.status,'failed');const row=rowsFor(engine)[0];assert.equal(row.status,'unknown');assert.equal(row.chargedMicroCny,'134272');
  });
});

test('timeout holds the full reservation and suppresses a late response body',async t=>{
  const h=prepareFreshDream02History(t,{mode:'stub'});let posts=0,resolveLate;const lateSeen=new Promise(resolve=>{resolveLate=resolve;});
  const loopback=Object.freeze({kind:oneDreamLoopbackKind,host:'127.0.0.1',async transport(_endpoint,request){posts++;await new Promise(resolve=>setTimeout(resolve,300));const material=JSON.parse(JSON.parse(request.body).messages[1].content);resolveLate();return new Response(JSON.stringify(envelope(material)),{status:200});}});
  const engine=new DiagnosticOneDreamRuntime(h.directory,{mode:'offline',loopback,enabled:true,timeoutMs:100});t.after(()=>{try{engine.close();}catch{}});
  const gate=engine.prepare({dispatchKind:'rehearsal',create:true});engine.credential=oneDreamLocalCredential;
  const status=await engine.execute(gate.id);assert.equal(status.status,'failed');assert.equal(posts,1);
  const row=rowsFor(engine)[0];assert.equal(row.status,'unknown');assert.equal(row.chargedMicroCny,'134272');
  await lateSeen;await new Promise(resolve=>setTimeout(resolve,20));assert.equal(engine.run(gate.id).scenes.length,0);
});

test('caller cancellation holds an ambiguous attempt and a late reply cannot publish',async t=>{
  await withRuntime(t,{transport:async(_endpoint,request)=>{await new Promise(resolve=>setTimeout(resolve,80));return new Response(JSON.stringify(envelope(materialFrom(request))),{status:200});}},async({engine,gate,loopback})=>{
    const pending=engine.execute(gate.id);await waitForPost(loopback);engine.cancel(gate.id);const status=await pending;assert.equal(status.status,'cancelled');
    const row=rowsFor(engine)[0];assert.equal(row.status,'unknown');assert.equal(row.chargedMicroCny,'134272');
    await new Promise(resolve=>setTimeout(resolve,120));assert.equal(engine.run(gate.id).scenes.length,0);assert.equal(engine.run(gate.id).wake,undefined);
  });
});

test('source withdrawal blocks saved bodies and later read while the billing record remains intact',async t=>{
  const {h,value}=await rehearsed(t);assert.equal(value.status,'completed');
  const store=new Store(h.directory);try{store.withdraw('fiction-glass-orchard-source');}finally{store.close();}
  const read=await runOneDreamSession('read',h.directory,null,()=>{throw Error('PRIVATE-KEY-SENTINEL');});
  assert.equal(read.dream,null);assert.equal(read.wake,null);assert.equal(JSON.stringify(read).includes(oneDreamLoopbackScenes[0]),false);
  assert.equal(runDreambook(['read','--data-dir',h.directory,'--latest']),'当前没有可查看的已保存梦境。');
  const reopened=new Store(h.directory);try{assert.equal(dreambookCatalog(reopened).dreams.length,0);assert.equal(Object.keys(reopened.state.billing.accounts[oneDreamAllowanceId].attempts).length,3);}finally{reopened.close();}
});

test('authorization is one-use and duplicate init reuses the same independent run identities',async t=>{
  const h=prepareFreshDream02History(t,{mode:'stub'}),store=new Store(h.directory);
  try{
    const again=initOneDreamAuthorization(store,{confirmation:h.confirmation,mode:'stub',now});
    assert.equal(again.termsHash,h.record.termsHash);assert.equal(again.terms.requestId,'nv-deepseek-fresh-dream-02-20261025');assert.equal(again.terms.sessionId,'nv-deepseek-fresh-dream-02-20261025');
    assert.equal(Object.keys(store.state.billing.accounts[oneDreamAllowanceId].attempts).length,0);
  }finally{store.close();}
});

test('first live init accepts randomized legacy identities, seals their full local baseline, and rejects reopen mutation',t=>{
  const h=prepareFreshDream02History(t,{mode:'live',authorize:false}),store=new Store(h.directory);
  try{
    const randomized=randomizeLegacyUnknownIdentities(store),contractText=fs.readFileSync(path.join(root,'docs/proposals/deepseek-fresh-dream-02-20261025.json'),'utf8');
    assert.equal(randomized.length,5);assert.equal(new Set(randomized.map(row=>row.accountId)).size,5);
    for(const row of randomized)for(const value of [row.accountId,row.requestId,row.runId,row.fingerprint,row.sourceId])assert.equal(contractText.includes(value),false,value);
    const record=initOneDreamAuthorization(store,{confirmation:h.confirmation,mode:'live',now});
    assert.equal(record.mode,'live');
    const baseline=store.state[oneDreamAuthorizationField].terms.baseline;
    assert.equal(baseline.schemaVersion,2);assert.equal(baseline.unknownRows.length,5);assert.equal(baseline.unknownAccounts,5);
    assert.equal(baseline.unknownReservedMicroCny,'10913152');assert.equal(baseline.unknownChargedMicroCny,'10913152');
    const current=Object.entries(store.state.billing.accounts).filter(([id])=>id!==oneDreamAllowanceId).flatMap(([accountId,account])=>Object.values(account?.attempts??{}).filter(row=>row?.status==='unknown').map(row=>({accountId,requestId:row.requestId,runId:row.runId,fingerprint:row.fingerprint,sourceRefs:structuredClone(row.sourceRefs),status:row.status,reservedMicroCny:row.reservedMicroCny,chargedMicroCny:row.chargedMicroCny}))).sort((a,b)=>`${a.accountId}\0${a.requestId}`.localeCompare(`${b.accountId}\0${b.requestId}`,'en'));
    assert.deepEqual(baseline.unknownRows,current);
    const fifth=baseline.unknownRows.find(row=>row.chargedMicroCny==='2100352');assert.ok(fifth);
    store.state.billing.accounts[fifth.accountId].attempts[fifth.requestId].sourceRefs[0].id='changed-local-source';store.save();
    assert.throws(()=>readOneDreamAuthorization(store,{now}),/one_dream_legacy_history_changed/);
  }finally{store.close();}
});

test('first live init rejects a randomized history missing its fifth unknown before creating authorization or allowance',t=>{
  const h=prepareFreshDream02History(t,{mode:'live',authorize:false}),store=new Store(h.directory);
  try{
    const randomized=randomizeLegacyUnknownIdentities(store),fifth=randomized.find(row=>row.chargedMicroCny==='2100352');assert.ok(fifth);
    delete store.state.billing.accounts[fifth.accountId].attempts[fifth.requestId];store.save();
    const mutated=structuredClone(store.state.billing.accounts);let committed=false;
    assert.throws(()=>initOneDreamAuthorization(store,{confirmation:h.confirmation,mode:'live',now,fault:phase=>{if(phase.includes('authorization_commit'))committed=true;}}),/one_dream_history_unknown_mismatch/);
    assert.equal(committed,false);assert.equal(store.state[oneDreamAuthorizationField],undefined);assert.equal(store.state.billing.accounts[oneDreamAllowanceId],undefined);
    assert.deepEqual(store.state.billing.accounts,mutated);
  }finally{store.close();}
});

test('first live init rejects a randomized history with a changed fifth-row amount before creating authorization or allowance',t=>{
  const h=prepareFreshDream02History(t,{mode:'live',authorize:false}),store=new Store(h.directory);
  try{
    const randomized=randomizeLegacyUnknownIdentities(store),fifth=randomized.find(row=>row.chargedMicroCny==='2100352');assert.ok(fifth);
    store.state.billing.accounts[fifth.accountId].attempts[fifth.requestId].chargedMicroCny='2100351';store.save();
    const mutated=structuredClone(store.state.billing.accounts);let committed=false;
    assert.throws(()=>initOneDreamAuthorization(store,{confirmation:h.confirmation,mode:'live',now,fault:phase=>{if(phase.includes('authorization_commit'))committed=true;}}),/one_dream_history_unknown_mismatch/);
    assert.equal(committed,false);assert.equal(store.state[oneDreamAuthorizationField],undefined);assert.equal(store.state.billing.accounts[oneDreamAllowanceId],undefined);
    assert.deepEqual(store.state.billing.accounts,mutated);
  }finally{store.close();}
});

for(const scenario of [
  {mode:'tls',phase:'transport',diagnosticClass:'transport_tls_failure',requests:0},
  {mode:'aborted',phase:'response_read',diagnosticClass:'response_aborted',requests:1},
  {mode:'read',phase:'response_read',diagnosticClass:'response_read_failure',requests:1},
  {mode:'too_large',phase:'response_read',diagnosticClass:'response_too_large',requests:1}
])test(`real HTTPS ${scenario.mode} failure persists one bounded receipt and survives reopen`,async t=>{
  const value=await localHttpsFailure(t,scenario.mode);
  assert.equal(value.status.status,'failed');assert.equal(value.peer.requests,scenario.requests);
  assert.equal(value.attempt.status,'unknown');assert.equal(value.attempt.chargedMicroCny,'134272');
  assert.equal(value.before.length,1);assert.deepEqual(value.after,value.before);
  const receipt=value.after[0];assert.equal(receipt.phase,scenario.phase);assert.equal(receipt.diagnosticClass,scenario.diagnosticClass);
  assert.equal(receipt.dispatchIntent,'persisted');assert.equal(receipt.delivery,'unknown');assert.equal(receipt.usage,'unknown');assert.equal(receipt.money,'unknown');
  const journalText=fs.readFileSync(diagnosticJournalPath(value.h.directory),'utf8');
  for(const marker of ['PRIVATE-HTTPS-BODY-SENTINEL','127.0.0.1','LOCAL-HTTPS-FIXTURE-ONLY','provider_response_','UNABLE_TO_','CERT_','SELF_SIGNED'])assert.equal(journalText.includes(marker),false,marker);
  const store=new Store(value.h.directory);
  try{
    for(const [id,account]of Object.entries(value.h.oldAccounts))assert.equal(JSON.stringify(store.state.billing.accounts[id]),JSON.stringify(account),id);
    const historical=Object.entries(store.state.billing.accounts).filter(([id])=>id!==oneDreamAllowanceId).flatMap(([,account])=>Object.values(account.attempts??{})).filter(row=>row.status==='unknown');
    assert.equal(historical.length,5);assert.equal(historical.reduce((sum,row)=>sum+BigInt(row.chargedMicroCny),0n).toString(),'10913152');
  }finally{store.close();}
});

test('closed diagnostic classes cover pre-dispatch, DNS/connect/TLS/write, HTTP and arbitrary exceptions without body or raw secrets',async t=>{
  assert.equal(classifyNativeTransport(Object.assign(new Error('PRIVATE'),{code:'CERT_HAS_EXPIRED'})),'tls');
  assert.equal(classifyNativeTransport(new Error('PRIVATE TLS failure')),'not_classified');
  const pre=await failedRun(t,{transport:async()=>{throw Error('must_not_dispatch');},fault:phase=>{if(phase==='reserved')throw Error('PRIVATE-UNEXPECTED-FAULT');}});
  assert.equal(pre.loopback.posts,0);assert.equal(pre.receipts.length,1);assert.equal(pre.receipts[0].diagnosticClass,'unclassified');assert.equal(pre.receipts[0].dispatchIntent,'none');
  assert.equal(fs.readFileSync(diagnosticJournalPath(pre.h.directory),'utf8').includes('PRIVATE-UNEXPECTED-FAULT'),false);
  for(const [code,expected] of [['ENOTFOUND','transport_dns_failure'],['ECONNREFUSED','transport_connect_failure'],['CERT_HAS_EXPIRED','transport_tls_failure'],['EPIPE','transport_write_failure']]){
    const value=await failedRun(t,{transport:async()=>{throw Object.assign(new Error('PRIVATE-TRANSPORT-SENTINEL'),{code});}});
    assert.equal(value.status.status,'failed');assert.equal(value.loopback.posts,1);assert.equal(value.receipts.length,1);
    const receipt=value.receipts[0];assert.equal(receipt.phase,'transport');assert.equal(receipt.diagnosticClass,expected);assert.equal(receipt.dispatchIntent,'persisted');
    assert.equal(receipt.delivery,'unknown');assert.equal(receipt.usage,'unknown');assert.equal(receipt.money,'unknown');assert.equal(receipt.settled,false);
    assert.equal(rowsFor(value.engine)[0].status,'unknown');assert.equal(rowsFor(value.engine)[0].chargedMicroCny,'134272');
    const text=fs.readFileSync(diagnosticJournalPath(value.h.directory),'utf8');assert.equal(text.includes('PRIVATE-TRANSPORT-SENTINEL'),false);assert.equal(text.includes(code),false);
  }
  for(const [status,expected] of [[401,'http_unauthorized'],[429,'http_rate_limited'],[503,'http_server_error']]){
    const value=await failedRun(t,{transport:async()=>new Response(null,{status})});
    assert.equal(value.receipts.length,1);assert.equal(value.receipts[0].phase,'http_response');assert.equal(value.receipts[0].diagnosticClass,expected);assert.equal(value.receipts[0].dispatchIntent,'persisted');
    assert.equal(value.engine.run(value.gate.id).scenes.length,0);assert.equal(rowsFor(value.engine)[0].status,'unknown');
  }
  const arbitrary=await failedRun(t,{transport:async()=>{throw new Error('PRIVATE-BODY-SENTINEL API-KEY-LIKE-VALUE 127.0.0.1');}});
  assert.equal(arbitrary.receipts[0].diagnosticClass,'unclassified');assert.equal(arbitrary.receipts[0].dispatchIntent,'persisted');
  const arbitraryText=fs.readFileSync(diagnosticJournalPath(arbitrary.h.directory),'utf8');
  for(const marker of ['PRIVATE-BODY-SENTINEL','API-KEY-LIKE-VALUE','127.0.0.1','one_dream_provider_transport_failed'])assert.equal(arbitraryText.includes(marker),false,marker);
});

test('stream, protocol and storage failures remain bounded; diagnostic and ledger save failures never report success',async t=>{
  const scenarios=[
    {body:new ReadableStream({start(controller){controller.error(Object.assign(new Error('PRIVATE-BODY-SENTINEL'),{name:'AbortError'}));}}),expected:'response_aborted'},
    {body:'x'.repeat(70000),expected:'response_too_large'},
    {body:new ReadableStream({start(controller){controller.error(new Error('PRIVATE-BODY-SENTINEL'));}}),expected:'response_read_failure'}
  ];
  for(const scenario of scenarios){
    const value=await failedRun(t,{transport:async()=>new Response(scenario.body,{status:200})});
    assert.equal(value.receipts.length,1);assert.equal(value.receipts[0].diagnosticClass,scenario.expected);
    assert.equal(fs.readFileSync(diagnosticJournalPath(value.h.directory),'utf8').includes('PRIVATE-BODY-SENTINEL'),false);
  }
  for(const scenario of [
    {body:()=>new Response('not-json',{status:200}),expected:'response_invalid_json'},
    {body:()=>new Response(JSON.stringify({model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(sceneData(0))}}]}),{status:200}),expected:'response_usage_rejected'},
    {body:()=>new Response(JSON.stringify({model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify({event:'PRIVATE-BODY-SENTINEL'})}}],usage:{prompt_tokens:180,completion_tokens:90,total_tokens:270}}),{status:200}),expected:'response_stage_rejected'}
  ]){
    const value=await failedRun(t,{transport:async()=>scenario.body()});assert.equal(value.receipts.length,1);assert.equal(value.receipts[0].phase,'response_protocol');assert.equal(value.receipts[0].diagnosticClass,scenario.expected);
  }
  await withRuntime(t,{transport:async()=>new Response(null,{status:503})},async({engine,gate,loopback,h})=>{
    engine.client.diagnosticJournal={append(){throw Error('PRIVATE-STORAGE-SENTINEL');}};
    const status=await engine.execute(gate.id);assert.equal(status.status,'failed');assert.equal(loopback.posts,1);assert.equal(rowsFor(engine)[0].status,'unknown');
    assert.equal(Object.values(engine.store.state.entries).some(entry=>entry.origin==='dream'),false);
  });
  await withRuntime(t,{transport:async()=>{throw Error('must_not_dispatch');}},async({engine,gate,loopback,h})=>{
    const run=engine.run(gate.id);run.status='running';engine.store.save();
    const original=engine.store.save.bind(engine.store);let failed=false;
    engine.store.save=()=>{if(!failed){failed=true;throw Error('PRIVATE-LEDGER-SAVE-SENTINEL');}return original();};
    await assert.rejects(engine.client.send({allowanceId:oneDreamAllowanceId,requestId:`stage-${gate.id}-scene-0`,runId:gate.id,payload:{stage:'scene',index:0,snapshot:run.snapshot,scenes:[]},credential:oneDreamLocalCredential,signal:new AbortController().signal,publish:()=>{throw Error('not_reached');}}),/storage_io_failure/);
    assert.equal(loopback.posts,0);
    const receipts=readDiagnosticReceipts(h.directory);assert.equal(receipts.length,1);assert.equal(receipts[0].phase,'pre_dispatch');assert.equal(receipts[0].diagnosticClass,'local_storage_failure');assert.equal(receipts[0].dispatchIntent,'none');
  });
});

test('duplicate request and reopen add no call, preserve both unknown groups byte-identically, and keep receipts body-free',async t=>{
  const value=await failedRun(t,{transport:async()=>{throw Object.assign(new Error('PRIVATE-TRANSPORT-SENTINEL'),{code:'EAI_AGAIN'});}});
  assert.equal(value.receipts.length,1);const original=structuredClone(value.receipts[0]);assert.equal(value.loopback.posts,1);
  const attempt=rowsFor(value.engine)[0],requestId=attempt.requestId,payload={stage:'scene',index:0,snapshot:value.engine.run(value.gate.id).snapshot,scenes:[]};
  const run=value.engine.run(value.gate.id),previous=run.status;run.status='running';
  try{await assert.rejects(value.engine.client.send({allowanceId:oneDreamAllowanceId,requestId,runId:value.gate.id,payload,credential:oneDreamLocalCredential,signal:new AbortController().signal,publish:()=>{throw Error('not_reached');}}),/one_dream_ambiguous_attempt/);}finally{run.status=previous;}
  assert.equal(value.loopback.posts,1);assert.deepEqual(readDiagnosticReceipts(value.h.directory),[original]);
  value.engine.close();
  assert.deepEqual(readDiagnosticReceipts(value.h.directory),[original]);
  let posts=0;const reopenedLoopback=Object.freeze({kind:oneDreamLoopbackKind,host:'127.0.0.1',async transport(){posts++;throw Error('must_not_dispatch');},get posts(){return posts;}});
  const reopened=new DiagnosticOneDreamRuntime(value.h.directory,{mode:'offline',loopback:reopenedLoopback,enabled:true,timeoutMs:60000});
  try{assert.throws(()=>reopened.prepare({resume:true,dispatchKind:'rehearsal',create:false}),/inline_resume_requires_committed_prefix|one_dream_ambiguous_attempt/);}finally{reopened.close();}
  assert.equal(posts,0);
  const store=new Store(value.h.directory);
  try{
    for(const [id,account]of Object.entries(value.h.oldAccounts))assert.equal(JSON.stringify(store.state.billing.accounts[id]),JSON.stringify(account),id);
    const unknowns=Object.values(store.state.billing.accounts).flatMap(account=>Object.values(account.attempts)).filter(row=>row.status==='unknown');
    assert.equal(unknowns.length>=5,true);
    assert.equal(Object.values(store.state.entries).some(entry=>entry.origin==='dream'),false);
  }finally{store.close();}
  const journalText=fs.readFileSync(diagnosticJournalPath(value.h.directory),'utf8');
  for(const marker of [oneDreamLocalCredential,oneDreamLoopbackScenes[0],oneDreamLoopbackScenes[1],'127.0.0.1','Authorization','Bearer'])assert.equal(journalText.includes(marker),false,marker);
});

test('dedicated no-Key checker proves the fresh offline loop, one-use ledger and reader without provider access',()=>{
  const run=spawnSync(process.execPath,['scripts/check-nv-deepseek-fresh-dream-02.mjs'],{cwd:root,encoding:'utf8',timeout:45000});
  assert.equal(run.status,0,run.stderr);assert.equal(run.stderr,'');
  const value=JSON.parse(run.stdout);
  assert.equal(value.status,'passed');assert.equal(value.rehearsal.status,'completed');assert.equal(value.rehearsal.scenesSaved,2);assert.equal(value.rehearsal.wakeSaved,true);
  assert.equal(value.rehearsal.settledCalls,3);assert.equal(value.credentialSupplierCalls,0);assert.equal(value.providerNetworkRequests,0);
  assert.equal(value.reader.providerOrModelLabelVisible,false);assert.equal(value.reader.oldAccountsUnchanged,true);assert.equal(value.liveRequestStarted,false);
});
