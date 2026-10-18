import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {initPlanResponseProbe,preflightPlanResponseProbe,executePlanResponseProbe} from './chatgpt-plan-response-probe.mjs';
export async function planResponseProbeMain(args){
 const [command='help',...flags]=args;
 if(command==='help'&&!flags.length){console.log('GPT single response diagnostic: preflight | init --approve-one-subscription-call --allow-fictional-egress --acknowledge-prior-failed-trial --confirm-no-extra-credits --acknowledge-no-server-token-cap | run --live. Requires separate explicit user approval. One new scene call only; no bodies saved, wake, retry, provider switch, API key or extra credits.');return;}
 const expected=command==='init'?['--approve-one-subscription-call','--allow-fictional-egress','--acknowledge-prior-failed-trial','--confirm-no-extra-credits','--acknowledge-no-server-token-cap']:command==='run'?['--live']:[];
 if(!['init','preflight','run'].includes(command)||flags.length!==expected.length||new Set(flags).size!==flags.length||flags.some(f=>!expected.includes(f)))throw Error('probe_arguments_invalid');
 const base=process.platform==='win32'?process.env.LOCALAPPDATA:path.join(os.homedir(),'.local','share');if(!base||!path.isAbsolute(base))throw Error('probe_absolute_directory_required');
 const directory=path.join(base,'Nightvoyage','gpt-subscription-response-diagnostic-v1'),parentDirectory=path.join(base,'Nightvoyage','gpt-subscription-first-dream'),connectionDirectory=path.join(base,'Nightvoyage','chatgpt-plan-connection');
 if(command==='preflight'){console.log(JSON.stringify(preflightPlanResponseProbe(directory,parentDirectory),null,2));return;}
 if(command==='init'){console.log(JSON.stringify(initPlanResponseProbe(directory,parentDirectory,{approveOneSubscriptionCall:true,allowFictionalEgress:true,acknowledgePriorFailedTrial:true,confirmNoExtraCredits:true,acknowledgeNoServerTokenCap:true}),null,2));return;}
 const controller=new AbortController(),cancel=()=>controller.abort();process.once('SIGINT',cancel);process.once('SIGTERM',cancel);
 try{console.log('夜航 · 单次GPT订阅响应诊断。需要另行批准；只调用一次，不保存生成正文，不继续旧梦。');const out=await executePlanResponseProbe({directory,parentDirectory,connectionDirectory,signal:controller.signal,onReady:url=>console.log(`请打开本次本机授权链接；不要分享链接或回调：\n${url}`)});console.log(JSON.stringify(out,null,2));if(out.status!=='accepted')process.exitCode=1;}
 finally{process.removeListener('SIGINT',cancel);process.removeListener('SIGTERM',cancel);}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))planResponseProbeMain(process.argv.slice(2)).catch(error=>{const codes=['probe_arguments_invalid','probe_absolute_directory_required','probe_approval_required','probe_source_changed','probe_fixture_changed','probe_record_invalid','probe_prior_failed_trial_required','probe_parent_changed','probe_expired','source_withdrawn','foreign_execution_owner','store_busy','store_unavailable'];console.error(JSON.stringify({status:'probe_stopped',reason:codes.includes(error?.message)?error.message:'local_or_protocol_failure',automaticRetry:false}));process.exitCode=1;});
