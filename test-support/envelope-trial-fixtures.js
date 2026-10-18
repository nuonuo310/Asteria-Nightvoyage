// Fully synthetic predecessor and new book. Never adopts user runtime data or consent.
import path from 'node:path';
import {missingTypeTrialFixture} from './missing-type-trial-fixtures.js';
import {initMissingTypeTrial,executeMissingTypeTrial} from '../scripts/missing-type-plan-trial.mjs';
import {syntheticPlanHttp} from './plan-trial-fixtures.js';
import {planTranscript} from './model-port-protocol-fixtures.js';
export async function envelopeTrialFixture(t){
 const d=await missingTypeTrialFixture(t);
 initMissingTypeTrial(d.directory,d.history,{approveFictionalSubscriptionTrial:true,confirmExtraCreditsDisabled:true,acknowledgeNoServerTokenCap:true,approveMissingContentTypeCompatibility:true,acknowledgeConsumedDiagnostics:true});
 const http=syntheticPlanHttp({onGenerate:body=>{const chunks=planTranscript({body}),text=Buffer.concat(chunks).toString('utf8').replace('"role":"assistant"','"role":"user"');return new Response(Buffer.from(text));}});http.install();
 try{const result=await executeMissingTypeTrial({...d,onReady:http.onReady});if(result.receipt.validation_diagnostic?.check!=='plan_output_shape'||result.receipt.external_calls_started!==1||result.receipt.remoteRevocationConfirmed!==true)throw Error('synthetic_shape_antecedent_invalid');}finally{http.restore();}
 return {root:d.root,directory:path.join(d.root,'envelope-dream'),connectionDirectory:d.connectionDirectory,history:{failedTrialDirectory:d.directory,...d.history}};
}
