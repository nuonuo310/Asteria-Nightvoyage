import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {persistentFixture,checkPersistentForward} from '../test-support/codex-persistent-forward-fixture.mjs';
import {openLocalForwardOwner} from '../scripts/codex-local-forward-owner.mjs';
test('both saved pre-forward identities survive reopen and block third dispatch',async()=>{const report=await checkPersistentForward();assert.equal(report.fixturePosts,2);assert.equal(report.dualIntentsCheckedBeforeArrival,2);assert.equal(report.realUserApprovalRecorded,false);assert.equal(report.nativeAppServerIntegrated,false);});
test('fresh relay directory cannot reset retained logical trial accounting',async()=>{
 const f=await persistentFixture();try{let t=f.trial('create'),o=await f.forward(t);await (await f.send(o)).text();await o.close();t.close();t=f.trial();const fresh=path.join(f.root,'fresh');fs.mkdirSync(fresh);await assert.rejects(f.forward(t,{stateDirectory:fresh}));assert.equal(t.view().calls,1);assert.equal(f.posts(),1);}finally{await f.close();}
});
test('logical reservation save failure blocks HTTP even after relay reservation was saved',async()=>{
 const f=await persistentFixture();try{const t=f.trial('create'),o=await f.forward(t);fs.mkdirSync(f.file+'.next');assert.equal((await f.send(o)).status,409);assert.equal(f.posts(),0);assert.equal(o.view().journal.calls,1);assert.equal(t.view().calls,0);assert.equal(t.view().persistenceFailed,true);}finally{await f.close();}
});
test('logical completion save failure suppresses response and remains ambiguous across reopen',async()=>{
 const f=await persistentFixture((req,res)=>{fs.mkdirSync(f.file+'.next');res.end('FICTIONAL-MUST-NOT-PUBLISH');});try{let t=f.trial('create'),o=await f.forward(t);const reply=await f.send(o);assert.equal(reply.status,502);assert.ok(!(await reply.text()).includes('FICTIONAL-MUST-NOT-PUBLISH'));assert.equal(f.posts(),1);assert.equal(t.view().ambiguousDispatch,true);await o.close();t.close();fs.rmdirSync(f.file+'.next');t=f.trial();o=await f.forward(t);assert.equal((await f.send(o)).status,409);assert.equal(f.posts(),1);}finally{await f.close();}
});
test('relay completion failure keeps logical request pending and blocks reopen forwarding',async()=>{
 const f=await persistentFixture((req,res)=>{fs.mkdirSync(path.join(f.relay,'forward-journal.json.next'));res.end('FICTIONAL-MUST-NOT-PUBLISH');});try{let t=f.trial('create'),o=await f.forward(t);assert.equal((await f.send(o)).status,502);assert.equal(t.view().phase,'pending');await o.close();t.close();fs.rmdirSync(path.join(f.relay,'forward-journal.json.next'));t=f.trial();o=await f.forward(t);assert.equal((await f.send(o)).status,409);assert.equal(f.posts(),1);}finally{await f.close();}
});
test('expiry after owner open blocks before network without refreshing identity',async()=>{
 const f=await persistentFixture(),clock=Date.now;try{const t=f.trial('create'),o=await f.forward(t);Date.now=()=>f.identity.expires_at;assert.equal((await f.send(o)).status,409);assert.equal(f.posts(),0);assert.equal(t.view().calls,0);assert.equal(t.view().phase,'expired');}finally{Date.now=clock;await f.close();}
});
test('cancellation persists in both records and suppresses late response',async()=>{
 let arrived,reply;const hit=new Promise(r=>arrived=r),f=await persistentFixture((req,res)=>{reply=()=>res.end('FICTIONAL-LATE');arrived();});try{const t=f.trial('create'),o=await f.forward(t),pending=f.send(o);await hit;o.cancel();reply();const r=await pending;assert.equal(r.status,502);assert.ok(!(await r.text()).includes('FICTIONAL-LATE'));assert.equal(t.view().phase,'cancelled');assert.equal(o.view().journal.phase,'cancelled');assert.equal(f.posts(),1);}finally{await f.close();}
});
test('unbranded allowance is rejected before relay lock or journal mutation',async()=>{
 const f=await persistentFixture();try{await assert.rejects(openLocalForwardOwner({target:f.target,stateDirectory:f.relay,fictionalTrial:{reserve(){throw Error('must_not_call');}}}));assert.deepEqual(fs.readdirSync(f.relay),[]);}finally{await f.close();}
});
