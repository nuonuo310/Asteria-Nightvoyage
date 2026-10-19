import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {CodexStartupDiagnostics} from '../scripts/codex-startup-diagnostics.mjs';
const bytes=text=>Buffer.from(text);
test('short startup error is observable before a still-open independent child exits',async()=>{
 const child=spawn(process.execPath,[fileURLToPath(new URL('../test-support/codex-startup-peer.mjs',import.meta.url))],{env:process.platform==='win32'?{SystemRoot:process.env.SystemRoot}:{},stdio:['pipe','ignore','pipe'],shell:false,windowsHide:true});
 const diagnostics=new CodexStartupDiagnostics();let closed=false;child.once('close',()=>{closed=true;});
 const close=new Promise(resolve=>child.once('close',resolve));
 try{
  const label=await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(Error('fictional_peer_deadline')),10000);
   child.once('error',error=>{clearTimeout(timer);reject(error);});
   child.stderr.on('data',chunk=>{try{const labels=diagnostics.push(chunk);if(labels.length){clearTimeout(timer);resolve(labels[0]);}}catch(error){clearTimeout(timer);reject(error);}});
  });
  assert.equal(label,'sandbox_executable_lookup_failed');assert.equal(closed,false);
  assert.equal(child.exitCode,null);assert.equal(diagnostics.finish().dispatchEnabled,false);
 }finally{child.kill();await close;}
});
test('split UTF-8, ANSI color and CRLF preserve a fixed label without leaking text',()=>{
 const reader=new CodexStartupDiagnostics(),input=bytes('\u001b[2mERROR\u001b[0m Codex is ignoring 1 unrecognized configuration setting. 虚构私密哨兵\r\n');
 const observed=[];for(const byte of input)observed.push(...reader.push(Uint8Array.of(byte)));
 assert.deepEqual(observed,['unrecognized_configuration']);const report=reader.finish();
 assert.deepEqual(report.labels,observed);assert.ok(!JSON.stringify(report).includes('哨兵'));assert.equal(report.rawStderrReturned,false);
});
test('unknown error text and arbitrary locations are never returned or interpreted as successful startup',()=>{
 const reader=new CodexStartupDiagnostics();
 assert.deepEqual(reader.push(bytes('ERROR fictional-token fictional-private-location\n')),['unclassified_startup_error']);
 assert.deepEqual(reader.push(bytes('fictional diagnostic detail\n')),['unclassified_stderr']);
 const report=reader.finish();assert.ok(!JSON.stringify(report).includes('fictional-token'));
 assert.equal(report.toolExclusionVerified,false);assert.equal(report.emptyStreamProvesHealthyStartup,false);
});
test('empty stderr is not proof of healthy startup, authorization or tool absence',()=>{
 const report=new CodexStartupDiagnostics().finish();assert.deepEqual(report.labels,[]);assert.equal(report.observedBytes,0);
 for(const key of ['dispatchEnabled','toolExclusionVerified','emptyStreamProvesHealthyStartup'])assert.equal(report[key],false);
});
test('duplicate labels stay bounded and final unterminated lines are classified only at EOF',()=>{
 const reader=new CodexStartupDiagnostics();assert.deepEqual(reader.push(bytes('ERROR first\nERROR second\n')),['unclassified_startup_error']);
 assert.deepEqual(reader.push(bytes('plain unfinished')),[]);assert.deepEqual(reader.finish().labels,['unclassified_startup_error','unclassified_stderr']);
 assert.throws(()=>reader.push(bytes('late')),{message:'codex_startup_diagnostic_rejected'});
});
test('byte, line and frame-count limits are terminal and never echo content',()=>{
 for(const input of [bytes('x'.repeat(32769)),bytes('x'.repeat(8193)),bytes('\n'.repeat(129))]){
  const reader=new CodexStartupDiagnostics();assert.throws(()=>reader.push(input),{message:'codex_startup_diagnostic_rejected'});
  assert.throws(()=>reader.finish(),{message:'codex_startup_diagnostic_rejected'});
 }
});
test('malformed UTF-8, incomplete UTF-8 and caller objects reject without coercion',()=>{
 let called=false;const reader=new CodexStartupDiagnostics();assert.throws(()=>reader.push({toString(){called=true;}}));assert.equal(called,false);
 assert.throws(()=>new CodexStartupDiagnostics().push(Uint8Array.of(255)),{message:'codex_startup_diagnostic_rejected'});
 const incomplete=new CodexStartupDiagnostics();incomplete.push(Uint8Array.of(0xe4));assert.throws(()=>incomplete.finish(),{message:'codex_startup_diagnostic_rejected'});
});
