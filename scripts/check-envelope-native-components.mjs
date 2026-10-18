import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {withSyntheticNativeEnvelope} from '../test-support/envelope-native-fixtures.js';
import {Store} from '../src/store.js';
import {readModelPortContent} from './envelope-plan-content-view.mjs';
import {envelopeNativeComponentReview} from './envelope-native-review.mjs';
import {missingTypeTrialProposal} from './missing-type-plan-trial.mjs';
import {envelopeProbeProposal} from './plan-envelope-probe.mjs';
import {prefixProbeProposal} from './plan-prefix-probe.mjs';
const review=envelopeNativeComponentReview();let evidence;
const {authorization,modelAdapter}=await withSyntheticNativeEnvelope(async({engine,input,http,directory})=>{
 const id=engine.start('synthetic-native-check','synthetic-native-check',input);await engine.execute(id);const r=engine.result(id);assert.equal(r.receipt.status,'completed');const original=engine.read(r.dream.id),wake=structuredClone(r.wake);
 await engine.execute(id);assert.equal(engine.start('synthetic-native-duplicate','synthetic-native-check',input),id);await engine.execute(id);assert.equal(http.bodies.length,3);assert.deepEqual(engine.read(r.dream.id),original);assert.deepEqual(engine.result(id).wake,wake);engine.close();
 const store=new Store(directory);try{const v=readModelPortContent(store,r.dream.id);assert.equal(v.narrative.dream.isRealityFact,false);assert.equal(v.narrative.wake.origin,'wake_note');}finally{store.close();}
 const disk=fs.readFileSync(path.join(directory,'state.json'),'utf8');for(const s of ['SYNTHETIC-TRIAL-ACCESS','SYNTHETIC-REASONING-PRIVATE','SYNTHETIC-ENCRYPTED-PRIVATE'])assert.ok(!disk.includes(s));
 evidence={status:r.receipt.status,candidateSyntheticHttpRequests:http.bodies.length,externalRequestIntents:r.receipt.external_calls_started,savedScenes:r.receipt.checkpoint.saved_scenes,wakeSaved:r.receipt.checkpoint.wake_saved,usageRows:r.receipt.usage.length,replayAdditionalHttpRequests:0,originalAndWakeUnchanged:true,credentialFreeReopenedProjection:true,reasoningAndCredentialsNotPersisted:true};return {synthetic:true};
});
missingTypeTrialProposal();envelopeProbeProposal();prefixProbeProposal();
console.log(JSON.stringify({command:'node scripts/check-envelope-native-components.mjs',node:process.version,platform:process.platform,kind:'synthetic_native_components_not_user_approval',protocolVersion:review.protocol_version,...evidence,syntheticRevocationConfirmed:authorization.remoteRevocationConfirmed,sessionUnavailableAfterAction:!modelAdapter.preflight().ready,existingProposalPinsMatch:true,sourceClosureFiles:Object.keys(review.sourcePins).length,realModelRequests:0,realLoginAttempts:0,realCredentialReads:0,userStoreAccessed:false,userApprovalRecorded:false,realTrialEntryAvailable:false,qualityAssessed:false,pending:review.pending},null,2));
