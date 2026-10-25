// Separate allowance ledger for the new dream surface. Old account IDs are inaccessible here.
import {inlineProtocolVersion,reviewedInlineDiagnostic} from '../../src/inline-evidence-protocol.js';
import {copy, fail} from '../../src/store.js';
import {hash, own, safeId} from '../../src/contract.js';
import {freshDreamInputTokenBound,oneDreamAllowanceId,oneDreamAuthorizationVersion} from './policy.mjs';
const positive=value=>Number.isSafeInteger(value)&&value>0;
const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const ceilMillion=(tokens,rate)=>(BigInt(tokens)*BigInt(rate)+999999n)/1000000n;
export function freshDreamMaximumCost(pricing,maxOutputTokens){
  if(!positive(maxOutputTokens)||maxOutputTokens>400||pricing?.inputTokenBound!==freshDreamInputTokenBound||!positive(pricing.inputMicroCnyPerMillion)||!positive(pricing.outputMicroCnyPerMillion))fail('invalid_cost_bound');
  return ceilMillion(pricing.inputTokenBound,pricing.inputMicroCnyPerMillion)+ceilMillion(maxOutputTokens,pricing.outputMicroCnyPerMillion);
}
function persist(store){try{store.save();}catch{store.poisoned=true;fail('storage_io_failure');}}
export function validateOneDreamAllowance(input){
  if(!exact(input,['id','mode','approved','expiresAt','limits','pricing','protocolVersion','entryAuthorizationVersion']))fail('one_dream_invalid_allowance');
  if(input.id!==oneDreamAllowanceId||!['stub','live'].includes(input.mode)||input.approved!==true||input.protocolVersion!==inlineProtocolVersion||input.entryAuthorizationVersion!==oneDreamAuthorizationVersion)fail('one_dream_invalid_allowance');
  if(!exact(input.limits,['maxRuns','maxCalls','maxMicroCny'])||input.limits.maxRuns!==1||input.limits.maxCalls!==3||input.limits.maxMicroCny!==3000000)fail('one_dream_invalid_allowance');
  if(!exact(input.pricing,['model','contextTokenLimit','inputTokenBound','inputMicroCnyPerMillion','outputMicroCnyPerMillion','reference','checkedAt'])||input.pricing.model!=='deepseek-flash'||input.pricing.contextTokenLimit!==freshDreamInputTokenBound||input.pricing.inputTokenBound!==freshDreamInputTokenBound||input.pricing.inputMicroCnyPerMillion!==2000000||input.pricing.outputMicroCnyPerMillion!==8000000||input.pricing.reference!=='https://api-docs.deepseek.com/zh-cn/quick_start/pricing/'||input.pricing.checkedAt!==Date.parse('2026-10-25T13:10:19Z'))fail('one_dream_invalid_allowance');
  if(!positive(input.expiresAt)||input.pricing.checkedAt>input.expiresAt)fail('one_dream_invalid_allowance');
  return copy(input);
}
export class OneDreamLedger{
  constructor(store){
    this.store=store;store.assert();
    if(!store.state.billing){store.state.billing={version:1,accounts:{}};store.save();}
    if(store.state.billing.version!==1||!store.state.billing.accounts)fail('one_dream_invalid_billing_version');
  }
  approve(input){
    this.store.assert();const allowance=validateOneDreamAllowance(input),fingerprint=hash(allowance),old=own(this.store.state.billing.accounts,allowance.id);
    if(old){if(old.fingerprint!==fingerprint)fail('one_dream_allowance_conflict');return this.status(allowance.id);}
    this.store.state.billing.accounts[allowance.id]={fingerprint,allowance,attempts:{},runIds:[]};persist(this.store);return this.status(allowance.id);
  }
  account(id){this.store.assert();if(id!==oneDreamAllowanceId)fail('one_dream_unknown_allowance');return own(this.store.state.billing.accounts,id)??fail('one_dream_unknown_allowance');}
  status(id){
    const account=this.account(id),attempts=Object.values(account.attempts),held=attempts.reduce((sum,attempt)=>sum+BigInt(attempt.chargedMicroCny),0n);
    return {allowance:copy(account.allowance),runs:account.runIds.length,calls:attempts.length,heldOrSpentMicroCny:held.toString(),attempts:copy(attempts)};
  }
  reserve(id,{requestId,runId,fingerprint,sourceRefs,maxOutputTokens},now=Date.now()){
    const account=this.account(id);
    if(!safeId(requestId)||!safeId(runId)||typeof fingerprint!=='string'||!/^[a-f0-9]{64}$/.test(fingerprint)||!Array.isArray(sourceRefs)||!sourceRefs.length||!sourceRefs.every(source=>typeof source.id==='string'&&source.id.length>0&&source.id.length<=200&&typeof source.version==='string'&&source.version.length>0))fail('one_dream_invalid_reservation');
    const old=own(account.attempts,requestId);if(old){if(old.fingerprint!==fingerprint||old.runId!==runId)fail('one_dream_request_conflict');return {replayed:true,attempt:copy(old)};}
    if(!Number.isFinite(now)||now>=account.allowance.expiresAt)fail('one_dream_allowance_expired');
    if(sourceRefs.some(source=>this.store.withdrawn.includes(source.id)))fail('one_dream_source_withdrawn');
    const cost=freshDreamMaximumCost(account.allowance.pricing,maxOutputTokens),status=this.status(id);
    if(status.calls>=account.allowance.limits.maxCalls||(!account.runIds.includes(runId)&&status.runs>=account.allowance.limits.maxRuns)||BigInt(status.heldOrSpentMicroCny)+cost>BigInt(account.allowance.limits.maxMicroCny))fail('one_dream_allowance_exhausted');
    const attempt={requestId,runId,fingerprint,sourceRefs:sourceRefs.map(source=>({id:source.id,version:source.version})),status:'reserved',maxOutputTokens,reservedMicroCny:cost.toString(),chargedMicroCny:cost.toString()};
    account.attempts[requestId]=attempt;if(!account.runIds.includes(runId))account.runIds.push(runId);persist(this.store);return {replayed:false,attempt:copy(attempt)};
  }
  attempt(id,requestId){return own(this.account(id).attempts,requestId)??fail('one_dream_unknown_attempt');}
  dispatch(id,requestId){const attempt=this.attempt(id,requestId);if(attempt.status!=='reserved')fail('one_dream_attempt_not_dispatchable');attempt.status='dispatched';persist(this.store);}
  unknown(id,requestId,diagnostic){
    const attempt=this.attempt(id,requestId);
    if(attempt.status!=='settled'){const reviewed=reviewedInlineDiagnostic(diagnostic);if(reviewed)attempt.validationDiagnostic=reviewed;attempt.status='unknown';persist(this.store);}
  }
  settle(id,requestId,receipt,publish){
    const account=this.account(id),attempt=this.attempt(id,requestId),pricing=account.allowance.pricing,usage=receipt?.usage;
    if(attempt.status!=='dispatched')fail('one_dream_attempt_not_settleable');
    if(receipt?.model!==pricing.model||!usage||!Number.isSafeInteger(usage.inputTokens)||usage.inputTokens<0||usage.inputTokens>pricing.contextTokenLimit||!Number.isSafeInteger(usage.outputTokens)||usage.outputTokens<0||usage.outputTokens>attempt.maxOutputTokens||usage.totalTokens!==usage.inputTokens+usage.outputTokens)fail('one_dream_usage_exceeds_reviewed_bounds');
    const cost=ceilMillion(usage.inputTokens,pricing.inputMicroCnyPerMillion)+ceilMillion(usage.outputTokens,pricing.outputMicroCnyPerMillion);
    if(cost>BigInt(attempt.reservedMicroCny))fail('one_dream_cost_exceeds_reservation');
    attempt.status='settled';attempt.chargedMicroCny=cost.toString();attempt.usage={inputTokens:usage.inputTokens,outputTokens:usage.outputTokens,totalTokens:usage.totalTokens};attempt.model=receipt.model;
    if(publish){try{publish(copy(attempt));}catch{this.store.poisoned=true;fail('one_dream_publication_failed');}}
    persist(this.store);return copy(attempt);
  }
}
