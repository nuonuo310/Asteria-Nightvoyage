import {checkInlineIntegration} from '../test-support/inline-integration-review.js';
const env=process.env,fetch=globalThis.fetch;let credentialReads=0,nativeRequests=0;
process.env=new Proxy(env,{get(t,k){if(k==='NIGHTVOYAGE_DEEPSEEK_KEY'){credentialReads++;throw Error('credential_forbidden');}return Reflect.get(t,k);}});globalThis.fetch=()=>{nativeRequests++;throw Error('transport_forbidden');};
try{const result=await checkInlineIntegration();if(credentialReads||nativeRequests)throw Error('offline_boundary_failed');console.log(JSON.stringify({...result,credentialReads,nativeRequests},null,2));}finally{process.env=env;globalThis.fetch=fetch;}
