import {rehearseCodexPlanCredentialOwner} from './codex-plan-credential-rehearsal.mjs';
if(process.argv.length!==2){console.error('credential_rehearsal_arguments_invalid');process.exitCode=1;}
else{
 const results=[];
 for(const scenario of ['success','timeout','cancel','late_response','failed_spawn','failed_child','secret_output'])results.push(await rehearseCodexPlanCredentialOwner({scenario,timeoutMs:scenario==='timeout'?100:5000}));
 const passed=results.every(r=>r.ownedChildClosed&&r.closedBeforeLeaseDisposal&&!r.leaseActive&&r.secretReferenceDisposed&&!r.parentEnvironmentAssigned&&r.finalReplyAccepted===(r.scenario==='success'));
 console.log(JSON.stringify({command:'node scripts/check-codex-plan-credential-owner.mjs',node:process.version,platform:process.platform,status:passed?'passed':'failed',independentCases:results.length,realModelRequests:0,credentialReads:0,nativeCodexProcessStarted:false,results},null,2));
 if(!passed)process.exitCode=1;
}
