// This command creates only its own temporary fictional Store; no user directory option.
import {checkDaytimeCues} from '../test-support/daytime-cue-fixtures.js';
console.log(JSON.stringify(await checkDaytimeCues(),null,2));
