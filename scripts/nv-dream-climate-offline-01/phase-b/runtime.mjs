// Offline-review three-run runtime. It has no credential loader, environment
// fallback, retry, replacement run, fourth run or later recollection.
import path from 'node:path';
import {BudgetLedger,validateAllowance} from '../../../src/budget-ledger.js';
import {parseDeepSeekResponse} from '../../../src/deepseek-protocol.js';
import {hash,neutral,own,safeId} from '../../../src/contract.js';
import {copy,fail,Store} from '../../../src/store.js';
import {
  assertRequestBounds,buildDreamStageRequest,dreamClimateCanonicalSnapshot,
  dreamClimateNormalizationVersion,dreamClimateProtocolVersion,dreamClimateSourceRefs,
  normalizeDreamClimateCheckpoint,normalizeDreamClimateScene,normalizeDreamClimateWake
} from '../protocol.mjs';
import {liveAllowance,livePerCallMaximumMicroCny} from './config.mjs';
import {r3Profile} from './profile.mjs';
import {extractManagedReceipt,prepareManagedPublication} from './records.mjs';
import {
  buildStageDiagnostic,safeErrorCode,stableValidationSubreason
} from './diagnostics.mjs';

const optionKeys=['simulator','enabled','now','fault'];
const batchKeys=['version','runIds','requestIds','sessionIds','matrixHash','startedAt'];
const exact=(value,names)=>value&&typeof value==='object'&&!Array.isArray(value)&&
  Object.keys(value).length===names.length&&names.every(name=>Object.hasOwn(value,name));
const stamp=value=>Number.isSafeInteger(value)&&value>=0;
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

export {liveAllowance};

function ledgerFacade(store,billingKey){
  return {
    state:{get billing(){return store.state[billingKey];},
      set billing(value){store.state[billingKey]=value;}},
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

export class ManagedDreamClimateRuntime {
  constructor(directory,options={},profile){
    if(!profile||typeof profile!=='object'||typeof profile.verifyIdentity!=='function')
      fail('invalid_dream_climate_runtime_profile');
    if(!options||typeof options!=='object'||Array.isArray(options)||
       Object.keys(options).some(key=>!optionKeys.includes(key)))
      fail('invalid_dream_climate_live_runtime_options');
    if(typeof options.simulator!=='function'||
       options.fault!==undefined&&typeof options.fault!=='function'||
       options.now!==undefined&&typeof options.now!=='function'||
       options.enabled!==undefined&&typeof options.enabled!=='boolean')
      fail('invalid_dream_climate_live_runtime_options');
    if(typeof directory!=='string'||path.basename(path.resolve(directory))!==profile.storeBasename)
      fail('dream_climate_live_dedicated_store_required');
    this.store=new Store(directory);
    try{
      if(path.basename(this.store.directory)!==profile.storeBasename)
        fail('dream_climate_live_dedicated_store_required');
      this.store.assert();
      if(this.store.withdrawn.length||this.store.deletions.length)
        fail('dream_climate_live_store_not_dedicated');
      const cleanStateKeys=new Set(['version','runs','requests','sessions','entries','recalls',
        profile.runtimeStateKey,profile.billingKey,profile.batchKey,profile.journalKey]);
      if(Object.keys(this.store.state).some(key=>!cleanStateKeys.has(key)))
        fail('dream_climate_live_store_not_dedicated');
      Object.defineProperty(this,'profile',{value:profile});
      this.assertDedicatedState();
      const identity=profile.verifyIdentity();
      const allowance=validateAllowance(copy(profile.allowance));
      if(allowance.mode!=='live'||allowance.id!==profile.allowanceId||
         allowance.limits.maxRuns!==profile.runCount||allowance.limits.maxCalls!==profile.maxCalls||
         allowance.limits.maxMicroCny!==profile.allowanceCapMicroCny||
         allowance.pricing.contextTokenLimit!==profile.requestByteLimit||
         allowance.pricing.model!==profile.modelAlias||
         allowance.pricing.inputMicroCnyPerMillion!==2000000||
         allowance.pricing.outputMicroCnyPerMillion!==8000000)
        fail('dream_climate_live_allowance_mismatch');
      const ledger=new BudgetLedger(ledgerFacade(this.store,profile.billingKey));
      ledger.approve(allowance);
      for(const account of Object.values(this.store.state[profile.billingKey].accounts)){
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
      if(this.store.state[profile.runtimeStateKey]!==undefined&&
         this.store.state[profile.runtimeStateKey]!==profile.runtimeVersion)
        fail('dream_climate_live_runtime_identity_mismatch');
      this.store.state[profile.runtimeStateKey]=profile.runtimeVersion;
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
    const value=own(this.store.state,this.profile.batchKey);
    if(value===undefined)return null;
    if(!exact(value,batchKeys)||value.version!==1||
       !Array.isArray(value.runIds)||!Array.isArray(value.requestIds)||
       !Array.isArray(value.sessionIds)||hash(value.runIds)!==hash([...this.profile.runIds])||
       hash(value.requestIds)!==hash([...this.profile.requestIds])||
       hash(value.sessionIds)!==hash([...this.profile.sessionIds])||
       value.matrixHash!==this.profile.matrixHash||!stamp(value.startedAt))
      fail('invalid_dream_climate_live_batch');
    return copy(value);
  }

  assertDedicatedState(){
    this.store.assert();
    const state=this.store.state,batch=this.batch();
    if(!batch){
      const billing=state[this.profile.billingKey];
      const ownBilling=billing===undefined||
        (billing?.version===1&&billing.accounts&&Object.keys(billing.accounts).length===1&&
         Object.hasOwn(billing.accounts,this.profile.allowanceId)&&
         Object.keys(billing.accounts[this.profile.allowanceId].attempts).length===0&&
         billing.accounts[this.profile.allowanceId].runIds.length===0);
      if(!ownBilling||own(state,this.profile.journalKey)!==undefined||
         Object.keys(state.runs).length||Object.keys(state.requests).length||
         Object.keys(state.sessions).length||Object.keys(state.entries).length||
         Object.keys(state.recalls).length||state.billing!==undefined)
        fail('dream_climate_live_store_not_dedicated');
      return;
    }
    if(state[this.profile.runtimeStateKey]!==this.profile.runtimeVersion||
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
         run.diagnostics.length>this.profile.callsPerRun))
        fail('dream_climate_live_run_identity_mismatch');
      if(run.scenes!==undefined&&(!Array.isArray(run.scenes)||
         run.scenes.length!==this.profile.scenesPerRun))
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
    if(Object.keys(state.requests).length!==this.profile.runCount||
       Object.keys(state.sessions).length!==this.profile.runCount)
      fail('dream_climate_live_run_identity_mismatch');
    for(const entry of Object.values(state.entries)){
      if(!batch.runIds.includes(entry?.runId)||
         !['dream',this.profile.firstFeelingOrigin].includes(entry?.origin))
        fail('dream_climate_live_store_not_dedicated');
    }
    if(Object.keys(state.recalls).length||state.billing!==undefined||
       state[this.profile.billingKey]?.version!==1||
       Object.keys(state[this.profile.billingKey].accounts).length!==1||
       !Object.hasOwn(state[this.profile.billingKey].accounts,this.profile.allowanceId))
      fail('dream_climate_live_store_not_dedicated');
  }

  assertIdentity(id){
    this.assertDedicatedState();
    const run=this.run(id),batch=this.batch(),identity=this.profile.verifyIdentity();
    if(!batch||hash(identity)!==hash(this.identity)||
       run.protocolVersion!==this.profile.protocolVersion||
       run.runtimeVersion!==this.profile.runtimeVersion||
       run.normalizationVersion!==dreamClimateNormalizationVersion||
       run.identityHash!==this.profile.identityHash(identity)||
       run.matrixHash!==this.profile.matrixHash||
       run.releaseHash!==this.profile.releaseHash(identity)||
       run.allowanceId!==this.profile.allowanceId||
       run.allowanceHash!==this.allowanceHash||run.ordinal!==batch.runIds.indexOf(run.id)+1||
       !run.snapshot||hash(run.snapshot)!==hash(dreamClimateCanonicalSnapshot)||
       hash(run.sourceRefs)!==hash(dreamClimateSourceRefs)||
       hash(run.plan)!==hash(this.profile.matrix[run.ordinal-1].plan)||
       hash(this.ledger.account(this.profile.allowanceId).allowance)!==this.allowanceHash)
      fail('dream_climate_live_runtime_identity_mismatch');
    let before=neutral();
    for(const [index,scene] of run.draftScenes.entries()){
      const value=normalizeDreamClimateCheckpoint(scene,before,{sceneIndex:index,
        requestId:`${run.id}-scene-${index}`});before=value.after;
    }
    return run;
  }

  startBatch(){
    this.store.assert();
    const existing=this.batch();
    if(existing)return existing;
    this.assertDedicatedState();
    this.profile.assertMatrix();
    const startedAt=this.now();
    for(const [index,runId] of this.profile.runIds.entries()){
      const requestId=this.profile.requestIds[index],sessionId=this.profile.sessionIds[index],ordinal=index+1;
      const plan=copy(this.profile.matrix[index].plan);
      const fingerprint=hash({protocolVersion:this.profile.protocolVersion,
        runtimeVersion:this.profile.runtimeVersion,
        identityHash:this.profile.identityHash(this.identity),
        matrixHash:this.profile.matrixHash,releaseHash:this.profile.releaseHash(this.identity),
        requestId,sessionId,runId,ordinal,plan});
      this.store.state.requests[requestId]={runId,sessionId,fingerprint};
      this.store.state.sessions[sessionId]=runId;
      this.store.state.runs[runId]={id:runId,status:'queued',ordinal,plan,
        requestId,sessionId,snapshot:copy(dreamClimateCanonicalSnapshot),
        sourceRefs:copy(dreamClimateSourceRefs),
        config:{scenesPerRun:this.profile.scenesPerRun,callsPerRun:this.profile.callsPerRun,
          maxCalls:this.profile.maxCalls,requestByteLimit:this.profile.requestByteLimit,
          maxOutputTokens:this.profile.maxOutputTokens},
        draftScenes:[],attempts:[],diagnostics:[],protocolVersion:this.profile.protocolVersion,
        runtimeVersion:this.profile.runtimeVersion,
        normalizationVersion:dreamClimateNormalizationVersion,
        identityHash:this.profile.identityHash(this.identity),
        matrixHash:this.profile.matrixHash,
        releaseHash:this.profile.releaseHash(this.identity),allowanceId:this.profile.allowanceId,
        allowanceHash:this.allowanceHash};
    }
    this.store.state[this.profile.batchKey]={version:1,runIds:[...this.profile.runIds],
      requestIds:[...this.profile.requestIds],sessionIds:[...this.profile.sessionIds],
      matrixHash:this.profile.matrixHash,startedAt};
    this.assertDedicatedState();
    this.store.save();
    return this.batch();
  }

  rows(id){return this.ledger.status(this.profile.allowanceId).attempts.filter(row=>row.runId===id);}

  assertCallCapacity(){
    const status=this.ledger.status(this.profile.allowanceId);
    if(status.calls>=this.profile.maxCalls)fail('dream_climate_live_total_call_limit');
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
      while(run.status==='running'&&run.draftScenes.length<this.profile.scenesPerRun){
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
    if(run.diagnostics.length>=this.profile.callsPerRun)return;
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
    if(stage==='scene'?index>=this.profile.scenesPerRun:
       stage!=='wake'||index!==this.profile.scenesPerRun)fail('invalid_dream_climate_stage');
    const request=buildDreamStageRequest({run:run.plan,previousScenes:copy(run.draftScenes),stage});
    assertRequestBounds(request);
    const rows=this.rows(run.id);
    if(rows.length>=this.profile.callsPerRun)fail('dream_climate_live_run_call_limit');
    this.assertCallCapacity();
    const requestId=`${run.id}-${stage}-${index}`;
    if(!safeId(requestId)||rows.some(row=>row.requestId===requestId))fail('ambiguous_attempt');
    const fingerprint=hash({protocolVersion:this.profile.protocolVersion,
      runtimeVersion:this.profile.runtimeVersion,
      identityHash:this.profile.identityHash(this.identity),
      matrixHash:this.profile.matrixHash,releaseHash:this.profile.releaseHash(this.identity),
      runId:run.id,runOrdinal:run.ordinal,request:request.body});
    const reservation=this.ledger.reserve(this.profile.allowanceId,{requestId,runId:run.id,
      fingerprint,sourceRefs:copy(run.sourceRefs),maxOutputTokens:this.profile.maxOutputTokens},
      this.now());
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
      credentialEchoRejected:errorCode==='provider_response_echoed_credential',
      version:this.profile.diagnosticVersion});
    try{
      this.fault('dream_climate_live_reserved');
      active();
      this.ledger.dispatch(this.profile.allowanceId,requestId);
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
        parsed=parseDeepSeekResponse(response,{model:this.profile.modelAlias,
          maxOutputTokens:this.profile.maxOutputTokens});
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
          value=normalizeDreamClimateScene(parsed.data,before,{sceneIndex:index,requestId});
        }else{
          wakeValue=normalizeDreamClimateWake(parsed.data,{previousScenes:run.draftScenes});
          value=wakeValue.wake;
        }
      }catch(error){
        const code=safeErrorCode(error);
        // Valid provider usage is settled exactly once even when content is
        // rejected. Normalization never mutates or repairs the rejected data.
        this.ledger.settle(this.profile.allowanceId,requestId,parsed.receipt);
        settlementCommitted=true;
        this.recordDiagnostic(run,diagnosticFor(code,{usageValidation:'verified',
          settlement:'settled'}));
        diagnosticRecorded=true;
        throw error;
      }
      active();
      this.ledger.settle(this.profile.allowanceId,requestId,parsed.receipt);
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
          prepared=prepareManagedPublication(this.store,{run,wake:value,
            firstFeeling:wakeValue.firstFeeling,firstFeelingOmitted:wakeValue.firstFeelingOmitted,
            wakeRequestId:requestId,recordedAt:this.now()},this.profile);
        }catch(error){
          if(!this.store.poisoned&&!this.store.closed)
            this.recordDiagnostic(run,diagnosticFor(safeErrorCode(error),
              {usageValidation:'verified',settlement:'settled',publication:'failed_not_published'}));
          diagnosticRecorded=true;
          throw error;
        }
        const previousEntries=copy(this.store.state.entries);
        const hadJournal=Object.hasOwn(this.store.state,this.profile.journalKey);
        const previousJournal=copy(this.store.state[this.profile.journalKey]);
        const previousRun=copy(run);
        try{
          this.store.state.entries[prepared.dreamId]=prepared.dreamEntry;
          if(prepared.feelingEntry)
            this.store.state.entries[prepared.feelingEntry.id]=prepared.feelingEntry;
          this.store.state[this.profile.journalKey]=prepared.journal;
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
          if(hadJournal)this.store.state[this.profile.journalKey]=previousJournal;
          else delete this.store.state[this.profile.journalKey];
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
          else this.ledger.unknown(this.profile.allowanceId,requestId);
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
    return extractManagedReceipt(this.store,{now,profile:this.profile});
  }

  close(){
    if(this.active.size)fail('active_runs');
    this.store.close();
  }
}

export class DreamClimateLiveRuntime extends ManagedDreamClimateRuntime {
  constructor(directory,options={}){
    super(directory,options,r3Profile);
  }
}

export {livePerCallMaximumMicroCny};
