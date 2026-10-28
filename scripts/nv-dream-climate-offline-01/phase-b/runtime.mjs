// Offline-review three-run runtime. It has no credential loader, environment
// fallback, retry, replacement run, fourth run or later recollection.
import path from 'node:path';
import {BudgetLedger,validateAllowance} from '../../../src/budget-ledger.js';
import {parseDeepSeekResponse} from '../../../src/deepseek-protocol.js';
import {hash,neutral,own,safeId} from '../../../src/contract.js';
import {copy,fail,Store} from '../../../src/store.js';
import {
  assertRequestBounds,buildDreamStageRequest,dreamClimateCanonicalSnapshot,
  dreamClimateCallsPerRun,dreamClimateMaxCalls,dreamClimateNormalizationVersion,
  dreamClimateProtocolVersion,dreamClimateRequestByteLimit,dreamClimateRunCount,
  dreamClimateScenesPerRun,dreamClimateSourceRefs,normalizeDreamClimateCheckpoint,
  normalizeDreamClimateScene,normalizeDreamClimateWake
} from '../protocol.mjs';
import {
  liveAllowanceCapMicroCny,liveAllowanceExpiresAt,liveAllowanceId,liveMaxOutputTokens,
  liveModelAlias,livePerCallMaximumMicroCny,livePricePageUrl,livePriceReviewedAt,
  liveRunCount,liveRuntimeVersion
} from './config.mjs';
import {
  assertLiveMatrix,liveMatrix,liveMatrixHash,liveRunIds,liveRunRequestIds,
  liveRunSessionIds
} from './matrix.mjs';
import {
  extractLiveReceipt,liveBatchKey,liveFirstFeelingOrigin,liveJournalKey,
  prepareLivePublication
} from './records.mjs';
import {verifyLiveIdentity} from './identity.mjs';
import {
  buildStageDiagnostic,safeErrorCode,stableValidationSubreason
} from './diagnostics.mjs';

const optionKeys=['simulator','enabled','now','fault'];
const batchKeys=['version','runIds','requestIds','sessionIds','matrixHash','startedAt'];
const exact=(value,names)=>value&&typeof value==='object'&&!Array.isArray(value)&&
  Object.keys(value).length===names.length&&names.every(name=>Object.hasOwn(value,name));
const stamp=value=>Number.isSafeInteger(value)&&value>=0;
const cleanStateKeys=new Set(['version','runs','requests','sessions','entries','recalls',
  'dreamClimateLiveVersion','dreamClimateLiveBilling',liveBatchKey,liveJournalKey]);
const uncertainCodes=new Set(['simulated_crash','ambiguous_attempt','timeout',
  'offline_simulator_failure','provider_http_failure','provider_rate_limited',
  'provider_authentication_failed']);
const passThroughCodes=new Set(['cancelled','source_withdrawn','allowance_exhausted',
  'allowance_expired','budget_exhausted','run_busy','usage_exceeds_reviewed_bounds',
  'cost_exceeds_reservation','publication_failed','storage_io_failure',
  'dream_climate_request_too_large','dream_climate_request_shape_mismatch',
  'dream_climate_live_run_call_limit','dream_climate_live_total_call_limit',
  'invalid_dream_climate_stage','dream_climate_live_runtime_identity_mismatch',
  'dream_climate_live_allowance_mismatch','dream_climate_live_already_published',
  'dream_climate_live_previous_run_incomplete']);

export const liveAllowance=Object.freeze({
  id:liveAllowanceId,mode:'live',approved:true,expiresAt:liveAllowanceExpiresAt,
  limits:{maxRuns:liveRunCount,maxCalls:dreamClimateMaxCalls,
    maxMicroCny:liveAllowanceCapMicroCny},
  pricing:{model:liveModelAlias,contextTokenLimit:dreamClimateRequestByteLimit,
    inputMicroCnyPerMillion:2000000,outputMicroCnyPerMillion:8000000,
    reference:livePricePageUrl,checkedAt:livePriceReviewedAt}
});

function ledgerFacade(store){
  return {
    state:{get billing(){return store.state.dreamClimateLiveBilling;},
      set billing(value){store.state.dreamClimateLiveBilling=value;}},
    get withdrawn(){return store.withdrawn;},
    get poisoned(){return store.poisoned;},
    set poisoned(value){store.poisoned=value;},
    assert:()=>store.assert(),save:()=>store.save()
  };
}

function accountingTotals(rows){
  let settledCharge=0n,unknownReserved=0n;
  for(const row of rows){
    if(row.status==='settled')settledCharge+=BigInt(row.chargedMicroCny??0);
    else if(['unknown','reserved','dispatched'].includes(row.status))
      unknownReserved+=BigInt(row.reservedMicroCny??row.chargedMicroCny??0);
  }
  return {settledChargeMicroCny:settledCharge.toString(),
    unknownReservedMicroCny:unknownReserved.toString(),
    combinedAccountingMicroCny:(settledCharge+unknownReserved).toString(),
    combinedIsProviderCharged:false,
    combinedMeaning:'settled_calculated_charge_plus_unknown_reserved_hold'};
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

export class DreamClimateLiveRuntime {
  constructor(directory,options={}){
    if(!options||typeof options!=='object'||Array.isArray(options)||
       Object.keys(options).some(key=>!optionKeys.includes(key)))
      fail('invalid_dream_climate_live_runtime_options');
    if(typeof options.simulator!=='function'||
       options.fault!==undefined&&typeof options.fault!=='function'||
       options.now!==undefined&&typeof options.now!=='function'||
       options.enabled!==undefined&&typeof options.enabled!=='boolean')
      fail('invalid_dream_climate_live_runtime_options');
    if(typeof directory!=='string'||path.basename(path.resolve(directory))!=='nightvoyage-dream-climate-live-01')
      fail('dream_climate_live_dedicated_store_required');
    this.store=new Store(directory);
    try{
      if(path.basename(this.store.directory)!=='nightvoyage-dream-climate-live-01')
        fail('dream_climate_live_dedicated_store_required');
      this.store.assert();
      if(this.store.withdrawn.length||this.store.deletions.length)
        fail('dream_climate_live_store_not_dedicated');
      if(Object.keys(this.store.state).some(key=>!cleanStateKeys.has(key)))
        fail('dream_climate_live_store_not_dedicated');
      this.assertDedicatedState();
      const identity=verifyLiveIdentity();
      const allowance=validateAllowance(copy(liveAllowance));
      if(allowance.mode!=='live'||allowance.id!==liveAllowanceId||
         allowance.limits.maxRuns!==liveRunCount||allowance.limits.maxCalls!==dreamClimateMaxCalls||
         allowance.limits.maxMicroCny!==liveAllowanceCapMicroCny||
         allowance.pricing.contextTokenLimit!==dreamClimateRequestByteLimit||
         allowance.pricing.model!==liveModelAlias||
         allowance.pricing.inputMicroCnyPerMillion!==2000000||
         allowance.pricing.outputMicroCnyPerMillion!==8000000)
        fail('dream_climate_live_allowance_mismatch');
      const ledger=new BudgetLedger(ledgerFacade(this.store));
      ledger.approve(allowance);
      for(const account of Object.values(this.store.state.dreamClimateLiveBilling.accounts)){
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
      if(this.store.state.dreamClimateLiveVersion!==undefined&&
         this.store.state.dreamClimateLiveVersion!==liveRuntimeVersion)
        fail('dream_climate_live_runtime_identity_mismatch');
      this.store.state.dreamClimateLiveVersion=liveRuntimeVersion;
      if(this.batch())this.assertDedicatedState();
      this.store.save();
    }catch(error){this.store.close();throw error;}
  }

  now(){
    const value=this.clock();
    if(!stamp(value))fail('invalid_dream_climate_live_clock');
    return value;
  }

  run(id){
    this.store.assert();
    if(!safeId(id))fail('unknown_run');
    return own(this.store.state.runs,id)??fail('unknown_run');
  }

  batch(){
    const value=own(this.store.state,liveBatchKey);
    if(value===undefined)return null;
    if(!exact(value,batchKeys)||value.version!==1||
       !Array.isArray(value.runIds)||!Array.isArray(value.requestIds)||
       !Array.isArray(value.sessionIds)||hash(value.runIds)!==hash([...liveRunIds])||
       hash(value.requestIds)!==hash([...liveRunRequestIds])||
       hash(value.sessionIds)!==hash([...liveRunSessionIds])||
       value.matrixHash!==liveMatrixHash||!stamp(value.startedAt))
      fail('invalid_dream_climate_live_batch');
    return copy(value);
  }

  assertDedicatedState(){
    this.store.assert();
    const state=this.store.state,batch=this.batch();
    if(!batch){
      const billing=state.dreamClimateLiveBilling;
      const ownBilling=billing===undefined||
        (billing?.version===1&&billing.accounts&&Object.keys(billing.accounts).length===1&&
         Object.hasOwn(billing.accounts,liveAllowanceId)&&
         Object.keys(billing.accounts[liveAllowanceId].attempts).length===0&&
         billing.accounts[liveAllowanceId].runIds.length===0);
      if(!ownBilling||own(state,liveJournalKey)!==undefined||
         Object.keys(state.runs).length||Object.keys(state.requests).length||
         Object.keys(state.sessions).length||Object.keys(state.entries).length||
         Object.keys(state.recalls).length||state.billing!==undefined)
        fail('dream_climate_live_store_not_dedicated');
      return;
    }
    if(state.dreamClimateLiveVersion!==liveRuntimeVersion||
       Object.keys(state.runs).length!==batch.runIds.length||
       !Object.keys(state.runs).every(id=>batch.runIds.includes(id)))
      fail('dream_climate_live_runtime_identity_mismatch');
    for(const [index,runId] of batch.runIds.entries()){
      const run=own(state.runs,runId);
      if(!run||run.id!==runId||run.ordinal!==index+1||
         run.requestId!==batch.requestIds[index]||run.sessionId!==batch.sessionIds[index]||
         !safeId(run.status)||!Array.isArray(run.draftScenes)||!Array.isArray(run.attempts))
        fail('dream_climate_live_run_identity_mismatch');
      if(run.diagnostics!==undefined&&(!Array.isArray(run.diagnostics)||
         run.diagnostics.length>dreamClimateCallsPerRun))
        fail('dream_climate_live_run_identity_mismatch');
      if(run.scenes!==undefined&&(!Array.isArray(run.scenes)||run.scenes.length!==3))
        fail('dream_climate_live_run_identity_mismatch');
    }
    for(const [index,requestId] of batch.requestIds.entries()){
      const receipt=own(state.requests,requestId);
      if(!receipt||receipt.runId!==batch.runIds[index]||
         receipt.sessionId!==batch.sessionIds[index]||
         typeof receipt.fingerprint!=='string'||!/^[a-f0-9]{64}$/.test(receipt.fingerprint))
        fail('dream_climate_live_run_identity_mismatch');
      if(own(state.sessions,batch.sessionIds[index])!==batch.runIds[index])
        fail('dream_climate_live_run_identity_mismatch');
    }
    if(Object.keys(state.requests).length!==liveRunCount||
       Object.keys(state.sessions).length!==liveRunCount)
      fail('dream_climate_live_run_identity_mismatch');
    for(const entry of Object.values(state.entries)){
      if(!batch.runIds.includes(entry?.runId)||
         !['dream',liveFirstFeelingOrigin].includes(entry?.origin))
        fail('dream_climate_live_store_not_dedicated');
    }
    if(Object.keys(state.recalls).length||state.billing!==undefined||
       state.dreamClimateLiveBilling?.version!==1||
       Object.keys(state.dreamClimateLiveBilling.accounts).length!==1||
       !Object.hasOwn(state.dreamClimateLiveBilling.accounts,liveAllowanceId))
      fail('dream_climate_live_store_not_dedicated');
  }

  assertIdentity(id){
    this.assertDedicatedState();
    const run=this.run(id),batch=this.batch(),identity=verifyLiveIdentity();
    if(!batch||hash(identity)!==hash(this.identity)||
       run.protocolVersion!==dreamClimateProtocolVersion||
       run.runtimeVersion!==liveRuntimeVersion||
       run.normalizationVersion!==dreamClimateNormalizationVersion||
       run.identityHash!==identity.liveIdentityHash||run.matrixHash!==identity.matrixHash||
       run.releaseHash!==identity.releaseHash||run.allowanceId!==liveAllowanceId||
       run.allowanceHash!==this.allowanceHash||run.ordinal!==batch.runIds.indexOf(run.id)+1||
       !run.snapshot||hash(run.snapshot)!==hash(dreamClimateCanonicalSnapshot)||
       hash(run.sourceRefs)!==hash(dreamClimateSourceRefs)||
       hash(run.plan)!==hash(liveMatrix[run.ordinal-1].plan)||
       hash(this.ledger.account(liveAllowanceId).allowance)!==this.allowanceHash)
      fail('dream_climate_live_runtime_identity_mismatch');
    let before=neutral();
    for(const scene of run.draftScenes){
      const value=normalizeDreamClimateCheckpoint(scene,before);before=value.after;
    }
    return run;
  }

  startBatch(){
    this.store.assert();
    const existing=this.batch();
    if(existing)return existing;
    this.assertDedicatedState();
    assertLiveMatrix();
    const startedAt=this.now();
    for(const [index,runId] of liveRunIds.entries()){
      const requestId=liveRunRequestIds[index],sessionId=liveRunSessionIds[index],ordinal=index+1;
      const plan=copy(liveMatrix[index].plan);
      const fingerprint=hash({protocolVersion:dreamClimateProtocolVersion,
        runtimeVersion:liveRuntimeVersion,identityHash:this.identity.liveIdentityHash,
        matrixHash:this.identity.matrixHash,releaseHash:this.identity.releaseHash,
        requestId,sessionId,runId,ordinal,plan});
      this.store.state.requests[requestId]={runId,sessionId,fingerprint};
      this.store.state.sessions[sessionId]=runId;
      this.store.state.runs[runId]={id:runId,status:'queued',ordinal,plan,
        requestId,sessionId,snapshot:copy(dreamClimateCanonicalSnapshot),
        sourceRefs:copy(dreamClimateSourceRefs),
        config:{scenesPerRun:dreamClimateScenesPerRun,callsPerRun:dreamClimateCallsPerRun,
          maxCalls:dreamClimateMaxCalls,requestByteLimit:dreamClimateRequestByteLimit,
          maxOutputTokens:liveMaxOutputTokens},
        draftScenes:[],attempts:[],diagnostics:[],protocolVersion:dreamClimateProtocolVersion,
        runtimeVersion:liveRuntimeVersion,normalizationVersion:dreamClimateNormalizationVersion,
        identityHash:this.identity.liveIdentityHash,matrixHash:this.identity.matrixHash,
        releaseHash:this.identity.releaseHash,allowanceId:liveAllowanceId,
        allowanceHash:this.allowanceHash};
    }
    this.store.state[liveBatchKey]={version:1,runIds:[...liveRunIds],
      requestIds:[...liveRunRequestIds],sessionIds:[...liveRunSessionIds],
      matrixHash:this.identity.matrixHash,startedAt};
    this.assertDedicatedState();
    this.store.save();
    return this.batch();
  }

  rows(id){return this.ledger.status(liveAllowanceId).attempts.filter(row=>row.runId===id);}

  assertCallCapacity(){
    const status=this.ledger.status(liveAllowanceId);
    if(status.calls>=dreamClimateMaxCalls)fail('dream_climate_live_total_call_limit');
    return status.calls;
  }

  status(id){
    const run=this.assertIdentity(id),rows=this.rows(id);
    const settled=rows.filter(row=>row.status==='settled').length;
    const accounting=accountingTotals(rows);
    return {id,ordinal:run.ordinal,status:run.status,
      scenesDrafted:run.draftScenes.length,scenesSaved:run.scenes?.length??0,
      wakeSaved:run.wake!==undefined,entryId:run.entryId??null,error:run.error??null,
      billing:{calls:rows.length,settled,unknown:rows.length-settled,
        ...accounting,heldOrSpentMicroCny:accounting.combinedAccountingMicroCny}};
  }

  batchStatus(){
    const batch=this.batch();
    if(!batch)return {started:false,runs:[]};
    return {started:true,runIds:copy(batch.runIds),runs:batch.runIds.map(id=>this.status(id))};
  }

  async executeBatch(){
    this.assertDedicatedState();
    const batch=this.batch();
    if(!batch)fail('dream_climate_live_batch_not_started');
    for(const runId of batch.runIds){
      const current=this.run(runId).status;
      if(current==='completed')continue;
      if(current!=='queued')break;
      const status=await this.executeRun(runId);
      if(status.status!=='completed')break;
    }
    return this.batchStatus();
  }

  async executeRun(id){
    const run=this.assertIdentity(id);
    const batch=this.batch();
    if(this.active.has(id))fail('run_busy');
    if(run.status!=='queued')return this.status(id);
    if(batch.runIds.slice(0,run.ordinal-1).some(runId=>this.run(runId).status!=='completed'))
      fail('dream_climate_live_previous_run_incomplete');
    if(!this.enabled)fail('transport_disabled');
    const controller=new AbortController();
    this.active.set(id,controller);
    run.status='running';delete run.error;
    try{
      this.store.save();
      while(run.status==='running'&&run.draftScenes.length<dreamClimateScenesPerRun){
        await this.stage(run,'scene',controller.signal);
      }
      if(run.status==='running')await this.stage(run,'wake',controller.signal);
    }catch(error){
      if(this.store.poisoned)throw error;
      if(run.status==='running'){
        run.status=uncertainCodes.has(error.message)?'uncertain':'failed';
        run.error=error.message||'dream_climate_live_execution_failed';
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

  recordDiagnostic(run,diagnostic){
    if(!Array.isArray(run.diagnostics))run.diagnostics=[];
    if(run.diagnostics.some(value=>value.requestId===diagnostic.requestId&&
       value.stage===diagnostic.stage))return;
    if(run.diagnostics.length>=dreamClimateCallsPerRun)return;
    run.diagnostics.push(diagnostic);
    if(diagnostic.stage==='wake'&&diagnostic.subreason){
      run.validationSubreason=diagnostic.subreason;
      run.validationOriginalError=diagnostic.originalError;
    }
  }

  async stage(run,stage,signal){
    this.assertIdentity(run.id);
    if(!this.enabled)fail('transport_disabled');
    if(run.status!=='running'||signal.aborted)fail('cancelled');
    const index=run.draftScenes.length;
    if(stage==='scene'?index>=dreamClimateScenesPerRun:
       stage!=='wake'||index!==dreamClimateScenesPerRun)fail('invalid_dream_climate_stage');
    const request=buildDreamStageRequest({run:run.plan,previousScenes:copy(run.draftScenes),stage});
    assertRequestBounds(request);
    const rows=this.rows(run.id);
    if(rows.length>=dreamClimateCallsPerRun)fail('dream_climate_live_run_call_limit');
    this.assertCallCapacity();
    const requestId=`${run.id}-${stage}-${index}`;
    if(!safeId(requestId)||rows.some(row=>row.requestId===requestId))fail('ambiguous_attempt');
    const fingerprint=hash({protocolVersion:dreamClimateProtocolVersion,
      runtimeVersion:liveRuntimeVersion,identityHash:this.identity.liveIdentityHash,
      matrixHash:this.identity.matrixHash,releaseHash:this.identity.releaseHash,
      runId:run.id,runOrdinal:run.ordinal,request:request.body});
    const reservation=this.ledger.reserve(liveAllowanceId,{requestId,runId:run.id,
      fingerprint,sourceRefs:copy(run.sourceRefs),maxOutputTokens:liveMaxOutputTokens},this.now());
    if(reservation.replayed)fail('ambiguous_attempt');
    const controller=new AbortController();
    let timer,timedOut=false;
    let response,parsed,settlementCommitted=false,publicationCommitted=false;
    let diagnosticRecorded=false;
    const abort=()=>controller.abort();
    signal.addEventListener('abort',abort,{once:true});
    const active=()=>{
      this.store.assert();
      if(signal.aborted||controller.signal.aborted||this.run(run.id).status!=='running')
        fail('cancelled');
      if(run.sourceRefs.some(source=>this.store.withdrawn.includes(source.id)))
        fail('source_withdrawn');
      this.assertIdentity(run.id);
    };
    const diagnosticFor=(errorCode,{usageValidation,settlement,
      publication='rejected_non_published'}={})=>buildStageDiagnostic({
      runId:run.id,requestId,stage,errorCode,response,parsed,usageValidation,settlement,
      publication,subreason:stableValidationSubreason(errorCode),
      credentialEchoRejected:errorCode==='provider_response_echoed_credential'});
    try{
      this.fault('dream_climate_live_reserved');
      active();
      this.ledger.dispatch(liveAllowanceId,requestId);
      this.fault('dream_climate_live_dispatched');
      const stop=new Promise((_,reject)=>{
        controller.signal.addEventListener('abort',()=>reject(Error('cancelled')),{once:true});
        timer=setTimeout(()=>{timedOut=true;controller.abort();reject(Error('timeout'));},60000);
      });
      response=await Promise.race([Promise.resolve().then(()=>{
        active();
        return this.simulator(copy(request),{signal:controller.signal});
      }),stop]);
      active();
      try{
        parsed=parseDeepSeekResponse(response,{model:liveModelAlias,
          maxOutputTokens:liveMaxOutputTokens});
      }catch(error){
        const code=safeErrorCode(error);
        this.recordDiagnostic(run,diagnosticFor(code,{usageValidation:'unavailable_or_invalid',
          settlement:'unknown'}));
        diagnosticRecorded=true;
        throw error;
      }
      active();
      let value,wakeValue;
      try{
        if(stage==='scene'){
          const before=run.draftScenes.at(-1)?.after??neutral();
          value=normalizeDreamClimateScene(parsed.data,before);
        }else{
          wakeValue=normalizeDreamClimateWake(parsed.data,{previousScenes:run.draftScenes});
          value=wakeValue.wake;
        }
      }catch(error){
        const code=safeErrorCode(error);
        // Valid provider usage is settled exactly once even when content is
        // rejected. Normalization never mutates or repairs the rejected data.
        this.ledger.settle(liveAllowanceId,requestId,parsed.receipt);
        settlementCommitted=true;
        this.recordDiagnostic(run,diagnosticFor(code,{usageValidation:'verified',
          settlement:'settled'}));
        diagnosticRecorded=true;
        throw error;
      }
      active();
      this.ledger.settle(liveAllowanceId,requestId,parsed.receipt);
      settlementCommitted=true;
      active();
      if(stage==='scene'){
        const previousScenes=run.draftScenes.length,previousAttempts=run.attempts.length;
        try{
          run.draftScenes.push(copy(value));
          run.attempts.push({stage,index,state:'committed',billingRequestId:requestId,
            requestBytes:assertRequestBounds(request)});
          this.store.save();
        }catch(error){
          run.draftScenes.length=previousScenes;
          run.attempts.length=previousAttempts;
          if(!this.store.poisoned&&!this.store.closed)
            this.recordDiagnostic(run,diagnosticFor(safeErrorCode(error),
              {usageValidation:'verified',settlement:'settled',publication:'not_published'}));
          throw error;
        }
      }else{
        let prepared;
        try{
          prepared=prepareLivePublication(this.store,{run,wake:value,
            firstFeeling:wakeValue.firstFeeling,firstFeelingOmitted:wakeValue.firstFeelingOmitted,
            wakeRequestId:requestId,recordedAt:this.now()});
        }catch(error){
          if(!this.store.poisoned&&!this.store.closed)
            this.recordDiagnostic(run,diagnosticFor(safeErrorCode(error),
              {usageValidation:'verified',settlement:'settled',publication:'failed_not_published'}));
          diagnosticRecorded=true;
          throw error;
        }
        const previousEntries=copy(this.store.state.entries);
        const hadJournal=Object.hasOwn(this.store.state,liveJournalKey);
        const previousJournal=copy(this.store.state[liveJournalKey]);
        const previousRun=copy(run);
        try{
          this.store.state.entries[prepared.dreamId]=prepared.dreamEntry;
          if(prepared.feelingEntry)
            this.store.state.entries[prepared.feelingEntry.id]=prepared.feelingEntry;
          this.store.state[liveJournalKey]=prepared.journal;
          run.scenes=copy(run.draftScenes);
          run.wake=copy(value);run.entryId=prepared.dreamId;run.status='completed';
          run.attempts.push({stage,index,state:'committed',billingRequestId:requestId,
            wakeRequestId:requestId,requestBytes:assertRequestBounds(request),
            firstFeelingStatus:
              wakeValue.firstFeelingOmitted?'omitted':wakeValue.firstFeeling.status});
          this.store.save();
          publicationCommitted=true;
        }catch(error){
          this.store.state.entries=previousEntries;
          if(hadJournal)this.store.state[liveJournalKey]=previousJournal;
          else delete this.store.state[liveJournalKey];
          for(const key of Object.keys(run))delete run[key];
          Object.assign(run,previousRun);
          if(!this.store.poisoned&&!this.store.closed)
            this.recordDiagnostic(run,diagnosticFor(safeErrorCode(error),
              {usageValidation:'verified',settlement:'settled',publication:'failed_not_published'}));
          diagnosticRecorded=true;
          throw error;
        }
      }
      if(stage==='scene')this.fault('dream_climate_live_scene_saved');
      else this.fault('dream_climate_live_wake_saved');
    }catch(error){
      controller.abort();
      const code=safeErrorCode(error,{timedOut});
      if(!settlementCommitted&&!this.store.poisoned&&!this.store.closed){
        if(!diagnosticRecorded){
          this.recordDiagnostic(run,diagnosticFor(code,{usageValidation:parsed?
            'invalid_rejected':'unavailable',settlement:'unknown',publication:'not_published'}));
        }
        try{
          const unsettled=this.rows(run.id).find(row=>row.requestId===requestId);
          if(unsettled?.status==='settled')this.store.poisoned=true;
          else this.ledger.unknown(liveAllowanceId,requestId);
        }catch{}
      }else if(settlementCommitted&&!diagnosticRecorded&&!publicationCommitted&&
               !this.store.poisoned&&!this.store.closed){
        this.recordDiagnostic(run,diagnosticFor(code,{usageValidation:'verified',
          settlement:'settled',publication:'failed_not_published'}));
      }
      fail(mapStageError(error,stage,timedOut));
    }finally{clearTimeout(timer);signal.removeEventListener('abort',abort);}
  }

  readReceipt({now=this.now()}={}){
    return extractLiveReceipt(this.store,{now});
  }

  close(){
    if(this.active.size)fail('active_runs');
    this.store.close();
  }
}

export {livePerCallMaximumMicroCny};
