// Read-only R4 evidence extraction. Only fs.readFileSync + JSON.parse on the
// single fixed state.json. It imports no Store, runtime, launcher, credential
// or transport module and writes only one docs/validation JSON file.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {r4AllowanceId,r4RunId,r4StoreDirectory} from './config.mjs';

const statePath=path.join(r4StoreDirectory,'state.json');
const outPath=fileURLToPath(new URL(
  '../../../docs/validation/dream-climate-live-r5-evidence.json',import.meta.url));
const lockNames=['owner.lock','recovery.lock','snapshot.tmp'];
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const copy=value=>value===undefined?value:JSON.parse(JSON.stringify(value));
const lockState=()=>Object.fromEntries(lockNames.map(name=>[
  name,fs.existsSync(path.join(r4StoreDirectory,name))]));

function readState(){
  const bytes=fs.readFileSync(statePath);
  const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  if(!Buffer.from(text,'utf8').equals(bytes))throw Error('r5_state_invalid_utf8');
  return {bytes,sha256:digest(bytes),text};
}

function billingRow(row,index){
  const settled=row.status==='settled';
  const match=/-(scene|wake)-(\d+)$/.exec(row.requestId);
  if(!match)throw Error('r5_billing_request_id_shape');
  return {call:index+1,stage:match[1],stageIndex:Number(match[2]),requestId:row.requestId,
    status:row.status,
    usage:row.usage?copy(row.usage):null,
    chargedMicroCny:row.chargedMicroCny??null,reservedMicroCny:row.reservedMicroCny??null,
    chargeClass:settled?'settled_calculated_charge':'unknown_reserved_hold'};
}

export function extractR4ReadOnlyEvidence(){
  const locksBefore=lockState();
  const first=readState();
  const state=JSON.parse(first.text);
  const run=state?.runs?.[r4RunId];
  if(!run)throw Error('r5_target_run_missing');
  if(!Array.isArray(run.draftScenes)||run.draftScenes.length!==3)
    throw Error('r5_draft_scenes_incomplete');
  const account=state?.dreamClimateR4Billing?.accounts?.[r4AllowanceId];
  if(!account||!account.attempts)throw Error('r5_billing_missing');
  const attempts=Object.values(account.attempts).filter(row=>row.runId===r4RunId);
  const ordered=attempts.slice()
    .sort((left,right)=>left.requestId.localeCompare(right.requestId,'en'))
    .map((row,index)=>billingRow(row,index));
  if(ordered.length!==4||attempts.length!==4)throw Error('r5_billing_row_count');
  if(ordered.map(row=>row.stage+'-'+row.stageIndex).join(',')!=='scene-0,scene-1,scene-2,wake-3')
    throw Error('r5_billing_order');
  let settled=0n,unknown=0n;
  for(const row of ordered){
    if(row.status==='settled')settled+=BigInt(row.chargedMicroCny??0);
    else if(['unknown','reserved','dispatched'].includes(row.status))
      unknown+=BigInt(row.reservedMicroCny??0);
  }
  const entries=Object.values(state.entries??{}).filter(entry=>entry?.runId===r4RunId);
  const journalEntry=state?.dreamClimateR4Journal?.runs?.[r4RunId]??null;
  const diagnostic=(run.diagnostics??[]).find(value=>value.stage==='wake')??null;
  const second=readState();
  const locksAfter=lockState();
  const unchanged=first.bytes.length===second.bytes.length&&
    first.sha256===second.sha256&&JSON.stringify(locksBefore)===JSON.stringify(locksAfter);
  return {
    schemaVersion:1,
    extractionMethod:'read_only_fs_readFileSync_and_JSON_parse',
    target:{store:r4StoreDirectory,stateFile:statePath,runId:r4RunId,allowanceId:r4AllowanceId},
    classification:{realModelGenerated:true,published:false,materialKind:'fictional',
      isRealityFact:false,rejectedResponseConvertedToSuccess:false},
    storeBefore:{bytes:first.bytes.length,sha256:first.sha256,locks:locksBefore},
    storeAfter:{bytes:second.bytes.length,sha256:second.sha256,locks:locksAfter},
    unchanged,
    run:{id:run.id,status:run.status,error:run.error??null,ordinal:run.ordinal,
      plan:{climate:run.plan?.climate,mechanism:run.plan?.mechanism,
        foregroundAnchor:run.plan?.foregroundAnchor,
        usedForegroundAnchors:copy(run.plan?.usedForegroundAnchors),
        usedMechanisms:copy(run.plan?.usedMechanisms)},
      validation:{subreason:run.validationSubreason??null,
        originalError:run.validationOriginalError??null},
      draftSceneCount:run.draftScenes.length,scenes:copy(run.draftScenes)},
    wakeRejection:diagnostic?copy(diagnostic):null,
    unpublished:{entryId:run.entryId??null,scenesField:run.scenes??null,
      entriesForRun:entries.map(entry=>({id:entry.id,origin:entry.origin})),
      journalEntry:copy(journalEntry)},
    accounting:{calls:ordered.length,
      committedSceneAttempts:Array.isArray(run.attempts)?run.attempts.length:0,
      rows:ordered,
      settledChargeMicroCny:settled.toString(),
      unknownReservedMicroCny:unknown.toString(),
      combinedAccountingMicroCny:(settled+unknown).toString(),
      combinedIsProviderCharged:false}
  };
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const value=extractR4ReadOnlyEvidence();
    fs.writeFileSync(outPath,`${JSON.stringify(value,null,2)}\n`,'utf8');
    console.log(JSON.stringify({out:outPath,unchanged:value.unchanged,
      bytes:value.storeBefore.bytes,sha256:value.storeBefore.sha256,
      locks:value.storeBefore.locks,draftScenes:value.run.draftSceneCount,
      billingRows:value.accounting.calls},null,2));
    if(!value.unchanged)process.exitCode=1;
  }catch(error){
    console.error(error?.message??'r5_readonly_extract_failed');
    process.exitCode=1;
  }
}
