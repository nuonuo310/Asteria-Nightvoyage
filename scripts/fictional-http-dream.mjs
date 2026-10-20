// Independent loopback fixture only. No Codex process, account, provider or API.
import http from 'node:http';
import net from 'node:net';
import {createHash} from 'node:crypto';
import {hash} from '../src/contract.js';
import {ModelPortNightvoyage} from './dream-model-runtime.mjs';
import {FakeAdapter,selectAdapter,jsonFields} from './dream-model-port.mjs';

export const fictionalHttpDreamVersion='independent-fictional-http-dream-v1';
const events=['A blue paper boat rests in an empty cup.','The cup becomes transparent; the blue paper boat remains.'];
const fail=code=>{throw Error(code);};
const wireHash=body=>createHash('sha256').update(body).digest('hex');
const limitOf=r=>Number(/^fictional-http-dream-cap-([1-6])$/.exec(r.modelSelection.model_id)?.[1]);
const binding=(r,a)=>({run_id:r.id,stage_request_id:a.request_id,stage:a.stage,index:a.index,
 selection_hash:hash(r.modelSelection),snapshot_hash:hash(r.snapshot),checkpoint_hash:hash(r.scenes.slice(0,a.index))});

function checkAccounting(r){
 const cap=limitOf(r);if(!cap)fail('foreign_execution_owner');let count=0;
 for(const a of r.attempts){
  const account=a.fictional_http;
  if(!account){if(a.state==='committed')fail('ambiguous_attempt');continue;}
  jsonFields(account,['version','binding','requests']);
  if(account.version!==fictionalHttpDreamVersion||!Array.isArray(account.requests)||account.requests.length>2)fail('ambiguous_attempt');
  jsonFields(account.binding,['run_id','stage_request_id','stage','index','selection_hash','snapshot_hash','checkpoint_hash']);
  const b=account.binding;
  if(b.run_id!==r.id||b.stage_request_id!==a.request_id||b.stage!==a.stage||b.index!==a.index||b.selection_hash!==hash(r.modelSelection))fail('ambiguous_attempt');
  for(const key of ['selection_hash','snapshot_hash','checkpoint_hash'])if(!/^[a-f0-9]{64}$/.test(b[key]))fail('ambiguous_attempt');
  // Withdrawal deliberately removes snapshot/scenes; its body-free accounting survives.
  if(r.snapshot&&hash(b)!==hash(binding(r,a)))fail('ambiguous_attempt');
  for(const [i,row] of account.requests.entries()){
   jsonFields(row,['ordinal','part','state','request_hash']);count++;
   if(row.ordinal!==count||row.part!==i+1||!['pending','http_completed'].includes(row.state)||row.request_hash!==wireHash(JSON.stringify({binding:b,part:row.part})))fail('ambiguous_attempt');
   if(row.state==='pending'&&(i!==account.requests.length-1||a!==r.attempts.at(-1)||a.state==='committed'))fail('ambiguous_attempt');
  }
  if(a.state==='committed'&&(account.requests.length!==2||account.requests.some(row=>row.state!=='http_completed')))fail('ambiguous_attempt');
 }
 if(count>cap)fail('ambiguous_attempt');return count;
}

// Uses a literal loopback socket and its own agent; inherited proxy/fetch agents are unused.
function post(port,body,signal){
 return new Promise((resolve,reject)=>{
  if(signal.aborted){reject(Error('cancelled'));return;}
  const agent=new http.Agent();agent.createConnection=()=>net.createConnection({host:'127.0.0.1',port});
  const req=http.request({host:'127.0.0.1',port,path:'/fictional-stage',method:'POST',agent,signal,
   headers:{'content-type':'application/json','content-length':Buffer.byteLength(body)}},res=>{
    let bytes=0;const chunks=[];
    res.on('data',chunk=>{bytes+=chunk.length;if(bytes>8192)req.destroy(Error('invalid_model_response'));else chunks.push(chunk);});
    res.on('error',reject);res.on('end',()=>{
     try{if(res.statusCode!==200||res.headers['content-type']!=='application/json')fail('invalid_model_response');resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));}catch{reject(Error('invalid_model_response'));}
    });
   });
  req.setTimeout(2000,()=>req.destroy(Error('timeout')));
  req.on('error',error=>reject(Error(signal.aborted?'cancelled':error.message==='timeout'?'timeout':'invalid_model_response')));
  req.on('close',()=>agent.destroy());req.end(body);
 });
}

class FictionalHttpDream extends ModelPortNightvoyage {
 constructor(directory,{maxLocalHttpCalls,fault,peer}){
  let owner;
  const adapter=new FakeAdapter({model_id:`fictional-http-dream-cap-${maxLocalHttpCalls}`,
   reply:(request,context)=>owner.exchange(request,context.signal)});
  super(directory,{selection:selectAdapter({primary:adapter}),fault});owner=this;this.peer=peer;
 }
 assertExecutionOwner(r){super.assertExecutionOwner(r);checkAccounting(r);}
 status(id){
  const receipt=super.status(id),r=this.run(id),calls=checkAccounting(r);
  return {...receipt,local_http_accounting:{version:fictionalHttpDreamVersion,limit:limitOf(r),calls,
   stages:r.attempts.map(a=>({request_id:a.request_id,stage:a.stage,index:a.index,checkpoint_committed:a.state==='committed',
    requests:structuredClone(a.fictional_http?.requests??[])})),
   realModelRequests:0,credentialReads:0,nativeChildrenStarted:0,realProviderAccountingIntegrated:false,
   remoteCancellationConfirmed:'unknown',powerLossDurabilityVerified:false,productionAdmission:false}};
 }
 async stage(r,stage,signal){
  this.assertExecutionOwner(r);
  // Reserve enough room for this fixed two-POST fixture before opening a new stage.
  if(checkAccounting(r)+2>limitOf(r))fail('budget_exhausted');
  return super.stage(r,stage,signal);
 }
 async exchange(request,signal){
  const r=this.run(request.run_id),a=r.attempts.at(-1);
  const active=()=>{this.store.assert();this.assertExecutionOwner(r);if(signal.aborted||r.status!=='running')fail('cancelled');};
  active();if(a.request_id!==request.request_id||a.state!=='dispatched'||a.fictional_http)fail('ambiguous_attempt');
  a.fictional_http={version:fictionalHttpDreamVersion,binding:binding(r,a),requests:[]};
  let reply;
  for(let part=1;part<=2;part++){
   active();const count=checkAccounting(r);if(count>=limitOf(r))fail('budget_exhausted');
   const body=JSON.stringify({binding:a.fictional_http.binding,part});
   const row={ordinal:count+1,part,state:'pending',request_hash:wireHash(body)};
   a.fictional_http.requests.push(row);
   this.store.save();this.fault('fictional_http_reserved');active();
   reply=await post(this.peer.port,body,signal);active();
   row.state='http_completed';this.store.save();this.fault('fictional_http_completed');
   if(part===1){jsonFields(reply,['continue']);if(reply.continue!==true)fail('invalid_model_response');}
  }
  jsonFields(reply,['value']);return {value:reply.value,usage:'unknown'};
 }
 close(){super.close();this.peer?.close();}
}

export async function openFictionalHttpDream(directory,options={}){
 if(!options||Object.getPrototypeOf(options)!==Object.prototype||Reflect.ownKeys(options).some(k=>!['maxLocalHttpCalls','fault','scenario'].includes(k)||!Object.hasOwn(Object.getOwnPropertyDescriptor(options,k),'value')))fail('invalid_fictional_http_options');
 const {maxLocalHttpCalls=6,fault=()=>{},scenario='success'}=options;
 if(!Number.isSafeInteger(maxLocalHttpCalls)||maxLocalHttpCalls<1||maxLocalHttpCalls>6||typeof fault!=='function'||!['success','invalid_second_scene','late_second_scene'].includes(scenario))fail('invalid_fictional_http_options');
 // The peer has fixed independent material and cannot be replaced with a remote URL.
 const timers=new Set(),observations=[];
 const server=http.createServer((req,res)=>{
  let bytes=0;const chunks=[];req.on('error',()=>{});
  req.on('data',chunk=>{bytes+=chunk.length;if(bytes>8192)req.destroy();else chunks.push(chunk);});
  req.on('end',()=>{
   try{
    if(req.method!=='POST'||req.url!=='/fictional-stage')fail('invalid_model_response');
    const wire=JSON.parse(Buffer.concat(chunks).toString('utf8'));jsonFields(wire,['binding','part']);
    const {stage,index}=wire.binding;if(!['scene','wake'].includes(stage)||!Number.isInteger(index)||index<0||index>2||![1,2].includes(wire.part))fail('invalid_model_response');
    observations.push({stage,index,part:wire.part});
    const value=stage==='scene'?{event:events[index],appraisal:{goalEffect:0,control:.5,uncertainty:.5},basis:{goal:null,control:null,uncertainty:null},affect:{kind:'unchanged'}}:{fragment:events[1],residue:.1,associations:[]};
    const answer=wire.part===1?{continue:true}:{value:scenario==='invalid_second_scene'&&index===1?{}:value};
    const send=()=>{res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify(answer));};
    if(scenario==='late_second_scene'&&index===1&&wire.part===2){const timer=setTimeout(()=>{timers.delete(timer);send();},100);timers.add(timer);}else send();
   }catch{res.writeHead(400);res.end();}
  });
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const peer={port:server.address().port,close(){for(const timer of timers)clearTimeout(timer);server.closeAllConnections();server.close();}};
 try{const engine=new FictionalHttpDream(directory,{maxLocalHttpCalls,fault,peer});
  Object.defineProperty(engine,'fixtureObservations',{value:()=>structuredClone(observations)});return engine;
 }catch(error){peer.close();throw error;}
}
