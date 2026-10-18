// Independent scripted provider-shaped responses, never credentials or real inference.
export function protocolScene(material){
  if(material.stage==='wake')return {fragment:material.previousScenes[1].event,residue:.1,associations:[]};
  return {event:material.sceneIndex===0?'A small clock stands in a shallow bowl.':'The bowl becomes transparent; the small clock remains still.',appraisal:{goalEffect:0,control:.5,uncertainty:.5},basis:{goal:null,control:null,uncertainty:null},affect:{kind:'unchanged'}};
}
export const byteChunks=(text,size=13)=>{const bytes=Buffer.from(text),out=[];for(let i=0;i<bytes.length;i+=size)out.push(bytes.subarray(i,i+size));return out;};
export function planTranscript(draft,value){
 const material=JSON.parse(draft.body.input[0].content),data=value??protocolScene(material);
 const event={type:'response.completed',response:{id:'fiction-response',status:'completed',model:draft.body.model,output:[{type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:JSON.stringify(data)}]}],usage:{input_tokens:7,output_tokens:3,total_tokens:10}}};
 return byteChunks(`data: ${JSON.stringify(event)}\r\n\r\n`);
}
export function codexTranscript(draft,value,{status='completed',itemType='agentMessage',turn='fiction-turn',thread='fiction-thread'}={}){
 const data=value??protocolScene(JSON.parse(draft.input));
 const events=[{method:'turn/started',params:{threadId:thread,turn:{id:turn,status:'inProgress',items:[]}}},
 {method:'item/completed',params:{threadId:thread,turnId:turn,item:{id:'fiction-message',type:itemType,phase:'final_answer',text:JSON.stringify(data)}}},
 {method:'turn/completed',params:{threadId:thread,turn:{id:turn,status,items:[],error:null}}}];
 return {thread_id:thread,turn_id:turn,chunks:byteChunks(events.map(e=>JSON.stringify(e)).join('\r\n')+'\r\n')};
}
