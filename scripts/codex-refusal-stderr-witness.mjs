// Metadata-only witness. It never changes stderr admission or returns any raw text.
export const codexRefusalStderrWitnessVersion='codex-refusal-stderr-witness-v1';
const phases=['before_response_queued','after_response_queued','after_continuation_observed'];
export class CodexRefusalStderrWitness {
 #decoder=new TextDecoder('utf-8',{fatal:true});#pending='';#bytes=0;#lines=0;#errors=0;#first=null;#closed=false;
 #reject(){this.#closed=true;this.#pending='';this.#decoder=null;throw Error('refusal_stderr_witness_rejected');}
 #line(text,phase){
  if(++this.#lines>128||Buffer.byteLength(text)>8192)this.#reject();
  const line=text.replace(/\x1b\[[0-9;]*m/g,'');
  if(!/\b(error|fatal|panic)\b/i.test(line))return;
  this.#errors++;
  if(this.#first!==null)return;
  const unsupported=/(?:^|\s)error=unsupported call: (?:functions\.)?request_user_input\s*$/.test(line);
  const target=/\bcodex_core::tools::(?:router|registry|parallel)\b/.test(line)?'core_tools':/\bcodex_api::/.test(line)?'codex_api':'unclassified';
  this.#first={phaseObserved:phase,errorClass:unsupported?'fixed_interaction_unsupported_suffix_pattern':'unclassified_error',
   targetClass:target,patternProvesRootCause:false,changesAcceptance:false};
 }
 push(bytes,phase){
  if(this.#closed||!(bytes instanceof Uint8Array)||!phases.includes(phase))this.#reject();
  this.#bytes+=bytes.byteLength;if(this.#bytes>32768)this.#reject();
  try{this.#pending+=this.#decoder.decode(bytes,{stream:true});}catch{this.#reject();}
  let end;while((end=this.#pending.indexOf('\n'))>=0){const line=this.#pending.slice(0,end).replace(/\r$/,'');this.#pending=this.#pending.slice(end+1);this.#line(line,phase);}
  if(Buffer.byteLength(this.#pending)>8192)this.#reject();
 }
 finish(phase){
  if(this.#closed||!phases.includes(phase))this.#reject();
  try{this.#pending+=this.#decoder.decode();}catch{this.#reject();}
  if(this.#pending)this.#line(this.#pending,phase);
  this.#closed=true;this.#pending='';this.#decoder=null;
  return {witnessVersion:codexRefusalStderrWitnessVersion,observedBytes:this.#bytes,observedLines:this.#lines,errorLineCount:this.#errors,
   firstError:this.#first,phaseIsReadTimeOnly:true,rawStderrReturned:false,identityReturned:false,
   changesAcceptance:false,dispatchEnabled:false,nativeHandlerDenialVerified:false};
 }
}
