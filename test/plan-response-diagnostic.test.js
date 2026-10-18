import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {markPlanResponseFailure,markPlanHttpFailure,planResponseDiagnostic,reviewedPlanResponseDiagnostic} from '../scripts/plan-response-diagnostic.mjs';
import {initPlanTrial,executePlanTrial,preflightPlanTrial} from '../scripts/chatgpt-plan-trial.mjs';
import {readPlanTrialHistory} from '../scripts/chatgpt-plan-trial-history.mjs';
import {syntheticPlanHttp,trialApproval} from '../test-support/plan-trial-fixtures.js';
import {Store} from '../src/store.js';
const sse=event=>`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
function dirs(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'plan-fixed-diagnostic-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return {root,directory:path.join(root,'book'),connectionDirectory:path.join(root,'connection')};}
function text(root){return fs.readdirSync(root,{withFileTypes:true}).map(e=>e.isDirectory()?text(path.join(root,e.name)):fs.readFileSync(path.join(root,e.name),'utf8')).join('\n');}
test('diagnostic vocabulary never persists arbitrary errors, getters, extra properties or raw provider text',()=>{
 for(const message of ['SECRET-TOKEN','plan_output_shape SECRET','unused_compact_evidence SECRET']){
  const error=markPlanResponseFailure(Error(message));assert.deepEqual(planResponseDiagnostic(error),{schemaVersion:1,layer:'unclassified',check:'unclassified_validation_failure'});
 }
 let reads=0;const malicious={get message(){reads++;return 'PRIVATE';}};markPlanResponseFailure(malicious);assert.equal(reads,0);
 assert.equal(planResponseDiagnostic(Error('plan_output_shape')),null);
 for(const value of [{schemaVersion:1,layer:'http',check:'http_content_type',body:'PRIVATE'},{schemaVersion:1,layer:'http',check:'plan_invalid_json'},{schemaVersion:1,layer:'SECRET',check:'SECRET'}])assert.equal(reviewedPlanResponseDiagnostic(value),null);
 assert.equal(reviewedPlanResponseDiagnostic({get schemaVersion(){reads++;return 1;},layer:'http',check:'http_content_type'}),null);assert.equal(reads,0);
 const error=markPlanHttpFailure(Error('PRIVATE'),'http_content_type');markPlanResponseFailure(error);const view=planResponseDiagnostic(error);view.check='PRIVATE';assert.equal(planResponseDiagnostic(error).check,'http_content_type');
});
test('protocol, stage and HTTP errors persist distinct fixed metadata with no repair, body or credential leakage',async t=>{
 const cases=[
  ['http','http_content_type',()=>new Response('PRIVATE-REJECTED-BODY',{headers:{'Content-Type':'application/json'}})],
  ['responses_protocol','plan_output_shape',()=>new Response(sse({type:'response.output_item.added',item:{type:'reasoning',content:'PRIVATE-REJECTED-BODY'}}),{headers:{'Content-Type':'text/event-stream'}})],
  ['responses_protocol','plan_invalid_json',()=>new Response(sse({type:'response.completed',response:{id:'dummy',status:'completed',model:'gpt-5.6-sol',output:[{type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:'PRIVATE-REJECTED-BODY'}]}],usage:{input_tokens:1,output_tokens:1,total_tokens:2}}}),{headers:{'Content-Type':'text/event-stream'}})],
  ['dream_stage','invalid_inline_shape',()=>new Response(sse({type:'response.completed',response:{id:'dummy',status:'completed',model:'gpt-5.6-sol',output:[{type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:JSON.stringify({event:'PRIVATE-REJECTED-BODY'})}]}],usage:{input_tokens:1,output_tokens:1,total_tokens:2}}}),{headers:{'Content-Type':'text/event-stream'}})]
 ];
 for(const [layer,check,onGenerate]of cases){
  const d=dirs(t);initPlanTrial(d.directory,trialApproval());const http=syntheticPlanHttp({onGenerate});http.install();let output;
  try{output=await executePlanTrial({...d,onReady:http.onReady});}finally{http.restore();}
  assert.equal(output.receipt.status,'failed');assert.equal(output.receipt.external_calls_started,1);assert.equal(output.dream,null);assert.equal(http.bodies.length,1);assert.equal(http.revoked,1);
  assert.deepEqual(output.receipt.validation_diagnostic,{schemaVersion:1,layer,check});assert.equal(output.receipt.usage[0].usage,'unknown');
  assert.deepEqual(preflightPlanTrial(d.directory).validation_diagnostic,output.receipt.validation_diagnostic);
  let logins=0;const replay=await executePlanTrial({...d,onReady:()=>logins++});assert.equal(logins,0);assert.deepEqual(replay.receipt.validation_diagnostic,output.receipt.validation_diagnostic);
  assert.equal(text(d.root).includes('PRIVATE-REJECTED-BODY'),false);assert.equal(text(d.root).includes('SYNTHETIC-TRIAL-ACCESS'),false);
  const store=new Store(d.directory);store.withdraw('fictional-plan-window-memory');store.close();
  assert.deepEqual(readPlanTrialHistory(d.directory).validation_diagnostic,output.receipt.validation_diagnostic);assert.equal(text(d.root).includes('PRIVATE-REJECTED-BODY'),false);
 }
});
test('original reviewed history is body-free and cannot reopen an old approval or invent a discarded cause',async t=>{
 const d=dirs(t);assert.equal(readPlanTrialHistory(d.directory).status,'trial_not_found');assert.equal(fs.existsSync(d.directory),false);
 initPlanTrial(d.directory,trialApproval());const http=syntheticPlanHttp({onGenerate:()=>new Response('PRIVATE',{headers:{'Content-Type':'application/json'}})});http.install();try{await executePlanTrial({...d,onReady:http.onReady});}finally{http.restore();}
 const store=new Store(d.directory),r=Object.values(store.state.runs)[0];delete r.modelPortDiagnostic;store.state.planDreamTrial.proposal=JSON.parse(fs.readFileSync(new URL('../docs/proposals/gpt-plan-first-fictional-dream-v1-original.json',import.meta.url),'utf8'));store.save();store.close();
 const before=fs.readFileSync(path.join(d.directory,'state.json'),'utf8');const view=readPlanTrialHistory(d.directory);assert.equal(view.status,'failed');assert.equal(view.ready,false);assert.equal(view.dispatchEnabled,false);assert.equal(view.validation_diagnostic,null);assert.equal(view.historicalCauseRecoverable,false);assert.equal(view.external_calls_started,1);assert.equal(view.remoteRevocationConfirmed,true);assert.equal(fs.readFileSync(path.join(d.directory,'state.json'),'utf8'),before);
 assert.throws(()=>preflightPlanTrial(d.directory),/source_pins_changed/);assert.throws(()=>initPlanTrial(d.directory,trialApproval()),/source_pins_changed/);
 let dispatched=false;await assert.rejects(executePlanTrial({...d,onReady:()=>dispatched=true}),/source_pins_changed/);assert.equal(dispatched,false);
});
test('diagnostic persistence failure retains an unknown intent and never invents a saved cause after reopen',async t=>{
 const d=dirs(t);initPlanTrial(d.directory,trialApproval());const save=Store.prototype.save;
 Store.prototype.save=function(){if(this.directory===d.directory&&Object.values(this.state.runs).some(r=>r.modelPortDiagnostic))fs.mkdirSync(path.join(this.directory,'snapshot.tmp'));return save.call(this);};
 const http=syntheticPlanHttp({onGenerate:()=>new Response('PRIVATE-UNSAVED',{headers:{'Content-Type':'application/json'}})});http.install();
 try{await assert.rejects(executePlanTrial({...d,onReady:http.onReady}),/store_unavailable/);}finally{Store.prototype.save=save;http.restore();}
 assert.equal(http.bodies.length,1);assert.equal(http.revoked,1);fs.rmdirSync(path.join(d.directory,'snapshot.tmp'));
 const view=readPlanTrialHistory(d.directory);assert.equal(view.status,'uncertain');assert.equal(view.external_calls_started,1);assert.equal(view.validation_diagnostic,null);assert.equal(view.historicalCauseRecoverable,false);assert.equal(view.usage[0].usage,'unknown');assert.equal(text(d.root).includes('PRIVATE-UNSAVED'),false);
});
test('history rejects foreign proposal, identity and arbitrary request metadata without exposing a body',async t=>{
 const d=dirs(t);initPlanTrial(d.directory,trialApproval());const http=syntheticPlanHttp({onGenerate:()=>new Response('PRIVATE',{headers:{'Content-Type':'application/json'}})});http.install();try{await executePlanTrial({...d,onReady:http.onReady});}finally{http.restore();}
 let store=new Store(d.directory),original=structuredClone(store.state);store.close();
 for(const mutate of [s=>s.planDreamTrial.proposal.model_id='PRIVATE',s=>Object.values(s.runs)[0].modelSelection.auth_mode='PRIVATE',s=>Object.values(s.runs)[0].attempts[0].request_id='PRIVATE']){
  store=new Store(d.directory);store.state=structuredClone(original);mutate(store.state);store.save();store.close();assert.throws(()=>readPlanTrialHistory(d.directory),/^Error: trial_history_invalid$/);
 }
});
