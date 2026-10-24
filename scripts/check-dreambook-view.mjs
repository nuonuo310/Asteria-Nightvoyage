import {checkDreambookView} from '../test-support/dreambook-view-check.js';
try{
  console.log(JSON.stringify(await checkDreambookView(),null,2));
}catch{
  console.error('dreambook_view_check_failed');process.exitCode=1;
}
