import {inspectNativeCodexMetadata,rehearseCodexNativeMetadata} from './codex-native-metadata.mjs';
try{
 const args=process.argv.slice(2);let report;
 if(args.length===0)report=await rehearseCodexNativeMetadata();
 else if(args.length===2&&args[0]==='--native-executable')report=await inspectNativeCodexMetadata(args[1]);
 else throw Error('metadata_arguments_invalid');
 console.log(JSON.stringify(report,null,2));
 if(report.status!=='metadata_prepared')process.exitCode=1;
}catch{
 console.log(JSON.stringify({status:'blocked',reason:'metadata_arguments_or_environment_invalid',dispatchEnabled:false,accountAuthorizationRequested:false,appServerTurnsRequested:0,rawErrorReturned:false}));process.exitCode=1;
}
