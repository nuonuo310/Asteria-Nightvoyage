// Independent temporary rehearsal: synthetic OAuth/HTTP with documented reasoning items.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {Store} from '../src/store.js';
import {hash} from '../src/contract.js';
import {calculatePostfreezePlanTrialProposal,initPostfreezePlanTrial,preflightPostfreezePlanTrial,executePostfreezePlanTrial} from './postfreeze-plan-trial.mjs';
import {readModelPortContent} from './aggregate-plan-content-view.mjs';
import {syntheticPlanHttp,trialApproval} from '../test-support/plan-trial-fixtures.js';
import {envelopeTranscript} from '../test-support/offline-envelope-runtime-fixtures.js';

if(process.argv.length!==2)throw Error('rehearsal_arguments_invalid');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-postfreeze-plan-rehearsal-'));
const directory=path.join(root,'book'),connectionDirectory=path.join(root,'connection');
const allText=dir=>fs.readdirSync(dir,{withFileTypes:true}).map(entry=>entry.isDirectory()?allText(path.join(dir,entry.name)):fs.readFileSync(path.join(dir,entry.name),'utf8')).join('\n');
const http=syntheticPlanHttp({onGenerate:body=>new Response(Buffer.concat(envelopeTranscript({body})))});
try{
  const before=preflightPostfreezePlanTrial(directory);
  assert.equal(before.ready,false);assert.equal(before.reason,'trial_approval_required');assert.equal(fs.existsSync(directory),false);
  initPostfreezePlanTrial(directory,trialApproval());
  const ready=preflightPostfreezePlanTrial(directory);
  assert.equal(ready.ready,true);assert.equal(ready.reason,'limits_checked');assert.equal(ready.credentialRead,false);
  http.install();
  const first=await executePostfreezePlanTrial({directory,connectionDirectory,onReady:http.onReady});
  assert.equal(first.receipt.status,'completed');assert.equal(http.bodies.length,3);assert.equal(first.receipt.external_calls_started,3);
  assert.equal(first.receipt.checkpoint.saved_scenes,2);assert.equal(first.receipt.checkpoint.wake_saved,true);
  assert.equal(first.dream.isRealityFact,false);assert.equal(first.wake.origin,'wake_note');assert.equal(first.residue.origin,'simulated_affect');
  assert.equal(allText(root).includes('SYNTHETIC-PRIVATE'),false);
  const calls=http.calls.length,replay=await executePostfreezePlanTrial({directory,connectionDirectory,onReady:()=>assert.fail('replay login')});
  assert.equal(http.calls.length,calls);assert.deepEqual(replay.dream,first.dream);assert.deepEqual(replay.wake,first.wake);
  const store=new Store(directory);
  try{
    const view=readModelPortContent(store,first.dream.id);
    assert.equal(view.narrative.dream.origin,'dream');assert.ok(view.sourceRefs.length>0);
  }finally{store.close();}
  const source=JSON.parse(fs.readFileSync(new URL('../examples/gpt-plan-trial.snapshot.json',import.meta.url),'utf8')).sources[0].id;
  const withdrawal=new Store(directory);
  try{withdrawal.withdraw(source);}finally{withdrawal.close();}
  const reopened=new Store(directory);
  try{assert.equal(readModelPortContent(reopened,first.dream.id),null);}finally{reopened.close();}
  const proposal=calculatePostfreezePlanTrialProposal();
  console.log(JSON.stringify({
    command:'node scripts/check-postfreeze-plan-trial.mjs',node:process.version,platform:process.platform,
    dispatchKind:'independent_synthetic_oauth_and_http',terminalState:'SYNTHETIC_REHEARSAL_ONLY',
    proposalHash:hash(proposal),fixtureHash:proposal.fixtureHash,sourcePinCount:Object.keys(proposal.sourcePins).length,
    authorityCommit:proposal.authorityCommit,adapter_kind:proposal.adapter_kind,model_id:proposal.model_id,
    protocol_version:proposal.protocol_version,decoder_version:proposal.decoder_version,
    syntheticStageCalls:http.bodies.length,realModelRequests:0,credentialEnvironmentReads:0,userStoreAccessed:false,
    userApprovalRecorded:false,syntheticSessionRevoked:http.revoked===1,replayAdditionalCalls:0,replayLoginRequests:0,
    syntheticReasoningDiscarded:true,originalDreamAndWakeUnchanged:true,typedViewAvailable:true,
    withdrawalSuppressesReopenedContent:true,extraCreditsApproved:false,usageSettingsRemotelyVerified:false,
    subscriptionInferenceVerified:false,qualityAssessed:false
  },null,2));
}finally{
  http.restore();fs.rmSync(root,{recursive:true,force:true});
}
