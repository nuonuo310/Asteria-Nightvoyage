// Pure, non-dispatchable RPC rehearsal. No process, transport, auth or environment.
import {assertAppraisalReviewJsonData} from '../src/appraisal-review-memory.js';
import {codexDreamProtocolVersion,CodexDreamStream} from './codex-dream-protocol.mjs';
export const codexRpcRehearsalVersion='offline-codex-rpc-rehearsal-v1';
const fail=()=>{throw Error('codex_rpc_rejected');};
const id=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,200}$/.test(v);
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const own=(v,k)=>Object.hasOwn(v,k);
export class CodexRpcRehearsal {
 #draft;#phase='initialize';#out=[];#thread=null;#turn=null;#stream=null;#expected=null;
 #decoder=new TextDecoder('utf-8',{fatal:true});#pending='';#bytes=0;#frames=0;#early=[];#transcript=[];#threadStarted=false;
 constructor(draft){
  assertAppraisalReviewJsonData(draft);
  if(!object(draft)||draft.protocolVersion!==codexDreamProtocolVersion||draft.dispatchAuthorized!==false||
   typeof draft.model!=='string'||!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/.test(draft.model)||draft.model==='unknown'||
   typeof draft.instructions!=='string'||typeof draft.input!=='string'||Buffer.byteLength(JSON.stringify(draft))>65536)fail();
  this.#draft={model:draft.model,instructions:draft.instructions,input:draft.input};
  this.#out.push({id:1,method:'initialize',params:{clientInfo:{name:'asteria-nightvoyage',title:'Asteria-Nightvoyage',version:'0.1.0'}}});
 }
 status(){return {protocolVersion:codexRpcRehearsalVersion,phase:this.#phase,dispatchAuthorized:false,externalCallsStarted:0,remoteCancellationConfirmed:'unknown'};}
 drain(){if(['rejected','cancelled','finished'].includes(this.#phase))return [];const out=structuredClone(this.#out);this.#out=[];for(const f of out)if(own(f,'id'))this.#expected=f.id;return out;}
 #clear(){this.#draft=null;this.#out=[];this.#pending='';this.#early=[];this.#transcript=[];this.#stream=null;this.#thread=null;this.#turn=null;this.#decoder=null;this.#expected=null;}
 cancel(){if(['finished','rejected','cancelled'].includes(this.#phase))return;this.#phase='cancelled';this.#clear();}
 push(chunk){
  if(['finished','rejected','cancelled'].includes(this.#phase))fail();
  try{
   if(!(chunk instanceof Uint8Array))fail();
   this.#bytes+=chunk.byteLength;if(this.#bytes>65536)fail();
   this.#pending+=this.#decoder.decode(chunk,{stream:true});this.#consume();
  }catch{this.#phase='rejected';this.#clear();fail();}
 }
 #consume(){let end;while((end=this.#pending.indexOf('\n'))>=0){const line=this.#pending.slice(0,end).replace(/\r$/,'');this.#pending=this.#pending.slice(end+1);if(line)this.#frame(JSON.parse(line));}}
 #frame(frame){
  if(++this.#frames>128||this.#phase==='complete')fail();
  assertAppraisalReviewJsonData(frame);if(!object(frame))fail();
  if(own(frame,'id')){
   // A server request is never an authorization to execute a tool.
   if(own(frame,'method')||own(frame,'error')||!object(frame.result)||Object.keys(frame).some(k=>!['id','result'].includes(k)))fail();
   if(frame.id!==this.#expected)fail();this.#expected=null;
   if(this.#phase==='initialize'&&frame.id===1){
    if(typeof frame.result.userAgent!=='string'||!frame.result.userAgent.length)fail();
    this.#phase='thread';this.#out.push({method:'initialized',params:{}},{id:2,method:'thread/start',params:{model:this.#draft.model}});return;
   }
   if(this.#phase==='thread'&&frame.id===2){
    if(!object(frame.result.thread)||!id(frame.result.thread.id))fail();
    // If returned, the effective model must match the rehearsal proposal.
    if(frame.result.model!==undefined&&frame.result.model!==this.#draft.model)fail();
    this.#thread=frame.result.thread.id;this.#phase='turn';
    this.#out.push({id:3,method:'turn/start',params:{threadId:this.#thread,model:this.#draft.model,input:[{type:'text',text:this.#draft.instructions+'\n'+this.#draft.input}]}});return;
   }
   if(this.#phase==='turn'&&frame.id===3){
    const turn=frame.result.turn;if(!object(turn)||!id(turn.id)||turn.status!=='inProgress'||turn.error||!Array.isArray(turn.items)||turn.items.length)fail();
    this.#turn=turn.id;this.#stream=new CodexDreamStream(this.#thread,this.#turn);this.#phase='stream';
    const early=this.#early;this.#early=[];for(const e of early)this.#notification(e);return;
   }
   fail();
  }
  if(typeof frame.method!=='string'||!object(frame.params)||Object.keys(frame).some(k=>!['method','params'].includes(k)))fail();
  if(frame.method==='thread/started'){
   if(this.#phase!=='turn'||this.#threadStarted||frame.params.thread?.id!==this.#thread)fail();
   this.#threadStarted=true;return;
  }
  if(this.#phase==='turn'&&this.#expected===3){this.#early.push(frame);return;}
  if(this.#phase!=='stream')fail();this.#notification(frame);
 }
 #notification(frame){
  if(this.#phase!=='stream')fail();
  const bytes=Buffer.from(JSON.stringify(frame)+'\n');this.#stream.push(bytes);this.#transcript.push(bytes);
  if(frame.method==='turn/completed')this.#phase='complete';
 }
 finish(){
  if(['finished','rejected','cancelled'].includes(this.#phase))fail();
  try{
   this.#pending+=this.#decoder.decode();this.#consume();
   if(this.#pending.trim()||this.#phase!=='complete'||this.#out.length)fail();
   const parsed=this.#stream.finish();
   const result={thread_id:this.#thread,turn_id:this.#turn,chunks:this.#transcript.map(b=>Buffer.from(b)),data:parsed.data,usage:'unknown',protocolVersion:codexRpcRehearsalVersion,dispatchAuthorized:false};
   this.#phase='finished';this.#clear();return result;
  }catch{this.#phase='rejected';this.#clear();fail();}
 }
}
