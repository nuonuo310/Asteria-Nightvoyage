// Persistent LOCAL FICTIONAL allowance candidate. Not user consent or a provider transport.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const owners=new WeakSet(),roots=new WeakMap();
// Boolean-only capability check; never exposes the retained directory in a receipt.
export const isFictionalTrialRelayDirectory=(owner,directory)=>typeof directory==='string'&&roots.has(owner)&&directory===path.join(roots.get(owner),'relay');
export const isFictionalTrialStore=value=>owners.has(value);
export const fictionalTrialVersion='codex-persistent-fictional-allowance-v1';
const id=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(v);
const sha=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const integer=v=>Number.isSafeInteger(v)&&v>=0;
function fields(v,names){
 if(!v||Object.getPrototypeOf(v)!==Object.prototype||Reflect.ownKeys(v).length!==names.length||names.some(k=>!Object.hasOwn(v,k))||Reflect.ownKeys(v).some(k=>!names.includes(k)||!Object.hasOwn(Object.getOwnPropertyDescriptor(v,k),'value')))throw Error('fictional_trial_contract');
}
function identity(v){
 fields(v,['approval_id','run_id','adapter_kind','model_id','protocol_version','source_hash','fixture_hash','expires_at','max_calls','confirmation_origin']);
 if(!id(v.approval_id)||!id(v.run_id)||v.adapter_kind!=='CodexAdapter'||v.model_id!=='gpt-5.6-sol'||!id(v.protocol_version)||!sha(v.source_hash)||!sha(v.fixture_hash)||!integer(v.expires_at)||v.max_calls!==2||v.confirmation_origin!=='independent_fictional_fixture')throw Error('fictional_trial_contract');
 return structuredClone(v);
}
const fingerprint=v=>createHash('sha256').update(JSON.stringify(Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])))).digest('hex');
function parse(text,expected){
 if(Buffer.byteLength(text)>8192)throw Error();
 const s=JSON.parse(text);fields(s,['version','identity','identity_hash','phase','last_clock','attempts']);
 const binding=identity(s.identity);
 if(s.version!==fictionalTrialVersion||s.identity_hash!==fingerprint(binding)||s.identity_hash!==fingerprint(expected)||!integer(s.last_clock)||!['ready','pending','completed','cancelled','expired'].includes(s.phase)||!Array.isArray(s.attempts)||s.attempts.length>2)throw Error();
 const seen=new Set();s.attempts.forEach((a,i)=>{fields(a,['request_id','request_hash','ordinal','state']);if(!id(a.request_id)||!sha(a.request_hash)||a.ordinal!==i+1||!['pending','http_completed'].includes(a.state)||seen.has(a.request_id)||i<s.attempts.length-1&&a.state!=='http_completed')throw Error();seen.add(a.request_id);});
 const pending=s.attempts.at(-1)?.state==='pending',full=s.attempts.length===2;
 if(s.phase==='expired'&&(pending||full)||s.phase==='pending'&&!pending||s.phase==='ready'&&(pending||full)||s.phase==='completed'&&(!full||pending))throw Error();
 return s;
}
function directory(value){
 if(typeof value!=='string'||!path.isAbsolute(value))throw Error('fictional_trial_directory');
 try{if(fs.lstatSync(value).isSymbolicLink()||!fs.statSync(value).isDirectory())throw Error();const real=fs.realpathSync(value);for(let p=real;;){if(fs.existsSync(path.join(p,'.git')))throw Error();const parent=path.dirname(p);if(parent===p)break;p=parent;}return real;}catch{throw Error('fictional_trial_directory');}
}
// Existing caller-owned directory is retained. Creation is explicit; open never initializes.
export function openFictionalTrialStore(options){
 fields(options,['directory','identity','mode','now']);
 const binding=identity(options.identity),root=directory(options.directory),{mode,now}=options;
 if(!['create','open'].includes(mode)||!integer(now))throw Error('fictional_trial_contract');
 const file=path.join(root,'fictional-trial.json'),next=file+'.next',lock=path.join(root,'fictional-trial.lock');
 let fd,state,closed=false,poisoned=false,active=null,observedClock=now;
 const release=()=>{if(fd!==undefined){fs.closeSync(fd);fd=undefined;fs.unlinkSync(lock);}};
 const persist=s=>{try{fs.writeFileSync(next,JSON.stringify(s),{flag:'wx',mode:0o600});fs.renameSync(next,file);state=s;}catch{poisoned=true;throw Error('fictional_trial_persistence');}};
 try{
  fd=fs.openSync(lock,'wx',0o600);
  if(fs.existsSync(next))throw Error();
  if(mode==='create'){
   try{fs.lstatSync(file);throw Error('existing');}catch(error){if(error.code!=='ENOENT')throw error;}
   if(now>=binding.expires_at)throw Error();
   persist({version:fictionalTrialVersion,identity:binding,identity_hash:fingerprint(binding),phase:'ready',last_clock:now,attempts:[]});
  }else{
   const stat=fs.lstatSync(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>8192)throw Error();
   state=parse(fs.readFileSync(file,'utf8'),binding);
   if(now<state.last_clock)throw Error();
   if(now>state.last_clock||now>=binding.expires_at&&state.phase==='ready')persist({...state,last_clock:now,phase:now>=binding.expires_at&&state.phase==='ready'?'expired':state.phase});
  }
 }catch{release();throw Error('fictional_trial_open_blocked');}
 const usable=()=>{if(closed||poisoned)throw Error('fictional_trial_closed');};
 const clock=t=>{if(!integer(t)||t<Math.max(state.last_clock,observedClock))throw Error('fictional_trial_clock');observedClock=t;};
 const owner=Object.freeze({
  view(){return {...structuredClone(state),closed,persistenceFailed:poisoned,calls:state.attempts.length,ambiguousDispatch:state.attempts.some(a=>a.state==='pending'),realModelRequests:0,realProviderAccountingIntegrated:false,dispatchEnabled:false,productionAdmission:false,powerLossDurabilityVerified:false};},
  reserve(request,t){
   usable();fields(request,['request_id','request_hash']);clock(t);
   if(!id(request.request_id)||!sha(request.request_hash))throw Error('fictional_trial_contract');
   if(state.phase==='ready'&&t>=binding.expires_at){persist({...state,last_clock:t,phase:'expired'});throw Error('fictional_trial_reservation_blocked');}
   if(state.phase!=='ready'||state.attempts.some(a=>a.request_id===request.request_id))throw Error('fictional_trial_reservation_blocked');
   const attempt={...request,ordinal:state.attempts.length+1,state:'pending'};
   persist({...state,last_clock:t,phase:'pending',attempts:[...state.attempts,attempt]});active=attempt.request_id;return attempt.ordinal;
  },
  complete(requestId,t){
   usable();clock(t);
   // HTTP completion may settle after expiry, but only this live owner can acknowledge it.
   if(state.phase!=='pending'||active===null||requestId!==active)throw Error('fictional_trial_completion_blocked');
   const attempts=state.attempts.map(a=>a.request_id===active?{...a,state:'http_completed'}:a);
   persist({...state,last_clock:t,phase:attempts.length===2?'completed':t>=binding.expires_at?'expired':'ready',attempts});active=null;
  },
  cancel(t){usable();clock(t);if(['cancelled','completed','expired'].includes(state.phase))return;persist({...state,last_clock:t,phase:'cancelled'});active=null;},
  close(){if(closed)return;closed=true;active=null;release();}
 });
 owners.add(owner);roots.set(owner,root);return owner;
}
