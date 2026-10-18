import {envelopeEvents,envelopeBytes} from './offline-plan-envelope-fixtures.js';
import {protocolScene} from './model-port-protocol-fixtures.js';
export {envelopeSeed} from './offline-envelope-runtime-fixtures.js';
export function aggregateEvents(draft,value,mutate=()=>{}){
 const material=JSON.parse(draft.body.input[0].content),events=envelopeEvents(value??protocolScene(material)),reason='SYNTHETIC-AGGREGATE-REASONING-'.repeat(5);
 events.at(-1).response.model=draft.body.model;
 events[0].item.summary[0].text='';events[3].text=reason;events[4].part.text=reason;
 events[5].item.summary[0].text=reason;events.at(-1).response.output[0].summary[0].text=reason;
 events[7].delta=events.at(-1).response.output[1].content[0].text;
 const delta=events[2];events.splice(2,1,...Array.from(reason,text=>({...delta,delta:text})));
 mutate(events);return events;
}
export function aggregateTranscript(draft,value,mutate){
 const bytes=envelopeBytes(aggregateEvents(draft,value,mutate)),chunks=[];
 for(let n=0;n<bytes.length;n+=13)chunks.push(bytes.subarray(n,n+13));return chunks;
}
