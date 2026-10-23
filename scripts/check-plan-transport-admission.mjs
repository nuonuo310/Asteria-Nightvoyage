// Synthetic OAuth/HTTP and aggregate-boundary admission check. No real network,
// credential read, browser open, user Store or model inference is used.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {Store} from '../src/store.js';
import {snapshot} from '../src/contract.js';
import {planTransportAdmissionProposal,initPlanTransportAdmission,executePlanTransportAdmission} from './plan-transport-admission-trial.mjs';
import {planTransportAdmissionHttpVersion} from './plan-transport-admission-http.mjs';
import {OfflineAggregateEnvelopeStream} from './offline-aggregate-envelope.mjs';
import {envelopeDiagnostic} from './envelope-diagnostic.mjs';
import {runDreambook} from './dreambook.mjs';
import {syntheticPlanHttp} from '../test-support/plan-trial-fixtures.js';
import {aggregateTranscript} from '../test-support/offline-aggregate-fixtures.js';
import {shapeCompletion,shapeFrame,shapeModel} from '../test-support/plan-output-shape-cases.js';
const progressFrame=Buffer.from('data: {"type":"response.in_progress"}\n\n');
const fixture=new URL('../examples/plan-transport-admission.snapshot.json',import.meta.url);
const approval={approveFictionalSubscriptionTrial:true,confirmExtraCreditsDisabled:true,acknowledgeNoServerTokenCap:true,approveMissingContentTypeCompatibility:true,approveReasoningDiscard:true,approveAggregateStreamBudget:true,acknowledgeIndependentVersion:true,confirmNoFallbackOrCodex:true};
function diagnostic(bytes){
 const decoder=new OfflineAggregateEnvelopeStream(shapeModel);
 try{decoder.push(bytes);decoder.finish();return null;}catch(error){return envelopeDiagnostic(error);}
}
const aggregateBytes=total=>Buffer.concat([...Array(total-1).fill(progressFrame),Buffer.from(shapeFrame(shapeCompletion()))]);
const accepted128=diagnostic(aggregateBytes(128)),accepted129=diagnostic(aggregateBytes(129)),accepted1024=diagnostic(aggregateBytes(1024)),rejected1025=diagnostic(aggregateBytes(1025));
assert.equal(accepted128,null);assert.equal(accepted129,null);assert.equal(accepted1024,null);
assert.deepEqual(rejected1025,{schemaVersion:1,layer:'responses_envelope',check:'event_limit'});
const outerBytes=diagnostic(Buffer.alloc(65537));
assert.deepEqual(outerBytes,{schemaVersion:1,layer:'responses_envelope',check:'stream_byte_limit'});
const type='response.output_text.delta',empty={type,delta:''},n=65536-Buffer.byteLength(`data: ${JSON.stringify(empty)}\n\n`)-20,event={type,delta:'x'.repeat(n)};
const strictBytes=Buffer.from(`data: ${JSON.stringify(event)}\n\n`);
assert.ok(strictBytes.length<65536);assert.ok(Buffer.byteLength(`event: ${type}\ndata: ${JSON.stringify(event)}\n\n`)>65536);
const strictLimit=diagnostic(strictBytes);
assert.deepEqual(strictLimit,{schemaVersion:1,layer:'responses_protocol',check:'plan_stream_limit'});
const input=JSON.parse(fs.readFileSync(fixture,'utf8'));for(const source of input.sources)source.grant.modelEgress=true;
const snapshotValue=snapshot(input),root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-plan-admission-check-')),directory=path.join(root,'book'),connectionDirectory=path.join(root,'connection');
const http=syntheticPlanHttp({onGenerate:body=>new Response(Buffer.concat(aggregateTranscript({body})))});http.install();
try{
 initPlanTransportAdmission(directory,approval);
 const result=await executePlanTransportAdmission({directory,connectionDirectory,onReady:http.onReady});
 assert.equal(result.receipt.status,'completed');assert.equal(http.bodies.length,3);assert.equal(result.receipt.external_calls_started,3);assert.equal(result.receipt.checkpoint.saved_scenes,2);assert.equal(result.receipt.checkpoint.wake_saved,true);assert.equal(result.receipt.validation_diagnostic,null);
 assert.equal(result.dream.scenes.length,2);assert.ok(result.wake.fragment);
 assert.equal(result.receipt.protocol_version,planTransportAdmissionHttpVersion);assert.equal(result.receipt.model_id,'gpt-5.6-sol');
 assert.equal(result.receipt.adapter_kind,'ChatGPTPlanAdapter');assert.equal(result.receipt.provider_kind,'openai');assert.equal(result.receipt.auth_mode,'chatgpt_plan');
 const book=runDreambook(['read','--latest','--data-dir',directory]);assert.ok(book.includes(result.dream.scenes[0].event));assert.ok(!book.includes('SYNTHETIC-AGGREGATE-REASONING'));
 const before=http.bodies.length,replay=await executePlanTransportAdmission({directory,connectionDirectory,onReady:()=>assert.fail('terminal replay opened OAuth')});
 assert.equal(http.bodies.length,before);assert.equal(replay.receipt.status,'completed');
 const state=fs.readFileSync(path.join(directory,'state.json'),'utf8'),syntheticMarkers=[['SYNTHETIC','AGGREGATE','REASONING'],['SYNTHETIC','ENCRYPTED','PRIVATE'],['SYNTHETIC','TRIAL','ACCESS'],['SYNTHETIC','TRIAL','REFRESH']].map(parts=>parts.join('-'));for(const secret of syntheticMarkers)assert.ok(!state.includes(secret));
 const store=new Store(directory);store.withdraw(snapshotValue.sources[0].id);store.close();
 const withdrawn=await executePlanTransportAdmission({directory,connectionDirectory,onReady:()=>assert.fail('withdrawn replay opened OAuth')});
 assert.equal(http.bodies.length,before);assert.equal(withdrawn.dream,null);assert.equal(withdrawn.receipt.status,'revoked');
 const after=fs.readFileSync(path.join(directory,'state.json'),'utf8');for(const value of [result.dream.scenes[0].event,result.wake.fragment,snapshotValue.sources[0].text])assert.ok(!after.includes(value));
 const proposal=planTransportAdmissionProposal(),proposalHash=createHash('sha256').update(fs.readFileSync(new URL('../docs/proposals/nv-plan-transport-admission-01-v1.json',import.meta.url))).digest('hex');
 console.log(JSON.stringify({command:'node scripts/check-plan-transport-admission.mjs',node:process.version,platform:process.platform,kind:'synthetic_chatgpt_plan_transport_admission',admissionState:proposal.admissionState,protocolVersion:proposal.protocol_version,adapterKind:proposal.adapter_kind,providerKind:proposal.provider_kind,model:proposal.model_id,authMode:proposal.auth_mode,fixtureHash:proposal.fixtureHash,sourceIdentity:proposal.sourceIdentity,proposalHash,externalCallsStarted:result.receipt.external_calls_started,syntheticStageCalls:http.bodies.length,savedScenes:result.receipt.checkpoint.saved_scenes,wakeSaved:result.receipt.checkpoint.wake_saved,diagnostics:{http:'synthetic-transport-test-only',envelopeBytes:outerBytes,envelopeEvents:rejected1025,protocolBytes:strictLimit},eventBoundaries:{accepted128:accepted128===null,accepted129:accepted129===null,accepted1024:accepted1024===null,rejected1025:rejected1025.check==='event_limit'},readerClosedLoop:true,replayAdditionalCalls:0,withdrawalSuppressesReadbackAndReplay:true,reasoningNotPersisted:true,credentialsPersisted:false,realModelRequests:0,credentialReads:0,browserOpened:false,userStoreAccessed:false,qualityAssessed:false,semanticSupport:'not_assessed'},null,2));
}finally{http.restore();fs.rmSync(root,{recursive:true,force:true});}
