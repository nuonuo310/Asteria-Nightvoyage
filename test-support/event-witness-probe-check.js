import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {eventWitnessProbeFixture,eventWitnessApproval} from './event-witness-probe-fixtures.js';
import {syntheticPlanHttp} from './plan-trial-fixtures.js';
import {initEventWitnessProbe,preflightEventWitnessProbe,executeEventWitnessProbe} from '../scripts/event-witness-probe.mjs';
import {Store} from '../src/store.js';
export async function checkEventWitnessProbe(){
 const cleanup=[],d=await eventWitnessProbeFixture({after:fn=>cleanup.push(fn)});
 try{
 const before=Object.fromEntries(Object.entries(d.history).map(([k,v])=>[k,fs.readFileSync(path.join(v,'state.json'),'utf8')]));
 assert.equal(preflightEventWitnessProbe(d.directory,d.history).ready,false);initEventWitnessProbe(d.directory,d.history,eventWitnessApproval());
 const http=syntheticPlanHttp({onGenerate:()=>new Response(Buffer.from('data:{"type":"response.failed","secret":"SYNTHETIC-SECRET"}\n\n'))});http.install();let out,replay;
 try{out=await executeEventWitnessProbe({...d,onReady:http.onReady});const calls=http.calls.length;replay=await executeEventWitnessProbe({...d,onReady:()=>assert.fail('replay login')});assert.equal(http.calls.length,calls);}finally{http.restore();}
 assert.equal(out.validation_diagnostic.check,'reviewed_unsupported_event');assert.equal(out.validation_diagnostic.witness.classification,'reviewed_event');assert.equal(out.diagnosticDecision,'review_named_event_schema');assert.deepEqual(replay,out);assert.equal(out.remoteRevocationConfirmed,true);assert.equal(out.external_calls_started,1);assert.equal(http.bodies.length,1);
 for(const [k,v]of Object.entries(d.history))assert.equal(fs.readFileSync(path.join(v,'state.json'),'utf8'),before[k]);
 const s=new Store(d.directory);for(const key of ['entries','runs','requests','sessions','recalls'])assert.deepEqual(s.state[key],{});assert.equal(JSON.stringify(s.state).includes('SYNTHETIC-SECRET'),false);s.withdraw('fictional-plan-window-memory');s.close();assert.throws(()=>preflightEventWitnessProbe(d.directory,d.history),/source_withdrawn/);
 return {command:'node scripts/check-event-witness-probe.mjs',node:process.version,platform:process.platform,contractVersion:'plan-event-witness-probe-v1',protocolVersion:'plan-event-witness-probe-http-v1',confirmationOrigin:'independent_synthetic_fixture_not_user_consent',diagnosticMockedRequestIntents:1,classification:'reviewed_unsupported_event',classificationScope:'closed_event_witness',eventCode:out.validation_diagnostic.witness.eventCode,diagnosticDecision:out.diagnosticDecision,replayAdditionalCalls:0,replayAdditionalLogins:0,ancestorStatesUnchanged:true,dreamEntriesSaved:0,persistedGeneratedBody:false,withdrawalBlocksReopen:true,realModelRequests:0,userStoreAccessed:false,realUserApprovalRecorded:false,providerNetworkTested:false,qualityAssessed:false};
 }finally{for(const fn of cleanup.reverse())await fn();}
}
