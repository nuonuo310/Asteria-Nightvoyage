import {pathToFileURL} from 'node:url';
import {runDummyRehearsal} from './dummy.mjs';

if(import.meta.url===pathToFileURL(process.argv[1]??'').href){
  try{
    const value=await runDummyRehearsal();
    console.log(JSON.stringify(value,null,2));
    if(!value.ok)process.exitCode=1;
  }catch(error){
    console.error(error?.message??'dream_climate_live_dummy_rehearsal_failed');
    process.exitCode=1;
  }
}
