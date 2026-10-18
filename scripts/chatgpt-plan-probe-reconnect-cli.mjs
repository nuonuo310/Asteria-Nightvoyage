import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {initProbeReconnect,preflightProbeReconnect,executeProbeReconnect} from './chatgpt-plan-probe-reconnect.mjs';
export async function reconnectMain(args){
 const [command='help',...flags]=args;
 if(command==='help'&&!flags.length){console.log('Explicit GPT zero-call reconnect: preflight | init --approve-zero-call-reconnect --allow-fictional-egress --confirm-one-call-limit --confirm-no-extra-credits --acknowledge-no-server-token-cap | run --live. Requires explicit user approval. Original failed record unchanged; one reconnect only; at most one generation call across both diagnostic records.');return;}
 const expected=command==='init'?['--approve-zero-call-reconnect','--allow-fictional-egress','--confirm-one-call-limit','--confirm-no-extra-credits','--acknowledge-no-server-token-cap']:command==='run'?['--live']:[];
 if(!['init','preflight','run'].includes(command)||flags.length!==expected.length||new Set(flags).size!==flags.length||flags.some(f=>!expected.includes(f)))throw Error('reconnect_arguments_invalid');
 const base=process.platform==='win32'?process.env.LOCALAPPDATA:path.join(os.homedir(),'.local','share');if(!base||!path.isAbsolute(base))throw Error('reconnect_absolute_directory_required');const directory=path.join(base,'Nightvoyage','gpt-subscription-response-diagnostic-v1'),parentDirectory=path.join(base,'Nightvoyage','gpt-subscription-first-dream'),connectionDirectory=path.join(base,'Nightvoyage','chatgpt-plan-connection');
 if(command==='preflight'){console.log(JSON.stringify(preflightProbeReconnect(directory,parentDirectory),null,2));return;}
 if(command==='init'){console.log(JSON.stringify(initProbeReconnect(directory,parentDirectory,{approveZeroCallReconnect:true,allowFictionalEgress:true,confirmOneCallLimit:true,confirmNoExtraCredits:true,acknowledgeNoServerTokenCap:true}),null,2));return;}
 const controller=new AbortController(),cancel=()=>controller.abort();process.once('SIGINT',cancel);process.once('SIGTERM',cancel);
 try{console.log('夜航 · 显式接续零调用失败。先公开网络预检；需要重新登录；两条诊断记录累计最多一次生成，不自动重试。');const out=await executeProbeReconnect({directory,parentDirectory,connectionDirectory,signal:controller.signal,onReady:url=>console.log(`请打开本次本机授权链接；不要分享链接或回调：\n${url}`)});console.log(JSON.stringify(out,null,2));if(out.status!=='accepted')process.exitCode=1;}
 finally{process.removeListener('SIGINT',cancel);process.removeListener('SIGTERM',cancel);}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))reconnectMain(process.argv.slice(2)).catch(error=>{const known=['reconnect_arguments_invalid','reconnect_absolute_directory_required','reconnect_source_changed','reconnect_fixture_changed','reconnect_zero_call_failure_required','reconnect_parent_changed','reconnect_approval_required','reconnect_record_invalid','reconnect_expired','source_withdrawn','foreign_execution_owner','store_busy','store_unavailable','storage_io_failure'];console.error(JSON.stringify({status:'reconnect_stopped',reason:known.includes(error?.message)?error.message:'local_or_protocol_failure',automaticRetry:false}));process.exitCode=1;});
