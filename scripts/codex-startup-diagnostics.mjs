// Bounded stderr observation only. No raw line, credential or process authority is returned.
export const codexStartupDiagnosticVersion='codex-startup-stderr-v1';
export class CodexStartupDiagnostics {
 #decoder=new TextDecoder('utf-8',{fatal:true});#pending='';#bytes=0;#lines=0;#closed=false;#labels=new Set();
 #reject(){this.#closed=true;this.#pending='';this.#decoder=null;throw Error('codex_startup_diagnostic_rejected');}
 #line(text){
  if(++this.#lines>128||Buffer.byteLength(text)>8192)this.#reject();
  const line=text.replace(/\x1b\[[0-9;]*m/g,'').toLowerCase();
  if(!line.trim())return [];
  let label='unclassified_stderr';
  if(line.includes('could not find bubblewrap on path'))label='sandbox_executable_lookup_failed';
  else if(line.includes('unrecognized configuration setting'))label='unrecognized_configuration';
  else if(/\b(error|fatal|panic)\b/.test(line))label='unclassified_startup_error';
  if(this.#labels.has(label))return [];
  this.#labels.add(label);return [label];
 }
 push(bytes){
  if(this.#closed||!(bytes instanceof Uint8Array))this.#reject();
  this.#bytes+=bytes.byteLength;if(this.#bytes>32768)this.#reject();
  let text;try{text=this.#decoder.decode(bytes,{stream:true});}catch{this.#reject();}
  this.#pending+=text;const observations=[];let end;
  while((end=this.#pending.indexOf('\n'))>=0){
   const line=this.#pending.slice(0,end).replace(/\r$/,'');this.#pending=this.#pending.slice(end+1);
   observations.push(...this.#line(line));
  }
  if(Buffer.byteLength(this.#pending)>8192)this.#reject();
  return observations;
 }
 finish(){
  if(this.#closed)this.#reject();
  try{this.#pending+=this.#decoder.decode();}catch{this.#reject();}
  if(this.#pending)this.#line(this.#pending);
  this.#pending='';this.#decoder=null;this.#closed=true;
  return {diagnosticVersion:codexStartupDiagnosticVersion,labels:[...this.#labels],observedBytes:this.#bytes,
   observedLines:this.#lines,rawStderrReturned:false,dispatchEnabled:false,toolExclusionVerified:false,
   emptyStreamProvesHealthyStartup:false};
 }
}
