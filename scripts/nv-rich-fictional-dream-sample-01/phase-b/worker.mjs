import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readInlineCredentialFrame} from '../../../src/inline-credential-pipe.js';
import {Store,fail} from '../../../src/store.js';
import {RichDreamSampleRuntime} from '../runtime.mjs';
import {extractRichSampleReceipt} from '../records.mjs';
import {
  assertRequestBounds,buildRichSampleRequest,richSampleFixedSnapshot,richSampleMaxOutputTokens,
  richSamplePerCallMaximumMicroCny,richSamplePriceSnapshot,richSamplePriceSnapshotHash,
  richSampleRunIds,richSampleScenesPerRun
} from '../protocol.mjs';
import {verifyPhaseBIdentity} from './identity.mjs';
import {readPhaseBRelease,revokePhaseBRelease} from './release.mjs';
import {verifyPhaseBPriceEvidence} from './price-check.mjs';
import {createDeepSeekTransport} from './transport.mjs';
import {
  phaseAHead,phaseAParent,phaseATree,phaseBAllowanceCapMicroCny,phaseBConfigVersion,
  phaseBExpectedReleaseHash,phaseBMaxCalls,phaseBMaxRuns,phaseBReleasePath,phaseBStoreDirectory,
  phaseBTransportEndpoint,phaseBWorkerVersion
} from './config.mjs';

const exact=(value,names)=>value&&typeof value==='object'&&!Array.isArray(value)&&
  Object.keys(value).length===names.length&&names.every(name=>Object.hasOwn(value,name));

function parseProof(text){
  let value;
  try{value=JSON.parse(text);}catch{fail('rich_sample_phase_a_proof_invalid');}
  if(!exact(value,['head','tree','parent'])||value.head!==phaseAHead||value.tree!==phaseATree||
     value.parent!==phaseAParent)fail('rich_sample_phase_a_identity_changed');
  return value;
}

function assertStoreAbsent(){
  let stat;
  try{stat=fs.lstatSync(phaseBStoreDirectory);}catch(error){if(error.code==='ENOENT')return;fail('rich_sample_store_path_unreadable');}
  if(stat.isSymbolicLink())fail('rich_sample_store_path_symlink');
  fail('rich_sample_store_already_exists');
}

function staticPreflight(priceFile,proofText){
  const release=readPhaseBRelease();
  const identity=verifyPhaseBIdentity();
  const proof=parseProof(proofText);
  const price=verifyPhaseBPriceEvidence(priceFile,{now:Date.now()});
  assertStoreAbsent();
  const request=buildRichSampleRequest({snapshot:richSampleFixedSnapshot(),scenes:[],stage:'scene',index:0});
  const nextRequestBytes=assertRequestBounds(request);
  if(nextRequestBytes>16384||richSamplePerCallMaximumMicroCny!==35968||
     richSamplePerCallMaximumMicroCny*phaseBMaxCalls!==richSamplePriceSnapshot.worstMicroCny||
     richSamplePriceSnapshot.worstMicroCny>phaseBAllowanceCapMicroCny)fail('rich_sample_live_budget_mismatch');
  if(release.storeDirectory!==phaseBStoreDirectory||release.allowanceCapMicroCny!==phaseBAllowanceCapMicroCny||
     release.maxRuns!==phaseBMaxRuns||release.maxCalls!==phaseBMaxCalls||release.noRetry!==true)fail('rich_sample_phase_b_release_mismatch');
  return {release,identity,proof,price,nextRequestBytes,nextReservationMicroCny:richSamplePerCallMaximumMicroCny};
}

function totalCharged(receipt){
  return receipt.runs.reduce((sum,run)=>sum+BigInt(run.billing?.rows?.reduce((inner,row)=>inner+BigInt(row.chargedMicroCny??0),0n)??0n),0n).toString();
}

function blocked(reason,{credentialRequested=false}={}){
  return {status:'blocked',ready:false,reason,workerVersion:phaseBWorkerVersion,
    credentialRequested,phaseBReleaseRevoked:!fs.existsSync(phaseBReleasePath),
    storeExists:fs.existsSync(phaseBStoreDirectory),credentialPersisted:false,
    networkAttempts:0,realModelRequests:0,automaticRetry:false,phaseBExecuted:false};
}

export async function runPhaseBWorker(action,{priceFile,proofText,credentialSource=process.stdin}={}){
  if(action==='preflight'){
    const state=staticPreflight(priceFile,proofText);
    return {status:'ready',ready:true,workerVersion:phaseBWorkerVersion,configVersion:phaseBConfigVersion,
      credentialRequested:false,credentialSupplierCalls:0,storeCreated:false,networkAttempts:0,
      release:state.release,phaseBIdentity:state.identity,price:state.price,
      nextRequestBytes:state.nextRequestBytes,nextReservationMicroCny:state.nextReservationMicroCny,
      runCount:richSampleRunIds.length,scenesPerRun:richSampleScenesPerRun,maxCalls:phaseBMaxCalls,
      allowanceCapMicroCny:phaseBAllowanceCapMicroCny,releaseHash:phaseBExpectedReleaseHash,
      priceSnapshotHash:richSamplePriceSnapshotHash,maxOutputTokens:richSampleMaxOutputTokens,
      transportEndpoint:phaseBTransportEndpoint,storeDirectory:phaseBStoreDirectory};
  }
  if(action!=='run')fail('invalid_rich_sample_phase_b_action');
  let runtime,store,credential,credentialRequested=false;
  try{
    const state=staticPreflight(priceFile,proofText);
    process.stdout.write(JSON.stringify({type:'credential_required',releaseHash:phaseBExpectedReleaseHash,
      phaseBIdentityHash:state.identity.phaseBIdentityHash,pricePageSha256:state.price.pageSha256,
      nextRequestBytes:state.nextRequestBytes,nextReservationMicroCny:state.nextReservationMicroCny})+'\n');
    credentialRequested=true;
    credential=await readInlineCredentialFrame(credentialSource,{timeoutMs:30000});
    const checked=staticPreflight(priceFile,proofText);
    if(checked.release.storeDirectory!==phaseBStoreDirectory||fs.existsSync(phaseBStoreDirectory))fail('rich_sample_store_already_exists');
    runtime=new RichDreamSampleRuntime(phaseBStoreDirectory,{
      enabled:true,simulator:createDeepSeekTransport(credential)
    });
    runtime.startBatch();
    let stopped=false;
    for(const runId of richSampleRunIds){
      const status=await runtime.executeRun(runId);
      if(status.status!=='completed'){stopped=true;break;}
    }
    runtime.close();runtime=undefined;
    credential=undefined;
    revokePhaseBRelease();
    store=new Store(phaseBStoreDirectory);
    const receipt=extractRichSampleReceipt(store,{now:Date.now()});
    store.close();store=undefined;
    const allCompleted=receipt.completedRuns===3;
    return {...receipt,batchStatus:allCompleted?'COMPLETE_ONE_LIVE_BATCH':'PARTIAL_FAILED_ONE_LIVE_BATCH',
      release:{...state.release,hash:phaseBExpectedReleaseHash},phaseBIdentity:state.identity,
      priceEvidence:state.price,storeDirectory:phaseBStoreDirectory,transportEndpoint:phaseBTransportEndpoint,
      stoppedAfterNonCompletedRun:stopped,releaseRevoked:true,storeClosed:true,credentialRequested:true,
      credentialPersisted:false,automaticRetry:false,replacementRun:false,fourthRun:false,
      laterRecollectionsEmpty:true,totalChargedMicroCny:totalCharged(receipt),
      totalReservedMicroCny:String(richSamplePerCallMaximumMicroCny*phaseBMaxCalls)};
  }catch(error){
    if(runtime){try{runtime.close();}catch{}}
    if(store){try{store.close();}catch{}}
    credential=undefined;
    if(action==='run')revokePhaseBRelease();
    const reason=error?.message==='credential_pipe_refused'?'rich_sample_credential_source_unavailable':
      (typeof error?.message==='string'&&error.message?error.message:'rich_sample_phase_b_worker_failed');
    return blocked(reason,{credentialRequested});
  }finally{
    credential=undefined;
    if(runtime){try{runtime.close();}catch{}}
    if(store){try{store.close();}catch{}}
  }
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2);
  const action=args.shift();
  const flags={};
  while(args.length){const key=args.shift();if(!['--price-file','--phase-a-proof'].includes(key)||Object.hasOwn(flags,key)||!args.length)break;flags[key]=args.shift();}
  if(!['preflight','run'].includes(action)||!flags['--price-file']||!path.isAbsolute(flags['--price-file'])||!flags['--phase-a-proof']){
    console.error('Usage: node worker.mjs preflight|run --price-file <absolute saved pricing HTML> --phase-a-proof <json>');
    console.error('Fixed Store, transport, source, prompt and run count only.');
    process.exitCode=1;
  }else{
    try{
      const value=await runPhaseBWorker(action,{priceFile:flags['--price-file'],proofText:flags['--phase-a-proof']});
      console.log(JSON.stringify({type:'result',value}));
      if(value.status==='blocked')process.exitCode=1;
    }catch{console.error('rich_sample_phase_b_worker_refused');process.exitCode=1;}
  }
}
