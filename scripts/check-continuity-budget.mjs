// Scripted gated-ledger exercise; TEST-ONLY prices/usage, never real model billing.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {BudgetedNightvoyage} from '../src/budgeted-runtime.js';
import {continuityBudgetVersion,continuityIdentity} from '../src/scene-continuity-protocol.js';
import {continuitySeed,continuityResponse} from '../test-support/continuity-runtime-fixtures.js';
import {readContentReview} from '../src/content-review.js';
import {coupledTrialPinsMatch} from '../src/coupled-trial-config.js';
import {hash} from '../src/contract.js';
const d=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-continuity-ledger-')),env=process.env,native=globalThis.fetch;let e,nativeRequests=0,keyReads=0,calls=0,verifiedFingerprints=0;
process.env=new Proxy(env,{get(t,k){if(k==='NIGHTVOYAGE_DEEPSEEK_KEY'){keyReads++;throw Error('credential_forbidden');}return Reflect.get(t,k);}});globalThis.fetch=()=>{nativeRequests++;throw Error('native_fetch_forbidden');};
const allowance={id:'continuity-STUB-only',mode:'stub',approved:true,expiresAt:Date.now()+60000,protocolVersion:continuityBudgetVersion,limits:{maxRuns:1,maxCalls:3,maxMicroCny:1000000},pricing:{model:'deepseek-flash',contextTokenLimit:1000,inputMicroCnyPerMillion:1000000,outputMicroCnyPerMillion:2000000,reference:'https://api-docs.deepseek.com/TEST-ONLY',checkedAt:1}};
const options={allowance,mode:'stub',enabled:true,protocol:'scene-continuity-v1',credential:'DUMMY-STUB-only',fetchImpl:async(_url,r)=>{
  calls++;const body=JSON.parse(r.body),disk=JSON.parse(fs.readFileSync(path.join(d,'state.json'),'utf8')),run=Object.values(disk.runs)[0],row=Object.values(disk.billing.accounts[allowance.id].attempts).at(-1);
  assert.equal(row.fingerprint,hash({runId:run.id,request:body,snapshot:run.snapshot}));verifiedFingerprints++;for(const [k,v] of Object.entries(continuityIdentity()))assert.equal(run[k],v);
  return new Response(JSON.stringify(continuityResponse({body}).body));
}};
try{
  e=new BudgetedNightvoyage(d,options);const seed=continuitySeed();for(const s of seed.sources)s.grant.modelEgress=true; // Permission on simulator copy only.
  const id=e.start('candidate-stub','candidate-stub',seed);await e.execute(id);const result=e.result(id);assert.equal(result.receipt.status,'completed');assert.equal(result.receipt.billing.filter(r=>r.status==='settled').length,3);assert.equal(readContentReview(e.store,result.dream.id).appraisalView.protocolVersion,continuityBudgetVersion);
  e.close();e=new BudgetedNightvoyage(d,options);await e.execute(id);assert.equal(calls,3);e.withdraw(seed.sources[0].id);e.close();e=new BudgetedNightvoyage(d,options);assert.equal(e.result(id).dream,null);assert.equal(readContentReview(e.store,result.dream.id),null);assert.deepEqual(e.recall('小船','after-withdraw'),[]);assert.equal(coupledTrialPinsMatch(),false);assert.equal(nativeRequests,0);assert.equal(keyReads,0);
  console.log(JSON.stringify({command:'node scripts/check-continuity-budget.mjs',node:process.version,platform:process.platform,protocolVersion:continuityBudgetVersion,status:'completed_before_withdrawal',stubCalls:calls,stubSettledCalls:3,verifiedTransportFingerprints:verifiedFingerprints,identitySavedBeforeDispatch:true,reopened:true,duplicateCalls:0,typedContentView:true,withdrawalSurvivesReopen:true,originalSourceGrantsNoEgress:continuitySeed().sources.every(s=>s.grant.modelEgress===false),historicalCoupledDispatchPinsMatch:false,realModelRequests:nativeRequests,credentialReads:keyReads,pricingAndUsage:'synthetic_test_only',actualProviderBillingValidated:false,liveEntryAvailable:false,semanticSupport:'not_assessed',qualityAssessed:false},null,2));
}finally{e?.close();process.env=env;globalThis.fetch=native;fs.rmSync(d,{recursive:true,force:true});}
