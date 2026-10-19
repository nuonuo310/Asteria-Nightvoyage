import {observeNativeCodexRequestWithFictionalCatalog,rehearseCodexRequestWithFictionalCatalog} from './codex-request-observer.mjs';
try{
 const args=process.argv.slice(2);let report;
 if(args.length===0)report=await rehearseCodexRequestWithFictionalCatalog();
 else if(args.length===2&&args[0]==='--native-executable')report=await observeNativeCodexRequestWithFictionalCatalog(args[1]);
 else throw Error();
 console.log(JSON.stringify(report,null,2));if(report.status!=='request_observed')process.exitCode=1;
}catch{
 console.log(JSON.stringify({status:'blocked',reason:'fictional_catalog_observer_arguments_invalid',dispatchEnabled:false,accountAuthorizationRequested:false,rawErrorReturned:false}));process.exitCode=1;
}
