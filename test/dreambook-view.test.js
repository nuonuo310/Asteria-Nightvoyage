import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {Store} from '../src/store.js';
import {dreambookCatalog,runDreambook} from '../scripts/dreambook.mjs';
import {readDreambookLaterRecords,readDreambookView} from '../scripts/dreambook-view-records.mjs';
import {prepareDreambookViewDemo} from '../scripts/dreambook-view-demo.mjs';
import {renderDreambookViewHtml,escapeDreambookText} from '../scripts/dreambook-view-html.mjs';
import {startDreambookViewServer,runDreambookView} from '../scripts/dreambook-view.mjs';
const repoRoot=fileURLToPath(new URL('..',import.meta.url));
function request(url,{method='GET',headers={}}={}){
  return new Promise((resolve,reject)=>{
    const req=http.request(url,{method,headers},res=>{
      const chunks=[];res.on('data',chunk=>chunks.push(chunk));
      res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks).toString('utf8')}));
    });
    req.on('error',reject);req.end();
  });
}
async function demo(t){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-view-test-')),book=path.join(root,'book');
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const prepared=await prepareDreambookViewDemo(book);
  return {root,book,prepared};
}
function cookieFrom(response){
  const value=response.headers['set-cookie']?.[0];
  assert.equal(typeof value,'string');
  return value.split(';')[0];
}
test('fixed fictional demo keeps dream, wake, later records, appraisal and attributed opinion distinct without writes',async t=>{
  const {root,book,prepared}=await demo(t);let store=new Store(book),server;
  try{
    server=await startDreambookViewServer({store,dreamId:prepared.dreamId,demo:true});
    const first=await request(server.url);
    assert.equal(first.status,200,first.body);
    const setCookie=first.headers['set-cookie'][0];
    assert.match(setCookie,/HttpOnly/);assert.match(setCookie,/SameSite=Strict/);
    const cookie=cookieFrom(first);
    const before=fs.readFileSync(path.join(book,'state.json'),'utf8');
    const page=await request(server.url,{headers:{cookie}});
    assert.equal(page.status,200,page.body);
    for(const marker of ['夜航梦簿','虚构素材','非现实事实','固定虚构演示','已保存的原梦','醒来之后','后来记录（非原梦）','后来回想','想象续写','模拟评价与依据','独立评审意见','来源与身份','不是现实'])assert.ok(page.body.includes(marker),marker);
    assert.ok(page.body.includes(prepared.reviewId));assert.ok(page.body.includes('fictional-view-reviewer'));assert.ok(page.body.includes('不代表人工验收'));
    assert.equal(prepared.laterRecordIds.length,2);
    const view=readDreambookView(store,prepared.dreamId),later=readDreambookLaterRecords(store,prepared.dreamId);
    assert.deepEqual(later.map(record=>record.origin),['recollection','imagined_continuation']);
    for(const record of later){assert.deepEqual(record.derivedFrom,[prepared.dreamId]);assert.ok(page.body.includes(record.text));assert.equal(view.narrative.dream.scenes.some(scene=>scene.event===record.text),false);assert.notEqual(view.narrative.wake.fragment,record.text);}
    const positions=['已保存的原梦','醒来之后','后来记录（非原梦）','模拟评价与依据','独立评审意见'].map(marker=>page.body.indexOf(marker));
    assert.deepEqual([...positions].sort((a,b)=>a-b),positions);
    assert.equal(page.body.includes(root),false);assert.equal(page.body.includes(cookie),false);
    assert.equal(/<script\b/i.test(page.body),false);assert.equal(/https?:\/\//i.test(page.body),false);
    assert.match(page.headers['content-security-policy'],/script-src 'none'/);
    assert.match(page.headers['content-security-policy'],/frame-ancestors 'none'/);
    assert.equal(page.headers['cache-control'],'no-store, max-age=0');
    assert.equal(server.host,'127.0.0.1');assert.equal(prepared.syntheticStageCalls,3);
    assert.equal(fs.readFileSync(path.join(book,'state.json'),'utf8'),before);
    const replay=await request(server.url,{headers:{cookie}});
    assert.equal(replay.status,200);
  }finally{await server?.close();store?.close();}
});
test('server rejects missing capability, cross-origin requests, unreviewed methods and hosts without leaking content',async t=>{
  const {root,book,prepared}=await demo(t);let store=new Store(book),server;
  try{
    server=await startDreambookViewServer({store,dreamId:prepared.dreamId,demo:true});
    const first=await request(server.url),cookie=cookieFrom(first),view=readDreambookView(store,prepared.dreamId),body=view.narrative.dream.scenes[0].event;
    const cases=[
      await request(server.url),
      await request(server.url,{headers:{cookie:'nv_view_bad=wrong'}}),
      await request(server.url,{headers:{cookie,origin:'https://example.invalid'}}),
      await request(server.url,{headers:{cookie,'sec-fetch-site':'cross-site'}}),
      await request(server.url,{headers:{cookie,referer:'https://example.invalid/'}}),
      await request(server.url,{headers:{cookie,host:'example.invalid'}})
    ];
    for(const response of cases){assert.equal(response.status,403);assert.equal(response.body.includes(body),false);assert.equal(response.body.includes(root),false);}
    const post=await request(server.url,{method:'POST',headers:{cookie}});assert.equal(post.status,405);assert.equal(post.headers.allow,'GET, HEAD');
    const other=await request(new URL('/other',server.url),{headers:{cookie}});assert.equal(other.status,404);
    const query=await request(new URL('/?dream=private',server.url),{headers:{cookie}});assert.equal(query.status,404);
    const head=await request(server.url,{method:'HEAD',headers:{cookie}});assert.equal(head.status,200);assert.equal(head.body,'');
    for(const response of [post,other,query]){assert.equal(response.body.includes(body),false);assert.equal(response.body.includes(root),false);}
  }finally{await server?.close();store?.close();}
});
test('HTML escaping neutralizes stored text, controls and quote characters',async t=>{
  const {book,prepared}=await demo(t);const store=new Store(book);
  try{
    const view=readDreambookView(store,prepared.dreamId),later=readDreambookLaterRecords(store,prepared.dreamId);
    view.narrative.dream.scenes[0].event='<script>alert("dream")</script>\u0000';
    view.narrative.wake.fragment='</style><img src=x onerror=alert(1)>';
    view.reviews[0].assessment.note='<b onmouseover="x">not markup</b>';
    later[0].text='<svg onload="x">later markup</svg>';
    const html=renderDreambookViewHtml(view,{demo:true,laterRecords:later});
    assert.equal(html.includes('<script>'),false);assert.equal(html.includes('<img'),false);assert.equal(html.includes('<b onmouseover'),false);assert.equal(html.includes('<svg'),false);
    assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('&lt;img'));assert.ok(html.includes('&lt;b onmouseover'));assert.ok(html.includes('&lt;svg'));
    assert.equal(html.includes('\u0000'),false);assert.ok(html.includes('\\u0000'));
    assert.equal(escapeDreambookText(`<&>\"'`),'&lt;&amp;&gt;&quot;&#39;');
  }finally{store.close();}
});
test('owner lock is exclusive and close releases both server and Store',async t=>{
  const {book,prepared}=await demo(t);const store=new Store(book);let server;
  try{
    server=await startDreambookViewServer({store,dreamId:prepared.dreamId,demo:true});
    assert.throws(()=>new Store(book),/store_busy/);
    assert.throws(()=>runDreambook(['list','--data-dir',book]),/store_busy/);
    const url=server.url;await server.close();
    const reopened=new Store(book);reopened.close();
    await assert.rejects(request(url));
    server=null;
  }finally{await server?.close();store.close();}
});
test('withdrawal and deletion prevent startup and refreshed reads after reopen',async t=>{
  for(const mode of ['withdraw','delete']){
    const {root,book,prepared}=await demo(t);let store=new Store(book),server;
    try{
      server=await startDreambookViewServer({store,dreamId:prepared.dreamId,demo:true});
      const first=await request(server.url),cookie=cookieFrom(first),visible=await request(server.url,{headers:{cookie}});
      assert.equal(visible.status,200);const body=readDreambookView(store,prepared.dreamId).narrative.dream.scenes[0].event;assert.ok(visible.body.includes(body));
      if(mode==='withdraw')store.withdraw(prepared.sourceId);
      else store.deleteEntry(store.state.entries[prepared.dreamId]);
      const refreshed=await request(server.url,{headers:{cookie}});
      assert.equal(refreshed.status,410);assert.equal(refreshed.body.includes(body),false);assert.equal(refreshed.body.includes(root),false);
      await server.close();server=null;store=null;
      store=new Store(book);
      assert.deepEqual(dreambookCatalog(store).dreams,[]);
      assert.equal(readDreambookView(store,prepared.dreamId),null);
      await assert.rejects(startDreambookViewServer({store,dreamId:prepared.dreamId}),/dream_not_visible/);
      store.close();store=null;
      assert.equal(fs.existsSync(path.join(root,'book','state.json')),true);
    }finally{await server?.close();store?.close();}
  }
});
test('unsupported selected protocol fails closed instead of rendering a fallback',async t=>{
  const {book,prepared}=await demo(t);let store=new Store(book);
  try{
    const run=store.state.runs[store.state.entries[prepared.dreamId].runId];run.appraisalProtocolVersion='fictional-unsupported';store.save();store.close();
    store=new Store(book);
    assert.equal(dreambookCatalog(store).dreams[0].protocolSupported,false);
    await assert.rejects(startDreambookViewServer({store,dreamId:prepared.dreamId}),/unsupported_review_parent/);
  }finally{store?.close();}
});
test('unsupported latest dream fails closed without falling back to the older visible dream',async t=>{
  const {book,prepared}=await demo(t);let store=new Store(book),leaked=null;
  try{
    const entry=structuredClone(store.state.entries[prepared.dreamId]),run=structuredClone(store.state.runs[entry.runId]);
    const id='fictional-unsupported-later-dream',runId='fictional-unsupported-later-run';
    store.state.entries[id]={...entry,id,runId};
    store.state.runs[runId]={...run,id:runId,entryId:id,appraisalProtocolVersion:'fictional-unsupported'};
    store.save();store.close();store=null;
    try{await assert.rejects(async()=>{leaked=await runDreambookView(['--data-dir',book,'--latest','--no-open'],{stdout:()=>{}});},/unsupported_review_parent/);}finally{await leaked?.close();leaked=null;}
    const explicit=await runDreambookView(['--data-dir',book,'--dream-id',prepared.dreamId,'--no-open'],{stdout:()=>{}});
    try{const response=await request(explicit.url);assert.equal(response.status,200);assert.ok(response.body.includes(prepared.dreamId));}finally{await explicit.close();}
  }finally{await leaked?.close();store?.close();}
});
test('malformed later records fail closed before the loopback server opens',async t=>{
  const {book,prepared}=await demo(t);let store=new Store(book);
  try{
    store.state.entries[prepared.laterRecordIds[0]].text={private:'not a valid child record'};store.save();store.close();store=new Store(book);
    await assert.rejects(startDreambookViewServer({store,dreamId:prepared.dreamId}),/invalid_dreambook_entry/);
  }finally{store?.close();}
});
test('CLI refuses missing stores and opens an explicitly selected existing Store',async t=>{
  const {root,book,prepared}=await demo(t),absent=path.join(root,'absent');
  const missing=spawnSync(process.execPath,['scripts/dreambook-view.mjs','--data-dir',absent,'--latest','--no-open'],{cwd:repoRoot,encoding:'utf8',timeout:10000});
  assert.equal(missing.status,1);assert.match(missing.stderr,/existing_dreambook_store_required/);assert.equal(missing.stdout,'');assert.equal(missing.stderr.includes(absent),false);assert.equal(fs.existsSync(absent),false);
  const noSelection=spawnSync(process.execPath,['scripts/dreambook-view.mjs'],{cwd:repoRoot,encoding:'utf8',timeout:10000});
  assert.equal(noSelection.status,1);assert.match(noSelection.stderr,/dreambook_view_store_required/);
  const close=new Store(book);close.close();
  let text='';const running=await runDreambookView(['--data-dir',book,'--dream-id',prepared.dreamId,'--no-open'],{stdout:line=>{text+=line;}});
  try{assert.match(text,/http:\/\/127\.0\.0\.1:\d+\//);assert.equal(text.includes(book),false);const response=await request(running.url);assert.equal(response.status,200);assert.ok(response.body.includes(prepared.dreamId));}
  finally{await running.close();}
});
