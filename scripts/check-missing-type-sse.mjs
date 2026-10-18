import {checkMissingTypeSse} from '../test-support/missing-type-sse-rehearsal.js';
console.log(JSON.stringify({command:'node scripts/check-missing-type-sse.mjs',node:process.version,platform:process.platform,...await checkMissingTypeSse()},null,2));
