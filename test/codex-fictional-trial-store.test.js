import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {openFictionalTrialStore as open} from '../scripts/codex-fictional-trial-store.mjs';
const binding=()=>({approval_id:'fictional-approval',run_id:'fictional-run',adapter_kind:'CodexAdapter',model_id:'gpt-5.6-sol',protocol_version:'fictional-protocol-v1',source_hash:'a'.repeat(64),fixture_hash:'b'.repeat(64),expires_at:100,max_calls:2,confirmation_origin:'independent_fictional_fixture'});
const request=n=>({request_id:`fictional-request-${n}`,request_hash:String(n).repeat(64)});
function setup(){const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-durable-fixture-')),owners=[];return {directory,file:path.join(directory,'fictional-trial.json'),options:(extra={})=>({directory,identity:binding(),mode:'open',now:1,...extra}),open(extra={}){const o=open(this.options(extra));owners.push(o);return o;},close(){for(const o of owners)o.close();fs.rmSync(directory,{recursive:true,force:true});}};}
test('retained identity, expiry and two HTTP intents survive close/reopen; create cannot reset allowance',()=>{
 const f=setup();try{let o=f.open({mode:'create'});assert.equal(o.reserve(request(1),2),1);o.complete(request(1).request_id,3);o.close();
  assert.throws(()=>f.open({mode:'create'}));o=f.open({now:3});assert.equal(o.reserve(request(2),4),2);o.complete(request(2).request_id,5);o.close();
  o=f.open({now:5});assert.equal(o.view().calls,2);assert.equal(o.view().phase,'completed');assert.throws(()=>o.reserve(request(3),6));assert.equal(o.view().identity.expires_at,100);
 }finally{f.close();}
});
test('all binding changes fail without rewriting the saved record',()=>{
 const f=setup();try{f.open({mode:'create'}).close();const original=fs.readFileSync(f.file);
  const changes={approval_id:'another',run_id:'another',adapter_kind:'FakeAdapter',model_id:'other',protocol_version:'another',source_hash:'c'.repeat(64),fixture_hash:'d'.repeat(64),expires_at:101,max_calls:3,confirmation_origin:'user_consent'};
  for(const [key,value] of Object.entries(changes))assert.throws(()=>f.open({identity:{...binding(),[key]:value}}));assert.deepEqual(fs.readFileSync(f.file),original);
 }finally{f.close();}
});
test('same request cannot be replayed with either same or changed payload hash',()=>{
 const f=setup();try{const o=f.open({mode:'create'});o.reserve(request(1),2);o.complete(request(1).request_id,3);assert.throws(()=>o.reserve(request(1),4));assert.throws(()=>o.reserve({...request(1),request_hash:'c'.repeat(64)},4));assert.equal(o.view().calls,1);}finally{f.close();}
});
test('pending survives reopen and cannot be acknowledged or repeated by a new owner',()=>{
 const f=setup();try{let o=f.open({mode:'create'});o.reserve(request(1),2);o.close();o=f.open({now:2});assert.equal(o.view().ambiguousDispatch,true);assert.throws(()=>o.complete(request(1).request_id,3));assert.throws(()=>o.reserve(request(2),3));}finally{f.close();}
});
test('expiry and persisted clock forbid new reservations; an active HTTP reply may settle after expiry',()=>{
 const f=setup();try{let o=f.open({mode:'create'});o.reserve(request(1),99);o.complete(request(1).request_id,101);assert.throws(()=>o.reserve(request(2),99));o.close();assert.throws(()=>f.open({now:100}));o=f.open({now:101});assert.throws(()=>o.reserve(request(2),101));assert.equal(o.view().calls,1);}finally{f.close();}
});
test('cancel before dispatch is durable and in-flight cancellation blocks late completion',()=>{
 for(const pending of [false,true]){const f=setup();try{let o=f.open({mode:'create'});if(pending)o.reserve(request(1),2);o.cancel(3);assert.throws(()=>o.complete(request(1).request_id,4));o.close();o=f.open({now:3});assert.equal(o.view().calls,pending?1:0);assert.throws(()=>o.reserve(request(2),4));}finally{f.close();}}
});
test('exclusive owner, detached views and malformed/partial snapshots cannot bypass state',()=>{
 const f=setup();try{let o=f.open({mode:'create'});assert.throws(()=>f.open());o.view().identity.max_calls=99;assert.equal(o.view().identity.max_calls,2);o.close();
  fs.writeFileSync(f.file+'.next','partial');assert.throws(()=>f.open());fs.unlinkSync(f.file+'.next');const original=fs.readFileSync(f.file,'utf8');
  for(const text of ['{}',original.replace('"attempts"','"unknown"'),original.replace('"ready"','"completed"')]){if(text===original)continue;fs.writeFileSync(f.file,text);assert.throws(()=>f.open());}
 }finally{f.close();}
});
test('reserve/settle persistence failure poisons owner and retains the conservative old record',()=>{
 for(const settle of [false,true]){const f=setup();try{const o=f.open({mode:'create'});if(settle)o.reserve(request(1),2);const before=fs.readFileSync(f.file);fs.mkdirSync(f.file+'.next');assert.throws(()=>settle?o.complete(request(1).request_id,3):o.reserve(request(1),2),/persistence/);assert.equal(o.view().persistenceFailed,true);assert.throws(()=>o.reserve(request(2),4));assert.deepEqual(fs.readFileSync(f.file),before);}finally{f.close();}}
});
test('open never creates missing approval and contracts reject getters and arbitrary fields',()=>{
 const f=setup();try{assert.throws(()=>f.open());let calls=0;const options=f.options({mode:'create'});Object.defineProperty(options,'now',{get(){calls++;return 1;},enumerable:true});assert.throws(()=>open(options));assert.equal(calls,0);assert.throws(()=>f.open({mode:'create',token:'FICTIONAL-SECRET'}));assert.equal(fs.existsSync(f.file),false);}finally{f.close();}
});
test('independent loopback peer sees each persisted pending intent before arrival; reopen cannot send a third',async()=>{
 const f=setup();let posts=0;const server=http.createServer((req,res)=>{posts++;const s=JSON.parse(fs.readFileSync(f.file));assert.equal(s.phase,'pending');assert.equal(s.attempts.length,posts);req.resume();res.end('fictional');});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{let o=f.open({mode:'create'});for(let n=1;n<=2;n++){o.reserve(request(n),n*2);const reply=await fetch(`http://127.0.0.1:${server.address().port}`,{method:'POST',body:'independent fictional fixture'});await reply.text();o.complete(request(n).request_id,n*2+1);o.close();o=f.open({now:n*2+1});}assert.throws(()=>o.reserve(request(3),6));assert.equal(posts,2);assert.ok(!fs.readFileSync(f.file,'utf8').includes('independent fictional fixture'));}finally{server.closeAllConnections();await new Promise(r=>server.close(r));f.close();}
});
test('actual process death after reservation retains pending intent and stale owner lock',async()=>{
 const f=setup(),url=new URL('../scripts/codex-fictional-trial-store.mjs',import.meta.url).href;
 const source=`import {openFictionalTrialStore as open} from ${JSON.stringify(url)};const o=open(${JSON.stringify(f.options({mode:'create'}))});o.reserve(${JSON.stringify(request(1))},2);console.log('saved');setInterval(()=>{},1000);`;
 const child=spawn(process.execPath,['--input-type=module','-e',source],{env:{SystemRoot:process.env.SystemRoot??'',TMPDIR:os.tmpdir(),TMP:os.tmpdir(),TEMP:os.tmpdir()},stdio:['ignore','pipe','pipe']});let output='';
 try{await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('fixture_child_timeout')),5000);child.stdout.on('data',b=>{output+=b;if(output.includes('saved')){clearTimeout(timer);resolve();}});child.on('error',reject);});const exited=new Promise(r=>child.once('exit',r));child.kill('SIGKILL');await exited;assert.equal(JSON.parse(fs.readFileSync(f.file)).phase,'pending');assert.throws(()=>f.open({now:2}));}finally{if(child.exitCode===null&&child.signalCode===null)child.kill('SIGKILL');f.close();}
});

test('open clock and refused expired reservation cannot be rewound within the same owner',()=>{
 const f=setup();try{f.open({mode:'create'}).close();const o=f.open({now:50});assert.throws(()=>o.reserve(request(1),49),/clock/);assert.throws(()=>o.reserve(request(1),100));assert.throws(()=>o.reserve(request(1),99),/clock/);assert.equal(o.view().calls,0);}finally{f.close();}
});
test('missing directory, linked record and linked root are refused without following them',()=>{
 const f=setup();const target=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-durable-target-')),link=path.join(f.directory,'linked-root');
 try{fs.symlinkSync(target,link,process.platform==='win32'?'junction':'dir');assert.throws(()=>open(f.options({directory:link,mode:'create'})));assert.throws(()=>open(f.options({directory:path.join(f.directory,'absent'),mode:'create'})));fs.symlinkSync(process.platform==='win32'?target:path.join(target,'absent'),f.file,process.platform==='win32'?'junction':'file');assert.throws(()=>f.open({mode:'create'}));assert.throws(()=>f.open());assert.equal(fs.lstatSync(f.file).isSymbolicLink(),true);}finally{f.close();fs.rmSync(target,{recursive:true,force:true});}
});
test('wrong live completion identity cannot settle the reserved call',()=>{
 const f=setup();try{const o=f.open({mode:'create'});o.reserve(request(1),2);assert.throws(()=>o.complete(request(2).request_id,3));assert.equal(o.view().phase,'pending');o.complete(request(1).request_id,3);assert.equal(o.view().phase,'ready');}finally{f.close();}
});

test('observed expiry is terminal across reopen and open clock is saved without refreshing consent',()=>{
 const f=setup();try{let o=f.open({mode:'create'});o.close();o=f.open({now:50});o.close();assert.throws(()=>f.open({now:49}));o=f.open({now:50});assert.throws(()=>o.reserve(request(1),100));o.close();assert.throws(()=>f.open({now:99}));o=f.open({now:100});assert.equal(o.view().phase,'expired');assert.equal(o.view().identity.expires_at,100);assert.throws(()=>o.reserve(request(1),101));}finally{f.close();}
});
