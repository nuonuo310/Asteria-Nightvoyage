import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {codeModeGuardOverrides,reviewCodeModeGuardConfig,reviewCodeModeGuardWarning} from '../scripts/codex-code-mode-guard-review.mjs';
import {LocalDispatchJournal} from '../scripts/codex-local-dispatch-journal.mjs';
import {fictionalGuardConfig,fictionalGuardWarning,rehearseCodeModeGuard} from '../test-support/code-mode-guard-rehearsal.mjs';
const configured=edit=>{const c=JSON.parse(fictionalGuardConfig());edit(c.result.config);return JSON.stringify(c);};
function memory(){let saved=LocalDispatchJournal.initialSnapshot();return {read:()=>saved,save:s=>{saved=s;}};}
test('guard requires both explicit false flags and all earlier controls; unknown configuration never passes',()=>{
 const flags=codeModeGuardOverrides();assert.ok(flags.includes('features.code_mode_host=false'));assert.ok(flags.includes('code_mode.disable_in_process_fallback=false'));
 assert.equal(reviewCodeModeGuardConfig(fictionalGuardConfig()).candidateConfigurationMatched,true);
 for(const host of [false,true])for(const fallback of [false,true])assert.equal(reviewCodeModeGuardConfig(configured(c=>{c.features.code_mode_host=host;c.code_mode.disable_in_process_fallback=fallback;})).candidateConfigurationMatched,!host&&!fallback);
 for(const edit of [c=>delete c.features.code_mode_host,c=>delete c.code_mode,c=>c.code_mode.disable_in_process_fallback='false',c=>c.features.shell_tool=true,c=>c.mcp_servers={fictional:{}},c=>c.features.code_mode_host=null])assert.equal(reviewCodeModeGuardConfig(configured(edit)).candidateConfigurationMatched,false);
 for(const text of ['{','null','x'.repeat(65537)])assert.throws(()=>reviewCodeModeGuardConfig(text));
 const r=reviewCodeModeGuardConfig(fictionalGuardConfig());assert.equal(r.localTransportVerified,false);assert.equal(r.providerOverrideExcluded,false);assert.equal(r.nativeHandlerDenialVerified,false);
});
test('only exact bounded thread-bound warning permits fixture continuation and never native admission',()=>{
 const config=fictionalGuardConfig(),warn=fictionalGuardWarning();assert.equal(reviewCodeModeGuardWarning(config,warn,'fictional-guard-thread-1').fixtureContinuationAllowed,true);
 for(const edit of [e=>e.params.threadId='fictional-guard-thread-2',e=>e.params.message+=' extra',e=>e.params.extra='PRIVATE-FIXTURE',e=>e.method='error']){
  const e=JSON.parse(warn);edit(e);const r=reviewCodeModeGuardWarning(config,JSON.stringify(e),'fictional-guard-thread-1');assert.equal(r.fixtureContinuationAllowed,false);assert.ok(!JSON.stringify(r).includes('PRIVATE-FIXTURE'));
 }
 assert.equal(reviewCodeModeGuardWarning(configured(c=>c.features.code_mode_host=true),warn,'fictional-guard-thread-1').fixtureContinuationAllowed,false);
 for(const w of ['{','x'.repeat(4097)])assert.throws(()=>reviewCodeModeGuardWarning(config,w,'fictional-guard-thread-1'));
 assert.throws(()=>reviewCodeModeGuardWarning(config,warn,'arbitrary-thread'));
});
test('each POST reserves independently before dispatch; completion cannot erase count or permit a third intent',()=>{
 const m=memory();let j=new LocalDispatchJournal(m.read(),m.save);
 assert.throws(()=>j.complete());assert.equal(j.reserve(),1);assert.equal(JSON.parse(m.read()).calls,1);assert.throws(()=>j.reserve());j.complete();
 j=new LocalDispatchJournal(m.read(),m.save);assert.equal(j.reserve(),2);j.complete();j=new LocalDispatchJournal(m.read(),m.save);assert.throws(()=>j.reserve());assert.throws(()=>j.complete());assert.equal(j.view().calls,2);
 const detached=j.view();detached.calls=0;assert.equal(j.view().calls,2);
});
test('reopening either in-flight checkpoint cannot acknowledge or replay an ambiguous request',()=>{
 for(const ordinal of [1,2]){const m=memory(),j=new LocalDispatchJournal(m.read(),m.save);j.reserve();if(ordinal===2){j.complete();j.reserve();}
  const r=new LocalDispatchJournal(m.read(),m.save);assert.equal(r.view().ambiguousDispatch,true);assert.throws(()=>r.reserve());assert.throws(()=>r.complete());assert.equal(r.view().calls,ordinal);
 }
});
test('cancellation blocks late completion, further dispatch and restored access without erasing intent count',()=>{
 for(const n of [0,1,2]){const m=memory(),j=new LocalDispatchJournal(m.read(),m.save);if(n){j.reserve();if(n===2){j.complete();j.reserve();}}j.cancel();j.cancel();assert.throws(()=>j.complete());assert.throws(()=>j.reserve());const r=new LocalDispatchJournal(m.read(),m.save);assert.equal(r.view().calls,n);assert.throws(()=>r.reserve());assert.throws(()=>r.complete());}
});
test('save failures at reserve, completion and cancellation close the live owner; saved pending state stays blocked',()=>{
 for(const at of [1,2,3]){const m=memory();let saves=0;const j=new LocalDispatchJournal(m.read(),s=>{if(++saves===at)throw Error('PRIVATE-FIXTURE');m.save(s);});
  if(at===1)assert.throws(()=>j.reserve(),/dispatch_persistence_failed/);
  if(at===2){j.reserve();assert.throws(()=>j.complete(),/dispatch_persistence_failed/);}
  if(at===3){j.reserve();j.complete();assert.throws(()=>j.cancel(),/dispatch_persistence_failed/);}
  assert.equal(j.view().persistenceFailed,true);assert.throws(()=>j.reserve());assert.throws(()=>j.complete());assert.throws(()=>j.cancel());
  assert.ok(!JSON.stringify(j.view()).includes('PRIVATE-FIXTURE'));
 }
});
test('malformed snapshots, asynchronous persistence and reentrant reservation cannot bypass accounting',()=>{
 for(const s of ['null','{}','{','x'.repeat(1025),JSON.stringify({version:'independent-local-dispatch-journal-v1',phase:'ready',calls:1}),JSON.stringify({...JSON.parse(LocalDispatchJournal.initialSnapshot()),extra:true})])assert.throws(()=>new LocalDispatchJournal(s,()=>{}));
 const asyncSave=new LocalDispatchJournal(LocalDispatchJournal.initialSnapshot(),()=>Promise.resolve());assert.throws(()=>asyncSave.reserve());assert.equal(asyncSave.view().persistenceFailed,true);
 let j;j=new LocalDispatchJournal(LocalDispatchJournal.initialSnapshot(),()=>{j.reserve();});assert.throws(()=>j.reserve());assert.equal(j.view().calls,0);assert.equal(j.view().persistenceFailed,true);
});
test('independent loopback rehearsal verifies persisted intent before both actual HTTP requests and ambiguous reopen',async()=>{
 const r=await rehearseCodeModeGuard();assert.equal(r.status,'passed');assert.equal(r.localPosts,2);assert.equal(r.intentsSavedBeforeEachLocalPost,2);assert.equal(r.realProviderAccountingIntegrated,false);assert.equal(r.nativeChildrenStarted,0);assert.equal(r.nativeHandlerDenialVerified,false);
});
test('offline CLI rejects login, native executable and model overrides without accepting authority',()=>{
 const cli=fileURLToPath(new URL('../scripts/check-codex-code-mode-guard.mjs',import.meta.url));
 for(const args of [['--login'],['--native-executable','/fictional/codex'],['--model','gpt-5.6-sol']]){const p=spawnSync(process.execPath,[cli,...args],{encoding:'utf8'});assert.equal(p.status,1);assert.equal(JSON.parse(p.stdout).dispatchEnabled,false);}
});

test('write-then-error leaves a reserved checkpoint that reopening cannot dispatch or acknowledge',()=>{
 const m=memory(),j=new LocalDispatchJournal(m.read(),s=>{m.save(s);throw Error('fictional_after_write');});
 assert.throws(()=>j.reserve());assert.equal(j.view().calls,0);assert.equal(j.view().persistenceFailed,true);
 const r=new LocalDispatchJournal(m.read(),m.save);assert.equal(r.view().calls,1);assert.throws(()=>r.reserve());assert.throws(()=>r.complete());
});
test('default CLI runs only the independent guard rehearsal with two local posts and no native execution',()=>{
 const cli=fileURLToPath(new URL('../scripts/check-codex-code-mode-guard.mjs',import.meta.url));
 const p=spawnSync(process.execPath,[cli],{encoding:'utf8'});assert.equal(p.status,0,p.stderr);const r=JSON.parse(p.stdout);
 assert.equal(r.status,'passed');assert.equal(r.localPosts,2);assert.equal(r.realModelRequests,0);assert.equal(r.nativeChildrenStarted,0);assert.equal(r.nativeConfigurationVerified,false);assert.equal(r.productionAdmission,false);
});
