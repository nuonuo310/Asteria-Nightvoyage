// Loopback-only candidate transport. No account, token, real provider or inference authority.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import net from 'node:net';
import {createHash} from 'node:crypto';
import {isFictionalTrialStore,isFictionalTrialRelayDirectory} from './codex-fictional-trial-store.mjs';
import {LocalDispatchJournal} from './codex-local-dispatch-journal.mjs';
import {reviewCodeModeToolIdentity} from './codex-code-mode-identity-review.mjs';
import {isCodexDreamHttpAccount} from './codex-dream-http-account.mjs';
export const localForwardVersion='codex-loopback-pre-forward-owner-v1';
function directLocalPost(target,bytes,signal,onConnection){
 const port=Number(new URL(target).port);
 return new Promise((resolve,reject)=>{
  const request=http.request({hostname:'127.0.0.1',port,path:'/v1/responses',method:'POST',
   createConnection:()=>{onConnection();return net.createConnection({host:'127.0.0.1',port});},signal,maxHeaderSize:8192,
   headers:{'Content-Type':'application/json','Content-Length':bytes.length}},response=>{
   let parts=[],length=0;
   response.on('error',reject);response.on('aborted',()=>reject(Error('local_response_aborted')));
   response.on('data',chunk=>{length+=chunk.length;if(length>262144){parts=[];request.destroy();reject(Error('local_response_limit'));}else parts.push(chunk);});
   response.on('end',()=>resolve({status:response.statusCode,type:response.headers['content-type'],bytes:Buffer.concat(parts)}));
  });
  request.on('error',reject);request.end(bytes);
 });
}
function settings(v){
 if(!v||Object.getPrototypeOf(v)!==Object.prototype||Reflect.ownKeys(v).some(k=>!['target','stateDirectory','timeoutMs','fictionalTrial','dreamStage'].includes(k)||!Object.hasOwn(Object.getOwnPropertyDescriptor(v,k),'value')))throw Error('forward_options_invalid');
 const {target,stateDirectory,timeoutMs=3000,fictionalTrial=null,dreamStage=null}=v;if(fictionalTrial!==null&&!isFictionalTrialStore(fictionalTrial)||dreamStage!==null&&(!isCodexDreamHttpAccount(dreamStage)||fictionalTrial!==null))throw Error('forward_trial_invalid');if(typeof target!=='string')throw Error('forward_target_invalid');let url;
 try{url=new URL(target);}catch{throw Error('forward_target_invalid');}
 if(typeof target!=='string'||url.protocol!=='http:'||url.hostname!=='127.0.0.1'||!url.port||url.username||url.password||url.search||url.hash||url.pathname!=='/v1/responses')throw Error('forward_target_invalid');
 if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>10000||typeof stateDirectory!=='string'||!path.isAbsolute(stateDirectory))throw Error('forward_options_invalid');
 let directory;try{
  if(fs.lstatSync(stateDirectory).isSymbolicLink())throw Error();directory=fs.realpathSync(stateDirectory);
  const temp=fs.realpathSync(os.tmpdir()),relative=path.relative(temp,directory);
  const underTemp=relative&&relative!=='..'&&!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative);
  if(!fs.statSync(directory).isDirectory()||!(underTemp||isFictionalTrialRelayDirectory(fictionalTrial,directory)))throw Error();
  for(let cursor=directory;;){if(fs.existsSync(path.join(cursor,'.git')))throw Error();const next=path.dirname(cursor);if(next===cursor)break;cursor=next;}
 }catch{throw Error('forward_directory_invalid');}
 return {target:url.href,directory,timeoutMs,fictionalTrial,dreamStage};
}
export async function openLocalForwardOwner(value){
 const {target,directory,timeoutMs,fictionalTrial,dreamStage}=settings(value),lock=path.join(directory,'forward-owner.lock'),file=path.join(directory,'forward-journal.json'),next=file+'.next';
 let fd;try{fd=fs.openSync(lock,'wx',0o600);}catch{throw Error('forward_owner_locked');}
 let journal,server,closed=false,failed=null,active=null,received=0,forwarded=0,rejected=0,connections=0;
 const persist=text=>{fs.writeFileSync(next,text,{flag:'wx',mode:0o600});fs.renameSync(next,file);};
 const release=()=>{if(fd!==undefined){fs.closeSync(fd);fd=undefined;fs.unlinkSync(lock);}};
 const fail=reason=>{failed??=reason;active?.abort();};
 const view=()=>({contractVersion:localForwardVersion,receivedLocalPosts:received,forwardedLocalRequests:forwarded,directSocketAttempts:connections,rejectedRequests:rejected,
  journal:journal?.view()??null,failed,closed,bodyRetained:false,credentialReads:0,realModelRequests:0,
  realProviderAccountingIntegrated:false,appServerIntegrated:false,fictionalTrialAccountingIntegrated:fictionalTrial!==null,fictionalTrial:fictionalTrial?.view()??null,powerLossDurabilityVerified:false,
  remoteCancellationConfirmed:'unknown',dispatchEnabled:false,productionAdmission:false,...(dreamStage?{dreamStageAccountingIntegrated:true,dreamStage:dreamStage.view()}: {})});
 try{
  for(const name of [file,next])if(fs.existsSync(name)&&(!fs.lstatSync(name).isFile()||fs.lstatSync(name).isSymbolicLink()))throw Error('forward_storage_invalid');
  if(fs.existsSync(next))throw Error('forward_storage_incomplete');
  if(!fs.existsSync(file))persist(LocalDispatchJournal.initialSnapshot());
  if(fs.statSync(file).size>1024)throw Error('forward_storage_invalid');
  journal=new LocalDispatchJournal(fs.readFileSync(file,'utf8'),persist);
  if(fictionalTrial){const t=fictionalTrial.view();if(t.closed||t.persistenceFailed||t.calls!==journal.view().calls)throw Error('forward_trial_mismatch');}
  server=http.createServer((req,res)=>{
   const deny=(status,reason)=>{rejected++;res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify({error:reason}));req.resume();};
   if(closed||failed){deny(503,'forward_closed');return;}
   if(req.method!=='POST'||req.url!=='/v1/responses'||req.headers.authorization||req.headers.cookie||req.headers['content-encoding']&&req.headers['content-encoding']!=='identity'||!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']??'')){deny(400,'forward_request_rejected');return;}
   received++;let chunks=[],size=0,ended=false;
   const timer=setTimeout(()=>{if(ended)return;ended=true;chunks=[];deny(408,'forward_read_timeout');req.destroy();},timeoutMs);
   req.on('error',()=>{chunks=[];clearTimeout(timer);});req.on('close',()=>clearTimeout(timer));
   req.on('data',chunk=>{if(ended)return;size+=chunk.length;if(size>262144){ended=true;chunks=[];clearTimeout(timer);deny(413,'forward_request_limit');req.destroy();}else chunks.push(chunk);});
   req.on('end',async()=>{
    if(ended)return;ended=true;clearTimeout(timer);let bytes;
    try{
     bytes=Buffer.concat(chunks);chunks=[];
     const witness=reviewCodeModeToolIdentity(bytes);
     const body=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
     if(dreamStage){if(!Array.isArray(body.tools)||body.tools.length!==0||witness.toolCount!==0||witness.unreviewedIdentities!==0)throw Error();}
     else if(witness.toolCount!==2||witness.unreviewedIdentities!==0||[...witness.publicCodes].sort().join(',')!=='public_exec_custom,shared_wait_function')throw Error();
     if(body.model!=='gpt-5.6-sol'||!Array.isArray(body.input)||body.input.length>512)throw Error();
    }catch{bytes=null;deny(400,'forward_body_rejected');return;}
    if(closed||failed||active){bytes=null;if(active)fail('concurrent_dispatch');deny(409,'forward_dispatch_blocked');return;}
    let trialRequestId,dreamToken;
    try{const ordinal=journal.reserve();if(fictionalTrial){trialRequestId=`fictional-forward-${ordinal}`;fictionalTrial.reserve({request_id:trialRequestId,request_hash:createHash('sha256').update(bytes).digest('hex')},Date.now());}if(dreamStage)dreamToken=dreamStage.reserve(bytes);}catch{bytes=null;fail('reservation_blocked');deny(409,'forward_dispatch_blocked');return;}
    const controller=new AbortController();active=controller;
    const timeout=setTimeout(()=>controller.abort(),timeoutMs);
    // No asynchronous boundary or caller hook between persisted reservation and dispatch.
    forwarded++;
    try{
     const response=await directLocalPost(target,bytes,controller.signal,()=>{connections++;});bytes=null;
     if(response.status>=300&&response.status<400||closed||failed||controller.signal.aborted)throw Error();
     // Completion means a bounded HTTP reply was read, not accepted inference or billing.
     journal.complete();
     if(fictionalTrial)fictionalTrial.complete(trialRequestId,Date.now());
     if(dreamStage)dreamStage.complete(dreamToken);
     const type=response.type,headers={};if(typeof type==='string'&&type.length<=128&&/^(application\/json|text\/event-stream)(?:\s*;|$)/i.test(type))headers['Content-Type']=type;
     res.writeHead(response.status,headers);res.end(response.bytes);
    }catch{fail('forward_or_settlement_failed');if(!res.headersSent)deny(502,'forward_failed');else res.destroy();}
    finally{bytes=null;clearTimeout(timeout);if(active===controller)active=null;}
   });
  });
  server.maxHeadersCount=32;server.headersTimeout=timeoutMs;server.requestTimeout=timeoutMs;
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const endpoint=`http://127.0.0.1:${server.address().port}/v1/responses`;
  return Object.freeze({endpoint,view,
   cancel(){if(closed)return;try{fictionalTrial?.cancel(Date.now());dreamStage?.cancel();journal.cancel();}catch{fail('cancellation_persistence_failed');throw Error('forward_cancel_failed');}fail('cancelled');},
   async close(){if(closed)return;closed=true;active?.abort();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));release();}
  });
 }catch{if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}release();throw Error('forward_open_failed');}
}
