import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { compactValidationDiagnostic, reviewedValidationDiagnostic } from '../src/validation-diagnostic.js';
import { BudgetedNightvoyage } from '../src/budgeted-runtime.js';

const canary='DUMMY-PRIVATE-TEXT-NOT-FOR-PERSISTENCE';
const input=()=>{
  const seed=JSON.parse(fs.readFileSync(new URL('../fixtures/quality/sparse-context.json',import.meta.url)));
  seed.sources[0].grant.modelEgress=true;return seed;
};
const raw=()=>({event:'梦里的人停下，望着桌上的纸片。',appraisal:{goalEffect:0,control:0.5,uncertainty:0.5},
  delta:{valence:0,arousal:0},evidence:[],links:{goal:null,control:null,uncertainty:null,affect:null}});
function setup(t,body) {
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-diagnostic-'));
  t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const allowance={id:'diagnostic-local',mode:'stub',approved:true,expiresAt:Date.now()+60000,
    limits:{maxRuns:1,maxCalls:3,maxMicroCny:1000000},pricing:{model:'deepseek-flash',contextTokenLimit:1000,
      inputMicroCnyPerMillion:1000000,outputMicroCnyPerMillion:2000000,reference:'https://api-docs.deepseek.com/TEST-ONLY',checkedAt:1}};
  let calls=0;
  const options={allowance,enabled:true,mode:'stub',protocol:'compact-appraisal-v1',credential:canary,fetchImpl:async()=>{
    calls++;return new Response(JSON.stringify({model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(body)}}],
      usage:{prompt_tokens:100,completion_tokens:80,total_tokens:180},privateMetadata:canary}));
  }};
  const e=new BudgetedNightvoyage(directory,options);t.after(()=>e.close());
  return {e,directory,options,calls:()=>calls};
}
test('diagnostic vocabulary strips arbitrary details and never echoes unknown exception text',()=>{
  assert.equal(compactValidationDiagnostic(canary).check,'unclassified_validation_failure');
  const d=compactValidationDiagnostic('invalid_compact_reference');
  assert.deepEqual(reviewedValidationDiagnostic({...d,text:canary,stack:canary,usage:{text:canary}}),d);
  for(const value of [{...d,check:canary},{...d,stage:canary},{...d,protocolVersion:canary},{...d,schemaVersion:2},null])
    assert.equal(reviewedValidationDiagnostic(value),null);
});
test('integrated compact rejections persist distinct body-free checks and keep unknown full holds',async t=>{
  const cases=[
    ['invalid_compact_evidence',x=>x.evidence=['not in event']],
    ['invalid_compact_reference',x=>x.links.control=99],
    ['unused_compact_evidence',x=>x.evidence=['纸片']],
    ['invalid_scene',x=>x.appraisal.goalEffect=2],
    ['invalid_appraisal',x=>x.appraisal.control=2],
    ['invalid_affect',x=>x.delta.valence=2],
    ['neutral_goal_evidence_must_be_null',x=>{x.evidence=['纸片'];x.links.goal=[0,0];}],
    ['nonzero_goal_requires_evidence',x=>x.appraisal.goalEffect=-1],
    ['unbased_appraisal_requires_placeholder',x=>x.appraisal.control=0],
    ['affect_change_requires_evidence',x=>x.delta.arousal=0.1]
  ];
  for(const [check,mutate] of cases){
    const body=raw();mutate(body);const s=setup(t,body),id=s.e.start('reject','reject',input());
    assert.equal((await s.e.execute(id)).status,'failed');const packet=s.e.result(id),row=packet.receipt.billing[0];
    assert.equal(packet.receipt.error,'compact_appraisal_invalid');assert.equal(packet.dream,null);assert.equal(packet.appraisalView,undefined);
    assert.equal(row.validationDiagnostic.check,check);assert.equal(row.status,'unknown');assert.equal(row.chargedMicroCny,row.reservedMicroCny);
    assert.equal(row.usage,undefined);assert.equal(s.calls(),1);
    const disk=fs.readFileSync(path.join(s.directory,'state.json'),'utf8');assert.ok(!disk.includes(body.event));assert.ok(!disk.includes(canary));
    s.e.close();const reopened=new BudgetedNightvoyage(s.directory,s.options);
    assert.deepEqual(reopened.status(id).billing[0].validationDiagnostic,compactValidationDiagnostic(check));
    await reopened.resume(id,{retryUnknown:true});assert.equal(s.calls(),1);assert.equal(reopened.result(id).dream,null);reopened.close();
  }
});
test('withdrawal and reopen retain only fixed diagnostic metadata and cannot recover rejected body',async t=>{
  const body=raw();body.links.control=99;const s=setup(t,body),id=s.e.start('withdraw','withdraw',input());await s.e.execute(id);
  s.e.withdraw('q-sparse-memory');s.e.close();const reopened=new BudgetedNightvoyage(s.directory,s.options);
  const row=reopened.client.ledger.status(s.options.allowance.id).attempts[0];assert.equal(row.validationDiagnostic.check,'invalid_compact_reference');
  assert.equal(row.status,'unknown');assert.ok(!fs.readFileSync(path.join(s.directory,'state.json'),'utf8').includes(body.event));
  assert.throws(()=>reopened.start('new','new',input()),/withdrawn/);assert.equal(s.calls(),1);reopened.close();
});
test('ledger cannot attach free text diagnostics or overwrite a settled row',async t=>{
  const s=setup(t,raw()),ledger=s.e.client.ledger,a=s.options.allowance.id;
  const reserve=id=>ledger.reserve(a,{requestId:id,runId:'local',fingerprint:'a'.repeat(64),sourceRefs:[{id:'q-sparse-memory',version:'1'}],maxOutputTokens:400});
  reserve('bad');ledger.dispatch(a,'bad');ledger.unknown(a,'bad',{...compactValidationDiagnostic('invalid_scene'),check:canary});
  assert.equal(ledger.attempt(a,'bad').validationDiagnostic,undefined);
  reserve('settled');ledger.dispatch(a,'settled');ledger.settle(a,'settled',{model:'deepseek-flash',usage:{inputTokens:10,outputTokens:10,totalTokens:20}});
  const before=structuredClone(ledger.attempt(a,'settled'));ledger.unknown(a,'settled',compactValidationDiagnostic('invalid_scene'));
  assert.deepEqual(ledger.attempt(a,'settled'),before);assert.ok(!fs.readFileSync(path.join(s.directory,'state.json'),'utf8').includes(canary));
});
test('old unknown attempts stay unknown with no invented diagnostic after reopen',async t=>{
  const s=setup(t,raw()),ledger=s.e.client.ledger,a=s.options.allowance.id;
  ledger.reserve(a,{requestId:'old',runId:'old',fingerprint:'b'.repeat(64),sourceRefs:[{id:'q-sparse-memory',version:'1'}],maxOutputTokens:400});
  ledger.dispatch(a,'old');ledger.unknown(a,'old');const before=structuredClone(ledger.attempt(a,'old'));s.e.close();
  const reopened=new BudgetedNightvoyage(s.directory,s.options);assert.deepEqual(reopened.client.ledger.attempt(a,'old'),before);assert.equal(s.calls(),0);reopened.close();
});
test('diagnostic save failure fails closed and reopening preserves full reservation without body',async t=>{
  const body=raw();body.links.control=99;const s=setup(t,body),id=s.e.start('io','io',input()),save=s.e.store.save.bind(s.e.store);
  s.e.store.save=()=>{if(s.e.client.ledger.account(s.options.allowance.id).attempts[`stage-${id}-scene-0`]?.validationDiagnostic){
    fs.mkdirSync(path.join(s.directory,'snapshot.tmp'));}return save();};
  await assert.rejects(s.e.execute(id));s.e.close();fs.rmdirSync(path.join(s.directory,'snapshot.tmp'));
  const reopened=new BudgetedNightvoyage(s.directory,s.options),row=reopened.status(id).billing[0];
  assert.equal(row.status,'unknown');assert.equal(row.chargedMicroCny,row.reservedMicroCny);assert.equal(reopened.result(id).dream,null);
  assert.ok(!fs.readFileSync(path.join(s.directory,'state.json'),'utf8').includes(body.event));assert.equal(s.calls(),1);reopened.close();
});
