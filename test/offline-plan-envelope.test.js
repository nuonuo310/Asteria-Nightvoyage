import test from 'node:test';
import assert from 'node:assert/strict';
import {OfflinePlanEnvelopeStream} from '../scripts/offline-plan-envelope.mjs';
import {ChatgptPlanStream,chatgptPlanLimits} from '../scripts/chatgpt-plan-protocol.mjs';
import {envelopeEvents,envelopeBytes,shapeModel,shapeFrame,syntheticReasoning} from '../test-support/offline-plan-envelope-fixtures.js';
import {shapeCompletion} from '../test-support/plan-output-shape-cases.js';
import {inlineSeed,inlineResponse} from '../test-support/inline-runtime-fixtures.js';
import {normalizeInlineStage} from '../src/inline-evidence-protocol.js';
import {prepareChatgptPlanRequest} from '../scripts/chatgpt-plan-protocol.mjs';

function decode(events=envelopeEvents(),step=7){const p=new OfflinePlanEnvelopeStream(shapeModel),b=envelopeBytes(events);for(let n=0;n<b.length;n+=step)assert.equal(p.push(b.subarray(n,n+step)),undefined);return p.finish();}
function reject(events){const p=new OfflinePlanEnvelopeStream(shapeModel);assert.throws(()=>{p.push(envelopeBytes(events));p.finish();},e=>/^(offline_envelope_rejected|plan_[a-z_]+)$/.test(e.message)&&!e.message.includes('PRIVATE'));assert.throws(()=>p.finish(),/closed/);assert.throws(()=>p.push(Buffer.from('x')),/closed/);}

test('offline candidate discards linked reasoning while original strict decoder remains unchanged',()=>{
 const events=envelopeEvents(),copy=structuredClone(events),r=decode(events,1);
 assert.deepEqual(events,copy);assert.deepEqual(r.data,{fragment:'虚构空碗的影子'});assert.equal(r.envelopeAudit.discardedReasoningItems,1);assert.equal(r.envelopeAudit.discardedReasoningEvents,6);assert.equal(r.envelopeAudit.liveEnabled,false);
 assert.ok(!JSON.stringify(r).includes('PRIVATE'));assert.ok(!JSON.stringify(r).includes('synthetic-reasoning'));assert.equal(r.usage.totalTokens,20);
 const strict=new ChatgptPlanStream(shapeModel);assert.throws(()=>strict.push(envelopeBytes(events)),/plan_output_shape/);
});
test('CRLF, split multibyte and final-only envelopes retain strict single-text behavior',()=>{
 const e=envelopeEvents().at(-1),r=decode([e],1);assert.equal(r.envelopeAudit.discardedReasoningItems,1);
 const p=new OfflinePlanEnvelopeStream(shapeModel),b=Buffer.from(shapeFrame(e).replaceAll('\n','\r\n'));for(const byte of b)p.push(Uint8Array.of(byte));assert.deepEqual(p.finish(),r);
 const control=decode([shapeCompletion()]);assert.equal(control.envelopeAudit.discardedReasoningItems,0);
});
test('reasoning text and content-part events are discarded only for a linked active reasoning item',()=>{
 const events=envelopeEvents();events.splice(1,0,
  {type:'response.content_part.added',output_index:0,item_id:'synthetic-reasoning',content_index:0,part:{type:'reasoning_text',text:''}},
  {type:'response.reasoning_text.delta',output_index:0,item_id:'synthetic-reasoning',content_index:0,delta:'SYNTHETIC-REASONING-PRIVATE'},
  {type:'response.reasoning_text.done',output_index:0,item_id:'synthetic-reasoning',content_index:0,text:'SYNTHETIC-REASONING-PRIVATE'},
  {type:'response.content_part.done',output_index:0,item_id:'synthetic-reasoning',content_index:0,part:{type:'reasoning_text',text:'SYNTHETIC-REASONING-PRIVATE'}});
 assert.ok(!JSON.stringify(decode(events)).includes('PRIVATE'));
 const wrong=structuredClone(events);wrong[1].item_id='other';reject(wrong);
});
test('reasoning identities, indices, lifecycle and completed cardinality cannot be laundered',()=>{
 for(const change of [
  e=>e[0].output_index=-1,e=>e[5].item.id='other',e=>e.splice(5,1),e=>e.splice(1,0,structuredClone(e[0])),
  e=>e[1].item_id='other',e=>e[1].summary_index=Infinity,e=>e[1].part.type='output_text',
  e=>e[9].response.output[0].id='other',e=>e[9].response.output.reverse(),e=>e[9].response.output.push(structuredClone(e[9].response.output[1])),
  e=>e.splice(6,0,structuredClone(e[2])),e=>e[6].output_index=0,
  e=>e[6].output_index=2,e=>e[8].item.id='other',e=>e.splice(8,1)
 ]){const events=envelopeEvents();change(events);reject(events);}
});
test('malformed or unknown reasoning metadata is rejected before any discard',()=>{
 for(const change of [r=>r.summary=null,r=>r.summary=[{type:'summary_text',text:4}],r=>r.encrypted_content={},r=>r.content=[{type:'output_text',text:'x'}],r=>r.tool='SYNTHETIC-PRIVATE',r=>r.status='incomplete']){
  const e=envelopeEvents().at(-1);change(e.response.output[0]);reject([e]);
 }
 const e=envelopeEvents();e[2].unknown='SYNTHETIC-PRIVATE';reject(e);
 const lots=envelopeEvents().at(-1);lots.response.output=Array.from({length:17},(_,n)=>({...syntheticReasoning(),id:`synthetic-${n}`})).concat(lots.response.output[1]);reject([lots]);
});
test('tools, refusal, unknown events and extra assistant parts still cannot publish',()=>{
 for(const bad of [{type:'response.output_item.added',output_index:0,item:{type:'function_call',arguments:'SYNTHETIC-PRIVATE'}},{type:'response.refusal.delta',delta:'SYNTHETIC-PRIVATE'},{type:'response.unknown',text:'SYNTHETIC-PRIVATE'}])reject([bad,shapeCompletion()]);
 for(const change of [r=>r.output.push({type:'function_call'}),r=>r.output[0].content.push({type:'output_text',text:'x'}),r=>r.output[0].content=[{type:'refusal',refusal:'SYNTHETIC-PRIVATE'}]]){const e=shapeCompletion();change(e.response);reject([e]);}
});
test('completion, model, usage and JSON gates survive envelope normalization',()=>{
 for(const change of [r=>r.status='incomplete',r=>r.model='other',r=>r.usage.total_tokens=99,r=>r.output[1].content[0].text='not json',r=>r.output[1].content[0].text='[]',r=>r.output[1].status='in_progress']){const e=envelopeEvents().at(-1);change(e.response);reject([e]);}
 reject(envelopeEvents().slice(0,-1));reject([...envelopeEvents(),shapeCompletion()]);
});
test('byte, event, UTF-8 and trailing-frame limits remain fail-closed',()=>{
 for(const bytes of [Buffer.from([255]),Buffer.alloc(chatgptPlanLimits.streamBytes+1),Buffer.from(shapeFrame(shapeCompletion()).trimEnd()),Buffer.from(shapeFrame(shapeCompletion())+'trailing')]){
  const p=new OfflinePlanEnvelopeStream(shapeModel);assert.throws(()=>{p.push(bytes);p.finish();});assert.throws(()=>p.finish(),/closed/);
 }
 reject(Array.from({length:129},()=>({type:'response.created'})).concat(shapeCompletion()));
});
test('three independent synthetic stages still require inline scene and extractive wake validation',()=>{
 const snapshot=inlineSeed(),scenes=[];let calls=0;
 for(const stage of ['scene','scene','wake']){
  const draft=prepareChatgptPlanRequest({snapshot,scenes,stage,index:scenes.length},{model:shapeModel}),material=JSON.parse(draft.body.input[0].content);
  const raw=JSON.parse(inlineResponse({body:{messages:[{},{content:JSON.stringify(material)}]}}).body.choices[0].message.content);
  const result=decode(envelopeEvents(raw));calls++;
  assert.ok(!JSON.stringify(result).includes('PRIVATE'));
  const normalized=normalizeInlineStage(result.data,material);
  if(stage==='scene')scenes.push(normalized);else{assert.ok(scenes[normalized.fragmentBasis.sceneIndex].event.includes(normalized.fragment));assert.throws(()=>normalizeInlineStage({...result.data,fragment:'虚构的新结局'},material));}
 }
 assert.equal(calls,3);assert.equal(scenes.length,2);assert.ok(snapshot.sources.every(s=>s.grant.modelEgress===false));
});
