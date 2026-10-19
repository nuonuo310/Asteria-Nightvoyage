import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createPeerCodexFixtureStageTransport as peer,createNativeCodexFixtureStageTransport as native} from '../scripts/codex-fixture-stage-transport.mjs';
import {CodexAdapter,selectAdapter} from '../scripts/codex-local-model-port.mjs';
import {ModelPortNightvoyage} from '../scripts/codex-local-model-runtime.mjs';
const seed=()=>JSON.parse(fs.readFileSync(new URL('../examples/adapter-boundary.snapshot.json',import.meta.url)));
function setup(t,options={}){const root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-fixture-stage-test-')),directory=path.join(root,'book'),transport=peer(options),selection=selectAdapter({primary:new CodexAdapter({model_id:'gpt-5.6-sol',stageTransport:transport})});let e=new ModelPortNightvoyage(directory,{selection});t.after(async()=>{await transport.close();e.close();fs.rmSync(root,{recursive:true,force:true});});return {transport,get e(){return e;},reopen(){e.close();e=new ModelPortNightvoyage(directory,{selection});return e;}};}
function safe(report){assert.equal(report.kind,'independent_node_peer');assert.equal(report.ownedProcessClosed,true);assert.equal(report.temporaryCleanupComplete,true);assert.equal(report.dispatchEnabled,false);assert.equal(report.modelEntitlementVerified,false);assert.equal(report.accountAuthorizationRequested,false);assert.equal(report.credentialEnvironmentSupplied,false);assert.ok(report.fixtureModelPosts<=1);assert.ok(!JSON.stringify(report).includes('fictional-private-'));}
test('three real local HTTP/stdio exchanges publish typed scenes/wake only after children close; replay and withdrawal retain invariants',async t=>{
 const s=setup(t),id=s.e.start('fiction-harness','fiction-harness',seed());await s.e.execute(id);const r=s.e.result(id);assert.equal(r.receipt.status,'completed');assert.equal(r.receipt.external_calls_started,0);assert.equal(r.receipt.protocol_version,'codex-peer-fixture-stage-v1');assert.equal(r.receipt.auth_mode,'synthetic_stub');assert.equal(r.receipt.checkpoint.saved_scenes,2);assert.equal(r.wake.fragment,r.dream.scenes[1].event);const original=JSON.stringify(r.dream);
 await assert.rejects(s.transport.exchange({}),/budget_exhausted/);assert.equal(s.transport.status().exchangesStarted,3);
 const reports=s.transport.status().reports;assert.equal(reports.length,3);for(const p of reports){safe(p);assert.equal(p.status,'fixed_stage_completion_observed');assert.equal(p.fixtureModelPosts,1);assert.equal(p.finalObservation.turnCompleted,true);}
 s.reopen();await s.e.execute(id);assert.equal(s.transport.status().exchangesStarted,3);assert.equal(JSON.stringify(s.e.result(id).dream),original);s.e.withdraw(seed().sources[0].id);s.reopen();assert.equal(s.e.result(id).dream,null);
});
for(const scenario of ['stage_wrong_text','stage_wrong_input','stage_failed','stage_tool','stage_exit'])test(`${scenario} cannot publish a scene or cause a repair`,async t=>{
 const s=setup(t,{scenario}),id=s.e.start('fiction-reject','fiction-reject',seed());await s.e.execute(id);assert.equal(s.e.status(id).status,'failed');assert.equal(s.e.status(id).stagesSaved,0);assert.equal(s.e.result(id).dream,null);assert.equal(s.transport.status().exchangesStarted,1);safe(s.transport.status().reports[0]);s.reopen();await s.e.execute(id);assert.equal(s.transport.status().exchangesStarted,1);
});
test('second child death preserves one checkpoint but cannot resume an ambiguous dispatch or switch transport',async t=>{
 const s=setup(t,{scenario:'second_stage_exit'}),id=s.e.start('fiction-crash','fiction-crash',seed());await s.e.execute(id);assert.equal(s.e.status(id).stagesSaved,1);assert.equal(s.transport.status().exchangesStarted,2);s.reopen();await assert.rejects(s.e.resume(id),/ambiguous_attempt/);await s.e.execute(id);assert.equal(s.transport.status().exchangesStarted,2);assert.equal(s.e.result(id).dream,null);
});
test('timeout and source withdrawal suppress pending stage and no wake is dispatched',async t=>{
 const s=setup(t,{scenario:'stage_stall',timeoutMs:150}),id=s.e.start('fiction-timeout','fiction-timeout',seed());await s.e.execute(id);assert.equal(s.e.status(id).status,'failed');assert.equal(s.transport.status().exchangesStarted,1);assert.equal(s.e.result(id).dream,null);
 const q=setup(t,{scenario:'stage_stall'}),other=q.e.start('fiction-withdraw','fiction-withdraw',seed()),work=q.e.execute(other);await new Promise(r=>setTimeout(r,50));q.e.withdraw(seed().sources[0].id);await work;assert.equal(q.e.result(other).dream,null);q.reopen();assert.equal(q.e.result(other).dream,null);assert.ok(q.transport.status().exchangesStarted<=1);
});
test('native launch is explicit, fixed-model and cannot accept caller auth or endpoint; getters stay inert',()=>{
 for(const v of [{executable:'codex'},{executable:'/missing/codex',accessToken:'fictional'},{executable:'/missing/codex',provider:'openai'}])assert.throws(()=>native(v));
 for(const v of [{executable:'/missing/codex'},{model_id:'other'},{env:{}},{scenario:'unknown'}])assert.throws(()=>peer(v));let touched=false;assert.throws(()=>peer({get scenario(){touched=true;return 'stage_success';}}));assert.equal(touched,false);
});

test('public checker runs only independent local fixtures by default and reports three settled stages',()=>{
 const r=spawnSync(process.execPath,[fileURLToPath(new URL('../scripts/check-codex-fixture-stages.mjs',import.meta.url))],{encoding:'utf8',timeout:10000});assert.equal(r.status,0);const d=JSON.parse(r.stdout);assert.equal(d.nativeCodexProcessStarted,false);assert.equal(d.realModelRequests,0);assert.equal(d.transport.inFlight,false);assert.equal(d.transport.exchangesSettled,3);assert.equal(d.transport.reports.length,3);
});
