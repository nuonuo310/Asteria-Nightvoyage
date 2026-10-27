// Pipe-only secure console adapter. It never reads environment credentials and
// hands the existing launcher a supplier that reads at most one bounded stdin frame.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readInlineCredentialFrame} from '../../../src/inline-credential-pipe.js';
import {fail} from '../../../src/store.js';
import {launchPhaseB} from './launcher.mjs';

const priceFlag='--price-file';
const validPriceFile=value=>typeof value==='string'&&path.isAbsolute(value)&&
  !value.includes('\0')&&!value.includes('\r')&&!value.includes('\n');

export function createDelayedStdinCredentialSupplier(input=process.stdin,{timeoutMs=30000}={}){
  if(!input||typeof input.on!=='function'||typeof input.once!=='function'||typeof input.off!=='function'||
     !Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>60000||input.isTTY){
    fail('rich_sample_secure_console_input_required');
  }
  let reads=0;
  return {
    readCount:()=>reads,
    supplier(){
      if(reads)fail('rich_sample_credential_frame_repeated');
      reads++;
      return readInlineCredentialFrame(input,{timeoutMs});
    }
  };
}

export async function runSecureConsole({priceFile,input=process.stdin,launch=launchPhaseB}={}){
  if(!validPriceFile(priceFile)||typeof launch!=='function')fail('invalid_rich_sample_secure_console');
  const delayed=createDelayedStdinCredentialSupplier(input);
  return launch('run',{priceFile,credentialSupplier:delayed.supplier});
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2);
  if(args.length!==2||args[0]!==priceFlag||!validPriceFile(args[1])){
    console.error('Usage: node secure-console.mjs --price-file <absolute saved official pricing HTML>');
    console.error('Pipe one bounded JSON credential frame into stdin only after PowerShell admission. No environment or argv credential is accepted.');
    process.exitCode=1;
  }else{
    try{
      const value=await runSecureConsole({priceFile:args[1]});
      console.log(JSON.stringify(value,null,2));
      if(value.status==='blocked')process.exitCode=1;
    }catch{console.error('rich_sample_secure_console_refused');process.exitCode=1;}
  }
}
