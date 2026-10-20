import {checkPersistentForward} from '../test-support/codex-persistent-forward-fixture.mjs';
if(process.argv.length!==2)throw Error('no_arguments_permitted');
console.log(JSON.stringify({command:'node scripts/check-codex-persistent-forward.mjs',node:process.version,platform:process.platform,...await checkPersistentForward()},null,2));
