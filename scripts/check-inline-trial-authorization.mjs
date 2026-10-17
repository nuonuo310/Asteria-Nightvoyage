// Synthetic intent records and a local transport, never the user's approvals.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {Store} from '../src/store.js';
import {hash} from '../src/contract.js';
import {readAppraisalView} from '../src/appraisal-view.js';
import {InlineTrialRehearsalRuntime} from '../src/inline-trial-rehearsal-runtime.js';
import {readInlineTrialAuthorization,inlineTrialAllowanceId} from '../src/inline-trial-authorization.js';
import {prepareTrialHistory,trialTransport,trialFixtureNow} from '../test-support/inline-trial-fixtures.js';
const cleanups=[],env=process.env,native=globalThis.fetch;let keys=0,requests=0,calls=0,e,s;
process.env=new Proxy(env,{get(target,key){if(key==='NIGHTVOYAGE_DEEPSEEK_KEY'){keys++;throw Error('credential_forbidden');}return Reflect.get(target,key);}});globalThis.fetch=()=>{requests++;throw Error('native_network_forbidden');};
try{
  const live=prepareTrialHistory({after:f=>cleanups.push(f)},{mode:'live'});s=new Store(live.directory);assert.equal(readInlineTrialAuthorization(s).mode,'live');assert.equal(s.state.billing.accounts[inlineTrialAllowanceId].runIds.length,0);s.close();assert.throws(()=>new InlineTrialRehearsalRuntime(live.directory,{fetchImpl:trialTransport}),/existing_matching_trial_authorization_required/);
  const h=prepareTrialHistory({after:f=>cleanups.push(f)});e=new InlineTrialRehearsalRuntime(h.directory,{enabled:true,fetchImpl:async(u,r)=>{calls++;return trialTransport(u,r);}});const id=e.start();await e.execute(id);const packet=e.result(id);assert.equal(packet.receipt.status,'completed');assert.equal(calls,3);assert.equal(readAppraisalView(e.store,packet.dream.id).status,'available');assert.equal(e.recall(packet.dream.scenes[0].event.slice(0,4),'trial-cue')[0].origin,'dream');assert.ok(packet.receipt.billing.every(r=>r.status==='settled'));e.close();
  e=new InlineTrialRehearsalRuntime(h.directory,{enabled:true,fetchImpl:()=>{throw Error('duplicate');}});assert.equal(e.start(),id);await e.execute(id);for(const [name,a]of Object.entries(h.oldAccounts))assert.equal(hash(e.store.state.billing.accounts[name]),hash(a));const bodies=packet.dream.scenes.map(s=>s.event);e.store.withdraw('q-sparse-memory');e.close();s=new Store(h.directory);assert.throws(()=>readInlineTrialAuthorization(s),/source_withdrawn/);for(const name of fs.readdirSync(h.directory)){const p=path.join(h.directory,name);if(fs.statSync(p).isFile())for(const b of bodies)assert.ok(!fs.readFileSync(p,'utf8').includes(b));}assert.equal(keys,0);assert.equal(requests,0);
  console.log(JSON.stringify({command:'node scripts/check-inline-trial-authorization.mjs',node:process.version,platform:process.platform,fixtureClock:new Date(trialFixtureNow).toISOString(),confirmationOrigin:'independent_synthetic_fixture_not_user_consent',liveIntentFixtureSaved:true,liveIntentFixtureDispatches:0,atomicGrantAndAccount:true,persistedBaselineCompared:true,stubCalls:calls,settledRows:packet.receipt.billing.length,syntheticSettledMicroCny:packet.receipt.budget.heldOrSpentMicroCny,replayAdditionalCalls:0,appraisalViewAvailable:true,recallOrigin:'dream',oldAccountsUnchanged:true,withdrawalPurgedAfterReopen:true,credentialReads:keys,nativeRequests:requests,realModelRequests:0,userStoreAccessed:false,realUserApprovalRecorded:false,liveEntryAvailable:false,qualityAssessed:false,semanticSupport:'not_assessed'},null,2));
}finally{e?.close();s?.close();process.env=env;globalThis.fetch=native;for(const cleanup of cleanups.reverse())cleanup();}
