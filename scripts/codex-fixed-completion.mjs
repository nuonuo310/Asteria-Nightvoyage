// Independent fixed response, never generated text or a native inference grant.
const text='{"event":"A fictional blue cup rests on a quiet sill."}';
const fail=()=>{throw Error('final_completion_rejected');};
export function fixedFinalAnswerSse(){
 if(arguments.length)fail();
 const item={id:'fictional-final-message',type:'message',role:'assistant',status:'completed',phase:'final_answer',content:[{type:'output_text',text,annotations:[]}]};
 const events=[{type:'response.output_item.done',output_index:0,item},{type:'response.completed',response:{id:'fictional-final-response',status:'completed',output:[item]}}];
 return Buffer.from(events.map(e=>`event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join(''));
}
export class CodexFixedCompletion {
 #thread;#turn;#item=null;#done=false;#closed=false;#events=0;#bytes=0;
 constructor(thread,turn){if(![thread,turn].every(v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,200}$/.test(v)))fail();this.#thread=thread;this.#turn=turn;}
 push(event){
  try{
   if(this.#closed||++this.#events>128)fail();
   this.#bytes+=Buffer.byteLength(JSON.stringify(event));if(this.#bytes>65536||event.id!==undefined)fail();
   const p=event.params;if(!p||p.threadId!==this.#thread)fail();
   if(event.method==='thread/tokenUsage/updated'){if(!p.tokenUsage||typeof p.tokenUsage!=='object'||Array.isArray(p.tokenUsage))fail();return null;}
   if(event.method==='turn/completed'){
    if(!this.#done||p.turn?.id!==this.#turn||p.turn.status!=='completed'||p.turn.error)fail();
    if(p.turn.items!==undefined&&(!Array.isArray(p.turn.items)||p.turn.items.some(i=>i?.type!=='userMessage'&&(i?.type!=='agentMessage'||i.id!==this.#item||i.text!==text||i.phase!=='final_answer'))||p.turn.items.filter(i=>i?.type==='agentMessage').length>1))fail();
    this.#closed=true;
    return {reviewVersion:'local-fixed-final-completion-v1',fixedAnswerMatched:true,itemIdentityChecked:true,turnCompleted:true,bodyReturned:false,usage:'unknown',dispatchEnabled:false,modelEntitlementVerified:false,qualityAssessed:false};
   }
   if(p.turnId!==this.#turn)fail();
   if(event.method==='item/agentMessage/delta'){
    if(this.#item===null||this.#done||p.itemId!==this.#item||typeof p.delta!=='string')fail();return null;
   }
   const item=p.item;
   if(!item||item.type!=='agentMessage'||item.phase!=='final_answer'||typeof item.id!=='string'||!/^[A-Za-z0-9_-]{1,200}$/.test(item.id))fail();
   if(event.method==='item/started'){if(this.#item!==null)fail();this.#item=item.id;return null;}
   if(event.method!=='item/completed'||this.#done||this.#item!==item.id||item.text!==text)fail();
   this.#done=true;return null;
  }catch{this.#closed=true;this.#item=null;fail();}
 }
}
