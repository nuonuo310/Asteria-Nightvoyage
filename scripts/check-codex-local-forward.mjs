import {rehearseLocalForward} from '../test-support/codex-local-forward-rehearsal.mjs';
try{
 if(process.argv.length!==2)throw Error();
 console.log(JSON.stringify({command:'node scripts/check-codex-local-forward.mjs',node:process.version,platform:process.platform,...await rehearseLocalForward()},null,2));
}catch{console.log(JSON.stringify({status:'blocked',dispatchEnabled:false,productionAdmission:false,rawErrorReturned:false}));process.exitCode=1;}
