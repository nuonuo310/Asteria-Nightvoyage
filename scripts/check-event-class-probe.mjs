// Local rehearsal only; all OAuth/provider endpoints are independent mocks.
import {checkEventClassProbe} from '../test-support/event-class-probe-check.js';
console.log(JSON.stringify(await checkEventClassProbe(),null,2));
