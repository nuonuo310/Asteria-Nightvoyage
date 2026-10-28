import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {fail} from '../../../src/store.js';
import {launchLive} from './launcher.mjs';

const validPriceFile=value=>typeof value==='string'&&path.isAbsolute(value)&&
  !value.includes('\0')&&!value.includes('\r')&&!value.includes('\n');

export async function runSecureConsole({priceFile,launch=launchLive}={}){
  if(!validPriceFile(priceFile)||typeof launch!=='function')
    fail('invalid_dream_climate_live_secure_console');
  return launch('run',{priceFile});
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2);
  if(args.length!==2||args[0]!=='--price-file'||!validPriceFile(args[1])){
    console.error('Usage: node secure-console.mjs --price-file <absolute path>');
    process.exitCode=1;
  }else{
    const value=await runSecureConsole({priceFile:args[1]});
    console.log(JSON.stringify(value,null,2));
    process.exitCode=1;
  }
}
