// No init/run/resume/live/key/fee mutation actions. No default user directory.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readInlinePaidContract,inlinePaidContractPreflight} from './inline-paid-contract.js';
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const args=process.argv.slice(2),[action='help']=args;
    if(action==='proposal'&&args.length===1)console.log(JSON.stringify(readInlinePaidContract(),null,2));
    else if(action==='preflight'&&(args.length===1||(args.length===3&&args[1]==='--data-dir'&&path.isAbsolute(args[2]))))console.log(JSON.stringify(inlinePaidContractPreflight({historyDirectory:args[2]}),null,2));
    else if(action==='help'&&args.length<=1)console.log('Inline paid contract: proposal | preflight [--data-dir <absolute existing external Store>]. Contract checks only; no init/run/live/key/budget option or paid approval.');
    else throw Error();
  }catch{console.error('inline_paid_contract_check_refused');process.exitCode=1;}
}
