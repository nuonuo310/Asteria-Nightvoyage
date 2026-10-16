// Fixed public scripted fixtures only. Never opens a user Store or a paid entry.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {InlineRehearsal,inlineRuntimeVersion} from '../test-support/inline-evidence-runtime.js';
import {inlineSeed,inlineResponse} from '../test-support/inline-runtime-fixtures.js';
import {sceneContinuityPrompt} from '../src/scene-continuity-prompt-text.js';
import {continuityTrialPinsMatch} from '../src/continuity-trial-config.js';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-inline-runtime-')),env=process.env,fetch=globalThis.fetch;let nativeRequests=0,keyReads=0,e;
process.env=new Proxy(env,{get(t,k){if(k==='NIGHTVOYAGE_DEEPSEEK_KEY'){keyReads++;throw Error('credential_forbidden');}return Reflect.get(t,k);}});globalThis.fetch=()=>{nativeRequests++;throw Error('transport_forbidden');};
try {
  const requests=[],seed=inlineSeed(),simulator=request=>{requests.push(structuredClone(request));return inlineResponse(request);};
  e=new InlineRehearsal(root,{simulator});const id=e.start('inline-offline','inline-offline',seed);assert.equal(e.store.state.runs[id].appraisalProtocolVersion,inlineRuntimeVersion);await e.execute(id);const result=e.result(id),entryId=result.dream.id;assert.equal(result.receipt.status,'completed');assert.equal(requests.length,3);assert.deepEqual(requests.map(r=>r.body.messages[0].content.includes(sceneContinuityPrompt)),[false,true,false]);assert.equal(e.appraisalView(entryId).protocolVersion,inlineRuntimeVersion);
  const cue=result.dream.scenes[0].event.slice(0,4),candidates=e.recall(cue,'cue');assert.equal(candidates.length,1);assert.equal(candidates[0].origin,'dream');assert.equal(candidates[0].isRealityFact,false);
  e.close();e=new InlineRehearsal(root,{simulator});await e.execute(id);assert.equal(requests.length,3);assert.equal(e.appraisalView(entryId).scenes.length,2);e.withdraw(seed.sources[0].id);assert.equal(e.appraisalView(entryId),null);assert.deepEqual(e.recall(cue,'cue'),[]);e.close();e=new InlineRehearsal(root,{simulator});assert.equal(e.result(id).dream,null);assert.equal(e.appraisalView(entryId),null);assert.equal(e.store.state.billing,undefined);assert.equal(nativeRequests,0);assert.equal(keyReads,0);assert.equal(continuityTrialPinsMatch(),false);
  console.log(JSON.stringify({command:'node scripts/check-inline-runtime.mjs',node:process.version,platform:process.platform,protocolVersion:inlineRuntimeVersion,status:'completed_before_withdrawal',fakeStageCalls:requests.length,realModelRequests:nativeRequests,credentialReads:keyReads,identitySavedBeforeDispatch:true,secondScenePromptOnly:true,reopened:true,duplicateCalls:0,typedOfflineViewAvailable:true,recallCandidates:1,recallOrigin:candidates[0].origin,recallIsRealityFact:false,withdrawalSuppressesViewAndRecall:true,withdrawalSurvivesReopen:true,originalSourceGrantsNoEgress:seed.sources.every(s=>s.grant.modelEgress===false),budgetKind:'fake_byte_estimate_only',inputBudgetScope:'core_payload_byte_estimate_excludes_system_prompt',actualProviderTokensOrCurrencyValidated:false,paidLedgerCreated:false,currentPaidSourcePinsMatch:continuityTrialPinsMatch(),liveProtocolEnabled:false,asteriaAdapter:'pending',semanticSupport:'not_assessed',qualityAssessed:false},null,2));
} finally {e?.close();process.env=env;globalThis.fetch=fetch;fs.rmSync(root,{recursive:true,force:true});}
