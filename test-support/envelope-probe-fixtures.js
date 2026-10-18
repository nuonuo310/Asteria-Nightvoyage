// Independent synthetic consumed type rejection. Does not adopt a user receipt.
import path from 'node:path';
import {zeroCallProbeFixture,reconnectApproval} from './zero-call-probe-fixtures.js';
import {initProbeReconnect,executeProbeReconnect} from '../scripts/chatgpt-plan-probe-reconnect.mjs';
import {syntheticPlanHttp} from './plan-trial-fixtures.js';
export const envelopeApproval=()=>({approveAdditionalSubscriptionRequest:true,allowFictionalEgress:true,acknowledgeConsumedDiagnostic:true,confirmNoExtraCredits:true,acknowledgeNoServerTokenCap:true});
export async function envelopeProbeFixture(t){
 const d=await zeroCallProbeFixture(t);initProbeReconnect(d.directory,d.parentDirectory,reconnectApproval());const http=syntheticPlanHttp({onGenerate:()=>new Response('PRIVATE-SYNTHETIC-TYPE-REJECTION',{headers:{'Content-Type':'application/json'}})});http.install();try{await executeProbeReconnect({...d,onReady:http.onReady});}finally{http.restore();}
 return {...d,priorDirectory:d.directory,directory:path.join(d.root,'envelope')};
}
