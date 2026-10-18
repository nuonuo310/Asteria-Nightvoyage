import {checkLocalReviewCLI} from '../test-support/local-review-cli-check.js';
console.log(JSON.stringify(await checkLocalReviewCLI(),null,2));
