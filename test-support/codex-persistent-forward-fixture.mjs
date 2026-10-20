// Independent fictional peer. No native child, account, user store or provider request.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {openFictionalTrialStore} from '../scripts/codex-fictional-trial-store.mjs';
import {openLocalForwardOwner} from '../scripts/codex-local-forward-owner.mjs';
export const fictionalBinding=()=>({approval_id:'independent-approval',run_id:'independent-run',adapter_kind:'CodexAdapter',model_id:'gpt-5.6-sol',protocol_version:'independent-local-http-v1',source_hash:'a'.repeat(64),fixture_hash:'b'.repeat(64),expires_at:Date.now()+60000,max_calls:2,confirmation_origin:'independent_fictional_fixture'});
export const fictionalBody=()=>JSON.stringify({model:'gpt-5.6-sol',input:[],tools:[{type:'custom',name:'exec',format:{type:'grammar',syntax:'lark',definition:'start: /.+/'}},{type:'function',name:'wait',parameters:{type:'object'}}]});
export async function persistentFixture(handler){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-persistent-forward-')),allowance=path.join(root,'allowance'),relay=path.join(root,'relay');fs.mkdirSync(allowance);fs.mkdirSync(relay);
 const identity=fictionalBinding(),file=path.join(allowance,'fictional-trial.json');let posts=0,checks=0;
 const server=http.createServer((req,res)=>{posts++;const t=JSON.parse(fs.readFileSync(file)),r=JSON.parse(fs.readFileSync(path.join(relay,'forward-journal.json')));assert.equal(t.phase,'pending');assert.equal(t.attempts.length,posts);assert.equal(t.attempts.at(-1).state,'pending');assert.equal(r.calls,posts);assert.equal(r.phase,posts===1?'first_in_flight':'second_in_flight');checks++;req.resume();if(handler)handler(req,res,posts);else res.end('independent fictional HTTP reply');});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const target=`http://127.0.0.1:${server.address().port}/v1/responses`,trials=[],owners=[];
 return {root,allowance,relay,file,identity,target,posts:()=>posts,checks:()=>checks,
  trial(mode='open',extra={}){const t=openFictionalTrialStore({directory:allowance,identity,mode,now:Date.now(),...extra});trials.push(t);return t;},
  async forward(trial,extra={}){const o=await openLocalForwardOwner({target,stateDirectory:relay,fictionalTrial:trial,...extra});owners.push(o);return o;},
  send:o=>fetch(o.endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:fictionalBody()}),
  async close(){for(const o of owners)await o.close();for(const t of trials)t.close();server.closeAllConnections();await new Promise(r=>server.close(r));fs.rmSync(root,{recursive:true,force:true});}
 };
}
export async function checkPersistentForward(){
 const f=await persistentFixture();try{let trial=f.trial('create'),owner=await f.forward(trial);
  for(let n=1;n<=2;n++){const reply=await f.send(owner);assert.equal(reply.status,200);await reply.text();await owner.close();trial.close();trial=f.trial();owner=await f.forward(trial);}
  assert.equal((await f.send(owner)).status,409);assert.equal(f.posts(),2);assert.equal(trial.view().phase,'completed');
  return {status:'completed',contractVersion:trial.view().version,confirmationOrigin:'independent_fictional_fixture',fixturePosts:f.posts(),dualIntentsCheckedBeforeArrival:f.checks(),reopened:true,additionalPostsAfterCap:0,bodyRetained:false,nativeAppServerIntegrated:false,realProviderAccountingIntegrated:false,realModelRequests:0,credentialReads:0,userStoreAccessed:false,realUserApprovalRecorded:false,powerLossDurabilityVerified:false,dispatchEnabled:false,productionAdmission:false};
 }finally{await f.close();}
}
