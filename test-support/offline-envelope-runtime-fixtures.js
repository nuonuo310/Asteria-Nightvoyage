import fs from 'node:fs';
import {envelopeEvents,envelopeBytes} from './offline-plan-envelope-fixtures.js';
import {protocolScene} from './model-port-protocol-fixtures.js';
export const envelopeSeed=()=>JSON.parse(fs.readFileSync(new URL('../examples/adapter-boundary.snapshot.json',import.meta.url),'utf8'));
export function envelopeTranscript(draft,value,mutate=()=>{}){
 const material=JSON.parse(draft.body.input[0].content),events=envelopeEvents(value??protocolScene(material));
 events.at(-1).response.model=draft.body.model;mutate(events);
 const bytes=envelopeBytes(events),chunks=[];for(let n=0;n<bytes.length;n+=13)chunks.push(bytes.subarray(n,n+13));return chunks;
}
