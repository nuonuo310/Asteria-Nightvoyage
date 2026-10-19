import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {fixedInteractionRefusalSse,reviewInteractionRefusalContinuation as review} from '../scripts/codex-refusal-fixture.mjs';
import {observeNativeCodexInteractionRefusal as observe,rehearseCodexInteractionRefusal as rehearse} from '../scripts/codex-interaction-refusal.mjs';
const cli=fileURLToPath(new URL('../scripts/check-codex-interaction-refusal.mjs',import.meta.url));
const continuation=(output='unsupported call: request_user_input',call='nightvoyage-fictional-refusal-call')=>Buffer.from(JSON.stringify({model:'gpt-5.6-sol',input:[{type:'function_call_output',call_id:call,output}]}));
function bounded(r){
 for(const key of ['dispatchEnabled','toolExclusionVerified','environmentHandlerDenialVerified','modelEntitlementVerified','subscriptionCapabilityInferred','credentialEnvironmentSupplied','accountAuthorizationRequested','requestBodyRetained'])assert.equal(r[key],false);
 assert.equal(r.localRequestLimit,2);assert.ok(r.fixtureModelPosts<=3);assert.ok(r.appServerTurnsRequested<=1);
 if(r.processStarted){assert.equal(r.ownedProcessClosed,true);assert.equal(r.temporaryCleanupComplete,true);}
 assert.equal(r.descendantTerminationConfirmed,'unknown');
 for(const text of ['fictional-private-tool-output','fictional-metadata-thread','fictional-observer-turn','http://','questions'])assert.ok(!JSON.stringify(r).includes(text));
}
test('fixed fixture has only one interaction call and terminal frame, detached bytes and no shell/filesystem arguments',()=>{
 const bytes=fixedInteractionRefusalSse(),frames=bytes.toString().trim().split('\n\n').map(frame=>JSON.parse(frame.split('\ndata: ')[1]));
 assert.equal(frames.length,2);assert.equal(frames[0].type,'response.output_item.done');assert.equal(frames[0].item.name,'request_user_input');assert.deepEqual(JSON.parse(frames[0].item.arguments),{questions:[]});assert.equal(frames[1].type,'response.completed');
 bytes.fill(0);assert.ok(fixedInteractionRefusalSse().toString().includes('request_user_input'));assert.throws(()=>fixedInteractionRefusalSse({model:'other'}));
});
test('continuation classifier requires exact binding and unsupported text; arbitrary tool output never becomes denial evidence',()=>{
 for(const text of ['unsupported call: request_user_input','unsupported call: functions.request_user_input']){const r=review(continuation(text));assert.equal(r.selectedCallUnsupportedObserved,true);assert.equal(r.nativeHandlerDenialVerified,false);}
 for(const text of ['fictional-private-tool-output','not found','invalid arguments','unsupported call: other','prefix unsupported call: request_user_input',null,{private:'fictional-private-tool-output'}]){const r=review(continuation(text));assert.equal(r.classification,'unclassified_tool_output');assert.ok(!JSON.stringify(r).includes('fictional-private'));}
 assert.throws(()=>review(continuation(undefined,'wrong-call')));
 for(const bytes of [Buffer.from('{'),Uint8Array.of(255),Buffer.alloc(262145),Buffer.from(JSON.stringify({model:'other',input:[]}))])assert.throws(()=>review(bytes));
});
test('independent peer consumes one scripted call and returns bound unsupported output; no inference or native denial is granted',async()=>{
 const r=await rehearse();bounded(r);assert.equal(r.status,'selected_refusal_observed');assert.equal(r.fixtureModelPosts,2);assert.equal(r.scriptedResponseSupplied,true);assert.equal(r.requestObservation.toolCount,0);assert.equal(r.refusalObservation.selectedCallUnsupportedObserved,true);assert.equal(r.refusalObservation.nativeHandlerDenialVerified,false);
});
for(const [scenario,reason] of [['refusal_other_output','native_refusal_unconfirmed'],['refusal_wrong_call','refusal_continuation_rejected'],['refusal_duplicate_output','refusal_continuation_rejected']])test(`scripted ${scenario} cannot produce a successful refusal receipt`,async()=>{
 const r=await rehearse(scenario);bounded(r);assert.equal(r.status,'blocked');assert.equal(r.reason,reason);assert.equal(r.fixtureModelPosts,2);assert.notEqual(r.refusalObservation?.selectedCallUnsupportedObserved,true);
});
test('actual nonempty declaration and contradictory config stop before supplying the scripted response',async()=>{
 for(const [scenario,reason] of [['refusal_nonempty_tools','refusal_requires_empty_tools'],['refusal_controls_changed','configuration_mismatch']]){const r=await rehearse(scenario);bounded(r);assert.equal(r.reason,reason);assert.equal(r.scriptedResponseSupplied,false);assert.equal(r.refusalObservation,null);}
});
test('an attempted native server-side interaction is blocked; notification suppression is not reported as handler denial',async()=>{
 const r=await rehearse('refusal_server_request');bounded(r);assert.equal(r.reason,'unexpected_server_request');assert.equal(r.status,'blocked');assert.equal(r.fixtureModelPosts,0);assert.equal(r.refusalObservation,null);
});
test('queued and in-flight cancellation suppress late unsupported output; missing continuation times out without success',async()=>{
 const before=new AbortController();before.abort();const q=await rehearse('refusal_unsupported',{signal:before.signal});bounded(q);assert.equal(q.processStarted,false);
 const active=new AbortController(),task=rehearse('refusal_late_body',{signal:active.signal});setTimeout(()=>active.abort(),250);const r=await task;bounded(r);assert.equal(r.status,'cancelled');assert.equal(r.refusalObservation,null);
 const stalled=await rehearse('refusal_stall',{timeoutMs:400});bounded(stalled);assert.equal(stalled.status,'blocked');assert.equal(stalled.reason,'preparation_timeout');assert.equal(stalled.refusalObservation,null);
});
test('no caller-supplied response, tool, model, provider, key or process wrapper is accepted',()=>{
 let called=false;assert.throws(()=>rehearse('refusal_unsupported',{get timeoutMs(){called=true;return 1;}}));assert.equal(called,false);
 for(const value of [{response:'fictional'},{tool:'shell'},{provider:'openai'},{model:'other'},{key:'fictional'},{retry:true}])assert.throws(()=>rehearse('refusal_unsupported',value));
 assert.throws(()=>observe('codex.cmd'));assert.throws(()=>observe(process.execPath));assert.throws(()=>rehearse('login'));
});
test('CLI defaults to independent peer, never login or real inference; unknown flags fail closed',()=>{
 const r=spawnSync(process.execPath,[cli],{encoding:'utf8'});assert.equal(r.status,0);bounded(JSON.parse(r.stdout));
 for(const args of [['--live'],['login'],['--model','other'],['--tool','shell']]){const r=spawnSync(process.execPath,[cli,...args],{encoding:'utf8'});assert.equal(r.status,1);assert.equal(JSON.parse(r.stdout).dispatchEnabled,false);}
});
