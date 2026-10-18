import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {OfflineAggregateEnvelopeStream,aggregateEnvelopeLimits} from './offline-aggregate-envelope.mjs';
import {OfflineAggregatePlanAdapter,selectAdapter} from './offline-aggregate-model-port.mjs';
import {ModelPortNightvoyage} from './offline-aggregate-model-runtime.mjs';
import {envelopeTrialProposal} from './envelope-plan-trial.mjs';
import {envelopeSeed,aggregateEvents} from '../test-support/offline-aggregate-fixtures.js';
import {envelopeBytes} from '../test-support/offline-plan-envelope-fixtures.js';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-aggregate-check-')),directory=path.join(root,'book'),input=envelopeSeed(),audits=[];let engine,calls=0;
const adapter=new OfflineAggregatePlanAdapter({model_id:'synthetic-aggregate-model',simulator:draft=>{
 calls++;const events=aggregateEvents(draft),bytes=envelopeBytes(events),decoder=new OfflineAggregateEnvelopeStream(draft.body.model);
 decoder.push(bytes);const audit=decoder.finish().envelopeAudit;assert.ok(audit.processedEvents>128);assert.ok(audit.streamBytes<65536);audits.push(audit);
 const chunks=[];for(let i=0;i<bytes.length;i+=13)chunks.push(bytes.subarray(i,i+13));return chunks;
}}),open=()=>engine=new ModelPortNightvoyage(directory,{selection:selectAdapter({primary:adapter})});
try{
 open();const id=engine.start('synthetic-aggregate-check','synthetic-aggregate-check',input);await engine.execute(id);const r=engine.result(id);assert.equal(r.receipt.status,'completed');assert.equal(calls,3);
 const original=engine.read(r.dream.id),wake=structuredClone(r.wake);for(const kind of ['recollection','imagined_continuation'])engine.append(r.dream.id,kind,'SYNTHETIC-AGGREGATE-LATER');assert.deepEqual(engine.read(r.dream.id),original);
 const recall=engine.recall('clock','synthetic-cue',1);assert.equal(recall.length,1);assert.equal(recall[0].origin,'dream');assert.equal(recall[0].isRealityFact,false);
 const before=fs.readFileSync(path.join(directory,'state.json'),'utf8');for(const value of ['SYNTHETIC-AGGREGATE-REASONING','SYNTHETIC-ENCRYPTED-PRIVATE'])assert.ok(!before.includes(value));
 engine.close();open();assert.equal(engine.start('replay-request','synthetic-aggregate-check',input),id);await engine.execute(id);assert.equal(calls,3);assert.deepEqual(engine.read(r.dream.id),original);assert.deepEqual(engine.result(id).wake,wake);
 engine.withdraw(input.sources[0].id);engine.close();open();assert.equal(engine.result(id).dream,null);assert.deepEqual(engine.list(),[]);assert.deepEqual(engine.recall('clock','synthetic-cue',1),[]);await engine.execute(id);assert.equal(calls,3);
 const after=fs.readFileSync(path.join(directory,'state.json'),'utf8');for(const value of [input.sources[0].text,r.dream.scenes[0].event,r.wake.fragment,'SYNTHETIC-AGGREGATE-LATER'])assert.ok(!after.includes(value));
 envelopeTrialProposal();
 console.log(JSON.stringify({command:'node scripts/check-offline-aggregate-envelope.mjs',node:process.version,platform:process.platform,kind:'synthetic_offline_aggregate_lifecycle',protocolVersion:adapter.identity.protocol_version,limits:aggregateEnvelopeLimits,status:r.receipt.status,simulatorStageCalls:calls,externalCallsStarted:r.receipt.external_calls_started,savedScenes:r.receipt.checkpoint.saved_scenes,wakeSaved:r.receipt.checkpoint.wake_saved,usageRows:r.receipt.usage.length,audits,replayAdditionalStageCalls:calls-3,originalAndWakeUnchanged:true,appendsDoNotOverwriteOriginal:true,reasoningNotPersisted:true,recallOrigin:recall[0].origin,recallIsRealityFact:recall[0].isRealityFact,withdrawalSuppressesReopenedReadRecallAndReplay:true,managedBodiesPurged:true,sourceGrantsNoEgress:input.sources.every(s=>s.grant.modelEgress===false),liveProposalPinsUnchanged:true,realModelRequests:0,credentialReads:0,userStoreAccessed:false,liveAdapterAvailable:false,realUserApprovalRecorded:false,historicalResponseRecovered:false,qualityAssessed:false,semanticSupport:'not_assessed',asteriaAdapter:'pending'},null,2));
}finally{engine?.close();fs.rmSync(root,{recursive:true,force:true});}
