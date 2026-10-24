// Trusted prelude only: graph/source checks precede the new one-dream core.
import path from 'node:path';
import https from 'node:https';
import {fileURLToPath} from 'node:url';
import {assertInlineChildEnvironment} from '../../src/inline-child-environment.js';
import {constrainOneDreamModules, readSafeJson, verifyOneDreamGraph} from './source.mjs';

const root=fileURLToPath(new URL('../..',import.meta.url));
const actions=['proposal','preflight','init','read','revoke','rehearse','run','resume'];
try{
  const [action,directory,confirmationText,...extra]=process.argv.slice(2);
  if(extra.length||!actions.includes(action)||!directory||directory!=='-'&&!path.isAbsolute(directory))throw Error();
  assertInlineChildEnvironment();
  if(typeof confirmationText!=='string'||confirmationText.length>4096)throw Error();
  const confirmation=JSON.parse(confirmationText);if(action!=='init'&&confirmation!==null)throw Error();
  const contract=readSafeJson(root,'docs/proposals/deepseek-one-dream-20261025.json');
  const graph=verifyOneDreamGraph({repositoryRoot:root,contract});
  Object.defineProperty(globalThis,'fetch',{value:()=>{throw Error('one_dream_native_fetch_forbidden');},writable:false,configurable:false});
  if(!['run','resume'].includes(action))Object.defineProperty(https,'request',{value:()=>{throw Error('one_dream_native_https_forbidden');},writable:false,configurable:false});
  constrainOneDreamModules(graph,root);
  const {runOneDreamSession}=await import('./session.mjs');
  const value=await runOneDreamSession(action,directory,confirmation,message=>console.log(JSON.stringify(message)));
  console.log(JSON.stringify({type:'result',value}));
}catch{console.error('one_dream_entry_refused');process.exitCode=1;}
finally{process.stdin.destroy();}
