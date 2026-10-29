import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fail} from '../../../src/store.js';
import {r8ReceiptFileName} from './config.mjs';

export const r8ReceiptFileVersion='nv-dream-climate-single-run-r8-receipt-file-v1';

export function r8ReceiptPath(directory){
  if(typeof directory!=='string'||!path.isAbsolute(directory))
    fail('dream_climate_r8_receipt_directory_invalid');
  return path.join(path.resolve(directory),r8ReceiptFileName);
}

export function writeR8Receipt(directory,receipt,{now=Date.now}={}){
  if(typeof now!=='function'||typeof receipt!=='object'||receipt===null||
     Array.isArray(receipt))fail('dream_climate_r8_receipt_invalid');
  const file=r8ReceiptPath(directory);
  const document={schemaVersion:1,receiptFileVersion:r8ReceiptFileVersion,
    writtenAt:now(),encoding:'UTF-8',materialKind:'fictional',isRealityFact:false,
    receipt};
  const bytes=Buffer.from(`${JSON.stringify(document,null,2)}\n`,'utf8');
  const sha256=createHash('sha256').update(bytes).digest('hex');
  try{
    const handle=fs.openSync(file,'wx');
    try{fs.writeSync(handle,bytes);}finally{fs.closeSync(handle);}
    return {written:true,path:file,bytes:bytes.length,sha256,error:null};
  }catch(error){
    return {written:false,path:file,bytes:bytes.length,sha256:null,
      error:typeof error?.code==='string'?error.code:'receipt_write_failed'};
  }
}

export function readR8Receipt(file){
  if(typeof file!=='string'||!path.isAbsolute(file))
    fail('dream_climate_r8_receipt_directory_invalid');
  const bytes=fs.readFileSync(file);
  const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  if(!Buffer.from(text,'utf8').equals(bytes))fail('dream_climate_r8_receipt_invalid_utf8');
  return {bytes,sha256:createHash('sha256').update(bytes).digest('hex'),
    document:JSON.parse(text)};
}
