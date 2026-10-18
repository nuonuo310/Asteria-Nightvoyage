// Independent native-app OAuth helpers. Credentials are transient, never diagnostics.
import {randomBytes,createHash,createPublicKey,verify,timingSafeEqual} from 'node:crypto';
export const planIssuer='https://auth.openai.com';
export const planResource='https://api.openai.com/v1';
export const planAuthorize=`${planIssuer}/api/accounts/authorize`;
export const planToken=`${planIssuer}/api/accounts/oauth/token`;
export const planJwks=`${planIssuer}/.well-known/jwks.json`;
export const planDiscovery=`${planIssuer}/.well-known/openid-configuration`;
export const authFail=code=>{throw Error(code);};
export const issuedClient=v=>typeof v==='string'&&/^oaiapp_[A-Za-z0-9_-]{1,200}$/.test(v);
const text=(v,n=32768)=>typeof v==='string'&&v.length>0&&v.length<=n&&/^[\x21-\x7e]+$/.test(v);
const same=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
export class PlanAuthorizationAttempt {
  #state=randomBytes(32).toString('base64url');#nonce=randomBytes(32).toString('base64url');#verifier=randomBytes(48).toString('base64url');#used=false;#client;#redirect;#expires;
  constructor({hostId,clientId=null,redirectUri,now=Date.now()}){
    if(typeof hostId!=='string'||!/^urn:uuid:[0-9a-f-]{36}$/.test(hostId)||(clientId!==null&&!issuedClient(clientId))||!Number.isSafeInteger(now))authFail('plan_invalid_registration');
    const url=new URL(redirectUri);
    if(url.protocol!=='http:'||url.hostname!=='127.0.0.1'||!url.port||url.pathname!=='/auth/callback'||url.search||url.hash||url.username||url.password)authFail('plan_invalid_callback');
    this.#client=clientId;this.#redirect=url.href;this.#expires=now+300000;
    const auth=new URL(planAuthorize);auth.search=new URLSearchParams({client_id:clientId??'dynamic_agent_client',...(!clientId?{agent_name_hint:'Asteria-Nightvoyage'}:{}),ext_agent_host_id:hostId,response_type:'code',redirect_uri:this.#redirect,scope:'openid profile email offline_access resource.invoke chatgpt.tokens.use.direct',resource:planResource,state:this.#state,nonce:this.#nonce,code_challenge_method:'S256',code_challenge:createHash('sha256').update(this.#verifier).digest('base64url')}).toString();
    Object.defineProperty(this,'authorizationUrl',{value:auth.href,enumerable:true});
  }
  consume(callback,now=Date.now()){
    if(this.#used)authFail('plan_callback_consumed');this.#used=true;
    try{
      const url=new URL(callback),expected=new URL(this.#redirect),p=url.searchParams;
      if(!Number.isSafeInteger(now)||now>=this.#expires||url.origin!==expected.origin||url.pathname!==expected.pathname||url.hash||url.username||url.password||!same(p.get('state'),this.#state))authFail('plan_callback_rejected');
      for(const name of ['state','code','client_id','error'])if(p.getAll(name).length>1)authFail('plan_callback_rejected');
      if(p.has('error'))authFail('plan_login_denied');
      const client=p.get('client_id')??this.#client;
      if(!issuedClient(client)||(this.#client&&client!==this.#client)||!text(p.get('code'),4096))authFail('plan_callback_rejected');
      return {clientId:client,nonce:this.#nonce,form:new URLSearchParams({grant_type:'authorization_code',client_id:client,code:p.get('code'),code_verifier:this.#verifier,redirect_uri:this.#redirect,resource:planResource}).toString()};
    }catch(error){authFail(['plan_callback_rejected','plan_login_denied'].includes(error.message)?error.message:'plan_callback_rejected');}
    finally{this.#state='';this.#nonce='';this.#verifier='';}
  }
}
function jwtPart(value){
  if(!/^[A-Za-z0-9_-]+$/.test(value))authFail('plan_identity_invalid');
  const bytes=Buffer.from(value,'base64url');if(bytes.toString('base64url')!==value)authFail('plan_identity_invalid');
  return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
}
export function validatePlanTokens(tokens,jwks,{clientId,nonce,subject=null,now=Date.now()}){
  try{
    if(!issuedClient(clientId)||!text(nonce,200)||!Number.isSafeInteger(now)||!tokens||tokens.token_type?.toLowerCase()!=='bearer'||!text(tokens.access_token)||!text(tokens.id_token)||!text(tokens.refresh_token)||!Number.isSafeInteger(tokens.expires_in)||tokens.expires_in<1||tokens.expires_in>86400||typeof tokens.scope!=='string'||tokens.scope.length>4096)authFail('plan_identity_invalid');
    const scopes=tokens.scope.split(/\s+/).filter(Boolean);
    if(!['openid','resource.invoke','chatgpt.tokens.use.direct'].every(s=>scopes.includes(s)))authFail('plan_permission_missing');
    const parts=tokens.id_token.split('.');if(parts.length!==3)authFail('plan_identity_invalid');
    const header=jwtPart(parts[0]),claims=jwtPart(parts[1]);
    if(!header||!['RS256','ES256'].includes(header.alg)||!text(header.kid,200)||Object.keys(header).some(k=>!['alg','kid','typ'].includes(k))||(header.typ!==undefined&&header.typ!=='JWT'))authFail('plan_identity_invalid');
    if(!jwks||!Array.isArray(jwks.keys)||jwks.keys.length>100)authFail('plan_identity_invalid');
    const keys=jwks.keys.filter(k=>k?.kid===header.kid);if(keys.length!==1)authFail('plan_identity_invalid');const jwk=keys[0];
    if((jwk.use!==undefined&&jwk.use!=='sig')||(jwk.alg!==undefined&&jwk.alg!==header.alg)||(jwk.key_ops!==undefined&&(!Array.isArray(jwk.key_ops)||!jwk.key_ops.includes('verify')))||jwk.d!==undefined)authFail('plan_identity_invalid');
    if(header.alg==='RS256'&&jwk.kty!=='RSA'||header.alg==='ES256'&&(jwk.kty!=='EC'||jwk.crv!=='P-256'))authFail('plan_identity_invalid');
    const key=createPublicKey({key:jwk,format:'jwk'});
    if(header.alg==='RS256'&&key.asymmetricKeyDetails.modulusLength<2048)authFail('plan_identity_invalid');
    if(!/^[A-Za-z0-9_-]+$/.test(parts[2]))authFail('plan_identity_invalid');
    if(!verify('sha256',Buffer.from(parts[0]+'.'+parts[1]),{key,...(header.alg==='ES256'?{dsaEncoding:'ieee-p1363'}:{})},Buffer.from(parts[2],'base64url')))authFail('plan_identity_invalid');
    const seconds=Math.floor(now/1000),aud=claims.aud;
    if(claims.iss!==planIssuer||!text(claims.sub,2048)||(subject!==null&&claims.sub!==subject)||!same(claims.nonce,nonce)||!Number.isSafeInteger(claims.exp)||!Number.isSafeInteger(claims.iat)||claims.exp<=seconds||claims.iat>seconds+5||claims.exp<=claims.iat||(claims.nbf!==undefined&&(!Number.isSafeInteger(claims.nbf)||claims.nbf>seconds+5)))authFail('plan_identity_invalid');
    if(aud!==clientId&&(!Array.isArray(aud)||!aud.every(a=>typeof a==='string')||!aud.includes(clientId)))authFail('plan_identity_invalid');
    if((Array.isArray(aud)&&aud.length>1||claims.azp!==undefined)&&claims.azp!==clientId)authFail('plan_identity_invalid');
    return {clientId,subject:claims.sub,accessToken:tokens.access_token,refreshToken:tokens.refresh_token,expiresAt:Math.min(now+tokens.expires_in*1000,claims.exp*1000),scopes:[...new Set(scopes)]};
  }catch(error){authFail(error.message==='plan_permission_missing'?error.message:'plan_identity_invalid');}
}
export function planModelChoices(value){
  if(!value||!Array.isArray(value.models)||value.models.length>1000)authFail('plan_model_catalog_invalid');
  const choices=value.models.filter(m=>m?.visibility==='list').map(m=>{
    if(typeof m.slug!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(m.slug)||typeof m.display_name!=='string'||!m.display_name.trim()||m.display_name.length>120||/[\u0000-\u001f\u007f]/u.test(m.display_name))authFail('plan_model_catalog_invalid');
    return {model:m.slug,name:m.display_name};
  });
  if(!choices.length||new Set(choices.map(c=>c.model)).size!==choices.length)authFail('plan_model_catalog_invalid');return choices;
}
