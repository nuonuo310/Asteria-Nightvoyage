import {rehearseCodeModeGuard} from '../test-support/code-mode-guard-rehearsal.mjs';
try{
 if(process.argv.length!==2)throw Error('arguments_rejected');
 console.log(JSON.stringify({command:'node scripts/check-codex-code-mode-guard.mjs',node:process.version,platform:process.platform,...await rehearseCodeModeGuard()},null,2));
}catch{
 console.log(JSON.stringify({status:'blocked',dispatchEnabled:false,productionAdmission:false,realModelRequests:0}));process.exitCode=1;
}
