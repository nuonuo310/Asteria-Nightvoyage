import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {reviewedEventTypes,responseEventCoverage,responseEventCoverageSummary} from '../scripts/response-event-coverage.mjs';
import {OfflineEventClassEnvelopeStream} from '../scripts/offline-event-class-envelope.mjs';
import {rejectedEventDiagnostic} from '../scripts/rejected-event-class.mjs';
import {eventClassProbeProposal} from '../scripts/event-class-probe.mjs';
import {aggregateTrialProposal} from '../scripts/aggregate-plan-trial.mjs';
import {readInlinePaidContract} from '../src/inline-paid-contract.js';
import {aggregateTranscript,envelopeSeed} from '../test-support/offline-aggregate-fixtures.js';
import {createFrozenInlineEntrySource} from '../test-support/frozen-inline-entry-source.js';
const frozenSource=createFrozenInlineEntrySource();after(frozenSource.cleanup);

test('static reference audit distinguishes routing from event acceptance and discloses incomplete service coverage',()=>{
 const summary=responseEventCoverageSummary();assert.equal(summary.reviewedReferenceNames,59);assert.equal(new Set(reviewedEventTypes).size,59);assert.deepEqual(summary.routes,{classified_rejection_route:6,unreviewed_documented_audio:4,unreviewed_documented_tool:32,core_validation_route:9,reasoning_validation_route:6,refusal_rejection_route:2});assert.equal(summary.acceptanceChanged,false);assert.equal(summary.historicalTypeRecoverable,false);assert.equal(summary.providerSchemaCompatibilityValidated,false);
 const manifest=JSON.parse(fs.readFileSync(new URL('../test-support/reviewed-response-event-types.json',import.meta.url),'utf8'));assert.equal(manifest.scope,'reviewed_static_reference_names_not_all_possible_service_events');assert.ok(Object.isFrozen(reviewedEventTypes));summary.routes.core_validation_route=999;assert.equal(responseEventCoverageSummary().routes.core_validation_route,9);
});
test('every documented tool/audio counterexample still collapses to the old unreviewed label with no body',()=>{
 let count=0;for(const type of reviewedEventTypes){if(!responseEventCoverage(type).startsWith('unreviewed_documented_'))continue;const parser=new OfflineEventClassEnvelopeStream('gpt-5.6-sol');assert.throws(()=>parser.push(Buffer.from('data:'+JSON.stringify({type,secret:'SYNTHETIC-SECRET',id:'SYNTHETIC-ID'})+'\n\n')),error=>{const d=rejectedEventDiagnostic(error);assert.deepEqual(d,{schemaVersion:1,layer:'rejected_response_event',check:'unreviewed_event'});assert.equal(JSON.stringify(d).includes('SECRET'),false);return true;});assert.throws(()=>parser.finish());count++;}assert.equal(count,36);
});
test('arbitrary names, near matches, nonstrings and dangerous keys cannot be inferred as documented event types',()=>{
 let touched=false;const object={toString(){touched=true;return 'response.created';}};
 for(const value of [null,undefined,{},[],object,42])assert.equal(responseEventCoverage(value),'invalid_type');assert.equal(touched,false);
 for(const value of ['','response.audio.SYNTHETIC-PRIVATE','response.created\n',' response.created','Response.created','constructor','__proto__','response.created.SYNTHETIC','x'.repeat(70000)]){assert.equal(responseEventCoverage(value),'outside_reviewed_catalogue');assert.equal(JSON.stringify(responseEventCoverage(value)).includes(value||'never-matches'),false);}
});
test('the recorded label does not distinguish supported-reference tools, arbitrary protocol names or an empty type',()=>{
 for(const type of ['response.audio.delta','response.function_call_arguments.delta','synthetic.other','']){const parser=new OfflineEventClassEnvelopeStream('gpt-5.6-sol');assert.throws(()=>parser.push(Buffer.from('data:'+JSON.stringify({type})+'\n\n')),e=>rejectedEventDiagnostic(e)?.check==='unreviewed_event');}
 const parser=new OfflineEventClassEnvelopeStream('gpt-5.6-sol');assert.throws(()=>parser.push(Buffer.from('data:{"type":12}\n\n')),e=>rejectedEventDiagnostic(e)?.check==='event_shape');
});
test('audit does not replace native source pins or weaken complete-stream/stage validation',()=>{
 assert.ok(eventClassProbeProposal());assert.ok(aggregateTrialProposal());assert.throws(()=>readInlinePaidContract({allowExpired:true}),/paid_contract_source_changed/);assert.ok(readInlinePaidContract({repositoryRoot:frozenSource.directory,allowExpired:true}));const draft={body:{model:'gpt-5.6-sol',input:[{content:JSON.stringify({snapshot:envelopeSeed,scenes:[],stage:'scene',index:0})}]}};
 const p=new OfflineEventClassEnvelopeStream('gpt-5.6-sol');for(const b of aggregateTranscript(draft))p.push(b);const result=p.finish();assert.equal(result.usage.totalTokens,20);assert.equal(result.envelopeAudit.reasoningReturned,false);
});
test('standalone audit forbids any fetch and reports only aggregate synthetic counts',()=>{
 const env={...process.env};delete env.NODE_TEST_CONTEXT;const code=`globalThis.fetch=()=>{throw Error('UNEXPECTED-NETWORK');};await import(${JSON.stringify(new URL('../scripts/check-response-event-coverage.mjs',import.meta.url).href)});`;const c=spawnSync(process.execPath,['--input-type=module','-e',code],{encoding:'utf8',env});assert.equal(c.status,0,c.stderr);const out=JSON.parse(c.stdout);assert.equal(out.scriptedAmbiguousRejections,36);assert.equal(out.realModelRequests,0);assert.equal(out.userStoreAccessed,false);assert.equal(out.credentialsRead,false);assert.equal(out.dispatchAttempts,0);assert.equal(c.stdout.includes('SYNTHETIC-SECRET'),false);
});
