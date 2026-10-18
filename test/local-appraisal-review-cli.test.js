import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Store} from '../src/store.js';
import {parseReviewInput,reviewInputByteLimit} from '../scripts/local-appraisal-review.mjs';
import {checkLocalReviewCLI,invokeReviewCLI,successfulReviewCLI,localReviewCLI} from '../test-support/local-review-cli-check.js';
import {prepareInlineReviewDream} from '../test-support/inline-review-fixtures.js';
import {reviewActor,reviewRequest} from '../test-support/appraisal-review-fixtures.js';

async function setup(t){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-cli-review-test-')),directory=path.join(root,'store'),ready=await prepareInlineReviewDream(directory);
  t.after(()=>{ready.engine.close();fs.rmSync(root,{recursive:true,force:true});});
  return {root,directory,...ready,envelope:{schemaVersion:1,dreamId:ready.dreamId,reviewer:reviewActor,request:reviewRequest('test-cli')}};
}
test('real CLI processes create, replay, read, revise and withdraw independent fictional reviews without a key or network',async()=>{
  const result=await checkLocalReviewCLI();assert.equal(result.originalDreamAndWakeUnchanged,true);assert.equal(result.billingUnchanged,true);assert.equal(result.withdrawnReplaySuppressed,true);assert.equal(result.storedReviewFingerprintBound,true);assert.equal(result.qualityAssessed,false);
});
test('CLI rejects generation, unknown flags, relative paths and missing existing stores without creating storage',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-cli-review-no-store-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const absent=path.join(root,'absent');
  for(const args of [['run','--live'],['init'],['create','--data-dir',absent,'--live'],['read','--data-dir','.','--review-id','x'],['list','--data-dir',absent,'--dream-id','x'],['help','--data-dir',absent],['list','--data-dir',absent,'--data-dir',absent],['read','--data-dir',absent,'--review-id','constructor']]){
    const result=invokeReviewCLI(args);assert.equal(result.status,1);assert.equal(result.stdout,'');assert.equal(fs.existsSync(absent),false);
  }
  const help=invokeReviewCLI([]);assert.equal(help.status,0);assert.match(help.stdout,/no model\/key\/approval/);assert.equal(fs.existsSync(absent),false);
});
test('UTF-8 BOM and CRLF preserve Chinese notes while invalid bytes, oversized input and source overrides are rejected',()=>{
  const data={schemaVersion:1,dreamId:'fiction-dream',reviewer:reviewActor,request:reviewRequest('encoding')};
  const bytes=Buffer.from('\ufeff'+JSON.stringify(data,null,2).replaceAll('\n','\r\n'));
  assert.deepEqual(parseReviewInput(bytes),data);
  for(const invalid of [Buffer.from([0xff]),Buffer.from('{'),Buffer.alloc(reviewInputByteLimit+1,32),Buffer.from(JSON.stringify({...data,sourceRefs:[]})),Buffer.from(JSON.stringify({...data,reviewer:{...reviewActor,key:'secret'}})),Buffer.from(JSON.stringify({...data,request:{...data.request,tool:'execute'}}))])assert.throws(()=>parseReviewInput(invalid),/invalid_local_review_input/);
});
test('invalid or oversized stdin fails before owner acquisition and never echoes arbitrary input',async t=>{
  const {directory,engine,envelope}=await setup(t); // Keep owner active: malformed input must fail before Store open.
  const before=fs.readFileSync(path.join(directory,'state.json'),'utf8');
  for(const input of ['PRIVATE_REJECTED_SENTINEL',Buffer.from([0xff]),Buffer.alloc(reviewInputByteLimit+1,65),JSON.stringify({...envelope,private:'PRIVATE_REJECTED_SENTINEL'})]){
    const result=invokeReviewCLI(['create','--data-dir',directory],input);assert.equal(result.status,1);assert.match(result.stderr,/invalid_local_review_input/);assert.equal(result.stderr.includes('PRIVATE_REJECTED_SENTINEL'),false);assert.equal(result.stdout,'');
  }
  assert.equal(fs.readFileSync(path.join(directory,'state.json'),'utf8'),before);engine.close();
});
test('CLI conflicts cannot change an existing review, original, billing or identity',async t=>{
  const {directory,engine,envelope,dreamId}=await setup(t);engine.close();
  const args=['create','--data-dir',directory],input=JSON.stringify(envelope),saved=successfulReviewCLI(args,input);
  const before=fs.readFileSync(path.join(directory,'state.json'),'utf8');
  for(const changed of [{...envelope,request:{...envelope.request,assessment:{...envelope.request.assessment,note:'changed'}}},{...envelope,reviewer:{actorId:'different-actor',kind:'person'}}]){
    const result=invokeReviewCLI(args,JSON.stringify(changed));assert.equal(result.status,1);assert.match(result.stderr,/review_request_conflict/);assert.equal(result.stdout,'');
  }
  assert.equal(fs.readFileSync(path.join(directory,'state.json'),'utf8'),before);
  const read=successfulReviewCLI(['read','--data-dir',directory,'--review-id',saved.review.id]).review;assert.equal(read.reviewer.kind,'assistant');assert.equal(read.parent.dreamId,dreamId);
});
test('CLI refuses semantic acceptance, number changes and forged provenance instead of modifying the dream',async t=>{
  const {directory,engine,envelope}=await setup(t);engine.close();
  const before=fs.readFileSync(path.join(directory,'state.json'),'utf8');
  for(const assessment of [{...envelope.request.assessment,magnitude:{valence:'validated',arousal:'not_established'}},{...envelope.request.assessment,delta:{valence:0,arousal:0}},{...envelope.request.assessment,sourceRefs:[]}]){
    const result=invokeReviewCLI(['create','--data-dir',directory],JSON.stringify({...envelope,request:{...envelope.request,assessment}}));assert.equal(result.status,1);assert.equal(result.stdout,'');
  }
  assert.equal(fs.readFileSync(path.join(directory,'state.json'),'utf8'),before);
});
test('existing owner blocks valid CLI save and leaves no partial record',async t=>{
  const {directory,envelope}=await setup(t);const before=fs.readFileSync(path.join(directory,'state.json'),'utf8');
  const child=invokeReviewCLI(['create','--data-dir',directory],JSON.stringify(envelope));assert.equal(child.status,1);assert.match(child.stderr,/store_busy/);assert.equal(child.stdout,'');assert.equal(fs.readFileSync(path.join(directory,'state.json'),'utf8'),before);
});
test('deleting a saved review prevents duplicate CLI delivery while preserving its parent',async t=>{
  const {directory,engine,envelope,dreamId}=await setup(t);engine.close();
  const args=['create','--data-dir',directory],input=JSON.stringify(envelope),saved=successfulReviewCLI(args,input);
  const store=new Store(directory);try{store.deleteEntry(store.state.entries[saved.review.id]);}finally{store.close();}
  assert.equal(successfulReviewCLI(args,input).status,'unavailable');
  assert.equal(successfulReviewCLI(['read','--data-dir',directory,'--review-id',saved.review.id]).review,null);
  const back=new Store(directory);try{assert.ok(back.state.entries[dreamId]);assert.equal(back.state.entries[saved.review.id],undefined);}finally{back.close();}
});
test('stalled stdin times out before opening or creating a Store',async t=>{
  const {spawn}=await import('node:child_process');
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-review-stdin-')),directory=path.join(root,'absent');
  const child=spawn(process.execPath,[localReviewCLI,'create','--data-dir',directory],{stdio:['pipe','pipe','pipe']});
  const timer=setTimeout(()=>child.kill('SIGKILL'),12000);
  t.after(()=>{clearTimeout(timer);child.stdin.destroy();child.kill();fs.rmSync(root,{recursive:true,force:true});});
  let stdout='',stderr='';child.stdout.on('data',data=>stdout+=data);child.stderr.on('data',data=>stderr+=data);
  const result=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',(code,signal)=>resolve({code,signal}));});
  assert.deepEqual(result,{code:1,signal:null});assert.match(stderr,/local_review_input_timeout/);assert.equal(stdout,'');assert.equal(fs.existsSync(directory),false);
});
