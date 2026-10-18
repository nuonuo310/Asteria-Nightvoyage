// Explicit local subscription entry. No inference without persisted exact approval.
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {initEnvelopeTrial,preflightEnvelopeTrial,executeEnvelopeTrial} from './envelope-plan-trial.mjs';
export async function envelopeTrialMain(args){
  const [command='help',...flags]=args;
  if(command==='help'&&!flags.length){console.log('Nightvoyage GPT subscription trial: preflight | init --approve-fictional-subscription-trial --confirm-extra-credits-disabled --acknowledge-no-server-token-cap --approve-missing-content-type-compatibility --acknowledge-consumed-diagnostics --approve-reasoning-discard | run --live. Fixed gpt-5.6-sol, one fictional dream, at most three calls, no retry/fallback. Init requires prior user consent and ChatGPT Settings extra-credit use disabled; this assertion is not remotely verified. No server token cap; local byte/time caps do not guarantee remote usage. No API key or additional RMB budget.');return;}
  if(!['preflight','init','run'].includes(command))throw Error('trial_arguments_invalid');
  const expected=command==='init'?['--approve-fictional-subscription-trial','--confirm-extra-credits-disabled','--acknowledge-no-server-token-cap','--approve-missing-content-type-compatibility','--acknowledge-consumed-diagnostics','--approve-reasoning-discard']:command==='run'?['--live']:[];
  if(flags.length!==expected.length||new Set(flags).size!==flags.length||flags.some(f=>!expected.includes(f)))throw Error('trial_arguments_invalid');
  const base=process.platform==='win32'?process.env.LOCALAPPDATA:path.join(os.homedir(),'.local','share');
  if(!base||!path.isAbsolute(base))throw Error('absolute_trial_directory_required');
  const history={failedTrialDirectory:path.join(base,'Nightvoyage','gpt-subscription-missing-type-dream-v1'),prefixDirectory:path.join(base,'Nightvoyage','gpt-subscription-prefix-diagnostic-v1'),envelopeDirectory:path.join(base,'Nightvoyage','gpt-subscription-envelope-diagnostic-v1'),priorDirectory:path.join(base,'Nightvoyage','gpt-subscription-response-diagnostic-v1'),parentDirectory:path.join(base,'Nightvoyage','gpt-subscription-first-dream')};
  const directory=path.join(base,'Nightvoyage','gpt-subscription-validated-envelope-dream-v1'),connectionDirectory=path.join(base,'Nightvoyage','chatgpt-plan-connection');
  if(command==='preflight'){console.log(JSON.stringify(preflightEnvelopeTrial(directory,history),null,2));return;}
  if(command==='init'){console.log(JSON.stringify(initEnvelopeTrial(directory,history,{approveFictionalSubscriptionTrial:true,confirmExtraCreditsDisabled:true,acknowledgeNoServerTokenCap:true,approveMissingContentTypeCompatibility:true,acknowledgeConsumedDiagnostics:true,approveReasoningDiscard:true}),null,2));return;}
  const controller=new AbortController(),cancel=()=>controller.abort();process.once('SIGINT',cancel);process.once('SIGTERM',cancel);
  try{
    console.log('夜航 · GPT订阅完整封装试跑。固定GPT-5.6-Sol，最多两幕加一次醒来；不自动重试或切换，不批准额外积分。需要新的试跑批准；完整校验流后仅提取最终答案，推理内容不保存；旧失败梦和许可不复用。');
    const result=await executeEnvelopeTrial({directory,history,connectionDirectory,signal:controller.signal,onReady:url=>console.log(`请在浏览器打开本次本机授权链接；不要分享链接或回调：\n${url}`)});
    console.log(JSON.stringify(result,null,2));if(result.receipt.status!=='completed')process.exitCode=1;
  }finally{process.removeListener('SIGINT',cancel);process.removeListener('SIGTERM',cancel);}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))envelopeTrialMain(process.argv.slice(2)).catch(error=>{const known=['trial_arguments_invalid','absolute_trial_directory_required','trial_approval_required','trial_approval_invalid','trial_source_pins_changed','trial_fixture_changed','trial_expired','trial_record_invalid','trial_consumed_shape_failure_required','source_withdrawn','foreign_execution_owner','cancelled','store_busy','store_unavailable','storage_io_failure','unsafe_storage_file'];console.error(JSON.stringify({status:'trial_stopped',reason:known.includes(error?.message)?error.message:'local_or_protocol_failure',automaticRetry:false}));process.exitCode=1;});
