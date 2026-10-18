// Independent synthetic counterexamples, not captured provider responses.
export const shapeModel='synthetic-shape-model';
export const shapeFrame=event=>`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
export function shapeCompletion(){
 return {type:'response.completed',response:{id:'synthetic-shape-response',model:shapeModel,status:'completed',output:[{type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:JSON.stringify({fragment:'虚构的空碗'})}]}],usage:{input_tokens:10,output_tokens:10,total_tokens:20}}};
}
export function planOutputShapeCases(){
 const end=change=>{const e=shapeCompletion();change(e.response);return shapeFrame(e);};
 const before=event=>shapeFrame(event)+shapeFrame(shapeCompletion());
 return [
  ['completed_output_missing','completed_output_cardinality',end(r=>delete r.output)],
  ['completed_output_empty','completed_output_cardinality',end(r=>r.output=[])],
  ['completed_reasoning_and_message','completed_output_cardinality',end(r=>r.output.unshift({type:'reasoning',summary:[]}))],
  ['completed_nonmessage','completed_message_or_content',end(r=>r.output=[{type:'function_call',arguments:'SYNTHETIC-NOT-RETURNED'}])],
  ['completed_wrong_role','completed_message_or_content',end(r=>r.output[0].role='user')],
  ['completed_unfinished_message','completed_message_or_content',end(r=>r.output[0].status='in_progress')],
  ['completed_multiple_text_parts','completed_message_or_content',end(r=>r.output[0].content.push({type:'output_text',text:'SYNTHETIC-NOT-RETURNED'}))],
  ['completed_refusal','completed_message_or_content',end(r=>r.output[0].content=[{type:'refusal',refusal:'SYNTHETIC-NOT-RETURNED'}])],
  ['stream_reasoning_item','stream_output_item',before({type:'response.output_item.added',item:{type:'reasoning',summary:[]}})],
  ['stream_tool_item','stream_output_item',before({type:'response.output_item.done',item:{type:'function_call',arguments:'SYNTHETIC-NOT-RETURNED'}})],
  ['stream_reasoning_part','stream_content_part',before({type:'response.content_part.added',part:{type:'reasoning_text',text:'SYNTHETIC-NOT-RETURNED'}})],
  ['stream_reasoning_summary_event','stream_event_allowlist',before({type:'response.reasoning_summary_text.delta',delta:'SYNTHETIC-NOT-RETURNED'})],
  ['stream_unknown_event','stream_event_allowlist',before({type:'synthetic.unknown',text:'SYNTHETIC-NOT-RETURNED'})]
 ].map(([caseId,branch,sse])=>({caseId,branch,sse}));
}
