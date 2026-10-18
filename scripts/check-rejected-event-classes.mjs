import assert from 'node:assert/strict';
import {OfflineEventClassEnvelopeStream} from './offline-event-class-envelope.mjs';
import {OfflineAggregateEnvelopeStream} from './offline-aggregate-envelope.mjs';
import {rejectedEventClass,rejectedEventDiagnostic} from './rejected-event-class.mjs';
import {envelopeDiagnostic} from './envelope-diagnostic.mjs';
import {aggregateTrialProposal} from './aggregate-plan-trial.mjs';
import {envelopeEvents,envelopeBytes,shapeModel} from '../test-support/offline-plan-envelope-fixtures.js';
const cases=['response.failed','response.incomplete','error','response.queued','response.output_text.annotation.added','response.compaction.compacting','synthetic.unreviewed'],results=[];
for(const type of cases){
 const events=envelopeEvents();events.splice(2,0,{type,text:'SYNTHETIC-PRIVATE-NOT-RETURNED'});const bytes=envelopeBytes(events),old=new OfflineAggregateEnvelopeStream(shapeModel),candidate=new OfflineEventClassEnvelopeStream(shapeModel);let diagnostic;
 assert.throws(()=>old.push(bytes),error=>envelopeDiagnostic(error)?.check==='unknown_event');
 assert.throws(()=>candidate.push(bytes),error=>{diagnostic=rejectedEventDiagnostic(error);return diagnostic?.check===rejectedEventClass(type);});
 assert.ok(!JSON.stringify(diagnostic).includes('PRIVATE'));assert.throws(()=>candidate.finish(),/closed/);
 results.push({syntheticClass:diagnostic.check,currentNativeCheck:'unknown_event',candidateRejected:true,bodyReturned:false});
}
aggregateTrialProposal();
console.log(JSON.stringify({command:'node scripts/check-rejected-event-classes.mjs',node:process.version,platform:process.platform,kind:'independent_synthetic_rejection_classification',protocolVersion:'offline-rejected-event-classification-v1',results,typeClassificationOnly:true,payloadSchemaValidated:false,newlyAcceptedEvents:0,liveSourcePinsUnchanged:true,liveDiagnosticChanged:false,realModelRequests:0,loginAttempts:0,credentialReads:0,userStoreAccessed:false,historicalEventNameKnown:false,historicalCauseRecoverable:false,historicalQuotaFailureConfirmed:false,qualityAssessed:false},null,2));
