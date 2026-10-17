// Fresh process with a fixed simulator only. No paid init, key or transport option.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
export const inlineBootstrapVersion='inline-clean-stub-bootstrap-v1';
const root=fileURLToPath(new URL('..',import.meta.url));
import {inlineChildEnvironment} from './inline-child-environment.js';
export {inlineChildEnvironment};
export function launchInlineStub(command,directory){
  if(!['run','resume'].includes(command)||typeof directory!=='string'||!path.isAbsolute(directory)||directory.includes('\0'))return Promise.reject(Error('invalid_stub_bootstrap_arguments'));
  return new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,['--experimental-vm-modules',fileURLToPath(new URL('./inline-stub-worker.js',import.meta.url)),command,directory],{cwd:root,env:inlineChildEnvironment(),stdio:['ignore','pipe','pipe'],windowsHide:true,shell:false});
    let output='',bytes=0,stopped=false;
    const stop=()=>{stopped=true;child.kill('SIGKILL');};
    const timer=setTimeout(stop,15000);
    const cancel=()=>{stopped=true;child.kill('SIGTERM');};
    process.on('SIGINT',cancel);process.on('SIGTERM',cancel);
    child.stdout.on('data',chunk=>{bytes+=chunk.length;if(bytes>16384)stop();else output+=chunk.toString('utf8');});
    // Never forward Node/provider exception text or paths from the worker.
    child.stderr.on('data',chunk=>{bytes+=chunk.length;if(bytes>32768)stop();});
    const cleanup=()=>{clearTimeout(timer);process.off('SIGINT',cancel);process.off('SIGTERM',cancel);};
    child.on('error',()=>{cleanup();reject(Error('stub_bootstrap_process_failed'));});
    child.on('close',code=>{cleanup();if(stopped||code!==0){reject(Error('stub_bootstrap_refused'));return;}try{const value=JSON.parse(output);if(value.bootstrapVersion!==inlineBootstrapVersion||value.liveEntryAvailable!==false||value.nativeRequests!==0||value.credentialReads!==0)throw Error();resolve(value);}catch{reject(Error('stub_bootstrap_output_invalid'));}});
  });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2);
  if(args.length!==3||!['run','resume'].includes(args[0])||args[1]!=='--data-dir'){
    console.error('Usage: node src/inline-stub-launcher.js run|resume --data-dir <absolute existing authorized stub Store>. Fixed local simulator only; no init/live/key/budget options.');process.exitCode=1;
  }else{
    try{console.log(JSON.stringify(await launchInlineStub(args[0],args[2]),null,2));}catch{console.error('stub_bootstrap_refused');process.exitCode=1;}
  }
}
