// Fresh independent observation only; no resume, old-root recovery, login or real model.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {observeNativeCodexEofWait,rehearseCodexEofWait} from './codex-persistent-wait-owner.mjs';
function summary(r){
 const a=r.localForwardAccounting,t=r.retainedAllowance;
 return {contractVersion:r.contractVersion,status:r.status,reason:r.reason,requestedModel:r.requestedModel??'unknown',
  processStarted:r.processStarted,ownedProcessClosed:r.ownedProcessClosed??'not_observed',ownedShutdown:r.ownedShutdown??null,
  temporaryCleanupComplete:r.temporaryCleanupComplete??'not_observed',cleanupReview:r.cleanupReview??null,
  selectedWaitDisabledHostObserved:r.selectedWaitObservation?.selectedWaitDisabledHostObserved??'not_observed',
  localAccounting:a?{forwardedLocalRequests:a.forwardedLocalRequests,intentsCheckedBeforeFixtureArrival:a.intentsCheckedBeforeFixtureArrival,
   journalPhase:a.journal.phase,journalCalls:a.journal.calls,nativeAppServerClient:a.nativeAppServerClient,independentPeerClient:a.independentPeerClient,
   logicalTrialScope:a.logicalTrialScope,failed:a.failed,closed:a.closed}:null,
  retainedAllowance:t?{identity:t.identity,identity_hash:t.identity_hash,phase:t.phase,last_clock:t.last_clock,calls:t.calls,closed:t.closed,persistenceFailed:t.persistenceFailed,ambiguousDispatch:t.ambiguousDispatch}:null,
  retainedAllowancePresent:r.retainedAllowancePresent,retainedAllowanceClosed:r.retainedAllowanceClosed,retainedRelayPresent:r.retainedRelayPresent??'not_observed',
  nativePersistentFixtureIntegrated:r.nativePersistentFixtureIntegrated??false,retainedPathReturned:false,realProviderAccountingIntegrated:false,
  windowsBusyCauseProven:false,descendantTerminationConfirmed:'unknown'};
}
let fixtureRoot;const originalClock=Date.now;
try{
 const args=process.argv.slice(2),native=args.length===4&&args[0]==='--native-executable'&&args[2]==='--state-directory';
 if(args.length!==0&&!native)throw Error();
 // Only the no-argument independent rehearsal has a synthetic clock, never native mode.
 if(!native)Date.now=()=>Date.parse('2026-10-20T12:00:00.000Z');
 const directory=native?args[3]:(fixtureRoot=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-eof-wait-rehearsal-')));
 const report=native?await observeNativeCodexEofWait(args[1],{stateDirectory:directory}):await rehearseCodexEofWait('observed',{stateDirectory:directory});
 const normalEof=report.ownedShutdown?.gracefulZeroExitObserved===true;
 const accepted=normalEof&&report.status==='selected_wait_denial_observed'&&report.ownedProcessClosed&&report.temporaryCleanupComplete&&report.retainedAllowancePresent&&report.retainedRelayPresent&&report.retainedAllowanceClosed&&report.retainedAllowance?.phase==='completed';
 console.log(JSON.stringify({command:'node scripts/check-codex-eof-wait.mjs',node:process.version,platform:process.platform,status:accepted?'eof_wait_cleanup_observed':'blocked',reason:accepted?null:report.reason??'normal_eof_not_verified',kind:native?'native':'independent_node_peer',maximumOwnedChildren:1,maximumLocalPostsAccepted:2,fixtureClockAppliesOnlyToRehearsal:!native,fixtureIsScripted:true,peerDenialIsScripted:!native,priorTrialContinued:false,oldRootRecoveryAttempted:false,realModelRequests:0,credentialReads:0,accountAuthorizationRequested:false,realUserApprovalRecorded:false,automaticRetry:false,productionAdmission:false,dispatchEnabled:false,report:summary(report)},null,2));
 if(!accepted)process.exitCode=1;
}catch{console.log(JSON.stringify({status:'blocked',reason:'eof_wait_arguments_invalid',dispatchEnabled:false,rawErrorReturned:false}));process.exitCode=1;}
finally{Date.now=originalClock;if(fixtureRoot)fs.rmSync(fixtureRoot,{recursive:true,force:true});}
