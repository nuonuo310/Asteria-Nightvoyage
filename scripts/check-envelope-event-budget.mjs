import assert from 'node:assert/strict';
import {ValidatedEnvelopeStream} from './validated-envelope-stream.mjs';
import {ChatgptPlanStream,chatgptPlanLimits} from './chatgpt-plan-protocol.mjs';
import {envelopeDiagnostic} from './envelope-diagnostic.mjs';
import {denseEnvelope,envelopeBytes,shapeModel} from '../test-support/envelope-event-budget-fixtures.js';
import {envelopeTrialProposal} from './envelope-plan-trial.mjs';
const results=[];
for(const [kind,count]of [['reasoning',119],['reasoning',120],['answer',120]]){
 const events=denseEnvelope(kind,count),bytes=envelopeBytes(events);let accepted=false,check=null;
 try{const decoder=new ValidatedEnvelopeStream(shapeModel);decoder.push(bytes);decoder.finish();accepted=true;}catch(error){check=envelopeDiagnostic(error)?.check;}
 assert.ok(bytes.length<chatgptPlanLimits.streamBytes);
 assert.equal(accepted,kind==='reasoning'&&count===119);
 if(!accepted)assert.equal(check,'event_limit');
 results.push({syntheticKind:kind,eventCount:events.length,utf8Bytes:bytes.length,accepted,check});
}
const answer=denseEnvelope('answer',120),strict=new ChatgptPlanStream(shapeModel);
assert.throws(()=>strict.push(envelopeBytes(answer)),/plan_invalid_stream/);
envelopeTrialProposal();
console.log(JSON.stringify({command:'node scripts/check-envelope-event-budget.mjs',node:process.version,platform:process.platform,kind:'independent_synthetic_event_budget_review',eventCeiling:chatgptPlanLimits.events,streamByteCeiling:chatgptPlanLimits.streamBytes,results,independentStrictCounterReproduced:true,liveProposalPinsUnchanged:true,liveLimitsChanged:false,realModelRequests:0,credentialReads:0,userStoreAccessed:false,historicalEventKindsKnown:false,historicalFinalEnvelopeKnown:false,historicalCauseBeyondLimitConfirmed:false,qualityAssessed:false},null,2));
