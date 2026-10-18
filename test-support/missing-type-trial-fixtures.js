// Independent synthetic SSE-like prefix receipt; never adopts user runtime state.
import path from 'node:path';
import {prefixProbeFixture,prefixApproval} from './prefix-probe-fixtures.js';
import {initPrefixProbe,executePrefixProbe} from '../scripts/plan-prefix-probe.mjs';
import {syntheticPlanHttp} from './plan-trial-fixtures.js';
export async function missingTypeTrialFixture(t){
 const d=await prefixProbeFixture(t);initPrefixProbe(d.directory,d.envelopeDirectory,d.priorDirectory,d.parentDirectory,prefixApproval());const http=syntheticPlanHttp({onGenerate:()=>new Response(Buffer.from('data: '+'x'.repeat(9000)))});http.install();try{const out=await executePrefixProbe({...d,onReady:http.onReady});if(out.observation?.prefix?.prefixShape!=='sse_like_prefix')throw Error('synthetic_trial_antecedent_invalid');}finally{http.restore();}
 return {root:d.root,directory:path.join(d.root,'missing-type-dream'),connectionDirectory:d.connectionDirectory,history:{prefixDirectory:d.directory,envelopeDirectory:d.envelopeDirectory,priorDirectory:d.priorDirectory,parentDirectory:d.parentDirectory}};
}
