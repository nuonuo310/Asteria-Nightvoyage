// Independent fabricated predecessor chain; this never records user consent.
import path from 'node:path';
import {envelopeTrialFixture} from './envelope-trial-fixtures.js';
import {initEnvelopeTrial,executeEnvelopeTrial} from '../scripts/envelope-plan-trial.mjs';
import {syntheticPlanHttp} from './plan-trial-fixtures.js';
import {aggregateTranscript} from './offline-aggregate-fixtures.js';
export async function aggregateTrialFixture(t){
 const d=await envelopeTrialFixture(t);
 initEnvelopeTrial(d.directory,d.history,{approveFictionalSubscriptionTrial:true,confirmExtraCreditsDisabled:true,acknowledgeNoServerTokenCap:true,approveMissingContentTypeCompatibility:true,acknowledgeConsumedDiagnostics:true,approveReasoningDiscard:true});
 const http=syntheticPlanHttp({onGenerate:body=>new Response(Buffer.concat(aggregateTranscript({body})))});http.install();
 try{
  const result=await executeEnvelopeTrial({...d,onReady:http.onReady});
  if(result.receipt.validation_diagnostic?.check!=='event_limit'||result.receipt.external_calls_started!==1||result.receipt.checkpoint.saved_scenes!==0||result.receipt.remoteRevocationConfirmed!==true)throw Error('synthetic_event_antecedent_invalid');
 }finally{http.restore();}
 return {root:d.root,directory:path.join(d.root,'aggregate-dream'),connectionDirectory:d.connectionDirectory,history:{failedEnvelopeTrialDirectory:d.directory,...d.history}};
}
