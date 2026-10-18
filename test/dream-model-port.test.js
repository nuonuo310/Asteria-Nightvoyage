import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {FakeAdapter,ChatGPTPlanAdapter,CodexAdapter,selectAdapter,stageRequest,dreamModelPortVersion} from '../scripts/dream-model-port.mjs';
import {ModelPortNightvoyage} from '../scripts/dream-model-runtime.mjs';
const fixture=new URL('../examples/adapter-boundary.snapshot.json',import.meta.url);
const seed=()=>JSON.parse(fs.readFileSync(fixture,'utf8'));
function setup(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-model-port-')),directory=path.join(root,'book');let engine;const open=options=>engine=new ModelPortNightvoyage(directory,options);t.after(()=>{engine?.close();fs.rmSync(root,{recursive:true,force:true});});return {directory,root,open};}
const start=(e,id='fiction-model-port',settings)=>e.start(id,id,seed(),settings);
const original=new FakeAdapter();
const reply=async(r,ctx)=>{const response=await original.generate(r,ctx);return {value:r.stage==='scene'?{event:response.value.event,appraisal:response.value.appraisal,basis:{goal:null,control:null,uncertainty:null},affect:{kind:'unchanged'}}:{fragment:response.value.fragment,residue:response.value.residue,associations:response.value.associations},usage:'unknown'};};
test('fake default completes two scenes/wake, typed provenance, persisted receipt, dedup and isolated derivatives',async t=>{
  const {open}=setup(t);let e=open();const id=start(e);await e.execute(id);const r=e.result(id);
  assert.equal(r.receipt.status,'completed');assert.equal(r.receipt.adapter_kind,'FakeAdapter');assert.equal(r.receipt.external_calls_started,0);assert.equal(r.receipt.stage_dispatches_started,3);assert.equal(r.receipt.checkpoint.saved_scenes,2);assert.equal(r.receipt.checkpoint.wake_saved,true);
  assert.equal(r.receipt.usage.length,3);assert.equal(r.receipt.usage[0].usage,'unknown');assert.equal(r.dream.scenes.length,2);
  for(const v of [r.dream,r.wake,r.residue]){assert.equal(v.materialKind,'fictional');assert.equal(v.isRealityFact,false);assert.deepEqual(v.sourceRefs,r.dream.sourceRefs);}
  const saved=e.read(r.dream.id);for(const kind of ['recollection','imagined_continuation'])e.append(saved.id,kind,'Independent fictional append.');assert.deepEqual(e.read(saved.id),saved);
  e.setPolicy(saved.id,{cherished:true,recallAccess:'manual'});assert.deepEqual(e.recall('tile','manual',1),[]);assert.equal(e.residue(saved.id,saved.residue.startedAt).strength,.1);
  e.close();e=open();assert.equal(start(e),id);await e.execute(id);assert.equal(e.status(id).stage_dispatches_started,3);assert.equal(e.read(saved.id).cherished,true);
  assert.throws(()=>e.start('fiction-model-port','changed',seed()),/request_conflict/);
});
test('fallback is explicit local preflight only and selection receipt survives reopen without reselecting',async t=>{
  const {open}=setup(t),primary=new FakeAdapter({model_id:'unavailable-primary',available:false}),backup=new FakeAdapter({model_id:'fiction-backup'});
  assert.equal(selectAdapter({primary,fallback:backup}).ready,false);
  const selection=selectAdapter({primary,fallback:backup,fallback_on:['adapter_unavailable']});let e=open({selection});const id=start(e);await e.execute(id);assert.equal(e.status(id).model_id,'fiction-backup');assert.equal(e.status(id).fallback_reason,'adapter_unavailable');
  e.close();e=open({selection:selectAdapter({primary,fallback:backup,fallback_on:['adapter_unavailable']})});assert.equal(e.status(id).fallback_from,'FakeAdapter');
  assert.throws(()=>selectAdapter({primary:new CodexAdapter(),fallback:new ChatGPTPlanAdapter(),fallback_on:['adapter_unavailable']}),/invalid_fallback_policy/);
});
test('target adapters are distinct and blocked; no fake compatibility, credentials, login or generation inferred from catalog',async t=>{
  const {directory}=setup(t),gpt=new ChatGPTPlanAdapter(),codex=new CodexAdapter();
  assert.equal(gpt.identity.auth_mode,'chatgpt_plan');assert.equal(codex.identity.auth_mode,'codex_chatgpt_subscription');
  const selection=selectAdapter({primary:gpt,fallback:codex,fallback_on:['authorization_required']});assert.equal(selection.ready,false);assert.equal(selection.adapter,codex);
  assert.throws(()=>new ModelPortNightvoyage(directory,{selection}),/adapter_unavailable/);assert.equal(fs.existsSync(directory),false);
  await assert.rejects(gpt.generate(),/authorization_required/);await assert.rejects(codex.generate(),/authorization_required/);
  assert.throws(()=>new ModelPortNightvoyage(directory,{selection:{...selectAdapter(),fallback_reason:'forged'}}),/invalid_model_selection/);
});
test('first committed scene pins adapter/model; failure cannot switch entrance and checkpoint resumes only with same identity',async t=>{
  const {directory,open}=setup(t);let stop=true,calls=0;const adapter=new FakeAdapter({reply:async(r,c)=>{calls++;return reply(r,c);}});
  let e=open({selection:selectAdapter({primary:adapter}),fault:p=>{if(p==='port_scene_saved'&&stop){stop=false;throw Error('simulated_crash');}}});const id=start(e);await e.execute(id);assert.equal(e.status(id).stagesSaved,1);e.close();
  assert.throws(()=>new ModelPortNightvoyage(directory,{selection:selectAdapter({primary:new FakeAdapter({model_id:'different'})})}),/foreign_execution_owner/);
  e=open({selection:selectAdapter({primary:adapter})});await e.resume(id);assert.equal(e.status(id).status,'completed');assert.equal(calls,3);assert.equal(e.status(id).stage_dispatches_started,3);
});
test('failed second dispatch is ambiguous, cannot resume, reuse request or silently switch',async t=>{
  const {open}=setup(t);let calls=0;const adapter=new FakeAdapter({reply:async(r,c)=>{calls++;if(r.index===1)throw Error('PRIVATE_PROVIDER_ERROR_BODY');return reply(r,c);}});
  let e=open({selection:selectAdapter({primary:adapter})});const id=start(e);await e.execute(id);assert.equal(e.status(id).stagesSaved,1);assert.equal(e.status(id).stage_dispatches_started,2);assert.equal(e.status(id).error_category,'invalid_model_response');
  e.close();e=open({selection:selectAdapter({primary:adapter})});await assert.rejects(e.resume(id),/ambiguous_attempt/);assert.equal(start(e),id);await e.execute(id);assert.equal(calls,2);assert.ok(!JSON.stringify(e.status(id)).includes('PRIVATE_PROVIDER'));
});
test('real child death after durable intent is uncertain, keeps identity and never automatically dispatches again',async t=>{
  const {directory,open}=setup(t),runtime=new URL('../scripts/dream-model-runtime.mjs',import.meta.url).href;
  const child=spawnSync(process.execPath,['--input-type=module','-e',`import fs from 'node:fs';import {ModelPortNightvoyage} from ${JSON.stringify(runtime)};const e=new ModelPortNightvoyage(process.argv[1],{fault:p=>{if(p==='port_dispatched')process.exit(47);}});const id=e.start('crash','crash',JSON.parse(fs.readFileSync(process.argv[2],'utf8')));await e.execute(id);`,directory,fileURLToPath(fixture)],{encoding:'utf8'});
  assert.equal(child.status,47,child.stderr);const e=open(),id=start(e,'crash');assert.equal(e.status(id).status,'uncertain');assert.equal(e.status(id).stage_dispatches_started,1);assert.equal(e.status(id).external_calls_started,0);await assert.rejects(e.resume(id),/ambiguous_attempt/);await e.execute(id);assert.equal(e.status(id).stage_dispatches_started,1);
});
test('call and byte budgets stop before dispatch and cannot be reset by replay',async t=>{
  const {open}=setup(t),e=open(),id=start(e,'capped',{maxCalls:1});await e.execute(id);assert.equal(e.status(id).stagesSaved,1);assert.equal(e.status(id).stage_dispatches_started,1);assert.equal(e.status(id).error,'budget_exhausted');await e.resume(id);assert.equal(e.status(id).stage_dispatches_started,1);
  const tiny=start(e,'tiny',{inputTokens:1});await e.execute(tiny);assert.equal(e.status(tiny).stage_dispatches_started,0);
  const output=start(e,'output',{perCallOutput:1});await e.execute(output);assert.equal(e.status(output).stagesSaved,0);assert.equal(e.status(output).stage_dispatches_started,1);
});
test('queued cancellation is terminal and in-flight cancellation suppresses noncooperative late body',async t=>{
  const {open}=setup(t);let release,entered;const started=new Promise(r=>entered=r);let calls=0;
  const adapter=new FakeAdapter({reply:r=>{calls++;entered();return new Promise(resolve=>release=()=>resolve(reply(r,{})));}}),e=open({selection:selectAdapter({primary:adapter})});
  const queued=start(e,'queued');e.cancel(queued);await e.execute(queued);assert.equal(calls,0);await assert.rejects(e.resume(queued),/not_resumable/);
  const id=start(e,'inflight'),work=e.execute(id);await started;e.cancel(id);await work;release();await new Promise(r=>setImmediate(r));assert.equal(calls,1);assert.equal(e.result(id).dream,null);assert.equal(e.status(id).cancellation.remote_confirmed,'unknown');
});
test('timeout bounds noncooperative adapter, never stores late response or dispatches wake',async t=>{
  const {open}=setup(t);let release,calls=0;const e=open({selection:selectAdapter({primary:new FakeAdapter({reply:r=>{calls++;return new Promise(resolve=>release=()=>resolve(reply(r,{})));}})})});
  const id=start(e,'timeout',{timeoutMs:10});await e.execute(id);release();await new Promise(r=>setImmediate(r));assert.equal(e.status(id).error,'timeout');assert.equal(calls,1);assert.equal(e.result(id).dream,null);await assert.rejects(e.resume(id),/ambiguous_attempt/);
});
test('withdrawal purges original and derivatives, recall/replay/reopen cannot recover body',async t=>{
  const {directory,open}=setup(t);let e=open();const id=start(e);await e.execute(id);const dream=e.result(id).dream;e.append(dream.id,'recollection','PRIVATE_DERIVED_SENTINEL');e.recall('tile','recall',1);e.withdraw(seed().sources[0].id);e.close();e=open();assert.equal(e.result(id).dream,null);assert.deepEqual(e.recall('tile','recall',1),[]);assert.deepEqual(e.list(),[]);assert.throws(()=>start(e),/source_withdrawn/);await e.execute(id);assert.equal(e.result(id).dream,null);
  const disk=fs.readFileSync(path.join(directory,'state.json'),'utf8');for(const text of [dream.scenes[0].event,'PRIVATE_DERIVED_SENTINEL',seed().sources[0].text])assert.ok(!disk.includes(text));
});
test('withdrawal in flight discards late body; real seed and getters fail before dispatch',async t=>{
  const {open}=setup(t);let release,entered;const started=new Promise(r=>entered=r),e=open({selection:selectAdapter({primary:new FakeAdapter({reply:r=>{entered();return new Promise(resolve=>release=()=>resolve(reply(r,{})));}})})});
  const real=seed();real.materialKind='real';assert.throws(()=>e.start('real','real',real),/invalid_snapshot/);
  let invoked=false;assert.throws(()=>e.start('getter','getter',{get id(){invoked=true;}}));assert.equal(invoked,false);
  const id=start(e),work=e.execute(id);await started;e.withdraw(seed().sources[0].id);await work;release();await new Promise(r=>setImmediate(r));assert.equal(e.result(id).dream,null);assert.equal(e.status(id).status,'revoked');
});
test('storage reservation failure prevents adapter dispatch; lock blocks second owner',async t=>{
  const {directory,open}=setup(t);let calls=0;const e=open({selection:selectAdapter({primary:new FakeAdapter({reply:()=>{calls++;}})})}),id=start(e);
  assert.throws(()=>new ModelPortNightvoyage(directory),/store_busy/);fs.mkdirSync(path.join(directory,'snapshot.tmp'));await assert.rejects(e.execute(id),/storage_io_failure/);assert.equal(calls,0);
});
test('stage schema is closed, impossible stage identity and executable response rejected without effects',async t=>{
  const request={contract_version:dreamModelPortVersion,request_id:'r',run_id:'s',snapshot:seed(),scenes:[],stage:'scene',index:0};
  assert.equal(stageRequest(request).index,0);assert.throws(()=>stageRequest({...request,credential:'secret'}));assert.throws(()=>stageRequest({...request,stage:'wake'}));
  const {open}=setup(t);let getter=false;const e=open({selection:selectAdapter({primary:new FakeAdapter({reply:()=>({get value(){getter=true;return {};},usage:'unknown'})})})});const id=start(e);await e.execute(id);assert.equal(getter,false);assert.equal(e.result(id).dream,null);
});
test('canonical usage is persisted without copying provider metadata or thread identity',async t=>{
  const {open}=setup(t),e=open({selection:selectAdapter({primary:new FakeAdapter({reply:async(r,c)=>({...await reply(r,c),usage:{input_tokens:7,output_tokens:3,total_tokens:10}})})})}),id=start(e);
  await e.execute(id);assert.equal(e.status(id).status,'completed');assert.deepEqual(e.status(id).usage[0].usage,{input_tokens:7,output_tokens:3,total_tokens:10});assert.equal(e.status(id).external_calls_started,0);
});
test('invalid claimed usage and ungrounded wake cannot publish or start repair calls',async t=>{
  const {open}=setup(t);let calls=0;const e=open({selection:selectAdapter({primary:new FakeAdapter({reply:async(r,c)=>{calls++;return r.stage==='wake'?{value:{fragment:'Unrelated invented aftermath.',residue:.1,associations:[]},usage:'unknown'}:reply(r,c);}})})}),id=start(e);
  await e.execute(id);assert.equal(e.status(id).stagesSaved,2);assert.equal(e.status(id).stage_dispatches_started,3);assert.equal(e.result(id).dream,null);await assert.rejects(e.resume(id),/ambiguous_attempt/);assert.equal(calls,3);
});
test('real child death after committed checkpoint resumes exact adapter without regenerating first scene',async t=>{
  const {directory,open}=setup(t),runtime=new URL('../scripts/dream-model-runtime.mjs',import.meta.url).href;
  const child=spawnSync(process.execPath,['--input-type=module','-e',`import fs from 'node:fs';import {ModelPortNightvoyage} from ${JSON.stringify(runtime)};const e=new ModelPortNightvoyage(process.argv[1],{fault:p=>{if(p==='port_scene_saved')process.exit(48);}});await e.execute(e.start('checkpoint-child','checkpoint-child',JSON.parse(fs.readFileSync(process.argv[2],'utf8'))));`,directory,fileURLToPath(fixture)],{encoding:'utf8'});
  assert.equal(child.status,48,child.stderr);const e=open(),id=start(e,'checkpoint-child');assert.equal(e.status(id).stagesSaved,1);await e.resume(id);assert.equal(e.status(id).status,'completed');assert.equal(e.status(id).stage_dispatches_started,3);
});
