// Project-owned isolated stub accounting. No production selector or native transport.
import {InlineRehearsal,buildInlineRehearsalRequest,inlineRuntimeVersion} from './inline-evidence-runtime.js';
import {normalizeInlineFixture,fictionalInlineContext} from './inline-evidence-review.js';
import {BudgetLedger,validateAllowance} from '../src/budget-ledger.js';
import {FakeProvider} from '../src/fake-provider.js';
import {Nightvoyage} from '../src/engine.js';
import {parseDeepSeekResponse,normalizeDeepSeekStage} from '../src/deepseek-protocol.js';
import {hash,neutral} from '../src/contract.js';
import {copy,fail} from '../src/store.js';
export const inlineStubVersion='offline-inline-budget-stub-v1';

// Reuse the integer reservation/settlement algorithm, with a separate persisted root.
// A production BudgetLedger cannot find these accounts in state.billing.
function ledgerFacade(store){
  const state={get billing(){return store.state.inlineStubBilling;},set billing(v){store.state.inlineStubBilling=v;}};
  return {state,get withdrawn(){return store.withdrawn;},get poisoned(){return store.poisoned;},set poisoned(v){store.poisoned=v;},assert:()=>store.assert(),save:()=>store.save()};
}
export class InlineBudgetRehearsal extends InlineRehearsal {
  executionFamily(){return `specialized:${inlineStubVersion}`;}
  constructor(directory,options={}){
    if(!options||typeof options!=='object'||Object.keys(options).some(k=>!['allowance','simulator','enabled','fault'].includes(k)))fail('invalid_inline_stub_options');
    const allowance=validateAllowance(options.allowance);
    if(allowance.mode!=='stub'||allowance.protocolVersion!==undefined||allowance.pricing.model!=='deepseek-flash'||(options.enabled!==undefined&&typeof options.enabled!=='boolean'))fail('inline_stub_only');
    super(directory,{simulator:options.simulator,fault:options.fault});
    try{
      if(this.store.state.inlineStubBilling&&this.store.state.inlineStubVersion!==inlineStubVersion)fail('inline_stub_identity_mismatch');
      this.store.state.inlineStubVersion=inlineStubVersion;
      const ledger=new BudgetLedger(ledgerFacade(this.store));ledger.approve(allowance);
      for(const account of Object.values(this.store.state.inlineStubBilling.accounts))for(const row of Object.values(account.attempts))if(['reserved','dispatched'].includes(row.status))row.status='unknown';
      this.store.save();
      Object.defineProperties(this,{ledger:{value:ledger},allowanceId:{value:allowance.id},allowanceHash:{value:hash(allowance)},simulator:{value:options.simulator},enabled:{value:options.enabled===true}});
      const identity=`${inlineStubVersion}:${this.provider.identity}:${hash(allowance)}`;
      this.provider=new FakeProvider();Object.defineProperty(this.provider,'identity',{value:identity,enumerable:true});
    }catch(error){this.store.close();throw error;}
  }
  initialRunMetadata(){return {...super.initialRunMetadata(),stubAccountingVersion:inlineStubVersion,stubAllowanceId:this.allowanceId,stubAllowanceHash:this.allowanceHash,accountingMode:'isolated_synthetic_full_context'};}
  start(requestId,sessionId,input,settings={}){
    const pricing=this.ledger.account(this.allowanceId).allowance.pricing;
    return super.start(requestId,sessionId,input,{inputTokens:pricing.contextTokenLimit*3,...settings});
  }
  assertIdentity(id){
    const r=super.assertIdentity(id);
    if(this.store.state.inlineStubVersion!==inlineStubVersion||r.stubAccountingVersion!==inlineStubVersion||r.stubAllowanceId!==this.allowanceId||r.stubAllowanceHash!==this.allowanceHash||hash(this.ledger.account(this.allowanceId).allowance)!==this.allowanceHash||r.accountingMode!=='isolated_synthetic_full_context')fail('inline_stub_identity_mismatch');
    return r;
  }
  rows(id){return this.ledger.status(this.allowanceId).attempts.filter(t=>t.runId===id);}
  status(id){
    this.assertIdentity(id);const result=super.status(id),rows=this.rows(id);result.stubBilling=copy(rows);
    result.budget={kind:'synthetic_usage_and_full_context_reservations',calls:rows.length,input:rows.reduce((n,t)=>n+(t.usage?.inputTokens??0),0),output:rows.reduce((n,t)=>n+(t.usage?.outputTokens??0),0),heldOrSpentMicroCny:rows.reduce((n,t)=>n+BigInt(t.chargedMicroCny),0n).toString()};return result;
  }
  resume(id,options={}){
    const r=this.assertIdentity(id),rows=this.rows(id);
    if(Object.keys(options).length||!['failed','uncertain'].includes(r.status)||!r.scenes?.length||rows.length!==r.scenes.length||r.attempts.length!==r.scenes.length||r.attempts.some((a,i)=>a.state!=='committed'||a.stage!=='scene'||a.index!==i||a.billingRequestId!==`stub-${r.id}-scene-${i}`)||rows.some(t=>t.status!=='settled')||r.attempts.some(a=>!rows.some(t=>t.requestId===a.billingRequestId)))fail('inline_stub_resume_requires_committed_prefix');
    return Nightvoyage.prototype.resume.call(this,id,{retryUnknown:true});
  }
  async stage(r,stage,signal){
    this.assertIdentity(r.id);if(!this.enabled)fail('transport_disabled');
    if(r.status!=='running'||signal.aborted)fail('cancelled');
    const payload={snapshot:copy(r.snapshot),scenes:copy(r.scenes),stage,index:r.scenes.length},request=buildInlineRehearsalRequest(payload),input=payload.snapshot,rows=this.rows(r.id),allowance=this.ledger.account(this.allowanceId).allowance;
    const requestId=`stub-${r.id}-${stage}-${r.scenes.length}`,fingerprint=hash({stubVersion:inlineStubVersion,runId:r.id,request:request.body,snapshot:input});
    if(rows.length>=r.config.maxCalls&&!rows.some(t=>t.requestId===requestId))fail('budget_exhausted');
    // Separate conservative input/output reservations, never payload byte estimates.
    if(!rows.some(t=>t.requestId===requestId)&&(rows.reduce((n,t)=>n+(t.usage?.inputTokens??allowance.pricing.contextTokenLimit),0)+allowance.pricing.contextTokenLimit>r.config.inputTokens||rows.reduce((n,t)=>n+(t.usage?.outputTokens??400),0)+400>r.config.outputTokens))fail('budget_exhausted');
    const reservation=this.ledger.reserve(this.allowanceId,{requestId,runId:r.id,fingerprint,sourceRefs:input.sources.map(s=>({id:s.id,version:s.version})),maxOutputTokens:400});if(reservation.replayed)fail('ambiguous_attempt');
    const controller=new AbortController();let timer,timedOut=false;
    const abort=()=>controller.abort();signal.addEventListener('abort',abort,{once:true});
    const active=()=>{this.store.assert();if(signal.aborted||controller.signal.aborted||r.status!=='running')fail('cancelled');if(input.sources.some(s=>this.store.withdrawn.includes(s.id)))fail('source_withdrawn');this.assertIdentity(r.id);};
    try{
      this.fault('stub_reserved');active();this.ledger.dispatch(this.allowanceId,requestId);this.fault('stub_dispatched');
      const stop=new Promise((_,reject)=>{controller.signal.addEventListener('abort',()=>reject(Error('cancelled')),{once:true});timer=setTimeout(()=>{timedOut=true;controller.abort();reject(Error('timeout'));},r.config.timeoutMs);});
      const response=await Promise.race([Promise.resolve().then(()=>{active();return this.simulator(copy(request),{signal:controller.signal});}),stop]);active();
      const {data,receipt}=parseDeepSeekResponse(response,{model:'deepseek-flash',maxOutputTokens:400});let value;
      if(stage==='scene'){value=normalizeInlineFixture(fictionalInlineContext(data),r.scenes.at(-1)?.after??input.channels.affect.value??neutral());value.appraisalBasis.protocolVersion=inlineRuntimeVersion;}
      else value=normalizeDeepSeekStage(data,{stage:'wake',previousScenes:r.scenes});
      active();this.ledger.settle(this.allowanceId,requestId,receipt,accounting=>{
        active();const index=r.scenes.length;
        if(stage==='scene')r.scenes.push(copy(value));else{r.wake=copy(value);this.publishDream(r);}
        r.attempts.push({stage,index,state:'committed',billingRequestId:accounting.requestId});
      });this.fault(stage==='scene'?'stub_scene_saved':'stub_wake_saved');
    }catch(error){controller.abort();if(!this.store.poisoned&&!this.store.closed)this.ledger.unknown(this.allowanceId,requestId);fail(timedOut?'timeout':['cancelled','timeout','wake_fragment_not_grounded','usage_exceeds_reviewed_bounds','simulated_crash','storage_io_failure'].includes(error?.message)?error.message:'stub_response_rejected');}
    finally{clearTimeout(timer);signal.removeEventListener('abort',abort);}
  }
  sceneStep(r,signal){return this.stage(r,'scene',signal);}
  wakeStep(r,signal){return this.stage(r,'wake',signal);}
}
