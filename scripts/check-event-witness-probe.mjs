// Local rehearsal only; all OAuth/provider endpoints are independent mocks.
import {checkEventWitnessProbe} from '../test-support/event-witness-probe-check.js';
console.log(JSON.stringify(await checkEventWitnessProbe(),null,2));
