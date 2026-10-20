import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {observeNativeCodexGuardExec,rehearseCodexGuardExec} from '../scripts/codex-code-mode-guard-owner.mjs';
import {fixedGuardExecSse,exactGuardWarning,reviewGuardExecContinuation} from '../scripts/codex-code-mode-exec-fixture.mjs';
const bytes=input=>Buffer.from(JSON.stringify({model:'gpt-5.6-sol',input}));
const output=()=>({type:'custom_tool_call_output',call_id:'nightvoyage-fictional-guard-exec-call',output:'code-mode host is disabled'});
function boundary(r){
 for(const k of ['accountAuthorizationRequested','credentialEnvironmentSupplied','dispatchEnabled','toolExclusionVerified','modelEntitlementVerified','catalogRepresentsRealModel','allHandlerDenialVerified','realProviderAccountingIntegrated'])assert.equal(r[k],false,k);
 if(r.processStarted){assert.equal(r.ownedProcessClosed,true);assert.equal(r.temporaryCleanupComplete,true);}assert.ok(r.observedPostRecords<=2);assert.equal(r.descendantTerminationConfirmed,'unknown');
 assert.ok(!JSON.stringify(r).includes('FICTIONAL-PRIVATE'));assert.ok(r.appServerTurnsRequested<=1);
}
test('fixture emits only one fixed custom arithmetic call and continuation requires exact bound disabled-host text',()=>{
 const s=fixedGuardExecSse().toString();const events=s.split('\n').filter(l=>l.startsWith('data: ')).map(l=>JSON.parse(l.slice(6)));
 assert.equal(events.length,2);assert.deepEqual(events[0].item,{type:'custom_tool_call',name:'exec',input:'1+1',call_id:'nightvoyage-fictional-guard-exec-call'});assert.throws(()=>fixedGuardExecSse('arbitrary code'));
 const r=reviewGuardExecContinuation(bytes([output()]));assert.equal(r.selectedExecDisabledHostObserved,true);assert.equal(r.allHandlerDenialVerified,false);
 for(const edit of [o=>o.call_id='other',o=>o.type='function_call_output']){const o=output();edit(o);assert.throws(()=>reviewGuardExecContinuation(bytes([o])));}
 assert.throws(()=>reviewGuardExecContinuation(bytes([output(),output()])));
 const o=output();o.output='2';assert.equal(reviewGuardExecContinuation(bytes([o])).selectedExecDisabledHostObserved,false);
 for(const b of [Buffer.from('{'),Buffer.from([255]),Buffer.alloc(262145)])assert.throws(()=>reviewGuardExecContinuation(b));
});
test('native warning policy is exact, single-thread-bound and rejects extra fields or private text',()=>{
 const e={method:'warning',params:{threadId:'fictional-owned-thread',message:'Code Mode is unavailable because code-mode host is disabled. Code mode will fail closed; enable `features.code_mode_host` and install `codex-code-mode-host`.'}};
 assert.equal(exactGuardWarning(e,'fictional-owned-thread'),true);assert.equal(exactGuardWarning(e,'fictional-other-thread'),false);
 e.params.extra='FICTIONAL-PRIVATE';assert.equal(exactGuardWarning(e,'fictional-owned-thread'),false);
 assert.equal(exactGuardWarning(null,'fictional-owned-thread'),false);assert.equal(exactGuardWarning(e,'bad/thread'),false);
});
test('independent peer completes two local posts, exact warning/config and fixed denial without native qualification',async()=>{
 const r=await rehearseCodexGuardExec();boundary(r);assert.equal(r.kind,'independent_node_peer');assert.equal(r.status,'selected_exec_denial_observed');assert.equal(r.fixtureModelPosts,2);assert.equal(r.observedPostRecords,2);assert.equal(r.postRecordsSavedBeforeFixtureReply,true);
 assert.equal(r.expectedGuardWarningObserved,true);assert.equal(r.candidateGuardConfigurationMatched,true);assert.equal(r.selectedExecObservation.selectedExecDisabledHostObserved,true);assert.equal(r.requestObservation.toolInventoryReviewed,false);assert.equal(r.nativeVersionVerified,false);
});
for(const scenario of ['host_enabled','fallback_enabled','missing_guard','unknown_warning','foreign_warning','duplicate_warning','unknown_tools','missing_tools','wrong_output','wrong_call','duplicate_output','wrong_kind','auth_header','early_post','server_request','stderr_error','catalog_body_changed','wrong_provider','duplicate_initial','malformed_body','oversized_body','encoded_body','wrong_path','second_unknown_tools'])test('closed native candidate boundary: '+scenario,async()=>{
 const r=await rehearseCodexGuardExec(scenario);boundary(r);assert.equal(r.status,'blocked');
 if(['host_enabled','fallback_enabled','missing_guard','early_post','catalog_body_changed','wrong_provider'].includes(scenario))assert.equal(r.scriptedExecCallSupplied,false);
 if(['unknown_warning','foreign_warning','duplicate_warning','unknown_tools','missing_tools','auth_header','server_request'].includes(scenario))assert.equal(r.scriptedExecCallSupplied,false);
 if(scenario==='wrong_output'){assert.equal(r.selectedExecObservation.classification,'unclassified_tool_output');assert.equal(r.reason,'guard_exec_output_unclassified');}
});
test('missing warning cannot release arithmetic fixture and missing continuation terminates on bounded timeout',async()=>{
 for(const scenario of ['no_warning','stall_after_call']){const r=await rehearseCodexGuardExec(scenario,{timeoutMs:1200});boundary(r);assert.equal(r.status,'blocked');assert.equal(r.reason,scenario==='no_warning'?'guard_warning_missing':'selected_denial_timeout');assert.equal(r.scriptedExecCallSupplied,scenario==='stall_after_call');}
});
test('queued/active cancellation prevents late observation and closes the owned peer',async()=>{
 const a=new AbortController();a.abort();const q=await rehearseCodexGuardExec('observed',{signal:a.signal});boundary(q);assert.equal(q.processStarted,false);
 const b=new AbortController(),p=rehearseCodexGuardExec('stall_after_call',{signal:b.signal});setTimeout(()=>b.abort(),300);const r=await p;boundary(r);assert.equal(r.status,'cancelled');assert.equal(r.selectedExecObservation,null);
});
test('caller code, catalogue, host, account settings, executable aliases and unreviewed scenarios are unavailable',()=>{
 let gets=0;assert.throws(()=>rehearseCodexGuardExec('observed',{get timeoutMs(){gets++;}}));assert.equal(gets,0);
 for(const settings of [{source:'2+2'},{token:'FICTIONAL'},{caseId:'wait'},{provider:'other'},{timeoutMs:0}])assert.throws(()=>rehearseCodexGuardExec('observed',settings));
 assert.throws(()=>rehearseCodexGuardExec('unknown'));assert.throws(()=>observeNativeCodexGuardExec(process.execPath));
});
test('CLI default is the independent scripted peer; login, code and remote-host overrides are rejected',()=>{
 const cli=fileURLToPath(new URL('../scripts/check-codex-guarded-exec.mjs',import.meta.url));
 const p=spawnSync(process.execPath,[cli],{encoding:'utf8'});assert.equal(p.status,0,p.stderr);const r=JSON.parse(p.stdout);assert.equal(r.peerDenialIsScripted,true);assert.equal(r.realModelRequests,0);assert.equal(r.productionAdmission,false);
 for(const args of [['--login'],['--source','1+1'],['--code-mode-host','http://127.0.0.1'],['--native-executable']]){const p=spawnSync(process.execPath,[cli,...args],{encoding:'utf8'});assert.equal(p.status,1);assert.equal(JSON.parse(p.stdout).dispatchEnabled,false);}
});

test('warning arriving after initial local POST still gates the one scripted response',async()=>{
 const r=await rehearseCodexGuardExec('warning_after_request');boundary(r);assert.equal(r.status,'selected_exec_denial_observed');assert.equal(r.expectedGuardWarningObserved,true);assert.equal(r.fixtureModelPosts,2);
});
test('concurrent continuation attempts never acquire a third accepted local observation',async()=>{
 const r=await rehearseCodexGuardExec('third_post');boundary(r);assert.ok(r.fixtureModelPosts<=3);assert.ok(r.observedPostRecords<=2);
 if(r.fixtureModelPosts===3){assert.equal(r.status,'blocked');assert.equal(r.reason,'unexpected_fixture_dispatch');}
 else assert.equal(r.status,'selected_exec_denial_observed');
});
