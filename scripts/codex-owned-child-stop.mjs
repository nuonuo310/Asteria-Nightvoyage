// One already-owned child only. EOF is a normal-completion candidate, not a cleanup proof.
import {ChildProcess} from 'node:child_process';
export const ownedChildStopVersion='owned-child-bounded-stdin-eof-v1';
export function createOwnedChildStop(child,options={}){
 if(!(child instanceof ChildProcess)||!child.stdin||child.exitCode!==null||child.signalCode!==null)throw Error('owned_child_required');
 if(!options||Object.getPrototypeOf(options)!==Object.prototype||Reflect.ownKeys(options).some(k=>k!=='graceMs'||!Object.hasOwn(Object.getOwnPropertyDescriptor(options,k),'value')))throw Error('owned_stop_options');
 const {graceMs=1500}=options;if(!Number.isSafeInteger(graceMs)||graceMs<1||graceMs>3000)throw Error('owned_stop_options');
 let requested=false,closed=false,eof=false,forced=false,timer=null,reason=null,exitClass='unknown',signalClass='unknown';
 const force=why=>{if(closed||forced||child.exitCode!==null||child.signalCode!==null)return;requested=true;forced=true;reason=why;clearTimeout(timer);try{child.kill('SIGKILL');}catch{reason='owned_signal_failed';}};
 child.once('close',(code,signal)=>{closed=true;clearTimeout(timer);exitClass=code===0?'zero':Number.isInteger(code)?'nonzero':'not_supplied';signalClass=signal===null?'none':signal==='SIGKILL'?'owned_kill':'other';});
 // Error content is never exposed, and an error while ending stdin cannot trigger a retry.
 child.stdin.on('error',()=>{if(eof)force('stdin_end_failed');});
 return Object.freeze({
  finishNormally(){
   if(requested||closed||child.exitCode!==null||child.signalCode!==null)return;
   requested=true;eof=true;reason='normal_completion';
   timer=setTimeout(()=>force('eof_deadline'),graceMs);
   try{child.stdin.end(error=>{if(error)force('stdin_end_failed');});}catch{force('stdin_end_failed');}
  },
  abort(){force('failure_or_cancellation');},
  view(){return {policyVersion:ownedChildStopVersion,requested,stdinEofRequested:eof,graceMs,forceStopRequested:forced,stopClass:reason,
   ownedChildClosed:closed,exitCodeClass:exitClass,exitSignalClass:signalClass,
   gracefulZeroExitObserved:closed&&eof&&!forced&&exitClass==='zero'&&signalClass==='none',
   cleanupProven:false,descendantTerminationConfirmed:'unknown',processesRestarted:0,modelRequestsRequested:0,rawErrorReturned:false};}
 });
}
