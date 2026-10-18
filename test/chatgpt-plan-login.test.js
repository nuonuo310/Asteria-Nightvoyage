import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {generateKeyPairSync,sign} from 'node:crypto';
import {Store} from '../src/store.js';
import {PlanConnections} from '../scripts/chatgpt-plan-connections.mjs';
import {planLoopback,planHttpJson,checkPlanLogin,validatePlanDiscovery,loginDiagnostic} from '../scripts/chatgpt-plan-login.mjs';
import {planIssuer,planResource,planAuthorize,planToken,planJwks,planDiscovery} from '../scripts/chatgpt-plan-auth.mjs';
const hostId='urn:uuid:11111111-1111-4111-8111-111111111111',clientId='oaiapp_synthetic',nativeFetch=globalThis.fetch;
const discovery=()=>({issuer:planIssuer,authorization_endpoint:planAuthorize,token_endpoint:planToken,jwks_uri:planJwks,revocation_endpoint:`${planIssuer}/oauth/synthetic-revoke`});
const rsa=generateKeyPairSync('rsa',{modulusLength:2048});
function jwt(nonce){const seconds=Math.floor(Date.now()/1000),a=Buffer.from(JSON.stringify({alg:'RS256',kid:'synthetic'})).toString('base64url'),b=Buffer.from(JSON.stringify({iss:planIssuer,aud:clientId,sub:'synthetic-subject',nonce,iat:seconds,exp:seconds+3600})).toString('base64url');return a+'.'+b+'.'+sign('sha256',Buffer.from(a+'.'+b),rsa.privateKey).toString('base64url');}
const dir=t=>{const d=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-plan-login-test-'));t.after(()=>fs.rmSync(d,{recursive:true,force:true}));return path.join(d,'connection');};
async function callbackFor(start,{badState=false}={}){
  const r=await nativeFetch(start,{redirect:'manual'});assert.equal(r.status,302);const p=new URL(r.headers.get('Location')).searchParams;
  const callback=new URL(p.get('redirect_uri'));callback.search=new URLSearchParams({state:badState?'wrong':p.get('state'),code:'SYNTHETIC-CODE',client_id:clientId}).toString();
  return {p,callback};
}

test('connection persists stable host/issued client before verification, binds one identity, and stores no credential',t=>{
  const d=dir(t);let c=new PlanConnections(d),first=c.read();assert.equal(first.clientId,null);assert.equal(first.subject,null);c.retainIssuedClient(clientId);c.close();
  c=new PlanConnections(d);assert.equal(c.read().hostId,first.hostId);assert.equal(c.read().clientId,clientId);assert.equal(c.read().subject,null);c.bindIdentity(clientId,'synthetic-subject');
  const detached=c.read();detached.subject='changed';assert.equal(c.read().subject,'synthetic-subject');assert.throws(()=>c.bindIdentity(clientId,'other'),/mismatch/);assert.throws(()=>c.retainIssuedClient('oaiapp_other'),/mismatch/);assert.throws(()=>new PlanConnections(d),/store_busy/);c.close();
  const state=JSON.parse(fs.readFileSync(path.join(d,'state.json')));assert.deepEqual(Object.keys(state.planConnection),['version','hostId','clientId','subject']);assert.equal(state.planConnection.subject,'synthetic-subject');
  assert.ok(!JSON.stringify(state).includes('SYNTHETIC-ACCESS'));assert.ok(!JSON.stringify(state).includes('SYNTHETIC-REFRESH'));
});

test('connection refuses a dream store and releases owner lock, while persistence failure blocks use',t=>{
  const d=dir(t),store=new Store(d);store.state.entries.synthetic={origin:'dream',sourceRefs:[]};store.save();store.close();assert.throws(()=>new PlanConnections(d),/connection_store_required/);
  const reopened=new Store(d);reopened.close();
  const clean=dir(t),c=new PlanConnections(clean);fs.mkdirSync(path.join(clean,'snapshot.tmp'));assert.throws(()=>c.retainIssuedClient(clientId),/storage_io_failure/);assert.throws(()=>c.read(),/store_unavailable/);c.close();
});

test('loopback listens only on 127.0.0.1, consumes callback once, and never echoes callback secrets',async()=>{
  let responseText,callbackRead;
  const result=await planLoopback({hostId,onReady:start=>callbackRead=(async()=>{
    assert.equal(new URL(start).hostname,'127.0.0.1');const {p,callback}=await callbackFor(start);
    assert.equal(p.get('client_id'),'dynamic_agent_client');const r=await nativeFetch(callback);responseText=await r.text();assert.equal(r.status,200);assert.ok(!responseText.includes('SYNTHETIC-CODE'));
  })()});
  await callbackRead;
  assert.equal(result.clientId,clientId);assert.ok(result.form.includes('SYNTHETIC-CODE'));
});

test('loopback wrong state, wrong host, cancellation, timeout and opener failure stop without exchange',async()=>{
  await assert.rejects(planLoopback({hostId,onReady:async start=>{const {callback}=await callbackFor(start,{badState:true});await nativeFetch(callback);}}),/callback_rejected/);
  const controller=new AbortController();controller.abort();await assert.rejects(planLoopback({hostId,signal:controller.signal,onReady:()=>assert.fail('must not open')}),/cancelled/);
  await assert.rejects(planLoopback({hostId,timeoutMs:10,onReady:()=>{}}),/timeout/);
  await assert.rejects(planLoopback({hostId,onReady:()=>{throw Error('PRIVATE-OPENER');}}),/browser_open_failed/);
  const signal=new AbortController();await assert.rejects(planLoopback({hostId,signal:signal.signal,onReady:async start=>{const u=new URL(start);const http=await import('node:http');const response=await new Promise((resolve,reject)=>{const r=http.request({hostname:u.hostname,port:u.port,path:u.pathname+u.search,headers:{host:'evil.invalid'}},res=>{res.resume();resolve(res.statusCode);});r.once('error',reject);r.end();});assert.equal(response,400);signal.abort();}}),/cancelled/);
});

async function simulatedCheck(t,changes={}){
  const directory=dir(t),calls=[];let authNonce,seenClient;
  globalThis.fetch=async(url,options={})=>{
    const href=String(url);calls.push({href,method:options.method??'GET'});
    assert.equal(options.redirect,'error');assert.ok(options.signal instanceof AbortSignal);
    if(href===planDiscovery)return Response.json(discovery());
    if(href===planToken){const body=new URLSearchParams(options.body),saved=JSON.parse(fs.readFileSync(path.join(directory,'state.json')));seenClient=saved.planConnection.clientId;assert.equal(seenClient,body.get('client_id'));assert.equal(body.get('resource'),planResource);return Response.json({access_token:'SYNTHETIC-ACCESS',refresh_token:'SYNTHETIC-REFRESH',id_token:jwt(authNonce),token_type:'Bearer',expires_in:3600,scope:changes.denied?'openid':'openid resource.invoke chatgpt.tokens.use.direct'});}
    if(href===planJwks)return Response.json({keys:[{...rsa.publicKey.export({format:'jwk'}),kid:changes.badSignature?'other':'synthetic',alg:'RS256'}]});
    if(href===`${planResource}/models`){assert.equal(options.headers.Authorization,'Bearer SYNTHETIC-ACCESS');if(changes.modelsFail)return new Response('PRIVATE-PROVIDER-ERROR',{status:500});return Response.json({models:[{slug:'synthetic-plan-model',display_name:'Synthetic Model',visibility:'list'}]});}
    if(href===discovery().revocation_endpoint){const body=new URLSearchParams(options.body);assert.equal(body.get('token'),'SYNTHETIC-REFRESH');assert.equal(body.get('client_id'),clientId);return new Response(null,{status:changes.revocationFail?500:200});}
    assert.fail('unexpected network endpoint');
  };
  let result;
  try{result=await checkPlanLogin({directory,onReady:async start=>{const {p,callback}=await callbackFor(start);authNonce=p.get('nonce');await nativeFetch(callback);}});}finally{globalThis.fetch=nativeFetch;}
  const files=fs.readdirSync(directory).map(n=>fs.readFileSync(path.join(directory,n),'utf8')).join('\n');
  for(const secret of ['SYNTHETIC-ACCESS','SYNTHETIC-REFRESH','SYNTHETIC-CODE','PRIVATE-PROVIDER-ERROR']){assert.ok(!files.includes(secret));assert.ok(!JSON.stringify(result).includes(secret));}
  return {result,calls,directory,seenClient};
}

test('complete synthetic login checks model catalog and revokes transient session with no generation or token writes',async t=>{
  const {result,calls,directory,seenClient}=await simulatedCheck(t);assert.equal(result.status,'signed_in_models_checked');assert.equal(result.remoteRevocationConfirmed,true);assert.equal(result.generationEnabled,false);assert.equal(result.usageSettingsVerified,false);assert.equal(result.extraCreditsApproved,false);assert.equal(result.credentialsPersisted,false);assert.equal(result.realModelRequests,0);assert.equal(seenClient,clientId);
  assert.deepEqual(calls.map(c=>c.href),[planDiscovery,planToken,planJwks,`${planResource}/models`,discovery().revocation_endpoint]);
  const connection=new PlanConnections(directory);assert.equal(connection.read().subject,'synthetic-subject');connection.close();
});

test('missing scope and invalid signature suppress catalog, revoke issued session and expose only fixed errors',async t=>{
  for(const changes of [{denied:true},{badSignature:true}]){
    const {result,calls,directory}=await simulatedCheck(t,changes);assert.equal(result.status,'login_not_completed');assert.match(result.reason,/^plan_(permission_missing|identity_invalid)$/);assert.equal(result.remoteRevocationConfirmed,true);assert.ok(!calls.some(c=>c.href===`${planResource}/models`));
    const connection=new PlanConnections(directory);assert.equal(connection.read().subject,null);assert.equal(connection.read().clientId,clientId);connection.close();
  }
});

test('catalog failure cleans up and remote revocation failure remains explicitly unconfirmed',async t=>{
  const failure=await simulatedCheck(t,{modelsFail:true});assert.equal(failure.result.status,'login_not_completed');assert.equal(failure.result.reason,'plan_http_failed');assert.equal(failure.result.remoteRevocationConfirmed,true);
  const cleanup=await simulatedCheck(t,{revocationFail:true});assert.equal(cleanup.result.status,'signed_in_models_checked');assert.equal(cleanup.result.remoteRevocationConfirmed,false);assert.match(cleanup.result.cleanupNotice,/not confirmed/);
});

test('HTTP boundaries reject redirect targets, oversized or malformed bodies and pre-cancel before dispatch',async()=>{
  let calls=0;globalThis.fetch=async()=>{calls++;return new Response('PRIVATE-ERROR',{status:500});};
  try{
    await assert.rejects(planHttpJson('https://untrusted.invalid'),/http_failed/);assert.equal(calls,0);
    const c=new AbortController();c.abort();await assert.rejects(planHttpJson(planToken,{},c.signal),/cancelled/);assert.equal(calls,0);
    await assert.rejects(planHttpJson(planToken),e=>e.message==='plan_http_failed');
    globalThis.fetch=async()=>new Response('x'.repeat(131073));await assert.rejects(planHttpJson(planJwks),/oversized/);
    globalThis.fetch=async()=>new Response('PRIVATE-MALFORMED');await assert.rejects(planHttpJson(planJwks),e=>e.message==='plan_http_invalid');
  }finally{globalThis.fetch=nativeFetch;}
  assert.equal(loginDiagnostic(Error('PRIVATE-ERROR')),'plan_login_failed');
  for(const d of [{...discovery(),issuer:'other'},{...discovery(),revocation_endpoint:'https://evil.invalid/revoke'},{...discovery(),revocation_endpoint:`${planIssuer}/revoke?token=bad`},{...discovery(),jwks_uri:'https://evil.invalid/keys'}])assert.throws(()=>validatePlanDiscovery(d),/discovery_invalid/);
});

test('pre-cancelled login creates no connection directory and in-flight HTTP cancellation suppresses late bodies',async t=>{
  const directory=dir(t),c=new AbortController();c.abort();await assert.rejects(checkPlanLogin({directory,signal:c.signal,onReady:()=>assert.fail('opener')}),/cancelled/);assert.equal(fs.existsSync(directory),false);
  let dispatches=0,release;const pending=new Promise(resolve=>release=resolve),active=new AbortController();globalThis.fetch=()=>{dispatches++;return pending;};
  try{const request=planHttpJson(planJwks,{},active.signal);active.abort();await assert.rejects(request,/cancelled/);release(Response.json({private:'LATE-PRIVATE-BODY'}));await new Promise(resolve=>setImmediate(resolve));assert.equal(dispatches,1);}finally{globalThis.fetch=nativeFetch;}
});

test('issued-client persistence failure prevents token exchange and releases the connection owner',async t=>{
  const directory=dir(t),calls=[];globalThis.fetch=async url=>{calls.push(String(url));assert.equal(String(url),planDiscovery);return Response.json(discovery());};
  let result;
  try{result=await checkPlanLogin({directory,onReady:async start=>{const {callback}=await callbackFor(start);fs.mkdirSync(path.join(directory,'snapshot.tmp'));await nativeFetch(callback);}});}finally{globalThis.fetch=nativeFetch;}
  assert.equal(result.status,'login_not_completed');assert.deepEqual(calls,[planDiscovery]);assert.equal(result.remoteRevocationConfirmed,null);assert.equal(fs.existsSync(path.join(directory,'owner.lock')),false);
  fs.rmdirSync(path.join(directory,'snapshot.tmp'));const c=new PlanConnections(directory);assert.equal(c.read().clientId,null);c.close();
});

test('identity persistence failure still revokes transient tokens without reading a poisoned store',async t=>{
  const directory=dir(t);let authNonce,revoked=false;globalThis.fetch=async(url,options)=>{
    const href=String(url);if(href===planDiscovery)return Response.json(discovery());
    if(href===planToken)return Response.json({access_token:'SYNTHETIC-ACCESS',refresh_token:'SYNTHETIC-REFRESH',id_token:jwt(authNonce),token_type:'Bearer',expires_in:3600,scope:'openid resource.invoke chatgpt.tokens.use.direct'});
    if(href===planJwks){fs.mkdirSync(path.join(directory,'snapshot.tmp'));return Response.json({keys:[{...rsa.publicKey.export({format:'jwk'}),kid:'synthetic',alg:'RS256'}]});}
    if(href===discovery().revocation_endpoint){assert.equal(new URLSearchParams(options.body).get('token'),'SYNTHETIC-REFRESH');revoked=true;return new Response(null,{status:200});}
    assert.fail('catalog must not be requested');
  };
  let result;try{result=await checkPlanLogin({directory,onReady:async start=>{const {p,callback}=await callbackFor(start);authNonce=p.get('nonce');await nativeFetch(callback);}});}finally{globalThis.fetch=nativeFetch;}
  assert.equal(result.status,'login_not_completed');assert.equal(result.remoteRevocationConfirmed,true);assert.equal(revoked,true);assert.equal(fs.existsSync(path.join(directory,'owner.lock')),false);
  fs.rmdirSync(path.join(directory,'snapshot.tmp'));const c=new PlanConnections(directory);assert.equal(c.read().clientId,clientId);assert.equal(c.read().subject,null);c.close();assert.ok(!fs.readFileSync(path.join(directory,'state.json'),'utf8').includes('SYNTHETIC-REFRESH'));
});

test('CLI help and invalid flags never echo inherited API credentials',()=>{
  const script=fileURLToPath(new URL('../scripts/chatgpt-plan-login.mjs',import.meta.url));
  for(const args of [[],['help'],['login','--api-key','SYNTHETIC-SENTINEL'],['run','--live']]){
    const r=spawnSync(process.execPath,[script,...args],{encoding:'utf8',env:{...process.env,NIGHTVOYAGE_DEEPSEEK_KEY:'SYNTHETIC-SENTINEL',OPENAI_API_KEY:'SYNTHETIC-SENTINEL'}});assert.ok(!(r.stdout+r.stderr).includes('SYNTHETIC-SENTINEL'));assert.equal(r.status,args.length>1?1:0);
  }
});
