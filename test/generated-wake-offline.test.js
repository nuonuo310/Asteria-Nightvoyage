import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {generatedWakeFixture as fixture} from '../fixtures/generated-wake-offline.js';
import {GeneratedWakeRehearsal} from '../src/generated-wake-runtime.js';
import {readGeneratedWakeView,renderGeneratedWakeView} from '../src/generated-wake-records.js';
import {normalizeGeneratedWakeResponse,generatedWakeProtocolVersion,generatedWakeRuntimeVersion,generatedWakeTextBasis} from '../src/generated-wake-protocol.js';
import {Nightvoyage} from '../src/engine.js';
import {FakeProvider} from '../src/fake-provider.js';

const at=1760000000000;
function directory(t){
  const value=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-generated-wake-'));
  t.after(()=>fs.rmSync(value,{recursive:true,force:true}));
  return value;
}
function http(data){
  return {status:200,body:{model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(data)}}],usage:{prompt_tokens:100,completion_tokens:80,total_tokens:180}}};
}
function wakeData(request,{firstFeeling=fixture.wake.firstFeeling,omitFirstFeeling=false}={}){
  const material=JSON.parse(request.body.messages[1].content);
  const data={fragment:material.previousScenes[fixture.wake.fragmentSceneIndex].event,
    residue:fixture.wake.residue,associations:[...fixture.wake.associations]};
  if(!omitFirstFeeling)data.firstFeeling=structuredClone(firstFeeling);
  return data;
}
function setup(t,{wakeFactory=wakeData,wakeOptions={}}={}){
  const dir=directory(t),calls=[];
  const simulator=request=>{
    const material=JSON.parse(request.body.messages[1].content);
    calls.push(request);
    const data=material.stage==='wake'?wakeFactory(request,wakeOptions):structuredClone(fixture.scenes[material.sceneIndex]);
    return http(data);
  };
  const engine=new GeneratedWakeRehearsal(dir,{allowance:structuredClone(fixture.allowance),simulator,enabled:true,now:()=>at});
  t.after(()=>engine.close());
  return {engine,dir,calls,simulator};
}
async function complete(t,id='g-wake',options){
  const context=setup(t,options),runId=context.engine.start(id,id,fixture.snapshot);
  const status=await context.engine.execute(runId),packet=context.engine.result(runId);
  return {...context,runId,status,packet,view:packet.dream?readGeneratedWakeView(context.engine.store,packet.dream.id,{now:at}):null};
}

test('two scenes and one wake settle in three fake calls and publish a distinct generated feeling',async t=>{
  const context=await complete(t),{engine,status,packet,view,calls}=context;
  assert.equal(status.status,'completed');assert.equal(status.error,undefined);
  assert.equal(calls.length,3);assert.deepEqual(calls.map(call=>JSON.parse(call.body.messages[1].content).stage),['scene','scene','wake']);
  assert.ok(calls.every(call=>call.body.max_tokens===400));
  assert.deepEqual(engine.rows(packet.dream.runId).map(row=>row.status),['settled','settled','settled']);
  assert.equal(engine.store.state.billing,undefined);assert.ok(engine.store.state.generatedWakeBilling);
  assert.equal(view.protocolVersion,generatedWakeProtocolVersion);assert.equal(view.dream.scenes.length,2);
  assert.equal(view.wake.fragment,fixture.scenes[1].event);assert.equal(view.wake.fragmentSceneIndex,1);
  assert.equal(view.firstFeeling.status,'present');assert.equal(view.firstFeeling.text,fixture.wake.firstFeeling.text);
  assert.equal(view.firstFeeling.textBasis,generatedWakeTextBasis);assert.notEqual(view.firstFeeling.textBasis,'explicit_fictional_record');
  assert.equal(view.firstFeeling.recordedAt,at);assert.equal(view.firstFeeling.sourceVersion,'1');
  assert.equal(view.firstFeeling.wakeAttempt.protocolVersion,generatedWakeProtocolVersion);
  assert.equal(view.firstFeeling.wakeAttempt.requestId,engine.rows(packet.dream.runId)[2].requestId);
  assert.equal(view.residue.label,'simulated_estimate');assert.equal(view.residue.strength,fixture.wake.residue);
  assert.equal(Object.hasOwn(packet.dream,'firstFeeling'),false);assert.equal(Object.hasOwn(packet.wake,'firstFeeling'),false);
  assert.equal(JSON.stringify(view).includes('deepseek'),false);
});

test('absent, uncertain and omitted remain distinct; quiet negative material is accepted',async t=>{
  const absent=await complete(t,'absent',{wakeOptions:{firstFeeling:{status:'absent'}}}),uncertain=await complete(t,'uncertain',{wakeOptions:{firstFeeling:{status:'uncertain'}}}),omitted=await complete(t,'omitted',{wakeOptions:{omitFirstFeeling:true}});
  for(const context of [absent,uncertain,omitted]){
    assert.equal(context.status.status,'completed');assert.equal(context.calls.length,3);
    assert.equal(context.view.dream.scenes[1].delta.valence,-0.05);
    assert.equal(context.view.dream.scenes[1].delta.arousal,0.05);
  }
  assert.equal(absent.view.firstFeeling.status,'absent');assert.equal(Object.hasOwn(absent.view.firstFeeling,'text'),false);
  assert.equal(uncertain.view.firstFeeling.status,'uncertain');assert.equal(Object.hasOwn(uncertain.view.firstFeeling,'text'),false);
  assert.equal(omitted.view.firstFeeling,null);assert.equal(omitted.view.firstFeelingOmitted,true);
  assert.equal(Object.values(omitted.engine.store.state.entries).some(entry=>entry?.origin==='generated_wake_first_feeling'),false);
  assert.equal(omitted.engine.store.state.generatedWakeJournal.dreams[omitted.view.dream.id].status,'omitted');
  assert.match(renderGeneratedWakeView(absent.view),/\u65e0\uff08\u660e\u786e\u8bb0\u4e3a\u65e0\uff09/);
  assert.match(renderGeneratedWakeView(uncertain.view),/\u8bf4\u4e0d\u6e05\uff08\u660e\u786e\u8bb0\u5f55\uff09/);
  assert.equal(renderGeneratedWakeView(omitted.view).includes('\u3010\u521a\u9192\u5fc3\u60c5\u3011'),false);
});

test('the wake schema rejects unknown keys, null, wrong types, blank or overlong text and inexact fragments',()=>{
  const previousScenes=[{event:fixture.scenes[1].event}];
  const valid={fragment:fixture.scenes[1].event,associations:[],residue:.1,firstFeeling:{status:'present',text:'ok'}};
  const normalize=data=>normalizeGeneratedWakeResponse(data,{previousScenes});
  assert.equal(normalize(valid).firstFeeling.text,'ok');
  assert.equal(normalize({...valid,firstFeeling:{status:'present',text:'a'.repeat(240)}}).firstFeeling.text.length,240);
  for(const value of [
    {...valid,extra:true},
    {...valid,fragment:'not in the saved scene'},
    {...valid,firstFeeling:null},
    {...valid,firstFeeling:'present'},
    {...valid,firstFeeling:{status:'present'}},
    {...valid,firstFeeling:{status:'present',text:'   '}},
    {...valid,firstFeeling:{status:'present',text:'a'.repeat(241)}},
    {...valid,firstFeeling:{status:'absent',text:'x'}},
    {...valid,firstFeeling:{status:'unknown'}},
    {...valid,firstFeeling:{status:'uncertain',extra:true}}
  ])assert.throws(()=>normalize(value),/generated_wake|invalid_generated_wake/);
});

test('an invalid third response fails the stage as unknown, without a retry or a completed dream',async t=>{
  const context=await complete(t,'invalid-feeling',{wakeOptions:{firstFeeling:{status:'present',text:'a'.repeat(241)}}});
  assert.equal(context.status.status,'failed');assert.equal(context.status.error,'invalid_wake');assert.equal(context.calls.length,3);
  assert.deepEqual(context.engine.rows(context.runId).map(row=>row.status),['settled','settled','unknown']);
  assert.equal(context.packet.dream,null);
  assert.equal(Object.values(context.engine.store.state.entries).length,0);
});

test('a final-state persistence failure cannot expose completed wake or feeling after reopen',async t=>{
  const dir=directory(t),calls=[];
  const simulator=request=>{calls.push(request);const material=JSON.parse(request.body.messages[1].content);return http(material.stage==='wake'?wakeData(request):structuredClone(fixture.scenes[material.sceneIndex]));};
  const engine=new GeneratedWakeRehearsal(dir,{allowance:structuredClone(fixture.allowance),simulator,enabled:true,now:()=>at});
  const runId=engine.start('io-failure','io-failure',fixture.snapshot),original=engine.store.atomic.bind(engine.store);
  engine.store.atomic=(name,value)=>{
    if(name==='state.json'&&value.runs[runId]?.wake!==undefined){engine.store.poisoned=true;throw Error('storage_io_failure');}
    return original(name,value);
  };
  await assert.rejects(engine.execute(runId),/storage_io_failure/);
  assert.equal(calls.length,3);assert.throws(()=>engine.result(runId),/store_unavailable/);
  engine.close();
  const reopened=new GeneratedWakeRehearsal(dir,{allowance:structuredClone(fixture.allowance),simulator,enabled:false,now:()=>at});
  t.after(()=>reopened.close());
  const run=reopened.run(runId),rows=reopened.rows(runId);
  assert.equal(run.status,'uncertain');assert.equal(run.entryId,undefined);assert.equal(rows.length,3);
  assert.equal(rows[2].status,'unknown');assert.equal(rows[2].chargedMicroCny,rows[2].reservedMicroCny);
  assert.equal(Object.values(reopened.store.state.entries).length,0);assert.equal(reopened.result(runId).dream,null);
  assert.equal(calls.length,3);
});

test('cancellation without a fake response leaves an unknown hold and no dream',async t=>{
  const dir=directory(t);let engine,id,calls=0;
  const simulator=()=>{calls++;throw Error('late');};
  engine=new GeneratedWakeRehearsal(dir,{allowance:structuredClone(fixture.allowance),simulator,enabled:true,now:()=>at,
    fault:phase=>{if(phase==='generated_dispatched')engine.cancel(id);}});
  t.after(()=>engine.close());
  id=engine.start('cancel-run','cancel-run',fixture.snapshot);
  const status=await engine.execute(id);
  assert.equal(status.status,'cancelled');assert.equal(calls,0);assert.equal(engine.rows(id).length,1);
  assert.equal(engine.rows(id)[0].status,'unknown');assert.equal(engine.result(id).dream,null);
});

test('a source withdrawal while the third fake call is late blocks publication and survives reopen',async t=>{
  const dir=directory(t);let engine,calls=0;
  const simulator=request=>{
    calls++;const material=JSON.parse(request.body.messages[1].content);
    if(material.stage==='wake')engine.withdraw('generated-wake-offline-memory');
    return http(material.stage==='wake'?wakeData(request):structuredClone(fixture.scenes[material.sceneIndex]));
  };
  engine=new GeneratedWakeRehearsal(dir,{allowance:structuredClone(fixture.allowance),simulator,enabled:true,now:()=>at});
  const id=engine.start('late-withdraw','late-withdraw',fixture.snapshot);
  const status=await engine.execute(id);
  assert.equal(status.status,'revoked');assert.equal(calls,3);assert.equal(engine.rows(id).length,3);
  assert.equal(engine.rows(id)[2].status,'unknown');assert.equal(engine.result(id).dream,null);
  assert.equal(Object.values(engine.store.state.entries).length,0);
  engine.close();
  const reopened=new GeneratedWakeRehearsal(dir,{allowance:structuredClone(fixture.allowance),simulator,enabled:false,now:()=>at});
  t.after(()=>reopened.close());
  assert.equal(reopened.result(id).dream,null);assert.equal(Object.values(reopened.store.state.entries).length,0);
});

test('reopen keeps one record, re-execution makes no call, and later recall stays append-only',async t=>{
  const context=await complete(t,'reopen-dedupe'),{engine,dir,runId,packet,view,calls}=context;
  engine.append(packet.dream.id,'recollection','later one');
  engine.append(packet.dream.id,'recollection','later two');
  const first=readGeneratedWakeView(engine.store,packet.dream.id,{now:at});
  assert.deepEqual(first.later.map(item=>item.text),['later one','later two']);
  const recordsBefore=Object.values(engine.store.state.entries).filter(entry=>entry?.origin==='generated_wake_first_feeling').length;
  engine.close();
  const reopened=new GeneratedWakeRehearsal(dir,{allowance:structuredClone(fixture.allowance),simulator:context.simulator,enabled:true,now:()=>at});
  t.after(()=>reopened.close());
  const second=readGeneratedWakeView(reopened.store,packet.dream.id,{now:at});
  assert.deepEqual(second,first);assert.equal(recordsBefore,1);
  const callsBefore=calls.length;await reopened.execute(runId);assert.equal(calls.length,callsBefore);
  assert.equal(Object.values(reopened.store.state.entries).filter(entry=>entry?.origin==='generated_wake_first_feeling').length,1);
});

test('deleting the derived feeling leaves no empty card, and deleting the dream cannot resurrect it',async t=>{
  const context=await complete(t,'delete-run'),{engine,dir,packet,view}=context;
  engine.append(packet.dream.id,'recollection','a later thought');
  engine.deleteEntry(view.firstFeeling.id);
  const withoutFeeling=readGeneratedWakeView(engine.store,packet.dream.id,{now:at});
  assert.equal(withoutFeeling.firstFeeling,null);assert.equal(withoutFeeling.firstFeelingDeleted,true);
  assert.equal(renderGeneratedWakeView(withoutFeeling).includes('\u3010\u521a\u9192\u5fc3\u60c5\u3011'),false);
  engine.deleteEntry(packet.dream.id);
  assert.equal(readGeneratedWakeView(engine.store,packet.dream.id,{now:at}),null);
  engine.close();
  const reopened=new GeneratedWakeRehearsal(dir,{allowance:structuredClone(fixture.allowance),simulator:context.simulator,enabled:false,now:()=>at});
  t.after(()=>reopened.close());
  assert.equal(readGeneratedWakeView(reopened.store,packet.dream.id,{now:at}),null);
  assert.equal(Object.values(reopened.store.state.entries).length,0);
});

test('read order is dream, wake, optional feeling and later recall; controls and HTML-like text stay inert',async t=>{
  const text=String.fromCharCode(27)+'[31m <b>not markup</b>';
  const context=await complete(t,'render-order',{wakeOptions:{firstFeeling:{status:'present',text}}});
  const dreamId=context.packet.dream.id;
  context.engine.append(dreamId,'recollection','later A');
  context.engine.append(dreamId,'recollection','later B');
  const view=readGeneratedWakeView(context.engine.store,dreamId,{now:at}),rendered=renderGeneratedWakeView(view);
  const labels=['\u3010\u539f\u68a6\u3011','\u3010\u9192\u6765\u6b8b\u7247\u3011','\u3010\u521a\u9192\u5fc3\u60c5\u3011','\u3010\u540e\u6765\u56de\u60f3\u3011'];
  const positions=labels.map(label=>rendered.indexOf(label));
  assert.ok(positions.every(position=>position>=0));assert.deepEqual(positions,[...positions].sort((a,b)=>a-b));
  assert.equal(rendered.includes(String.fromCharCode(27)),false);assert.equal(rendered.includes('\\u001b'),true);
  assert.equal(rendered.split('\n').some(line=>line.startsWith('<b>')),false);
  assert.ok(rendered.indexOf('later A')<rendered.indexOf('later B'));
  assert.equal(rendered.includes('deepseek'),false);
});

test('the new runtime rejects an old allowance and a plain fake execution owner',async t=>{
  const dir=directory(t),simulator=request=>http(structuredClone(fixture.scenes[0]));
  assert.throws(()=>new GeneratedWakeRehearsal(dir,{allowance:{...structuredClone(fixture.allowance),generatedWakeOffline:'old'},
    simulator,enabled:true}),/generated_wake_offline_allowance_required/);
  assert.throws(()=>new GeneratedWakeRehearsal(dir,{allowance:{...structuredClone(fixture.allowance),protocolVersion:'inline-evidence-quotes-v1'},
    simulator,enabled:true}),/generated_wake_offline_allowance_required/);
  const plain=new Nightvoyage(dir,{provider:new FakeProvider()}),plainId=plain.start('plain-owner','plain-owner',fixture.snapshot);
  plain.close();
  const engine=new GeneratedWakeRehearsal(dir,{allowance:structuredClone(fixture.allowance),simulator,enabled:true});
  t.after(()=>engine.close());
  assert.throws(()=>engine.assertIdentity(plainId),/foreign_execution_owner/);
});

test('the fixed offline checker proves old gates stay closed and the synthetic loop completes',()=>{
  const result=spawnSync(process.execPath,['scripts/check-generated-wake-offline.mjs'],{cwd:new URL('..',import.meta.url),encoding:'utf8',timeout:20000,env:{...process.env,NIGHTVOYAGE_DEEPSEEK_KEY:'DUMMY-SENTINEL'}});
  assert.equal(result.status,0,result.stderr);assert.equal(result.stderr,'');assert.ok(!result.stdout.includes('DUMMY-SENTINEL'));
  const receipt=JSON.parse(result.stdout);
  assert.equal(receipt.status,'COMPLETE_SYNTHETIC_ONLY');assert.equal(receipt.currentPreflightReason,'source_inventory_changed');
  assert.equal(receipt.currentPaidContractReason,'paid_contract_source_changed');assert.equal(receipt.currentPaidEntryFailClosed,true);
  assert.equal(receipt.oldPreflightSourceMatches,true);assert.equal(receipt.oldHistoryPreserved,true);assert.equal(receipt.oldContractSourcePinned,true);
  assert.equal(receipt.dreamStages,2);assert.equal(receipt.wakeFragmentExact,true);assert.equal(receipt.generatedCalls,3);
  assert.equal(receipt.settledRows,3);assert.equal(receipt.firstFeelingStatus,'present');assert.equal(receipt.firstFeelingTextBasis,generatedWakeTextBasis);
  assert.equal(receipt.userStoreAccessed,false);assert.equal(receipt.keyReads,0);assert.equal(receipt.networkAttempts,0);assert.equal(receipt.realModelRequests,0);
});
