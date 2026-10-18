// Independently scripted streams; never captured provider or user material.
import {envelopeEvents,envelopeBytes,shapeModel} from './offline-plan-envelope-fixtures.js';
export {envelopeBytes,shapeModel};
export function denseEnvelope(kind,count){
 if(!['reasoning','answer'].includes(kind)||!Number.isSafeInteger(count)||count<1)throw Error('synthetic_case_invalid');
 const events=envelopeEvents({fragment:'a'.repeat(count)});
 events[7].delta=events.at(-1).response.output[1].content[0].text;
 if(kind==='reasoning'){
  const value='r'.repeat(count);
  events[0].item.summary[0].text='';
  events[3].text=value;events[4].part.text=value;
  events[5].item.summary[0].text=value;
  events[9].response.output[0].summary[0].text=value;
  const delta=events[2];events.splice(2,1,...Array.from(value,deltaText=>({...delta,delta:deltaText})));
  return events;
 }
 const end=events.at(-1);end.response.output.shift();
 const item=end.response.output[0],text=item.content[0].text;
 return [
  {type:'response.output_item.added',output_index:0,item:{...structuredClone(item),status:'in_progress',content:[]}},
  ...Array.from(text,delta=>({type:'response.output_text.delta',output_index:0,item_id:item.id,content_index:0,delta})),
  {type:'response.output_item.done',output_index:0,item:structuredClone(item)},end
 ];
}
