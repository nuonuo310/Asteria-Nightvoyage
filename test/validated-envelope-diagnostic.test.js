import test from 'node:test';
import assert from 'node:assert/strict';
import {ValidatedEnvelopeStream} from '../scripts/validated-envelope-stream.mjs';
import {OfflinePlanEnvelopeStream} from '../scripts/offline-plan-envelope.mjs';
import {envelopeDiagnostic,reviewedEnvelopeDiagnostic,envelopeFailure} from '../scripts/envelope-diagnostic.mjs';
import {envelopeEvents,envelopeBytes,shapeModel} from '../test-support/offline-plan-envelope-fixtures.js';
const decode=(Decoder,events)=>{const d=new Decoder(shapeModel);d.push(envelopeBytes(events));return d.finish();};
const cases=[
 ['reasoning_item_shape',e=>e[0].item.summary=null],['reasoning_status',e=>e[0].item.status='incomplete'],
 ['reasoning_encrypted_shape',e=>e[0].item.encrypted_content={}],['reasoning_event_shape',e=>e[2].delta=5],
 ['reasoning_lifecycle',e=>e[1].item_id='SYNTHETIC-PRIVATE-ID'],['assistant_lifecycle',e=>e[8].item.id='SYNTHETIC-PRIVATE-ID'],
 ['response_model_mismatch',e=>e[9].response.model='SYNTHETIC-PRIVATE-MODEL'],['response_not_completed',e=>e[9].response.status='incomplete'],
 ['assistant_message_count',e=>e[9].response.output.push({...structuredClone(e[9].response.output[1]),id:'synthetic-other'})],
 ['assistant_message_shape',e=>e[9].response.output[1].content=[]],['forbidden_output_item',e=>e[0].item.type='function_call'],
 ['unknown_event',e=>e.unshift({type:'synthetic.unknown',text:'SYNTHETIC-PRIVATE-BODY'})],['trailing_or_incomplete_stream',e=>e.pop()]
];
for(const [check,change]of cases)test(`envelope rejection persists only closed ${check} metadata`,()=>{
 const events=envelopeEvents();change(events);const d=new ValidatedEnvelopeStream(shapeModel);let error;
 try{d.push(envelopeBytes(events));d.finish();}catch(e){error=e;}assert.ok(error);
 assert.deepEqual(envelopeDiagnostic(error),{schemaVersion:1,layer:'responses_envelope',check});assert.deepEqual(reviewedEnvelopeDiagnostic(envelopeDiagnostic(error)),envelopeDiagnostic(error));assert.ok(!JSON.stringify(envelopeDiagnostic(error)).includes('PRIVATE'));assert.throws(()=>d.finish(),/closed/);
 assert.throws(()=>decode(OfflinePlanEnvelopeStream,events));
});
test('valid envelopes preserve data/usage without changing original decoder and never release reasoning',()=>{
 const events=envelopeEvents(),a=decode(ValidatedEnvelopeStream,events),b=decode(OfflinePlanEnvelopeStream,events);assert.deepEqual(a.data,b.data);assert.deepEqual(a.usage,b.usage);assert.equal(a.envelopeAudit.protocolVersion,'validated-reasoning-envelope-v1');assert.ok(!JSON.stringify(a).includes('PRIVATE'));
});
test('byte/UTF-8/event JSON errors and arbitrary metadata cannot create a body-bearing diagnostic',()=>{
 for(const [bytes,check]of [[Buffer.from([255]),'invalid_utf8'],[Buffer.alloc(65537),'stream_byte_limit'],[Buffer.from('data: not-json\n\n'),'invalid_event_json']]){
  const d=new ValidatedEnvelopeStream(shapeModel);let error;try{d.push(bytes);d.finish();}catch(e){error=e;}assert.equal(envelopeDiagnostic(error).check,check);
 }
 for(const value of [{schemaVersion:1,layer:'responses_envelope',check:'PRIVATE'},{schemaVersion:1,layer:'responses_envelope',check:'unknown_event',text:'PRIVATE'}])assert.equal(reviewedEnvelopeDiagnostic(value),null);
 let touched=false;assert.equal(reviewedEnvelopeDiagnostic({schemaVersion:1,layer:'responses_envelope',get check(){touched=true;return 'unknown_event';}}),null);assert.equal(touched,false);assert.equal(envelopeDiagnostic(envelopeFailure('PRIVATE')).check,'invalid_envelope_shape');
});
