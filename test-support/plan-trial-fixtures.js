// Independent synthetic OAuth and provider HTTP. Only loopback requests use native fetch.
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {planDiscovery,planIssuer,planToken,planJwks,planAuthorize,planResource} from '../scripts/chatgpt-plan-auth.mjs';
import {planTranscript} from './model-port-protocol-fixtures.js';
const nativeFetch=globalThis.fetch,rsa=generateKeyPairSync('rsa',{modulusLength:2048});
const client='oaiapp_trial_synthetic',subject='trial-synthetic-subject';
export const trialApproval=()=>({approveFictionalSubscriptionTrial:true,confirmExtraCreditsDisabled:true,acknowledgeNoServerTokenCap:true});
function jwt(nonce){const now=Math.floor(Date.now()/1000),head=Buffer.from(JSON.stringify({alg:'RS256',kid:'synthetic'})).toString('base64url'),body=Buffer.from(JSON.stringify({iss:planIssuer,aud:client,sub:subject,nonce,iat:now,exp:now+3600})).toString('base64url');return `${head}.${body}.${sign('sha256',Buffer.from(`${head}.${body}`),rsa.privateKey).toString('base64url')}`;}
export function syntheticPlanHttp({onGenerate,denied=false,missingModel=false,revocationFail=false}={}){
 const calls=[],bodies=[];let nonce,revoked=0;
 const install=()=>globalThis.fetch=async(url,options={})=>{
  const href=String(url);calls.push(href);assert.equal(options.redirect,'error');
  if(href===planDiscovery)return Response.json({issuer:planIssuer,authorization_endpoint:planAuthorize,token_endpoint:planToken,jwks_uri:planJwks,revocation_endpoint:planIssuer+'/oauth/trial-synthetic-revoke'});
  if(href===planToken)return Response.json({access_token:'SYNTHETIC-TRIAL-ACCESS',refresh_token:'SYNTHETIC-TRIAL-REFRESH',id_token:jwt(nonce),token_type:'Bearer',expires_in:3600,scope:denied?'openid':'openid resource.invoke chatgpt.tokens.use.direct'});
  if(href===planJwks)return Response.json({keys:[{...rsa.publicKey.export({format:'jwk'}),alg:'RS256',kid:'synthetic'}]});
  if(href===`${planResource}/models`)return Response.json({models:[{slug:missingModel?'fiction-other-model':'gpt-5.6-sol',display_name:'Synthetic model',visibility:'list'}]});
  if(href===`${planResource}/responses`){assert.equal(options.headers.Authorization,'Bearer SYNTHETIC-TRIAL-ACCESS');const body=JSON.parse(options.body);bodies.push(body);if(onGenerate)return onGenerate(body,options,bodies.length);return new Response(Buffer.concat(planTranscript({body})),{headers:{'Content-Type':'text/event-stream; charset=utf-8'}});}
  if(href===planIssuer+'/oauth/trial-synthetic-revoke'){revoked++;return new Response(null,{status:revocationFail?500:200});}
  assert.fail('unexpected fixed endpoint');
 };
 const onReady=async url=>{const r=await nativeFetch(url,{redirect:'manual'});const p=new URL(r.headers.get('location')).searchParams;nonce=p.get('nonce');const callback=new URL(p.get('redirect_uri'));callback.search=new URLSearchParams({state:p.get('state'),code:'SYNTHETIC-TRIAL-CODE',client_id:client}).toString();await nativeFetch(callback);};
 return {install,onReady,restore:()=>globalThis.fetch=nativeFetch,calls,bodies,get revoked(){return revoked;}};
}
