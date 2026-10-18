import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {OfflineAggregateEnvelopeStream,aggregateEnvelopeLimits,offlineEnvelopeVersion} from '../scripts/offline-aggregate-envelope.mjs';
import {ValidatedEnvelopeStream} from '../scripts/validated-envelope-stream.mjs';
import {ChatgptPlanStream,chatgptPlanLimits} from '../scripts/chatgpt-plan-protocol.mjs';
import {envelopeDiagnostic} from '../scripts/envelope-diagnostic.mjs';
import {denseEnvelope,envelopeBytes,shapeModel} from '../test-support/envelope-event-budget-fixtures.js';
import {envelopeEvents} from '../test-support/offline-plan-envelope-fixtures.js';
import {shapeCompletion} from '../test-support/plan-output-shape-cases.js';
const compactFrame=e=>Buffer.from(`data:${JSON.stringify(e)}\n\n`);
function decode(events,step=17){
 const bytes=envelopeBytes(events),decoder=new OfflineAggregateEnvelopeStream(shapeModel);
 for(let i=0;i<bytes.length;i+=step)assert.equal(decoder.push(bytes.subarray(i,i+step)),undefined);
 return decoder.finish();
}
for(const [kind,count]of [['reasoning',120],['reasoning',220],['answer',120]])test(`aggregate candidate accepts complete fine ${kind} stream (${count}) under unchanged byte bounds`,()=>{
 const events=denseEnvelope(kind,count),bytes=envelopeBytes(events);assert.ok(events.length>128);assert.ok(bytes.length<65536);
 const old=new ValidatedEnvelopeStream(shapeModel);assert.throws(()=>old.push(bytes),e=>envelopeDiagnostic(e)?.check==='event_limit');
 const result=decode(events);assert.equal(result.data.fragment,'a'.repeat(count));
 assert.deepEqual(result.usage,{inputTokens:10,outputTokens:10,totalTokens:20});
 assert.equal(result.envelopeAudit.processedEvents,events.length);assert.equal(result.envelopeAudit.strictCompletionFrames,1);
 assert.equal(result.envelopeAudit.aggregateEventLimit,1024);assert.equal(result.envelopeAudit.protocolVersion,offlineEnvelopeVersion);
 assert.equal(result.envelopeAudit.reasoningReturned,false);assert.equal(result.envelopeAudit.liveEnabled,false);
 assert.ok(!JSON.stringify(result).includes('PRIVATE'));assert.ok(!JSON.stringify(result).includes('r'.repeat(count)));
});
test('1024 compact frames fit unchanged byte ceiling; frame 1025 rejects independent of chunking',()=>{
 const progress=compactFrame({type:'response.in_progress'}),end=compactFrame(shapeCompletion());
 for(const count of [1023,1024])for(const together of [false,true]){
  const bytes=Buffer.concat([...Array(count).fill(progress),end]);assert.ok(bytes.length<65536);
  const decoder=new OfflineAggregateEnvelopeStream(shapeModel);
  const run=()=>{if(together)decoder.push(bytes);else{for(let i=0;i<count;i++)decoder.push(progress);decoder.push(end);}return decoder.finish();};
  if(count===1023)assert.equal(run().envelopeAudit.processedEvents,1024);
  else{assert.throws(run,e=>envelopeDiagnostic(e)?.check==='event_limit');assert.throws(()=>decoder.finish(),/closed/);}
 }
 const old=new ChatgptPlanStream(shapeModel);assert.throws(()=>old.push(Buffer.concat([...Array(129).fill(progress),end])),/plan_invalid_stream/);
});
test('comments bypass only the event counter; actual byte count includes comments and CRLF',()=>{
 const decoder=new OfflineAggregateEnvelopeStream(shapeModel),events=envelopeEvents({fragment:'独立虚构的碗影'});
 const bytes=Buffer.from(': synthetic\r\n\r\n'+envelopeBytes(events).toString().replaceAll('\n','\r\n'));
 for(const byte of bytes)decoder.push(Uint8Array.of(byte));
 const result=decoder.finish();assert.equal(result.data.fragment,'独立虚构的碗影');assert.equal(result.envelopeAudit.streamBytes,bytes.length);assert.equal(result.envelopeAudit.processedEvents,events.length);
 const over=new OfflineAggregateEnvelopeStream(shapeModel);assert.throws(()=>over.push(Buffer.from(':'+ 'x'.repeat(65536))),e=>envelopeDiagnostic(e)?.check==='stream_byte_limit');
});
const rejectionCases=[
 ['unknown_event',e=>e.splice(2,0,{type:'unreviewed.event'})],
 ['refusal_output',e=>e.splice(2,0,{type:'response.refusal.delta',delta:'synthetic refusal'})],
 ['forbidden_output_item',e=>e[0].item.type='function_call'],
 ['reasoning_event_shape',e=>e[2].delta=0],
 ['reasoning_lifecycle',e=>e[2].item_id='wrong-synthetic-item'],
 ['reasoning_lifecycle',e=>e[0].output_index=128],
 ['assistant_lifecycle',e=>e[8].item.id='wrong-synthetic-message'],
 ['response_model_mismatch',e=>e.at(-1).response.model='synthetic-other-model'],
 ['response_not_completed',e=>e.at(-1).response.status='incomplete'],
 ['assistant_message_shape',e=>e.at(-1).response.output[1].content=[]],
 ['assistant_message_count',e=>e.at(-1).response.output.push({...structuredClone(e.at(-1).response.output[1]),id:'synthetic-other-message'})],
 ['event_sequence',e=>e[2].sequence_number=-1],
 ['events_after_completion',e=>e.push({type:'response.in_progress'})],
 ['trailing_or_incomplete_stream',e=>e.pop()]
];
for(const [check,change]of rejectionCases)test(`aggregate candidate preserves ${check} rejection`,()=>{
 const events=envelopeEvents();change(events);
 assert.throws(()=>decode(events),e=>envelopeDiagnostic(e)?.check===check);
 assert.throws(()=>{const old=new ValidatedEnvelopeStream(shapeModel);old.push(envelopeBytes(events));old.finish();});
});
for(const [kind,modify]of [
 ['invalid usage',r=>r.usage.total_tokens++],
 ['invalid JSON',r=>r.output[1].content[0].text='not JSON'],
 ['scalar answer',r=>r.output[1].content[0].text='1'],
 ['oversized final JSON',r=>r.output[1].content[0].text=JSON.stringify({fragment:'a'.repeat(1200)})]
])test(`original strict completion validator still rejects ${kind}`,()=>{
 const events=envelopeEvents();modify(events.at(-1).response);assert.throws(()=>decode(events));
});
test('malformed UTF-8/JSON/name, oversized and truncated streams release no answer and cannot restart',()=>{
 for(const bytes of [Buffer.from([255]),Buffer.from('data:NOT_JSON\n\n'),Buffer.from('event:wrong\ndata:{"type":"response.created"}\n\n'),Buffer.alloc(65537),Buffer.from('data:{"type":"response.completed"}')]){
  const decoder=new OfflineAggregateEnvelopeStream(shapeModel);assert.throws(()=>{decoder.push(bytes);decoder.finish();});assert.throws(()=>decoder.push(Buffer.alloc(0)),/closed/);assert.throws(()=>decoder.finish(),/closed/);
 }
});
test('candidate bound changes no output indices, old live parser, limits or final validator',()=>{
 assert.equal(chatgptPlanLimits.events,128);assert.equal(aggregateEnvelopeLimits.events,1024);assert.equal(aggregateEnvelopeLimits.indexLimit,128);assert.ok(Object.isFrozen(aggregateEnvelopeLimits));
 for(const key of ['requestBytes','streamBytes','contentBytes','serverOutputTokenCap'])assert.equal(aggregateEnvelopeLimits[key],chatgptPlanLimits[key]);
 const read=p=>fs.readFileSync(new URL(`../scripts/${p}`,import.meta.url),'utf8').replaceAll('\r\n','\n');
 let expected=read('validated-envelope-stream.mjs')
  .replace('// Offline-only candidate. No transport, credentials, Store, provider selection or grant.','// Independently versioned offline aggregate-budget candidate; no live adapter or grant.')
  .replace("export const offlineEnvelopeVersion='validated-reasoning-envelope-v1';", "export const offlineEnvelopeVersion='offline-aggregate-envelope-v1';\n// An explicit candidate processing bound, not provider entitlement or model-token math.\nexport const aggregateEnvelopeLimits=Object.freeze({...chatgptPlanLimits,events:1024,indexLimit:128,reasoningItems:16});")
  .replace('export class ValidatedEnvelopeStream{','export class OfflineAggregateEnvelopeStream{')
  .replace('if(++this.#events>chatgptPlanLimits.events)','if(++this.#events>aggregateEnvelopeLimits.events)')
  .replace("#forward(event){this.#strict.push(Buffer.from(`event: ${event.type}\\ndata: ${JSON.stringify(event)}\\n\\n`));}","#forward(event){\n  const frame=Buffer.from(`event: ${event.type}\\ndata: ${JSON.stringify(event)}\\n\\n`);\n  // The outer parser owns aggregate bytes/events and cross-event lifecycle.\n  // Old strict event-shape checks run on one transient frame without accumulating it.\n  // Only the sanitized completion enters the persistent strict final-answer validator.\n  const validator=event.type==='response.completed'?this.#strict:new ChatgptPlanStream(this.#model);\n  validator.push(frame);\n }")
  .replace('reasoningReturned:false,liveEnabled:false','processedEvents:this.#events,streamBytes:this.#bytes,aggregateEventLimit:aggregateEnvelopeLimits.events,strictCompletionFrames:1,reasoningReturned:false,liveEnabled:false');
 assert.equal(read('offline-aggregate-envelope.mjs'),expected);
});
