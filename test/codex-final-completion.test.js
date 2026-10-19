import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {rehearseCodexFinalCompletion as run,observeNativeCodexFinalCompletion} from '../scripts/codex-interaction-refusal.mjs';
import {fixedFinalAnswerSse,CodexFixedCompletion} from '../scripts/codex-fixed-completion.mjs';
function boundary(r){
 for(const k of ['dispatchEnabled','toolExclusionVerified','modelEntitlementVerified','subscriptionCapabilityInferred','credentialEnvironmentSupplied','accountAuthorizationRequested','backgroundNetworkInstrumented'])assert.equal(r[k],false);
 assert.equal(r.temporaryCleanupComplete,true);assert.equal(r.ownedProcessClosed,true);assert.ok(r.fixtureModelPosts<=1);
 assert.equal(r.refusalObservation,null);assert.equal(r.refusalTracePolicy,null);assert.equal(r.expectedTraceContinuationRequested,false);
 assert.equal(r.notificationOptOutVerified,false);assert.equal(r.requestBodyRetained,false);
 assert.ok(!JSON.stringify(r).includes('fictional-private-'));
}
test('fixed SSE is detached original fictional final output; no tool call or caller response override',()=>{
 const a=fixedFinalAnswerSse(),b=fixedFinalAnswerSse();a.fill(0);assert.ok(b.toString().includes('output_text'));assert.ok(!b.toString().includes('function_call'));assert.throws(()=>fixedFinalAnswerSse('other'));
});
test('one local POST completes bound fixed final message and completed turn without release or admission',async()=>{
 const r=await run();boundary(r);assert.equal(r.status,'fixed_final_completion_observed');assert.equal(r.fixtureModelPosts,1);assert.equal(r.appServerTurnsRequested,1);assert.equal(r.requestObservation.toolCount,0);assert.equal(r.finalObservation.fixedAnswerMatched,true);assert.equal(r.finalObservation.turnCompleted,true);assert.equal(r.finalObservation.bodyReturned,false);assert.equal(r.finalObservation.usage,'unknown');
});
for(const scenario of ['final_wrong_text','final_wrong_item','final_wrong_turn','final_failed','final_hidden_tool','final_duplicate_item','final_tool_request','final_stderr','final_nonempty_tools'])test(`${scenario} cannot release a successful final receipt`,async()=>{
 const r=await run(scenario);boundary(r);assert.equal(r.status,'blocked');assert.equal(r.finalObservation,null);
});
test('missing completed turn and cancellation suppress any completed message or late data',async()=>{
 const r=await run('final_no_complete',{timeoutMs:350});boundary(r);assert.equal(r.status,'blocked');assert.equal(r.finalObservation,null);
 const c=new AbortController();const task=run('final_late',{signal:c.signal});setTimeout(()=>c.abort(),200);const q=await task;boundary(q);assert.equal(q.status,'cancelled');assert.equal(q.finalObservation,null);
 const before=new AbortController();before.abort();const p=await run('final_success',{signal:before.signal});assert.equal(p.processStarted,false);assert.equal(p.finalObservation,null);
});
test('parser closes after invalid identity; completion without a fixed item never succeeds',()=>{
 for(const e of [{method:'turn/completed',params:{threadId:'t',turn:{id:'u',status:'completed'}}},{method:'item/started',params:{threadId:'other',turnId:'u',item:{id:'i',type:'agentMessage',phase:'final_answer'}}}]){
  const p=new CodexFixedCompletion('t','u');assert.throws(()=>p.push(e),/^Error: final_completion_rejected$/);assert.throws(()=>p.push(e));
 }
});
test('closed launch options reject login, transport, arbitrary responses, caller getters and CLI flags',()=>{
 for(const opts of [{login:true},{response:'fictional'},{simulator:()=>{}},{continueExpectedTrace:true},{provider:'openai'}])assert.throws(()=>run('final_success',opts));
 let touched=false;assert.throws(()=>run('final_success',{get timeoutMs(){touched=true;return 1;}}));assert.equal(touched,false);
 assert.throws(()=>observeNativeCodexFinalCompletion('relative-codex'));
 const r=spawnSync(process.execPath,[fileURLToPath(new URL('../scripts/check-codex-final-completion.mjs',import.meta.url)),'--live'],{encoding:'utf8'});assert.equal(r.status,1);assert.equal(JSON.parse(r.stdout).dispatchEnabled,false);
});
