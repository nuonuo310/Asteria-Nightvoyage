// Offline encoding comparison only: no provider, Store, credentials or caller bodies.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {compareInlineFixture,fictionalInlineContext,sharedQuotationBoundary,inlineReviewVersion} from '../test-support/inline-evidence-review.js';
import {continuityTrialPinsMatch} from '../src/continuity-trial-config.js';
const env=process.env,native=globalThis.fetch;let keyReads=0,requests=0;
process.env=new Proxy(env,{get(t,k){if(k==='NIGHTVOYAGE_DEEPSEEK_KEY'){keyReads++;throw Error('credential_forbidden');}return Reflect.get(t,k);}});globalThis.fetch=()=>{requests++;throw Error('native_fetch_forbidden');};
try{
  const f=JSON.parse(fs.readFileSync(new URL('../fixtures/affect-support-contrasts.json',import.meta.url),'utf8'));
  const examples=f.scenes.filter(x=>x.expectedGate.accepted).map(x=>({id:x.id,kind:'independent_public_scripted_example',raw:x.raw}));examples.push({id:'shared-long-quotation-boundary',kind:'synthetic_byte_boundary_only',raw:sharedQuotationBoundary()});
  const results=examples.map(x=>({id:x.id,kind:x.kind,...compareInlineFixture(fictionalInlineContext(x.raw),f.before)}));
  assert.ok(results.every(r=>r.contentPreserved));assert.equal(results.at(-1).candidateBoundedResult,'inline_output_too_large');assert.equal(continuityTrialPinsMatch(),true);assert.equal(requests,0);assert.equal(keyReads,0);
  console.log(JSON.stringify({command:'node scripts/check-inline-evidence-review.mjs',node:process.version,platform:process.platform,protocolVersion:inlineReviewVersion,scriptedComparisons:results.length,results,realModelRequests:requests,credentialReads:keyReads,storeOpened:false,persistentRuntimeWrites:0,existingPaidPinsMatch:true,liveSelectorAvailable:false,actualModelTokenCount:null,oldRejectedResponseAvailable:false,oldUnknownHoldsReconciled:false,modelComplianceImproved:'not_assessed',semanticSupport:'not_assessed',qualityAssessed:false},null,2));
}finally{process.env=env;globalThis.fetch=native;}
