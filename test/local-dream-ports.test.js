import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Nightvoyage} from '../src/engine.js';
import {LocalDreamPorts,localDreamPortsVersion} from '../scripts/local-dream-ports.mjs';
const file=new URL('../examples/adapter-boundary.snapshot.json',import.meta.url),seed=()=>JSON.parse(fs.readFileSync(file,'utf8'));
function setup(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-ports-')),directory=path.join(root,'store');let port;const open=()=>port=new LocalDreamPorts(directory);t.after(()=>{port?.close();fs.rmSync(root,{recursive:true,force:true});});return{root,directory,open};}
const start=port=>port.start({requestId:'fiction-port-r',sessionId:'fiction-port-s',snapshot:seed()}).runId;
test('local ports expose one fixed fictional contract, file/direct input, typed outputs, detached reads and replay',async t=>{
  const {open}=setup(t),p=open(),cap=p.capabilities();assert.equal(cap.contractVersion,localDreamPortsVersion);assert.equal(cap.asteriaAdapter,'pending');assert.equal(cap.realModelRequests,false);cap.methods.length=0;assert.ok(p.capabilities().methods.length);
  assert.deepEqual(p.readSnapshot({file:fileURLToPath(file)}).snapshot,seed());
  const id=start(p),result=await p.execute({runId:id});assert.equal(result.receipt.status,'completed');assert.equal(result.receipt.budget.calls,3);assert.equal(result.dream.scenes.length,2);
  for(const value of [result.dream,result.wake,result.residue]){assert.equal(value.isRealityFact,false);assert.equal(value.materialKind,'fictional');assert.deepEqual(value.sourceRefs,result.dream.sourceRefs);}
  const dreamId=result.dream.id,original=p.readEntry({entryId:dreamId}).entry;
  result.dream.scenes[0].event='mutated';assert.deepEqual(p.readEntry({entryId:dreamId}).entry,original);
  assert.equal(start(p),id);assert.equal((await p.execute({runId:id})).receipt.budget.calls,3);
  assert.throws(()=>p.start({requestId:'fiction-port-r',sessionId:'changed',snapshot:seed()}),/request_conflict/);
  for(const kind of ['recollection','imagined_continuation']){const child=p.append({entryId:dreamId,kind,text:'Fictional append.'}).entryId;assert.equal(p.readEntry({entryId:child}).entry.origin,kind);}
  assert.deepEqual(p.readEntry({entryId:dreamId}).entry,original);assert.ok(p.listEntries({}).entries.every(e=>!Object.hasOwn(e,'text')&&!Object.hasOwn(e,'scenes')));
});
test('policy, cue candidates and residue stay separate; withdrawal removes original, derivatives and replay across reopen',async t=>{
  const {open}=setup(t);let p=open();const id=start(p),r=await p.execute({runId:id}),entryId=r.dream.id;
  const original=p.readEntry({entryId}).entry,now=original.residue.startedAt;
  p.setPolicy({entryId,patch:{cherished:true,recallAccess:'manual'}});assert.deepEqual(p.recall({cue:'lantern',requestId:'manual',now}).candidates,[]);
  assert.equal(p.residue({entryId,now}).residue.strength,r.wake.residue);
  p.setPolicy({entryId,patch:{recallAccess:'cue'}});const candidate=p.recall({cue:'lantern',requestId:'match',now});assert.equal(candidate.automaticDelivery,false);assert.equal(candidate.candidates[0].origin,'dream');
  p.append({entryId,kind:'recollection',text:'FICTIONAL_CHILD_BODY'});p.close();p=open();assert.equal(p.readEntry({entryId}).entry.cherished,true);
  p.withdraw({sourceId:seed().sources[0].id});p.close();p=open();assert.equal(p.readEntry({entryId}).entry,null);assert.deepEqual(p.recall({cue:'lantern',requestId:'match',now}).candidates,[]);assert.deepEqual(p.listEntries({}).entries,[]);assert.equal(p.result({runId:id}).dream,null);
});
test('closed port arguments reject authority, getters, real input and unknown retry override before mutation',async t=>{
  const {open,directory}=setup(t),p=open(),id=start(p),before=fs.readFileSync(path.join(directory,'state.json'),'utf8');
  for(const extra of ['provider','credential','model','fetchImpl','actorId'])assert.throws(()=>p.start({requestId:'new',sessionId:'new',snapshot:seed(),[extra]:'FORBIDDEN'}));
  let getter=false;assert.throws(()=>p.status({get runId(){getter=true;return id;}}));assert.equal(getter,false);
  const real=seed();real.materialKind='real';assert.throws(()=>p.start({requestId:'real',sessionId:'real',snapshot:real}),/invalid_snapshot/);
  await assert.rejects(p.resume({runId:id,retryUnknown:true}),/invalid_local_port_input/);
  assert.throws(()=>p.status({runId:'constructor'}),/invalid_local_port_id/);assert.throws(()=>p.listEntries({includeBodies:true}));
  assert.equal(fs.readFileSync(path.join(directory,'state.json'),'utf8'),before);
});
test('queued and in-flight cancellation are terminal, with no subsequent wake or body',async t=>{
  const {open}=setup(t),p=open(),id=start(p);p.cancel({runId:id});assert.equal((await p.execute({runId:id})).receipt.budget.calls,0);await assert.rejects(p.resume({runId:id}),/not_resumable/);
  const next=p.start({requestId:'next',sessionId:'next',snapshot:seed()}).runId,work=p.execute({runId:next});p.cancel({runId:next});const result=await work;assert.equal(result.receipt.status,'cancelled');assert.equal(result.dream,null);assert.ok(result.receipt.budget.calls<=1);
});
test('committed failed checkpoint resumes once; ambiguous dispatch remains blocked without a retry port',async t=>{
  const {directory,open}=setup(t);let crash=true,e=new Nightvoyage(directory,{fault:point=>{if(point==='scene_saved'&&crash){crash=false;throw Error('fictional_interruption');}}});
  const id=e.start('checkpoint','checkpoint',seed());await e.execute(id);assert.equal(e.status(id).stagesSaved,1);e.close();let p=open();const result=await p.resume({runId:id});assert.equal(result.receipt.status,'completed');assert.equal(result.receipt.budget.calls,3);p.close();
  e=new Nightvoyage(directory);const unknown=e.start('unknown','unknown',seed());e.run(unknown).status='uncertain';e.store.save();e.close();p=open();await assert.rejects(p.resume({runId:unknown}),/ambiguous_attempt/);assert.equal(p.status({runId:unknown}).receipt.status,'uncertain');
});
test('specialized run metadata cannot be adopted and owner lock is released after refusal',t=>{
  const {directory,open}=setup(t),e=new Nightvoyage(directory),id=e.start('foreign','foreign',seed());e.run(id).billingProtocolVersion='fictional-specialized';e.store.save();e.close();assert.throws(()=>open(),/foreign_execution_owner/);
  const verify=new Nightvoyage(directory);try{assert.equal(verify.run(id).billingProtocolVersion,'fictional-specialized');}finally{verify.close();}
});
test('explicit deletion suppresses read, descendants and stale recall on reopen',async t=>{
  const {open}=setup(t);let p=open();const id=start(p),r=await p.execute({runId:id}),entryId=r.dream.id;
  p.append({entryId,kind:'imagined_continuation',text:'Fictional continuation.'});p.recall({cue:'lantern',requestId:'prior',now:1});p.deleteEntry({entryId});p.close();p=open();assert.equal(p.readEntry({entryId}).entry,null);assert.deepEqual(p.listEntries({}).entries,[]);assert.deepEqual(p.recall({cue:'lantern',requestId:'prior',now:1}).candidates,[]);
});

test('storage failure does not return a successful start receipt and closes subsequent access',t=>{
  const {open,directory}=setup(t),p=open();fs.mkdirSync(path.join(directory,'snapshot.tmp'));
  assert.throws(()=>start(p),/storage_io_failure/);assert.throws(()=>p.listEntries({}),/store_unavailable/);
});
