// Independent invented metadata and a loopback-only transport, never Codex or OAuth.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {LocalDispatchJournal} from '../scripts/codex-local-dispatch-journal.mjs';
import {reviewCodeModeGuardConfig,reviewCodeModeGuardWarning} from '../scripts/codex-code-mode-guard-review.mjs';
export function fictionalGuardConfig(){return JSON.stringify({id:2,result:{config:{
 features:{shell_tool:false,apps:false,multi_agent:false,hooks:false,memories:false,goals:false,code_mode:{enabled:false},code_mode_host:false},
 code_mode:{disable_in_process_fallback:false},apps:{_default:{enabled:false}},mcp_servers:{},web_search:'disabled',approval_policy:'never',sandbox_mode:'read-only'
}}});}
export function fictionalGuardWarning(){return JSON.stringify({method:'warning',params:{threadId:'fictional-guard-thread-1',message:'Code Mode is unavailable because code-mode host is disabled. Code mode will fail closed; enable `features.code_mode_host` and install `codex-code-mode-host`.'}});}
export async function rehearseCodeModeGuard(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-guard-journal-')),file=path.join(root,'journal.json');
 const persist=text=>{fs.writeFileSync(file+'.next',text,{mode:0o600});fs.renameSync(file+'.next',file);};
 let server,posts=0,preDispatchChecks=0;
 try{
  persist(LocalDispatchJournal.initialSnapshot());
  const config=reviewCodeModeGuardConfig(fictionalGuardConfig());
  const warning=reviewCodeModeGuardWarning(fictionalGuardConfig(),fictionalGuardWarning(),'fictional-guard-thread-1');
  assert.equal(config.candidateConfigurationMatched,true);assert.equal(warning.fixtureContinuationAllowed,true);
  let journal=new LocalDispatchJournal(fs.readFileSync(file,'utf8'),persist);
  server=http.createServer((req,res)=>{
   posts++;
   const snapshot=JSON.parse(fs.readFileSync(file,'utf8'));
   if(req.method!=='POST'||req.url!=='/fictional-dispatch'||req.headers.authorization||snapshot.calls!==posts||snapshot.phase!==(posts===1?'first_in_flight':'second_in_flight')){res.writeHead(400);res.end();return;}
   preDispatchChecks++;req.resume();res.writeHead(204);res.end();
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const url=`http://127.0.0.1:${server.address().port}/fictional-dispatch`;
  for(let i=0;i<2;i++){
   journal.reserve();
   const r=await fetch(url,{method:'POST',redirect:'error',signal:AbortSignal.timeout(3000)});
   assert.equal(r.status,204);await r.body?.cancel();journal.complete();
   journal=new LocalDispatchJournal(fs.readFileSync(file,'utf8'),persist);
  }
  assert.throws(()=>journal.reserve(),/dispatch_not_permitted/);
  assert.equal(posts,2);assert.equal(preDispatchChecks,2);
  persist(LocalDispatchJournal.initialSnapshot());journal=new LocalDispatchJournal(fs.readFileSync(file,'utf8'),persist);journal.reserve();
  const reopened=new LocalDispatchJournal(fs.readFileSync(file,'utf8'),persist);
  assert.throws(()=>reopened.reserve());assert.throws(()=>reopened.complete());
  return {contractVersion:'offline-code-mode-guard-rehearsal-v1',status:'passed',fixtureConfigurationMatched:true,
   scriptedWarningMatched:true,localPosts:posts,intentsSavedBeforeEachLocalPost:preDispatchChecks,
   completedReopenBlocksThirdDispatch:true,ambiguousReopenBlocksDispatchAndCompletion:true,
   nativeChildrenStarted:0,realModelRequests:0,credentialReads:0,userStoreAccessed:false,
   scriptedToolCallsSupplied:0,nativeHandlerDenialVerified:false,nativeConfigurationVerified:false,
   realProviderAccountingIntegrated:false,powerLossDurabilityVerified:false,
   dispatchEnabled:false,productionAdmission:false,qualityAssessed:false};
 }finally{if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}fs.rmSync(root,{recursive:true,force:true});}
}
