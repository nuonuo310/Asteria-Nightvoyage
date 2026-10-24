import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomBytes} from 'node:crypto';
import {
  diagnosticsJournalFilename,diagnosticsJournalKind,diagnosticsMaximumReceipts,diagnosticsReceiptKind,
  diagnosticsSchemaVersion,diagnosticsVersion,diagnosticClasses,diagnosticPhases,dispatchIntentValues,
  httpStatusClassValues,transportObservationValues
} from './policy.mjs';

const safeId=value=>typeof value==='string'&&/^[\w-]{1,100}$/.test(value)&&!['__proto__','constructor','prototype'].includes(value);
const digest=value=>createHash('sha256').update(value).digest('hex');
const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const fail=code=>{throw Error(code);};
function receiptId(runId,requestId){return digest(`${runId}\0${requestId}`);}
function validateIdentity(value){
  if(!exact(value,['contractHash','termsHash']))fail('diagnostic_receipt_invalid');
  for(const key of ['contractHash','termsHash'])if(value[key]!==null&&(typeof value[key]!=='string'||!/^[a-f0-9]{64}$/.test(value[key])))fail('diagnostic_receipt_invalid');
}
function validateReceipt(value){
  if(!exact(value,['schemaVersion','kind','diagnosticsVersion','receiptId','runId','requestId','stage','stageIndex','phase','diagnosticClass','dispatchIntent','transportObservation','httpStatusClass','delivery','usage','money','remoteCancellationClaimed','settled','bodyStored','credentialStored','observedAt','identity']))fail('diagnostic_receipt_invalid');
  if(value.schemaVersion!==diagnosticsSchemaVersion||value.kind!==diagnosticsReceiptKind||value.diagnosticsVersion!==diagnosticsVersion)fail('diagnostic_receipt_invalid');
  if(!/^[a-f0-9]{64}$/.test(value.receiptId)||!safeId(value.runId)||!safeId(value.requestId))fail('diagnostic_receipt_invalid');
  if(!['scene','wake'].includes(value.stage)||!Number.isSafeInteger(value.stageIndex)||value.stageIndex<0||value.stageIndex>2)fail('diagnostic_receipt_invalid');
  if(!diagnosticPhases.includes(value.phase)||!diagnosticClasses.includes(value.diagnosticClass)||!dispatchIntentValues.includes(value.dispatchIntent)||!transportObservationValues.includes(value.transportObservation)||!httpStatusClassValues.includes(value.httpStatusClass))fail('diagnostic_receipt_invalid');
  if(value.delivery!=='unknown'||value.usage!=='unknown'||value.money!=='unknown'||value.remoteCancellationClaimed!==false||value.settled!==false||value.bodyStored!==false||value.credentialStored!==false)fail('diagnostic_receipt_invalid');
  if(!Number.isSafeInteger(value.observedAt)||value.observedAt<0)fail('diagnostic_receipt_invalid');
  validateIdentity(value.identity);
  if(value.receiptId!==receiptId(value.runId,value.requestId))fail('diagnostic_receipt_invalid');
}
function validateJournal(value){
  if(!exact(value,['schemaVersion','kind','diagnosticsVersion','receipts']))fail('diagnostic_journal_invalid');
  if(value.schemaVersion!==diagnosticsSchemaVersion||value.kind!==diagnosticsJournalKind||value.diagnosticsVersion!==diagnosticsVersion||!Array.isArray(value.receipts)||value.receipts.length>diagnosticsMaximumReceipts)fail('diagnostic_journal_invalid');
  const ids=new Set();for(const receipt of value.receipts){validateReceipt(receipt);if(ids.has(receipt.receiptId))fail('diagnostic_journal_invalid');ids.add(receipt.receiptId);}
}
function atomicWrite(filename,text){
  const temporary=path.join(path.dirname(filename),`.${path.basename(filename)}.${process.pid}.${randomBytes(8).toString('hex')}.tmp`);
  let fd;
  try{
    fd=fs.openSync(temporary,'wx',0o600);fs.writeFileSync(fd,text);fs.fsyncSync(fd);fs.closeSync(fd);fd=undefined;
    fs.renameSync(temporary,filename);
    let directory;
    try{directory=fs.openSync(path.dirname(filename),'r');fs.fsyncSync(directory);}catch(error){if(!['EINVAL','EPERM','EISDIR','ENOTSUP'].includes(error?.code))throw error;}finally{if(directory!==undefined)fs.closeSync(directory);}
  }catch{
    if(fd!==undefined)try{fs.closeSync(fd);}catch{}
    try{fs.rmSync(temporary,{force:true});}catch{}
    fail('diagnostic_receipt_storage_failed');
  }
}
export function diagnosticJournalPath(directory){return path.join(path.resolve(directory),diagnosticsJournalFilename);}
export class FailureReceiptJournal{
  constructor(directory,{writeAtomic=atomicWrite}={}){
    if(typeof directory!=='string'||!directory||typeof writeAtomic!=='function')fail('diagnostic_journal_config_invalid');
    this.directory=path.resolve(directory);this.filename=diagnosticJournalPath(this.directory);this.writeAtomic=writeAtomic;
    let stat;try{stat=fs.lstatSync(this.directory);}catch{fail('diagnostic_journal_directory_invalid');}
    if(!stat.isDirectory()||stat.isSymbolicLink())fail('diagnostic_journal_directory_invalid');
    let file;try{file=fs.lstatSync(this.filename);}catch(error){if(error?.code!=='ENOENT')fail('diagnostic_journal_io_failure');}
    if(file&&(!file.isFile()||file.isSymbolicLink()||file.size>1048576))fail('diagnostic_journal_unsafe_file');
    try{
      if(file){const value=JSON.parse(fs.readFileSync(this.filename,'utf8'));validateJournal(value);this.receipts=value.receipts;}
      else this.receipts=[];
    }catch{this.receipts=undefined;fail('diagnostic_journal_invalid');}
  }
  append({runId,requestId,stage,stageIndex,phase,diagnosticClass,dispatchIntent,transportObservation,httpStatusClass,observedAt=Date.now(),identity={contractHash:null,termsHash:null}}){
    if(!this.receipts)fail('diagnostic_journal_unavailable');
    const value={schemaVersion:diagnosticsSchemaVersion,kind:diagnosticsReceiptKind,diagnosticsVersion,receiptId:receiptId(runId,requestId),runId,requestId,stage,stageIndex,phase,diagnosticClass,dispatchIntent,transportObservation,httpStatusClass,delivery:'unknown',usage:'unknown',money:'unknown',remoteCancellationClaimed:false,settled:false,bodyStored:false,credentialStored:false,observedAt,identity:{contractHash:identity.contractHash??null,termsHash:identity.termsHash??null}};
    validateReceipt(value);
    const existing=this.receipts.find(receipt=>receipt.receiptId===value.receiptId);if(existing)return structuredClone(existing);
    if(this.receipts.length>=diagnosticsMaximumReceipts)fail('diagnostic_receipt_limit_reached');
    const next=[...this.receipts,value];
    try{this.writeAtomic(this.filename,`${JSON.stringify({schemaVersion:diagnosticsSchemaVersion,kind:diagnosticsJournalKind,diagnosticsVersion,receipts:next})}\n`);}
    catch{fail('diagnostic_receipt_storage_failed');}
    this.receipts=next;return structuredClone(value);
  }
  list(){if(!this.receipts)fail('diagnostic_journal_unavailable');return structuredClone(this.receipts);}
}
export function readDiagnosticReceipts(directory){return new FailureReceiptJournal(directory).list();}
