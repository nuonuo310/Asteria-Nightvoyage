import {Store} from '../src/store.js';
let armed=false;
const write=process.stdout.write.bind(process.stdout);
process.stdout.write=(chunk,...args)=>{
  const text=typeof chunk==='string'?chunk:Buffer.isBuffer(chunk)?chunk.toString('utf8'):'';
  const result=write(chunk,...args);
  if(!armed&&text.includes('Press Ctrl+C to close.')){
    armed=true;
    Store.prototype.close=()=>{throw Error('injected_store_close_failure');};
    setTimeout(()=>process.emit('SIGINT'),100);
  }
  return result;
};
