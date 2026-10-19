import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {CodexRefusalTracePolicy as Policy} from '../scripts/codex-refusal-trace-policy.mjs';
import {rehearseCodexRefusalContinuation as rehearse,rehearseCodexInteractionRefusal,observeNativeCodexRefusalContinuation as observe} from '../scripts/codex-interaction-refusal.mjs';
const cli=fileURLToPath(new URL('../scripts/check-codex-refusal-continuation.mjs',import.meta.url));
const context=()=>({responseQueued:true,emptyInventoryChecked:true,threadPrepared:true,catalogBytesChecked:true,continuationObserved:false});
const line='ERROR codex_core::tools::router: error=unsupported call: request_user_input\n';
function boundary(r){
 for(const key of ['dispatchEnabled','toolExclusionVerified','environmentHandlerDenialVerified','modelEntitlementVerified','subscriptionCapabilityInferred','credentialEnvironmentSupplied','accountAuthorizationRequested','requestBodyRetained'])assert.equal(r[key],false);
 if(r.processStarted){assert.equal(r.ownedProcessClosed,true);assert.equal(r.temporaryCleanupComplete,true);}
 assert.equal(r.localRequestLimit,2);assert.ok(r.appServerTurnsRequested<=1);assert.ok(r.fixtureModelPosts<=2);assert.equal(r.descendantTerminationConfirmed,'unknown');
 assert.ok(!JSON.stringify(r).includes('fictional-private'));
}
test('one exact expected trace in the owned stage permits observation only across ANSI/CRLF and byte splits',()=>{
 const p=new Policy();for(const byte of Buffer.from('\x1b[31m'+line.trim()+'\x1b[0m\r\n'))assert.equal(p.push(Uint8Array.of(byte),context()),true);
 const r=p.finish({...context(),continuationObserved:true});assert.equal(r.blocked,false);assert.equal(r.expectedTraceLinesContinued,1);assert.equal(r.requiresBoundContinuation,true);assert.equal(r.nativeHandlerDenialVerified,false);assert.equal(r.dispatchEnabled,false);assert.ok(!JSON.stringify(r).includes('request_user_input'));
});
test('every scope prerequisite and a closed data context is required before expected trace continuation',()=>{
 for(const key of Object.keys(context())){const c=context();c[key]=!c[key];const p=new Policy();assert.equal(p.push(Buffer.from(line),c),false);assert.equal(p.finish(c).blocked,true);}
 let touched=false;const c=context();Object.defineProperty(c,'responseQueued',{get(){touched=true;return true;}});assert.throws(()=>new Policy().push(Buffer.from(line),c));assert.equal(touched,false);
 assert.throws(()=>new Policy().push(Buffer.from(line),{...context(),secret:'fictional-private'}));
});
test('wrong tool, unknown target, altered suffix, fatal/panic and unrelated errors always stop',()=>{
 for(const text of [line.replace('request_user_input','view_image'),line.replace('router','fictional_private'),line.trim()+' extra\n','FATAL '+line,'PANIC '+line,'ERROR fictional-private-log\n','could not find bubblewrap on PATH\n','unrecognized configuration setting\n']){
  const p=new Policy();assert.equal(p.push(Buffer.from(text),context()),false);const r=p.finish(context());assert.equal(r.blocked,true);assert.ok(!JSON.stringify(r).includes('fictional-private'));
 }
});
test('duplicate expected traces and unknown errors after an allowed trace cannot reset the policy',()=>{
 for(const later of [line,'ERROR fictional-private-later\n']){const p=new Policy();assert.equal(p.push(Buffer.from(line),context()),true);assert.equal(p.push(Buffer.from(later),context()),false);assert.equal(p.push(Buffer.from('normal\n'),context()),false);assert.equal(p.finish(context()).blocked,true);}
});
test('no complete pre-continuation line means no timing qualification; empty diagnostics are not handler proof',()=>{
 const p=new Policy();assert.equal(p.push(Buffer.from(line.trim()),context()),true);assert.equal(p.finish({...context(),continuationObserved:true}).blocked,true);
 const r=new Policy().finish(context());assert.equal(r.expectedTraceLinesContinued,0);assert.equal(r.nativeHandlerDenialVerified,false);
});
test('invalid UTF-8, byte/line limits and closed lifecycle are terminal',()=>{
 for(const bytes of [Uint8Array.of(255),Buffer.alloc(32769),Buffer.from('x'.repeat(8193)),Buffer.from('\n'.repeat(129))]){const p=new Policy();assert.throws(()=>p.push(bytes,context()));assert.throws(()=>p.finish(context()));}
 const p=new Policy();p.finish(context());assert.throws(()=>p.push(Buffer.from(line),context()));assert.throws(()=>p.finish(context()));
});
test('local owner waits past exactly one trace, requires a bound unsupported continuation and keeps real admission false',async()=>{
 const r=await rehearse();boundary(r);assert.equal(r.contractVersion,'codex-local-refusal-continuation-v1');assert.equal(r.status,'selected_refusal_observed');assert.equal(r.refusalTracePolicy.expectedTraceLinesContinued,1);assert.equal(r.refusalTracePolicy.blocked,false);assert.equal(r.fixtureModelPosts,2);assert.equal(r.refusalObservation.selectedCallUnsupportedObserved,true);assert.equal(r.refusalStderrWitness.firstError.patternProvesRootCause,false);
});
for(const [scenario,stop] of [['refusal_trace_unknown_after','unreviewed_error'],['refusal_trace_double','duplicate_expected_trace'],['refusal_trace_wrong_tool','unreviewed_error'],['refusal_trace_early','expected_trace_outside_scope']])test(`${scenario} blocks without a refusal result`,async()=>{
 const r=await rehearse(scenario);boundary(r);assert.equal(r.status,'blocked');assert.equal(r.reason,'startup_error_observed');assert.equal(r.refusalObservation,null);assert.equal(r.refusalTracePolicy.stopClass,stop);
});
test('expected trace alone, unclassified continuation and unterminated trace cannot complete a successful probe',async()=>{
 const timeout=await rehearse('refusal_trace_no_continuation',{timeoutMs:400});boundary(timeout);assert.equal(timeout.reason,'preparation_timeout');assert.equal(timeout.refusalObservation,null);
 const other=await rehearse('refusal_trace_then_other');boundary(other);assert.equal(other.reason,'native_refusal_unconfirmed');assert.equal(other.refusalObservation.selectedCallUnsupportedObserved,false);
 const late=await rehearse('refusal_trace_no_linebreak');boundary(late);assert.equal(late.status,'blocked');assert.equal(late.refusalTracePolicy.stopClass,'expected_trace_outside_scope');
});
test('cancel after permitting the trace suppresses the delayed continuation and completed result',async()=>{
 const controller=new AbortController(),task=rehearse('refusal_trace_late_body',{signal:controller.signal});setTimeout(()=>controller.abort(),250);
 const r=await task;boundary(r);assert.equal(r.status,'cancelled');assert.equal(r.refusalObservation,null);assert.equal(r.refusalTracePolicy.expectedTraceLinesContinued,1);
});
test('the original entry still stops at the same expected trace; policy cannot be supplied as an option',async()=>{
 const r=await rehearseCodexInteractionRefusal('refusal_stderr_unsupported');boundary(r);assert.equal(r.status,'blocked');assert.equal(r.reason,'startup_error_observed');assert.equal(r.expectedTraceContinuationRequested,false);assert.equal(r.refusalTracePolicy,null);
 for(const value of [{continueExpectedTrace:true},{provider:'openai'},{key:'fictional'},{tool:'other'},{retry:true}])assert.throws(()=>rehearse('refusal_trace_then_unsupported',value));
 assert.throws(()=>observe('codex.cmd'));assert.throws(()=>observe(process.execPath));
});
test('separate CLI defaults to independent peer and refuses live, login, tool and model overrides',()=>{
 const r=spawnSync(process.execPath,[cli],{encoding:'utf8'});assert.equal(r.status,0);boundary(JSON.parse(r.stdout));
 for(const args of [['--live'],['login'],['--model','other'],['--tool','shell']]){const r=spawnSync(process.execPath,[cli,...args],{encoding:'utf8'});assert.equal(r.status,1);assert.equal(JSON.parse(r.stdout).dispatchEnabled,false);}
});
