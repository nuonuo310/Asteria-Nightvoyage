// Fixed three-run offline runtime. It uses a local simulator only and has no
// credential loader, live selector, fetch call or arbitrary source entry.
import path from 'node:path';
import {BudgetLedger,validateAllowance} from '../../src/budget-ledger.js';
import {hash,neutral,own,safeId} from '../../src/contract.js';
import {copy,fail,Store} from '../../src/store.js';
import {richSampleIdentity} from './identity.mjs';
import {
  assertRequestBounds,assertRichSamplePriceSnapshot,buildRichSampleRequest,
  normalizeRichSampleScene,normalizeRichSampleWake,parseRichSampleResponse,
  normalizeRichSampleCheckpoint,
  richSampleAllowanceId,richSampleCanonicalSnapshot,richSampleCallsPerRun,
  richSampleExtractionVersion,richSampleMaxCalls,richSampleMaxOutputTokens,
  richSampleNormalizationVersion,richSamplePriceSnapshot,richSamplePriceSnapshotHash,
  richSamplePromptVersion,richSampleProtocolVersion,richSampleRequestByteLimit,
  richSampleRecordOrigin,
  richSampleRunCount,richSampleRunIds,richSampleRunRequestIds,
  richSampleRuntimeVersion,richSampleScenesPerRun,richSampleSessionIds,
  richSampleSourceHash,richSampleSourceRefs,richSampleStubAllowance
} from './protocol.mjs';
import {prepareRichSamplePublication,richSampleBatchKey,richSampleJournalKey} from './records.mjs';

const dedicatedPrefix='nightvoyage-rich-dream-sample-';
const optionKeys=['simulator','enabled','now','fault'];
const batchKeys=['version','runIds','requestIds','sessionIds','startedAt'];
const exact=(value,names)=>value&&typeof value==='object'&&!Array.isArray(value)&&
  Object.keys(value).length===names.length&&names.every(name=>Object.hasOwn(value,name));
const stamp=value=>Number.isSafeInteger(value)&&value>=0;
const cleanStateKeys=new Set(['version','runs','requests','sessions','entries','recalls',
  'richDreamSampleVersion','richDreamSampleBilling',richSampleBatchKey,richSampleJournalKey]);
const uncertainCodes=new Set(['simulated_crash','ambiguous_attempt','timeout','offline_simulator_failure',
  'provider_http_failure','provider_rate_limited','provider_authentication_failed']);
const passThroughCodes=new Set(['cancelled','source_withdrawn','allowance_exhausted','allowance_expired',
  'budget_exhausted','run_busy','usage_exceeds_reviewed_bounds','cost_exceeds_reservation',
  'simulated_crash',
  'publication_failed','storage_io_failure','rich_sample_request_too_large',
  'rich_sample_request_shape_mismatch','rich_sample_price_snapshot_mismatch',
  'rich_sample_fixed_source_required','rich_sample_dedicated_store_required',
  'rich_sample_run_call_limit','rich_sample_total_call_limit','invalid_rich_sample_stage',
  'rich_sample_runtime_identity_mismatch','rich_sample_allowance_mismatch',
  'rich_sample_already_published']);

function ledgerFacade(store){
  return {
    state:{get billing(){return store.state.richDreamSampleBilling;},
      set billing(value){store.state.richDreamSampleBilling=value;}},
    get withdrawn(){return store.withdrawn;},
    get poisoned(){return store.poisoned;},
    set poisoned(value){store.poisoned=value;},
    assert:()=>store.assert(),save:()=>store.save()
  };
}

function mapStageError(error,stage,timedOut){
  if(timedOut)return 'timeout';
  const message=typeof error?.message==='string'?error.message:'';
  if(passThroughCodes.has(message))return message;
  if(message==='generated_wake_fragment_not_grounded')return 'wake_fragment_not_grounded';
  if(message==='offline_simulator_failure')return message;
  if(message.startsWith('invalid_generated_wake')||message==='generated_wake_output_too_large'||
     message==='invalid_generated_wake_scene'||message==='invalid_generated_wake_before'||
     message==='invalid_generated_wake_response')return stage==='scene'?'invalid_scene':'invalid_wake';
  if(message==='invalid_provider_response'||message.startsWith('provider_')||
     message==='usage_exceeds_reviewed_bounds')return 'provider_or_validation_failure';
  return stage==='scene'?'scene_response_rejected':'wake_response_rejected';
}

export class RichDreamSampleRuntime {
  constructor(directory,options={}){
    if(!options||typeof options!=='object'||Array.isArray(options)||
       Object.keys(options).some(key=>!optionKeys.includes(key)))fail('invalid_rich_sample_runtime_options');
    if(typeof options.simulator!=='function'||
       options.fault!==undefined&&typeof options.fault!=='function'||
       options.now!==undefined&&typeof options.now!=='function'||
       options.enabled!==undefined&&typeof options.enabled!=='boolean')fail('invalid_rich_sample_runtime_options');
    if(typeof directory!=='string'||!directory||
       !path.basename(path.resolve(directory)).startsWith(dedicatedPrefix))fail('rich_sample_dedicated_store_required');
    this.store=new Store(directory);
    try{
      if(!path.basename(this.store.directory).startsWith(dedicatedPrefix))fail('rich_sample_dedicated_store_required');
      this.store.assert();
      if(this.store.withdrawn.length||this.store.deletions.length)fail('rich_sample_store_not_dedicated');
      const keys=Object.keys(this.store.state);
      if(keys.some(key=>!cleanStateKeys.has(key)))fail('rich_sample_store_not_dedicated');
      this.assertDedicatedState();
      const identity=richSampleIdentity();
      assertRichSamplePriceSnapshot(richSamplePriceSnapshot);
      const allowance=validateAllowance(copy(richSampleStubAllowance));
      if(allowance.mode!=='stub'||allowance.id!==richSampleAllowanceId||
         allowance.limits.maxRuns!==richSampleRunCount||allowance.limits.maxCalls!==richSampleMaxCalls||
         allowance.limits.maxMicroCny!==richSamplePriceSnapshot.allowanceCapMicroCny||
         allowance.pricing.contextTokenLimit!==richSamplePriceSnapshot.contextTokenLimit||
         allowance.pricing.model!==richSamplePriceSnapshot.modelAlias||
         allowance.pricing.inputMicroCnyPerMillion!==richSamplePriceSnapshot.inputMicroCnyPerMillion||
         allowance.pricing.outputMicroCnyPerMillion!==richSamplePriceSnapshot.outputMicroCnyPerMillion)fail('rich_sample_allowance_mismatch');
      const ledger=new BudgetLedger(ledgerFacade(this.store));
      ledger.approve(allowance);
      for(const account of Object.values(this.store.state.richDreamSampleBilling.accounts)){
        for(const row of Object.values(account.attempts)){
          if(['reserved','dispatched'].includes(row.status))row.status='unknown';
        }
      }
      Object.defineProperties(this,{
        ledger:{value:ledger},identity:{value:identity},allowance:{value:allowance},
        allowanceHash:{value:hash(allowance)},simulator:{value:options.simulator},
        enabled:{value:options.enabled===true},clock:{value:options.now??Date.now},
        fault:{value:options.fault??(()=>{})},active:{value:new Map()}
      });
      if(this.store.state.richDreamSampleVersion!==undefined&&
         this.store.state.richDreamSampleVersion!==richSampleRuntimeVersion)fail('rich_sample_runtime_identity_mismatch');
      this.store.state.richDreamSampleVersion=richSampleRuntimeVersion;
      if(this.batch())this.assertDedicatedState();
      this.store.save();
    }catch(error){this.store.close();throw error;}
  }

  now(){
    const value=this.clock();
    if(!stamp(value))fail('invalid_rich_sample_clock');
    return value;
  }

  run(id){
    this.store.assert();
    if(!safeId(id))fail('unknown_run');
    return own(this.store.state.runs,id)??fail('unknown_run');
  }

  batch(){
    const value=own(this.store.state,richSampleBatchKey);
    if(value===undefined)return null;
    if(!exact(value,batchKeys)||value.version!==1||
       !Array.isArray(value.runIds)||!Array.isArray(value.requestIds)||!Array.isArray(value.sessionIds)||
       hash(value.runIds)!==hash([...richSampleRunIds])||
       hash(value.requestIds)!==hash([...richSampleRunRequestIds])||
       hash(value.sessionIds)!==hash([...richSampleSessionIds])||!stamp(value.startedAt))fail('invalid_rich_sample_batch');
    return copy(value);
  }

  assertDedicatedState(){
    this.store.assert();
    const state=this.store.state,batch=this.batch();
    if(!batch){
      const billing=state.richDreamSampleBilling;
      const ownBilling=billing===undefined||
        (billing?.version===1&&billing.accounts&&Object.keys(billing.accounts).length===1&&
         Object.hasOwn(billing.accounts,richSampleAllowanceId)&&
         Object.keys(billing.accounts[richSampleAllowanceId].attempts).length===0&&
         billing.accounts[richSampleAllowanceId].runIds.length===0);
      if(!ownBilling||own(state,richSampleJournalKey)!==undefined||
         Object.keys(state.runs).length||Object.keys(state.requests).length||
         Object.keys(state.sessions).length||Object.keys(state.entries).length||
         Object.keys(state.recalls).length||state.billing!==undefined)fail('rich_sample_store_not_dedicated');
      return;
    }
    if(state.richDreamSampleVersion!==richSampleRuntimeVersion||
       !Object.keys(state.runs).every(id=>batch.runIds.includes(id))||
       Object.keys(state.runs).length!==batch.runIds.length)fail('rich_sample_runtime_identity_mismatch');
    for(const [index,runId] of batch.runIds.entries()){
      const run=own(state.runs,runId);
      if(!run||run.id!==runId||run.richDreamSampleRunOrdinal!==index+1||
         run.richDreamSampleRequestId!==batch.requestIds[index]||
         run.richDreamSampleSessionId!==batch.sessionIds[index]||
         !safeId(run.status)||!Array.isArray(run.scenes)||!Array.isArray(run.attempts))fail('rich_sample_run_identity_mismatch');
    }
    for(const [index,requestId] of batch.requestIds.entries()){
      const receipt=own(state.requests,requestId);
      if(!receipt||receipt.runId!==batch.runIds[index]||receipt.sessionId!==batch.sessionIds[index]||
         typeof receipt.fingerprint!=='string'||!/^[a-f0-9]{64}$/.test(receipt.fingerprint))fail('rich_sample_run_identity_mismatch');
      if(own(state.sessions,batch.sessionIds[index])!==batch.runIds[index])fail('rich_sample_run_identity_mismatch');
    }
    if(Object.keys(state.requests).length!==richSampleRunCount||
       Object.keys(state.sessions).length!==richSampleRunCount)fail('rich_sample_run_identity_mismatch');
    for(const [id,entry] of Object.entries(state.entries)){
      if(!safeId(id)||!batch.runIds.includes(entry?.runId)||
         !['dream',richSampleRecordOrigin].includes(entry?.origin))fail('rich_sample_store_not_dedicated');
    }
    if(Object.keys(state.recalls).length)fail('rich_sample_store_not_dedicated');
    if(state.billing!==undefined||state.richDreamSampleBilling?.version!==1||
       !state.richDreamSampleBilling.accounts||
       Object.keys(state.richDreamSampleBilling.accounts).some(id=>id!==richSampleAllowanceId)||
       Object.keys(state.richDreamSampleBilling.accounts).length!==1)fail('rich_sample_store_not_dedicated');
  }

  assertIdentity(id){
    this.assertDedicatedState();
    const run=this.run(id),batch=this.batch(),identity=richSampleIdentity();
    if(!batch||hash(identity)!==hash(this.identity)||
       run.richDreamSampleProtocolVersion!==richSampleProtocolVersion||
       run.richDreamSampleRuntimeVersion!==richSampleRuntimeVersion||
       run.richDreamSampleNormalizationVersion!==richSampleNormalizationVersion||
       run.richDreamSamplePromptVersion!==richSamplePromptVersion||
       run.richDreamSampleExtractionVersion!==richSampleExtractionVersion||
       run.richDreamSampleIdentityHash!==identity.identityHash||
       run.richDreamSamplePromptHash!==identity.promptHash||
       run.richDreamSampleSourceHash!==richSampleSourceHash||
       run.richDreamSamplePriceSnapshotHash!==richSamplePriceSnapshotHash||
       run.richDreamSampleAllowanceId!==richSampleAllowanceId||
       run.richDreamSampleAllowanceHash!==this.allowanceHash||
       run.richDreamSampleRunOrdinal!==batch.runIds.indexOf(run.id)+1||
       run.snapshot===undefined||hash(run.snapshot)!==hash(richSampleCanonicalSnapshot)||
       hash(this.ledger.account(richSampleAllowanceId).allowance)!==this.allowanceHash)fail('rich_sample_runtime_identity_mismatch');
    let before=neutral();
    for(const scene of run.scenes){const value=normalizeRichSampleCheckpoint(scene,before);before=value.after;}
    return run;
  }

  startBatch(){
    this.store.assert();
    const existing=this.batch();
    if(existing)return existing;
    this.assertDedicatedState();
    const startedAt=this.now();
    for(const [index,runId] of richSampleRunIds.entries()){
      const requestId=richSampleRunRequestIds[index],sessionId=richSampleSessionIds[index],ordinal=index+1;
      const fingerprint=hash({protocolVersion:richSampleProtocolVersion,runtimeVersion:richSampleRuntimeVersion,
        identityHash:this.identity.identityHash,promptHash:this.identity.promptHash,sourceHash:richSampleSourceHash,
        requestId,sessionId,runId,ordinal});
      this.store.state.requests[requestId]={runId,sessionId,fingerprint};
      this.store.state.sessions[sessionId]=runId;
      this.store.state.runs[runId]={id:runId,status:'queued',snapshot:copy(richSampleCanonicalSnapshot),
        config:{scenesPerRun:richSampleScenesPerRun,callsPerRun:richSampleCallsPerRun,
          maxCalls:richSampleMaxCalls,requestByteLimit:richSampleRequestByteLimit,maxOutputTokens:richSampleMaxOutputTokens},
        scenes:[],attempts:[],richDreamSampleProtocolVersion:richSampleProtocolVersion,
        richDreamSampleRuntimeVersion:richSampleRuntimeVersion,
        richDreamSampleNormalizationVersion:richSampleNormalizationVersion,
        richDreamSamplePromptVersion:richSamplePromptVersion,
        richDreamSampleExtractionVersion:richSampleExtractionVersion,
        richDreamSampleIdentityHash:this.identity.identityHash,
        richDreamSamplePromptHash:this.identity.promptHash,
        richDreamSampleSourceHash:richSampleSourceHash,
        richDreamSamplePriceSnapshotHash:richSamplePriceSnapshotHash,
        richDreamSampleAllowanceId:richSampleAllowanceId,
        richDreamSampleAllowanceHash:this.allowanceHash,
        richDreamSampleRunOrdinal:ordinal,richDreamSampleRequestId:requestId,
        richDreamSampleSessionId:sessionId};
    }
    this.store.state[richSampleBatchKey]={version:1,runIds:[...richSampleRunIds],
      requestIds:[...richSampleRunRequestIds],sessionIds:[...richSampleSessionIds],startedAt};
    this.assertDedicatedState();
    this.store.save();
    return this.batch();
  }

  rows(id){return this.ledger.status(richSampleAllowanceId).attempts.filter(row=>row.runId===id);}

  status(id){
    const run=this.assertIdentity(id),rows=this.rows(id);
    const settled=rows.filter(row=>row.status==='settled').length;
    return {id,ordinal:run.richDreamSampleRunOrdinal,status:run.status,
      scenesSaved:run.scenes.length,wakeSaved:run.wake!==undefined,entryId:run.entryId??null,
      error:run.error??null,billing:{calls:rows.length,settled,unknown:rows.length-settled,
        heldOrSpentMicroCny:rows.reduce((sum,row)=>sum+BigInt(row.chargedMicroCny),0n).toString()}};
  }

  batchStatus(){
    const batch=this.batch();
    if(!batch)return {started:false,runs:[]};
    return {started:true,runIds:copy(batch.runIds),runs:batch.runIds.map(id=>this.status(id))};
  }

  async executeBatch(){
    this.assertDedicatedState();
    const batch=this.batch();
    if(!batch)fail('rich_sample_batch_not_started');
    for(const runId of batch.runIds){
      if(this.run(runId).status==='queued')await this.executeRun(runId);
    }
    return this.batchStatus();
  }

  async executeRun(id){
    const run=this.assertIdentity(id);
    if(this.active.has(id))fail('run_busy');
    if(run.status!=='queued')return this.status(id);
    if(!this.enabled)fail('transport_disabled');
    const controller=new AbortController();
    this.active.set(id,controller);
    run.status='running';delete run.error;
    try{
      this.store.save();
      while(run.status==='running'&&run.scenes.length<richSampleScenesPerRun){
        await this.stage(run,'scene',controller.signal);
      }
      if(run.status==='running')await this.stage(run,'wake',controller.signal);
    }catch(error){
      if(this.store.poisoned)throw error;
      if(run.status==='running'){
        run.status=uncertainCodes.has(error.message)?'uncertain':'failed';
        run.error=error.message||'rich_sample_execution_failed';
        this.store.save();
      }
    }finally{this.active.delete(id);}
    return this.status(id);
  }

  cancel(id){
    const run=this.assertIdentity(id),controller=this.active.get(id);
    if(controller)controller.abort();
    if(['queued','running','failed','uncertain'].includes(run.status)){
      run.status='cancelled';this.store.save();
    }
    return this.status(id);
  }

  resumeRun(id){
    const run=this.assertIdentity(id);
    if(this.active.has(id))fail('run_busy');
    if(!['failed','uncertain','cancelled'].includes(run.status)||run.wake!==undefined||
       run.entryId!==undefined)fail('rich_sample_resume_requires_committed_prefix');
    const prefix=run.scenes.length,rows=this.rows(id),attempts=run.attempts;
    if(prefix<1||prefix>richSampleScenesPerRun||attempts.length!==prefix||rows.length!==prefix||
       attempts.some((attempt,index)=>attempt.state!=='committed'||attempt.stage!=='scene'||attempt.index!==index)||
       rows.some(row=>row.status!=='settled'))fail('rich_sample_resume_requires_committed_prefix');
    run.status='queued';delete run.error;
    this.store.save();
    return this.executeRun(id);
  }

  async stage(run,stage,signal){
    this.assertIdentity(run.id);
    if(!this.enabled)fail('transport_disabled');
    if(run.status!=='running'||signal.aborted)fail('cancelled');
    const index=run.scenes.length;
    if(stage==='scene'?index>=richSampleScenesPerRun:stage!=='wake'||index!==richSampleScenesPerRun)fail('invalid_rich_sample_stage');
    const payload={snapshot:copy(run.snapshot),scenes:copy(run.scenes),stage,index};
    const request=buildRichSampleRequest(payload);
    assertRequestBounds(request);
    assertRichSamplePriceSnapshot(richSamplePriceSnapshot);
    const rows=this.rows(run.id),total=this.ledger.status(richSampleAllowanceId).calls;
    if(rows.length>=richSampleCallsPerRun)fail('rich_sample_run_call_limit');
    if(total>=richSampleMaxCalls)fail('rich_sample_total_call_limit');
    const requestId=`rich-${run.id}-${stage}-${index}`;
    if(!safeId(requestId)||rows.some(row=>row.requestId===requestId))fail('ambiguous_attempt');
    const fingerprint=hash({protocolVersion:richSampleProtocolVersion,runtimeVersion:richSampleRuntimeVersion,
      identityHash:this.identity.identityHash,runId:run.id,runOrdinal:run.richDreamSampleRunOrdinal,
      request:request.body,snapshot:run.snapshot});
    const reservation=this.ledger.reserve(richSampleAllowanceId,{requestId,runId:run.id,fingerprint,
      sourceRefs:run.snapshot.sources.map(source=>({id:source.id,version:source.version})),
      maxOutputTokens:richSampleMaxOutputTokens},this.now());
    if(reservation.replayed)fail('ambiguous_attempt');
    const controller=new AbortController();
    let timer,timedOut=false;
    const abort=()=>controller.abort();
    signal.addEventListener('abort',abort,{once:true});
    const active=()=>{
      this.store.assert();
      if(signal.aborted||controller.signal.aborted||this.run(run.id).status!=='running')fail('cancelled');
      if(run.snapshot.sources.some(source=>this.store.withdrawn.includes(source.id)))fail('source_withdrawn');
      this.assertIdentity(run.id);
    };
    try{
      this.fault('rich_sample_reserved');
      active();
      this.ledger.dispatch(richSampleAllowanceId,requestId);
      this.fault('rich_sample_dispatched');
      const stop=new Promise((_,reject)=>{
        controller.signal.addEventListener('abort',()=>reject(Error('cancelled')),{once:true});
        timer=setTimeout(()=>{timedOut=true;controller.abort();reject(Error('timeout'));},60000);
      });
      const response=await Promise.race([Promise.resolve().then(()=>{
        active();
        return this.simulator(copy(request),{signal:controller.signal});
      }),stop]);
      active();
      const parsed=parseRichSampleResponse(response);
      let value,wakeValue;
      if(stage==='scene'){
        const before=run.scenes.at(-1)?.after??run.snapshot.channels.affect.value??neutral();
        value=normalizeRichSampleScene(parsed.data,before);
      }else{
        wakeValue=normalizeRichSampleWake(parsed.data,run.scenes);
        value=wakeValue.wake;
      }
      active();
      this.ledger.settle(richSampleAllowanceId,requestId,parsed.receipt,accounting=>{
        active();
        if(run.scenes.length!==index)fail('cancelled');
        if(stage==='scene'){
          run.scenes.push(copy(value));
          run.attempts.push({stage,index,state:'committed',billingRequestId:accounting.requestId,
            requestBytes:assertRequestBounds(request)});
        }else{
          const prepared=prepareRichSamplePublication(this.store,{run,wake:value,
            firstFeeling:wakeValue.firstFeeling,firstFeelingOmitted:wakeValue.firstFeelingOmitted,
            wakeRequestId:accounting.requestId,recordedAt:this.now()});
          this.store.state.entries[prepared.dreamId]=prepared.dreamEntry;
          if(prepared.feelingEntry)this.store.state.entries[prepared.feelingEntry.id]=prepared.feelingEntry;
          this.store.state[richSampleJournalKey]=prepared.journal;
          run.wake=copy(value);run.entryId=prepared.dreamId;run.status='completed';
          run.attempts.push({stage,index,state:'committed',billingRequestId:accounting.requestId,
            wakeRequestId:accounting.requestId,requestBytes:assertRequestBounds(request),
            firstFeelingStatus:wakeValue.firstFeelingOmitted?'omitted':wakeValue.firstFeeling.status});
        }
      });
      if(stage==='scene')this.fault('rich_sample_scene_saved');
      else this.fault('rich_sample_wake_saved');
    }catch(error){
      controller.abort();
      if(!this.store.poisoned&&!this.store.closed){
        try{this.ledger.unknown(richSampleAllowanceId,requestId);}catch{}
      }
      fail(mapStageError(error,stage,timedOut));
    }finally{clearTimeout(timer);signal.removeEventListener('abort',abort);}
  }

  close(){
    if(this.active.size)fail('active_runs');
    this.store.close();
  }
}
