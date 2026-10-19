import {observeNativeCodexRefusalContinuation,rehearseCodexRefusalContinuation} from './codex-interaction-refusal.mjs';
try{
 const args=process.argv.slice(2);let report;
 if(args.length===0)report=await rehearseCodexRefusalContinuation();
 else if(args.length===2&&args[0]==='--native-executable')report=await observeNativeCodexRefusalContinuation(args[1]);
 else throw Error();
 console.log(JSON.stringify(report,null,2));if(report.status!=='selected_refusal_observed')process.exitCode=1;
}catch{
 console.log(JSON.stringify({status:'blocked',reason:'refusal_continuation_arguments_invalid',dispatchEnabled:false,accountAuthorizationRequested:false,rawErrorReturned:false}));process.exitCode=1;
}
