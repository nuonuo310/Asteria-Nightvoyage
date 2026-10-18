// Independent fictional rehearsal. Never uses default user paths or real transport.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {Store} from '../src/store.js';
import {prepareInlineReviewDream} from './inline-review-fixtures.js';
import {reviewActor,reviewRequest} from './appraisal-review-fixtures.js';

export const localReviewCLI=fileURLToPath(new URL('../scripts/local-appraisal-review.mjs',import.meta.url));
export function invokeReviewCLI(args,input){
  // Fail the child if code even tries to read a key or enter native HTTP transport.
  const guard=`import https from 'node:https';import http from 'node:http';
    let calls=0,keys=0;const env=process.env;
    process.env=new Proxy(env,{get(t,k){if(k==='NIGHTVOYAGE_DEEPSEEK_KEY'){keys++;throw Error('key_forbidden');}return Reflect.get(t,k);}});
    const block=()=>{calls++;throw Error('network_forbidden');};globalThis.fetch=block;https.request=block;https.get=block;http.request=block;http.get=block;
    process.on('exit',()=>{if(calls||keys){process.stderr.write('offline_guard_failed');process.exitCode=1;}});
    const args=process.argv.slice(1);process.argv=[process.execPath,${JSON.stringify(localReviewCLI)},...args];await import(${JSON.stringify(new URL('../scripts/local-appraisal-review.mjs',import.meta.url).href)});`;
  return spawnSync(process.execPath,['--input-type=module','-e',guard,...args],{input,encoding:'utf8',timeout:15000});
}
export function successfulReviewCLI(args,input){
  const child=invokeReviewCLI(args,input);
  assert.equal(child.status,0,child.stderr);assert.equal(child.stderr,'');
  return JSON.parse(child.stdout);
}
export async function checkLocalReviewCLI(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-local-review-cli-')),directory=path.join(root,'store');
  let engine,store;
  try{
    const ready=await prepareInlineReviewDream(directory);engine=ready.engine;
    const {dreamId,sourceId,counter}=ready,original=structuredClone(engine.store.state.entries[dreamId]),billing=structuredClone(engine.store.state.billing);
    engine.close();
    const envelope={schemaVersion:1,dreamId,reviewer:reviewActor,request:reviewRequest('cli')},input=JSON.stringify(envelope),args=['create','--data-dir',directory];
    const one=successfulReviewCLI(args,input),repeat=successfulReviewCLI(args,input);
    assert.deepEqual(repeat,one);assert.equal(one.status,'available');assert.equal(one.review.origin,'dream_appraisal_review');assert.equal(one.review.isRealityFact,false);assert.equal(Object.hasOwn(one.review,'assessment'),false);assert.equal(JSON.stringify(one).includes(envelope.request.assessment.note),false);
    const read=successfulReviewCLI(['read','--data-dir',directory,'--review-id',one.review.id]).review;
    assert.equal(read.reviewer.kind,'assistant');assert.equal(read.assessment.note,envelope.request.assessment.note);assert.match(read.parent.sceneFingerprint,/^[a-f0-9]{64}$/);assert.deepEqual(read.sourceRefs,original.sourceRefs);
    const revision=structuredClone(envelope);revision.request=reviewRequest('cli-revision');revision.request.supersedesReviewId=read.id;revision.request.assessment.direction.arousal='underdetermined';
    successfulReviewCLI(args,JSON.stringify(revision));
    const list=successfulReviewCLI(['list','--data-dir',directory,'--dream-id',dreamId]).reviews;
    assert.equal(list.length,2);assert.deepEqual(list.find(r=>r.id===read.id),read);assert.equal(list.find(r=>r.id===revision.request.id).supersedesReviewId,read.id);
    store=new Store(directory);assert.deepEqual(store.state.entries[dreamId],original);assert.deepEqual(store.state.billing,billing);assert.equal(Object.keys(store.state.appraisalReviewIndex.requests).length,2);store.withdraw(sourceId);store.close();
    assert.equal(successfulReviewCLI(['read','--data-dir',directory,'--review-id',read.id]).review,null);
    assert.deepEqual(successfulReviewCLI(['list','--data-dir',directory,'--dream-id',dreamId]).reviews,[]);
    const replay=invokeReviewCLI(args,input);assert.equal(replay.status,1);assert.match(replay.stderr,/review_parent_unavailable/);assert.equal(replay.stdout,'');
    store=new Store(directory);assert.deepEqual(store.state.billing,billing);assert.equal(store.state.entries[read.id],undefined);store.close();
    for(const name of fs.readdirSync(directory))if(fs.statSync(path.join(directory,name)).isFile()){
      const body=fs.readFileSync(path.join(directory,name),'utf8');for(const text of [read.assessment.note,...original.scenes.map(s=>s.event)])assert.equal(body.includes(text),false);
    }
    assert.equal(counter.calls,3);
    return {command:'node scripts/check-local-appraisal-review.mjs',node:process.version,platform:process.platform,adapter:'local_file',asteriaAdapter:'pending',fakeGenerationCalls:counter.calls,reviewAdditionalCalls:0,realModelRequests:0,credentialReads:0,createReceiptBodyFree:true,storedReviewFingerprintBound:true,reviewerKind:'assistant',reopened:true,duplicateReviewWrites:0,revisionPreservesOriginalOpinion:true,originalDreamAndWakeUnchanged:true,billingUnchanged:true,withdrawalSurvivesReopen:true,withdrawnReplaySuppressed:true,managedBodiesPurged:true,userStoreAccessed:false,humanAcceptanceRecorded:false,qualityAssessed:false,semanticSupport:'not_assessed'};
  }finally{engine?.close();store?.close();fs.rmSync(root,{recursive:true,force:true});}
}
