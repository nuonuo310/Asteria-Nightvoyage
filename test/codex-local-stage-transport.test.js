import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createCodexLocalStageTransport as create,isCodexLocalStageTransport} from '../scripts/codex-local-stage-transport.mjs';
import {CodexAdapter,selectAdapter,stageRequest,dreamModelPortVersion} from '../scripts/codex-local-model-port.mjs';
import {ModelPortNightvoyage} from '../scripts/codex-local-model-runtime.mjs';
const model='fiction-owned-stage-model';
const seed=()=>JSON.parse(fs.readFileSync(new URL('../examples/adapter-boundary.snapshot.json',import.meta.url)));
const request=()=>stageRequest({contract_version:dreamModelPortVersion,request_id:'fiction-stage',run_id:'fiction-run',stage:'scene',index:0,snapshot:seed(),scenes:[]});
function setup(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-owned-stage-test-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return path.join(root,'book');}
test('issued transport completes persistent two-scene/wake loop and replay creates no child; withdrawal survives reopen',async t=>{
 const dir=setup(t),transport=create({model_id:model}),adapter=new CodexAdapter({model_id:model,stageTransport:transport}),selection=selectAdapter({primary:adapter});let e=new ModelPortNightvoyage(dir,{selection});t.after(async()=>{e.close();await transport.close();});
 const id=e.start('fiction-owned','fiction-owned',seed());await e.execute(id);const r=e.result(id);
 assert.equal(r.receipt.status,'completed');assert.equal(r.receipt.external_calls_started,0);assert.equal(r.receipt.auth_mode,'synthetic_stub');assert.equal(r.receipt.provider_kind,'openai_protocol_simulator');assert.equal(r.receipt.checkpoint.saved_scenes,2);assert.equal(r.receipt.checkpoint.wake_saved,true);
 assert.equal(transport.status().successfulChildClosures,3);const original=JSON.stringify(e.read(r.dream.id));e.close();e=new ModelPortNightvoyage(dir,{selection});await e.execute(id);assert.equal(transport.status().exchangesStarted,3);assert.equal(JSON.stringify(e.read(r.dream.id)),original);
 e.withdraw(seed().sources[0].id);e.close();e=new ModelPortNightvoyage(dir,{selection});assert.equal(e.result(id).dream,null);await e.execute(id);assert.equal(transport.status().exchangesStarted,3);
});
test('overlap rejected without a second child; close cancels owned exchange and permanently disables readiness',async()=>{
 const transport=create({model_id:model}),a=new CodexAdapter({model_id:model,stageTransport:transport});
 const work=a.generate(request());const rejected=assert.rejects(work,/cancelled/);
 await assert.rejects(a.generate(request()),/adapter_unavailable/);await transport.close();await rejected;
 assert.equal(transport.status().exchangesStarted,1);assert.equal(transport.status().exchangesSettled,1);assert.equal(transport.status().inFlight,false);assert.equal(a.preflight().ready,false);await assert.rejects(a.generate(request()),/adapter_unavailable/);
});
test('pre-aborted request starts no exchange and native defaults remain unavailable',async()=>{
 const transport=create({model_id:model}),a=new CodexAdapter({model_id:model,stageTransport:transport}),c=new AbortController();c.abort();await assert.rejects(a.generate(request(),{signal:c.signal}),/cancelled/);assert.equal(transport.status().exchangesStarted,0);await transport.close();assert.equal(new CodexAdapter({model_id:model}).preflight().ready,false);
});
test('branded transport rejects forged owner, model mismatch and simulator combination before invocation',()=>{
 let invoked=false;assert.throws(()=>new CodexAdapter({model_id:model,stageTransport:{exchange(){invoked=true;}}}),/unreviewed/);assert.equal(invoked,false);
 const transport=create({model_id:model});assert.equal(isCodexLocalStageTransport(transport),true);assert.equal(isCodexLocalStageTransport({...transport}),false);
 assert.throws(()=>new CodexAdapter({model_id:'other',stageTransport:transport}),/unreviewed/);assert.throws(()=>new CodexAdapter({model_id:model,stageTransport:transport,simulator(){}}),/unreviewed/);
});
test('closed configuration cannot supply native executable, credentials, HTTP, fixtures or getters',()=>{
 for(const options of [{model_id:model,executable:'codex'},{model_id:model,env:{}},{model_id:model,scenario:'success'},{model_id:model,login:true},{model_id:'unknown'},{model_id:model,timeoutMs:0}])assert.throws(()=>create(options));
 let touched=false;assert.throws(()=>create({get model_id(){touched=true;return model;}}));assert.equal(touched,false);
});
test('engine call cap retains first scene; reopen cannot spawn beyond budget or change protocol owner',async t=>{
 const dir=setup(t),transport=create({model_id:model}),selection=selectAdapter({primary:new CodexAdapter({model_id:model,stageTransport:transport})});let e=new ModelPortNightvoyage(dir,{selection});t.after(async()=>{try{e.close();}catch{}await transport.close();});const id=e.start('fiction-cap','fiction-cap',seed(),{maxCalls:1});await e.execute(id);assert.equal(e.status(id).stagesSaved,1);assert.equal(e.status(id).error_category,'budget_exhausted');e.close();e=new ModelPortNightvoyage(dir,{selection});await e.execute(id);assert.equal(transport.status().exchangesStarted,1);e.close();
 assert.throws(()=>new ModelPortNightvoyage(dir,{selection:selectAdapter({primary:new CodexAdapter({model_id:model,simulator(){throw Error('must not run');}})})}),/foreign_execution_owner/);
});
