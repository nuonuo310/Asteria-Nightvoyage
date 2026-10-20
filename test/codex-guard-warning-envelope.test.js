import test from 'node:test';
import assert from 'node:assert/strict';
import {exactGuardWarning,reviewGuardWarningEnvelope} from '../scripts/codex-code-mode-exec-fixture.mjs';
import {rehearseCodexGuardExec} from '../scripts/codex-code-mode-guard-owner.mjs';
const bare=()=>({method:'warning',params:{threadId:'fictional-guard-thread-1',message:'Code Mode is unavailable because code-mode host is disabled. Code mode will fail closed; enable `features.code_mode_host` and install `codex-code-mode-host`.'}});
const review=m=>reviewGuardWarningEnvelope(JSON.stringify(m),'fictional-guard-thread-1');
test('public optional emission timestamp no longer makes the exact same warning fail the closed envelope check',()=>{
 const m=bare();assert.equal(exactGuardWarning(m,'fictional-guard-thread-1'),true);
 m.emittedAtMs=1792515600000;assert.equal(Object.keys(m).sort().join(',')==='method,params',false);
 assert.equal(exactGuardWarning(m,'fictional-guard-thread-1'),true);
 const r=review(m);assert.equal(r.envelopeShape,'timestamped');assert.equal(r.timestampShape,'safe_nonnegative_integer');assert.equal(r.expectedMessageMatched,true);assert.equal(r.exactCandidateWarningMatched,true);
 assert.equal(r.timestampValueReturned,false);assert.equal(r.warningAccepted,false);assert.ok(!JSON.stringify(r).includes('1792515600000'));
});
test('invalid, null, fractional, unsafe or negative timestamps are rejected without returning their values',()=>{
 for(const t of [null,'FICTIONAL-PRIVATE-TIME',-1,0.5,9007199254740992,{},[]]){const m={...bare(),emittedAtMs:t};assert.equal(exactGuardWarning(m,'fictional-guard-thread-1'),false);const r=review(m);assert.equal(r.timestampShape,'invalid');assert.ok(!JSON.stringify(r).includes('FICTIONAL-PRIVATE'));}
 for(const t of [0,Number.MAX_SAFE_INTEGER])assert.equal(exactGuardWarning({...bare(),emittedAtMs:t},'fictional-guard-thread-1'),true);
});
test('timestamp permission never admits unknown fields, altered text, foreign threads or JSON-RPC authority fields',()=>{
 for(const edit of [m=>m.privateField='FICTIONAL-PRIVATE-FIELD',m=>m.params.extra=true,m=>m.params.message+=' extra',m=>m.params.threadId='fictional-other-thread',m=>m.id=7,m=>m.jsonrpc='2.0',m=>m.method='guardianWarning']){
  const m={...bare(),emittedAtMs:1792515600000};edit(m);assert.equal(exactGuardWarning(m,'fictional-guard-thread-1'),false);const r=review(m);assert.equal(r.exactCandidateWarningMatched,false);assert.ok(!JSON.stringify(r).includes('FICTIONAL-PRIVATE'));
 }
});
test('body-free review separates text, envelope, timestamp and binding failures without changing acceptance',()=>{
 const m=bare();m.params.message='FICTIONAL-PRIVATE-WARNING';const r=review(m);assert.equal(r.expectedMessageMatched,false);assert.equal(r.envelopeShape,'bare');assert.equal(r.threadBinding,'matches');assert.equal(r.changesAcceptance,false);assert.equal(r.rawMessageReturned,false);
 for(const text of ['{','x'.repeat(65537)])assert.throws(()=>reviewGuardWarningEnvelope(text,'fictional-guard-thread-1'));
 for(const m of [null,[],{}, {method:'warning',params:null}])assert.equal(review(m).exactCandidateWarningMatched,false);
});
test('independent peer emits source-shaped timestamped notifications and the bounded selected denial completes',async()=>{
 const r=await rehearseCodexGuardExec();assert.equal(r.status,'selected_exec_denial_observed');assert.equal(r.guardWarningEnvelopeReview.envelopeShape,'timestamped');assert.equal(r.guardWarningEnvelopeReview.expectedMessageMatched,true);assert.equal(r.fixtureModelPosts,2);assert.equal(r.allHandlerDenialVerified,false);assert.equal(r.ownedProcessClosed,true);assert.equal(r.temporaryCleanupComplete,true);
});
test('bare older envelope remains supported without inventing a native timestamp observation',async()=>{
 const r=await rehearseCodexGuardExec('bare_warning');assert.equal(r.status,'selected_exec_denial_observed');assert.equal(r.guardWarningEnvelopeReview.timestampShape,'absent');assert.equal(r.guardWarningEnvelopeReview.envelopeShape,'bare');
});
for(const scenario of ['invalid_warning_timestamp','extra_warning_field','unknown_warning','foreign_warning'])test('invalid native warning remains terminal: '+scenario,async()=>{
 const r=await rehearseCodexGuardExec(scenario);assert.equal(r.status,'blocked');assert.equal(r.scriptedExecCallSupplied,false);assert.equal(r.expectedGuardWarningObserved,false);assert.equal(r.guardWarningEnvelopeReview.exactCandidateWarningMatched,false);assert.equal(r.guardWarningEnvelopeReview.changesAcceptance,false);assert.equal(r.ownedProcessClosed,true);assert.equal(r.temporaryCleanupComplete,true);assert.ok(!JSON.stringify(r).includes('FICTIONAL-PRIVATE'));
});
