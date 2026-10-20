import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {initPlanCatalogFieldsReview,preflightPlanCatalogFieldsReview,executePlanCatalogFieldsReview} from './plan-catalog-fields-review.mjs';
export async function planCatalogFieldsReviewMain(args){
 const [command='help',...flags]=args;
 if(command==='help'&&!flags.length){console.log('Catalogue-only review: preflight | init --approve-catalog-login --acknowledge-no-inference --acknowledge-prior-review-not-recoverable | run --login. Fresh explicit user confirmation required. At most one login and two authenticated model-catalogue GETs total; no model POST, native Codex, dream, API key, extra credits or automatic retry.');return;}
 const expected=command==='init'?['--approve-catalog-login','--acknowledge-no-inference','--acknowledge-prior-review-not-recoverable']:command==='run'?['--login']:command==='preflight'?[]:null;
 if(!expected||flags.length!==expected.length||new Set(flags).size!==flags.length||expected.some(x=>!flags.includes(x)))throw Error('catalog_arguments_invalid');
 const root=process.platform==='win32'?path.join(process.env.LOCALAPPDATA??'', 'Nightvoyage'):path.join(os.homedir(),'.local','share','Nightvoyage');
 if(!path.isAbsolute(root))throw Error('catalog_absolute_directory_required');
 const directory=path.join(root,'codex-plan-catalog-fields-review-v1'),connectionDirectory=path.join(root,'chatgpt-plan-connection');
 if(command==='init'){console.log(JSON.stringify(initPlanCatalogFieldsReview(directory,{approveCatalogLogin:true,acknowledgeNoInference:true,acknowledgePriorReviewNotRecoverable:true}),null,2));return;}
 if(command==='preflight'){console.log(JSON.stringify(preflightPlanCatalogFieldsReview(directory),null,2));return;}
 const controller=new AbortController(),cancel=()=>controller.abort();process.once('SIGINT',cancel);process.once('SIGTERM',cancel);
 try{console.log('夜航 · 独立型号字段核对。旧原值无法恢复，本次为新观察。需要新的登录批准；不启动Codex、不请求推理、不批准额外积分。不分享登录链接或回调。');const result=await executePlanCatalogFieldsReview({directory,connectionDirectory,signal:controller.signal,onReady:url=>console.log(`请在浏览器打开本次本机授权链接：\n${url}`)});console.log(JSON.stringify(result,null,2));if(result.status!=='observed')process.exitCode=1;}
 finally{process.removeListener('SIGINT',cancel);process.removeListener('SIGTERM',cancel);}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))planCatalogFieldsReviewMain(process.argv.slice(2)).catch(error=>{const codes=['catalog_arguments_invalid','catalog_absolute_directory_required','catalog_approval_required','catalog_approval_expired','catalog_source_changed','catalog_record_invalid','foreign_execution_owner','store_busy'];console.error(JSON.stringify({status:'catalog_review_stopped',reason:codes.includes(error?.message)?error.message:'local_or_authorization_failure',automaticRetry:false,realModelRequests:0}));process.exitCode=1;});
