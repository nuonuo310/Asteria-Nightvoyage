// Independent fictional predecessor chain; never records actual user permission.
import path from 'node:path';
import {eventClassProbeFixture,eventClassApproval} from './event-class-probe-fixtures.js';
import {initEventClassProbe,executeEventClassProbe} from '../scripts/event-class-probe.mjs';
import {syntheticPlanHttp} from './plan-trial-fixtures.js';
export const eventWitnessApproval=()=>({...eventClassApproval(),approveClosedEventWitness:true});
export async function eventWitnessProbeFixture(t){
 const d=await eventClassProbeFixture(t);initEventClassProbe(d.directory,d.history,eventClassApproval());
 const http=syntheticPlanHttp({onGenerate:()=>new Response(Buffer.from('data:{"type":"synthetic.unreviewed","secret":"SYNTHETIC-PRIVATE"}\n\n'))});http.install();
 try{const out=await executeEventClassProbe({...d,onReady:http.onReady});if(out.validation_diagnostic?.check!=='unreviewed_event'||out.external_calls_started!==1||out.remoteRevocationConfirmed!==true||out.authorization?.status!=='plan_action_finished')throw Error('synthetic_unreviewed_antecedent_invalid');}finally{http.restore();}
 return {root:d.root,directory:path.join(d.root,'event-witness-probe'),connectionDirectory:d.connectionDirectory,history:{consumedDiagnosticDirectory:d.directory,...d.history}};
}
