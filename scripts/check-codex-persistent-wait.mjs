import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {observeNativeCodexPersistentWait,rehearseCodexPersistentWait} from './codex-persistent-wait-owner.mjs';
let fixtureRoot;
try{
 const args=process.argv.slice(2),native=args.length===4&&args[0]==='--native-executable'&&args[2]==='--state-directory';
 if(args.length!==0&&!native)throw Error();
 const directory=native?args[3]:(fixtureRoot=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-persistent-wait-rehearsal-')));
 const report=native?await observeNativeCodexPersistentWait(args[1],{stateDirectory:directory}):await rehearseCodexPersistentWait('observed',{stateDirectory:directory});
 const observed=report.status==='selected_wait_denial_observed'&&report.ownedProcessClosed&&report.temporaryCleanupComplete&&report.retainedAllowancePresent&&report.retainedRelayPresent&&report.retainedAllowanceClosed&&report.retainedAllowance?.phase==='completed';
 console.log(JSON.stringify({command:'node scripts/check-codex-persistent-wait.mjs',node:process.version,platform:process.platform,status:observed?'persistent_wait_denial_observed':'blocked',kind:native?'native':'independent_node_peer',maximumOwnedChildren:1,maximumLocalPostsAccepted:2,fixtureIsScripted:true,peerDenialIsScripted:!native,realModelRequests:0,credentialReads:0,accountAuthorizationRequested:false,realUserApprovalRecorded:false,automaticRetry:false,productionAdmission:false,dispatchEnabled:false,report},null,2));
 if(!observed)process.exitCode=1;
}catch{console.log(JSON.stringify({status:'blocked',reason:'persistent_wait_arguments_invalid',dispatchEnabled:false,rawErrorReturned:false}));process.exitCode=1;}
finally{if(fixtureRoot)fs.rmSync(fixtureRoot,{recursive:true,force:true});}
