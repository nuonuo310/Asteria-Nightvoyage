// Fabricated history only; no user books or real authorization are accessed.
import path from 'node:path';
import {aggregateTrialFixture} from './aggregate-trial-fixtures.js';
import {initAggregateTrial,executeAggregateTrial} from '../scripts/aggregate-plan-trial.mjs';
import {syntheticPlanHttp} from './plan-trial-fixtures.js';
import {aggregateTranscript} from './offline-aggregate-fixtures.js';
export const eventClassApproval=()=>({approveOneSubscriptionCall:true,allowFictionalEgress:true,acknowledgePriorFailedTrial:true,confirmNoExtraCredits:true,acknowledgeNoServerTokenCap:true,approveMissingContentTypeCompatibility:true,approveReasoningDiscard:true,approveAggregateEventBudget:true});
export async function eventClassProbeFixture(t){
 const d=await aggregateTrialFixture(t);
 initAggregateTrial(d.directory,d.history,{approveFictionalSubscriptionTrial:true,confirmExtraCreditsDisabled:true,acknowledgeNoServerTokenCap:true,approveMissingContentTypeCompatibility:true,acknowledgeConsumedDiagnostics:true,approveReasoningDiscard:true,approveAggregateEventBudget:true});
 const http=syntheticPlanHttp({onGenerate:body=>new Response(Buffer.concat(aggregateTranscript({body},undefined,events=>events.splice(0,0,{type:'synthetic.unreviewed',secret:'SYNTHETIC-DISCARDED-PREDECESSOR'}))))});http.install();
 try{const out=await executeAggregateTrial({...d,onReady:http.onReady});if(out.receipt.validation_diagnostic?.check!=='unknown_event'||out.receipt.external_calls_started!==1||out.receipt.checkpoint.saved_scenes!==0||out.receipt.remoteRevocationConfirmed!==true)throw Error('synthetic_unknown_antecedent_invalid');}finally{http.restore();}
 return {root:d.root,directory:path.join(d.root,'event-class-probe'),connectionDirectory:d.connectionDirectory,history:{failedAggregateTrialDirectory:d.directory,...d.history}};
}
