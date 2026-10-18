// Synthetic native-path rehearsal only. Never a real login or user-book selector.
import fs from 'node:fs';
import path from 'node:path';
import {missingTypeTrialFixture} from '../test-support/missing-type-trial-fixtures.js';
import {syntheticPlanHttp} from '../test-support/plan-trial-fixtures.js';
import {planTranscript} from '../test-support/model-port-protocol-fixtures.js';
import {initMissingTypeTrial,executeMissingTypeTrial,preflightMissingTypeTrial} from './missing-type-plan-trial.mjs';
import {readModelPortContent} from './missing-type-content-view.mjs';
import {Store} from '../src/store.js';
const cleanup=[];let http,store;
try{
 const d=await missingTypeTrialFixture({after:fn=>cleanup.push(fn)}),before=Object.fromEntries(Object.entries(d.history).map(([k,p])=>[k,fs.readFileSync(path.join(p,'state.json'),'utf8')]));
 initMissingTypeTrial(d.directory,d.history,{approveFictionalSubscriptionTrial:true,confirmExtraCreditsDisabled:true,acknowledgeNoServerTokenCap:true,approveMissingContentTypeCompatibility:true,acknowledgeConsumedDiagnostics:true});
 http=syntheticPlanHttp({onGenerate:body=>new Response(Buffer.concat(planTranscript({body})))});http.install();const out=await executeMissingTypeTrial({...d,onReady:http.onReady}),original=JSON.stringify(out.dream),wake=JSON.stringify(out.wake),calls=http.calls.length,replay=await executeMissingTypeTrial({...d,onReady:()=>{throw Error('synthetic_replay_login');}}),preflight=preflightMissingTypeTrial(d.directory,d.history);
 store=new Store(d.directory);const view=readModelPortContent(store,out.dream.id);store.close();store=new Store(d.directory);store.withdraw('fictional-plan-window-memory');store.close();store=new Store(d.directory);const withdrawn=readModelPortContent(store,out.dream.id);
 console.log(JSON.stringify({command:'node scripts/check-missing-type-plan-entry.mjs',node:process.version,platform:process.platform,kind:'independent_fictional_oauth_http_rehearsal',approvalOrigin:'synthetic_fixture_not_real_user_consent',protocolVersion:out.receipt.protocol_version,status:out.receipt.status,headerPolicy:out.receipt.headerPolicy,syntheticHistoricalSetupPerformed:true,candidateSyntheticHttpRequests:http.bodies.length,candidateExternalRequestIntents:out.receipt.external_calls_started,savedScenes:out.receipt.checkpoint.saved_scenes,wakeSaved:out.receipt.checkpoint.wake_saved,usageRows:out.receipt.usage.length,replayAdditionalHttpRequests:http.calls.length-calls,replayOriginalAndWakeUnchanged:JSON.stringify(replay.dream)===original&&JSON.stringify(replay.wake)===wake,grantConsumed:!preflight.ready,oldStateBytesUnchanged:Object.entries(d.history).every(([k,p])=>fs.readFileSync(path.join(p,'state.json'),'utf8')===before[k]),typedReadOrigin:view.narrative.dream.origin,typedReadIsRealityFact:view.narrative.dream.isRealityFact,withdrawalSuppressesReopenedRead:withdrawn===null,realModelRequests:0,realCredentialReads:0,realLoginAttempts:0,userStoreAccessed:false,realUserApprovalRecorded:false,realInferenceQualified:false,qualityAssessed:false,asteriaAdapter:'pending',nativeCodexTransport:'pending'},null,2));
}finally{if(store&&!store.closed)store.close();http?.restore();for(const fn of cleanup.reverse())fn();}
