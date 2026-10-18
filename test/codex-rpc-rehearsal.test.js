import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {CodexRpcRehearsal} from '../scripts/codex-rpc-rehearsal.mjs';
import {CodexAdapter,selectAdapter,stageRequest,dreamModelPortVersion} from '../scripts/dream-model-port.mjs';
import {ModelPortNightvoyage} from '../scripts/dream-model-runtime.mjs';
import {rpcPush,rpcReady,rpcTranscript} from '../test-support/codex-rpc-fixtures.js';
import {codexTranscript} from '../test-support/model-port-protocol-fixtures.js';
const seed=()=>JSON.parse(fs.readFileSync(new URL('../examples/adapter-boundary.snapshot.json',import.meta.url),'utf8'));
const draft=()=>new CodexAdapter({model_id:'fiction-model'}).prepare(stageRequest({contract_version:dreamModelPortVersion,request_id:'fiction-request',run_id:'fiction-run',stage:'scene',index:0,snapshot:seed(),scenes:[]}));
test('RPC emits ordered initialize/initialized/thread/start/turn/start proposals with no dispatch authority',()=>{
 const d=draft(),requests=[],out=rpcTranscript(d,{requests});
 assert.deepEqual(requests.map(r=>r.method),['initialize','initialized','thread/start','turn/start']);
 assert.deepEqual(requests.filter(r=>r.id).map(r=>r.id),[1,2,3]);
 assert.equal(requests[2].params.model,'fiction-model');assert.equal(requests[3].params.model,'fiction-model');
 assert.ok(requests[3].params.input[0].text.includes(d.input));assert.equal(out.dispatchAuthorized,false);assert.equal(out.usage,'unknown');
 assert.equal(out.data.event,'A small clock stands in a shallow bowl.');
 assert.equal('ephemeral' in requests[2].params,false); // No unverified persistence/tool-disable promise.
});
test('notifications arriving before turn/start response bind only after authoritative response',()=>{
 assert.deepEqual(rpcTranscript(draft(),{early:true}).data,rpcTranscript(draft()).data);
 const {session}=rpcReady(draft());rpcPush(session,{method:'turn/started',params:{threadId:'other-thread',turn:{id:'fiction-turn',status:'inProgress'}}});
 assert.throws(()=>rpcPush(session,{id:3,result:{turn:{id:'fiction-turn',status:'inProgress',items:[]}}}),/^Error: codex_rpc_rejected$/);
 assert.equal(session.status().phase,'rejected');assert.deepEqual(session.drain(),[]);
});
test('unsent, reordered, duplicate, string-id, error and server-request frames reject with fixed body-free error',()=>{
 for(const frame of [{id:1,result:{userAgent:'x'}},{id:2,result:{}},{id:'1',result:{}},{id:1,error:{message:'PRIVATE_SENTINEL'}},{id:1,method:'item/commandExecution/requestApproval',params:{command:'PRIVATE_SENTINEL'}}]){
  const s=new CodexRpcRehearsal(draft());if(frame.id!==1||frame.error||frame.method)s.drain();
  assert.throws(()=>rpcPush(s,frame),/^Error: codex_rpc_rejected$/);assert.deepEqual(s.drain(),[]);assert.equal(s.status().phase,'rejected');
 }
 const s=new CodexRpcRehearsal(draft());s.drain();rpcPush(s,{id:1,result:{userAgent:'x'}});
 assert.throws(()=>rpcPush(s,{id:1,result:{userAgent:'x'}}),/codex_rpc_rejected/);
});
test('wrong effective model, malformed thread, completed turn response and hidden initial items reject',()=>{
 for(const result of [{thread:{id:'bad id'}},{thread:{id:'fiction-thread'},model:'different-model'}]){
  const s=new CodexRpcRehearsal(draft());s.drain();rpcPush(s,{id:1,result:{userAgent:'x'}});s.drain();assert.throws(()=>rpcPush(s,{id:2,result}),/codex_rpc_rejected/);
 }
 for(const turn of [{id:'fiction-turn',status:'completed',items:[]},{id:'fiction-turn',status:'inProgress',items:[{type:'commandExecution'}]},{id:'fiction-turn',status:'inProgress',items:[],error:{message:'SECRET'}}]){
  const {session}=rpcReady(draft());assert.throws(()=>rpcPush(session,{id:3,result:{turn}}),/codex_rpc_rejected/);
 }
});
test('one-byte Chinese CRLF, truncation, invalid UTF-8, byte/frame bounds and trailing frame remain guarded',()=>{
 const d=draft(),{session}=rpcReady(d);rpcPush(session,{id:3,result:{turn:{id:'fiction-turn',status:'inProgress',items:[]}}});
 const value={event:'窗台上有一只蓝碗。'},source=codexTranscript(d,value);
 for(const b of Buffer.concat(source.chunks))session.push(Uint8Array.of(b));assert.equal(session.finish().data.event,value.event);assert.throws(()=>session.finish(),/codex_rpc_rejected/);
 for(const chunk of [Buffer.alloc(65537),Uint8Array.of(255),Buffer.from('not-json\n')]){const s=new CodexRpcRehearsal(d);assert.throws(()=>s.push(chunk),/codex_rpc_rejected/);}
 const truncated=new CodexRpcRehearsal(d);truncated.drain();truncated.push(Buffer.from('{"id":1'));assert.throws(()=>truncated.finish(),/codex_rpc_rejected/);
 const {session:bounded}=rpcReady(d);const event={method:'thread/tokenUsage/updated',params:{threadId:'fiction-thread'}};
 assert.throws(()=>{for(let i=0;i<129;i++)rpcPush(bounded,event);},/codex_rpc_rejected/);
 const {session:trailing}=rpcReady(d);rpcPush(trailing,{id:3,result:{turn:{id:'fiction-turn',status:'inProgress',items:[]}}});
 for(const c of source.chunks)trailing.push(c);assert.throws(()=>rpcPush(trailing,event),/codex_rpc_rejected/);
});
test('cancellation at every handshake/stream phase clears proposals and rejects late replies',()=>{
 for(const phase of ['initialize','thread','turn','stream']){
  const s=new CodexRpcRehearsal(draft());s.drain();
  if(phase!=='initialize'){rpcPush(s,{id:1,result:{userAgent:'x'}});s.drain();}
  if(['turn','stream'].includes(phase)){rpcPush(s,{id:2,result:{thread:{id:'fiction-thread'}}});s.drain();}
  if(phase==='stream')rpcPush(s,{id:3,result:{turn:{id:'fiction-turn',status:'inProgress',items:[]}}});
  s.cancel();assert.deepEqual(s.drain(),[]);assert.equal(s.status().remoteCancellationConfirmed,'unknown');
  assert.throws(()=>rpcPush(s,{id:3,result:{}}),/codex_rpc_rejected/);assert.throws(()=>s.finish(),/codex_rpc_rejected/);
 }
});
test('tools, approvals, reroutes, failed/interrupted completion still fail; proposals never grant tools',()=>{
 for(const event of [
  {method:'model/rerouted',params:{threadId:'fiction-thread'}},
  {id:900,method:'item/tool/call',params:{threadId:'fiction-thread'}},
  {method:'item/completed',params:{threadId:'fiction-thread',turnId:'fiction-turn',item:{id:'tool',type:'commandExecution'}}},
  ...['failed','interrupted'].map(status=>({method:'turn/completed',params:{threadId:'fiction-thread',turn:{id:'fiction-turn',status}}}))]){
  const {session}=rpcReady(draft());rpcPush(session,{id:3,result:{turn:{id:'fiction-turn',status:'inProgress',items:[]}}});
  assert.throws(()=>rpcPush(session,event),/codex_rpc_rejected/);
 }
 assert.equal(new CodexAdapter({model_id:'fiction-model'}).preflight().ready,false);
});
test('full synthetic RPC loop persists three stages, replays without another handshake, withdraws across reopen',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-rpc-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const directory=path.join(root,'book');let calls=0,requests=[];
 const adapter=new CodexAdapter({model_id:'fiction-model',simulator:d=>{calls++;return rpcTranscript(d,{early:calls===2,requests});}}),selection=selectAdapter({primary:adapter});
 let e=new ModelPortNightvoyage(directory,{selection});t.after(()=>{try{e.close();}catch{}});
 const id=e.start('fiction-rpc','fiction-rpc',seed());await e.execute(id);const result=e.result(id);assert.equal(result.receipt.status,'completed');assert.equal(result.receipt.external_calls_started,0);assert.equal(calls,3);assert.equal(requests.length,12);
 const original=JSON.stringify(e.read(result.dream.id));e.close();e=new ModelPortNightvoyage(directory,{selection});await e.execute(id);assert.equal(calls,3);assert.equal(JSON.stringify(e.read(result.dream.id)),original);
 assert.ok(!fs.readFileSync(path.join(directory,'state.json'),'utf8').includes('fiction-thread'));
 e.withdraw(seed().sources[0].id);e.close();e=new ModelPortNightvoyage(directory,{selection});assert.equal(e.result(id).dream,null);
});
test('mutating a drained request cannot rewrite model binding or later input; no result before completion',()=>{
 const d=draft(),s=new CodexRpcRehearsal(d);d.input='MUTATED_INPUT';d.model='other-model';
 const first=s.drain();first[0].params.clientInfo.name='mutated';rpcPush(s,{id:1,result:{userAgent:'x'}});
 const thread=s.drain();assert.equal(thread[1].params.model,'fiction-model');thread[1].params.model='changed';
 rpcPush(s,{id:2,result:{thread:{id:'fiction-thread'},model:'fiction-model'}});
 const turn=s.drain();assert.equal(turn[0].params.model,'fiction-model');assert.ok(!turn[0].params.input[0].text.includes('MUTATED_INPUT'));
 rpcPush(s,{id:3,result:{turn:{id:'fiction-turn',status:'inProgress',items:[]}}});assert.throws(()=>s.finish(),/codex_rpc_rejected/);assert.equal(s.status().phase,'rejected');
});
test('second-stage RPC rejection retains the first checkpoint and cannot retry or change adapter on reopen',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-rpc-fail-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const directory=path.join(root,'book');let calls=0;
 const adapter=new CodexAdapter({model_id:'fiction-model',simulator:d=>{calls++;if(calls===2){const {session}=rpcReady(d);rpcPush(session,{id:3,error:{message:'PRIVATE_SENTINEL'}});}return rpcTranscript(d);}}),selection=selectAdapter({primary:adapter});
 let e=new ModelPortNightvoyage(directory,{selection});t.after(()=>{try{e.close();}catch{}});const id=e.start('fiction-fail','fiction-fail',seed());await e.execute(id);
 assert.equal(e.status(id).status,'failed');assert.equal(e.status(id).stagesSaved,1);assert.equal(calls,2);e.close();e=new ModelPortNightvoyage(directory,{selection});
 await assert.rejects(e.resume(id),/ambiguous_attempt/);await e.execute(id);assert.equal(calls,2);assert.equal(e.result(id).dream,null);
 assert.ok(!fs.readFileSync(path.join(directory,'state.json'),'utf8').includes('PRIVATE_SENTINEL'));
});
