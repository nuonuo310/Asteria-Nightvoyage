// Project-owned temporary fictional book. No user defaults or provider transport.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {Store} from '../src/store.js';
import {prepareInlineReviewDream} from './inline-review-fixtures.js';
import {reviewActor,reviewRequest} from './appraisal-review-fixtures.js';
import {LocalFileAppraisalReviewAdapter} from '../src/appraisal-review-adapter.js';
export function invokeDreambook(args,{localAppData}={}){
  const script=fileURLToPath(new URL('../scripts/dreambook.mjs',import.meta.url));
  const code=`import https from 'node:https';import http from 'node:http';let keys=0,calls=0;const env=process.env;process.env=new Proxy(env,{get(t,k){if(k==='NIGHTVOYAGE_DEEPSEEK_KEY'){keys++;throw Error('forbidden_key');}return Reflect.get(t,k);}});const stop=()=>{calls++;throw Error('forbidden_network');};globalThis.fetch=https.request=http.request=stop;process.on('exit',()=>{if(keys||calls)process.exitCode=1;});const args=process.argv.slice(1);process.argv=[process.execPath,${JSON.stringify(script)},...args];await import(${JSON.stringify(new URL('../scripts/dreambook.mjs',import.meta.url).href)});`;
  return spawnSync(process.execPath,['--input-type=module','-e',code,...args],{input:'',encoding:'utf8',timeout:15000,...(localAppData?{env:{...process.env,LOCALAPPDATA:localAppData}}:{})});
}
export async function checkDreambookReader(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-dreambook-check-')),directory=path.join(root,'book');let engine,store;
  try{
    const ready=await prepareInlineReviewDream(directory);engine=ready.engine;
    const {dreamId,sourceId,counter}=ready,adapter=new LocalFileAppraisalReviewAdapter(engine.store,reviewActor);
    const review=adapter.createReview({dreamId,request:reviewRequest('book')}).review;
    const original=engine.read(dreamId),billing=structuredClone(engine.store.state.billing);engine.close();
    const before=fs.readFileSync(path.join(directory,'state.json'),'utf8');
    const list=invokeDreambook(['list','--data-dir',directory]);assert.equal(list.status,0,list.stderr);const catalog=JSON.parse(list.stdout);assert.equal(catalog.dreams.length,1);assert.equal(catalog.dreams[0].id,dreamId);assert.equal(catalog.dreams[0].protocolSupported,true);
    for(const body of [original.scenes[0].event,original.wake.fragment,review.assessment.note])assert.equal(list.stdout.includes(body),false);
    for(const selector of [['--latest'],['--dream-id',dreamId]]){
      const read=invokeDreambook(['read','--data-dir',directory,...selector]);assert.equal(read.status,0,read.stderr);
      assert.ok(read.stdout.includes(original.scenes[0].event));assert.ok(read.stdout.includes(review.assessment.note));assert.ok(read.stdout.indexOf('【先读梦】')<read.stdout.indexOf('【醒来残片】'));assert.ok(read.stdout.indexOf('【醒来残片】')<read.stdout.indexOf('【已有独立评审意见】'));assert.ok(read.stdout.includes('不是现实事实'));
    }
    assert.equal(fs.readFileSync(path.join(directory,'state.json'),'utf8'),before);
    store=new Store(directory);assert.deepEqual(store.state.entries[dreamId],original);assert.deepEqual(store.state.billing,billing);store.withdraw(sourceId);store.close();
    const after=invokeDreambook(['list','--data-dir',directory]);assert.equal(after.status,0,after.stderr);assert.deepEqual(JSON.parse(after.stdout).dreams,[]);
    const unavailable=invokeDreambook(['read','--data-dir',directory,'--dream-id',dreamId]);assert.equal(unavailable.status,0);assert.equal(unavailable.stdout.includes(original.scenes[0].event),false);assert.equal(unavailable.stdout.includes(review.assessment.note),false);
    assert.equal(counter.calls,3);
    return {command:'node scripts/check-dreambook-reader.mjs',node:process.version,platform:process.platform,fakeGenerationCalls:counter.calls,readerModelCalls:0,realModelRequests:0,credentialReads:0,catalogBodyFree:true,latestExcludesReviewEntries:true,explicitIdAndLatestRead:true,narrativeWakeAndReviewsSeparate:true,originalDreamAndWakeUnchanged:true,billingUnchanged:true,reviewCountUnchanged:true,stableStateBytesUnchanged:true,filesystemZeroWritesClaimed:false,withdrawalSuppressesReopenedListAndRead:true,userStoreAccessed:false,asteriaAdapter:'pending',qualityAssessed:false};
  }finally{engine?.close();store?.close();fs.rmSync(root,{recursive:true,force:true});}
}
