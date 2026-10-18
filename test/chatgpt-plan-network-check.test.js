import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {checkPlanDiscoveryConnection} from '../scripts/chatgpt-plan-network-check.mjs';
import {checkPlanLogin,planHttpDiagnostic} from '../scripts/chatgpt-plan-login.mjs';
import {planDiscovery,planIssuer,planAuthorize,planToken,planJwks} from '../scripts/chatgpt-plan-auth.mjs';
const nativeFetch=globalThis.fetch;
const discovery=()=>({issuer:planIssuer,authorization_endpoint:planAuthorize,token_endpoint:planToken,jwks_uri:planJwks,revocation_endpoint:planIssuer+'/oauth/synthetic-revoke'});
test('public discovery check uses one fixed unauthenticated request, validates config and creates no account',async()=>{
 let calls=0;globalThis.fetch=async(url,options)=>{calls++;assert.equal(String(url),planDiscovery);assert.equal(options.headers,undefined);assert.equal(options.redirect,'error');return Response.json(discovery());};
 try{const result=await checkPlanDiscoveryConnection();assert.equal(result.status,'discovery_checked');assert.equal(result.loginAttempted,false);assert.equal(result.credentialsRead,false);assert.equal(result.realModelRequests,0);assert.equal(calls,1);}finally{globalThis.fetch=nativeFetch;}
});
test('HTTP status is bounded metadata; body, headers, URL and unknown exception text never escape',async()=>{
 globalThis.fetch=async()=>new Response('PRIVATE-PROVIDER-BODY',{status:403,headers:{'x-secret':'PRIVATE-HEADER'}});
 try{const result=await checkPlanDiscoveryConnection();assert.equal(result.reason,'plan_http_failed');assert.equal(result.failureStage,'discovery_http');assert.deepEqual(result.httpDiagnostic,{http_status:403,network_code:'unknown'});assert.ok(!JSON.stringify(result).includes('PRIVATE'));}finally{globalThis.fetch=nativeFetch;}
 assert.equal(planHttpDiagnostic(Object.assign(Error('FORGED'),{http_status:403})),null);
});
test('network causes use a fixed code whitelist and never expose raw error details',async()=>{
 try{for(const code of ['ENOTFOUND','ECONNRESET','UNABLE_TO_VERIFY_LEAF_SIGNATURE','PRIVATE-CAUSE']){
  globalThis.fetch=async()=>{throw Object.assign(Error('PRIVATE-ERROR-URL-OR-CREDENTIAL'),{cause:{code,message:'PRIVATE-CAUSE-TEXT'}});};
  const result=await checkPlanDiscoveryConnection();assert.equal(result.httpDiagnostic.network_code,code==='PRIVATE-CAUSE'?'unknown':code);assert.equal(result.httpDiagnostic.http_status,null);assert.ok(!JSON.stringify(result).includes('PRIVATE'));
 }}finally{globalThis.fetch=nativeFetch;}
});
test('malformed or changed discovery fails validation; pre-cancel dispatches nothing',async()=>{
 let calls=0;try{
  globalThis.fetch=async()=>{calls++;return Response.json({...discovery(),issuer:'https://untrusted.invalid'});};
  const result=await checkPlanDiscoveryConnection();assert.equal(result.failureStage,'discovery_validation');assert.equal(result.reason,'plan_discovery_invalid');assert.equal(result.httpDiagnostic.http_status,200);
  const signal=AbortSignal.abort();const cancelled=await checkPlanDiscoveryConnection({signal});assert.equal(cancelled.reason,'plan_cancelled');assert.equal(calls,1);
  globalThis.fetch=async()=>new Response('PRIVATE-INVALID-JSON');const malformed=await checkPlanDiscoveryConnection();assert.equal(malformed.reason,'plan_http_invalid');assert.equal(malformed.httpDiagnostic.http_status,200);assert.ok(!JSON.stringify(malformed).includes('PRIVATE'));
 }finally{globalThis.fetch=nativeFetch;}
});
test('login failure before browser reports discovery phase and null remote session without calling opener',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-network-login-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));let opened=0;
 globalThis.fetch=async()=>new Response('PRIVATE-BODY',{status:503});
 try{const r=await checkPlanLogin({directory:path.join(root,'connection'),onReady:()=>opened++});assert.equal(opened,0);assert.equal(r.failureStage,'discovery_http');assert.equal(r.httpDiagnostic.http_status,503);assert.equal(r.remoteRevocationConfirmed,null);assert.equal(r.realModelRequests,0);assert.ok(!JSON.stringify(r).includes('PRIVATE'));}finally{globalThis.fetch=nativeFetch;}
});
test('network CLI help/unknown flags never request credentials or print environment sentinels',()=>{
 const script=fileURLToPath(new URL('../scripts/chatgpt-plan-network-check.mjs',import.meta.url));
 for(const args of [['help'],['--live']]){const result=spawnSync(process.execPath,[script,...args],{encoding:'utf8',env:{...process.env,NIGHTVOYAGE_DEEPSEEK_KEY:'PRIVATE-ENV-SENTINEL'}});assert.equal(result.status,args[0]==='help'?0:1);assert.ok(!(result.stdout+result.stderr).includes('PRIVATE'));}
});
