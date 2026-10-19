import test from 'node:test';
import assert from 'node:assert/strict';
import {rehearseCodexPlanCredentialOwner} from '../scripts/codex-plan-credential-rehearsal.mjs';
const marker='nightvoyage-independent-oauth-sentinel-not-a-credential';
for(const [scenario,reason] of [['success',null],['timeout','timeout'],['cancel','cancelled'],['late_response','cancelled'],['failed_spawn','spawn_failed'],['failed_child','untrusted_child_output'],['secret_output','untrusted_child_output']]){
 test('independent credential lifetime: '+scenario,async()=>{
  const r=await rehearseCodexPlanCredentialOwner({scenario,timeoutMs:scenario==='timeout'?100:5000});
  assert.equal(r.status,scenario==='success'?'completed':'blocked');assert.equal(r.reason,reason);
  assert.equal(r.ownedChildClosed,true);assert.equal(r.closedBeforeLeaseDisposal,true);
  assert.equal(r.leaseActive,false);assert.equal(r.secretReferenceDisposed,true);assert.equal(r.parentEnvironmentAssigned,false);
  assert.equal(r.finalReplyAccepted,scenario==='success');assert.equal(r.lateReplyPublished,false);
  assert.equal(r.order.at(-3),'child_closed');assert.equal(r.order.at(-2),'lease_disposed');assert.equal(r.order.at(-1),'synthetic_revocation');
  assert.equal(r.realModelRequests,0);assert.equal(r.credentialReads,0);assert.equal(r.nativeCredentialContainmentVerified,false);
  assert.equal(JSON.stringify(r).includes(marker),false);
 });
}
test('closed rehearsal inputs cannot acquire real authority or evaluate getters',async()=>{
 let reads=0;
 const accessor={get scenario(){reads++;return 'success';}};
 for(const v of [accessor,{token:'real-forbidden'},{executable:process.execPath},{env:{}},{scenario:'real'},{timeoutMs:0},Object.assign(Object.create({}),{scenario:'success'})])await assert.rejects(rehearseCodexPlanCredentialOwner(v),/credential_rehearsal_options_invalid/);
 assert.equal(reads,0);
});
