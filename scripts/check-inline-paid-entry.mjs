// Independent fictional history + immutable rehearsal dispatch kind. Never user consent.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {Store} from '../src/store.js';
import {launchInlinePaid} from '../src/inline-paid-entry.js';
import {inlineChildEnvironment} from '../src/inline-stub-launcher.js';
import {prepareTrialHistory,trialFixtureNow} from '../test-support/inline-trial-fixtures.js';
const cleanups=[],environment=process.env;let keyRequests=0;
try{
  const h=prepareTrialHistory({after:f=>cleanups.push(f)},{mode:'live',dispatchKind:'rehearsal'});
  // These sentinels must not be inherited by the worker. No real credential is read.
  process.env={...inlineChildEnvironment(environment),NIGHTVOYAGE_DEEPSEEK_KEY:'DUMMY-INHERITED-FORBIDDEN',NODE_OPTIONS:'--require=deliberately-nonexistent-preload',NODE_PATH:'DUMMY-MODULE-PATH',HTTPS_PROXY:'DUMMY-PROXY'};
  const first=await launchInlinePaid('rehearse',h.directory,{credentialSupplier:()=>{keyRequests++;const state=JSON.parse(fs.readFileSync(path.join(h.directory,'state.json')));assert.equal(state.inlineTrialAuthorization.terms.dispatchKind,'rehearsal');assert.equal(Object.keys(state.billing.accounts[h.record.terms.allowance.id].attempts).length,0);return 'DUMMY-ONE-SHOT-PIPE';}});
  assert.equal(first.status,'completed');assert.equal(first.credentialSupplierCalls,1);assert.equal(first.receipt.budget.calls,3);assert.ok(first.receipt.billing.every(r=>r.status==='settled'));assert.equal(first.appraisalView.status,'available');assert.equal(first.dream.origin,'dream');assert.equal(first.dream.isRealityFact,false);
  const replay=await launchInlinePaid('rehearse',h.directory,{credentialSupplier:()=>{throw Error('duplicate_supplier');}});assert.equal(replay.status,'completed');assert.equal(replay.credentialSupplierCalls,0);
  const viewed=await launchInlinePaid('read',h.directory);assert.deepEqual(viewed.dream,first.dream);assert.equal(viewed.credentialSupplierCalls,0);
  let store=new Store(h.directory);const bodies=first.dream.scenes.map(s=>s.event);try{for(const [id,a]of Object.entries(h.oldAccounts))assert.deepEqual(store.state.billing.accounts[id],a);store.withdraw('q-sparse-memory');}finally{store.close();}
  assert.equal((await launchInlinePaid('read',h.directory)).dream,null);store=new Store(h.directory);try{for(const [id,a]of Object.entries(h.oldAccounts))assert.deepEqual(store.state.billing.accounts[id],a);for(const name of fs.readdirSync(h.directory)){const f=path.join(h.directory,name);if(fs.statSync(f).isFile()){const text=fs.readFileSync(f,'utf8');for(const body of bodies)assert.ok(!text.includes(body));assert.ok(!text.includes('DUMMY-ONE-SHOT-PIPE'));assert.ok(!text.includes('DUMMY-INHERITED-FORBIDDEN'));}}}finally{store.close();}
  console.log(JSON.stringify({command:'node scripts/check-inline-paid-entry.mjs',node:process.version,platform:process.platform,fixtureClock:new Date(trialFixtureNow).toISOString(),fixtureClockAppliesOnlyToRehearsal:true,confirmationOrigin:'independent_synthetic_fixture_not_user_consent',dispatchKind:'rehearsal',cleanChild:true,constrainedPaidGraph:true,inheritedKeyAndNodeOptionsDropped:true,dummyCredentialSupplierCalls:keyRequests,credentialChannel:'one_shot_private_stdin_pipe',stubCalls:3,stubSettledRows:3,replayAdditionalCalls:0,replayCredentialSupplierCalls:0,typedViewAvailable:true,readPreservesOriginal:true,oldAccountsUnchanged:true,withdrawalPurgedAfterReopen:true,realModelRequests:0,userStoreAccessed:false,realUserApprovalRecorded:false,providerNetworkTested:false,qualityAssessed:false,semanticSupport:'not_assessed'},null,2));
}finally{process.env=environment;for(const cleanup of cleanups.reverse())cleanup();}
