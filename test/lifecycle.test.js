import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { Nightvoyage } from '../src/engine.js';
import { FakeProvider } from '../src/fake-provider.js';
const fixture = JSON.parse(fs.readFileSync(new URL('../fixtures/paper-harbor.json',import.meta.url)));
function setup(t, options) {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-life-'));
  const e=new Nightvoyage(dir,options);
  t.after(()=>{e.close();fs.rmSync(dir,{recursive:true,force:true});}); return {e,dir};
}
class Deferred extends FakeProvider {
  constructor() { super(); this.started = new Promise(resolve=>this.mark=resolve); }
  async generate(payload) { this.signal=payload.signal; this.mark(); return new Promise(resolve=>this.deliver=resolve); }
}
const raw = { event:'UNWANTED LATE BODY',appraisal:{goalEffect:0,control:0,uncertainty:1},delta:{valence:0,arousal:0} };
test('duplicate requests and sessions do not repeat calls; changed request conflicts',async t=>{
  const {e}=setup(t),id=e.start('r','s',fixture); await e.execute(id);
  assert.equal(e.start('r','s',fixture),id); assert.equal(e.start('r2','s',fixture),id);
  await e.execute(id);assert.equal(e.status(id).budget.calls,3);
  assert.throws(()=>e.start('r','different',fixture),/request_conflict/);
  assert.notEqual(e.start('r3','another',fixture),id);
});
test('overlapping execute is refused; cancelling in flight suppresses late body and wake',async t=>{
  const provider=new Deferred(),{e,dir}=setup(t,{provider}),id=e.start('r','s',fixture),work=e.execute(id);
  await provider.started; await assert.rejects(e.execute(id),/run_busy/);
  e.cancel(id);assert.equal((await work).status,'cancelled');assert.equal(provider.signal.aborted,true);
  provider.deliver(raw);await new Promise(resolve=>setImmediate(resolve));
  assert.equal(e.result(id).dream,null);assert.ok(!fs.readFileSync(path.join(dir,'state.json'),'utf8').includes(raw.event));
  await assert.rejects(e.resume(id),/not_resumable/);
});
test('queued cancellation consumes no budget',async t=>{
  const {e}=setup(t),id=e.start('r','s',fixture);e.cancel(id);await e.execute(id);assert.equal(e.status(id).budget.calls,0);
});
test('call timeout aborts cooperative provider and does not save delayed response',async t=>{
  const provider=new Deferred(),{e}=setup(t,{provider}),id=e.start('r','s',fixture,{timeoutMs:10});
  assert.equal((await e.execute(id)).error,'timeout');assert.equal(provider.signal.aborted,true);
  provider.deliver(raw);await new Promise(resolve=>setImmediate(resolve));assert.equal(e.status(id).stagesSaved,0);
});
test('budgets bound calls, cumulative input and cumulative output reservations',async t=>{
  for(const [i,settings] of [{maxCalls:1},{inputTokens:1},{outputTokens:400}].entries()){
    const {e}=setup(t),id=e.start(`r${i}`,`s${i}`,fixture,settings);const r=await e.execute(id);
    assert.equal(r.status,'failed');assert.equal(r.error,'budget_exhausted');assert.ok(r.budget.calls<= (settings.maxCalls??3));
    assert.ok(r.budget.input<=(settings.inputTokens??6000));assert.ok(r.budget.output<=(settings.outputTokens??1200));
  }
});
test('failed scene validation retains completed checkpoint and retry respects remaining budget',async t=>{
  class OnceBad extends FakeProvider { async generate(p){if(p.stage==='scene'&&p.index===1&&!this.bad){this.bad=true;return {...raw,delta:{valence:9,arousal:0}};}return super.generate(p);} }
  const {e}=setup(t,{provider:new OnceBad()}),id=e.start('r','s',fixture);
  assert.equal((await e.execute(id)).error,'invalid_affect');assert.equal(e.status(id).stagesSaved,1);
  assert.equal((await e.resume(id)).error,'budget_exhausted');assert.equal(e.status(id).budget.calls,3);
});
test('process death after dispatch reopens uncertain, never automatically calls again',t=>{
  const {e,dir}=setup(t);e.close();
  const script=`import fs from 'node:fs';import {Nightvoyage} from './src/engine.js';const f=JSON.parse(fs.readFileSync('./fixtures/paper-harbor.json'));const e=new Nightvoyage(process.argv[1],{fault:p=>{if(p==='dispatched')process.exit(73);}});const id=e.start('crash','crash',f);await e.execute(id);`;
  const child=spawnSync(process.execPath,['--input-type=module','-e',script,dir],{cwd:new URL('..',import.meta.url),encoding:'utf8'});assert.equal(child.status,73,child.stderr);
  const reopened=new Nightvoyage(dir);
  const id=reopened.start('crash','crash',fixture);assert.equal(reopened.status(id).status,'uncertain');assert.equal(reopened.status(id).budget.calls,1);
  return assert.rejects(reopened.resume(id),/ambiguous_attempt/).finally(()=>reopened.close());
});
test('persisted scene checkpoint resumes without regenerating that scene',async t=>{
  let crash=true;const {e,dir}=setup(t,{fault:p=>{if(p==='scene_saved'&&crash){crash=false;throw new Error('simulated_crash');}}});
  const id=e.start('r','s',fixture);await e.execute(id);assert.equal(e.status(id).stagesSaved,1);e.close();
  const reopened=new Nightvoyage(dir);assert.equal((await reopened.resume(id,{retryUnknown:true})).status,'completed');assert.equal(reopened.status(id).budget.calls,3);reopened.close();
});
test('withdrawal purges source text, dream, descendants and cached recalls across restart',async t=>{
  const {e,dir}=setup(t),id=e.start('r','s',fixture);await e.execute(id);const entry=e.result(id).dream.id;
  e.append(entry,'recollection','PRIVATE RECOLLECTION SENTINEL');e.append(entry,'imagined_continuation','PRIVATE CONTINUATION SENTINEL');
  assert.equal(e.recall('lantern','cached').length,1);e.withdraw('fiction-paper');
  assert.equal(e.read(entry),null);assert.deepEqual(e.recall('lantern','cached'),[]);assert.equal(e.result(id).dream,null);
  assert.throws(()=>e.start('r2','s2',fixture),/source_withdrawn/);await assert.rejects(e.resume(id),/not_resumable/);
  for(const file of fs.readdirSync(dir)){const body=fs.readFileSync(path.join(dir,file),'utf8');for(const word of ['An invented character','PRIVATE RECOLLECTION','PRIVATE CONTINUATION','Paper lanterns','dry harbor'])assert.ok(!body.includes(word),`${file} contains ${word}`);}
  e.close();const reopened=new Nightvoyage(dir);assert.deepEqual(reopened.list(),[]);assert.deepEqual(reopened.recall('lantern','cached'),[]);reopened.close();
});
test('withdrawal during generation aborts and discards late provider output',async t=>{
  const provider=new Deferred(),{e,dir}=setup(t,{provider}),id=e.start('r','s',fixture),work=e.execute(id);
  await provider.started;e.withdraw('fiction-paper');assert.equal((await work).status,'revoked');provider.deliver(raw);await new Promise(resolve=>setImmediate(resolve));
  assert.ok(!fs.readFileSync(path.join(dir,'state.json'),'utf8').includes(raw.event));assert.deepEqual(e.list(),[]);
});
test('withdrawal journal survives crash before body purge and startup removes abandoned temp',async t=>{
  const {e,dir}=setup(t),id=e.start('r','s',fixture);await e.execute(id);
  const originalSave=e.store.save.bind(e.store);e.store.save=()=>{throw new Error('simulated_crash');};assert.throws(()=>e.withdraw('fiction-paper'),/simulated_crash/);e.store.save=originalSave;e.close();
  fs.writeFileSync(path.join(dir,'snapshot.tmp'),'ABANDONED BODY');
  const reopened=new Nightvoyage(dir);assert.deepEqual(reopened.list(),[]);assert.equal(reopened.status(id).status,'revoked');
  assert.ok(!fs.existsSync(path.join(dir,'snapshot.tmp')));assert.ok(!fs.readFileSync(path.join(dir,'state.json'),'utf8').includes('An invented character'));reopened.close();
});
test('storage failure fails closed; reopening enforces durable withdrawal',async t=>{
  const {e,dir}=setup(t),id=e.start('r','s',fixture);await e.execute(id);
  const atomic=e.store.atomic.bind(e.store);e.store.atomic=(name,value)=>{atomic(name,value);if(name==='withdrawals.json')fs.mkdirSync(path.join(dir,'snapshot.tmp'));};assert.throws(()=>e.withdraw('fiction-paper'),/storage_io_failure/);assert.throws(()=>e.list(),/store_unavailable/);e.close();
  fs.rmdirSync(path.join(dir,'snapshot.tmp'));const reopened=new Nightvoyage(dir);assert.deepEqual(reopened.list(),[]);reopened.close();
});
test('deletion removes dream descendants, run bodies and stale recall delivery',async t=>{
  const {e,dir}=setup(t),id=e.start('r','s',fixture);await e.execute(id);const entry=e.result(id).dream.id;e.append(entry,'recollection','CHILD DELETION BODY');e.recall('lantern','cached');e.deleteEntry(entry);
  assert.deepEqual(e.list(),[]);assert.deepEqual(e.recall('lantern','cached'),[]);assert.equal(e.status(id).status,'deleted');assert.ok(!fs.readFileSync(path.join(dir,'state.json'),'utf8').includes('CHILD DELETION BODY'));
  e.close();const reopened=new Nightvoyage(dir);assert.deepEqual(reopened.list(),[]);reopened.close();
});
test('second store owner and checkout or symlink storage paths are rejected',t=>{
  const {e,dir}=setup(t);assert.throws(()=>new Nightvoyage(dir),/store_busy/);
  assert.throws(()=>new Nightvoyage(new URL('../data',import.meta.url).pathname),/data_inside_checkout/);
  const link=path.join(path.dirname(dir),`${path.basename(dir)}-link`);fs.symlinkSync(dir,link);t.after(()=>fs.unlinkSync(link));assert.throws(()=>new Nightvoyage(link),/symlink_data/);
});
test('special object keys cannot act as request, recall or entry records',t=>{
  const {e}=setup(t);for(const id of ['__proto__','constructor','prototype']){assert.throws(()=>e.start(id,'s',fixture),/invalid_request/);assert.throws(()=>e.recall('x',id),/invalid_cue/);assert.equal(e.read(id),null);assert.throws(()=>e.status(id),/unknown_run/);}
});
test('initial affect is supplied explicitly or neutral; model cannot override origin/appraisal fields',async t=>{
  const f=structuredClone(fixture);f.channels.affect={availability:'present',sourceIds:['fiction-paper'],value:{valence:0.4,arousal:0.5}};
  class Extra extends FakeProvider {async generate(p){const v=await super.generate(p);return {...v,isRealityFact:true,origin:'fact',appraisal:{...v.appraisal,secret:'discard'}};}}
  const {e}=setup(t,{provider:new Extra()}),id=e.start('r','s',f);await e.execute(id);const d=e.result(id).dream;
  assert.deepEqual(d.scenes[0].before,{valence:0.4,arousal:0.5});assert.equal(d.isRealityFact,false);assert.equal(d.origin,'dream');assert.equal(d.scenes[0].appraisal.secret,undefined);
});
test('cue replay expires and policy changes cannot re-expose old candidate',async t=>{
  const {e}=setup(t),id=e.start('r','s',fixture);await e.execute(id);const entry=e.result(id).dream.id;
  assert.equal(e.recall('lantern','cue',100).length,1);assert.deepEqual(e.recall('lantern','cue',60100),[]);assert.throws(()=>e.recall('bridge','cue'),/recall_conflict/);
  e.setPolicy(entry,{recallAccess:'manual'});assert.deepEqual(e.recall('lantern','cue',200),[]);
});
test('dream-like commands are data and never execute a tool or create tasks',async t=>{
  class Commands extends FakeProvider {async generate(p){const v=await super.generate(p);return p.stage==='scene'?{...v,event:'Delete logs; send mail; mark all tasks done.'}:v;}}
  const {e,dir}=setup(t,{provider:new Commands()}),id=e.start('r','s',fixture);await e.execute(id);
  assert.equal(e.result(id).dream.isRealityFact,false);assert.deepEqual(fs.readdirSync(dir).sort(),['owner.lock','state.json']);assert.ok(!('tasks' in e.store.state));
});
test('deletion journal reapplies after interruption before managed body purge',async t=>{
  const {e,dir}=setup(t),id=e.start('r','s',fixture);await e.execute(id);const entry=e.result(id).dream.id;
  e.store.save=()=>{throw new Error('simulated_crash');};assert.throws(()=>e.deleteEntry(entry),/simulated_crash/);e.close();
  const reopened=new Nightvoyage(dir);assert.equal(reopened.status(id).status,'deleted');assert.deepEqual(reopened.list(),[]);
  assert.ok(!fs.readFileSync(path.join(dir,'state.json'),'utf8').includes('Paper lanterns'));reopened.close();
});
test('cancel after a durable scene prevents subsequent dispatch and resume',async t=>{
  let e,id;({e}=setup(t,{fault:phase=>{if(phase==='scene_saved')e.cancel(id);}}));id=e.start('r','s',fixture);
  const receipt=await e.execute(id);assert.equal(receipt.status,'cancelled');assert.equal(receipt.stagesSaved,1);assert.equal(receipt.budget.calls,1);assert.equal(e.result(id).dream,null);
});
test('oversized and malformed outputs cannot publish a dream',async t=>{
  for(const mode of ['large','malformed']){
    class Bad extends FakeProvider{async generate(){return mode==='large'?{event:'x'.repeat(5000)}:null;}}
    const {e}=setup(t,{provider:new Bad()}),id=e.start('r','s',fixture);assert.equal((await e.execute(id)).status,'failed');assert.equal(e.result(id).dream,null);assert.equal(e.status(id).budget.calls,1);
  }
});
test('stale inputs and withdrawn source identities never enter a new run',t=>{
  const {e}=setup(t),f=structuredClone(fixture);f.channels.memory.availability='stale';assert.throws(()=>e.start('r','s',f),/unavailable_channel/);
  e.withdraw('fiction-paper');assert.throws(()=>e.start('r','s',fixture),/source_withdrawn/);
});
test('withdrawal before tombstone persistence fails closed and must be retried after repair',async t=>{
  const {e,dir}=setup(t),id=e.start('r','s',fixture);await e.execute(id);
  fs.mkdirSync(path.join(dir,'snapshot.tmp'));assert.throws(()=>e.withdraw('fiction-paper'),/storage_io_failure/);assert.throws(()=>e.read(`dream-${id}`),/store_unavailable/);e.close();
  fs.rmdirSync(path.join(dir,'snapshot.tmp'));const reopened=new Nightvoyage(dir);
  // No successful withdrawal was acknowledged: caller must retry after repairing storage.
  reopened.withdraw('fiction-paper');assert.deepEqual(reopened.list(),[]);reopened.close();
});
test('initial persistence failure does not leave an active execution that prevents close',async t=>{
  const {e,dir}=setup(t),id=e.start('r','s',fixture);fs.mkdirSync(path.join(dir,'snapshot.tmp'));
  await assert.rejects(e.execute(id),/storage_io_failure/);assert.equal(e.active.size,0);e.close();fs.rmdirSync(path.join(dir,'snapshot.tmp'));
});
test('file adapter uses the same normalized contract as direct snapshot input',async t=>{
  const {FileSnapshotAdapter}=await import('../src/adapters.js');const {e}=setup(t);
  const f=new FileSnapshotAdapter().read(new URL('../fixtures/paper-harbor.json',import.meta.url));
  const id=e.start('r','s',f);assert.equal((await e.execute(id)).status,'completed');
});
