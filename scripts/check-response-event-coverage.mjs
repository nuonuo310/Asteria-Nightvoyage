// Independent synthetic frame replay. No Store, OAuth, credentials or network.
import assert from 'node:assert/strict';
import {reviewedEventTypes,responseEventCoverage,responseEventCoverageSummary} from './response-event-coverage.mjs';
import {OfflineEventClassEnvelopeStream} from './offline-event-class-envelope.mjs';
import {rejectedEventDiagnostic} from './rejected-event-class.mjs';
let rejected=0;
for(const type of reviewedEventTypes){
 if(!responseEventCoverage(type).startsWith('unreviewed_documented_'))continue;
 const parser=new OfflineEventClassEnvelopeStream('gpt-5.6-sol');let diagnostic;
 try{parser.push(Buffer.from(`data: ${JSON.stringify({type,secret:'SYNTHETIC-NOT-USER-DATA'})}\n\n`));}catch(error){diagnostic=rejectedEventDiagnostic(error);}
 assert.deepEqual(diagnostic,{schemaVersion:1,layer:'rejected_response_event',check:'unreviewed_event'});rejected++;
}
assert.equal(rejected,36);
console.log(JSON.stringify({command:'node scripts/check-response-event-coverage.mjs',node:process.version,platform:process.platform,...responseEventCoverageSummary(),scriptedAmbiguousRejections:rejected,userStoreAccessed:false,credentialsRead:false,dispatchAttempts:0},null,2));
