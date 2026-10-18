import test from 'node:test';
import assert from 'node:assert/strict';
import {ValidatedEnvelopeStream} from '../scripts/validated-envelope-stream.mjs';
import {ChatgptPlanStream,chatgptPlanLimits} from '../scripts/chatgpt-plan-protocol.mjs';
import {envelopeDiagnostic} from '../scripts/envelope-diagnostic.mjs';
import {denseEnvelope,envelopeBytes,shapeModel} from '../test-support/envelope-event-budget-fixtures.js';
const consume=(Decoder,events)=>{const decoder=new Decoder(shapeModel);decoder.push(envelopeBytes(events));return decoder.finish();};
test('128 complete reasoning frames fit the byte ceiling and finish without releasing reasoning',()=>{
 const events=denseEnvelope('reasoning',119);assert.equal(events.length,128);
 assert.ok(envelopeBytes(events).length<chatgptPlanLimits.streamBytes);
 const result=consume(ValidatedEnvelopeStream,events);
 assert.equal(result.data.fragment,'a'.repeat(119));
 assert.ok(!JSON.stringify(result).includes('r'.repeat(119)));
});
test('129 fine reasoning frames below the byte ceiling reject even with a matching final answer',()=>{
 const events=denseEnvelope('reasoning',120);assert.equal(events.length,129);
 assert.ok(envelopeBytes(events).length<chatgptPlanLimits.streamBytes);
 assert.throws(()=>consume(ValidatedEnvelopeStream,events),error=>envelopeDiagnostic(error)?.check==='event_limit');
});
test('fine answer deltas can independently exceed both event counters within the byte ceiling',()=>{
 const events=denseEnvelope('answer',120);assert.ok(events.length>128);
 assert.ok(envelopeBytes(events).length<chatgptPlanLimits.streamBytes);
 assert.throws(()=>consume(ValidatedEnvelopeStream,events),error=>envelopeDiagnostic(error)?.check==='event_limit');
 assert.throws(()=>consume(ChatgptPlanStream,events),/plan_invalid_stream/);
 // A coarse framing of the same final answer passes both decoders.
 const coarse=[events[0],{...events[1],delta:events.at(-1).response.output[0].content[0].text},...events.slice(-2)];
 for(const Decoder of [ValidatedEnvelopeStream,ChatgptPlanStream])assert.equal(consume(Decoder,coarse).data.fragment,'a'.repeat(120));
});
test('event-limit metadata cannot establish the unparsed frame shape or historical cause',()=>{
 const events=denseEnvelope('reasoning',119),decoder=new ValidatedEnvelopeStream(shapeModel);
 // Use 128 nonterminal legal frames; the next frame is deliberately malformed.
 const prefix=[...events.slice(0,-1),{type:'response.in_progress'}];
 decoder.push(envelopeBytes(prefix));
 assert.throws(()=>decoder.push(Buffer.from('data: NOT_JSON\n\n')),error=>{
  assert.deepEqual(envelopeDiagnostic(error),{schemaVersion:1,layer:'responses_envelope',check:'event_limit'});return true;
 });
 assert.throws(()=>decoder.finish(),/closed/);
});
test('comments do not consume events, but still consume the independent stream byte budget',()=>{
 const decoder=new ValidatedEnvelopeStream(shapeModel);
 decoder.push(Buffer.from(': synthetic heartbeat\n\n'.repeat(150)));
 decoder.push(envelopeBytes(denseEnvelope('reasoning',1)));
 assert.ok(decoder.finish().data);
 const oversized=new ValidatedEnvelopeStream(shapeModel);
 assert.throws(()=>oversized.push(Buffer.from(':'+ 'x'.repeat(65536))),error=>envelopeDiagnostic(error)?.check==='stream_byte_limit');
});
