import {rehearseCodexPlanCredentialOwner} from './codex-plan-credential-rehearsal.mjs';
import {credentialRehearsalScenarios,validateCredentialRehearsalResult} from './codex-credential-rehearsal-policy.mjs';
if(process.argv.length!==2){console.error('credential_rehearsal_arguments_invalid');process.exitCode=1;}
else{
 const results=[];
 for(const scenario of credentialRehearsalScenarios)results.push(await rehearseCodexPlanCredentialOwner({scenario,timeoutMs:scenario==='timeout'?100:5000}));
 const passed=results.length===credentialRehearsalScenarios.length&&results.every((result,index)=>result.scenario===credentialRehearsalScenarios[index]&&validateCredentialRehearsalResult(result));
 console.log(JSON.stringify({command:'node scripts/check-codex-plan-credential-owner.mjs',node:process.version,platform:process.platform,status:passed?'passed':'failed',independentCases:results.length,exactOutcomes:true,realModelRequests:0,credentialReads:0,nativeCodexProcessStarted:false,results},null,2));
 if(!passed)process.exitCode=1;
}
