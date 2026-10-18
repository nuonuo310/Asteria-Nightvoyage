import assert from 'node:assert/strict';
import {OfflinePlanEnvelopeStream,offlineEnvelopeVersion} from './offline-plan-envelope.mjs';
import {prepareChatgptPlanRequest,ChatgptPlanStream} from './chatgpt-plan-protocol.mjs';
import {envelopeEvents,envelopeBytes,shapeModel} from '../test-support/offline-plan-envelope-fixtures.js';
import {inlineSeed,inlineResponse} from '../test-support/inline-runtime-fixtures.js';
import {normalizeInlineStage} from '../src/inline-evidence-protocol.js';
import {missingTypeTrialProposal} from './missing-type-plan-trial.mjs';
import {envelopeProbeProposal} from './plan-envelope-probe.mjs';
import {prefixProbeProposal} from './plan-prefix-probe.mjs';
const snapshot=inlineSeed(),scenes=[],audits=[];let wake;
for(const stage of ['scene','scene','wake']){
 const draft=prepareChatgptPlanRequest({snapshot,scenes,stage,index:scenes.length},{model:shapeModel});
 const material=JSON.parse(draft.body.input[0].content);
 const raw=JSON.parse(inlineResponse({body:{messages:[{},{content:JSON.stringify(material)}]}}).body.choices[0].message.content);
 const bytes=envelopeBytes(envelopeEvents(raw)),decoder=new OfflinePlanEnvelopeStream(shapeModel);
 for(let n=0;n<bytes.length;n+=7)assert.equal(decoder.push(bytes.subarray(n,n+7)),undefined);
 const result=decoder.finish();assert.ok(!JSON.stringify(result).includes('PRIVATE'));
 audits.push(result.envelopeAudit);const value=normalizeInlineStage(result.data,material);
 if(stage==='scene')scenes.push(value);else wake=value;
}
assert.ok(scenes[wake.fragmentBasis.sceneIndex].event.includes(wake.fragment));
const strict=new ChatgptPlanStream(shapeModel);assert.throws(()=>strict.push(envelopeBytes()),/plan_output_shape/);
missingTypeTrialProposal();envelopeProbeProposal();prefixProbeProposal();
console.log(JSON.stringify({command:'node scripts/check-offline-plan-envelope.mjs',node:process.version,platform:process.platform,protocolVersion:offlineEnvelopeVersion,kind:'offline_protocol_only',syntheticStages:3,normalizedScenes:scenes.length,extractiveWakeValidated:true,reasoningReturned:false,audits,originalStrictParserStillRejectsReasoning:true,existingProposalPinsMatch:true,originalSourcesNoEgress:snapshot.sources.every(s=>s.grant.modelEgress===false),realModelRequests:0,credentialReads:0,userStoreAccessed:false,liveAdapterAvailable:false,persistenceIntegrationTested:false,historicalFailureCauseConfirmed:false,qualityAssessed:false},null,2));
