// Entirely local scripted runtime rehearsal; not a live trial, token or money test.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {ContinuityRehearsal,continuityRehearsalVersion} from '../src/scene-continuity-rehearsal.js';
import {continuitySeed,continuityResponse} from '../test-support/continuity-runtime-fixtures.js';
import {sceneContinuityPrompt} from '../src/scene-continuity-prompt.js';
import {coupledTrialPinsMatch} from '../src/coupled-trial-config.js';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-continuity-rehearsal-')),env=process.env,fetch=globalThis.fetch;let nativeRequests=0,keyReads=0,e;
process.env=new Proxy(env,{get(t,k){if(k==='NIGHTVOYAGE_DEEPSEEK_KEY'){keyReads++;throw Error('credential_forbidden');}return Reflect.get(t,k);}});globalThis.fetch=()=>{nativeRequests++;throw Error('transport_forbidden');};
try {
  const requests=[],simulator=r=>{requests.push(structuredClone(r));return continuityResponse(r);},seed=continuitySeed();e=new ContinuityRehearsal(root,{simulator});const id=e.start('offline-runtime','offline-runtime',seed);assert.equal(e.store.state.runs[id].appraisalProtocolVersion,continuityRehearsalVersion);await e.execute(id);const result=e.result(id);assert.equal(result.receipt.status,'completed');assert.equal(requests.length,3);assert.deepEqual(requests.map(r=>r.body.messages[0].content.includes(sceneContinuityPrompt)),[false,true,false]);
  const cue=result.dream.scenes[0].event.slice(0,4);assert.equal(e.recall(cue,'cue').length,1);e.close();e=new ContinuityRehearsal(root,{simulator});await e.execute(id);assert.equal(requests.length,3);assert.equal(e.result(id).dream.scenes.length,2);e.withdraw(seed.sources[0].id);assert.deepEqual(e.recall(cue,'cue'),[]);e.close();e=new ContinuityRehearsal(root,{simulator});assert.equal(e.result(id).dream,null);assert.equal(e.store.state.billing,undefined);assert.equal(nativeRequests,0);assert.equal(keyReads,0);assert.equal(coupledTrialPinsMatch(),false);
  console.log(JSON.stringify({command:'node scripts/check-continuity-runtime.mjs',node:process.version,platform:process.platform,protocolVersion:continuityRehearsalVersion,status:'completed_before_withdrawal',fakeStageCalls:requests.length,realModelRequests:nativeRequests,credentialReads:keyReads,secondScenePromptChanged:true,identitySavedBeforeDispatch:true,reopened:true,duplicateCalls:0,recallCandidatesBeforeWithdrawal:1,withdrawalSurvivesReopen:true,originalSourceGrantsNoEgress:seed.sources.every(s=>s.grant.modelEgress===false),budgetKind:'fake_byte_estimate_only',inputBudgetScope:'core_payload_byte_estimate_excludes_system_prompt',actualProviderTokensOrCurrencyValidated:false,paidLedgerCreated:false,liveEntryAvailable:false,liveSourcePinsUnchanged:coupledTrialPinsMatch(),semanticSupport:'not_assessed',qualityAssessed:false},null,2));
}finally{e?.close();process.env=env;globalThis.fetch=fetch;fs.rmSync(root,{recursive:true,force:true});}
