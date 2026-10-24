// Explicit post-freeze local subscription entry. No inference without persisted exact approval.
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {initPostfreezePlanTrial,preflightPostfreezePlanTrial,executePostfreezePlanTrial} from './postfreeze-plan-trial.mjs';

export async function postfreezePlanTrialMain(args){
  const [command='help',...flags]=args;
  if(command==='help'&&!flags.length){
    console.log('Nightvoyage post-freeze GPT plan fictional trial: preflight | init --approve-fictional-subscription-trial --confirm-extra-credits-disabled --acknowledge-no-server-token-cap | run --live. Fixed gpt-5.6-sol, one fictional dream, at most three stage calls, no retry or fallback. Init requires prior user consent and ChatGPT Settings extra-credit use disabled; this assertion is not remotely verified. No server token cap; local byte and time caps do not guarantee remote usage. No API key or additional RMB budget.');
    return;
  }
  if(!['preflight','init','run'].includes(command))throw Error('trial_arguments_invalid');
  const expected=command==='init'?['--approve-fictional-subscription-trial','--confirm-extra-credits-disabled','--acknowledge-no-server-token-cap']:command==='run'?['--live']:[];
  if(flags.length!==expected.length||new Set(flags).size!==flags.length||flags.some(f=>!expected.includes(f)))throw Error('trial_arguments_invalid');
  const base=process.platform==='win32'?process.env.LOCALAPPDATA:path.join(os.homedir(),'.local','share');
  if(!base||!path.isAbsolute(base))throw Error('absolute_trial_directory_required');
  const directory=path.join(base,'Nightvoyage','gpt-subscription-postfreeze-dream-v1');
  const connectionDirectory=path.join(base,'Nightvoyage','chatgpt-plan-postfreeze-connection');
  if(command==='preflight'){
    console.log(JSON.stringify(preflightPostfreezePlanTrial(directory),null,2));
    return;
  }
  if(command==='init'){
    console.log(JSON.stringify(initPostfreezePlanTrial(directory,{approveFictionalSubscriptionTrial:true,confirmExtraCreditsDisabled:true,acknowledgeNoServerTokenCap:true}),null,2));
    return;
  }
  const controller=new AbortController(),cancel=()=>controller.abort();
  process.once('SIGINT',cancel);process.once('SIGTERM',cancel);
  try{
    console.log('Nightvoyage post-freeze GPT plan fictional trial. Fixed gpt-5.6-sol; at most two scenes and one wake; no automatic retry, model switch or paid API. A fresh user approval is required before the first real call.');
    const result=await executePostfreezePlanTrial({directory,connectionDirectory,signal:controller.signal,onReady:url=>console.log(`Open this one-use local authorization link in a browser; do not share the link or callback:\n${url}`)});
    console.log(JSON.stringify(result,null,2));
    if(result.receipt.status!=='completed')process.exitCode=1;
  }finally{
    process.removeListener('SIGINT',cancel);process.removeListener('SIGTERM',cancel);
  }
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  postfreezePlanTrialMain(process.argv.slice(2)).catch(error=>{
    const known=['trial_arguments_invalid','absolute_trial_directory_required','trial_approval_required','trial_approval_invalid','trial_source_pins_changed','trial_fixture_changed','trial_expired','trial_record_invalid','source_withdrawn','foreign_execution_owner','cancelled','store_busy','store_unavailable','storage_io_failure','unsafe_storage_file'];
    console.error(JSON.stringify({status:'trial_stopped',reason:known.includes(error?.message)?error.message:'local_or_protocol_failure',automaticRetry:false}));
    process.exitCode=1;
  });
}
