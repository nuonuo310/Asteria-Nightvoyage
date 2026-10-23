import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {OfflineAggregateIntegrationAdapter,selectAdapter,offlineAggregateIntegrationVersion,offlineAggregateIntegrationModel,offlineAggregateIntegrationLimits} from './offline-aggregate-integration-port.mjs';
import {ModelPortNightvoyage} from './offline-aggregate-integration-runtime.mjs';
import {OfflineAggregateEnvelopeStream} from './offline-aggregate-envelope.mjs';
import {boundedOfflineAggregateChunks} from './offline-aggregate-integration-http.mjs';
import {envelopeDiagnostic} from './envelope-diagnostic.mjs';
import {dreamModelPortVersion,stageRequest} from './dream-model-port.mjs';
import {runDreambook} from './dreambook.mjs';
import {envelopeSeed,aggregateTranscript} from '../test-support/offline-aggregate-fixtures.js';
import {shapeCompletion,shapeFrame,shapeModel} from '../test-support/plan-output-shape-cases.js';
const progressFrame=Buffer.from('data: {"type":"response.in_progress"}\n\n');
const requestFor=()=>stageRequest({contract_version:dreamModelPortVersion,request_id:'synthetic-integration-check-request',run_id:'synthetic-integration-check-run',stage:'scene',index:0,snapshot:envelopeSeed(),scenes:[]});
function directDiagnostic(bytes){
 const decoder=new OfflineAggregateEnvelopeStream(shapeModel);
 try{decoder.push(bytes);decoder.finish();return null;}catch(error){return envelopeDiagnostic(error);}
}
async function asyncDiagnostic(action){try{await action();}catch(error){return envelopeDiagnostic(error);}throw Error('synthetic_checked_stream_unexpectedly_accepted');}
function aggregateBytes(total){return Buffer.concat([...Array(total-1).fill(progressFrame),Buffer.from(shapeFrame(shapeCompletion()))]);}
const total1024=directDiagnostic(aggregateBytes(1024));
assert.equal(total1024,null);
const total1025=directDiagnostic(aggregateBytes(1025));
assert.deepEqual(total1025,{schemaVersion:1,layer:'responses_envelope',check:'event_limit'});
const total128=directDiagnostic(aggregateBytes(128));
assert.equal(total128,null);
const total129=directDiagnostic(aggregateBytes(129));
assert.equal(total129,null);
const http=await asyncDiagnostic(async()=>{for await(const chunk of boundedOfflineAggregateChunks([Buffer.alloc(65537)]))void chunk;});
assert.deepEqual(http,{schemaVersion:1,layer:'http',check:'http_stream_limit'});
const outer=directDiagnostic(Buffer.alloc(65537));
assert.deepEqual(outer,{schemaVersion:1,layer:'responses_envelope',check:'stream_byte_limit'});
const eventCount=directDiagnostic(Buffer.concat(Array.from({length:1025},()=>progressFrame)));
assert.deepEqual(eventCount,{schemaVersion:1,layer:'responses_envelope',check:'event_limit'});
const type='response.output_text.delta',eventValue={type,output_index:1,item_id:'synthetic-message',content_index:0,delta:'x'.repeat(65382)};
const innerFrame=Buffer.from(`data: ${JSON.stringify(eventValue)}\n\n`);
assert.ok(innerFrame.length<offlineAggregateIntegrationLimits.httpStreamBytes);
const inner=await asyncDiagnostic(()=>new OfflineAggregateIntegrationAdapter({model_id:offlineAggregateIntegrationModel,simulator:()=>[innerFrame]}).generate(requestFor()));
assert.deepEqual(inner,{schemaVersion:1,layer:'responses_protocol',check:'plan_stream_limit'});
const root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-integration-check-')),directory=path.join(root,'book'),input=envelopeSeed();let engine,calls=0;
const adapter=new OfflineAggregateIntegrationAdapter({model_id:offlineAggregateIntegrationModel,simulator:draft=>{calls++;return aggregateTranscript(draft);}}),selection=selectAdapter({primary:adapter}),open=()=>engine=new ModelPortNightvoyage(directory,{selection});
try{
 open();const id=engine.start('synthetic-integration-check','synthetic-integration-check',input);await engine.execute(id);const result=engine.result(id);assert.equal(result.receipt.status,'completed');assert.equal(calls,3);assert.equal(result.receipt.external_calls_started,0);assert.equal(result.receipt.stage_dispatches_started,3);assert.equal(result.receipt.checkpoint.saved_scenes,2);assert.equal(result.receipt.checkpoint.wake_saved,true);assert.equal(result.receipt.validation_diagnostic,null);assert.equal(result.receipt.model_id,offlineAggregateIntegrationModel);assert.equal(result.receipt.protocol_version,offlineAggregateIntegrationVersion);
 const original=engine.read(result.dream.id),wake=structuredClone(result.wake);for(const kind of ['recollection','imagined_continuation'])engine.append(result.dream.id,kind,'SYNTHETIC-INTEGRATION-CHECK-LATER');assert.deepEqual(engine.read(result.dream.id),original);
 const cue=engine.recall('clock','synthetic-integration-cue',1);assert.equal(cue.length,1);assert.equal(cue[0].origin,'dream');assert.equal(cue[0].isRealityFact,false);
 const before=fs.readFileSync(path.join(directory,'state.json'),'utf8');for(const secret of ['SYNTHETIC-AGGREGATE-REASONING','SYNTHETIC-ENCRYPTED-PRIVATE'])assert.ok(!before.includes(secret));engine.close();
 const book=runDreambook(['read','--latest','--data-dir',directory]);assert.ok(book.includes(result.dream.scenes[0].event));assert.ok(!book.includes('SYNTHETIC-AGGREGATE-REASONING'));
 open();assert.equal(engine.start('check-replay','synthetic-integration-check',input),id);await engine.execute(id);assert.equal(calls,3);assert.deepEqual(engine.read(result.dream.id),original);assert.deepEqual(engine.result(id).wake,wake);
 engine.withdraw(input.sources[0].id);engine.close();const withdrawnBook=runDreambook(['read','--latest','--data-dir',directory]);open();assert.equal(engine.result(id).dream,null);assert.deepEqual(engine.list(),[]);assert.deepEqual(engine.recall('clock','synthetic-integration-cue',1),[]);await engine.execute(id);assert.equal(calls,3);assert.ok(!withdrawnBook.includes(result.dream.scenes[0].event));
 const after=fs.readFileSync(path.join(directory,'state.json'),'utf8');for(const body of [input.sources[0].text,result.dream.scenes[0].event,result.wake.fragment,'SYNTHETIC-INTEGRATION-CHECK-LATER'])assert.ok(!after.includes(body));
 console.log(JSON.stringify({command:'node scripts/check-offline-aggregate-integration.mjs',node:process.version,platform:process.platform,kind:'synthetic_offline_aggregate_integration',protocolVersion:offlineAggregateIntegrationVersion,contractVersion:dreamModelPortVersion,model:offlineAggregateIntegrationModel,limits:offlineAggregateIntegrationLimits,status:result.receipt.status,simulatorStageCalls:calls,externalCallsStarted:result.receipt.external_calls_started,savedScenes:result.receipt.checkpoint.saved_scenes,wakeSaved:result.receipt.checkpoint.wake_saved,usageRows:result.receipt.usage.length,diagnostics:{http,outerBytes:outer,events:eventCount,innerStrict:inner},eventBoundaries:{accepted128:total128===null,accepted129:total129===null,accepted1024:total1024===null,rejected1025:total1025.check==='event_limit'},replayAdditionalCalls:calls-3,originalAndWakeUnchanged:true,readerClosedLoop:book.includes(result.dream.scenes[0].event),reasoningNotPersisted:true,recallOrigin:cue[0].origin,recallIsRealityFact:cue[0].isRealityFact,withdrawalSuppressesReadRecallReplayAndReader:true,managedBodiesPurged:true,sourceGrantsNoEgress:input.sources.every(source=>source.grant.modelEgress===false),realModelRequests:0,credentialReads:0,userStoreAccessed:false,liveAdapterAvailable:false,historicalResponseRecovered:false,qualityAssessed:false,semanticSupport:'not_assessed',asteriaAdapter:'pending'},null,2));
}finally{engine?.close();fs.rmSync(root,{recursive:true,force:true});}
