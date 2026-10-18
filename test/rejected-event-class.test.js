import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {OfflineEventClassEnvelopeStream} from '../scripts/offline-event-class-envelope.mjs';
import {OfflineAggregateEnvelopeStream} from '../scripts/offline-aggregate-envelope.mjs';
import {OfflineEventClassPlanAdapter,selectAdapter} from '../scripts/offline-event-class-port.mjs';
import {ModelPortNightvoyage} from '../scripts/offline-event-class-runtime.mjs';
import {rejectedEventFailure,rejectedEventClass,rejectedEventDiagnostic,reviewedRejectedEventDiagnostic,rejectedEventChecks} from '../scripts/rejected-event-class.mjs';
import {envelopeDiagnostic} from '../scripts/envelope-diagnostic.mjs';
import {aggregateEvents,envelopeSeed} from '../test-support/offline-aggregate-fixtures.js';
import {envelopeEvents,envelopeBytes,shapeModel} from '../test-support/offline-plan-envelope-fixtures.js';
import {aggregateTrialProposal} from '../scripts/aggregate-plan-trial.mjs';
const examples=[['response.failed','upstream_failed_event'],['response.incomplete','upstream_incomplete_event'],['error','upstream_error_event'],['response.queued','unsupported_queue_event'],['response.output_text.annotation.added','unsupported_annotation_event'],['response.compaction.compacting','unsupported_compaction_event'],['synthetic.private-unknown','unreviewed_event']];
for(const [type,check]of examples)test(`rejected ${check} stays rejected, emits only fixed type metadata and does not identify the historical cause`,()=>{
 const events=envelopeEvents();events.splice(2,0,{type,response:{error:{message:'SYNTHETIC-PRIVATE-BODY',code:'SYNTHETIC-PRIVATE-CODE'}},text:'SYNTHETIC-PRIVATE-TEXT'});
 const bytes=envelopeBytes(events),old=new OfflineAggregateEnvelopeStream(shapeModel),candidate=new OfflineEventClassEnvelopeStream(shapeModel);
 assert.throws(()=>old.push(bytes),e=>envelopeDiagnostic(e)?.check==='unknown_event');
 assert.throws(()=>candidate.push(bytes),e=>{
  const diagnostic=rejectedEventDiagnostic(e);assert.deepEqual(diagnostic,{schemaVersion:1,layer:'rejected_response_event',check});
  assert.deepEqual(reviewedRejectedEventDiagnostic(diagnostic),diagnostic);assert.equal(Object.keys(diagnostic).length,3);assert.ok(!JSON.stringify(diagnostic).includes('PRIVATE'));return true;
 });assert.throws(()=>candidate.finish(),/closed/);
});
test('valid stream still needs complete final validation, discards reasoning and changes no usage',()=>{
 const events=envelopeEvents(),a=new OfflineAggregateEnvelopeStream(shapeModel),b=new OfflineEventClassEnvelopeStream(shapeModel);a.push(envelopeBytes(events));b.push(envelopeBytes(events));const old=a.finish(),current=b.finish();assert.deepEqual(current.data,old.data);assert.deepEqual(current.usage,old.usage);assert.equal(current.envelopeAudit.protocolVersion,'offline-rejected-event-classification-v1');assert.equal(current.envelopeAudit.liveEnabled,false);assert.ok(!JSON.stringify(current).includes('PRIVATE'));
});
test('raw names, getters, arbitrary codes, extra keys and forged errors cannot enter the closed diagnostic',()=>{
 const marker='SYNTHETIC-PRIVATE-NAME';let touched=false;
 for(const value of [marker,'__proto__','response.failed.SYNTHETIC-PRIVATE',{},null,{toString(){touched=true;return 'error';}}])assert.equal(rejectedEventClass(value),'unreviewed_event');
 assert.equal(touched,false);assert.ok(Object.isFrozen(rejectedEventChecks));assert.equal(rejectedEventDiagnostic(Error(marker)),null);
 const error=rejectedEventFailure(marker),d=rejectedEventDiagnostic(error);d.check=marker;assert.equal(rejectedEventDiagnostic(error).check,'unreviewed_event');
 for(const value of [{schemaVersion:1,layer:'rejected_response_event',check:marker},{schemaVersion:1,layer:'rejected_response_event',check:'unreviewed_event',detail:marker},{schemaVersion:1,layer:'rejected_response_event',get check(){touched=true;return 'unreviewed_event';}}])assert.equal(reviewedRejectedEventDiagnostic(value),null);
 assert.equal(touched,false);
});
test('existing terminal/shape/byte checks keep precedence; event classes never authorize an unsupported stream',()=>{
 for(const [event,check]of [[{type:'response.failed',sequence_number:-1},'event_sequence'],[{type:2},'event_shape'],[{type:'response.refusal.delta'},'refusal_output'],[{type:'response.output_item.added',item:{type:'function_call'}},'forbidden_output_item']]){
  const decoder=new OfflineEventClassEnvelopeStream(shapeModel);assert.throws(()=>decoder.push(envelopeBytes([event])),e=>rejectedEventDiagnostic(e)?.check===check);
 }
 const oversized=new OfflineEventClassEnvelopeStream(shapeModel);assert.throws(()=>oversized.push(Buffer.alloc(65537)),e=>rejectedEventDiagnostic(e)?.check==='stream_byte_limit');
 const after=new OfflineEventClassEnvelopeStream(shapeModel);after.push(envelopeBytes());assert.throws(()=>after.push(envelopeBytes([{type:'response.failed'}])),e=>rejectedEventDiagnostic(e)?.check==='events_after_completion');
});
test('simulator persists body-free rejected-event metadata across reopen/replay/withdrawal with one failed stage',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-event-class-')),directory=path.join(root,'book');let engine,calls=0;
 t.after(()=>{engine?.close();fs.rmSync(root,{recursive:true,force:true});});
 const adapter=new OfflineEventClassPlanAdapter({model_id:'synthetic-event-class',simulator:draft=>{calls++;const events=aggregateEvents(draft);events.splice(2,0,{type:'response.failed',response:{error:{message:'SYNTHETIC-PRIVATE-REJECTED-BODY'}}});return [envelopeBytes(events)];}}),open=()=>engine=new ModelPortNightvoyage(directory,{selection:selectAdapter({primary:adapter})});
 open();const id=engine.start('synthetic-event-class','synthetic-event-class',envelopeSeed());await engine.execute(id);assert.equal(engine.status(id).status,'failed');assert.equal(engine.status(id).external_calls_started,0);assert.equal(engine.status(id).stage_dispatches_started,1);assert.equal(engine.status(id).usage[0].usage,'unknown');assert.equal(engine.result(id).dream,null);
 const diagnostic=engine.status(id).validation_diagnostic;assert.equal(diagnostic.check,'upstream_failed_event');engine.close();open();assert.deepEqual(engine.status(id).validation_diagnostic,diagnostic);await engine.execute(id);assert.equal(calls,1);await assert.rejects(engine.resume(id),/ambiguous_attempt/);
 const source=envelopeSeed().sources[0];engine.withdraw(source.id);engine.close();open();assert.equal(engine.result(id).dream,null);assert.deepEqual(engine.recall('clock','synthetic-replay',1),[]);await engine.execute(id);assert.equal(calls,1);
 const disk=fs.readFileSync(path.join(directory,'state.json'),'utf8');assert.ok(!disk.includes('SYNTHETIC-PRIVATE'));assert.ok(!disk.includes(source.text));assert.ok(!disk.includes('response.failed'));
});
test('versioned offline copy changes only classification metadata; current native grant source pins stay exact',()=>{
 const read=p=>fs.readFileSync(new URL('../scripts/'+p,import.meta.url),'utf8').replaceAll('\r\n','\n');
 const expected=read('offline-aggregate-envelope.mjs')
  .replace("import {envelopeFailure,envelopeDiagnostic,markEnvelopeFailure} from './envelope-diagnostic.mjs';", "import {envelopeFailure} from './envelope-diagnostic.mjs';\nimport {rejectedEventFailure,rejectedEventDiagnostic as envelopeDiagnostic,markRejectedEventFailure as markEnvelopeFailure} from './rejected-event-class.mjs';")
  .replace("'offline-aggregate-envelope-v1'","'offline-rejected-event-classification-v1'").replace('OfflineAggregateEnvelopeStream','OfflineEventClassEnvelopeStream')
  .replace("if(envelopeDiagnostic(error)?.layer==='responses_envelope')throw error;","if(['responses_envelope','rejected_response_event'].includes(envelopeDiagnostic(error)?.layer))throw error;")
  .replace(".includes(event.type))fail('unknown_event');",".includes(event.type))throw rejectedEventFailure(event.type);");
 assert.equal(read('offline-event-class-envelope.mjs'),expected);
 assert.equal(read('offline-event-class-runtime.mjs'),read('dream-model-runtime.mjs').replace('./dream-model-port.mjs','./offline-event-class-port.mjs').replace("import {planResponseDiagnostic,reviewedPlanResponseDiagnostic} from './plan-response-diagnostic.mjs';","import {rejectedEventDiagnostic as planResponseDiagnostic,reviewedRejectedEventDiagnostic as reviewedPlanResponseDiagnostic} from './rejected-event-class.mjs';"));
 assert.equal(selectAdapter().adapter.identity.adapter_kind,'FakeAdapter');assert.equal(new OfflineEventClassPlanAdapter().preflight().ready,false);assert.throws(()=>new OfflineEventClassPlanAdapter({httpTransport:{}}));assert.ok(aggregateTrialProposal());
});
