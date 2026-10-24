import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {Store} from '../src/store.js';
import {DiagnosticOneDreamRuntime} from '../scripts/nv-deepseek-failure-diagnostics/runtime.mjs';
import {FailureReceiptJournal,diagnosticJournalPath,readDiagnosticReceipts} from '../scripts/nv-deepseek-failure-diagnostics/journal.mjs';
import {createOneDreamLoopback,oneDreamLoopbackScenes} from '../scripts/nv-deepseek-one-dream/local-http.mjs';
import {oneDreamAllowanceId,oneDreamLocalCredential,oneDreamLoopbackKind} from '../scripts/nv-deepseek-one-dream/policy.mjs';
import {prepareOneDreamHistory} from '../test-support/nv-one-dream-fixtures.mjs';

const sceneData=index=>({event:oneDreamLoopbackScenes[index],appraisal:{goalEffect:0,control:.5,uncertainty:.5},basis:{goal:null,control:null,uncertainty:null},affect:{kind:'unchanged'}});
function dataFor(material){
  if(material?.stage==='scene'&&(material.sceneIndex===0||material.sceneIndex===1))return sceneData(material.sceneIndex);
  if(material?.stage==='wake'&&Array.isArray(material.previousScenes)&&material.previousScenes.some(scene=>scene.event.includes('绾歌埞鍦ㄩ暱妞呬笂杞昏交杞姩')))return {fragment:'绾歌埞鍦ㄩ暱妞呬笂杞昏交杞姩',residue:.12,associations:[]};
  return null;
}
function envelope(material,usage={prompt_tokens:180,completion_tokens:90,total_tokens:270}){return {model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(dataFor(material))}}],usage};}
function materialFrom(request){return JSON.parse(JSON.parse(request.body).messages[1].content);}
function transportLoopback(transport){
  let posts=0;const requests=[];
  const value={kind:oneDreamLoopbackKind,host:'127.0.0.1',requests,async transport(endpoint,request){const index=posts++;requests.push(request);return transport(endpoint,request,index);},get posts(){return posts;}};
  return Object.freeze(value);
}
async function withDiagnosticRuntime(t,{transport,timeoutMs=60000,fault},run){
  const h=prepareOneDreamHistory(t,{mode:'stub'}),loopback=transportLoopback(transport);let engine;
  engine=new DiagnosticOneDreamRuntime(h.directory,{mode:'offline',loopback,enabled:true,timeoutMs,fault});
  t.after(()=>{try{engine?.close();}catch{}});
  const gate=engine.prepare({dispatchKind:'rehearsal',create:true});engine.credential=oneDreamLocalCredential;
  return await run({h,engine,gate,loopback});
}
async function failedRun(t,options={}){
  return withDiagnosticRuntime(t,options,async context=>{const status=await context.engine.execute(context.gate.id);return {...context,status,receipts:readDiagnosticReceipts(context.h.directory)};});
}
function row(engine){return Object.values(engine.store.state.billing.accounts[oneDreamAllowanceId].attempts)[0];}

for(const [code,expected] of [['ENOTFOUND','transport_dns_failure'],['ECONNREFUSED','transport_connect_failure'],['CERT_HAS_EXPIRED','transport_tls_failure'],['EPIPE','transport_write_failure']]){
  test(`${code} before a response is classified as ${expected} after a persisted dispatch intent`,async t=>{
    const sentinel='PRIVATE-TRANSPORT-SENTINEL';const value=await failedRun(t,{transport:async()=>{throw Object.assign(new Error(sentinel),{code});}});
    assert.equal(value.status.status,'failed');assert.equal(value.loopback.posts,1);assert.equal(value.receipts.length,1);
    const receipt=value.receipts[0];assert.equal(receipt.phase,'transport');assert.equal(receipt.diagnosticClass,expected);
    assert.equal(receipt.dispatchIntent,'persisted');assert.equal(receipt.delivery,'unknown');assert.equal(receipt.usage,'unknown');assert.equal(receipt.money,'unknown');
    assert.equal(row(value.engine).status,'unknown');assert.equal(row(value.engine).chargedMicroCny,'2100352');
    const text=fs.readFileSync(diagnosticJournalPath(value.h.directory),'utf8');assert.equal(text.includes(sentinel),false);assert.equal(text.includes(code),false);
  });
}

for(const [status,expected] of [[401,'http_unauthorized'],[429,'http_rate_limited'],[503,'http_server_error']]){
  test(`HTTP ${status} is a closed response class and stops before another stage`,async t=>{
    const value=await failedRun(t,{transport:async()=>new Response(null,{status})});
    assert.equal(value.status.status,'failed');assert.equal(value.loopback.posts,1);assert.equal(value.receipts.length,1);
    const receipt=value.receipts[0];assert.equal(receipt.phase,'http_response');assert.equal(receipt.diagnosticClass,expected);assert.equal(receipt.dispatchIntent,'persisted');
    assert.equal(value.engine.run(value.gate.id).scenes.length,0);assert.equal(row(value.engine).status,'unknown');
  });
}

test('response stream abort, size overflow and read error remain bounded and body-free',async t=>{
  const scenarios=[
    {name:'aborted',body:new ReadableStream({start(controller){controller.error(Object.assign(new Error('PRIVATE-BODY-SENTINEL'),{name:'AbortError'}));}}),expected:'response_aborted'},
    {name:'too large',body:'x'.repeat(70000),expected:'response_too_large'},
    {name:'read error',body:new ReadableStream({start(controller){controller.error(new Error('PRIVATE-BODY-SENTINEL'));}}),expected:'response_read_failure'}
  ];
  for(const scenario of scenarios){
    const value=await failedRun(t,{transport:async()=>new Response(scenario.body,{status:200})});
    assert.equal(value.status.status,'failed',scenario.name);assert.equal(value.receipts.length,1,scenario.name);
    assert.equal(value.receipts[0].phase,'response_read',scenario.name);assert.equal(value.receipts[0].diagnosticClass,scenario.expected,scenario.name);
    assert.equal(fs.readFileSync(diagnosticJournalPath(value.h.directory),'utf8').includes('PRIVATE-BODY-SENTINEL'),false);
  }
});

test('a pre-dispatch credential refusal records no dispatch intent and sends nothing',async t=>{
  await withDiagnosticRuntime(t,{transport:async()=>{throw Error('must_not_dispatch');}},async({h,engine,gate,loopback})=>{
    const run=engine.run(gate.id);run.status='running';
    const requestId=`stage-${gate.id}-scene-0`,payload={stage:'scene',index:0,snapshot:run.snapshot,scenes:[]};
    await assert.rejects(engine.client.send({allowanceId:oneDreamAllowanceId,requestId,runId:gate.id,payload,credential:'',signal:new AbortController().signal,publish(){}}),/credential_required/);
    const receipts=readDiagnosticReceipts(h.directory);assert.equal(receipts.length,1);assert.equal(receipts[0].phase,'pre_dispatch');assert.equal(receipts[0].diagnosticClass,'pre_dispatch_refused');assert.equal(receipts[0].dispatchIntent,'none');assert.equal(receipts[0].transportObservation,'not_attempted');assert.equal(loopback.posts,0);
  });
});

test('invalid JSON, usage and dream stage use distinct protocol classes without storing the response body',async t=>{
  const scenarios=[
    {name:'json',body:()=>new Response('not-json',{status:200}),expected:'response_invalid_json'},
    {name:'usage',body:()=>new Response(JSON.stringify({model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(sceneData(0))}}]}),{status:200}),expected:'response_usage_rejected'},
    {name:'stage',body:()=>new Response(JSON.stringify({model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify({event:'PRIVATE-BODY-SENTINEL'})}}],usage:{prompt_tokens:180,completion_tokens:90,total_tokens:270}}),{status:200}),expected:'response_stage_rejected'}
  ];
  for(const scenario of scenarios){
    const value=await failedRun(t,{transport:async()=>scenario.body()});
    assert.equal(value.receipts.length,1,scenario.name);assert.equal(value.receipts[0].phase,'response_protocol',scenario.name);assert.equal(value.receipts[0].diagnosticClass,scenario.expected,scenario.name);
    assert.equal(fs.readFileSync(diagnosticJournalPath(value.h.directory),'utf8').includes('not-json'),false);
  }
});

test('local timeout records a fixed class and suppresses a late reply without adding a call',async t=>{
  let late;
  const value=await failedRun(t,{timeoutMs:100,transport:async(_endpoint,request)=>{await new Promise(resolve=>setTimeout(resolve,250));late=envelope(materialFrom(request));return new Response(JSON.stringify(late),{status:200});}});
  assert.equal(value.status.status,'failed');assert.equal(value.receipts.length,1);assert.equal(value.receipts[0].phase,'cancellation');assert.equal(value.receipts[0].diagnosticClass,'local_timeout');
  assert.equal(value.loopback.posts,1);assert.equal(value.engine.run(value.gate.id).scenes.length,0);assert.equal(row(value.engine).status,'unknown');
  await new Promise(resolve=>setTimeout(resolve,220));assert.equal(value.engine.run(value.gate.id).scenes.length,0);
});

test('caller cancellation records only local cancellation and a late handler reply cannot publish',async t=>{
  const h=prepareOneDreamHistory(t,{mode:'stub'}),loopback=await createOneDreamLoopback({handler:async({material,respond})=>{await new Promise(resolve=>setTimeout(resolve,120));respond(200,envelope(material));}});let engine;
  try{
    engine=new DiagnosticOneDreamRuntime(h.directory,{mode:'offline',loopback,enabled:true,timeoutMs:60000});
    const gate=engine.prepare({dispatchKind:'rehearsal',create:true});engine.credential=oneDreamLocalCredential;
    const pending=engine.execute(gate.id);while(loopback.posts<1)await new Promise(resolve=>setTimeout(resolve,5));engine.cancel(gate.id);
    const status=await pending;assert.equal(status.status,'cancelled');
    const receipts=readDiagnosticReceipts(h.directory);assert.equal(receipts.length,1);assert.equal(receipts[0].phase,'cancellation');assert.equal(receipts[0].diagnosticClass,'cancelled_locally');
    await new Promise(resolve=>setTimeout(resolve,150));assert.equal(engine.run(gate.id).scenes.length,0);assert.equal(engine.run(gate.id).wake,undefined);
  }finally{try{engine?.close();}catch{}await loopback.close();}
});

test('an arbitrary transport exception is unclassified and its sensitive sentinel never reaches the receipt',async t=>{
  const value=await failedRun(t,{transport:async()=>{throw new Error('PRIVATE-BODY-SENTINEL API-KEY-LIKE-VALUE 127.0.0.1');}});
  assert.equal(value.receipts.length,1);assert.equal(value.receipts[0].phase,'internal');assert.equal(value.receipts[0].diagnosticClass,'unclassified');assert.equal(value.receipts[0].dispatchIntent,'persisted');
  const text=fs.readFileSync(diagnosticJournalPath(value.h.directory),'utf8');for(const marker of ['PRIVATE-BODY-SENTINEL','API-KEY-LIKE-VALUE','127.0.0.1','one_dream_provider_transport_failed'])assert.equal(text.includes(marker),false,marker);
});

test('receipt survives reopening, a duplicate request adds no call or receipt, and unknown replay stays blocked',async t=>{
  const value=await failedRun(t,{transport:async()=>{throw Object.assign(new Error('PRIVATE-TRANSPORT-SENTINEL'),{code:'EAI_AGAIN'});}});
  assert.equal(value.receipts.length,1);const original=structuredClone(value.receipts[0]);assert.equal(value.loopback.posts,1);
  const attempt=row(value.engine),requestId=attempt.requestId,payload=JSON.parse(JSON.stringify({stage:'scene',index:0,snapshot:value.engine.run(value.gate.id).snapshot,scenes:[]}));
  const run=value.engine.run(value.gate.id),previous=run.status;run.status='running';
  try{await assert.rejects(value.engine.client.send({allowanceId:oneDreamAllowanceId,requestId,runId:value.gate.id,payload,credential:oneDreamLocalCredential,signal:new AbortController().signal,publish:()=>{throw Error('not_reached');}}),/one_dream_ambiguous_attempt/);}finally{run.status=previous;}
  assert.equal(value.loopback.posts,1);assert.equal(readDiagnosticReceipts(value.h.directory).length,1);assert.deepEqual(readDiagnosticReceipts(value.h.directory)[0],original);
  value.engine.close();
  assert.deepEqual(readDiagnosticReceipts(value.h.directory),[original]);
  let posts=0;const reopenedLoopback=Object.freeze({kind:oneDreamLoopbackKind,host:'127.0.0.1',async transport(){posts++;throw Error('must_not_dispatch');},get posts(){return posts;}});
  const reopened=new DiagnosticOneDreamRuntime(value.h.directory,{mode:'offline',loopback:reopenedLoopback,enabled:true,timeoutMs:60000});
  try{assert.throws(()=>reopened.prepare({resume:true,dispatchKind:'rehearsal',create:false}),/inline_resume_requires_committed_prefix|one_dream_ambiguous_attempt/);}finally{reopened.close();}
  assert.equal(posts,0);assert.deepEqual(readDiagnosticReceipts(value.h.directory),[original]);
});

test('receipt failure and publication failure are surfaced without a false success',async t=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nv-diagnostics-storage-'));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const journal=new FailureReceiptJournal(directory,{writeAtomic(){throw Error('PRIVATE-STORAGE-SENTINEL');}});
  assert.throws(()=>journal.append({runId:'run-storage',requestId:'request-storage',stage:'scene',stageIndex:0,phase:'pre_dispatch',diagnosticClass:'pre_dispatch_refused',dispatchIntent:'none',transportObservation:'not_attempted',httpStatusClass:'not_observed'}),/diagnostic_receipt_storage_failed/);
  assert.equal(fs.existsSync(diagnosticJournalPath(directory)),false);
  const value=await withDiagnosticRuntime(t,{transport:async(_endpoint,request)=>{const material=materialFrom(request);return new Response(JSON.stringify(envelope(material)),{status:200});}},async({h,engine,gate,loopback})=>{
    const run=engine.run(gate.id);run.status='running';engine.store.save();
    const requestId=`stage-${gate.id}-scene-0`,payload={stage:'scene',index:0,snapshot:run.snapshot,scenes:[]};
    await assert.rejects(engine.client.send({allowanceId:oneDreamAllowanceId,requestId,runId:gate.id,payload,credential:oneDreamLocalCredential,signal:new AbortController().signal,publish(){throw Error('PRIVATE-PUBLICATION-SENTINEL');}}),/request_failed/);
    return {h,loopback,receipts:readDiagnosticReceipts(h.directory)};
  });
  assert.equal(value.loopback.posts,1);assert.equal(value.receipts.length,1);assert.equal(value.receipts[0].phase,'publication');assert.equal(value.receipts[0].diagnosticClass,'publication_failure');
  const text=fs.readFileSync(diagnosticJournalPath(value.h.directory),'utf8');assert.equal(text.includes('PRIVATE-PUBLICATION-SENTINEL'),false);
});

test('failed diagnostics leave old unknown holds byte-identical and never add dream content or credentials',async t=>{
  const value=await failedRun(t,{transport:async()=>new Response(null,{status:503})});
  value.engine.close();
  const oldUnknown=Object.entries(value.h.oldAccounts).flatMap(([id,account])=>Object.entries(account.attempts).filter(([,attempt])=>attempt.status==='unknown').map(([requestId,attempt])=>({id,requestId,attempt})));
  assert.equal(oldUnknown.length,4);
  const reopened=new Store(value.h.directory);
  try{
    for(const [id,account] of Object.entries(value.h.oldAccounts))assert.equal(JSON.stringify(reopened.state.billing.accounts[id]),JSON.stringify(account),id);
    for(const {id,requestId,attempt} of oldUnknown)assert.deepEqual(reopened.state.billing.accounts[id].attempts[requestId],attempt);
    assert.equal(Object.values(reopened.state.entries).some(entry=>entry.origin==='dream'),false);
  }finally{reopened.close();}
  const journalText=fs.readFileSync(diagnosticJournalPath(value.h.directory),'utf8');
  for(const marker of [oneDreamLocalCredential,oneDreamLoopbackScenes[0],oneDreamLoopbackScenes[1],'127.0.0.1','Authorization','Bearer'])assert.equal(journalText.includes(marker),false,marker);
});
