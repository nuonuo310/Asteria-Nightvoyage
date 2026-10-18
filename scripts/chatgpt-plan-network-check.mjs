// Credential-free public discovery check. No Store, browser, auth or model request.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {planDiscovery} from './chatgpt-plan-auth.mjs';
import {planHttpJson,validatePlanDiscovery,planHttpDiagnostic,loginDiagnostic} from './chatgpt-plan-login.mjs';
export async function checkPlanDiscoveryConnection({signal}={}){
 let stage='discovery_http',status=null;
 try{
  const value=await planHttpJson(planDiscovery,{},signal);status=200;stage='discovery_validation';validatePlanDiscovery(value);
  return {status:'discovery_checked',http_status:200,configurationValidated:true,loginAttempted:false,realModelRequests:0,credentialsRead:false};
 }catch(error){return {status:'discovery_not_checked',failureStage:stage,reason:loginDiagnostic(error),httpDiagnostic:planHttpDiagnostic(error)??{http_status:status,network_code:'unknown'},loginAttempted:false,realModelRequests:0,credentialsRead:false};}
}
export async function networkCheckMain(args){
 if(args.length){if(args.length===1&&args[0]==='help'){console.log('Usage: node scripts/chatgpt-plan-network-check.mjs\nPublic discovery only. No login, account, credentials, connection files or generation.');return;}throw Error('network_check_arguments_invalid');}
 const controller=new AbortController(),cancel=()=>controller.abort();process.once('SIGINT',cancel);process.once('SIGTERM',cancel);
 try{const result=await checkPlanDiscoveryConnection({signal:controller.signal});console.log(JSON.stringify(result,null,2));if(result.status!=='discovery_checked')process.exitCode=1;}
 finally{process.removeListener('SIGINT',cancel);process.removeListener('SIGTERM',cancel);}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))networkCheckMain(process.argv.slice(2)).catch(()=>{console.error('Nightvoyage network check stopped: invalid arguments or local failure.');process.exitCode=1;});
