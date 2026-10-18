import test from 'node:test';
import assert from 'node:assert/strict';
import {ChatgptPlanStream} from '../scripts/chatgpt-plan-protocol.mjs';
import {markPlanResponseFailure,planResponseDiagnostic} from '../scripts/plan-response-diagnostic.mjs';
import {shapeModel,shapeFrame,shapeCompletion,planOutputShapeCases} from '../test-support/plan-output-shape-cases.js';

for(const fixture of planOutputShapeCases())test(`same closed diagnostic cannot distinguish ${fixture.caseId}`,()=>{
 const decoder=new ChatgptPlanStream(shapeModel),bytes=Buffer.from(fixture.sse);
 let error;try{for(let n=0;n<bytes.length;n+=7)decoder.push(bytes.subarray(n,n+7));decoder.finish();}catch(e){error=e;}
 assert.ok(error);assert.equal(error.message,'plan_output_shape');
 assert.deepEqual(planResponseDiagnostic(markPlanResponseFailure(error)),{schemaVersion:1,layer:'responses_protocol',check:'plan_output_shape'});
 assert.throws(()=>decoder.finish(),/plan_stream_closed/);
 assert.throws(()=>decoder.push(Buffer.from(shapeFrame(shapeCompletion()))),/plan_stream_closed/);
 assert.ok(!JSON.stringify(planResponseDiagnostic(error)).includes('SYNTHETIC-NOT-RETURNED'));
});

test('strict completed control still releases only normalized text JSON and actual usage',()=>{
 const decoder=new ChatgptPlanStream(shapeModel);
 assert.equal(decoder.push(Buffer.from(shapeFrame(shapeCompletion()))),undefined);
 assert.deepEqual(decoder.finish(),{data:{fragment:'虚构的空碗'},usage:{inputTokens:10,outputTokens:10,totalTokens:20}});
});
