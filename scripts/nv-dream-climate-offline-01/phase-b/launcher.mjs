import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn,execFileSync} from 'node:child_process';
import {inlineChildEnvironment} from '../../../src/inline-child-environment.js';
import {fail} from '../../../src/store.js';
import {verifyLiveIdentity} from './identity.mjs';
import {revokeLiveRelease} from './release.mjs';
import {
  liveExpectedReleaseHash,livePerCallMaximumMicroCny,liveReleasePath,
  liveWorkerTimeoutMs,offlineHead,offlineParent,offlineTree
} from './config.mjs';

const directory=fileURLToPath(new URL('.',import.meta.url));
const repositoryRoot=path.resolve(directory,'../../..');
const workerPath=path.join(directory,'worker.mjs');
const hex=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);

function offlineProof(){
  const git=args=>execFileSync('git',['-c',`safe.directory=${repositoryRoot}`,...args],
    {cwd:repositoryRoot,encoding:'utf8'}).trim();
  try{execFileSync('git',['-c',`safe.directory=${repositoryRoot}`,'merge-base',
    '--is-ancestor',offlineHead,'HEAD'],{cwd:repositoryRoot,stdio:'ignore'});}
  catch{fail('dream_climate_live_offline_identity_changed');}
  const proof={head:git(['rev-parse',offlineHead]),tree:git(['rev-parse',`${offlineHead}^{tree}`]),
    parent:git(['rev-parse',`${offlineHead}^`])};
  if(proof.head!==offlineHead||proof.tree!==offlineTree||proof.parent!==offlineParent)
    fail('dream_climate_live_offline_identity_changed');
  return JSON.stringify(proof);
}

export function launchLive(action,{priceFile,credentialSupplier,timeoutMs=liveWorkerTimeoutMs}={}){
  if(!['preflight','run'].includes(action)||typeof priceFile!=='string'||!path.isAbsolute(priceFile)||
     credentialSupplier!==undefined&&typeof credentialSupplier!=='function'||
     !Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>liveWorkerTimeoutMs){
    return Promise.resolve({status:'blocked',ready:false,
      reason:'invalid_dream_climate_live_launcher_arguments',credentialSupplierCalls:0,
      networkAttempts:0,storeCreated:false});
  }
  if(action==='run'&&typeof credentialSupplier!=='function'){
    return Promise.resolve({status:'blocked',ready:false,
      reason:'dream_climate_live_credential_source_unavailable',credentialSupplierCalls:0,
      networkAttempts:0,storeCreated:false});
  }
  let proof,identity;
  try{
    proof=offlineProof();identity=verifyLiveIdentity();
  }catch(error){
    return Promise.resolve({status:'blocked',ready:false,
      reason:error?.message??'dream_climate_live_identity_changed',
      credentialSupplierCalls:0,networkAttempts:0,storeCreated:false});
  }
  return new Promise(resolve=>{
    const child=spawn(process.execPath,[workerPath,action,'--price-file',priceFile,
      '--offline-proof',proof],{cwd:repositoryRoot,env:inlineChildEnvironment(),
      stdio:['pipe','pipe','pipe'],windowsHide:true,shell:false});
    let bytes=0,text='',result,requested=0,supplied=0,stopped=false,closed=false;
    const stop=()=>{stopped=true;try{child.kill('SIGKILL');}catch{}};
    const timer=setTimeout(stop,timeoutMs);
    const cleanup=()=>{closed=true;clearTimeout(timer);};
    const frame=line=>{
      const value=JSON.parse(line);
      if(value.type==='result'){
        if(result!==undefined||!value.value||Object.keys(value).length!==2)throw Error();
        result=value.value;return;
      }
      if(value.type!=='credential_required'||action!=='run'||result!==undefined||requested++||
         Object.keys(value).length!==6||value.releaseHash!==liveExpectedReleaseHash||
         value.liveIdentityHash!==identity.liveIdentityHash||!hex(value.pricePageSha256)||
         !Number.isSafeInteger(value.nextRequestBytes)||value.nextRequestBytes<1||
         value.nextRequestBytes>16384||value.nextReservationMicroCny!==livePerCallMaximumMicroCny)
        throw Error();
      Promise.resolve().then(()=>{if(closed||stopped)return;supplied++;return credentialSupplier();})
        .then(key=>{
          if(closed||stopped)return;
          if(typeof key!=='string'||!/^[\x21-\x7e]{1,2000}$/.test(key)){child.stdin.end();return;}
          const buffer=Buffer.from(JSON.stringify({credential:key}));key=undefined;
          child.stdin.end(buffer,()=>buffer.fill(0));
        }).catch(()=>child.stdin.end());
    };
    child.stdout.setEncoding('utf8');
    child.stdout.on('data',chunk=>{
      bytes+=Buffer.byteLength(chunk);if(bytes>2097152){stop();return;}text+=chunk;
      let index;
      while((index=text.indexOf('\n'))>=0){
        const line=text.slice(0,index);text=text.slice(index+1);
        try{frame(line);}catch{stop();}
      }
    });
    child.stderr.on('data',chunk=>{bytes+=chunk.length;if(bytes>262144)stop();});
    child.on('error',()=>{cleanup();resolve({status:'blocked',ready:false,
      reason:'dream_climate_live_worker_failed',credentialSupplierCalls:supplied,
      networkAttempts:0,storeCreated:false});});
    child.on('close',code=>{
      cleanup();
      if(action==='run')revokeLiveRelease(liveReleasePath);
      if(stopped||text.trim()||result===undefined||(code!==0&&result.status!=='blocked')){
        resolve({status:'blocked',ready:false,
          reason:stopped?'dream_climate_live_worker_timeout':'dream_climate_live_worker_failed',
          credentialSupplierCalls:supplied,networkAttempts:0,storeCreated:false});return;
      }
      resolve({...result,credentialSupplierCalls:supplied});
    });
    if(action==='preflight')child.stdin.end();
  });
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2),action=args.shift(),flags={};
  while(args.length){
    const key=args.shift();
    if(key!=='--price-file'||Object.hasOwn(flags,key)||!args.length)break;
    flags[key]=args.shift();
  }
  if(!['preflight','run'].includes(action)||!flags['--price-file']||
     !path.isAbsolute(flags['--price-file'])){
    console.error('Usage: node launcher.mjs preflight --price-file <absolute saved official pricing HTML>');
    console.error('Run is available only through the inventory-pinned secure console adapter.');
    process.exitCode=1;
  }else{
    try{
      const value=await launchLive(action,{priceFile:flags['--price-file']});
      console.log(JSON.stringify(value,null,2));
      if(value.status==='blocked')process.exitCode=1;
    }catch{console.error('dream_climate_live_launcher_refused');process.exitCode=1;}
  }
}
