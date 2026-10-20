import {observeNativeCodexGuardWait,rehearseCodexGuardWait} from './codex-code-mode-wait-owner.mjs';
try{
 const args=process.argv.slice(2);if(args.length!==0&&!(args.length===2&&args[0]==='--native-executable'))throw Error();
 const native=args.length===2,report=native?await observeNativeCodexGuardWait(args[1]):await rehearseCodexGuardWait();
 const observed=report.status==='selected_wait_denial_observed'&&report.ownedProcessClosed&&report.temporaryCleanupComplete;
 console.log(JSON.stringify({command:'node scripts/check-codex-guarded-wait.mjs',node:process.version,platform:process.platform,
  status:observed?'selected_wait_denial_observed':'blocked',kind:native?'native':'independent_node_peer',
  fixedCase:'fictional_wait_only',maximumOwnedChildren:1,maximumLocalPostsAccepted:2,
  fixtureIsScripted:true,peerDenialIsScripted:!native,realModelRequests:0,credentialReads:0,
  accountAuthorizationRequested:false,automaticRetry:false,productionAdmission:false,dispatchEnabled:false,report},null,2));
 if(!observed)process.exitCode=1;
}catch{
 console.log(JSON.stringify({status:'blocked',reason:'guard_wait_arguments_invalid',dispatchEnabled:false,accountAuthorizationRequested:false,rawErrorReturned:false}));process.exitCode=1;
}
