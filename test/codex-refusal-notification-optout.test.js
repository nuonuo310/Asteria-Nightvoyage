import test from 'node:test';
import assert from 'node:assert/strict';
import {rehearseCodexRefusalContinuation as rehearse,rehearseCodexInteractionRefusal} from '../scripts/codex-interaction-refusal.mjs';
function closed(r){
 assert.equal(r.notificationOptOutVerified,false);assert.equal(r.accountRateLimitPayloadInterpreted,false);assert.equal(r.accountRateLimitDataReturned,false);
 for(const key of ['dispatchEnabled','toolExclusionVerified','environmentHandlerDenialVerified','modelEntitlementVerified','subscriptionCapabilityInferred','accountAuthorizationRequested','credentialEnvironmentSupplied'])assert.equal(r[key],false);
 assert.equal(r.temporaryCleanupComplete,true);assert.equal(r.ownedProcessClosed,true);assert.ok(r.fixtureModelPosts<=2);
 assert.ok(!JSON.stringify(r).includes('fictional-private-account-value'));
}
test('initialize requests exactly one fixed account-rate notification opt-out; independent peer then returns bound result',async()=>{
 const r=await rehearse();closed(r);assert.deepEqual(r.notificationOptOutRequested,['account/rateLimits/updated']);assert.equal(r.status,'selected_refusal_observed');assert.equal(r.fixtureModelPosts,2);assert.equal(r.notificationRejection,null);assert.equal(r.refusalObservation.selectedCallUnsupportedObserved,true);
});
test('ignored opt-out still blocks the received account-rate notification and never reads its payload',async()=>{
 const r=await rehearse('refusal_trace_optout_ignored');closed(r);assert.equal(r.reason,'unexpected_notification');assert.equal(r.status,'blocked');assert.equal(r.fixtureModelPosts,1);assert.equal(r.refusalObservation,null);assert.equal(r.notificationRejection.method,'account/rateLimits/updated');assert.equal(r.notificationRejection.check,'notification_not_reviewed');
});
test('other account notifications remain blocked and cannot imply logged-in identity or model entitlement',async()=>{
 const r=await rehearse('refusal_trace_other_account');closed(r);assert.equal(r.status,'blocked');assert.equal(r.notificationRejection.method,'account/updated');assert.equal(r.refusalObservation,null);assert.equal(r.fixtureModelPosts,1);
});
test('unknown notifications keep closed metadata and no tool result even after the expected trace',async()=>{
 const r=await rehearse('refusal_trace_unknown_notification');closed(r);assert.equal(r.status,'blocked');assert.equal(r.notificationRejection.method,null);assert.equal(r.notificationRejection.methodClassification,'outside_public_catalogue');assert.equal(r.refusalObservation,null);assert.ok(!JSON.stringify(r).includes('fictional/privateMethod'));
});
test('original refusal mode never silently requests account notification opt-outs or trace continuation',async()=>{
 const r=await rehearseCodexInteractionRefusal();closed(r);assert.deepEqual(r.notificationOptOutRequested,[]);assert.equal(r.expectedTraceContinuationRequested,false);assert.equal(r.status,'selected_refusal_observed');
});
test('callers cannot replace or extend the method list, authorize an account, or supply arbitrary notification content',()=>{
 for(const value of [{optOutNotificationMethods:['warning']},{notificationOptOutRequested:[]},{accountAuthorizationRequested:true},{notification:{method:'account/updated'}}])assert.throws(()=>rehearse('refusal_trace_then_unsupported',value));
 let touched=false;assert.throws(()=>rehearse('refusal_trace_then_unsupported',{get optOutNotificationMethods(){touched=true;return [];}}));assert.equal(touched,false);
});
