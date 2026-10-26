import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {Nightvoyage} from '../src/engine.js';
import {FakeProvider} from '../src/fake-provider.js';
import {readWakeFirstFeeling,readWakeFirstFeelingView,recordWakeFirstFeeling,renderWakeFirstFeelingView,wakeFirstFeelingVersion,wakeFirstFeelingViewVersion} from '../src/wake-first-feeling.js';

const fixture=JSON.parse(fs.readFileSync(new URL('../fixtures/wake-first-feeling.json',import.meta.url)));
class GroundedProvider extends FakeProvider {
  constructor({negative=false}={}){super();this.negative=negative;}
  async generate({stage,scenes}){
    if(stage==='wake')return {fragment:scenes.at(-1).event,residue:this.negative?0.3:0.12,associations:[]};
    if(scenes.length===0)return {event:this.negative?'虚构的人站在一条没有出口的走廊里，墙上的钟全都停着。':'一个虚构的守灯人把最后一盏纸灯挂到木桥边，河面没有风。',appraisal:{goalEffect:this.negative?-1:0,control:0.3,uncertainty:0.7},delta:{valence:-0.2,arousal:0.2}};
    return {event:this.negative?'走廊尽头的门没有把手，虚构的人只能听见自己的脚步。':'守灯人松开灯线，纸灯沿水面慢慢漂远，桥下的灯影分成两半。',appraisal:{goalEffect:-1,control:0.2,uncertainty:0.8},delta:{valence:-0.2,arousal:0.2}};
  }
}
function setup(t,options={}){
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-wake-first-feeling-'));let engine=new Nightvoyage(directory,{provider:new GroundedProvider(options)});
  t.after(()=>{try{engine.close();}catch{}fs.rmSync(directory,{recursive:true,force:true});});
  return {directory,get engine(){return engine;},reopen(){engine.close();engine=new Nightvoyage(directory,{provider:new GroundedProvider(options)});return engine;}};
}
async function dreamIn(engine,request='synthetic-dream'){
  const id=engine.start(request,`${request}-session`,fixture),status=await engine.execute(id);
  assert.equal(status.status,'completed');
  return engine.read(engine.result(id).dream.id);
}
const at=1761369000000;

test('fixed fictional loop persists an independent first feeling without rewriting dream, wake or receipt',async t=>{
  const ctx=setup(t),e=ctx.engine,dream=await dreamIn(e),original=e.read(dream.id),receipt=structuredClone(e.status(dream.runId)),billing=structuredClone(e.store.state.billing);
  const old=readWakeFirstFeelingView(e.store,dream.id,{now:dream.residue.startedAt}),oldText=renderWakeFirstFeelingView(old);
  assert.equal(old.firstFeeling,null);assert.doesNotMatch(oldText,/【刚醒心情】/);assert.doesNotMatch(oldText,/【后来回想】/);
  const feeling=recordWakeFirstFeeling(e.store,{dreamId:dream.id,requestId:'first-feeling-one',status:'present',text:'虚构角色醒来时胸口有点空，像还站在桥上。',now:at});
  assert.equal(wakeFirstFeelingVersion,'wake-first-feeling-v1');assert.equal(wakeFirstFeelingViewVersion,'wake-first-feeling-view-v1');
  assert.equal(feeling.origin,'wake_first_feeling');assert.equal(feeling.order,1);assert.equal(feeling.recordedAt,at);assert.deepEqual(feeling.derivedFrom,[dream.id]);assert.equal(feeling.isRealityFact,false);
  assert.deepEqual(e.read(dream.id),original);assert.deepEqual(e.status(dream.runId),receipt);assert.deepEqual(e.store.state.billing,billing);
  e.append(dream.id,'recollection','后来只记得纸灯在水上没有发出声音。');
  const view=readWakeFirstFeelingView(e.store,dream.id,{now:dream.residue.startedAt}),rendered=renderWakeFirstFeelingView(view);
  assert.deepEqual(view.dream.scenes,original.scenes);assert.equal(view.wake.fragment,original.scenes[1].event);assert.equal(view.wake.fragmentSceneIndex,1);assert.equal(view.residue.strength,0.12);assert.equal(view.firstFeeling.status,'present');assert.equal(view.later.length,1);
  assert.ok(rendered.indexOf('【原梦】')<rendered.indexOf('【醒来】')&&rendered.indexOf('【醒来】')<rendered.indexOf('【刚醒心情】')&&rendered.indexOf('【刚醒心情】')<rendered.indexOf('【后来回想】'));
  const stateFile=path.join(ctx.directory,'state.json'),bytes=fs.readFileSync(stateFile);readWakeFirstFeeling(e.store,dream.id);readWakeFirstFeelingView(e.store,dream.id,{now:dream.residue.startedAt});renderWakeFirstFeelingView(view);assert.deepEqual(fs.readFileSync(stateFile),bytes);
});

for(const status of ['absent','uncertain']){
  test(`explicit ${status} first feeling is shown without inventing text or an empty section`,async t=>{
    const e=setup(t).engine,dream=await dreamIn(e);
    assert.throws(()=>recordWakeFirstFeeling(e.store,{dreamId:dream.id,requestId:`bad-${status}`,status,text:'不应出现的文字',now:at}),/invalid_wake_first_feeling_text/);
    const feeling=recordWakeFirstFeeling(e.store,{dreamId:dream.id,requestId:`first-${status}`,status,now:at}),view=readWakeFirstFeelingView(e.store,dream.id,{now:dream.residue.startedAt}),rendered=renderWakeFirstFeelingView(view);
    assert.equal(feeling.status,status);assert.equal(Object.hasOwn(feeling,'text'),false);assert.equal(view.firstFeeling.status,status);assert.match(rendered,status==='absent'?/无（明确记为无）/:/说不清（明确记录）/);
  });
}

test('requests are idempotent, conflicts fail closed and one dream cannot gain a second feeling',async t=>{
  const e=setup(t).engine,dream=await dreamIn(e),input={dreamId:dream.id,requestId:'same-request',status:'present',text:'醒来时耳边还有水声。',now:at};
  const first=recordWakeFirstFeeling(e.store,input),replay=recordWakeFirstFeeling(e.store,input);
  assert.deepEqual(replay,{...first,replayed:true});assert.throws(()=>recordWakeFirstFeeling(e.store,{...input,text:'另一段。'}),/wake_first_feeling_request_conflict/);assert.throws(()=>recordWakeFirstFeeling(e.store,{dreamId:dream.id,requestId:'another-request',status:'uncertain',now:at}),/wake_first_feeling_already_recorded/);
  assert.throws(()=>recordWakeFirstFeeling(e.store,{dreamId:dream.id,requestId:'bad-extra',status:'uncertain',extra:true,now:at}),/invalid_wake_first_feeling_input/);assert.throws(()=>recordWakeFirstFeeling(e.store,{dreamId:dream.id,requestId:'bad-now',status:'uncertain',now:-1}),/invalid_wake_first_feeling_clock/);
});

test('negative dream and simulated residue do not become the first feeling or force a positive ending',async t=>{
  const e=setup(t,{negative:true}).engine,dream=await dreamIn(e),feeling=recordWakeFirstFeeling(e.store,{dreamId:dream.id,requestId:'negative-feeling',status:'present',text:'醒来时胸口发紧，想先坐着不动。',now:at}),view=readWakeFirstFeelingView(e.store,dream.id,{now:dream.residue.startedAt}),rendered=renderWakeFirstFeelingView(view);
  assert.equal(view.residue.strength,0.3);assert.equal(view.firstFeeling.text,feeling.text);assert.equal(view.later.length,0);assert.match(rendered,/不是刚醒心情/);assert.match(rendered,/醒来时胸口发紧/);assert.doesNotMatch(rendered,/已经安心|自动缓和/);
  const later=readWakeFirstFeelingView(e.store,dream.id,{now:dream.residue.startedAt+dream.residue.durationMs});
  assert.equal(later.firstFeeling.text,feeling.text);assert.equal(later.residue.strength,0);
});

test('first-feeling text is JSON-quoted so terminal controls and markup-like text stay inert',async t=>{
  const e=setup(t).engine,dream=await dreamIn(e),raw='心跳很快\u0007\n但说不清；<不是标签>';
  recordWakeFirstFeeling(e.store,{dreamId:dream.id,requestId:'escaped-feeling',status:'present',text:raw,now:at});
  const rendered=renderWakeFirstFeelingView(readWakeFirstFeelingView(e.store,dream.id,{now:dream.residue.startedAt}));
  assert.ok(rendered.includes('\\u0007'));assert.ok(rendered.includes('\\n'));assert.equal(rendered.includes('\u0007'),false);assert.ok(rendered.includes('<不是标签>'));
});

test('deletion and reopen keep the dream intact, omit the first-feeling section and refuse resurrection',async t=>{
  const ctx=setup(t),e=ctx.engine,dream=await dreamIn(e),original=e.read(dream.id),feeling=recordWakeFirstFeeling(e.store,{dreamId:dream.id,requestId:'deleted-feeling',status:'present',text:'醒来时还听见走廊里的脚步。',now:at});
  e.deleteEntry(feeling.id);assert.equal(e.read(feeling.id),null);assert.equal(readWakeFirstFeeling(e.store,dream.id),null);assert.deepEqual(e.read(dream.id),original);assert.doesNotMatch(renderWakeFirstFeelingView(readWakeFirstFeelingView(e.store,dream.id,{now:dream.residue.startedAt})),/【刚醒心情】/);
  assert.throws(()=>recordWakeFirstFeeling(e.store,{dreamId:dream.id,requestId:'deleted-feeling',status:'present',text:'醒来时还听见走廊里的脚步。',now:at}),/wake_first_feeling_request_unavailable/);
  assert.throws(()=>recordWakeFirstFeeling(e.store,{dreamId:dream.id,requestId:'replacement-feeling',status:'uncertain',now:at}),/wake_first_feeling_already_recorded/);
  const reopened=ctx.reopen();assert.equal(readWakeFirstFeeling(reopened.store,dream.id),null);assert.deepEqual(reopened.read(dream.id),original);assert.doesNotMatch(renderWakeFirstFeelingView(readWakeFirstFeelingView(reopened.store,dream.id,{now:dream.residue.startedAt})),/【刚醒心情】/);
});

test('source withdrawal removes derived first feeling and later recall without delivery after reopen',async t=>{
  const ctx=setup(t),e=ctx.engine,dream=await dreamIn(e);recordWakeFirstFeeling(e.store,{dreamId:dream.id,requestId:'withdrawn-feeling',status:'present',text:'醒来时记得虚构的桥。',now:at});e.append(dream.id,'recollection','后来仍记得虚构的桥。');
  e.withdraw('fiction-wake-first-feeling');assert.equal(e.read(dream.id),null);assert.equal(readWakeFirstFeeling(e.store,dream.id),null);assert.equal(readWakeFirstFeelingView(e.store,dream.id,{now:at}),null);assert.equal(Object.values(e.store.state.entries).some(entry=>entry?.origin==='wake_first_feeling'||entry?.origin==='recollection'),false);
  const reopened=ctx.reopen();assert.equal(Object.values(reopened.store.state.entries).some(entry=>entry?.origin==='wake_first_feeling'||entry?.origin==='recollection'),false);assert.equal(readWakeFirstFeelingView(reopened.store,dream.id,{now:at}),null);
});

test('malformed records, journals and non-excerpt wake notes are rejected without guessing a feeling',async t=>{
  const e=setup(t).engine,dream=await dreamIn(e);recordWakeFirstFeeling(e.store,{dreamId:dream.id,requestId:'valid-feeling',status:'present',text:'醒来时还记得桥上的灯影。',now:at});
  const id=e.store.state.wakeFirstFeeling.dreams[dream.id].entryId;e.store.state.entries[id].status='invented';assert.throws(()=>readWakeFirstFeeling(e.store,dream.id),/invalid_wake_first_feeling_record/);e.store.state.entries[id].status='present';
  const fragment=e.store.state.entries[dream.id].wake.fragment;e.store.state.entries[dream.id].wake.fragment='并非原梦逐字摘录';assert.throws(()=>readWakeFirstFeelingView(e.store,dream.id,{now:at}),/wake_first_feeling_requires_excerpt_wake/);e.store.state.entries[dream.id].wake.fragment=fragment;
  e.store.state.wakeFirstFeeling.version=2;assert.throws(()=>readWakeFirstFeeling(e.store,dream.id),/invalid_wake_first_feeling_journal/);
});

test('two dreams keep independent global order and sources while old dream records remain untouched',async t=>{
  const e=setup(t).engine,first=await dreamIn(e,'first-dream'),firstOriginal=e.read(first.id),second=await dreamIn(e,'second-dream'),secondOriginal=e.read(second.id);
  const a=recordWakeFirstFeeling(e.store,{dreamId:first.id,requestId:'first-order',status:'present',text:'第一场虚构的醒后心情。',now:at}),b=recordWakeFirstFeeling(e.store,{dreamId:second.id,requestId:'second-order',status:'uncertain',now:at+1});
  assert.equal(a.order,1);assert.equal(b.order,2);assert.deepEqual(e.read(first.id),firstOriginal);assert.deepEqual(e.read(second.id),secondOriginal);assert.notDeepEqual(readWakeFirstFeeling(e.store,first.id).derivedFrom,readWakeFirstFeeling(e.store,second.id).derivedFrom);
});

test('synthetic-only demo runs three fake stages and prints the ordered read-only view',()=>{
  const result=spawnSync(process.execPath,['scripts/wake-first-feeling-demo.mjs'],{cwd:new URL('..',import.meta.url),encoding:'utf8',timeout:10000,env:{...process.env,NIGHTVOYAGE_DEEPSEEK_KEY:''}});
  assert.equal(result.status,0,result.stderr);const out=result.stdout;
  assert.equal((out.match(/第 [12] 幕：/g)??[]).length,2);assert.ok(out.indexOf('【原梦】')<out.indexOf('【醒来】')&&out.indexOf('【醒来】')<out.indexOf('【刚醒心情】')&&out.indexOf('【刚醒心情】')<out.indexOf('【后来回想】'));assert.match(out,/逐字摘录来源：第 2 幕/);assert.match(out,/模拟余韵强度：0\.18（独立模拟估计，不是刚醒心情）/);
});

test('the non-paid feature has an independent source/data identity and does not claim paid or real-model authority',()=>{
  const identity=JSON.parse(fs.readFileSync(new URL('../docs/validation/wake-first-feeling-source-v1.json',import.meta.url))),lfIdentity=relative=>{const bytes=fs.readFileSync(new URL('../'+relative,import.meta.url)),lf=Buffer.from(bytes.toString('utf8').replaceAll('\r\n','\n'));return {lfBytes:lf.length,hash:createHash('sha256').update(lf).digest('hex')};};
  assert.equal(identity.identity,'wake-first-feeling-nonpaid-source-v1');assert.equal(identity.featureVersion,wakeFirstFeelingVersion);assert.equal(identity.viewVersion,wakeFirstFeelingViewVersion);assert.deepEqual(lfIdentity(identity.source.path),{lfBytes:identity.source.lfBytes,hash:identity.source.lfSha256});assert.deepEqual(lfIdentity(identity.fixture.path),{lfBytes:identity.fixture.lfBytes,hash:identity.fixture.lfSha256});assert.equal(fixture.materialKind,identity.fixture.materialKind);assert.equal(fixture.sources.every(source=>source.grant.modelEgress===false),true);for(const value of Object.values(identity.independence))assert.equal(value,false);
});
