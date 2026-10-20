// One source-reviewed local trace only. It never proves a handler result by itself.
const keys=['responseQueued','guardMatched','warningMatched','identitiesMatched','threadPrepared','catalogBytesChecked','continuationObserved','terminal'];
function snapshot(v){
 if(!v||Object.getPrototypeOf(v)!==Object.prototype||Reflect.ownKeys(v).length!==keys.length)throw Error('guard_trace_context_invalid');
 const c={};for(const k of keys){const d=Object.getOwnPropertyDescriptor(v,k);if(!d||!Object.hasOwn(d,'value')||typeof d.value!=='boolean')throw Error('guard_trace_context_invalid');c[k]=d.value;}return c;
}
const eligible=c=>c.responseQueued&&c.guardMatched&&c.warningMatched&&c.identitiesMatched&&c.threadPrepared&&c.catalogBytesChecked&&!c.continuationObserved&&!c.terminal;
const phase=c=>c.continuationObserved?'after_continuation_observed':c.responseQueued?'after_response_queued':'before_response_queued';
export class GuardExecTracePolicy {
 #decoder=new TextDecoder('utf-8',{fatal:true});#pending=Buffer.alloc(0);#startContext=null;#bytes=0;#lines=0;#errors=0;#continued=0;#first=null;#blocked=false;#stop=null;#closed=false;
 #block(reason){this.#blocked=true;this.#stop??=reason;}
 #reject(){this.#block('invalid_stderr');this.#closed=true;this.#pending=Buffer.alloc(0);this.#decoder=null;throw Error('guard_trace_rejected');}
 #line(text,start,end,terminated=true){
  if(++this.#lines>128||Buffer.byteLength(text)>8192)this.#reject();
  const line=text.replace(/\x1b\[[0-9;]*m/g,'');
  if(/could not find bubblewrap on path|unrecognized configuration setting/i.test(line)){this.#block('startup_control_error');return;}
  if(!/\b(error|fatal|panic)\b/i.test(line))return;
  this.#errors++;
  const router=/\bcodex_core::tools::router:\s/.test(line);
  const disabled=/(?:^|\s)error=code-mode host is disabled\s*$/.test(line);
  const unsupported=/(?:^|\s)error=unsupported custom tool call: (?:functions\.)?exec\s*$/.test(line);
  const exact=router&&disabled&&(line.match(/\bERROR\b/g)??[]).length===1&&!/\b(fatal|panic)\b/i.test(line);
  this.#first??={phaseObserved:phase(start),errorClass:disabled?'fixed_disabled_host_suffix_pattern':unsupported?'fixed_exec_unsupported_suffix_pattern':'unclassified_error',targetClass:router?'core_router':'unclassified',patternProvesRootCause:false,changesAcceptance:false};
  if(!terminated){this.#block('unterminated_error_line');return;}
  if(!this.#blocked&&exact&&eligible(start)&&eligible(end)&&this.#continued===0){this.#continued++;return;}
  this.#block(exact?(this.#continued?'duplicate_expected_trace':'expected_trace_outside_scope'):'unreviewed_error');
 }
 push(bytes,context){
  if(this.#closed||!(bytes instanceof Uint8Array))this.#reject();
  let c;try{c=snapshot(context);}catch{this.#reject();}
  this.#bytes+=bytes.byteLength;if(this.#bytes>32768)this.#reject();
  let from=0;
  for(let i=0;i<bytes.length;i++)if(bytes[i]===10){
   const raw=Buffer.concat([this.#pending,bytes.subarray(from,i)]);if(raw.length>8192)this.#reject();
   let line;try{line=this.#decoder.decode(raw).replace(/\r$/,'');}catch{this.#reject();}
   this.#line(line,this.#startContext??c,c);this.#pending=Buffer.alloc(0);this.#startContext=null;from=i+1;
  }
  const tail=bytes.subarray(from);
  if(tail.length&&this.#startContext===null)this.#startContext=c;
  this.#pending=Buffer.concat([this.#pending,tail]);
  if(this.#pending.length>8192)this.#reject();return !this.#blocked;
 }
 finish(context){
  if(this.#closed)this.#reject();let c,line;
  try{c=snapshot(context);line=this.#decoder.decode(this.#pending);}catch{this.#reject();}
  if(this.#pending.length)this.#line(line,this.#startContext??c,c,false);
  this.#closed=true;this.#pending=Buffer.alloc(0);this.#decoder=null;
  return {policyVersion:'fixed-local-guard-exec-trace-v1',observedBytes:this.#bytes,observedLines:this.#lines,errorLineCount:this.#errors,firstError:this.#first,
   expectedTraceLinesContinued:this.#continued,limit:1,blocked:this.#blocked,stopClass:this.#stop,
   phaseIsReadTimeOnly:true,lineStartAndCompletionMustBeEligible:true,requiresBoundContinuation:true,
   rawStderrReturned:false,identityReturned:false,permitsLocalObservationOnly:true,
   dispatchEnabled:false,nativeHandlerDenialVerified:false,productionAdmission:false};
 }
}
