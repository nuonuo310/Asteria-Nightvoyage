// Read-only three-run receipt entry. Phase A refuses before opening a Store.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Store,fail} from '../../src/store.js';
import {phaseBRelease} from './authorization.mjs';
import {extractRichSampleReceipt} from './records.mjs';

export const richSampleReceiptEntryVersion='nv-rich-fictional-dream-sample-receipt-entry-v1';

export function readRichSampleReceiptDirectory(directory,{now=Date.now()}={}){
  if(phaseBRelease===null)return {
    status:'refused',ready:false,reason:'rich_sample_phase_b_release_required',
    entryVersion:richSampleReceiptEntryVersion,storeOpened:false,ownerLockCreated:false,
    credentialRead:false,networkAttempts:0
  };
  if(typeof directory!=='string'||!directory)return {
    status:'refused',ready:false,reason:'rich_sample_store_directory_required',
    entryVersion:richSampleReceiptEntryVersion,storeOpened:false,ownerLockCreated:false
  };
  const store=new Store(directory);
  try{return extractRichSampleReceipt(store,{now});}
  catch(error){fail(error?.message??'rich_sample_receipt_failed');}
  finally{store.close();}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2);
  if(args.length!==3||args[0]!=='read'||args[1]!=='--data-dir'||!args[2]||args[2].startsWith('--')){
    console.error('Usage: node scripts/nv-rich-fictional-dream-sample-01/receipt.mjs read --data-dir <absolute dedicated Store>. Read-only; Phase A refuses without exact R1.');
    process.exitCode=1;
  }else{
    const result=readRichSampleReceiptDirectory(args[2]);
    console.log(JSON.stringify(result,null,2));
    if(result.status==='refused')process.exitCode=1;
  }
}
