// Offline-only candidate. No transport, credentials, Store, provider selection or grant.
// Reuses this project's strict final JSON/model/usage validator; never returns reasoning.
import {ChatgptPlanStream,chatgptPlanLimits} from './chatgpt-plan-protocol.mjs';
export const offlineEnvelopeVersion='offline-plan-reasoning-envelope-v1';
const fail=()=>{throw Error('offline_envelope_rejected');};
const index=n=>Number.isSafeInteger(n)&&n>=0&&n<chatgptPlanLimits.events;
const id=s=>typeof s==='string'&&s.length>0&&s.length<=200;
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const keys=(v,allowed)=>object(v)&&Object.keys(v).every(k=>allowed.includes(k));
const text=s=>typeof s==='string'&&Buffer.byteLength(s)<=chatgptPlanLimits.streamBytes;
const part=(v,type)=>keys(v,['type','text'])&&v.type===type&&text(v.text);
function reasoning(v,final=false){
 if(!keys(v,['type','id','status','summary','content','encrypted_content'])||v.type!=='reasoning'||!id(v.id)||!Array.isArray(v.summary)||!v.summary.every(p=>part(p,'summary_text')))fail();
 if(v.content!==undefined&&(!Array.isArray(v.content)||!v.content.every(p=>part(p,'reasoning_text'))))fail();
 if(v.encrypted_content!==undefined&&v.encrypted_content!==null&&!text(v.encrypted_content))fail();
 if(v.status!==undefined&&!(final?['completed']:['in_progress','completed']).includes(v.status))fail();
}
const reasoningEvents=new Map([
 ['response.reasoning_summary_part.added',['summary_index','part','summary_text']],
 ['response.reasoning_summary_part.done',['summary_index','part','summary_text']],
 ['response.reasoning_summary_text.delta',['summary_index','delta',null]],
 ['response.reasoning_summary_text.done',['summary_index','text',null]],
 ['response.reasoning_text.delta',['content_index','delta',null]],
 ['response.reasoning_text.done',['content_index','text',null]]
]);
export class OfflinePlanEnvelopeStream{
 #decoder=new TextDecoder('utf-8',{fatal:true});#pending='';#bytes=0;#events=0;#closed=false;#completed=false;
 #strict;#items=new Map();#messageIndices=new Map();#discarded=0;#skipped=0;
 constructor(model){this.#strict=new ChatgptPlanStream(model);}
 #clear(){this.#pending='';this.#items.clear();this.#messageIndices.clear();this.#strict=null;this.#decoder=null;}
 #reject(error){this.#closed=true;this.#clear();throw Error(/^plan_[a-z_]+$/.test(error?.message)?error.message:'offline_envelope_rejected');}
 push(bytes){
  if(this.#closed)throw Error('offline_envelope_closed');
  try{
   if(!(bytes instanceof Uint8Array))fail();
   this.#bytes+=bytes.byteLength;if(this.#bytes>chatgptPlanLimits.streamBytes)fail();
   this.#pending+=this.#decoder.decode(bytes,{stream:true});this.#consume();
  }catch(error){this.#reject(error);}
 }
 #consume(){
  this.#pending=this.#pending.replaceAll('\r\n','\n');let at;
  while((at=this.#pending.indexOf('\n\n'))>=0){const frame=this.#pending.slice(0,at);this.#pending=this.#pending.slice(at+2);this.#frame(frame);}
 }
 #forward(event){this.#strict.push(Buffer.from(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`));}
 #active(event){
  if(!id(event.item_id)||!index(event.output_index))fail();
  const row=this.#items.get(event.output_index);
  if(!row||row.id!==event.item_id||row.done)fail();
 }
 #frame(frame){
  const lines=frame.split('\n');if(lines.every(l=>!l||l.startsWith(':')))return;
  if(this.#completed||++this.#events>chatgptPlanLimits.events)fail();
  const data=lines.filter(l=>l.startsWith('data:')).map(l=>l.slice(5).replace(/^ /,'')).join('\n');
  const event=JSON.parse(data),names=lines.filter(l=>l.startsWith('event:')).map(l=>l.slice(6).trim());
  if(!object(event)||typeof event.type!=='string'||names.length>1||(names.length&&names[0]!==event.type))fail();
  if(event.sequence_number!==undefined&&(!Number.isSafeInteger(event.sequence_number)||event.sequence_number<0))fail();
  if(event.type==='response.completed'){
   const r=event.response;if(!object(r)||!Array.isArray(r.output))fail();
   const messages=[],seen=new Set();let discarded=0;
   for(let n=0;n<r.output.length;n++){
    const item=r.output[n];
    if(item?.type==='reasoning'){
     reasoning(item,true);if(seen.has(item.id)||++discarded>16||this.#messageIndices.has(n))fail();seen.add(item.id);
     const row=this.#items.get(n);if(row&&(!row.done||row.id!==item.id))fail();
    }else if(item?.type==='message'&&item.role==='assistant'){
     if(item.id!==undefined&&(!id(item.id)||seen.has(item.id)))fail();if(item.id!==undefined)seen.add(item.id);
     if(this.#items.has(n))fail();messages.push(item);
    }else fail();
   }
   for(const [n,row] of this.#items)if(!row.done||r.output[n]?.type!=='reasoning'||r.output[n].id!==row.id)fail();
   for(const [n,row] of this.#messageIndices)if(!row.done||r.output[n]?.type!=='message'||r.output[n].id!==row.id)fail();
   if(messages.length!==1)fail();
   this.#forward({type:'response.completed',response:{id:r.id,status:r.status,model:r.model,output:messages,usage:r.usage}});
   this.#discarded=discarded;this.#completed=true;return;
  }
  if(['response.output_item.added','response.output_item.done'].includes(event.type)&&event.item?.type==='reasoning'){
   if(!keys(event,['type','item','output_index','sequence_number'])||!index(event.output_index)||this.#messageIndices.has(event.output_index))fail();
   const done=event.type.endsWith('.done');reasoning(event.item,done);
   const row=this.#items.get(event.output_index);
   if(done){if(!row||row.done||row.id!==event.item.id)fail();row.done=true;}
   else{if(row||this.#items.size>=16||[...this.#items.values()].some(r=>r.id===event.item.id))fail();this.#items.set(event.output_index,{id:event.item.id,done:false});}
   this.#skipped++;return;
  }
  const spec=reasoningEvents.get(event.type);
  if(spec){
   const [ix,value,type]=spec;
   if(!keys(event,['type','item_id','output_index','sequence_number',ix,value])||!index(event[ix])||(type?!part(event[value],type):!text(event[value])))fail();
   this.#active(event);this.#skipped++;return;
  }
  if(['response.content_part.added','response.content_part.done'].includes(event.type)&&event.part?.type==='reasoning_text'){
   if(!keys(event,['type','item_id','output_index','content_index','sequence_number','part'])||!index(event.content_index)||!part(event.part,'reasoning_text'))fail();
   this.#active(event);this.#skipped++;return;
  }
  if(['response.output_item.added','response.output_item.done'].includes(event.type)){
   if(event.item?.type!=='message'||event.item.role!=='assistant'||!id(event.item.id)||!index(event.output_index)||this.#items.has(event.output_index))fail();
   const row=this.#messageIndices.get(event.output_index);
   if(event.type.endsWith('.done')){if(!row||row.done||row.id!==event.item.id)fail();row.done=true;}
   else{if(row||[...this.#messageIndices.values()].some(r=>r.id===event.item.id)||[...this.#items.values()].some(r=>r.id===event.item.id))fail();this.#messageIndices.set(event.output_index,{id:event.item.id,done:false});}
  }
  this.#forward(event); // Existing parser still rejects tools, refusal and unknown events.
 }
 finish(){
  if(this.#closed)throw Error('offline_envelope_closed');
  try{
   this.#pending+=this.#decoder.decode();this.#consume();
   if(this.#pending.trim()||!this.#completed)fail();
   const result=this.#strict.finish();
   const audit={protocolVersion:offlineEnvelopeVersion,discardedReasoningItems:this.#discarded,discardedReasoningEvents:this.#skipped,reasoningReturned:false,liveEnabled:false};
   this.#closed=true;this.#clear();return {...result,envelopeAudit:audit};
  }catch(error){this.#reject(error);}
 }
}
