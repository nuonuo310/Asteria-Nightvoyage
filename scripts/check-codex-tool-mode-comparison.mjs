import {codexToolModeCaseIds} from './codex-tool-mode-comparison.mjs';
import {observeNativeCodexToolModeCase,rehearseCodexToolModeCase} from './codex-tool-mode-comparison-owner.mjs';
try{
 const args=process.argv.slice(2);
 if(args.length!==0&&!(args.length===2&&args[0]==='--native-executable'))throw Error();
 const native=args.length===2,reports=[];
 for(const caseId of codexToolModeCaseIds){
  const report=native?await observeNativeCodexToolModeCase(args[1],caseId):await rehearseCodexToolModeCase(caseId);
  reports.push(report);if(report.status!=='request_observed')break;
 }
 const completed=reports.length===codexToolModeCaseIds.length&&reports.every(r=>r.status==='request_observed');
 console.log(JSON.stringify({command:'node scripts/check-codex-tool-mode-comparison.mjs',node:process.version,platform:process.platform,
  status:completed?'comparison_observed':'blocked',kind:native?'native':'independent_node_peer',
  plannedCases:codexToolModeCaseIds.length,observedCases:reports.filter(r=>r.status==='request_observed').length,
  fictionalCataloguesOnly:true,realModelMetadataCompared:false,realModelRequests:0,credentialReads:0,
  accountAuthorizationRequested:false,generatedResponseSupplied:false,productionAdmission:false,
  peerToolsAreScripted:!native,automaticRetry:false,dispatchEnabled:false,reports},null,2));
 if(!completed)process.exitCode=1;
}catch{console.log(JSON.stringify({status:'blocked',reason:'tool_mode_comparison_arguments_invalid',dispatchEnabled:false,accountAuthorizationRequested:false,rawErrorReturned:false}));process.exitCode=1;}
