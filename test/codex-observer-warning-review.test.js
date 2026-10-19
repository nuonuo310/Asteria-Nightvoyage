import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewObserverWarning as review} from '../scripts/codex-observer-warning-review.mjs';
import {rehearseCodexRequestObserver as rehearse} from '../scripts/codex-request-observer.mjs';
const prefix='Model metadata for `gpt-5.6-sol` not found.';
test('source-informed fallback pattern is a diagnostic label, never proof or permission',()=>{
 const r=review(prefix+' Fictional fallback metadata warning.','matches');
 assert.equal(r.warningClass,'requested_model_metadata_fallback_pattern');assert.equal(r.threadBinding,'matches');
 for(const k of ['patternProvesRootCause','rawMessageReturned','warningAccepted','dispatchEnabled'])assert.equal(r[k],false);
});
test('wrong model, suffix-only mentions and unrelated warnings remain unclassified',()=>{
 for(const message of [prefix.replace('gpt-5.6-sol','fictional-other-model')+' fallback metadata','fictional-private '+prefix+' fallback metadata',prefix,'fictional-private-warning']){
  const r=review(message,'global');assert.equal(r.warningClass,'unclassified');assert.ok(!JSON.stringify(r).includes('fictional-private'));
 }
});
test('message byte ceiling, absent messages, hostile objects and binding values never echo or execute text',()=>{
 let touched=false;const hostile={toString(){touched=true;throw Error('fictional-private');}};
 assert.equal(review('界'.repeat(1366),'matches').messageShape,'over_limit');
 for(const value of [undefined,null,hostile])assert.equal(review(value,value).messageShape,'not_string');
 assert.equal(review('x'.repeat(4096),'fictional-private').messageShape,'bounded_string');
 assert.equal(review('x','fictional-private').threadBinding,'unknown');assert.equal(touched,false);
});
for(const [scenario,label,binding,shape] of [
 ['model_metadata_warning','requested_model_metadata_fallback_pattern','matches','bounded_string'],
 ['unclassified_warning','unclassified','matches','bounded_string'],
 ['foreign_warning','unclassified','different','bounded_string'],
 ['oversized_warning','unclassified','matches','over_limit'],
 ['missing_warning_message','unclassified','matches','not_string']
])test(`native-shaped ${scenario} still blocks before HTTP with no raw warning`,async()=>{
 const r=await rehearse(scenario);assert.equal(r.status,'blocked');assert.equal(r.reason,'unexpected_notification');
 assert.equal(r.fixtureModelPosts,0);assert.equal(r.appServerTurnsRequested,1);assert.equal(r.requestObservation,null);
 assert.equal(r.notificationRejection.method,'warning');const d=r.notificationRejection.warningDiagnostic;
 assert.equal(d.warningClass,label);assert.equal(d.threadBinding,binding);assert.equal(d.messageShape,shape);assert.equal(d.warningAccepted,false);
 assert.equal(r.ownedProcessClosed,true);assert.equal(r.temporaryCleanupComplete,true);assert.equal(r.dispatchEnabled,false);
 for(const x of ['fictional-private','fictional-other-thread','fictional-metadata-thread','Model metadata for'])assert.ok(!JSON.stringify(r).includes(x));
});
