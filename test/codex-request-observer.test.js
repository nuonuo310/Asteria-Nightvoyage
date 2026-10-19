import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {rehearseCodexRequestObserver as rehearse,observeNativeCodexRequest as observe} from '../scripts/codex-request-observer.mjs';
const cli=fileURLToPath(new URL('../scripts/check-codex-request-observer.mjs',import.meta.url));
function boundaries(r){
 for(const k of ['dispatchEnabled','toolExclusionVerified','modelEntitlementVerified','accountAuthorizationRequested','credentialEnvironmentSupplied','generatedResponseSupplied','requestBodyRetained'])assert.equal(r[k],false);
 assert.ok(r.appServerTurnsRequested<=1);assert.ok(r.methodsQueued.filter(x=>x==='turn/start').length<=1);
 assert.equal(r.descendantTerminationConfirmed,'unknown');
 if(r.processStarted){assert.equal(r.ownedProcessClosed,true);assert.equal(r.temporaryCleanupComplete,true);}
 const text=JSON.stringify(r);for(const forbidden of ['fictional-private','fictional_private','fictional-observer-turn','fictional-metadata-thread','http://'])assert.ok(!text.includes(forbidden));
}
test('independent peer traverses one local turn, body-free observation, process close and awaited cleanup',async()=>{
 const r=await rehearse();boundaries(r);assert.equal(r.status,'request_observed');assert.equal(r.fixtureModelPosts,1);assert.equal(r.appServerTurnsRequested,1);
 assert.equal(r.requestObservation.toolExposureStatus,'no_tools_declared');assert.equal(r.requestObservation.toolExclusionVerified,false);
});
test('known nonempty tools are observable but never admitted; unknown and missing tool declarations block',async()=>{
 const known=await rehearse('known_tools');boundaries(known);assert.equal(known.status,'request_observed');assert.deepEqual(known.requestObservation.toolClasses,['file_read']);
 for(const scenario of ['unknown_tools','missing_tools']){const r=await rehearse(scenario);boundaries(r);assert.equal(r.status,'blocked');assert.equal(r.reason,'request_tools_unreviewed');}
});
for(const [scenario,reason] of [
 ['wrong_model','thread_mismatch'],['wrong_provider','thread_mismatch'],['not_ephemeral','thread_mismatch'],
 ['config_auth_required','configuration_mismatch'],['early_post','unexpected_fixture_dispatch'],
 ['wrong_path','unexpected_fixture_dispatch'],['auth_header','unexpected_authorization_header'],
 ['encoded_body','request_encoding_unsupported'],['malformed_body','request_review_rejected'],
 ['oversized_body','request_byte_limit'],['server_request','unexpected_server_request'],
 ['rpc_error','rpc_rejected'],['tool_notification','unexpected_notification']
])test(`local observer rejects ${scenario} without generation, raw content or another turn`,async()=>{
 const r=await rehearse(scenario);boundaries(r);assert.equal(r.status,'blocked');assert.equal(r.reason,reason);
 if(['wrong_model','wrong_provider','not_ephemeral','config_auth_required','early_post'].includes(scenario))assert.equal(r.appServerTurnsRequested,0);
});
test('body-read deadline and preparation timeout close requests and children without retry',async()=>{
 const stalled=await rehearse('stalled_body',{timeoutMs:5000});boundaries(stalled);assert.equal(stalled.status,'blocked');assert.equal(stalled.reason,'request_read_timeout');assert.equal(stalled.fixtureModelPosts,1);
 const before=await rehearse('stall_thread',{timeoutMs:300});boundaries(before);assert.equal(before.reason,'preparation_timeout');assert.equal(before.appServerTurnsRequested,0);
});
test('queued and in-flight cancellation do not repeat the local turn or retain a delayed body',async()=>{
 const queued=new AbortController();queued.abort();const q=await rehearse('empty_tools',{signal:queued.signal});boundaries(q);assert.equal(q.processStarted,false);assert.equal(q.appServerTurnsRequested,0);
 const active=new AbortController(),pending=rehearse('stalled_body',{signal:active.signal});setTimeout(()=>active.abort(),250);
 const r=await pending;boundaries(r);assert.equal(r.status,'cancelled');assert.equal(r.reason,'cancelled');assert.equal(r.requestObservation,null);
});
test('overlapping local POSTs cannot produce a second turn or generated response',async()=>{
 const r=await rehearse('duplicate_post');boundaries(r);assert.ok(r.fixtureModelPosts>=1&&r.fixtureModelPosts<=2);assert.equal(r.appServerTurnsRequested,1);
 if(r.fixtureModelPosts===2){assert.equal(r.status,'blocked');assert.equal(r.reason,'unexpected_fixture_dispatch');}
});
test('closed arguments reject credentials, transport authority, getters and wrapper execution',()=>{
 let touched=false;assert.throws(()=>rehearse('empty_tools',{get timeoutMs(){touched=true;return 1;}}));assert.equal(touched,false);
 for(const o of [{key:'fictional'},{url:'fictional'},{provider:'openai'},{timeoutMs:30001}])assert.throws(()=>rehearse('empty_tools',o));
 assert.throws(()=>observe('codex.cmd'));assert.throws(()=>observe(process.execPath));assert.throws(()=>rehearse('login'));
});
test('CLI defaults to a fictional peer and refuses live/model/account flags',()=>{
 const good=spawnSync(process.execPath,[cli],{encoding:'utf8'});assert.equal(good.status,0);const r=JSON.parse(good.stdout);boundaries(r);assert.equal(r.kind,'independent_node_peer');
 for(const args of [['--live'],['--model','other'],['login']]){const bad=spawnSync(process.execPath,[cli,...args],{encoding:'utf8'});assert.equal(bad.status,1);assert.equal(JSON.parse(bad.stdout).dispatchEnabled,false);}
});
test('parent credentials, Node flags and proxy state are absent from the local peer environment',async()=>{
 const keys=['OPENAI_API_KEY','ACCESS_TOKEN','NODE_OPTIONS','NODE_PATH','NIGHTVOYAGE_DEEPSEEK_KEY','HTTPS_PROXY'],saved=keys.map(k=>[k,process.env[k]]);
 try{for(const k of keys)process.env[k]='fictional-parent-sentinel';const r=await rehearse();boundaries(r);assert.equal(r.status,'request_observed');}
 finally{for(const [k,v] of saved)if(v===undefined)delete process.env[k];else process.env[k]=v;}
});
test('cleanup failure blocks an observed request and returns no filesystem error body',async t=>{
 let root;const mock=t.mock.method(fs.promises,'rm',async p=>{root=p;throw Object.assign(Error('fictional-private-file'),{code:'EBUSY'});});
 try{const r=await rehearse();assert.equal(r.status,'blocked');assert.equal(r.reason,'temporary_cleanup_failed');assert.equal(r.temporaryCleanupFailureCode,'EBUSY');assert.equal(r.requestObservation.toolCount,0);assert.ok(!JSON.stringify(r).includes(root));}
 finally{mock.mock.restore();if(root)await fs.promises.rm(root,{recursive:true,force:true});}
});

test('reviewed lifecycle metadata accepts only the fixed probe user item and rejects foreign turns, altered text and approval status',async()=>{
 const success=await rehearse('lifecycle');boundaries(success);assert.equal(success.status,'request_observed');
 for(const scenario of ['foreign_turn','altered_user_item','approval_status']){
  const r=await rehearse(scenario);boundaries(r);assert.equal(r.status,'blocked');assert.ok(['unexpected_notification','turn_mismatch'].includes(r.reason));
 }
});
