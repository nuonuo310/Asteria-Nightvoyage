// Independent synthetic missing-type, over-limit observation; not a user receipt.
import path from 'node:path';
import {envelopeProbeFixture,envelopeApproval} from './envelope-probe-fixtures.js';
import {initEnvelopeProbe,executeEnvelopeProbe} from '../scripts/plan-envelope-probe.mjs';
import {syntheticPlanHttp} from './plan-trial-fixtures.js';
export const prefixApproval=()=>({approveAdditionalSubscriptionRequest:true,allowFictionalEgress:true,acknowledgeConsumedDiagnostic:true,confirmNoExtraCredits:true,acknowledgeNoServerTokenCap:true});
export async function prefixProbeFixture(t){
 const d=await envelopeProbeFixture(t);initEnvelopeProbe(d.directory,d.priorDirectory,d.parentDirectory,envelopeApproval());const http=syntheticPlanHttp({onGenerate:()=>new Response(Buffer.alloc(8193,120))});http.install();try{const out=await executeEnvelopeProbe({...d,onReady:http.onReady});if(out.observation?.review.mediaClass!=='missing'||out.observation.readOutcome!=='byte_limit')throw Error('synthetic_prefix_antecedent_invalid');}finally{http.restore();}
 return {...d,envelopeDirectory:d.directory,directory:path.join(d.root,'prefix')};
}
