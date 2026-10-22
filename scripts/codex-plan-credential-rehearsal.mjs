// Executable offline lifetime rehearsal only: independent sentinel + fixed Node peer.
// Never accepts a session, token, endpoint, executable or arbitrary environment.
import {spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {PlanAuthorizationAttempt} from './chatgpt-plan-auth.mjs';
import {credentialRehearsalEnvironment,credentialRehearsalScenarios,credentialRehearsalSentinel} from './codex-credential-rehearsal-policy.mjs';
export async function rehearseCodexPlanCredentialOwner(options={}){
 if(!options||Object.getPrototypeOf(options)!==Object.prototype||Reflect.ownKeys(options).some(k=>!['scenario','timeoutMs'].includes(k)||!Object.hasOwn(Object.getOwnPropertyDescriptor(options,k),'value')))throw Error('credential_rehearsal_options_invalid');
 const {scenario='success',timeoutMs=1500}=options;
 if(!credentialRehearsalScenarios.includes(scenario)||!Number.isSafeInteger(timeoutMs)||timeoutMs<50||timeoutMs>5000)throw Error('credential_rehearsal_options_invalid');
 const attribution=new URL(new PlanAuthorizationAttempt({hostId:'urn:uuid:00000000-0000-4000-8000-000000000001',redirectUri:'http://127.0.0.1:1/auth/callback'}).authorizationUrl).searchParams.get('agent_name_hint');
 let leaseActive=true,revocationAttempted=false;
 let child,started=false,closed=false,timedOut=false,cancelled=false,spawnFailed=false,exitCode=null;
 let rawBytes=0,pending='',validReply=false,invalidOutput=false,closedWithLeaseActive=false;
 const order=[],env=credentialRehearsalEnvironment();
 let secretReference=credentialRehearsalSentinel;
 try{
  order.push('lease_opened');
  await new Promise(resolve=>{
   let timer,cancelTimer,done=false;
   const stop=()=>{if(child&&child.exitCode===null&&child.signalCode===null){try{child.kill('SIGKILL');}catch{}}};
   const finish=()=>{if(done)return;done=true;clearTimeout(timer);clearTimeout(cancelTimer);if(pending!=='')invalidOutput=true;closed=true;closedWithLeaseActive=leaseActive;order.push('child_closed');resolve();};
   const args=[fileURLToPath(new URL('../test-support/codex-plan-credential-child.mjs',import.meta.url)),scenario,attribution];
   // Deliberately nonexistent fixed command for the independent failed-spawn case.
   const executable=scenario==='failed_spawn'?path.join(path.dirname(process.execPath),'nightvoyage-missing-fixed-rehearsal-child'):process.execPath;
   try{child=spawn(executable,args,{env,shell:false,windowsHide:true,stdio:['ignore','pipe','pipe']});}
   catch{spawnFailed=true;finish();return;}
   child.once('spawn',()=>{started=true;order.push('child_spawned');});
   child.once('error',()=>{spawnFailed=true;});
   child.stdout.on('data',chunk=>{
    rawBytes+=chunk.length;if(rawBytes>1024){invalidOutput=true;pending='';stop();return;}
    try{
     pending+=new TextDecoder('utf-8',{fatal:true}).decode(chunk);
     if(pending.includes('\n')){
      const lines=pending.split('\n');if(lines.length!==2||lines[1]!==''||validReply)throw Error();
      const reply=JSON.parse(lines[0]);
      if(Object.keys(reply).sort().join(',')!=='argvClean,attributionMatched,kind,tokenPresent'||reply.kind!=='lease_checked'||reply.tokenPresent!==true||reply.argvClean!==true||reply.attributionMatched!==true)throw Error();
      validReply=true;pending='';
     }
    }catch{invalidOutput=true;pending='';stop();}
   });
   // Child details can contain credentials. Consume only a bounded byte count, never text.
   child.stderr.on('data',chunk=>{rawBytes+=chunk.length;invalidOutput=true;if(rawBytes>1024)stop();});
   child.stdout.on('error',()=>{invalidOutput=true;stop();});
   child.stderr.on('error',()=>{invalidOutput=true;stop();});
   child.once('close',code=>{exitCode=code;finish();});
   timer=setTimeout(()=>{timedOut=true;stop();},timeoutMs);
   if(scenario==='cancel'||scenario==='late_response')cancelTimer=setTimeout(()=>{cancelled=true;stop();},50);
  });
 }finally{
  // The simulated session stays active until the owned child has actually closed.
  delete env.ACCESS_TOKEN;secretReference=null;pending='';leaseActive=false;order.push('lease_disposed');
  revocationAttempted=true;order.push('synthetic_revocation');
 }
 const accepted=started&&closed&&closedWithLeaseActive&&exitCode===0&&validReply&&pending===''&&!invalidOutput&&!timedOut&&!cancelled&&!spawnFailed;
 return {contractVersion:'codex-plan-credential-owner-rehearsal-v1',status:accepted?'completed':'blocked',
  reason:accepted?null:spawnFailed?'spawn_failed':cancelled?'cancelled':timedOut?'timeout':invalidOutput?'untrusted_child_output':'child_failed',
  scenario,independentNodePeer:true,nativeCodexProcessStarted:false,syntheticCredentialOnly:true,
  processStarted:started,ownedChildClosed:closed,closedBeforeLeaseDisposal:closedWithLeaseActive,
  leaseActive,secretReferenceDisposed:secretReference===null,syntheticRevocationAttempted:revocationAttempted,
  parentEnvironmentAssigned:false,
  finalReplyAccepted:accepted,lateReplyPublished:false,attributionMatched:accepted,
  rawChildOutputReturned:false,credentialsPersisted:false,credentialReads:0,realModelRequests:0,
  realRevocationConfirmed:'not_attempted',remoteCancellationConfirmed:'unknown',
  nativeCredentialContainmentVerified:false,dispatchEnabled:false,qualityAssessed:false,order};
}
