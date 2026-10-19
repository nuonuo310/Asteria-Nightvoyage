import test from 'node:test';
import assert from 'node:assert/strict';
import {observerNotificationWitness as witness} from '../scripts/codex-observer-notification-witness.mjs';
import {rehearseCodexRequestObserver as rehearse} from '../scripts/codex-request-observer.mjs';
test('public notification identity is diagnostic metadata and never changes acceptance',()=>{
 const r=witness('windows/worldWritableWarning','notification_not_reviewed','observing');
 assert.equal(r.method,'windows/worldWritableWarning');assert.equal(r.methodClassification,'in_public_catalogue');
 assert.equal(r.check,'notification_not_reviewed');assert.equal(r.rawNotificationReturned,false);assert.equal(r.changesAcceptance,false);assert.equal(r.dispatchEnabled,false);
});
test('unknown notification, check, phase and item cannot echo arbitrary text or stringify objects',()=>{
 let touched=false;const hostile={toString(){touched=true;throw Error('fictional-private');}};
 for(const value of ['fictional-private',hostile]){
  const r=witness(value,value,value,value);assert.equal(r.method,null);assert.equal(r.methodClassification,'outside_public_catalogue');assert.equal(r.check,'unreviewed_check');assert.equal(r.phase,'unknown');assert.equal(r.itemKind,'unreviewed');assert.ok(!JSON.stringify(r).includes('fictional-private'));
 }
 assert.equal(touched,false);
});
test('an ordinary successful request has no invented rejected-notification witness',async()=>{
 const r=await rehearse();assert.equal(r.status,'request_observed');assert.equal(r.notificationRejection,null);
});
const cases=[
 ['warning_notification','windows/worldWritableWarning','notification_not_reviewed','not_supplied'],
 ['outside_notification',null,'notification_not_reviewed','not_supplied'],
 ['altered_user_item','item/started','user_item_text_mismatch','userMessage'],
 ['invalid_item_id','item/started','user_item_id_shape','userMessage'],
 ['foreign_turn','item/started','notification_turn_mismatch','userMessage'],
 ['approval_status','thread/status/changed','thread_status_rejected','not_supplied'],
 ['tool_notification','item/started','user_item_before_turn_identity','commandExecution']
];
for(const [scenario,method,check,itemKind] of cases)test(`rejected ${scenario} stays blocked with fixed metadata only`,async()=>{
 const r=await rehearse(scenario);assert.equal(r.status,'blocked');assert.equal(r.appServerTurnsRequested,1);
 assert.equal(r.fixtureModelPosts,0);assert.equal(r.notificationRejection.method,method);assert.equal(r.notificationRejection.check,check);assert.equal(r.notificationRejection.itemKind,itemKind);
 assert.equal(r.ownedProcessClosed,true);assert.equal(r.temporaryCleanupComplete,true);assert.equal(r.dispatchEnabled,false);assert.equal(r.requestObservation,null);
 for(const text of ['fictional-private','fictional/private','fictional-metadata-thread','fictional-observer-turn'])assert.ok(!JSON.stringify(r).includes(text));
});
