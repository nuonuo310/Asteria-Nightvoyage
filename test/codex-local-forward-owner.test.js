import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {openLocalForwardOwner} from '../scripts/codex-local-forward-owner.mjs';
const body=()=>JSON.stringify({model:'gpt-5.6-sol',input:[],tools:[{type:'custom',name:'exec',format:{type:'grammar',syntax:'lark',definition:'start: /.+/'}},{type:'function',name:'wait',parameters:{type:'object'}}]});
async function setup(handler){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-local-forward-test-'));let posts=0;
 const server=http.createServer((req,res)=>{posts++;req.resume();handler(req,res,posts,JSON.parse(fs.readFileSync(path.join(directory,'forward-journal.json'),'utf8')));});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const target=`http://127.0.0.1:${server.address().port}/v1/responses`,owners=[];
 return {directory,target,posts:()=>posts,snapshot:()=>JSON.parse(fs.readFileSync(path.join(directory,'forward-journal.json'),'utf8')),
  async open(extra={}){const o=await openLocalForwardOwner({target,stateDirectory:directory,...extra});owners.push(o);return o;},
  async close(){for(const o of owners)await o.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));fs.rmSync(directory,{recursive:true,force:true});}};
}
const send=(o,data=body(),extra={})=>fetch(o.endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:data,...extra});
test('each forwarded HTTP request has a saved intent before upstream arrival; third is blocked across reopen',async()=>{
 const seen=[],f=await setup((req,res,n,s)=>{seen.push(s);assert.equal(req.headers.authorization,undefined);res.writeHead(200,{'Content-Type':'application/json','Set-Cookie':'FICTIONAL-PRIVATE'});res.end('{"fixture":true}');});
 try{let o=await f.open();for(let i=0;i<2;i++){const r=await send(o);assert.equal(r.status,200);assert.equal(r.headers.get('set-cookie'),null);await r.text();}
  assert.deepEqual(seen.map(s=>[s.calls,s.phase]),[[1,'first_in_flight'],[2,'second_in_flight']]);assert.equal(o.view().forwardedLocalRequests,2);
  await o.close();o=await f.open();assert.equal((await send(o)).status,409);assert.equal(f.posts(),2);assert.equal(f.snapshot().phase,'completed');
 }finally{await f.close();}
});
test('forwarding bypasses global fetch and the global HTTP agent through an explicit loopback connection',async()=>{
 const f=await setup((req,res)=>res.end('fictional')),front=globalThis.fetch,connection=http.globalAgent.createConnection;
 try{const o=await f.open();globalThis.fetch=()=>{throw Error('fictional_global_fetch_must_not_run');};http.globalAgent.createConnection=()=>{throw Error('fictional_global_agent_must_not_run');};
  const r=await front(o.endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:body()});assert.equal(r.status,200);assert.equal(await r.text(),'fictional');assert.equal(f.posts(),1);assert.equal(o.view().directSocketAttempts,1);
 }finally{globalThis.fetch=front;http.globalAgent.createConnection=connection;await f.close();}
});
test('concurrent store owner is refused, and reopening an ambiguous request cannot forward or acknowledge it',async()=>{
 const f=await setup((req,res)=>res.destroy());
 try{let o=await f.open();await assert.rejects(f.open(),/locked/);assert.equal((await send(o)).status,502);assert.equal(f.snapshot().phase,'first_in_flight');await o.close();
  o=await f.open();assert.equal((await send(o)).status,409);assert.equal(f.posts(),1);assert.equal(f.snapshot().phase,'first_in_flight');
 }finally{await f.close();}
});
test('reservation persistence failure sends no upstream request and closes further dispatch',async()=>{
 const f=await setup((req,res)=>res.end());
 try{const o=await f.open();fs.mkdirSync(path.join(f.directory,'forward-journal.json.next'));assert.equal((await send(o)).status,409);assert.equal(f.posts(),0);assert.equal((await send(o)).status,503);assert.equal(o.view().journal.persistenceFailed,true);
 }finally{await f.close();}
});
test('settlement persistence failure suppresses the reply and keeps the reserved request ambiguous',async()=>{
 const f=await setup((req,res)=>{fs.mkdirSync(path.join(f.directory,'forward-journal.json.next'));res.end('FICTIONAL-PRIVATE-REPLY');});
 try{const o=await f.open(),r=await send(o);assert.equal(r.status,502);assert.ok(!(await r.text()).includes('FICTIONAL-PRIVATE'));assert.equal(f.posts(),1);assert.equal(f.snapshot().phase,'first_in_flight');
 }finally{await f.close();}
});
test('concurrent dispatch cannot forward a second request or publish a late first reply',async()=>{
 let release,arrived;const hit=new Promise(r=>arrived=r),f=await setup((req,res)=>{release=()=>res.end('FICTIONAL-PRIVATE-LATE');arrived();});
 try{const o=await f.open();const first=send(o);await hit;assert.equal((await send(o)).status,409);release();const r=await first;assert.equal(r.status,502);assert.ok(!(await r.text()).includes('FICTIONAL-PRIVATE'));assert.equal(f.posts(),1);assert.equal(f.snapshot().phase,'first_in_flight');
 }finally{await f.close();}
});
test('cancel before dispatch persists terminal state with zero outbound calls',async()=>{
 const f=await setup((req,res)=>res.end());try{let o=await f.open();o.cancel();assert.equal((await send(o)).status,503);assert.equal(f.posts(),0);assert.equal(f.snapshot().calls,0);assert.equal(f.snapshot().phase,'cancelled');await o.close();o=await f.open();assert.equal((await send(o)).status,409);assert.equal(f.posts(),0);}finally{await f.close();}
});
test('in-flight cancellation suppresses late bytes and does not claim remote cancellation',async()=>{
 let arrived,release;const hit=new Promise(r=>arrived=r),f=await setup((req,res)=>{release=()=>res.end('FICTIONAL-PRIVATE-LATE');arrived();});
 try{const o=await f.open(),pending=send(o);await hit;o.cancel();release();const r=await pending;assert.equal(r.status,502);assert.ok(!(await r.text()).includes('FICTIONAL-PRIVATE'));assert.equal(f.snapshot().phase,'cancelled');assert.equal(o.view().remoteCancellationConfirmed,'unknown');}finally{await f.close();}
});
test('bounded upstream timeout leaves a single ambiguous reservation and no retry',async()=>{
 const f=await setup(()=>{});try{const o=await f.open({timeoutMs:100}),r=await send(o);assert.equal(r.status,502);assert.equal(f.posts(),1);assert.equal(f.snapshot().phase,'first_in_flight');assert.equal((await send(o)).status,503);}finally{await f.close();}
});
test('redirects are never followed and oversized upstream replies are suppressed',async()=>{
 for(const kind of ['redirect','oversized']){const f=await setup((req,res)=>{if(kind==='redirect'){res.writeHead(307,{Location:'/elsewhere'});res.end();}else res.end('x'.repeat(262145));});try{const o=await f.open(),r=await send(o);assert.equal(r.status,502);assert.equal(f.posts(),1);assert.equal(f.snapshot().phase,'first_in_flight');}finally{await f.close();}}
});
test('HTTP error reply consumes an intent but never means inference accepted',async()=>{
 const f=await setup((req,res)=>{res.writeHead(400,{'Content-Type':'application/json'});res.end('{"error":"fixture"}');});try{const o=await f.open(),r=await send(o);assert.equal(r.status,400);await r.text();assert.equal(f.snapshot().phase,'continuation_ready');assert.equal(o.view().dispatchEnabled,false);assert.equal(o.view().realProviderAccountingIntegrated,false);}finally{await f.close();}
});
test('malformed, wrong-model and unreviewed-tool input never reserves or forwards',async()=>{
 const f=await setup((req,res)=>res.end());try{const o=await f.open();for(const data of ['{',body().replace('gpt-5.6-sol','other'),body().replace('"exec"','"unknown"')])assert.equal((await send(o,data)).status,400);assert.equal(f.snapshot().calls,0);assert.equal(f.posts(),0);}finally{await f.close();}
});
test('authorization, cookies, encoded bodies and wrong routes cannot reach upstream',async()=>{
 const f=await setup((req,res)=>res.end());try{const o=await f.open();for(const headers of [{Authorization:'Bearer FICTIONAL-PRIVATE'},{Cookie:'FICTIONAL-PRIVATE'},{'Content-Encoding':'gzip'}]){const r=await send(o,body(),{headers:{'Content-Type':'application/json',...headers}});assert.equal(r.status,400);}assert.equal((await fetch(o.endpoint+'/other',{method:'POST'})).status,400);assert.equal(f.posts(),0);}finally{await f.close();}
});
test('remote targets, caller credentials, unknown settings and getters are rejected before store mutation',async()=>{
 const f=await setup((req,res)=>res.end());try{for(const target of ['https://api.openai.com/v1/responses','http://localhost:1/v1/responses','http://user:pass@127.0.0.1:1/v1/responses','http://127.0.0.1:1/v1/responses?q=1'])await assert.rejects(openLocalForwardOwner({target,stateDirectory:f.directory}));await assert.rejects(f.open({token:'FICTIONAL'}));let gets=0;await assert.rejects(openLocalForwardOwner({get target(){gets++;return f.target;},stateDirectory:f.directory}));assert.equal(gets,0);assert.deepEqual(fs.readdirSync(f.directory),[]);}finally{await f.close();}
});
test('target coercion and managed storage symlinks cannot acquire forwarding authority',async()=>{
 const f=await setup((req,res)=>res.end());try{let calls=0;await assert.rejects(openLocalForwardOwner({target:{toString(){calls++;return f.target;}},stateDirectory:f.directory}));assert.equal(calls,0);
  const source=path.join(f.directory,'fictional-source');fs.writeFileSync(source,'{}');fs.symlinkSync(source,path.join(f.directory,'forward-journal.json'));await assert.rejects(f.open());assert.equal(fs.readFileSync(source,'utf8'),'{}');assert.equal(f.posts(),0);
 }finally{await f.close();}
});
test('partial write leftovers, invalid snapshots and stale owner locks fail without network',async()=>{
 const f=await setup((req,res)=>res.end());try{const next=path.join(f.directory,'forward-journal.json.next'),file=path.join(f.directory,'forward-journal.json'),lock=path.join(f.directory,'forward-owner.lock');fs.writeFileSync(next,'fictional');await assert.rejects(f.open());fs.unlinkSync(next);fs.writeFileSync(file,'{}');await assert.rejects(f.open());fs.unlinkSync(file);fs.writeFileSync(lock,'fictional stale lock');await assert.rejects(f.open(),/locked/);assert.equal(f.posts(),0);}finally{await f.close();}
});
test('actual owned child death after upstream arrival leaves a saved ambiguous intent and an unrepaired lock',async()=>{
 let child;const f=await setup(()=>child.kill('SIGKILL'));
 try{
  const module=new URL('../scripts/codex-local-forward-owner.mjs',import.meta.url).href;
  const code=`import {openLocalForwardOwner} from ${JSON.stringify(module)};const o=await openLocalForwardOwner(${JSON.stringify({target:f.target,stateDirectory:f.directory})});await fetch(o.endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:${JSON.stringify(body())}});`;
  const env={TEMP:os.tmpdir(),TMP:os.tmpdir(),TMPDIR:os.tmpdir(),...(process.platform==='win32'?{SystemRoot:process.env.SystemRoot}:{})};
  child=spawn(process.execPath,['--input-type=module','-e',code],{env,stdio:'ignore'});
  const exit=await new Promise((resolve,reject)=>{const t=setTimeout(()=>{child.kill('SIGKILL');reject(Error('fictional_child_timeout'));},5000);child.once('error',reject);child.once('close',(code,signal)=>{clearTimeout(t);resolve({code,signal});});});
  assert.ok(exit.signal||exit.code!==0);assert.equal(f.posts(),1);assert.equal(f.snapshot().phase,'first_in_flight');assert.equal(f.snapshot().calls,1);await assert.rejects(f.open(),/locked/);assert.equal(f.posts(),1);
 }finally{child?.kill('SIGKILL');await f.close();}
});
