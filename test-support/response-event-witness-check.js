import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {ResponseEventWitness,resolveReviewedEventCode,eventWitnessDecision,eventWitnessDiagnostic,eventWitnessVersion,eventWitnessCatalogueHash} from '../scripts/response-event-witness.mjs';
import {reviewedEventTypes,responseEventCoverage} from '../scripts/response-event-coverage.mjs';
import {OfflineEventWitnessEnvelopeStream} from '../scripts/offline-event-witness-envelope.mjs';
import {OfflineEventWitnessPlanAdapter,selectAdapter} from '../scripts/offline-event-witness-port.mjs';
import {ModelPortNightvoyage} from '../scripts/offline-event-witness-runtime.mjs';
import {envelopeBytes,shapeModel} from './offline-plan-envelope-fixtures.js';
import {aggregateEvents,envelopeSeed} from './offline-aggregate-fixtures.js';
import {eventClassProbeProposal} from '../scripts/event-class-probe.mjs';
import {readInlinePaidContract} from '../src/inline-paid-contract.js';
export async function checkResponseEventWitness(){
 let rejected=0;for(const type of reviewedEventTypes){const route=responseEventCoverage(type);if(!route.startsWith('unreviewed_documented_')&&route!=='classified_rejection_route')continue;const p=new OfflineEventWitnessEnvelopeStream(shapeModel);assert.throws(()=>p.push(envelopeBytes([{type}])),error=>{const d=eventWitnessDiagnostic(error);assert.equal(resolveReviewedEventCode(d.witness.eventCode),type);return true;});rejected++;}assert.equal(rejected,42);
 const tracker=new ResponseEventWitness();tracker.observe('response.created');const outside=tracker.observe('response.synthetic_private_name');assert.equal(eventWitnessDecision(outside),'provider_contract_unverified_stop');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-witness-check-')),directory=path.join(root,'book');let engine,calls=0;const adapter=new OfflineEventWitnessPlanAdapter({model_id:'synthetic-offline-witness',simulator:draft=>{calls++;const events=aggregateEvents(draft);events.splice(2,0,{type:'response.synthetic_private_name',secret:'SYNTHETIC-PRIVATE-BODY'});return [envelopeBytes(events)];}}),open=()=>engine=new ModelPortNightvoyage(directory,{selection:selectAdapter({primary:adapter})});
 try{open();const id=engine.start('synthetic-witness-check','synthetic-witness-check',envelopeSeed());await engine.execute(id);const diagnostic=engine.status(id).validation_diagnostic;assert.equal(engine.status(id).status,'failed');assert.equal(diagnostic.witness.ordinal,3);assert.equal(diagnostic.check,'outside_catalogue_event');engine.close();open();assert.deepEqual(engine.status(id).validation_diagnostic,diagnostic);await engine.execute(id);assert.equal(calls,1);assert.equal(engine.result(id).dream,null);engine.withdraw(envelopeSeed().sources[0].id);engine.close();open();assert.equal(engine.result(id).dream,null);assert.deepEqual(engine.recall('clock','synthetic-withdrawal',1),[]);const disk=fs.readFileSync(path.join(directory,'state.json'),'utf8');assert.equal(disk.includes('response.synthetic_private_name'),false);assert.equal(disk.includes('SYNTHETIC-PRIVATE-BODY'),false);assert.ok(eventClassProbeProposal());assert.ok(readInlinePaidContract({allowExpired:true}));
 return {command:'node scripts/check-response-event-witness.mjs',node:process.version,platform:process.platform,policyVersion:eventWitnessVersion,catalogueHash:eventWitnessCatalogueHash,reviewedReferenceNames:59,reviewedUnsupportedNamesStillRejected:rejected,outsideCatalogueDecision:eventWitnessDecision(outside),exampleOutsideWitness:outside,scriptedStageCalls:calls,externalCallIntents:0,reopened:true,replayAdditionalCalls:0,withdrawalSuppressesReadRecall:true,unknownNameOrBodyPersisted:false,oldNativeAndApiManifestsMatch:true,acceptanceChanged:false,nativeDispatchSupportedByOfflineAdapter:false,realModelRequests:0,credentialsRead:false,userStoreAccessed:false,historicalTypeRecoverable:false,qualityAssessed:false};
 }finally{engine?.close();fs.rmSync(root,{recursive:true,force:true});}
}
