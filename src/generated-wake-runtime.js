// Isolated fake runtime. No fetch, key loader, live selector or old allowance.
import {randomUUID} from 'node:crypto';
import {BudgetLedger,validateAllowance} from './budget-ledger.js';
import {copy,fail} from './store.js';
import {config,hash,neutral,own,safeId,snapshot} from './contract.js';
import {FakeProvider} from './fake-provider.js';
import {Nightvoyage} from './engine.js';
import {parseDeepSeekResponse} from './deepseek-protocol.js';
import {buildGeneratedWakeRequest,normalizeGeneratedWakeResponse,generatedWakeProtocolVersion,generatedWakeRuntimeVersion,generatedWakeIdentity} from './generated-wake-protocol.js';
import {prepareGeneratedWakePublication,readGeneratedWakeView} from './generated-wake-records.js';
import {dreamClimateNormalizationVersion,dreamClimateProtocolVersion,dreamClimateSceneMaterial,normalizeDreamClimateCheckpoint,normalizeDreamClimateScene} from './dream-climate-protocol.js';

const exact=(value,names)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===names.length&&names.every(name=>Object.hasOwn(value,name));
const allowanceKeys=['id','mode','approved','expiresAt','limits','pricing','generatedWakeOffline'];
const optionKeys=['allowance','simulator','enabled','fault','now'];

function generatedConfig(pricing,timeoutMs){
  const value=config(timeoutMs===undefined?{}:{timeoutMs});
  return {...value,inputTokens:pricing.contextTokenLimit*4,outputTokens:1600,
    scenes:3,maxCalls:4,perCallOutput:400};
}

function generatedAllowance(input){
  if(!exact(input,allowanceKeys)||input.generatedWakeOffline!==generatedWakeProtocolVersion)fail('generated_wake_offline_allowance_required');
  const allowance=validateAllowance({id:input.id,mode:input.mode,approved:input.approved,expiresAt:input.expiresAt,limits:input.limits,pricing:input.pricing});
  if(allowance.mode!=='stub'||allowance.pricing.model!=='deepseek-flash'||allowance.limits.maxCalls<4)fail('generated_wake_stub_only');
  return allowance;
}

function ledgerFacade(store){
  return {state:{get billing(){return store.state.generatedWakeBilling;},set billing(value){store.state.generatedWakeBilling=value;}},
    get withdrawn(){return store.withdrawn;},get poisoned(){return store.poisoned;},set poisoned(value){store.poisoned=value;},
    assert:()=>store.assert(),save:()=>store.save()};
}

class OfflineGeneratedWakeProvider extends FakeProvider{
  constructor(simulator){super();this.simulator=simulator;this.identity=`${generatedWakeRuntimeVersion}:generated-wake-fake`;}
}

export class GeneratedWakeRehearsal extends Nightvoyage{
  executionFamily(){return `specialized:${generatedWakeRuntimeVersion}`;}
  constructor(directory,options={}){
    if(!options||typeof options!=='object'||Object.keys(options).some(key=>!optionKeys.includes(key)))fail('invalid_generated_wake_runtime_options');
    if(typeof options.simulator!=='function'||options.fault!==undefined&&typeof options.fault!=='function'||options.now!==undefined&&typeof options.now!=='function')fail('invalid_generated_wake_runtime_options');
    const allowance=generatedAllowance(options.allowance);
    super(directory,{provider:new OfflineGeneratedWakeProvider(options.simulator),fault:options.fault});
    try{
      if(this.store.state.generatedWakeVersion!==undefined&&this.store.state.generatedWakeVersion!==generatedWakeRuntimeVersion)fail('generated_wake_runtime_identity_mismatch');
      this.store.state.generatedWakeVersion=generatedWakeRuntimeVersion;
      const ledger=new BudgetLedger(ledgerFacade(this.store));
      ledger.approve(allowance);
      for(const account of Object.values(this.store.state.generatedWakeBilling.accounts))for(const row of Object.values(account.attempts))if(['reserved','dispatched'].includes(row.status))row.status='unknown';
      this.store.save();
      Object.defineProperties(this,{ledger:{value:ledger},allowanceId:{value:allowance.id},allowanceHash:{value:hash(allowance)},simulator:{value:options.simulator},enabled:{value:options.enabled===true},now:{value:options.now??Date.now}});
      this.provider.identity=`${generatedWakeRuntimeVersion}:generated-wake-fake:${hash(allowance)}`;
    }catch(error){this.store.close();throw error;}
  }
  initialRunMetadata(){
    return {generatedWakeProtocolVersion,generatedWakeRuntimeVersion,appraisalProtocolVersion:generatedWakeProtocolVersion,
      generatedWakeAllowanceId:this.allowanceId,generatedWakeAllowanceHash:this.allowanceHash,
      accountingMode:'isolated_synthetic_generated_wake',dreamClimateProtocolVersion,dreamClimateNormalizationVersion,
      ...generatedWakeIdentity()};
  }
  assertIdentity(id){
    const run=this.run(id);
    this.assertExecutionOwner(run);
    const identity=generatedWakeIdentity();
    if(this.store.state.generatedWakeVersion!==generatedWakeRuntimeVersion||
       run.generatedWakeProtocolVersion!==generatedWakeProtocolVersion||
       run.generatedWakeRuntimeVersion!==generatedWakeRuntimeVersion||
       run.appraisalProtocolVersion!==generatedWakeProtocolVersion||
       run.generatedWakeAllowanceId!==this.allowanceId||
       run.generatedWakeAllowanceHash!==this.allowanceHash||
       run.accountingMode!=='isolated_synthetic_generated_wake'||
       Object.entries(identity).some(([key,value])=>run[key]!==value)||
       hash(this.ledger.account(this.allowanceId).allowance)!==this.allowanceHash)fail('generated_wake_runtime_identity_mismatch');
    if(run.snapshot&&Array.isArray(run.scenes)){
      if(!Array.isArray(run.draftScenes)||run.draftScenes.length!==run.scenes.length||
         hash(run.draftScenes.map(dreamClimateSceneMaterial))!==hash(run.scenes))fail('generated_wake_runtime_identity_mismatch');
      let before=run.snapshot.channels.affect.value??neutral();
      for(const [index,scene] of run.draftScenes.entries()){
        const value=normalizeDreamClimateCheckpoint(scene,before,{sceneIndex:index,
          requestId:`generated-${run.id}-scene-${index}`});before=value.after;
      }
    }
    return run;
  }
  start(requestId,sessionId,input,settings={}){
    if(!settings||typeof settings!=='object'||Array.isArray(settings)||Object.keys(settings).some(key=>key!=='timeoutMs'))fail('invalid_generated_wake_settings');
    const inputCopy=copy(input);
    if(input?.sources?.some(source=>source.grant?.modelEgress!==false))fail('offline_no_egress_fixture_required');
    if(settings.timeoutMs!==undefined&&(!Number.isSafeInteger(settings.timeoutMs)||settings.timeoutMs<=0||settings.timeoutMs>60000))fail('invalid_generated_wake_settings');
    const pricing=this.ledger.account(this.allowanceId).allowance.pricing;
    this.store.assert();
    if(![requestId,sessionId].every(safeId))fail('invalid_request_id');
    const snap=snapshot(inputCopy),runConfig=generatedConfig(pricing,settings.timeoutMs);
    if(snap.sources.some(source=>this.store.withdrawn.includes(source.id)))fail('source_withdrawn');
    const fingerprint=hash({sessionId,snap,config:runConfig,provider:this.provider.identity});
    const previous=own(this.store.state.requests,requestId);
    let runId;
    if(previous){
      if(previous.fingerprint!==fingerprint)fail('request_conflict');
      this.assertExecutionOwner(this.run(previous.runId));runId=previous.runId;
    }else{
      const existing=own(this.store.state.sessions,fingerprint),id=existing??randomUUID();
      if(existing)this.assertExecutionOwner(this.run(existing));
      this.store.state.requests[requestId]={fingerprint,runId:id};
      this.store.state.sessions[fingerprint]=id;
      if(!existing)this.store.state.runs[id]={id,status:snap.channels.memory.availability==='present'?'queued':'skipped',
        snapshot:snap,config:runConfig,sourceIds:snap.sources.map(source=>source.id),scenes:[],attempts:[],
        budget:{calls:0,input:0,output:0},...this.initialRunMetadata(),executionOwner:this.executionOwner()};
      this.store.save();runId=id;
    }
    const run=this.run(runId);
    if(!Array.isArray(run.draftScenes)){run.draftScenes=[];this.store.save();}
    this.assertIdentity(runId);
    return runId;
  }
  rows(id){return this.ledger.status(this.allowanceId).attempts.filter(row=>row.runId===id);}
  status(id){
    this.assertIdentity(id);
    const result=super.status(id),rows=this.rows(id);
    result.generatedWakeBilling=copy(rows);
    result.budget={kind:'synthetic_usage_and_full_context_reservations',calls:rows.length,
      input:rows.reduce((sum,row)=>sum+(row.usage?.inputTokens??0),0),
      output:rows.reduce((sum,row)=>sum+(row.usage?.outputTokens??0),0),
      heldOrSpentMicroCny:rows.reduce((sum,row)=>sum+BigInt(row.chargedMicroCny),0n).toString()};
    return result;
  }
  view(dreamId){return readGeneratedWakeView(this.store,dreamId);}
  execute(id){this.assertIdentity(id);return super.execute(id);}
  resume(id,options={}){
    const run=this.assertIdentity(id),rows=this.rows(id);
    if(Object.keys(options).length||!['failed','uncertain'].includes(run.status)||run.wake!==undefined||
       run.scenes?.length!==3||run.draftScenes?.length!==3||run.attempts?.length!==3||rows.length!==3||
       run.attempts.some((attempt,index)=>attempt.state!=='committed'||attempt.stage!=='scene'||attempt.index!==index)||
       rows.some(row=>row.status!=='settled'))fail('generated_wake_resume_requires_committed_prefix');
    return Nightvoyage.prototype.resume.call(this,id,{retryUnknown:true});
  }
  async stage(run,stage,signal){
    this.assertIdentity(run.id);
    if(!this.enabled)fail('transport_disabled');
    if(run.status!=='running'||signal.aborted)fail('cancelled');
    const payload={snapshot:copy(run.snapshot),scenes:copy(run.scenes),stage,index:run.scenes.length};
    const request=buildGeneratedWakeRequest(payload),input=payload.snapshot,rows=this.rows(run.id);
    const allowance=this.ledger.account(this.allowanceId).allowance;
    const requestId=`generated-${run.id}-${stage}-${run.scenes.length}`;
    const fingerprint=hash({runtimeVersion:generatedWakeRuntimeVersion,runId:run.id,request:request.body,snapshot:input});
    if(rows.length>=run.config.maxCalls&&!rows.some(row=>row.requestId===requestId))fail('budget_exhausted');
    if(!rows.some(row=>row.requestId===requestId)&&
       (rows.reduce((sum,row)=>sum+(row.usage?.inputTokens??allowance.pricing.contextTokenLimit),0)+allowance.pricing.contextTokenLimit>run.config.inputTokens||
        rows.reduce((sum,row)=>sum+(row.usage?.outputTokens??400),0)+400>run.config.outputTokens))fail('budget_exhausted');
    const reservation=this.ledger.reserve(this.allowanceId,{requestId,runId:run.id,fingerprint,sourceRefs:input.sources.map(source=>({id:source.id,version:source.version})),maxOutputTokens:400});
    if(reservation.replayed)fail('ambiguous_attempt');
    const controller=new AbortController();
    let timer,timedOut=false;
    const abort=()=>controller.abort();
    signal.addEventListener('abort',abort,{once:true});
    const active=()=>{
      this.store.assert();
      if(signal.aborted||controller.signal.aborted||run.status!=='running')fail('cancelled');
      if(input.sources.some(source=>this.store.withdrawn.includes(source.id)))fail('source_withdrawn');
      this.assertIdentity(run.id);
    };
    try{
      this.fault('generated_reserved');
      active();
      this.ledger.dispatch(this.allowanceId,requestId);
      this.fault('generated_dispatched');
      const stop=new Promise((_,reject)=>{
        controller.signal.addEventListener('abort',()=>reject(Error('cancelled')),{once:true});
        timer=setTimeout(()=>{timedOut=true;controller.abort();reject(Error('timeout'));},run.config.timeoutMs);
      });
      const response=await Promise.race([Promise.resolve().then(()=>{
        active();
        return this.simulator(copy(request),{signal:controller.signal});
      }),stop]);
      active();
      const {data,receipt}=parseDeepSeekResponse(response,{model:'deepseek-flash',maxOutputTokens:400});
      let value,normalizedWake,sceneMaterial;
      if(stage==='scene'){
        value=normalizeDreamClimateScene(data,run.scenes.at(-1)?.after??input.channels.affect.value??neutral(),
          {sceneIndex:run.scenes.length,requestId});
        sceneMaterial=dreamClimateSceneMaterial(value);
      }else{
        normalizedWake=normalizeGeneratedWakeResponse(data,{previousScenes:run.scenes});
        value=normalizedWake.wake;
      }
      active();
      this.ledger.settle(this.allowanceId,requestId,receipt,accounting=>{
        active();
        const index=run.scenes.length;
        if(stage==='scene'){
          run.draftScenes.push(copy(value));
          run.scenes.push(copy(sceneMaterial));
          run.attempts.push({stage,index,state:'committed',billingRequestId:accounting.requestId});
        }else{
          const recordedAt=this.now();
          if(!Number.isSafeInteger(recordedAt)||recordedAt<0)fail('invalid_generated_wake_clock');
          const prepared=prepareGeneratedWakePublication(this.store,{run,wake:value,
            firstFeeling:normalizedWake.firstFeeling,firstFeelingOmitted:normalizedWake.firstFeelingOmitted,
            wakeRequestId:accounting.requestId,recordedAt});
          this.store.state.entries[prepared.dreamId]=prepared.dreamEntry;
          if(prepared.feelingEntry)this.store.state.entries[prepared.feelingEntry.id]=prepared.feelingEntry;
          this.store.state.generatedWakeJournal=prepared.journal;
          run.wake=copy(value);
          run.wakeAttempt={protocolVersion:generatedWakeProtocolVersion,requestId:accounting.requestId,index,sourceVersion:run.snapshot.version};
          run.entryId=prepared.dreamId;
          run.status='completed';
          run.attempts.push({stage,index,state:'committed',billingRequestId:accounting.requestId,
            wakeRequestId:accounting.requestId,firstFeelingStatus:normalizedWake.firstFeelingOmitted?'omitted':normalizedWake.firstFeeling.status});
        }
      });
      this.fault(stage==='scene'?'generated_scene_saved':'generated_wake_saved');
    }catch(error){
      controller.abort();
      if(!this.store.poisoned&&!this.store.closed){
        try{this.ledger.unknown(this.allowanceId,requestId);}catch{}
      }
      const known=['cancelled','timeout','source_withdrawn','budget_exhausted','allowance_exhausted','allowance_expired','usage_exceeds_reviewed_bounds','cost_exceeds_reservation','storage_io_failure','publication_failed','provider_authentication_failed','provider_rate_limited','provider_http_failure'];
      let mapped=known.includes(error?.message)?error.message:'generated_wake_response_rejected';
      if(error?.message==='generated_wake_fragment_not_grounded')mapped='wake_fragment_not_grounded';
      else if(error?.message?.startsWith('invalid_generated_wake')||error?.message==='generated_wake_output_too_large')mapped=stage==='scene'?'invalid_scene':'invalid_wake';
      if(timedOut)mapped='timeout';
      fail(mapped);
    }finally{clearTimeout(timer);signal.removeEventListener('abort',abort);}
  }
  sceneStep(run,signal){return this.stage(run,'scene',signal);}
  wakeStep(run,signal){return this.stage(run,'wake',signal);}
}
