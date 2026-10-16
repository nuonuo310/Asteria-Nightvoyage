import fs from 'node:fs';
import assert from 'node:assert/strict';
import { auditAffectSupportContrasts } from '../src/affect-support-contrast.js';
import { coupledTrialPinsMatch } from '../src/coupled-trial-config.js';
const previousFetch=globalThis.fetch,previousEnv=process.env;let requests=0,keyReads=0;
globalThis.fetch=()=>{requests++;throw Error('offline_only');};
process.env=new Proxy(previousEnv,{get(t,k){if(k==='NIGHTVOYAGE_DEEPSEEK_KEY'){keyReads++;throw Error('credential_forbidden');}return Reflect.get(t,k);}});
try{
  const fixture=JSON.parse(fs.readFileSync(new URL('../fixtures/affect-support-contrasts.json',import.meta.url),'utf8')),result=auditAffectSupportContrasts(fixture);
  assert.ok(result.results.every(r=>r.matchesAuthoredGateExpectation));assert.equal(requests,0);assert.equal(keyReads,0);assert.equal(coupledTrialPinsMatch(),false);
  console.log(JSON.stringify({command:'node scripts/check-affect-support-contrasts.mjs',node:process.version,platform:process.platform,...result,credentialReads:keyReads,persistentRuntimeWrites:0,liveSourcePinsUnchanged:coupledTrialPinsMatch()},null,2));
}finally{globalThis.fetch=previousFetch;process.env=previousEnv;}
