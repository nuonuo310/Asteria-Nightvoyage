import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign,createHash} from 'node:crypto';
import {PlanAuthorizationAttempt,validatePlanTokens,planModelChoices,planIssuer,planResource,planAuthorize} from '../scripts/chatgpt-plan-auth.mjs';
const now=Date.now(),seconds=Math.floor(now/1000),hostId='urn:uuid:11111111-1111-4111-8111-111111111111',clientId='oaiapp_synthetic',nonce='SYNTHETIC-NONCE';
const rsa=generateKeyPairSync('rsa',{modulusLength:2048}),ec=generateKeyPairSync('ec',{namedCurve:'P-256'});
const baseClaims=()=>({iss:planIssuer,sub:'synthetic-subject',aud:clientId,nonce,iat:seconds,exp:seconds+3600});
function token(claims=baseClaims(),header={alg:'RS256',kid:'synthetic-rsa'},key=rsa.privateKey){
  const a=Buffer.from(JSON.stringify(header)).toString('base64url'),b=Buffer.from(JSON.stringify(claims)).toString('base64url');
  const signature=sign('sha256',Buffer.from(a+'.'+b),{key,...(header.alg==='ES256'?{dsaEncoding:'ieee-p1363'}:{})}).toString('base64url');return a+'.'+b+'.'+signature;
}
const keys=()=>({keys:[{...rsa.publicKey.export({format:'jwk'}),kid:'synthetic-rsa',alg:'RS256',use:'sig'},{...ec.publicKey.export({format:'jwk'}),kid:'synthetic-ec',alg:'ES256',use:'sig'}]});
const tokens=(changes={})=>({access_token:'SYNTHETIC-ACCESS',refresh_token:'SYNTHETIC-REFRESH',id_token:token(),token_type:'Bearer',expires_in:3600,scope:'openid profile email offline_access resource.invoke chatgpt.tokens.use.direct',...changes});
const expected={clientId,nonce,now};

test('native authorization creates fresh state/nonce/PKCE and consumes the exact callback only once',()=>{
  const attempt=new PlanAuthorizationAttempt({hostId,redirectUri:'http://127.0.0.1:12345/auth/callback',now}),url=new URL(attempt.authorizationUrl),p=url.searchParams;
  assert.equal(url.origin+url.pathname,planAuthorize);assert.equal(p.get('client_id'),'dynamic_agent_client');assert.equal(p.get('agent_name_hint'),'Asteria-Nightvoyage');assert.equal(p.get('resource'),planResource);
  const callback=new URL(p.get('redirect_uri'));callback.search=new URLSearchParams({state:p.get('state'),code:'SYNTHETIC-CODE',client_id:clientId}).toString();
  const out=attempt.consume(callback.href,now),form=new URLSearchParams(out.form);
  assert.equal(form.get('client_id'),clientId);assert.equal(form.get('redirect_uri'),p.get('redirect_uri'));assert.equal(form.get('resource'),planResource);assert.equal(form.get('code'),'SYNTHETIC-CODE');assert.equal(out.nonce,p.get('nonce'));
  assert.equal(createHash('sha256').update(form.get('code_verifier')).digest('base64url'),p.get('code_challenge'));
  assert.ok(!attempt.authorizationUrl.includes(form.get('code_verifier')));assert.throws(()=>attempt.consume(callback.href,now),/consumed/);
  const next=new PlanAuthorizationAttempt({hostId,clientId,redirectUri:'http://127.0.0.1:23456/auth/callback',now}),np=new URL(next.authorizationUrl).searchParams;
  assert.equal(np.get('client_id'),clientId);assert.equal(np.has('agent_name_hint'),false);assert.notEqual(np.get('state'),p.get('state'));assert.notEqual(np.get('nonce'),p.get('nonce'));
});

test('callback mismatches, expiry, duplicate params, denied permission and changed registration never produce an exchange',()=>{
  for(const variation of ['state','origin','path','duplicate','denied','client','missing','expired']){
    const a=new PlanAuthorizationAttempt({hostId,clientId,redirectUri:'http://127.0.0.1:12345/auth/callback',now}),p=new URL(a.authorizationUrl).searchParams;
    const u=new URL(p.get('redirect_uri'));u.search=new URLSearchParams({state:p.get('state'),code:'SYNTHETIC',client_id:clientId});
    if(variation==='state')u.searchParams.set('state','wrong');if(variation==='origin')u.hostname='localhost';if(variation==='path')u.pathname='/callback';if(variation==='duplicate')u.searchParams.append('code','another');if(variation==='denied')u.searchParams.set('error','PRIVATE-UNTRUSTED-ERROR');if(variation==='client')u.searchParams.set('client_id','oaiapp_other');if(variation==='missing')u.searchParams.delete('code');
    assert.throws(()=>a.consume(u.href,variation==='expired'?now+300000:now),e=>/^plan_/.test(e.message)&&!e.message.includes('PRIVATE'));assert.throws(()=>a.consume(u.href,now),/consumed/);
  }
  for(const redirectUri of ['https://127.0.0.1:1234/auth/callback','http://localhost:1234/auth/callback','http://127.0.0.1:1234/callback','http://127.0.0.1:1234/auth/callback?x=1'])assert.throws(()=>new PlanAuthorizationAttempt({hostId,redirectUri}));
});

test('real RSA and EC signature verification binds issuer, client, nonce, subject, times and plan scopes',()=>{
  const out=validatePlanTokens(tokens(),keys(),expected);assert.equal(out.subject,'synthetic-subject');assert.equal(out.clientId,clientId);assert.equal(out.accessToken,'SYNTHETIC-ACCESS');assert.ok(out.expiresAt>now);
  const ecToken=token(baseClaims(),{alg:'ES256',kid:'synthetic-ec'},ec.privateKey);assert.equal(validatePlanTokens(tokens({id_token:ecToken}),keys(),expected).subject,'synthetic-subject');
  const multi=token({...baseClaims(),aud:[clientId,'another-audience'],azp:clientId});assert.equal(validatePlanTokens(tokens({id_token:multi}),keys(),expected).clientId,clientId);
  for(const changes of [{iss:'https://other.invalid'},{aud:'oaiapp_other'},{nonce:'wrong'},{exp:seconds-1},{iat:seconds+10},{nbf:seconds+10},{sub:''},{aud:[clientId,'another'],azp:'oaiapp_other'}])assert.throws(()=>validatePlanTokens(tokens({id_token:token({...baseClaims(),...changes})}),keys(),expected),/identity_invalid/);
  assert.throws(()=>validatePlanTokens(tokens(),keys(),{...expected,subject:'different'}),/identity_invalid/);
  assert.throws(()=>validatePlanTokens(tokens({scope:'openid profile email'}),keys(),expected),/permission_missing/);
});

test('forged signatures, algorithm confusion, remote key headers and malformed credentials cannot supply identity',()=>{
  for(const header of [{alg:'none',kid:'synthetic-rsa'},{alg:'HS256',kid:'synthetic-rsa'},{alg:'RS256',kid:'unknown'},{alg:'RS256',kid:'synthetic-rsa',jku:'https://evil.invalid'},{alg:'RS256',kid:'synthetic-rsa',crit:['b64']}])assert.throws(()=>validatePlanTokens(tokens({id_token:token(baseClaims(),header)}),keys(),expected),/identity_invalid/);
  const fake=token({...baseClaims(),sub:'forged'}).split('.'),original=token().split('.');assert.throws(()=>validatePlanTokens(tokens({id_token:fake[0]+'.'+fake[1]+'.'+original[2]}),keys(),expected),/identity_invalid/);
  for(const changes of [{access_token:'bad\nheader'},{expires_in:0},{expires_in:Infinity},{token_type:'Basic'},{id_token:'bad.jwt'},{refresh_token:null}])assert.throws(()=>validatePlanTokens(tokens(changes),keys(),expected),/identity_invalid/);
  const badKeys=keys();badKeys.keys[0].use='enc';assert.throws(()=>validatePlanTokens(tokens(),badKeys,expected),/identity_invalid/);
  const duplicate=keys();duplicate.keys.push(duplicate.keys[0]);assert.throws(()=>validatePlanTokens(tokens(),duplicate,expected),/identity_invalid/);
});

test('model catalog exposes only bounded displayable model choices and does not infer entitlement',()=>{
  assert.deepEqual(planModelChoices({models:[{slug:'synthetic-a',display_name:'Synthetic A',visibility:'list',private:'discarded'},{slug:'hidden',visibility:'hide'}]}),[{model:'synthetic-a',name:'Synthetic A'}]);
  for(const value of [{},{models:[]},{models:[{slug:'url/model',display_name:'bad',visibility:'list'}]},{models:[{slug:'a',display_name:'bad\nname',visibility:'list'}]},{models:[{slug:'a',display_name:'A',visibility:'list'},{slug:'a',display_name:'A',visibility:'list'}]}])assert.throws(()=>planModelChoices(value),/catalog_invalid/);
});
