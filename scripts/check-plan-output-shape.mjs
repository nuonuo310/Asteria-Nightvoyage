// Reproduce ambiguity with fabricated events. No login, transport or Store.
import assert from 'node:assert/strict';
import {ChatgptPlanStream} from './chatgpt-plan-protocol.mjs';
import {markPlanResponseFailure,planResponseDiagnostic} from './plan-response-diagnostic.mjs';
import {shapeModel,planOutputShapeCases} from '../test-support/plan-output-shape-cases.js';
const results=planOutputShapeCases().map(({caseId,branch,sse})=>{
 const decoder=new ChatgptPlanStream(shapeModel);let diagnostic;
 try{decoder.push(Buffer.from(sse));decoder.finish();}catch(error){diagnostic=planResponseDiagnostic(markPlanResponseFailure(error));}
 assert.deepEqual(diagnostic,{schemaVersion:1,layer:'responses_protocol',check:'plan_output_shape'});
 assert.throws(()=>decoder.finish(),/plan_stream_closed/);
 return {caseId,syntheticBranch:branch,check:diagnostic.check,bodyReleased:false};
});
console.log(JSON.stringify({command:'node scripts/check-plan-output-shape.mjs',node:process.version,platform:process.platform,kind:'independent_synthetic_counterexamples',cases:results.length,distinctCodeBranches:new Set(results.map(r=>r.syntheticBranch)).size,results,realModelRequests:0,credentialReads:0,userStoreAccessed:false,productionParserChanged:false,historicalCauseRecoverable:false,reasoningIsConfirmedCause:false,inferenceQualified:false,qualityAssessed:false},null,2));
