import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {eventClassProbeFixture,eventClassApproval} from './event-class-probe-fixtures.js';
import {syntheticPlanHttp} from './plan-trial-fixtures.js';
import {initEventClassProbe,preflightEventClassProbe,executeEventClassProbe} from '../scripts/event-class-probe.mjs';
import {Store} from '../src/store.js';
export async function checkEventClassProbe(){
 const cleanup=[],d=await eventClassProbeFixture({after:fn=>cleanup.push(fn)});
 try{
 const before=Object.fromEntries(Object.entries(d.history).map(([k,v])=>[k,fs.readFileSync(path.join(v,'state.json'),'utf8')]));
 assert.equal(preflightEventClassProbe(d.directory,d.history).ready,false);initEventClassProbe(d.directory,d.history,eventClassApproval());
 const http=syntheticPlanHttp({onGenerate:()=>new Response(Buffer.from('data:{"type":"response.failed","secret":"SYNTHETIC-SECRET"}\n\n'))});http.install();let out,replay;
 try{out=await executeEventClassProbe({...d,onReady:http.onReady});const calls=http.calls.length;replay=await executeEventClassProbe({...d,onReady:()=>assert.fail('replay login')});assert.equal(http.calls.length,calls);}finally{http.restore();}
 assert.equal(out.validation_diagnostic.check,'upstream_failed_event');assert.deepEqual(replay,out);assert.equal(out.remoteRevocationConfirmed,true);assert.equal(out.external_calls_started,1);assert.equal(http.bodies.length,1);
 for(const [k,v]of Object.entries(d.history))assert.equal(fs.readFileSync(path.join(v,'state.json'),'utf8'),before[k]);
 const s=new Store(d.directory);for(const key of ['entries','runs','requests','sessions','recalls'])assert.deepEqual(s.state[key],{});assert.equal(JSON.stringify(s.state).includes('SYNTHETIC-SECRET'),false);s.withdraw('fictional-plan-window-memory');s.close();assert.throws(()=>preflightEventClassProbe(d.directory,d.history),/source_withdrawn/);
 return {command:'node scripts/check-event-class-probe.mjs',node:process.version,platform:process.platform,contractVersion:'plan-rejected-event-probe-v1',protocolVersion:'plan-rejected-event-probe-http-v1',confirmationOrigin:'independent_synthetic_fixture_not_user_consent',mockedRequestIntents:1,classification:'upstream_failed_event',classificationScope:'rejected_type_only',replayAdditionalCalls:0,replayAdditionalLogins:0,ancestorStatesUnchanged:true,dreamEntriesSaved:0,persistedGeneratedBody:false,withdrawalBlocksReopen:true,realModelRequests:0,userStoreAccessed:false,realUserApprovalRecorded:false,providerNetworkTested:false,qualityAssessed:false};
 }finally{for(const fn of cleanup.reverse())await fn();}
}
