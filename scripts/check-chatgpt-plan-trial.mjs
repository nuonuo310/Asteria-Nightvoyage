// Independent temporary rehearsal: external fetch is replaced by synthetic HTTP.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {initPlanTrial,executePlanTrial,preflightPlanTrial} from './chatgpt-plan-trial.mjs';
import {Store} from '../src/store.js';
import {readModelPortContent} from './model-port-content-view.mjs';
import {syntheticPlanHttp,trialApproval} from '../test-support/plan-trial-fixtures.js';
if(process.argv.length!==2)throw Error('rehearsal_arguments_invalid');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-plan-rehearsal-')),directory=path.join(root,'book'),connectionDirectory=path.join(root,'connection'),http=syntheticPlanHttp();
try{
  initPlanTrial(directory,trialApproval());http.install();
  const first=await executePlanTrial({directory,connectionDirectory,onReady:http.onReady});assert.equal(first.receipt.status,'completed');assert.equal(http.bodies.length,3);
  const calls=http.calls.length,replay=await executePlanTrial({directory,connectionDirectory,onReady:()=>assert.fail('replay login')});assert.equal(http.calls.length,calls);assert.deepEqual(replay.dream,first.dream);assert.deepEqual(replay.wake,first.wake);
  let store=new Store(directory);assert.equal(readModelPortContent(store,first.dream.id).narrative.dream.origin,'dream');store.withdraw('fictional-plan-window-memory');store.close();
  store=new Store(directory);assert.equal(readModelPortContent(store,first.dream.id),null);assert.equal(Object.keys(store.state.entries).length,0);store.close();
  assert.throws(()=>preflightPlanTrial(directory),/source_withdrawn/);
  console.log(JSON.stringify({command:'node scripts/check-chatgpt-plan-trial.mjs',node:process.version,platform:process.platform,dispatchKind:'independent_synthetic_oauth_and_http',status:'completed',adapter_kind:'ChatGPTPlanAdapter',model_id:'gpt-5.6-sol',syntheticStageCalls:http.bodies.length,realModelRequests:0,credentialEnvironmentReads:0,userStoreAccessed:false,userApprovalRecorded:false,syntheticSessionRevoked:http.revoked===1,replayAdditionalCalls:0,replayLoginRequests:0,originalDreamAndWakeUnchanged:true,typedViewAvailable:true,withdrawalSuppressesReopenedContent:true,extraCreditsApproved:false,usageSettingsRemotelyVerified:false,subscriptionInferenceVerified:false,qualityAssessed:false},null,2));
}finally{http.restore();fs.rmSync(root,{recursive:true,force:true});}
