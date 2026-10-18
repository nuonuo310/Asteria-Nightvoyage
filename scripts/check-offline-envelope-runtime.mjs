import {checkOfflineEnvelopeRuntime} from '../test-support/offline-envelope-runtime-check.js';
console.log(JSON.stringify({command:'node scripts/check-offline-envelope-runtime.mjs',node:process.version,platform:process.platform,...await checkOfflineEnvelopeRuntime()},null,2));
