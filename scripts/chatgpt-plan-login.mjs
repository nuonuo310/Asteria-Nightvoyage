// Explicit local login/model-catalog check only. No Responses POST or API-key fallback.
import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {PlanConnections} from './chatgpt-plan-connections.mjs';
import {PlanAuthorizationAttempt,validatePlanTokens,planModelChoices,planIssuer,planResource,planToken,planJwks,planDiscovery,authFail} from './chatgpt-plan-auth.mjs';
const knownErrors=new Set(['plan_absolute_connection_directory_required','plan_connection_store_required','plan_connection_invalid','plan_registration_mismatch','plan_invalid_registration','plan_invalid_callback','plan_callback_consumed','plan_callback_rejected','plan_login_denied','plan_identity_invalid','plan_permission_missing','plan_model_catalog_invalid','plan_cancelled','plan_login_timeout','plan_http_failed','plan_http_timeout','plan_http_oversized','plan_http_invalid','plan_discovery_invalid','plan_browser_open_failed','plan_loopback_failed','plan_login_busy']);
export const loginDiagnostic=error=>knownErrors.has(error?.message)?error.message:'plan_login_failed';
// Body-free metadata belongs only to errors created by this HTTP boundary.
const httpDiagnostics=new WeakMap();
// Opaque, memory-only capability. Only a checked OAuth session can mint one.
const activeSessions=new WeakMap();
export function planSessionAvailable(handle,model){
  const value=activeSessions.get(handle);
  return !!value&&Date.now()<value.expiresAt&&value.models.includes(model);
}
export function planSessionCredential(handle,model){
  if(!planSessionAvailable(handle,model))authFail('authorization_required');
  return activeSessions.get(handle).accessToken;
}
export function planSessionBinding(handle){
  const value=activeSessions.get(handle);if(!value||Date.now()>=value.expiresAt)authFail('authorization_required');
  return {clientId:value.clientId,subject:value.subject};
}
const networkCodes=new Set(['ENOTFOUND','EAI_AGAIN','ECONNREFUSED','ECONNRESET','ETIMEDOUT','UND_ERR_CONNECT_TIMEOUT','UND_ERR_SOCKET','CERT_HAS_EXPIRED','DEPTH_ZERO_SELF_SIGNED_CERT','UNABLE_TO_VERIFY_LEAF_SIGNATURE','ERR_TLS_CERT_ALTNAME_INVALID']);
export const planHttpDiagnostic=error=>httpDiagnostics.has(error)?{...httpDiagnostics.get(error)}:null;
// Auth token JSON and model list are bounded in time and bytes, with redirects disabled.
// No external response/error body is logged. Revocation is a separate bounded attempt.
export async function planHttpJson(url,options={},signal,purpose='standard'){
  if(signal?.aborted)authFail('plan_cancelled');
  let u;try{u=new URL(url);}catch{authFail('plan_http_failed');}
  if(![planDiscovery,planJwks,`${planResource}/models`,planToken].includes(u.href)&&!(purpose==='revoke'&&safeRevocationEndpoint(u.href)))authFail('plan_http_failed');
  // Only the fixed GET catalog needs a larger envelope for provider metadata.
  // Authentication/revocation keep their original cap; callers cannot supply a limit.
  const byteLimit=u.href===`${planResource}/models`&&(options.method??'GET')==='GET'&&purpose==='standard'?1048576:131072;
  const controller=new AbortController();let timer,onAbort,httpStatus=null;
  const abort=new Promise((_,reject)=>{
    onAbort=()=>{controller.abort();reject(Error('plan_cancelled'));};
    if(signal?.aborted)onAbort();else signal?.addEventListener('abort',onAbort,{once:true});
    timer=setTimeout(()=>{controller.abort();reject(Error('plan_http_timeout'));},20000);
  });
  // Fixed endpoints, except the same-issuer revocation URL from validated discovery.
  const operation=(async()=>{
    const response=await fetch(u,{...options,redirect:'error',signal:controller.signal});
    if(Number.isInteger(response.status)&&response.status>=100&&response.status<=599)httpStatus=response.status;
    if(response.status!==200){controller.abort();authFail('plan_http_failed');}
    if(purpose==='revoke'&&response.body===null)return null;
    const reader=response.body?.getReader();if(!reader)authFail('plan_http_invalid');let size=0;const chunks=[];
    try{
      for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>byteLimit){controller.abort();authFail('plan_http_oversized');}chunks.push(value);}
    }finally{reader.releaseLock();}
    if(!size&&options.method==='POST'&&u.href!==planToken)return null;
    try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));}catch{authFail('plan_http_invalid');}
  })();
  try{return await Promise.race([operation,abort]);}
  catch(error){
    const reason=['plan_cancelled','plan_http_timeout','plan_http_failed','plan_http_invalid','plan_http_oversized'].includes(error?.message)?error.message:'plan_http_failed';
    const code=error?.cause?.code??error?.code;const failure=Error(reason);
    httpDiagnostics.set(failure,{http_status:httpStatus,network_code:networkCodes.has(code)?code:'unknown'});throw failure;
  }
  finally{clearTimeout(timer);signal?.removeEventListener('abort',onAbort);controller.abort();}
}
export function validatePlanDiscovery(d){
  if(d?.issuer!==planIssuer||d.authorization_endpoint!==`${planIssuer}/api/accounts/authorize`||d.token_endpoint!==planToken||d.jwks_uri!==planJwks||!safeRevocationEndpoint(d.revocation_endpoint))authFail('plan_discovery_invalid');
  return {revocationEndpoint:d.revocation_endpoint};
}
function safeRevocationEndpoint(value){
  try{const u=new URL(value);return u.origin===planIssuer&&!u.username&&!u.password&&!u.search&&!u.hash&&u.pathname!=='/';}catch{return false;}
}
export async function planLoopback({hostId,clientId=null,signal,onReady,timeoutMs=300000}){
  if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>300000||typeof onReady!=='function')authFail('plan_loopback_failed');
  let server,timer,onAbort,settled=false,attempt,origin;
  try{
    return await new Promise((resolve,reject)=>{
      const end=(error,value)=>{if(settled)return;settled=true;error?reject(error):resolve(value);};
      onAbort=()=>end(Error('plan_cancelled'));
      if(signal?.aborted){onAbort();return;}
      signal?.addEventListener('abort',onAbort,{once:true});
      server=http.createServer({maxHeaderSize:8192},(req,res)=>{
        res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Content-Security-Policy',"default-src 'none'; frame-ancestors 'none'");
        const reply=(status,text,done)=>{res.writeHead(status,{'Content-Type':'text/plain; charset=utf-8'});res.end(text,done);};
        if(settled||req.method!=='GET'||req.headers.host!==new URL(origin).host||(req.headers.origin&&req.headers.origin!==origin)||!req.url||req.url.length>16384){reply(400,'Login request rejected.');return;}
        let url;try{url=new URL(req.url,origin);}catch{reply(400,'Login request rejected.');return;}
        if(url.origin!==origin){reply(400,'Login request rejected.');return;}
        if(url.pathname==='/start'&&url.searchParams.get('launch')===launch){res.writeHead(302,{Location:attempt.authorizationUrl});res.end();return;}
        if(url.pathname!=='/auth/callback'){reply(404,'Not found.');return;}
        try{const value=attempt.consume(url.href);reply(200,'登录回调已收到。请回到夜航终端，等待身份与权限核对结果。',()=>end(null,value));}
        catch(error){reply(400,'登录未通过。请回到夜航终端查看固定错误编号。',()=>end(error));}
      });
      server.requestTimeout=10000;server.headersTimeout=10000;server.keepAliveTimeout=1;
      server.on('error',()=>end(Error('plan_loopback_failed')));
      const launch=randomBytes(32).toString('base64url');
      timer=setTimeout(()=>end(Error('plan_login_timeout')),timeoutMs);
      server.listen(0,'127.0.0.1',()=>{
        try{
          if(settled)return;origin=`http://127.0.0.1:${server.address().port}`;
          attempt=new PlanAuthorizationAttempt({hostId,clientId,redirectUri:`${origin}/auth/callback`});
          Promise.resolve().then(()=>onReady(`${origin}/start?launch=${launch}`)).catch(()=>end(Error('plan_browser_open_failed')));
        }catch{end(Error('plan_loopback_failed'));}
      });
    });
  }finally{
    clearTimeout(timer);signal?.removeEventListener('abort',onAbort);
    if(server){server.closeAllConnections();await new Promise(resolve=>server.close(()=>resolve()));}
  }
}
function openWindowsBrowser(url){
  if(process.platform!=='win32')return;
  const root=process.env.SystemRoot;if(!root||!path.isAbsolute(root))authFail('plan_browser_open_failed');
  const environment={};for(const k of ['SystemRoot','WINDIR','PATH','TEMP','TMP','USERPROFILE','LOCALAPPDATA','APPDATA'])if(process.env[k])environment[k]=process.env[k];
  return new Promise((resolve,reject)=>{
    const child=spawn(path.join(root,'System32','rundll32.exe'),['url.dll,FileProtocolHandler',url],{env:environment,shell:false,windowsHide:true,stdio:'ignore'});
    child.once('error',()=>reject(Error('plan_browser_open_failed')));child.once('exit',code=>code===0?resolve():reject(Error('plan_browser_open_failed')));
  });
}
async function checkedPlanAction({directory,signal,onReady},action){
  if(signal?.aborted)authFail('plan_cancelled');
  const connections=new PlanConnections(directory);let tokens=null,session=null,handle=null,revocation=null,remoteRevocationConfirmed=false,receipt=null,error=null,client=null,exchangeStarted=false,phase='discovery_http',failureHttp=null;
  try{
    const discovery=await planHttpJson(planDiscovery,{},signal);phase='discovery_validation';
    revocation=validatePlanDiscovery(discovery).revocationEndpoint;
    const saved=connections.read();
    phase='browser_callback';const callback=await planLoopback({hostId:saved.hostId,clientId:saved.clientId,signal,onReady});
    client=callback.clientId;
    // Retain issued ID before token exchange; failed exchange cannot create a new client silently.
    phase='registration_save';connections.retainIssuedClient(callback.clientId);
    if(signal?.aborted)authFail('plan_cancelled');exchangeStarted=true;
    phase='token_http';tokens=await planHttpJson(planToken,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:callback.form},signal);
    phase='jwks_http';const jwks=await planHttpJson(planJwks,{},signal);phase='identity_validation';
    session=validatePlanTokens(tokens,jwks,{clientId:callback.clientId,nonce:callback.nonce,subject:saved.subject});
    phase='identity_save';connections.bindIdentity(session.clientId,session.subject);
    if(signal?.aborted)authFail('plan_cancelled');
    phase='catalog_http';const catalog=await planHttpJson(`${planResource}/models`,{headers:{Authorization:`Bearer ${session.accessToken}`}},signal);
    phase='catalog_validation';const models=planModelChoices(catalog);
    if(signal?.aborted)authFail('plan_cancelled');
    receipt={status:'signed_in_models_checked',identityValidated:true,planScopeGranted:true,modelChoices:models,catalogIsInferenceEntitlementProof:false,generationEnabled:false,realModelRequests:0,apiKeyReads:0,credentialsPersisted:false,usageSettingsVerified:false,extraCreditsApproved:false};
    if(action){
      phase='authorized_action';handle=Object.freeze({});
      activeSessions.set(handle,{accessToken:session.accessToken,expiresAt:session.expiresAt,models:models.map(m=>m.model),clientId:session.clientId,subject:session.subject});
      // Trusted local entry only; the ordinary login command never supplies this action.
      const actionResult=await action(handle);
      receipt={status:'plan_action_finished',actionResult,credentialsPersisted:false};
    }
  }catch(e){receipt=null;error=loginDiagnostic(e);failureHttp=planHttpDiagnostic(e);}
  finally{
    if(handle)activeSessions.delete(handle);
    // Even failed identity/scope validation may have issued a refresh token: revoke it.
    const refresh=session?.refreshToken??tokens?.refresh_token;
    if(revocation&&typeof refresh==='string'&&refresh.length>0&&refresh.length<=32768&&client){
      try{await planHttpJson(revocation,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token:refresh,token_type_hint:'refresh_token',client_id:client}).toString()},undefined,'revoke');remoteRevocationConfirmed=true;}catch{}
    }
    session=null;tokens=null;connections.close();
  }
  return {...(receipt??(phase==='authorized_action'?{status:'plan_action_failed',reason:'plan_action_failed',externalCallsStarted:'unknown',credentialsPersisted:false}:{status:'login_not_completed',reason:error,failureStage:phase,httpDiagnostic:failureHttp,generationEnabled:false,realModelRequests:0,credentialsPersisted:false})),remoteRevocationConfirmed:exchangeStarted?remoteRevocationConfirmed:null,...(exchangeStarted&&!remoteRevocationConfirmed?{cleanupNotice:'Remote session revocation was not confirmed. Disconnect the app in ChatGPT Settings if authorization completed.'}:{})};
}
export const checkPlanLogin=options=>checkedPlanAction(options,null);
export function withCheckedPlanSession(options,action){
  if(typeof action!=='function')authFail('authorization_required');
  return checkedPlanAction(options,action);
}
export async function planLoginMain(args){
  if(args.length!==1||args[0]!=='login'){
    if(args.length&&!(args.length===1&&args[0]==='help'))authFail('plan_login_arguments_invalid');
    console.log('Usage: node scripts/chatgpt-plan-login.mjs login\nLocal browser sign-in and model catalog only. No dream generation, API key or extra-credit approval.');return;
  }
  const directory=process.platform==='win32'?path.join(process.env.LOCALAPPDATA??authFail('plan_absolute_connection_directory_required'),'Nightvoyage','chatgpt-plan-connection'):path.join(os.homedir(),'.local','share','Nightvoyage','chatgpt-plan-connection');
  const controller=new AbortController(),cancel=()=>controller.abort();process.once('SIGINT',cancel);process.once('SIGTERM',cancel);
  try{
    console.log('夜航 · Continue with ChatGPT\n本次只核对登录权限和可选型号，不生成梦，不批准额外积分。浏览器操作只在 OpenAI 官方页面完成。');
    const result=await checkPlanLogin({directory,signal:controller.signal,onReady:url=>{console.log(`登录窗口（5分钟内有效，不要把登录回调或凭据发到聊天）：\n${url}`);return openWindowsBrowser(url);}});
    console.log(JSON.stringify(result,null,2));if(result.status!=='signed_in_models_checked')process.exitCode=1;
  }finally{process.removeListener('SIGINT',cancel);process.removeListener('SIGTERM',cancel);}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))planLoginMain(process.argv.slice(2)).catch(error=>{console.error(JSON.stringify({status:'login_not_completed',reason:loginDiagnostic(error),generationEnabled:false,realModelRequests:0,credentialsPersisted:false}));process.exitCode=1;});
