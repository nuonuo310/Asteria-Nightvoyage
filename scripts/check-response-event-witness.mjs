// Explicit independent offline rehearsal, not a live entry or a user approval.
import {checkResponseEventWitness} from '../test-support/response-event-witness-check.js';
console.log(JSON.stringify(await checkResponseEventWitness(),null,2));
