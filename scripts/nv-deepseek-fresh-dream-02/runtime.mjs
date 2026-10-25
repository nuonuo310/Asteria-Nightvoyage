// Fixed two-scene plus wake runtime for the new one-use allowance.
import {BudgetedNightvoyage} from '../../src/budgeted-runtime.js';
import {copy, fail} from '../../src/store.js';
import {hash} from '../../src/contract.js';
import {buildInlineRequest} from '../../src/inline-evidence-protocol.js';
import {readOneDreamContract,oneDreamInput,oneDreamMaximumMicroCny} from './contract.mjs';
import {readOneDreamAuthorization, requireOneDreamAuthorization, revokeOneDreamAuthorization, oneDreamRunConfig} from './authorization.mjs';
import {OneDreamClient} from './client.mjs';
import {freshDreamInputTokenBound,oneDreamAllowanceId, oneDreamAuthorizationVersion, oneDreamLoopbackKind, oneDreamRequestId, oneDreamSessionId} from './policy.mjs';
import {freshDreamMaximumCost} from './ledger.mjs';

const checked=store=>{const record=readOneDreamAuthorization(store);if(!record.terms.contract.implementationReady||!record.terms.contract.source||record.terms.confirmation.accountCurrency!=='CNY')fail('one_dream_runtime_authorization_required');return record;};
export class OneDreamRuntime extends BudgetedNightvoyage{
  static assertInlineLiveConstruction(directory,allowance){
    const record=requireOneDreamAuthorization(directory,{mode:'live'});
    if(hash(allowance)!==hash(record.terms.allowance)||record.terms.contract.implementationReady!==true)fail('one_dream_runtime_authorization_required');
  }
  constructor(directory,{mode='live',loopback,enabled=false,timeoutMs=60000,fault=()=>{}}={}){
    if(!['live','offline'].includes(mode)||typeof enabled!=='boolean'||!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>60000||typeof fault!=='function')fail('one_dream_runtime_override_forbidden');
    if(mode==='offline'&&(loopback?.kind!==oneDreamLoopbackKind||loopback.host!=='127.0.0.1'||typeof loopback.transport!=='function'))fail('one_dream_loopback_required');
    if(mode==='live'&&loopback!==undefined)fail('one_dream_runtime_override_forbidden');
    const authorizationMode=mode==='offline'?'stub':'live',record=requireOneDreamAuthorization(directory,{mode:authorizationMode});
    if(mode==='offline'&&record.terms.dispatchKind!=='rehearsal'||mode==='live'&&record.terms.dispatchKind!=='provider')fail('one_dream_dispatch_kind_mismatch');
    super(directory,{allowance:record.terms.allowance,mode:authorizationMode,protocol:'inline-evidence-v1',enabled,timeoutMs,fault,fetchImpl:mode==='offline'?loopback.transport:undefined});
    try{
      const current=checked(this.store);if(hash(current.terms.allowance)!==hash(record.terms.allowance))fail('one_dream_runtime_authorization_required');
      this.oneDreamMode=mode;this.oneDreamLoopback=mode==='offline'?loopback:undefined;this.client.loopback=this.oneDreamLoopback;
      this.provider.identity+=`:${oneDreamAuthorizationVersion}:${current.termsHash}`;
    }catch(error){this.client.close();this.store.close();throw error;}
  }
  beforeBudgetAccount(){return checked(this.store).terms.allowance;}
  createBudgetClient(options){return new OneDreamClient(this.store,options);}
  initialRunMetadata(){const record=checked(this.store);return {...super.initialRunMetadata(),nvDeepSeekOneDreamAuthorizationVersion:oneDreamAuthorizationVersion,nvDeepSeekOneDreamAuthorizationHash:record.termsHash};}
  assertRunIdentity(id){
    const record=checked(this.store);super.assertRunIdentity(id);const run=this.run(id),expected=oneDreamInput(record.terms.contract);
    if(run.nvDeepSeekOneDreamAuthorizationVersion!==oneDreamAuthorizationVersion||run.nvDeepSeekOneDreamAuthorizationHash!==record.termsHash||hash(run.snapshot)!==hash(expected))fail('one_dream_authorized_stage_mismatch');
  }
  start(...args){if(args.length)fail('one_dream_fixed_run_required');const record=checked(this.store);return super.start(oneDreamRequestId,oneDreamSessionId,oneDreamInput(record.terms.contract),record.terms.runConfig);}
  prepare({resume=false,dispatchKind,create=true}={}){
    const record=checked(this.store);if(record.terms.dispatchKind!==dispatchKind)fail('one_dream_dispatch_kind_mismatch');
    if(resume&&!this.store.state.requests[oneDreamRequestId])fail('one_dream_explicit_resume_requires_existing_run');
    if(!create&&!this.store.state.requests[oneDreamRequestId]){
      const state=this.client.ledger.status(oneDreamAllowanceId);if(state.calls||state.runs)fail('one_dream_stage_reservation_mismatch');
      const request=buildInlineRequest({stage:'scene',index:0,snapshot:oneDreamInput(record.terms.contract),scenes:[]},{model:'deepseek-flash',maxOutputTokens:400});
      return {completed:false,id:null,contractHash:record.terms.contractHash,termsHash:record.termsHash,nextRequestBytes:Buffer.byteLength(JSON.stringify(request.body)),nextReservationMicroCny:freshDreamMaximumCost(record.terms.allowance.pricing,400).toString()};
    }
    const id=this.start(),run=this.run(id);this.assertExecutionOwner(run);this.assertRunIdentity(id);
    if(run.status==='completed')return {completed:true,id};
    if(hash(run.config)!==hash(oneDreamRunConfig(record.terms.contract))||hash(run.snapshot)!==hash(oneDreamInput(record.terms.contract)))fail('one_dream_authorized_stage_mismatch');
    if(resume){if(!['uncertain','failed'].includes(run.status))fail('one_dream_not_resumable');this.assertInlineResumePrefix(id);}else if(run.status!=='queued')fail('one_dream_explicit_resume_required');
    const state=this.client.ledger.status(oneDreamAllowanceId),rows=state.attempts;
    if(rows.some(row=>row.runId!==id||row.status!=='settled'))fail('one_dream_ambiguous_attempt');
    if(rows.length!==run.scenes.length||run.attempts.length!==run.scenes.length)fail('one_dream_stage_reservation_mismatch');
    const cost=freshDreamMaximumCost(record.terms.allowance.pricing,400),context=freshDreamInputTokenBound;
    if(state.calls>=3||BigInt(state.heldOrSpentMicroCny)+cost>oneDreamMaximumMicroCny||rows.reduce((sum,row)=>sum+(row.usage?.inputTokens??context),0)+context>run.config.inputTokens||rows.reduce((sum,row)=>sum+(row.usage?.outputTokens??400),0)+400>run.config.outputTokens)fail('one_dream_allowance_exhausted');
    const request=buildInlineRequest({stage:run.scenes.length<2?'scene':'wake',index:run.scenes.length,snapshot:run.snapshot,scenes:run.scenes},{model:'deepseek-flash',maxOutputTokens:400});
    return {completed:false,id,contractHash:record.terms.contractHash,termsHash:record.termsHash,nextRequestBytes:Buffer.byteLength(JSON.stringify(request.body)),nextReservationMicroCny:cost.toString()};
  }
  revokeAuthorization(){const record=revokeOneDreamAuthorization(this.store);this.client.close();return record;}
}
export function oneDreamRunSummary(engine,id){
  const packet=engine.result(id),receipt=packet.receipt;
  return {status:receipt.status,stagesSaved:receipt.stagesSaved,scenesSaved:packet.dream?.scenes?.length??0,wakeSaved:packet.wake!==null,originalOrigin:packet.dream?.origin??null,wakeOrigin:packet.wake?.origin??null,materialKind:packet.dream?.materialKind??null,isRealityFact:packet.dream?.isRealityFact??null,billingCalls:receipt.billing?.length??0,settledCalls:receipt.billing?.filter(row=>row.status==='settled').length??0,heldOrSpentMicroCny:receipt.budget?.heldOrSpentMicroCny??null,models:[...new Set((receipt.billing??[]).map(row=>row.model).filter(Boolean))],usage:(receipt.billing??[]).map(row=>({status:row.status,usage:copy(row.usage??null),chargedMicroCny:row.chargedMicroCny}))};
}
