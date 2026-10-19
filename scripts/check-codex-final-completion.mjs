import {observeNativeCodexFinalCompletion,rehearseCodexFinalCompletion} from './codex-interaction-refusal.mjs';
try{
 const args=process.argv.slice(2);
 let result;
 if(args.length===0)result=await rehearseCodexFinalCompletion();
 else if(args.length===2&&args[0]==='--native-executable')result=await observeNativeCodexFinalCompletion(args[1]);
 else throw Error();
 console.log(JSON.stringify(result,null,2));
 if(result.status!=='fixed_final_completion_observed')process.exitCode=1;
}catch{console.log(JSON.stringify({status:'blocked',reason:'final_completion_entry_rejected',dispatchEnabled:false,bodyReturned:false}));process.exitCode=1;}
