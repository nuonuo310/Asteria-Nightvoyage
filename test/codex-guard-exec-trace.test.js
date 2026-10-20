import test from 'node:test';
import assert from 'node:assert/strict';
import {GuardExecTracePolicy} from '../scripts/codex-guard-exec-trace-policy.mjs';
import {rehearseCodexGuardExec} from '../scripts/codex-code-mode-guard-owner.mjs';
const trace='ERROR codex_core::tools::router: error=code-mode host is disabled';
const context=()=>({responseQueued:true,guardMatched:true,warningMatched:true,identitiesMatched:true,threadPrepared:true,catalogBytesChecked:true,continuationObserved:false,terminal:false});
const data=s=>Buffer.from(s);
const finish=(p,c=context())=>p.finish(c);
test('only one fixed router disabled-host pattern may continue inside the checked local context',()=>{
 const p=new GuardExecTracePolicy();assert.equal(p.push(data(trace+'\n'),context()),true);const r=finish(p);
 assert.equal(r.expectedTraceLinesContinued,1);assert.equal(r.errorLineCount,1);assert.equal(r.blocked,false);assert.equal(r.requiresBoundContinuation,true);assert.equal(r.nativeHandlerDenialVerified,false);assert.equal(r.firstError.patternProvesRootCause,false);assert.equal(r.rawStderrReturned,false);
});
test('every required configuration/identity/lifecycle condition remains necessary for trace continuation',()=>{
 for(const key of Object.keys(context())){const c=context();c[key]=!c[key];const p=new GuardExecTracePolicy();assert.equal(p.push(data(trace+'\n'),c),false,key);assert.equal(finish(p,c).stopClass,'expected_trace_outside_scope',key);}
});
test('duplicate, unknown, wrong-target, fatal and unsupported-call errors cannot acquire the disabled-host exception',()=>{
 for(const line of [trace.replace('codex_core::tools::router','codex_api::client'),trace.replace('code-mode host is disabled','unsupported custom tool call: exec'),trace+' FICTIONAL-PRIVATE-SUFFIX','ERROR FICTIONAL-PRIVATE-ERROR','FATAL '+trace,'ERROR '+trace]){const p=new GuardExecTracePolicy();assert.equal(p.push(data(line+'\n'),context()),false);const r=finish(p);assert.equal(r.blocked,true);assert.ok(!JSON.stringify(r).includes('FICTIONAL-PRIVATE'));}
 const p=new GuardExecTracePolicy();p.push(data(trace+'\n'+trace+'\n'),context());assert.equal(finish(p).stopClass,'duplicate_expected_trace');
});
test('startup configuration/lookup errors remain terminal even inside an otherwise eligible context',()=>{
 for(const line of ['Unrecognized configuration setting: FICTIONAL-PRIVATE','Could not find bubblewrap on PATH']){const p=new GuardExecTracePolicy();assert.equal(p.push(data(line+'\n'),context()),false);assert.equal(finish(p).stopClass,'startup_control_error');}
});
test('line split before response queue cannot be reclassified by a later eligible completion',()=>{
 const p=new GuardExecTracePolicy(),early={...context(),responseQueued:false};p.push(data('ERROR codex_core::tools::router: '),early);assert.equal(p.push(data('error=code-mode host is disabled\n'),context()),false);const r=finish(p);assert.equal(r.firstError.phaseObserved,'before_response_queued');assert.equal(r.expectedTraceLinesContinued,0);
 const q=new GuardExecTracePolicy(),euro=Buffer.from('€');q.push(euro.subarray(0,1),early);assert.equal(q.push(Buffer.concat([euro.subarray(1),data(' '+trace+'\n')]),context()),false);assert.equal(finish(q).expectedTraceLinesContinued,0);
});
test('line beginning in scope but completed after continuation or cancellation stays blocked',()=>{
 for(const end of [{...context(),continuationObserved:true},{...context(),terminal:true}]){const p=new GuardExecTracePolicy();p.push(data(trace.slice(0,25)),context());assert.equal(p.push(data(trace.slice(25)+'\n'),end),false);assert.equal(finish(p,end).blocked,true);}
});
test('split UTF-8/ANSI and CRLF are bounded; incomplete error lines cannot count as an accepted trace',()=>{
 const p=new GuardExecTracePolicy(),s=data('\u001b[31m'+trace+'\u001b[0m\r\n');for(const b of s)p.push(Uint8Array.of(b),context());assert.equal(finish(p).expectedTraceLinesContinued,1);
 const q=new GuardExecTracePolicy();q.push(data(trace),context());const r=finish(q);assert.equal(r.stopClass,'unterminated_error_line');assert.equal(r.expectedTraceLinesContinued,0);
});
test('invalid UTF-8, byte/line ceilings, malformed context and getters fail without invoking caller getters',()=>{
 const p=new GuardExecTracePolicy();assert.throws(()=>p.push(Buffer.alloc(32769),context()));
 const q=new GuardExecTracePolicy();q.push(Uint8Array.of(255),context());assert.throws(()=>finish(q));
 const s=new GuardExecTracePolicy();assert.throws(()=>s.push(data('\n'.repeat(129)),context()));
 const t=new GuardExecTracePolicy();assert.throws(()=>t.push(data('x'.repeat(8193)),context()));
 let gets=0;const c=context();Object.defineProperty(c,'guardMatched',{get(){gets++;return true;}});const u=new GuardExecTracePolicy();assert.throws(()=>u.push(data(trace+'\n'),c));assert.equal(gets,0);
});
test('independent default peer supplies one reviewed error then a bound denial; original error label remains visible',async()=>{
 const r=await rehearseCodexGuardExec();assert.equal(r.status,'selected_exec_denial_observed');assert.equal(r.fixtureModelPosts,2);assert.equal(r.guardExecTracePolicy.expectedTraceLinesContinued,1);assert.equal(r.guardExecTracePolicy.blocked,false);assert.ok(r.startupDiagnostics.labels.includes('unclassified_startup_error'));assert.equal(r.selectedExecObservation.selectedExecDisabledHostObserved,true);assert.equal(r.ownedProcessClosed,true);assert.equal(r.temporaryCleanupComplete,true);assert.equal(r.allHandlerDenialVerified,false);
});
test('quiet bound denial needs no invented error observation',async()=>{
 const r=await rehearseCodexGuardExec('quiet_denial');assert.equal(r.status,'selected_exec_denial_observed');assert.equal(r.guardExecTracePolicy.expectedTraceLinesContinued,0);assert.equal(r.guardExecTracePolicy.firstError,null);
});
for(const scenario of ['trace_before_call','trace_duplicate','trace_unknown_after','trace_wrong_target','trace_unsupported_exec','trace_prefix_before_call'])test('integrated trace scope stays terminal: '+scenario,async()=>{
 const r=await rehearseCodexGuardExec(scenario);assert.equal(r.status,'blocked');assert.equal(r.reason,'startup_error_observed');assert.equal(r.guardExecTracePolicy.blocked,true);assert.equal(r.selectedExecObservation,null);assert.equal(r.ownedProcessClosed,true);assert.equal(r.temporaryCleanupComplete,true);assert.ok(!JSON.stringify(r).includes('FICTIONAL-PRIVATE'));
});
test('expected trace alone and unterminated trace never become a selected denial result',async()=>{
 for(const scenario of ['trace_no_continuation','trace_no_newline']){const r=await rehearseCodexGuardExec(scenario,{timeoutMs:1200});assert.equal(r.status,'blocked');assert.equal(r.selectedExecObservation,null);assert.equal(r.ownedProcessClosed,true);assert.equal(r.temporaryCleanupComplete,true);if(scenario==='trace_no_newline')assert.equal(r.guardExecTracePolicy.blocked,true);}
});
