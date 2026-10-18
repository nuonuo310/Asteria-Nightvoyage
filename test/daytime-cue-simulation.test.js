import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Nightvoyage} from '../src/engine.js';
import {runDaytimeCueSimulation} from '../scripts/daytime-cue-simulation.mjs';
import {cuePlan,prepareDaytime,checkDaytimeCues} from '../test-support/daytime-cue-fixtures.js';
test('virtual day follows literal cues through misses, reopen, expiry, a fresh event and withdrawal',async()=>{
  const result=await checkDaytimeCues();assert.equal(result.clockRewindBlocked,true);assert.equal(result.withdrawnReplayEmptyAfterReopen,true);assert.equal(result.semanticRetrievalValidated,false);
});
test('all events are prevalidated, bounded and permission-denied plans cannot smuggle cues',async t=>{
  const {engine,cue}=await prepareDaytime(t),before=JSON.stringify(engine.store.state),event={id:'one',cue,at:1},base=cuePlan([event]);
  for(const plan of [{...base,materialKind:'real'},{...base,clock:'wall'},{...base,recallAllowed:false},{...base,model:'override'},cuePlan(Array.from({length:11},(_,i)=>({...event,id:`e${i}`,at:i}))),cuePlan([event,{id:'two',cue,at:NaN}]),cuePlan([{...event,id:'constructor'}]),cuePlan([{...event,id:'x'.repeat(97)}]),cuePlan([{...event,at:Number.MAX_SAFE_INTEGER}]),cuePlan([{...event,at:1.1}]),cuePlan([event,{...event,cue:'different',at:2}])])assert.throws(()=>runDaytimeCueSimulation(engine,plan));
  assert.equal(JSON.stringify(engine.store.state),before);
  const denied=runDaytimeCueSimulation(engine,{...cuePlan([]),recallAllowed:false});assert.equal(denied.status,'denied');assert.deepEqual(denied.events,[]);assert.equal(JSON.stringify(engine.store.state),before);
});
test('cue identity conflicts and persisted clock rewind refuse before new receipts after reopen',async t=>{
  const {engine,directory,cue}=await prepareDaytime(t);runDaytimeCueSimulation(engine,cuePlan([{id:'event',cue,at:100}]));engine.close();
  const back=new Nightvoyage(directory);try{
    const before=JSON.stringify(back.store.state);
    assert.throws(()=>runDaytimeCueSimulation(back,cuePlan([{id:'event',cue:'different',at:101}])),/daytime_event_conflict/);
    assert.throws(()=>runDaytimeCueSimulation(back,cuePlan([{id:'another',cue,at:99}])),/daytime_clock_rewind/);
    assert.equal(JSON.stringify(back.store.state),before);
  }finally{back.close();}
});
test('cherishing, simulated residue and cue accessibility remain separate controls',async t=>{
  const {engine,dreamId,cue}=await prepareDaytime(t),original=engine.read(dreamId),residue=engine.residue(dreamId,original.residue.startedAt);
  engine.setPolicy(dreamId,{cherished:true,recallAccess:'manual'});
  assert.deepEqual(runDaytimeCueSimulation(engine,cuePlan([{id:'manual',cue,at:1}])).events[0].candidates,[]);
  engine.setPolicy(dreamId,{recallAccess:'cue'});
  // A recorded miss is not upgraded by changing access later; a new event may match.
  assert.deepEqual(runDaytimeCueSimulation(engine,cuePlan([{id:'manual',cue,at:2}])).events[0].candidates,[]);
  assert.equal(runDaytimeCueSimulation(engine,cuePlan([{id:'new',cue,at:3}])).events[0].candidates.length,1);
  engine.setPolicy(dreamId,{recallAccess:'manual'});
  assert.deepEqual(runDaytimeCueSimulation(engine,cuePlan([{id:'new',cue,at:4}])).events[0].candidates,[]);
  assert.equal(engine.read(dreamId).cherished,true);assert.deepEqual(engine.residue(dreamId,original.residue.startedAt),residue);assert.deepEqual(engine.read(dreamId).scenes,original.scenes);
});
test('batch publication suppresses earlier bodies if a later event expires them or withdraws their source',async t=>{
  const {engine,sourceId,cue}=await prepareDaytime(t);
  let output=runDaytimeCueSimulation(engine,cuePlan([{id:'first',cue,at:1},{id:'miss',cue:'no-match-in-fiction',at:60001}]));
  assert.equal(output.events[0].status,'suppressed');assert.deepEqual(output.events[0].candidates,[]);
  const save=engine.store.save;let calls=0;engine.store.save=function(){save.call(this);if(++calls===3)this.withdraw(sourceId);};
  try{output=runDaytimeCueSimulation(engine,cuePlan([{id:'a',cue,at:60002},{id:'b',cue,at:60003}]));assert.ok(output.events.every(e=>e.candidates.length===0));}finally{engine.store.save=save;}
});
test('an already aborted invocation writes nothing; cancellation after a commit suppresses bodies and later events',async t=>{
  const {engine,cue}=await prepareDaytime(t),controller=new AbortController(),before=JSON.stringify(engine.store.state);controller.abort();
  assert.equal(runDaytimeCueSimulation(engine,cuePlan([{id:'pre',cue,at:1}]),{signal:controller.signal}).status,'cancelled');assert.equal(JSON.stringify(engine.store.state),before);
  const live=new AbortController(),save=engine.store.save;engine.store.save=function(){save.call(this);live.abort();};
  try{
    const result=runDaytimeCueSimulation(engine,cuePlan([{id:'first',cue,at:1},{id:'later',cue,at:2}]),{signal:live.signal});
    assert.equal(result.status,'cancelled');assert.ok(result.events.every(e=>e.candidates.length===0));assert.equal(engine.store.state.recalls['day-later'],undefined);
  }finally{engine.store.save=save;}
});
test('save failure returns no candidates and persisted receipt/clock reopen without refreshing expiry',async t=>{
  const {engine,directory,cue}=await prepareDaytime(t),atomic=engine.store.atomic;let calls=0;
  engine.store.atomic=function(...args){if(++calls===2){this.poisoned=true;throw Error('simulated_storage_failure');}return atomic.apply(this,args);};
  assert.throws(()=>runDaytimeCueSimulation(engine,cuePlan([{id:'saved',cue,at:1}])),/simulated_storage_failure/);engine.close();
  const back=new Nightvoyage(directory);try{
    const expiry=back.store.state.recalls['day-saved'].expiresAt;
    const result=runDaytimeCueSimulation(back,cuePlan([{id:'saved',cue,at:2}]));assert.equal(result.events[0].candidates[0].expiresAt,expiry);
    assert.deepEqual(runDaytimeCueSimulation(back,cuePlan([{id:'saved',cue,at:60001}])).events[0].candidates,[]);
  }finally{back.close();}
});
test('controller namespace and metadata corruption cannot adopt receipts or change simulation state',async t=>{
  const {engine,cue}=await prepareDaytime(t);engine.recall(cue,'day-existing',1);
  assert.throws(()=>runDaytimeCueSimulation(engine,cuePlan([{id:'existing',cue,at:2}])),/daytime_request_namespace_conflict/);
  runDaytimeCueSimulation(engine,cuePlan([{id:'okay',cue,at:3}]));engine.store.state.daytimeCueSimulation.events.okay.note='forbidden';
  assert.throws(()=>runDaytimeCueSimulation(engine,cuePlan([])),/invalid_daytime_simulation/);
});
test('candidate mutation cannot change future provenance and source withdrawal removes original and future replay',async t=>{
  const {engine,sourceId,cue,dreamId}=await prepareDaytime(t),plan=cuePlan([{id:'immutable',cue,at:1}]);
  const candidate=runDaytimeCueSimulation(engine,plan).events[0].candidates[0];candidate.sourceRefs=[];candidate.isRealityFact=true;
  const again=runDaytimeCueSimulation(engine,plan).events[0].candidates[0];assert.ok(again.sourceRefs.length);assert.equal(again.isRealityFact,false);
  engine.withdraw(sourceId);assert.equal(engine.read(dreamId),null);assert.deepEqual(runDaytimeCueSimulation(engine,plan).events[0].candidates,[]);
  const state=fs.readFileSync(`${engine.store.directory}/state.json`,'utf8');assert.equal(state.includes('"candidates"'),false);
});
test('one hundred durable event identities bound metadata growth and overflow creates no partial batch',async t=>{
  const {engine,cue}=await prepareDaytime(t);
  for(let batch=0;batch<10;batch++)runDaytimeCueSimulation(engine,cuePlan(Array.from({length:10},(_,i)=>({id:`e-${batch*10+i}`,cue,at:batch*10+i}))));
  assert.equal(Object.keys(engine.store.state.daytimeCueSimulation.events).length,100);
  const before=JSON.stringify(engine.store.state);
  assert.throws(()=>runDaytimeCueSimulation(engine,cuePlan([{id:'overflow',cue,at:100}])),/daytime_event_capacity_reached/);
  assert.equal(JSON.stringify(engine.store.state),before);
});
test('standalone fictional command cannot read provider credentials or enter native transport',async()=>{
  const {spawnSync}=await import('node:child_process');
  const guard=`import https from 'node:https';import http from 'node:http';let keys=0,calls=0;const env=process.env;process.env=new Proxy(env,{get(t,k){if(k==='NIGHTVOYAGE_DEEPSEEK_KEY'){keys++;throw Error('forbidden');}return Reflect.get(t,k);}});const stop=()=>{calls++;throw Error('forbidden');};globalThis.fetch=https.request=http.request=stop;process.on('exit',()=>{if(keys||calls)process.exitCode=1;});await import('./scripts/check-daytime-cues.mjs');`;
  const child=spawnSync(process.execPath,['--input-type=module','-e',guard],{cwd:new URL('..',import.meta.url),encoding:'utf8',timeout:15000});
  assert.equal(child.status,0,child.stderr);const result=JSON.parse(child.stdout);assert.equal(result.userStoreAccessed,false);assert.equal(result.realModelRequests,0);
});
