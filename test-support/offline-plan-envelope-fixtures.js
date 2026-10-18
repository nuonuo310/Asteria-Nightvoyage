import {shapeModel,shapeFrame,shapeCompletion} from './plan-output-shape-cases.js';
export {shapeModel,shapeFrame};
export const syntheticReasoning=()=>({type:'reasoning',id:'synthetic-reasoning',status:'completed',summary:[{type:'summary_text',text:'SYNTHETIC-REASONING-PRIVATE'}],encrypted_content:'SYNTHETIC-ENCRYPTED-PRIVATE'});
export function envelopeEvents(data={fragment:'虚构空碗的影子'}){
 const reason=syntheticReasoning(),end=shapeCompletion();
 end.response.output.unshift(structuredClone(reason));end.response.output[1].id='synthetic-message';
 end.response.output[1].content[0].text=JSON.stringify(data);
 return [
  {type:'response.output_item.added',output_index:0,item:{...structuredClone(reason),status:'in_progress'}},
  {type:'response.reasoning_summary_part.added',output_index:0,item_id:reason.id,summary_index:0,part:{type:'summary_text',text:''}},
  {type:'response.reasoning_summary_text.delta',output_index:0,item_id:reason.id,summary_index:0,delta:'SYNTHETIC-REASONING-PRIVATE'},
  {type:'response.reasoning_summary_text.done',output_index:0,item_id:reason.id,summary_index:0,text:'SYNTHETIC-REASONING-PRIVATE'},
  {type:'response.reasoning_summary_part.done',output_index:0,item_id:reason.id,summary_index:0,part:reason.summary[0]},
  {type:'response.output_item.done',output_index:0,item:structuredClone(reason)},
  {type:'response.output_item.added',output_index:1,item:{type:'message',id:'synthetic-message',role:'assistant',status:'in_progress',content:[]}},
  {type:'response.output_text.delta',output_index:1,item_id:'synthetic-message',content_index:0,delta:'not released early'},
  {type:'response.output_item.done',output_index:1,item:structuredClone(end.response.output[1])},end
 ];
}
export function envelopeBytes(events=envelopeEvents()){return Buffer.from(events.map(shapeFrame).join(''));}
