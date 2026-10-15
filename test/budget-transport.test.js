import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { Store } from '../src/store.js';
import { BudgetLedger, maximumCost } from '../src/budget-ledger.js';
import { GatedDeepSeekClient } from '../src/gated-deepseek-client.js';
import { hash } from '../src/contract.js';
const fixture=JSON.parse(fs.readFileSync(new URL('../fixtures/paper-harbor.json',import.meta.url)));
const fakePrice={model:'deepseek-flash',contextTokenLimit:1000,inputMicroCnyPerMillion:1000000,outputMicroCnyPerMillion:2000000,reference:'https://api-docs.deepseek.com/TEST-ONLY-NOT-A-REAL-PRICE',checkedAt:1};
function allowance(patch={}){return {id:'trial',mode:'stub',approved:true,expiresAt:Date.now()+3600000,limits:{maxRuns:3,maxCalls:9,maxMicroCny:1000000},pricing:fakePrice,...patch};}
function payload(){const f=structuredClone(fixture);f.sources[0].grant.modelEgress=true;return {stage:'scene',index:0,snapshot:f,scenes:[]};}
const raw={event:'A fictional blue paper boat.',appraisal:{goalEffect:0,control:0.5,uncertainty:0.5},delta:{valence:0,arousal:0}};
function response(data=raw){return new Response(JSON.stringify({model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(data)}}],usage:{prompt_tokens:100,completion_tokens:50,total_tokens:150}}),{status:200,headers:{'Content-Type':'application/json'}});}
function setup(t,{options={},config=allowance()}={}){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-budget-')),store=new Store(directory);
 const client=new GatedDeepSeekClient(store,{enabled:true,mode:'stub',fetchImpl:async()=>response(),...options});
 client.ledger.approve(config);
 t.after(()=>{client.close();store.close();fs.rmSync(directory,{recursive:true,force:true});});return {directory,store,client,config};
}
function request(patch={}){return {allowanceId:'trial',requestId:'call1',runId:'dream1',payload:payload(),credential:'dummy-offline-credential',...patch};}
const reservation=(requestId='r',runId='s')=>({requestId,runId,fingerprint:hash({requestId,runId}),sourceRefs:[{id:'fiction-paper',version:'1'}],maxOutputTokens:400});
test('money uses integer ceiling and full reviewed context reservation, never fake byte estimates',()=>{
 assert.equal(maximumCost(fakePrice,400),1800n);
 assert.equal(maximumCost({...fakePrice,inputMicroCnyPerMillion:1,outputMicroCnyPerMillion:1},400),2n);
 assert.throws(()=>maximumCost(fakePrice,401),/invalid_cost_bound/);
});
test('transport is disabled by default, and missing credential, grant or allowance prevents dispatch',async t=>{
 let calls=0;const {store,client}=setup(t,{options:{fetchImpl:async()=>{calls++;return response();}}});
 const disabled=new GatedDeepSeekClient(store);await assert.rejects(disabled.send(request()),/transport_disabled/);disabled.close();
 await assert.rejects(client.send(request({credential:''})),/credential_required/);
 const p=payload();p.snapshot.sources[0].grant.modelEgress=false;await assert.rejects(client.send(request({payload:p})),/source_egress/);
 await assert.rejects(client.send(request({allowanceId:'missing'})),/unknown_allowance/);
 assert.equal(calls,0);assert.equal(client.ledger.status('trial').calls,0);
});
test('explicit approval and reviewed pricing are required; existing allowance cannot be reset',t=>{
 const {client,config}=setup(t);assert.throws(()=>client.ledger.approve({...config,approved:false}),/allowance_not_approved/);
 assert.throws(()=>client.ledger.approve({...config,id:'new',pricing:{...fakePrice,reference:'https://example.com'}}),/invalid_pricing/);
 assert.throws(()=>client.ledger.approve({...config,limits:{...config.limits,maxCalls:100}}),/allowance_conflict/);
 assert.equal(client.ledger.approve(config).calls,0);
});
test('stub completion settles normalized usage, typed output, and replay sends no second request',async t=>{
 let calls=0;const {client}=setup(t,{options:{fetchImpl:async(url,init)=>{calls++;assert.equal(url,'https://api.deepseek.com/chat/completions');assert.equal(init.redirect,'error');assert.ok(init.headers.Authorization.startsWith('Bearer dummy-'));return response();}}});
 const out=await client.send(request());assert.equal(out.receipt.status,'settled');assert.equal(out.receipt.chargedMicroCny,'200');assert.equal(out.generated.isRealityFact,false);
 out.receipt.sourceRefs.length=0;assert.equal(client.ledger.status('trial').attempts[0].sourceRefs.length,1);
 const replay=await client.send(request());assert.equal(replay.replayed,true);assert.equal(replay.generated,null);assert.equal(calls,1);
 await assert.rejects(client.send(request({payload:{...payload(),snapshot:{...payload().snapshot,version:'2'}}})),/request_conflict/);
});
test('run, call and monetary caps accumulate across attempts and do not dispatch over budget',async t=>{
 for(const limits of [{maxRuns:1,maxCalls:9,maxMicroCny:1000000},{maxRuns:3,maxCalls:1,maxMicroCny:1000000},{maxRuns:3,maxCalls:9,maxMicroCny:100}]){
  let calls=0;const {client}=setup(t,{config:allowance({limits}),options:{fetchImpl:async()=>{calls++;return response();}}});
  if(limits.maxMicroCny===100){await assert.rejects(client.send(request()),/allowance_exhausted/);assert.equal(calls,0);}
  else {await client.send(request());await assert.rejects(client.send(request({requestId:'call2',runId:'dream2'})),/allowance_exhausted/);assert.equal(calls,1);}
 }
});
test('failed dispatch retains reservation; retry with a new ID counts again',async t=>{
 let calls=0;const {client}=setup(t,{options:{fetchImpl:async()=>{calls++;throw new Error('PRIVATE RAW FAILURE');}}});
 await assert.rejects(client.send(request()),e=>e.message==='request_failed');
 assert.equal(client.ledger.status('trial').heldOrSpentMicroCny,'1800');assert.equal(client.ledger.status('trial').attempts[0].status,'unknown');
 assert.equal((await client.send(request())).replayed,true);assert.equal(calls,1);
 await assert.rejects(client.send(request({requestId:'retry'})),/request_failed/);assert.equal(client.ledger.status('trial').calls,2);assert.equal(calls,2);
});
test('ledger survives reopen with totals, duplicate IDs and immutable allowance',async t=>{
 let calls=0;const {client,store,directory,config}=setup(t,{options:{fetchImpl:async()=>{calls++;return response();}}});
 await client.send(request());client.close();store.close();const reopened=new Store(directory);const next=new GatedDeepSeekClient(reopened,{enabled:true,mode:'stub',fetchImpl:async()=>{calls++;return response();}});
 next.ledger.approve(config);assert.equal(next.ledger.status('trial').heldOrSpentMicroCny,'200');assert.equal((await next.send(request())).replayed,true);assert.equal(calls,1);next.close();reopened.close();
});
test('actual child-process exit after reservation reopens unknown and retains the full hold',t=>{
 const {store,client,directory,config}=setup(t);client.close();store.close();
 const script=`import {Store} from './src/store.js';import {BudgetLedger} from './src/budget-ledger.js';const s=new Store(process.argv[1]);const l=new BudgetLedger(s);l.reserve('trial',JSON.parse(process.argv[2]));process.exit(74);`;
 const child=spawnSync(process.execPath,['--input-type=module','-e',script,directory,JSON.stringify(reservation())],{cwd:new URL('..',import.meta.url),encoding:'utf8'});assert.equal(child.status,74,child.stderr);
 const reopened=new Store(directory),ledger=new BudgetLedger(reopened);ledger.approve(config);assert.equal(ledger.status('trial').attempts[0].status,'unknown');assert.equal(ledger.status('trial').heldOrSpentMicroCny,'1800');assert.equal(ledger.reserve('trial',reservation()).replayed,true);reopened.close();
});
test('cancel before dispatch uses no allowance; cancel in-flight keeps hold and ignores late body',async t=>{
 let mark,deliver,calls=0;const started=new Promise(resolve=>mark=resolve);const {client}=setup(t,{options:{fetchImpl:async()=>{calls++;mark();return new Promise(resolve=>deliver=resolve);}}});
 const early=new AbortController();early.abort();await assert.rejects(client.send(request({signal:early.signal})),/cancelled/);assert.equal(client.ledger.status('trial').calls,0);
 const controller=new AbortController();const work=client.send(request({signal:controller.signal}));await started;controller.abort();await assert.rejects(work,/cancelled/);
 deliver(response());await new Promise(resolve=>setImmediate(resolve));assert.equal(calls,1);assert.equal(client.ledger.status('trial').attempts[0].status,'unknown');assert.equal(client.ledger.status('trial').heldOrSpentMicroCny,'1800');
});
test('timeout covers noncooperative HTTP and retains ambiguous cost',async t=>{
 const {client}=setup(t,{options:{timeoutMs:5,fetchImpl:async()=>new Promise(()=>{})}});await assert.rejects(client.send(request()),/timeout/);assert.equal(client.ledger.status('trial').attempts[0].status,'unknown');
});
test('withdraw in-flight aborts or suppresses response and ledger stores no source or dream body',async t=>{
 let mark,deliver;const started=new Promise(resolve=>mark=resolve),{client,store,directory}=setup(t,{options:{fetchImpl:async()=>{mark();return new Promise(resolve=>deliver=resolve);}}});
 const work=client.send(request());await started;client.withdraw('fiction-paper');await assert.rejects(work,/cancelled/);deliver(response());await new Promise(resolve=>setImmediate(resolve));
 const json=fs.readFileSync(path.join(directory,'state.json'),'utf8');assert.ok(!json.includes(fixture.sources[0].text));assert.ok(!json.includes(raw.event));assert.ok(!json.includes('dummy-offline-credential'));
 await assert.rejects(client.send(request({requestId:'after'})),/source_egress/);assert.deepEqual(store.state.entries,{});
});
test('direct store withdrawal also rejects late content, even without client cancellation hook',async t=>{
 let mark,deliver;const started=new Promise(resolve=>mark=resolve),{client,store}=setup(t,{options:{fetchImpl:async()=>{mark();return new Promise(resolve=>deliver=resolve);}}});
 const work=client.send(request());await started;store.withdraw('fiction-paper');deliver(response());await assert.rejects(work,/source_egress/);assert.equal(client.ledger.status('trial').attempts[0].status,'unknown');
});
test('HTTP, JSON and claimed usage violations never refund unknown attempts or publish content',async t=>{
 for(const kind of ['http','json','excess']){
  const {client}=setup(t,{options:{fetchImpl:async()=>{
   if(kind==='http')return new Response('PRIVATE ERROR BODY',{status:401});
   if(kind==='json')return new Response('not json',{status:200});
   const r=await response().json();r.usage={prompt_tokens:1001,completion_tokens:50,total_tokens:1051};return new Response(JSON.stringify(r),{status:200});
  }}});
  await assert.rejects(client.send(request()),e=>!e.message.includes('PRIVATE'));
  assert.equal(client.ledger.status('trial').heldOrSpentMicroCny,'1800');assert.equal(client.ledger.status('trial').attempts[0].status,'unknown');
 }
});
test('oversized and stalled body reads are bounded and aborted',async t=>{
 for(const stalled of [false,true]){
  const {client}=setup(t,{options:{timeoutMs:20,fetchImpl:async()=>new Response(stalled?new ReadableStream({start(){}}):'x'.repeat(65537))}});
  await assert.rejects(client.send(request()),stalled?/timeout/:/too_large/);assert.equal(client.ledger.status('trial').attempts[0].status,'unknown');
 }
});
test('storage failures in reservation or dispatch prevent HTTP',async t=>{
 for(const phase of ['reserve','dispatch']){
  let calls=0;const {client,store,directory}=setup(t,{options:{fetchImpl:async()=>{calls++;return response();},fault:p=>{if(phase==='dispatch'&&p==='reserved')fs.mkdirSync(path.join(directory,'snapshot.tmp'));}}});
  if(phase==='reserve')fs.mkdirSync(path.join(directory,'snapshot.tmp'));
  await assert.rejects(client.send(request()),/storage_io_failure/);assert.equal(calls,0);assert.throws(()=>store.assert(),/store_unavailable/);fs.rmdirSync(path.join(directory,'snapshot.tmp'));
 }
});
test('live mode refuses stub allowance and cannot accept an HTTP override',async t=>{
 const {store}=setup(t);assert.throws(()=>new GatedDeepSeekClient(store,{mode:'live',fetchImpl:async()=>response()}),/override_forbidden/);
 const live=new GatedDeepSeekClient(store,{enabled:true,mode:'live'});await assert.rejects(live.send(request()),/allowance_mode_mismatch/);live.close();
});
test('parallel duplicate requests dispatch once and another client does not reset active state',async t=>{
 let mark,deliver,calls=0;const started=new Promise(resolve=>mark=resolve),{client,store}=setup(t,{options:{fetchImpl:async()=>{calls++;mark();return new Promise(resolve=>deliver=resolve);}}});
 const work=client.send(request());await started;const another=new GatedDeepSeekClient(store);assert.equal(client.ledger.status('trial').attempts[0].status,'dispatched');
 assert.equal((await client.send(request())).replayed,true);deliver(response());await work;assert.equal(calls,1);another.close();
});
test('caller mutation during HTTP cannot alter checkpoint affect or stage interpretation',async t=>{
 let mark,deliver;const started=new Promise(resolve=>mark=resolve),{client}=setup(t,{options:{fetchImpl:async()=>{mark();return new Promise(resolve=>deliver=resolve);}}});
 const p=payload(),work=client.send(request({payload:p}));await started;p.stage='wake';p.scenes=[{after:{valence:99,arousal:99}}];deliver(response());const out=await work;assert.equal(out.generated.origin,'dream');assert.deepEqual(out.generated.value.before,{valence:0,arousal:0.2});
});
test('ledger records whitelist metadata and do not persist arbitrary source or usage text',t=>{
 const {client,store}=setup(t),l=client.ledger,r=reservation();r.sourceRefs[0].text='SOURCE BODY MUST NOT PERSIST';
 l.reserve('trial',r);l.dispatch('trial','r');l.settle('trial','r',{model:'deepseek-flash',usage:{inputTokens:100,outputTokens:50,totalTokens:150,extra:'USAGE BODY MUST NOT PERSIST'}});
 const value=JSON.stringify(store.state.billing);assert.ok(!value.includes('MUST NOT PERSIST'));
});
test('expired allowances, revoked metadata and mode mismatch block before reserve',async t=>{
 let calls=0;const {client,store}=setup(t,{config:allowance({expiresAt:2}),options:{fetchImpl:async()=>{calls++;return response();}}});
 await assert.rejects(client.send(request()),/expired/);assert.equal(calls,0);assert.equal(client.ledger.status('trial').calls,0);
 store.withdraw('fiction-paper');assert.throws(()=>client.ledger.reserve('trial',reservation()),/expired|withdrawn/);
});
test('a failure while settling blocks returned content and holds full reservation after reopen',async t=>{
 const {client,store,directory,config}=setup(t,{options:{fetchImpl:async()=>{fs.mkdirSync(path.join(directory,'snapshot.tmp'));return response();}}});
 await assert.rejects(client.send(request()),/storage_io_failure/);client.close();store.close();fs.rmdirSync(path.join(directory,'snapshot.tmp'));
 const reopened=new Store(directory),ledger=new BudgetLedger(reopened);ledger.approve(config);assert.equal(ledger.status('trial').heldOrSpentMicroCny,'1800');assert.equal(ledger.status('trial').attempts[0].status,'unknown');reopened.close();
});
test('default or unapproved live client never reaches native fetch',async t=>{
 const original=globalThis.fetch;let requests=0;globalThis.fetch=async()=>{requests++;throw new Error('NATIVE NETWORK MUST NOT RUN');};
 try {
  const {store}=setup(t);const disabled=new GatedDeepSeekClient(store);await assert.rejects(disabled.send(request()),/disabled/);disabled.close();
  const live=new GatedDeepSeekClient(store,{enabled:true,mode:'live'});await assert.rejects(live.send(request()),/mode_mismatch/);live.close();assert.equal(requests,0);
 } finally {globalThis.fetch=original;}
});
