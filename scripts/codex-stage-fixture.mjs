// Independent fixed stage data; source snapshots are never used as generated text.
import {assertAppraisalReviewJsonData} from '../src/appraisal-review-memory.js';
const fail=()=>{throw Error('final_completion_rejected');};
const events=['A fictional blue cup rests on a quiet sill.','The fictional blue cup becomes transparent; the quiet sill remains.'];
export function prepareFixedStage(draft){
 assertAppraisalReviewJsonData(draft);
 if(draft?.protocolVersion!=='codex-dream-transcript-rehearsal-v1'||draft?.dispatchAuthorized!==false||draft.model!=='gpt-5.6-sol'||typeof draft.input!=='string'||typeof draft.instructions!=='string'||Buffer.byteLength(JSON.stringify(draft))>65536)fail();
 let m;try{m=JSON.parse(draft.input);}catch{fail();}
 if(!Array.isArray(m.previousScenes)||!['scene','wake'].includes(m.stage)||!Number.isInteger(m.sceneIndex)||m.sceneIndex!==m.previousScenes.length||m.sceneIndex>2||m.stage==='wake'&&m.sceneIndex!==2||m.stage==='scene'&&m.sceneIndex>1||m.previousScenes.some((s,i)=>s?.event!==events[i]))fail();
 const value=m.stage==='wake'?{fragment:events[1],residue:.1,associations:[]}:{event:events[m.sceneIndex],appraisal:{goalEffect:0,control:.5,uncertainty:.5},basis:{goal:null,control:null,uncertainty:null},affect:{kind:'unchanged'}};
 const text=JSON.stringify(value),item={id:'fictional-final-message',type:'message',role:'assistant',status:'completed',phase:'final_answer',content:[{type:'output_text',text,annotations:[]}]};
 const frames=[{type:'response.output_item.done',output_index:0,item},{type:'response.completed',response:{id:'fictional-stage-response',status:'completed',output:[item]}}];
 return {text,inputText:draft.instructions+'\n'+draft.input,sse:Buffer.from(frames.map(e=>`event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join(''))};
}
export class CodexStageCompletion {
 #text;#thread;#turn;#item=null;#done=false;#closed=false;#events=0;#bytes=0;
 constructor(thread,turn,text){if(typeof text!=='string'||Buffer.byteLength(text)>1200)fail();this.#text=text;if(![thread,turn].every(v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,200}$/.test(v)))fail();this.#thread=thread;this.#turn=turn;}
 push(event){
  try{
   if(this.#closed||++this.#events>128)fail();
   this.#bytes+=Buffer.byteLength(JSON.stringify(event));if(this.#bytes>65536||event.id!==undefined)fail();
   const p=event.params;if(!p||p.threadId!==this.#thread)fail();
   if(event.method==='thread/tokenUsage/updated'){if(!p.tokenUsage||typeof p.tokenUsage!=='object'||Array.isArray(p.tokenUsage))fail();return null;}
   if(event.method==='turn/completed'){
    if(!this.#done||p.turn?.id!==this.#turn||p.turn.status!=='completed'||p.turn.error)fail();
    if(p.turn.items!==undefined&&(!Array.isArray(p.turn.items)||p.turn.items.some(i=>i?.type!=='userMessage'&&(i?.type!=='agentMessage'||i.id!==this.#item||i.text!==this.#text||i.phase!=='final_answer'))||p.turn.items.filter(i=>i?.type==='agentMessage').length>1))fail();
    this.#closed=true;
    return {reviewVersion:'local-fixed-stage-completion-v1',fixedAnswerMatched:true,itemIdentityChecked:true,turnCompleted:true,bodyReturned:false,usage:'unknown',dispatchEnabled:false,modelEntitlementVerified:false,qualityAssessed:false};
   }
   if(p.turnId!==this.#turn)fail();
   if(event.method==='item/agentMessage/delta'){
    if(this.#item===null||this.#done||p.itemId!==this.#item||typeof p.delta!=='string')fail();return null;
   }
   const item=p.item;
   if(!item||item.type!=='agentMessage'||item.phase!=='final_answer'||typeof item.id!=='string'||!/^[A-Za-z0-9_-]{1,200}$/.test(item.id))fail();
   if(event.method==='item/started'){if(this.#item!==null)fail();this.#item=item.id;return null;}
   if(event.method!=='item/completed'||this.#done||this.#item!==item.id||item.text!==this.#text)fail();
   this.#done=true;return null;
  }catch{this.#closed=true;this.#item=null;fail();}
 }
}
