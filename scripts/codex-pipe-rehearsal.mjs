// Fixed Node peer only. There is deliberately no executable/env/provider override.
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {CodexRpcRehearsal} from './codex-rpc-rehearsal.mjs';
export const codexPipeRehearsalVersion='offline-codex-node-pipe-v1';
export function runCodexPipeRehearsal(draft,options={}){
 if(!options||Object.getPrototypeOf(options)!==Object.prototype||Reflect.ownKeys(options).some(k=>!['signal','timeoutMs','scenario'].includes(k)||!Object.hasOwn(Object.getOwnPropertyDescriptor(options,k),'value')))throw Error('codex_pipe_options_invalid');
 const {signal,timeoutMs=10000,scenario='success'}=options;
 if((signal!==undefined&&!(signal instanceof AbortSignal))||!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>60000||!['success','exit_after_initialize','exit_after_turn','stall','stderr','trailing','invalid'].includes(scenario))throw Error('codex_pipe_options_invalid');
 const session=new CodexRpcRehearsal(draft);
 if(signal?.aborted){session.cancel();return Promise.reject(Error('cancelled'));}
 const cwd=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-node-peer-'));
 // No inherited keys, OAuth state, HOME, PATH, NODE_OPTIONS or proxy settings.
 const env=process.platform==='win32'&&process.env.SystemRoot?{SystemRoot:process.env.SystemRoot}:{};
 let child;
 try{child=spawn(process.execPath,[fileURLToPath(new URL('../test-support/codex-rpc-peer-child.mjs',import.meta.url)),scenario],{cwd,env,shell:false,windowsHide:true,stdio:['pipe','pipe','pipe']});}
 catch{fs.rmSync(cwd,{recursive:true,force:true});throw Error('codex_pipe_rejected');}
 return new Promise((resolve,reject)=>{
  let failure=null,closed=false;
  const stop=reason=>{if(closed)return;if(!failure)failure=reason;session.cancel();child.kill('SIGKILL');};
  const onAbort=()=>stop('cancelled'),timer=setTimeout(()=>stop('timeout'),timeoutMs);
  signal?.addEventListener('abort',onAbort,{once:true});
  child.once('error',()=>stop('codex_pipe_rejected'));
  child.stdin.on('error',()=>stop('codex_pipe_rejected'));
  child.stdout.on('error',()=>stop('codex_pipe_rejected'));
  child.stderr.on('error',()=>stop('codex_pipe_rejected'));
  child.stderr.on('data',()=>stop('codex_pipe_rejected'));
  const write=()=>{
   for(const frame of session.drain()){
    const bytes=Buffer.from(JSON.stringify(frame)+'\n');
    if(bytes.length>65536){stop('codex_pipe_rejected');return;}
    child.stdin.write(bytes,error=>{if(error)stop('codex_pipe_rejected');});
   }
  };
  child.stdout.on('data',bytes=>{
   if(failure||closed)return;
   try{session.push(bytes);write();}catch{stop('codex_pipe_rejected');}
  });
  child.once('close',code=>{
   closed=true;clearTimeout(timer);signal?.removeEventListener('abort',onAbort);
   let result,reason;
   try{
    if(failure||code!==0||signal?.aborted)throw Error(failure??(signal?.aborted?'cancelled':'codex_pipe_rejected'));
    result=session.finish();
   }catch(error){session.cancel();reason=['cancelled','timeout'].includes(error.message)?error.message:'codex_pipe_rejected';}
   try{fs.rmSync(cwd,{recursive:true,force:true});}catch{reason='codex_pipe_rejected';}
   if(reason)reject(Error(reason));else resolve({...result,pipeProtocolVersion:codexPipeRehearsalVersion,syntheticChildClosed:true});
  });
  if(signal?.aborted)onAbort();else write();
 });
}
