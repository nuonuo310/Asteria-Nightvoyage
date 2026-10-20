// Two owned loopback servers and independent fictional bodies only; no Codex or account.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {openLocalForwardOwner} from '../scripts/codex-local-forward-owner.mjs';
export async function rehearseLocalForward(){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-forward-rehearsal-'));let owner,server,posts=0,checks=0,result;
 const body=JSON.stringify({model:'gpt-5.6-sol',input:[],tools:[{type:'custom',name:'exec',format:{type:'grammar',syntax:'lark',definition:'start: /.+/'}},{type:'function',name:'wait',parameters:{type:'object'}}]});
 try{
  server=http.createServer((req,res)=>{posts++;const s=JSON.parse(fs.readFileSync(path.join(directory,'forward-journal.json'),'utf8'));
   if(s.calls===posts&&s.phase===(posts===1?'first_in_flight':'second_in_flight'))checks++;
   req.resume();res.writeHead(200,{'Content-Type':'application/json'});res.end('{"fictional":true}');});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const config={target:`http://127.0.0.1:${server.address().port}/v1/responses`,stateDirectory:directory};owner=await openLocalForwardOwner(config);
  for(let i=0;i<2;i++){const r=await fetch(owner.endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body});assert.equal(r.status,200);await r.text();}
  assert.equal(checks,2);assert.equal(posts,2);await owner.close();owner=await openLocalForwardOwner(config);
  const denied=await fetch(owner.endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body});assert.equal(denied.status,409);await denied.text();assert.equal(posts,2);
  result={contractVersion:'codex-loopback-pre-forward-rehearsal-v1',status:'passed',loopbackUpstreamPosts:posts,intentsPresentBeforeUpstreamArrival:checks,
   completedReopenBlocksThirdForward:true,bodyPersisted:false,nativeChildrenStarted:0,appServerIntegrated:false,
   realModelRequests:0,credentialReads:0,realProviderAccountingIntegrated:false,powerLossDurabilityVerified:false,
   remoteCancellationConfirmed:'unknown',dispatchEnabled:false,productionAdmission:false,userStoreAccessed:false};
 }finally{if(owner)await owner.close();if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}fs.rmSync(directory,{recursive:true,force:true});}
 return {...result,temporaryCleanupComplete:!fs.existsSync(directory)};
}
