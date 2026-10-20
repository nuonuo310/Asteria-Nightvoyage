import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createOwnedChildStop} from '../scripts/codex-owned-child-stop.mjs';
async function fixture(source,extra={}){
 const c=spawn(process.execPath,['--input-type=module','-e',`process.stdin.resume();${source};console.log('ready');`],{env:{SystemRoot:process.env.SystemRoot??''},stdio:['pipe','pipe','pipe']});
 const closed=new Promise(r=>c.once('close',r));let text='';const stopper=createOwnedChildStop(c,extra);
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('fixture_start_timeout')),3000);c.stdout.on('data',b=>{text+=b;if(text.includes('ready')){clearTimeout(timer);resolve();}});c.once('error',reject);});
 return {c,closed,stopper,async close(){if(c.exitCode===null&&c.signalCode===null)c.kill('SIGKILL');await closed;}};
}
test('normal EOF permits owned resource release before a zero exit without a signal',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-eof-resource-')),file=path.join(root,'independent-fixture');
 const f=await fixture(`import fs from 'node:fs';const fd=fs.openSync(${JSON.stringify(file)},'w');process.stdin.on('end',()=>{fs.closeSync(fd);fs.unlinkSync(${JSON.stringify(file)});process.exit(0);})`);
 try{assert.equal(fs.existsSync(file),true);f.stopper.finishNormally();await f.closed;assert.equal(fs.existsSync(file),false);const v=f.stopper.view();assert.equal(v.stdinEofRequested,true);assert.equal(v.forceStopRequested,false);assert.equal(v.gracefulZeroExitObserved,true);assert.equal(v.cleanupProven,false);}finally{await f.close();fs.rmSync(root,{recursive:true,force:true});}
});
test('EOF grace is bounded for a child that ignores EOF; no second stop or restart',async()=>{
 const f=await fixture("process.stdin.on('end',()=>{});setInterval(()=>{},1000)",{graceMs:30});try{f.stopper.finishNormally();f.stopper.finishNormally();await f.closed;const v=f.stopper.view();assert.equal(v.stopClass,'eof_deadline');assert.equal(v.forceStopRequested,true);assert.equal(v.gracefulZeroExitObserved,false);assert.equal(v.processesRestarted,0);}finally{await f.close();}
});
test('failure or cancellation does not wait for EOF grace',async()=>{
 const f=await fixture('setInterval(()=>{},1000)',{graceMs:3000});try{f.stopper.abort();await f.closed;const v=f.stopper.view();assert.equal(v.stdinEofRequested,false);assert.equal(v.stopClass,'failure_or_cancellation');assert.equal(v.forceStopRequested,true);}finally{await f.close();}
});
test('abort during EOF grace overrides normal drain and remains idempotent',async()=>{
 const f=await fixture("process.stdin.on('end',()=>{});setInterval(()=>{},1000)",{graceMs:3000});try{f.stopper.finishNormally();f.stopper.abort();f.stopper.abort();await f.closed;assert.equal(f.stopper.view().stopClass,'failure_or_cancellation');f.stopper.finishNormally();assert.equal(f.stopper.view().forceStopRequested,true);}finally{await f.close();}
});
test('EOF followed by nonzero exit is not reported as graceful success',async()=>{
 const f=await fixture("process.stdin.on('end',()=>process.exit(7))");try{f.stopper.finishNormally();await f.closed;const v=f.stopper.view();assert.equal(v.exitCodeClass,'nonzero');assert.equal(v.gracefulZeroExitObserved,false);assert.equal(v.forceStopRequested,false);}finally{await f.close();}
});
test('unowned, already exited, unknown and executable option objects are refused',async()=>{
 assert.throws(()=>createOwnedChildStop({stdin:{end(){}}}));const f=await fixture("process.stdin.on('end',()=>process.exit(0))");try{for(const options of [{graceMs:0},{graceMs:3001},{signal:'other'},{get graceMs(){throw Error('FICTIONAL-PRIVATE');}}])assert.throws(()=>createOwnedChildStop(f.c,options));f.stopper.finishNormally();await f.closed;assert.throws(()=>createOwnedChildStop(f.c));}finally{await f.close();}
});
