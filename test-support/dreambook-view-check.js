// Independent fictional Store and loopback-only browser boundary check.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import https from 'node:https';
import assert from 'node:assert/strict';
import {Store} from '../src/store.js';
import {prepareDreambookViewDemo} from '../scripts/dreambook-view-demo.mjs';
import {readDreambookLaterRecords,readDreambookView} from '../scripts/dreambook-view-records.mjs';
import {startDreambookViewServer} from '../scripts/dreambook-view.mjs';
const nativeHttpRequest=http.request,nativeHttpsRequest=https.request,nativeFetch=globalThis.fetch;
const originalEnv=process.env;
function request(url,{method='GET',headers={}}={}){
  return new Promise((resolve,reject)=>{
    const req=nativeHttpRequest(url,{method,headers},res=>{
      const chunks=[];res.on('data',chunk=>chunks.push(chunk));
      res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks).toString('utf8')}));
    });
    req.on('error',reject);req.end();
  });
}
export async function checkDreambookView(){
  let credentialReads=0,networkCalls=0,root=null,store=null,server=null;
  process.env=new Proxy(originalEnv,{get(target,property,receiver){
    if(/(?:key|token|secret|credential)/i.test(String(property))){credentialReads++;throw Error('forbidden_credential_read');}
    return Reflect.get(target,property,receiver);
  }});
  globalThis.fetch=()=>{networkCalls++;throw Error('forbidden_network');};
  http.request=(...args)=>{
    const target=args[0],hostname=typeof target==='string'||target instanceof URL?new URL(target).hostname:target?.hostname;
    if(hostname!=='127.0.0.1'){networkCalls++;throw Error('forbidden_network');}
    return nativeHttpRequest(...args);
  };
  https.request=()=>{networkCalls++;throw Error('forbidden_network');};
  try{
    root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-view-check-'));
    const book=path.join(root,'book'),prepared=await prepareDreambookViewDemo(book);
    store=new Store(book);
    const before=fs.readFileSync(path.join(book,'state.json'),'utf8'),view=readDreambookView(store,prepared.dreamId),later=readDreambookLaterRecords(store,prepared.dreamId);
    assert.ok(view);assert.equal(prepared.syntheticStageCalls,3);assert.equal(later.length,2);
    server=await startDreambookViewServer({store,dreamId:prepared.dreamId,demo:true});
    const first=await request(server.url),setCookie=first.headers['set-cookie']?.[0];
    assert.equal(first.status,200);assert.equal(typeof setCookie,'string');assert.match(setCookie,/HttpOnly/);assert.match(setCookie,/SameSite=Strict/);
    const cookie=setCookie.split(';')[0],page=await request(server.url,{headers:{cookie}});
    assert.equal(page.status,200,page.body);
    const markers=['已保存的原梦','醒来之后','后来记录（非原梦）','模拟评价与依据','独立评审意见','来源与身份'];
    for(const marker of markers)assert.ok(page.body.includes(marker),marker);
    const positions=markers.map(marker=>page.body.indexOf(marker));assert.deepEqual([...positions].sort((a,b)=>a-b),positions);
    assert.ok(page.body.includes('虚构素材'));assert.ok(page.body.includes('非现实事实'));assert.ok(page.body.includes('固定虚构演示'));
    assert.ok(page.body.includes(prepared.reviewId));assert.ok(page.body.includes('fictional-view-reviewer'));
    assert.deepEqual(later.map(record=>record.origin),['recollection','imagined_continuation']);
    for(const record of later){assert.ok(page.body.includes(record.text));assert.equal(view.narrative.dream.scenes.some(scene=>scene.event===record.text),false);assert.notEqual(view.narrative.wake.fragment,record.text);}
    assert.equal(page.body.includes(root),false);assert.equal(page.body.includes(cookie),false);
    assert.equal(/<script\b/i.test(page.body),false);assert.equal(/https?:\/\//i.test(page.body),false);
    assert.match(page.headers['content-security-policy'],/script-src 'none'/);assert.match(page.headers['content-security-policy'],/frame-ancestors 'none'/);
    assert.equal(page.headers['cache-control'],'no-store, max-age=0');
    assert.equal(fs.readFileSync(path.join(book,'state.json'),'utf8'),before);
    const replay=await request(server.url,{headers:{cookie}});assert.equal(replay.status,200);assert.equal(replay.body,page.body);
    const head=await request(server.url,{method:'HEAD',headers:{cookie}});assert.equal(head.status,200);assert.equal(head.body,'');
    assert.equal(networkCalls,0);assert.equal(credentialReads,0);
    const url=server.url;await server.close();server=null;store=null;
    let closedRequestRejected=false;try{await request(url);}catch{closedRequestRejected=true;}assert.equal(closedRequestRejected,true);
    store=new Store(book);assert.ok(readDreambookView(store,prepared.dreamId));assert.equal(readDreambookLaterRecords(store,prepared.dreamId).length,2);store.close();store=null;
    return {command:'node scripts/check-dreambook-view.mjs',node:process.version,platform:process.platform,syntheticStageCalls:prepared.syntheticStageCalls,syntheticLaterRecords:later.length,realModelRequests:0,nativeHttpsRequests:0,credentialReads:0,loopbackOnly:true,capabilityCookie:true,crossOriginGuardConfigured:true,readOnlyGetAndHead:true,stableStateBytesUnchanged:true,pageLoadGeneration:false,replayStable:true,sectionsDistinct:true,laterRecordsDistinct:true,scriptlessAndNoRemoteAssets:true,storeClosedOnStop:true,userStoreAccessed:false,qualityAssessed:false,filesystemZeroWritesClaimed:false};
  }finally{
    try{await server?.close();}catch{}
    try{store?.close();}catch{}
    process.env=originalEnv;
    globalThis.fetch=nativeFetch;http.request=nativeHttpRequest;https.request=nativeHttpsRequest;
    if(root)fs.rmSync(root,{recursive:true,force:true});
  }
}
