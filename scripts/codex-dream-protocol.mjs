// Pure app-server transcript rehearsal. Never starts a process or sends a request.
import {assertAppraisalReviewJsonData} from '../src/appraisal-review-memory.js';
import {prepareChatgptPlanRequest} from './chatgpt-plan-protocol.mjs';
export const codexDreamProtocolVersion='codex-dream-transcript-rehearsal-v1';
const fail=code=>{throw Error(code);};
const id=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,200}$/.test(value);
export function prepareCodexDream(payload,model){
  const prepared=prepareChatgptPlanRequest(payload,{model});
  // This is a non-dispatchable proposal; no executable path, account or environment.
  return {protocolVersion:codexDreamProtocolVersion,dispatchAuthorized:false,model,
    initialize:{method:'initialize',params:{clientInfo:{name:'asteria-nightvoyage',title:'Asteria-Nightvoyage',version:'0.1.0'}}},
    instructions:prepared.body.instructions,input:prepared.body.input[0].content,
    liveAdmission:'blocked_pending_auth_and_verified_tool_disable',threadPolicy:'new_ephemeral_stage_thread_no_memory',
    limits:{bytes:65536,events:128,contentBytes:1200}};
}
export class CodexDreamStream {
  #thread;#turn;#decoder=new TextDecoder('utf-8',{fatal:true});#pending='';#bytes=0;#events=0;#message=null;#complete=false;#failed=false;#finished=false;
  constructor(thread,turn){if(!id(thread)||!id(turn))fail('codex_invalid_identity');this.#thread=thread;this.#turn=turn;}
  push(chunk){
    if(this.#failed||this.#finished)fail('codex_stream_closed');
    try{
      if(!(chunk instanceof Uint8Array))fail('codex_invalid_stream');
      this.#bytes+=chunk.byteLength;if(this.#bytes>65536)fail('codex_stream_limit');
      this.#pending+=this.#decoder.decode(chunk,{stream:true});this.#consume();
    }catch{this.#failed=true;this.#message=null;this.#pending='';fail('codex_invalid_stream');}
  }
  #consume(){let end;while((end=this.#pending.indexOf('\n'))>=0){const line=this.#pending.slice(0,end).replace(/\r$/,'');this.#pending=this.#pending.slice(end+1);if(line)this.#event(JSON.parse(line));}}
  #event(event){
    if(++this.#events>128||this.#complete)fail('codex_invalid_stream');
    assertAppraisalReviewJsonData(event);
    if(event.id!==undefined||typeof event.method!=='string'||!event.params||event.params.threadId!==this.#thread)fail('codex_invalid_event');
    const p=event.params;if(p.turnId!==undefined&&p.turnId!==this.#turn)fail('codex_invalid_identity');
    if(event.method==='turn/completed'){
      if(p.turn?.id!==this.#turn||p.turn.status!=='completed'||p.turn.error||!this.#message)fail('codex_turn_not_completed');
      if(p.turn.items!==undefined){
        if(!Array.isArray(p.turn.items)||p.turn.items.some(item=>!['agentMessage','userMessage'].includes(item?.type)))fail('codex_tools_forbidden');
        const finals=p.turn.items.filter(item=>item.type==='agentMessage');
        if(finals.length>1||finals.some(item=>item.text!==this.#message||(item.phase!==undefined&&item.phase!=='final_answer')))fail('codex_conflicting_final');
      }
      this.#complete=true;return;
    }
    if(event.method==='turn/started'){
      if(p.turn?.id!==this.#turn||p.turn.status!=='inProgress')fail('codex_invalid_identity');return;
    }
    if(['item/started','item/completed'].includes(event.method)){
      if(p.turnId!==this.#turn||!p.item||!id(p.item.id))fail('codex_invalid_item');
      if(p.item.type==='userMessage')return;
      if(p.item.type!=='agentMessage'||(p.item.phase!==undefined&&p.item.phase!=='final_answer'))fail('codex_tools_or_nonfinal_forbidden');
      if(event.method==='item/completed'){
        if(this.#message!==null||typeof p.item.text!=='string'||Buffer.byteLength(p.item.text)>1200)fail('codex_invalid_item');this.#message=p.item.text;
      }
      return;
    }
    if(event.method==='item/agentMessage/delta'){
      if(p.turnId!==this.#turn||!id(p.itemId)||typeof p.delta!=='string')fail('codex_invalid_event');return;
    }
    // Usage notification shapes are not yet normalized. Unknown is explicit.
    if(event.method==='thread/tokenUsage/updated')return;
    // Reject reroutes, tools, approvals, errors, reasoning and unknown events.
    fail('codex_unreviewed_event');
  }
  finish(){
    if(this.#failed||this.#finished)fail('codex_stream_closed');this.#finished=true;
    try{
      this.#pending+=this.#decoder.decode();this.#consume();
      if(this.#pending.trim()||!this.#complete)fail('codex_turn_not_completed');
      const data=JSON.parse(this.#message);assertAppraisalReviewJsonData(data);
      if(!data||typeof data!=='object'||Array.isArray(data))fail('codex_invalid_json');
      return {data,usage:'unknown'};
    }catch{this.#failed=true;fail('codex_invalid_stream');}
    finally{this.#message=null;this.#pending='';}
  }
}
