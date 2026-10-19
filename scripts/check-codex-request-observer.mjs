import {observeNativeCodexRequest,rehearseCodexRequestObserver} from './codex-request-observer.mjs';
try{
 const args=process.argv.slice(2);let report;
 if(args.length===0)report=await rehearseCodexRequestObserver();
 else if(args.length===2&&args[0]==='--native-executable')report=await observeNativeCodexRequest(args[1]);
 else throw Error();
 console.log(JSON.stringify(report,null,2));if(report.status!=='request_observed')process.exitCode=1;
}catch{
 console.log(JSON.stringify({status:'blocked',reason:'observer_arguments_or_environment_invalid',dispatchEnabled:false,accountAuthorizationRequested:false,rawErrorReturned:false}));process.exitCode=1;
}
