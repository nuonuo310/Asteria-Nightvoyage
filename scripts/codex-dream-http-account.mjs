// Same-Store accounting for independent fixture app-server stages only; no user grant.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {Store} from '../src/store.js';
import {hash} from '../src/contract.js';
import {jsonFields} from './dream-model-port.mjs';
export const codexDreamHttpVersion='codex-fictional-stage-http-account-v1';
export const accountedStageProtocols=Object.freeze(['codex-peer-accounted-stage-v1','codex-native-accounted-stage-v1']);
const issued=new WeakSet(),digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=()=>{throw Error('ambiguous_attempt');};
export const isCodexDreamHttpAccount=value=>issued.has(value);
const binding=(r,a)=>({run_id:r.id,request_id:a.request_id,stage:a.stage,index:a.index,selection_hash:hash(r.modelSelection),snapshot_hash:hash(r.snapshot),checkpoint_hash:hash(r.scenes.slice(0,a.index))});
export function checkCodexDreamHttp(r){
 const s=r.modelSelection;
 if(s?.adapter_kind!=='CodexAdapter'||s.provider_kind!=='openai_protocol_simulator'||s.auth_mode!=='synthetic_stub'||s.model_id!=='gpt-5.6-sol'||!accountedStageProtocols.includes(s.protocol_version))fail();
 if(!Array.isArray(r.attempts)||r.attempts.length>3)fail();let calls=0;
 for(const [index,a] of r.attempts.entries()){
  const stage=index===2?'wake':'scene';
  if(a.index!==index||a.stage!==stage||a.request_id!==`stage-${r.id}-${stage}-${index}`||!['dispatched','committed'].includes(a.state)||index<r.attempts.length-1&&a.state!=='committed')fail();
  const account=a.codex_fixture_http;
  if(!account){if(a.state==='committed')fail();continue;}
  jsonFields(account,['version','binding','requests']);
  if(account.version!==codexDreamHttpVersion||!Array.isArray(account.requests)||account.requests.length>1)fail();
  jsonFields(account.binding,['run_id','request_id','stage','index','selection_hash','snapshot_hash','checkpoint_hash']);
  const b=account.binding;
  if(b.run_id!==r.id||b.request_id!==a.request_id||b.stage!==a.stage||b.index!==a.index||b.selection_hash!==hash(s))fail();
  if(!['selection_hash','snapshot_hash','checkpoint_hash'].every(k=>/^[a-f0-9]{64}$/.test(b[k])))fail();
  if(r.snapshot&&hash(b)!==hash(binding(r,a)))fail();
  for(const row of account.requests){
   jsonFields(row,['ordinal','request_hash','state']);calls++;
   if(row.ordinal!==calls||!/^[a-f0-9]{64}$/.test(row.request_hash)||!['pending','http_completed'].includes(row.state))fail();
   if(row.state==='pending'&&(a!==r.attempts.at(-1)||a.state==='committed'))fail();
  }
  if(a.state==='committed'&&(account.requests.length!==1||account.requests[0].state!=='http_completed'))fail();
 }
 if(calls>3)fail();return calls;
}

export function createCodexDreamHttpAccount(store,run,stage){
 if(!(store instanceof Store)||store.state.runs[run?.id]!==run||!['scene','wake'].includes(stage))fail();
 checkCodexDreamHttp(run);const index=run.scenes.length,requestId=`stage-${run.id}-${stage}-${index}`;
 let activated=false,closed=false,arrivals=0;const tokens=new WeakMap();
 const active=()=>{store.assert();checkCodexDreamHttp(run);if(closed||run.status!=='running'||store.state.runs[run.id]!==run||run.snapshot?.sources.some(s=>store.withdrawn.includes(s.id)))throw Error('cancelled');};
 const attempt=()=>{const a=run.attempts.at(-1);if(!a||a.request_id!==requestId||a.stage!==stage||a.index!==index||a.state!=='dispatched')fail();return a;};
 const view=()=>({version:codexDreamHttpVersion,stage,index,request_id:requestId,activated,closed,
  calls:run.attempts.find(a=>a.request_id===requestId)?.codex_fixture_http?.requests.length??0,arrivalsChecked:arrivals,
  completed:run.attempts.find(a=>a.request_id===requestId)?.codex_fixture_http?.requests.filter(row=>row.state==='http_completed').length??0,
  bodyRetained:false,realModelRequests:0,realProviderAccountingIntegrated:false,powerLossDurabilityVerified:false,productionAdmission:false});
 const account=Object.freeze({
  activate(){active();if(activated)fail();const a=attempt();if(a.codex_fixture_http)fail();a.codex_fixture_http={version:codexDreamHttpVersion,binding:binding(run,a),requests:[]};store.save();activated=true;},
  reserve(bytes){
   active();if(!activated||!(bytes instanceof Uint8Array)||bytes.byteLength>262144)fail();const a=attempt(),count=checkCodexDreamHttp(run);
   if(a.codex_fixture_http.requests.length||count>=3)throw Error('budget_exhausted');
   const row={ordinal:count+1,request_hash:digest(bytes),state:'pending'};a.codex_fixture_http.requests.push(row);store.save();
   const token=Object.freeze({});tokens.set(token,row);return token;
  },
  complete(token){active();const row=tokens.get(token);if(!row||row.state!=='pending'||attempt().codex_fixture_http.requests[0]!==row)fail();row.state='http_completed';store.save();tokens.delete(token);},
  observeArrival(bytes){
   active();const a=attempt(),row=a.codex_fixture_http?.requests[0];
   if(!row||row.state!=='pending'||row.request_hash!==digest(bytes)||arrivals)fail();
   // Independently read the durable row before the upstream fixture supplies a reply.
   const saved=JSON.parse(fs.readFileSync(path.join(store.directory,'state.json'),'utf8')).runs[run.id];
   const prior=saved?.attempts?.at(-1);
   if(saved?.status!=='running'||prior?.state!=='dispatched'||prior.request_id!==requestId||hash(prior.codex_fixture_http)!==hash(a.codex_fixture_http))fail();
   arrivals++;
  },
  view,cancel(){closed=true;},close(){closed=true;}
 });issued.add(account);return account;
}
