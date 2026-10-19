// Narrow local observation policy, never a model/handler admission policy.
export const codexRefusalTracePolicyVersion='fixed-local-refusal-trace-continuation-v1';
const keys=['responseQueued','emptyInventoryChecked','threadPrepared','catalogBytesChecked','continuationObserved'];
function snapshot(value){
 if(!value||Object.getPrototypeOf(value)!==Object.prototype||Reflect.ownKeys(value).length!==keys.length)throw Error('refusal_trace_context_invalid');
 const copy={};for(const key of keys){const d=Object.getOwnPropertyDescriptor(value,key);if(!d||!Object.hasOwn(d,'value')||typeof d.value!=='boolean')throw Error('refusal_trace_context_invalid');copy[key]=d.value;}return copy;
}
export class CodexRefusalTracePolicy {
 #decoder=new TextDecoder('utf-8',{fatal:true});#pending='';#bytes=0;#lines=0;#continued=0;#blocked=false;#stop=null;#closed=false;
 #reject(){this.#blocked=true;this.#closed=true;this.#stop??='invalid_stderr';this.#pending='';this.#decoder=null;throw Error('refusal_trace_policy_rejected');}
 #block(reason){this.#blocked=true;this.#stop??=reason;}
 #line(text,c){
  if(++this.#lines>128||Buffer.byteLength(text)>8192)this.#reject();
  const line=text.replace(/\x1b\[[0-9;]*m/g,'');
  if(/could not find bubblewrap on path|unrecognized configuration setting/i.test(line)){this.#block('startup_control_error');return;}
  if(!/\b(error|fatal|panic)\b/i.test(line))return;
  const exact=/\bERROR\b/.test(line)&&!/\b(fatal|panic)\b/i.test(line)&&
   /\bcodex_core::tools::(?:router|registry|parallel)\b/.test(line)&&
   /(?:^|\s)error=unsupported call: (?:functions\.)?request_user_input\s*$/.test(line);
  const eligible=c.responseQueued&&c.emptyInventoryChecked&&c.threadPrepared&&c.catalogBytesChecked&&!c.continuationObserved;
  if(!this.#blocked&&exact&&eligible&&this.#continued===0){this.#continued++;return;}
  this.#block(exact?(this.#continued?'duplicate_expected_trace':'expected_trace_outside_scope'):'unreviewed_error');
 }
 push(bytes,context){
  if(this.#closed||!(bytes instanceof Uint8Array))this.#reject();
  let c;try{c=snapshot(context);}catch{this.#reject();}
  this.#bytes+=bytes.byteLength;if(this.#bytes>32768)this.#reject();
  try{this.#pending+=this.#decoder.decode(bytes,{stream:true});}catch{this.#reject();}
  let end;while((end=this.#pending.indexOf('\n'))>=0){const line=this.#pending.slice(0,end).replace(/\r$/,'');this.#pending=this.#pending.slice(end+1);this.#line(line,c);}
  if(Buffer.byteLength(this.#pending)>8192)this.#reject();return !this.#blocked;
 }
 finish(context){
  if(this.#closed)this.#reject();let c;try{c=snapshot(context);this.#pending+=this.#decoder.decode();}catch{this.#reject();}
  if(this.#pending)this.#line(this.#pending,c);this.#pending='';this.#decoder=null;this.#closed=true;
  return {policyVersion:codexRefusalTracePolicyVersion,expectedTraceLinesContinued:this.#continued,blocked:this.#blocked,stopClass:this.#stop,
   limit:1,phaseIsReadTimeOnly:true,rawStderrReturned:false,permitsObservationOnly:true,
   requiresBoundContinuation:true,dispatchEnabled:false,nativeHandlerDenialVerified:false,modelEntitlementVerified:false};
 }
}
