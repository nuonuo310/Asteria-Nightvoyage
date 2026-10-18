import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runCodexPipeRehearsal} from '../scripts/codex-pipe-rehearsal.mjs';
import {CodexAdapter,selectAdapter,stageRequest,dreamModelPortVersion} from '../scripts/dream-model-port.mjs';
import {ModelPortNightvoyage} from '../scripts/dream-model-runtime.mjs';
const seed=()=>JSON.parse(fs.readFileSync(new URL('../examples/adapter-boundary.snapshot.json',import.meta.url),'utf8'));
const draft=()=>new CodexAdapter({model_id:'fiction-pipe-model'}).prepare(stageRequest({contract_version:dreamModelPortVersion,request_id:'fiction-request',run_id:'fiction-run',stage:'scene',index:0,snapshot:seed(),scenes:[]}));
test('fixed independent Node peer completes actual stdio handshake and exits before returning validated data',async()=>{
 const r=await runCodexPipeRehearsal(draft());assert.equal(r.syntheticChildClosed,true);assert.equal(r.dispatchAuthorized,false);assert.equal(r.usage,'unknown');assert.equal(r.data.event,'A small clock stands in a shallow bowl.');
});
for(const scenario of ['exit_after_initialize','exit_after_turn','stderr','trailing','invalid'])test(`synthetic child ${scenario} fails closed with no provider text or repair`,async()=>{
 await assert.rejects(runCodexPipeRehearsal(draft(),{scenario}),/^Error: codex_pipe_rejected$/);
});
test('local timeout and cancellation terminate the synthetic child, suppress output and never claim remote cancellation',async()=>{
 await assert.rejects(runCodexPipeRehearsal(draft(),{scenario:'stall',timeoutMs:100}),/^Error: timeout$/);
 const controller=new AbortController(),work=runCodexPipeRehearsal(draft(),{scenario:'stall',signal:controller.signal});controller.abort();await assert.rejects(work,/^Error: cancelled$/);
 const pre=new AbortController();pre.abort();await assert.rejects(runCodexPipeRehearsal(draft(),{signal:pre.signal}),/^Error: cancelled$/);
});
test('no executable, cwd, env, provider or live switch can enter the fixed peer runner; getters stay inert',()=>{
 for(const options of [{executable:'codex'},{cwd:'/tmp'},{env:{}},{live:true},{scenario:'native'},{timeoutMs:0},{timeoutMs:60001}])assert.throws(()=>runCodexPipeRehearsal(draft(),options),/codex_pipe_options_invalid/);
 let reads=0;const options={};Object.defineProperty(options,'signal',{get(){reads++;throw Error('SECRET');}});assert.throws(()=>runCodexPipeRehearsal(draft(),options),/codex_pipe_options_invalid/);assert.equal(reads,0);
});
test('child does not inherit Node preload or credential sentinel environment',async()=>{
 const keys=['NODE_OPTIONS','OPENAI_API_KEY','NIGHTVOYAGE_DEEPSEEK_KEY','ACCESS_TOKEN'],before=new Map(keys.map(k=>[k,process.env[k]]));
 try{
  process.env.NODE_OPTIONS='--require=nonexistent-nightvoyage-private-preload';for(const k of keys.slice(1))process.env[k]='FICTIONAL_ENV_SENTINEL';
  const r=await runCodexPipeRehearsal(draft());assert.equal(r.syntheticChildClosed,true);assert.ok(!JSON.stringify(r).includes('FICTIONAL_ENV_SENTINEL'));
 }finally{for(const [k,v]of before)if(v===undefined)delete process.env[k];else process.env[k]=v;}
});
test('actual synthetic child pipes feed two scenes and wake; persistent replay never spawns another peer',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-pipes-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const directory=path.join(root,'book');let calls=0;
 const adapter=new CodexAdapter({model_id:'fiction-pipe-model',simulator:(d,{signal})=>{calls++;return runCodexPipeRehearsal(d,{signal});}}),selection=selectAdapter({primary:adapter});
 let e=new ModelPortNightvoyage(directory,{selection});t.after(()=>{try{e.close();}catch{}});const id=e.start('fiction-pipes','fiction-pipes',seed());await e.execute(id);
 assert.equal(e.status(id).status,'completed');assert.equal(calls,3);assert.equal(e.status(id).external_calls_started,0);const original=JSON.stringify(e.read(e.result(id).dream.id));e.close();e=new ModelPortNightvoyage(directory,{selection});await e.execute(id);assert.equal(calls,3);assert.equal(JSON.stringify(e.read(e.result(id).dream.id)),original);
 e.withdraw(seed().sources[0].id);e.close();e=new ModelPortNightvoyage(directory,{selection});assert.equal(e.result(id).dream,null);
});
test('second child process death keeps saved scene and cannot be retried on reopen',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-pipe-death-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const directory=path.join(root,'book');let calls=0;
 const adapter=new CodexAdapter({model_id:'fiction-pipe-model',simulator:(d,{signal})=>{calls++;return runCodexPipeRehearsal(d,{signal,scenario:calls===2?'exit_after_turn':'success'});}}),selection=selectAdapter({primary:adapter});
 let e=new ModelPortNightvoyage(directory,{selection});t.after(()=>{try{e.close();}catch{}});const id=e.start('fiction-death','fiction-death',seed());await e.execute(id);assert.equal(e.status(id).status,'failed');assert.equal(e.status(id).stagesSaved,1);assert.equal(calls,2);e.close();e=new ModelPortNightvoyage(directory,{selection});await assert.rejects(e.resume(id),/ambiguous_attempt/);await e.execute(id);assert.equal(calls,2);assert.equal(e.result(id).dream,null);
});
test('withdrawal while a real synthetic child is pending suppresses the run across reopen',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-pipe-withdraw-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const directory=path.join(root,'book');let entered,calls=0;const started=new Promise(r=>entered=r);
 const adapter=new CodexAdapter({model_id:'fiction-pipe-model',simulator:(d,{signal})=>{calls++;const work=runCodexPipeRehearsal(d,{signal,scenario:'stall'});entered();return work;}}),selection=selectAdapter({primary:adapter});
 let e=new ModelPortNightvoyage(directory,{selection});t.after(()=>{try{e.close();}catch{}});const id=e.start('fiction-withdraw','fiction-withdraw',seed());const work=e.execute(id);await started;e.withdraw(seed().sources[0].id);await work;
 assert.equal(calls,1);assert.equal(e.result(id).dream,null);e.close();e=new ModelPortNightvoyage(directory,{selection});assert.equal(e.result(id).dream,null);await e.execute(id);assert.equal(calls,1);
});
