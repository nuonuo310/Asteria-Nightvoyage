// Explicit local entry for the fixed ChatGPT subscription admission candidate.
// Help/preflight never read credentials; init persists a fresh one-run approval only.
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {initPlanTransportAdmission,preflightPlanTransportAdmission,executePlanTransportAdmission} from './plan-transport-admission-trial.mjs';
export async function planTransportAdmissionMain(args){
  const [command='help',...flags]=args;
  if(command==='help'&&!flags.length){
    console.log('Nightvoyage plan transport admission: preflight | init --approve-fictional-subscription-trial --confirm-extra-credits-disabled --acknowledge-no-server-token-cap --approve-missing-content-type-compatibility --approve-reasoning-discard --approve-aggregate-stream-budget --acknowledge-independent-version --confirm-no-fallback-or-codex | run --live. Fixed ChatGPTPlanAdapter/openai/chatgpt_plan/gpt-5.6-sol; one fictional dream, two scenes and one wake, at most three calls. No retry, Codex route, API-key fallback or extra credits. The proposal is awaiting fresh approval; preflight creates no permit.');
    return;
  }
  if(!['preflight','init','run'].includes(command))throw Error('trial_arguments_invalid');
  const expected=command==='init'?['--approve-fictional-subscription-trial','--confirm-extra-credits-disabled','--acknowledge-no-server-token-cap','--approve-missing-content-type-compatibility','--approve-reasoning-discard','--approve-aggregate-stream-budget','--acknowledge-independent-version','--confirm-no-fallback-or-codex']:command==='run'?['--live']:[];
  if(flags.length!==expected.length||new Set(flags).size!==flags.length||flags.some(f=>!expected.includes(f)))throw Error('trial_arguments_invalid');
  const base=process.platform==='win32'?process.env.LOCALAPPDATA:path.join(os.homedir(),'.local','share');
  if(!base||!path.isAbsolute(base))throw Error('absolute_trial_directory_required');
  const directory=path.join(base,'Nightvoyage','gpt-subscription-plan-transport-admission-v1'),connectionDirectory=path.join(base,'Nightvoyage','chatgpt-plan-connection');
  if(command==='preflight'){console.log(JSON.stringify(preflightPlanTransportAdmission(directory),null,2));return;}
  if(command==='init'){
    console.log(JSON.stringify(initPlanTransportAdmission(directory,{approveFictionalSubscriptionTrial:true,confirmExtraCreditsDisabled:true,acknowledgeNoServerTokenCap:true,approveMissingContentTypeCompatibility:true,approveReasoningDiscard:true,approveAggregateStreamBudget:true,acknowledgeIndependentVersion:true,confirmNoFallbackOrCodex:true}),null,2));return;
  }
  const controller=new AbortController(),cancel=()=>controller.abort();process.once('SIGINT',cancel);process.once('SIGTERM',cancel);
  try{
    console.log('Nightvoyage fresh ChatGPT-plan admission. Fixed gpt-5.6-sol; two fictional scenes and one wake; no retry, Codex route, paid API fallback or extra credits. Open only the local loopback authorization link printed here; do not share it.');
    const result=await executePlanTransportAdmission({directory,connectionDirectory,signal:controller.signal,onReady:url=>console.log(`Local loopback authorization link (do not share):\n${url}`)});
    console.log(JSON.stringify(result,null,2));if(result.receipt.status!=='completed')process.exitCode=1;
  }finally{process.removeListener('SIGINT',cancel);process.removeListener('SIGTERM',cancel);}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))planTransportAdmissionMain(process.argv.slice(2)).catch(error=>{
  const known=['trial_arguments_invalid','absolute_trial_directory_required','trial_approval_required','trial_approval_invalid','trial_source_pins_changed','trial_fixture_changed','trial_expired','trial_record_invalid','source_withdrawn','foreign_execution_owner','cancelled','store_busy','store_unavailable','storage_io_failure','unsafe_storage_file'];
  console.error(JSON.stringify({status:'trial_stopped',reason:known.includes(error?.message)?error.message:'local_or_protocol_failure',automaticRetry:false}));process.exitCode=1;
});
