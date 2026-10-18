// Offline audit, never an event acceptance policy or a provider transport.
import fs from 'node:fs';
import {rejectedEventClass} from './rejected-event-class.mjs';
const manifest=JSON.parse(fs.readFileSync(new URL('../test-support/reviewed-response-event-types.json',import.meta.url),'utf8'));
const catalogue=new Set(manifest.eventTypes);
const core=new Set(['response.created','response.in_progress','response.completed','response.output_item.added','response.output_item.done','response.content_part.added','response.content_part.done','response.output_text.delta','response.output_text.done']);
const reasoning=new Set(['response.reasoning_summary_part.added','response.reasoning_summary_part.done','response.reasoning_summary_text.delta','response.reasoning_summary_text.done','response.reasoning_text.delta','response.reasoning_text.done']);
const refusal=new Set(['response.refusal.delta','response.refusal.done']);
export const eventCoverageVersion='offline-response-event-coverage-v1';
export const reviewedEventTypes=Object.freeze([...catalogue]);
// Fixed labels only. Prefixes do not admit a name: catalogue membership is exact.
export function responseEventCoverage(type){
 if(typeof type!=='string')return 'invalid_type';
 if(!catalogue.has(type))return 'outside_reviewed_catalogue';
 if(core.has(type))return 'core_validation_route';
 if(reasoning.has(type))return 'reasoning_validation_route';
 if(refusal.has(type))return 'refusal_rejection_route';
 if(rejectedEventClass(type)!=='unreviewed_event')return 'classified_rejection_route';
 return type.startsWith('response.audio.')?'unreviewed_documented_audio':'unreviewed_documented_tool';
}
export function responseEventCoverageSummary(){
 const counts={};for(const type of reviewedEventTypes){const route=responseEventCoverage(type);counts[route]=(counts[route]??0)+1;}
 return {reviewVersion:eventCoverageVersion,reviewedReferenceNames:reviewedEventTypes.length,routes:counts,acceptanceChanged:false,liveEnabled:false,historicalTypeRecoverable:false,providerSchemaCompatibilityValidated:false,realModelRequests:0,qualityAssessed:false};
}
