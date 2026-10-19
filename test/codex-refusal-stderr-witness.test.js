import test from 'node:test';
import assert from 'node:assert/strict';
import {CodexRefusalStderrWitness as Witness} from '../scripts/codex-refusal-stderr-witness.mjs';
import {rehearseCodexInteractionRefusal as rehearse} from '../scripts/codex-interaction-refusal.mjs';
const expected='ERROR codex_core::tools::router: error=unsupported call: request_user_input';
function witness(text,phase='after_response_queued'){
 const w=new Witness();for(const byte of Buffer.from(text))w.push(Uint8Array.of(byte),phase);return w.finish(phase);
}
test('bounded suffix pattern survives UTF-8 byte splitting and ANSI/CRLF without text or identity return',()=>{
 const r=witness('\x1b[31m'+expected+'\x1b[0m\r\n');assert.equal(r.firstError.errorClass,'fixed_interaction_unsupported_suffix_pattern');assert.equal(r.firstError.targetClass,'core_tools');assert.equal(r.firstError.phaseObserved,'after_response_queued');assert.equal(r.phaseIsReadTimeOnly,true);assert.equal(r.changesAcceptance,false);assert.equal(r.firstError.patternProvesRootCause,false);assert.equal(r.nativeHandlerDenialVerified,false);assert.ok(!JSON.stringify(r).includes('request_user_input'));
});
test('first error is preserved; wrong tool, misleading suffix, arbitrary target and non-error text do not invent the reviewed cause',()=>{
 for(const text of [expected.replace('request_user_input','view_image'),expected+' extra',expected.replace('error=','message=')])assert.equal(witness(text).firstError.errorClass,'unclassified_error');
 const target=witness(expected.replace('codex_core::tools::router','fictional-private-module'));assert.equal(target.firstError.targetClass,'unclassified');assert.ok(!JSON.stringify(target).includes('fictional-private'));
 const r=witness('ERROR fictional-private-secret\n'+expected+'\n');assert.equal(r.firstError.errorClass,'unclassified_error');assert.equal(r.errorLineCount,2);assert.ok(!JSON.stringify(r).includes('fictional-private-secret'));
 assert.equal(witness('fictional normal line\n').firstError,null);
});
test('stage labels describe read time only and final unterminated lines remain visible',()=>{
 const r=witness(expected,'before_response_queued');assert.equal(r.firstError.phaseObserved,'before_response_queued');assert.equal(r.observedLines,1);
 const w=new Witness();w.push(Buffer.from('ERROR '),'before_response_queued');w.push(Buffer.from('fictional-private\n'),'after_response_queued');assert.equal(w.finish('after_response_queued').firstError.phaseObserved,'after_response_queued');
});
test('oversize, malformed UTF-8, excess lines and unknown phases close the witness without raw errors',()=>{
 for(const bytes of [Buffer.alloc(32769),Buffer.from('x'.repeat(8193)),Buffer.from('\n'.repeat(129)),Uint8Array.of(255)]){const w=new Witness();assert.throws(()=>w.push(bytes,'before_response_queued'),/refusal_stderr_witness_rejected/);assert.throws(()=>w.finish('before_response_queued'));}
 const w=new Witness();assert.throws(()=>w.push(Buffer.from('fictional'),'private-path'));assert.throws(()=>w.finish('before_response_queued'));
});
test('finish is terminal and empty stderr is not promoted to a healthy native startup',()=>{
 const w=new Witness(),r=w.finish('before_response_queued');assert.equal(r.firstError,null);assert.equal(r.dispatchEnabled,false);assert.equal(Object.hasOwn(r,'healthyStartup'),false);assert.throws(()=>w.finish('before_response_queued'));assert.throws(()=>w.push(Buffer.from('x'),'before_response_queued'));
});
for(const [scenario,phase,kind] of [['refusal_stderr_unsupported','after_response_queued','fixed_interaction_unsupported_suffix_pattern'],['refusal_stderr_other','after_response_queued','unclassified_error'],['refusal_stderr_before','before_response_queued','fixed_interaction_unsupported_suffix_pattern'],['refusal_stderr_no_newline','after_response_queued','fixed_interaction_unsupported_suffix_pattern']])test(`${scenario} stays blocked and records body-free stage metadata`,async()=>{
 const r=await rehearse(scenario);assert.equal(r.status,'blocked');assert.equal(r.reason,'startup_error_observed');assert.equal(r.refusalObservation,null);assert.equal(r.refusalStderrWitness.firstError.phaseObserved,phase);assert.equal(r.refusalStderrWitness.firstError.errorClass,kind);assert.equal(r.refusalStderrWitness.changesAcceptance,false);assert.equal(r.dispatchEnabled,false);assert.equal(r.temporaryCleanupComplete,true);assert.ok(r.fixtureModelPosts<=1);assert.ok(!JSON.stringify(r).includes('fictional-private-stderr-token'));
});
