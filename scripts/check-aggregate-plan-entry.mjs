// Independent synthetic predecessor, consent, OAuth and HTTP; never real permission.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {Store} from '../src/store.js';
import {aggregateTrialFixture} from '../test-support/aggregate-trial-fixtures.js';
import {syntheticPlanHttp} from '../test-support/plan-trial-fixtures.js';
import {aggregateTranscript} from '../test-support/offline-aggregate-fixtures.js';
import {initAggregateTrial,preflightAggregateTrial,executeAggregateTrial,aggregateTrialProposal} from './aggregate-plan-trial.mjs';
import {runDreambook} from './dreambook.mjs';
const cleanups=[],eventCounts=[],streamByteCounts=[],t={after:fn=>cleanups.push(fn)};let http;
try{
 const d=await aggregateTrialFixture(t),before=Object.fromEntries(Object.entries(d.history).map(([k,v])=>[k,fs.readFileSync(path.join(v,'state.json'),'utf8')]));
 initAggregateTrial(d.directory,d.history,{approveFictionalSubscriptionTrial:true,confirmExtraCreditsDisabled:true,acknowledgeNoServerTokenCap:true,approveMissingContentTypeCompatibility:true,acknowledgeConsumedDiagnostics:true,approveReasoningDiscard:true,approveAggregateEventBudget:true});
 assert.equal(preflightAggregateTrial(d.directory,d.history).ready,true);
 http=syntheticPlanHttp({onGenerate:body=>{const bytes=Buffer.concat(aggregateTranscript({body})),count=bytes.toString('utf8').split('\n\n').filter(Boolean).length;assert.equal(count,159);assert.ok(bytes.length<65536);eventCounts.push(count);streamByteCounts.push(bytes.length);return new Response(bytes);}});http.install();
 const out=await executeAggregateTrial({...d,onReady:http.onReady});assert.equal(out.receipt.status,'completed');assert.equal(out.receipt.external_calls_started,3);assert.equal(http.bodies.length,3);
 const replay=await executeAggregateTrial({...d,onReady:()=>assert.fail('replay login')});assert.deepEqual(replay.dream,out.dream);assert.deepEqual(replay.wake,out.wake);assert.equal(http.bodies.length,3);assert.equal(preflightAggregateTrial(d.directory,d.history).ready,false);
 assert.ok(runDreambook(['read','--latest','--data-dir',d.directory]).includes(out.dream.scenes[0].event));
 for(const [k,v]of Object.entries(d.history))assert.equal(fs.readFileSync(path.join(v,'state.json'),'utf8'),before[k]);
 const store=new Store(d.directory);store.withdraw('fictional-plan-window-memory');store.close();assert.ok(runDreambook(['read','--latest','--data-dir',d.directory]).includes('没有可查看'));assert.throws(()=>preflightAggregateTrial(d.directory,d.history),/source_withdrawn/);
 console.log(JSON.stringify({command:'node scripts/check-aggregate-plan-entry.mjs',node:process.version,platform:process.platform,kind:'synthetic_end_to_end_entry_not_user_consent',syntheticHistoricalSetupPerformed:true,protocolVersion:aggregateTrialProposal().protocol_version,decoderVersion:aggregateTrialProposal().decoderVersion,aggregateEventLimit:aggregateTrialProposal().localLimits.events,syntheticEventsPerStage:eventCounts,syntheticStreamBytes:streamByteCounts,status:out.receipt.status,candidateSyntheticHttpRequests:3,externalRequestIntents:3,savedScenes:2,wakeSaved:true,usageRows:out.receipt.usage.length,replayAdditionalHttpRequests:0,oldStateBytesUnchanged:true,originalAndWakeUnchanged:true,genericReaderSupported:true,withdrawalSuppressesReopenedRead:true,syntheticRevocationConfirmed:out.authorization.remoteRevocationConfirmed,realModelRequests:0,realLoginAttempts:0,realCredentialReads:0,userStoreAccessed:false,realUserApprovalRecorded:false,extraCreditsApproved:false,realInferenceQualified:false,qualityAssessed:false},null,2));
}finally{http?.restore();for(const fn of cleanups.reverse())await fn();}
