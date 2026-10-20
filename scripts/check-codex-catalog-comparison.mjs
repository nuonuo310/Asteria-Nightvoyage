import {codexCatalogCaseIds} from './codex-catalog-comparison.mjs';
import {observeNativeCodexCatalogCase,rehearseCodexCatalogCase} from './codex-catalog-comparison-owner.mjs';
try{
 const args=process.argv.slice(2);
 if(args.length!==0&&!(args.length===2&&args[0]==='--native-executable'))throw Error();
 const native=args.length===2,reports=[];
 for(const caseId of codexCatalogCaseIds){
  const report=native?await observeNativeCodexCatalogCase(args[1],caseId):await rehearseCodexCatalogCase(caseId);
  reports.push(report);if(report.status!=='request_observed')break;
 }
 const completed=reports.length===codexCatalogCaseIds.length&&reports.every(r=>r.status==='request_observed');
 console.log(JSON.stringify({command:'node scripts/check-codex-catalog-comparison.mjs',node:process.version,platform:process.platform,
  status:completed?'comparison_observed':'blocked',kind:native?'native':'independent_node_peer',
  plannedCases:codexCatalogCaseIds.length,observedCases:reports.filter(r=>r.status==='request_observed').length,
  fictionalCataloguesOnly:true,realModelMetadataCompared:false,realModelRequests:0,credentialReads:0,
  accountAuthorizationRequested:false,generatedResponseSupplied:false,productionAdmission:false,
  peerToolsAreScripted:!native,automaticRetry:false,dispatchEnabled:false,reports},null,2));
 if(!completed)process.exitCode=1;
}catch{console.log(JSON.stringify({status:'blocked',reason:'catalog_comparison_arguments_invalid',dispatchEnabled:false,accountAuthorizationRequested:false,rawErrorReturned:false}));process.exitCode=1;}
