// Trusted prelude only; no core runtime is imported before source/loader checks.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import https from 'node:https';
import {verifyInlineBootstrap} from './inline-stub-worker.js';
import {constrainInlineModules} from './inline-entry-dependencies.js';
import {assertInlineChildEnvironment} from './inline-child-environment.js';
const actions=['proposal','preflight','init','read','revoke','run','resume','rehearse'];
try{
  const [action,directory,confirmationText,...extra]=process.argv.slice(2);
  if(extra.length||!actions.includes(action)||!directory||directory!=='-'&&!path.isAbsolute(directory))throw Error();
  assertInlineChildEnvironment();
  if(typeof confirmationText!=='string'||confirmationText.length>4096)throw Error();const confirmation=JSON.parse(confirmationText);
  if(action!=='init'&&confirmation!==null)throw Error();
  // Simulator-only clock: a rehearsal grant can never use the provider path.
  // run/resume/init/preflight always use the actual wall clock.
  if(action==='rehearse')Date.now=()=>Date.parse('2026-10-17T15:00:00Z');
  const graph=verifyInlineBootstrap({entry:'src/inline-paid-session.js',graphPath:'src/inline-paid-graph.json'});
  Object.defineProperty(globalThis,'fetch',{value:()=>{throw Error('unexpected_fetch_forbidden');},writable:false,configurable:false});
  if(!['run','resume'].includes(action))Object.defineProperty(https,'request',{value:()=>{throw Error('native_https_forbidden');},writable:false,configurable:false});
  constrainInlineModules(graph);
  const {runInlinePaidSession}=await import('./inline-paid-session.js');
  const value=await runInlinePaidSession(action,directory,confirmation,message=>console.log(JSON.stringify(message)));
  console.log(JSON.stringify({type:'result',value}));
}catch{console.error('inline_paid_entry_refused');process.exitCode=1;}
finally{process.stdin.destroy();}
