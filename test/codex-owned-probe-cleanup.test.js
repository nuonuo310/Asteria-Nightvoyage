import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createOwnedProbeCleanup} from '../scripts/codex-owned-probe-cleanup.mjs';
import {rehearseCodexAccountedWait} from '../scripts/codex-accounted-wait-owner.mjs';
const temp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-request-observer-'));
const busy=(root,code='EBUSY')=>Object.assign(Error('FICTIONAL-PRIVATE-ERROR'),{code,syscall:'rmdir',path:path.join(root,'cwd','FICTIONAL-PRIVATE')});
function fastBackoff(t){const seen=[];t.mock.method(globalThis,'setTimeout',(fn,ms)=>{seen.push(ms);queueMicrotask(fn);return {};});return seen;}
test('single leased owned directory is removed and verified absent; lease cannot be reused or retargeted',async()=>{
 const root=temp(),cleanup=createOwnedProbeCleanup(root);fs.mkdirSync(path.join(root,'cwd'));const r=await cleanup();assert.equal(r.status,'removed');assert.equal(r.attempts,1);assert.equal(r.pathReturned,false);assert.equal(fs.existsSync(root),false);await assert.rejects(cleanup());
});
test('transient busy errors use bounded outer backoff and retain only fixed location/code witnesses',async t=>{
 const root=temp(),cleanup=createOwnedProbeCleanup(root),remove=fs.promises.rm,delays=fastBackoff(t);let n=0;
 t.mock.method(fs.promises,'rm',async(p,opts)=>{assert.equal(p,root);assert.deepEqual(opts,{recursive:true,force:true,maxRetries:0});if(n++<2)throw busy(root);return remove(p,opts);});
 try{const r=await cleanup();assert.equal(r.status,'removed');assert.equal(r.attempts,3);assert.equal(r.retries,2);assert.equal(r.scheduledDelayMs,300);assert.deepEqual(delays,[100,200]);assert.deepEqual(r.firstFailure,{code:'EBUSY',operation:'rmdir',locationClass:'cwd'});assert.ok(!JSON.stringify(r).includes('FICTIONAL-PRIVATE'));assert.ok(!JSON.stringify(r).includes(root));}finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('persistent busy error is terminal after eight attempts; it never becomes successful cleanup',async t=>{
 const root=temp(),cleanup=createOwnedProbeCleanup(root),delays=fastBackoff(t);t.mock.method(fs.promises,'rm',async()=>{throw busy(root);});
 try{const r=await cleanup();assert.equal(r.status,'blocked');assert.equal(r.attempts,8);assert.equal(r.retries,7);assert.equal(r.scheduledDelayMs,6300);assert.equal(delays.length,7);assert.equal(r.stopClass,'cleanup_retry_limit');assert.equal(fs.existsSync(root),true);}finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('unknown errors are not retried and arbitrary details cannot enter the witness',async t=>{
 const root=temp(),cleanup=createOwnedProbeCleanup(root);t.mock.method(fs.promises,'rm',async()=>{throw Object.assign(Error('FICTIONAL-PRIVATE'),{code:'PRIVATE-CODE',syscall:'PRIVATE-OP',path:'PRIVATE-PATH'});});
 try{const r=await cleanup();assert.equal(r.attempts,1);assert.equal(r.retries,0);assert.deepEqual(r.lastFailure,{code:'unknown',operation:'unknown',locationClass:'unavailable'});assert.equal(r.stopClass,'non_retryable_cleanup_error');assert.ok(!JSON.stringify(r).includes('PRIVATE'));}finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('diagnostic paths outside the lease are classified but never passed to removal',async t=>{
 const root=temp(),other=temp(),cleanup=createOwnedProbeCleanup(root);let passed;
 t.mock.method(fs.promises,'rm',async p=>{passed=p;throw Object.assign(Error('fictional'),{code:'EINVAL',path:other,syscall:'unlink'});});
 try{const r=await cleanup();assert.equal(passed,root);assert.equal(r.lastFailure.locationClass,'outside_owned_root');assert.equal(fs.existsSync(other),true);assert.ok(!JSON.stringify(r).includes(other));}finally{for(const p of [root,other])fs.rmSync(p,{recursive:true,force:true});}
});
test('replacement of the leased root blocks deletion of the replacement directory',async()=>{
 const root=temp(),moved=root+'-preserved',cleanup=createOwnedProbeCleanup(root);fs.renameSync(root,moved);fs.mkdirSync(root);
 try{const r=await cleanup();assert.equal(r.status,'blocked');assert.equal(r.attempts,0);assert.equal(r.stopClass,'owned_root_identity_changed');assert.equal(fs.existsSync(root),true);}finally{for(const p of [root,moved])fs.rmSync(p,{recursive:true,force:true});}
});
test('a removal promise resolving without deleting the directory is not accepted',async t=>{
 const root=temp(),cleanup=createOwnedProbeCleanup(root);t.mock.method(fs.promises,'rm',async()=>{});
 try{const r=await cleanup();assert.equal(r.status,'blocked');assert.equal(r.stopClass,'removal_not_confirmed');}finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('arbitrary directories, symlinks and extra cleanup arguments cannot acquire a lease',async()=>{
 const root=temp(),other=fs.mkdtempSync(path.join(os.tmpdir(),'fictional-other-')),link=root+'-link';
 try{assert.throws(()=>createOwnedProbeCleanup(other));assert.throws(()=>createOwnedProbeCleanup(root,{}));assert.throws(()=>createOwnedProbeCleanup(path.join(root,'cwd')));fs.symlinkSync(root,link,process.platform==='win32'?'junction':'dir');assert.throws(()=>createOwnedProbeCleanup(link));const cleanup=createOwnedProbeCleanup(root);await assert.rejects(cleanup('another-root'));assert.equal(fs.existsSync(root),true);await cleanup();}finally{try{fs.lstatSync(link);if(process.platform==='win32')fs.rmdirSync(link);else fs.unlinkSync(link);}catch(error){if(error.code!=='ENOENT')throw error;}for(const p of [root,other])fs.rmSync(p,{recursive:true,force:true});}
});
test('accounted wait retains completed forwarding across transient cleanup errors without restarting a peer',async t=>{
 const remove=fs.promises.rm;let n=0;t.mock.method(fs.promises,'rm',async(root,opts)=>{if(n++<2)throw busy(root);return remove(root,opts);});
 const r=await rehearseCodexAccountedWait();assert.equal(r.status,'selected_wait_denial_observed');assert.equal(r.localForwardAccounting.forwardedLocalRequests,2);assert.equal(r.cleanupReview.attempts,3);assert.equal(r.cleanupReview.processesRestarted,0);assert.equal(r.temporaryCleanupComplete,true);assert.equal(r.temporaryCleanupFailureCode,null);assert.equal(r.cleanupReview.firstFailure.code,'EBUSY');
});
test('completed forwarding cannot promote persistent cleanup failure to an accepted overall result',async t=>{
 let root;const remove=fs.promises.rm;t.mock.method(fs.promises,'rm',async p=>{root=p;throw busy(p);});
 try{const r=await rehearseCodexAccountedWait();assert.equal(r.status,'blocked');assert.equal(r.reason,'temporary_cleanup_failed');assert.equal(r.localForwardAccounting.journal.phase,'completed');assert.equal(r.temporaryCleanupComplete,false);assert.equal(r.temporaryCleanupFailureCode,'EBUSY');assert.equal(r.cleanupReview.attempts,8);assert.ok(!JSON.stringify(r).includes(root));}finally{t.mock.restoreAll();if(root)await remove(root,{recursive:true,force:true});}
});
test('cleanup success after a transient busy result does not erase an earlier protocol failure',async t=>{
 const remove=fs.promises.rm;let n=0;t.mock.method(fs.promises,'rm',async(root,opts)=>{if(n++===0)throw busy(root);return remove(root,opts);});
 const r=await rehearseCodexAccountedWait('wrong_output');assert.equal(r.status,'blocked');assert.equal(r.reason,'guard_wait_output_unclassified');assert.equal(r.temporaryCleanupComplete,true);assert.equal(r.cleanupReview.firstFailure.code,'EBUSY');
});
