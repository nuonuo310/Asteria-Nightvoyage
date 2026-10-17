// Loaded only after the paid worker's source/graph checks and hooks.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Nightvoyage} from './engine.js';
import {readAppraisalView} from './appraisal-view.js';
import {InlinePaidRuntime} from './inline-paid-runtime.js';
import {readInlinePaidContract,inspectInlinePaidAcknowledgement} from './inline-paid-contract.js';
import {InlineHistoryGuard} from './inline-entry-admission.js';
import {initInlineTrialAuthorization,readInlineTrialAuthorization,revokeInlineTrialAuthorization,inlineTrialAllowanceId} from './inline-trial-authorization.js';
import {readInlineCredentialFrame} from './inline-credential-pipe.js';
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
function existing(directory){
  if(!path.isAbsolute(directory)||directory===root||directory.startsWith(root+path.sep))throw Error('existing_external_history_required');let p=directory;
  for(;;){if(fs.lstatSync(p).isSymbolicLink())throw Error('existing_external_history_required');const parent=path.dirname(p);if(parent===p)break;p=parent;}
  const s=fs.lstatSync(path.join(directory,'state.json'));if(!s.isFile()||s.isSymbolicLink()||s.size>2097152)throw Error('existing_external_history_required');
}
const result=engine=>{const id=engine.store.state.requests[inlineTrialAllowanceId]?.runId;if(!id)return {status:'not_started',qualityAssessed:false};const packet=engine.result(id);return {status:packet.receipt.status,...packet,appraisalView:packet.dream?readAppraisalView(engine.store,packet.dream.id):null,qualityAssessed:false};};
export async function runInlinePaidSession(action,directory,confirmation,send){
  let engine,id,requested=false;const controller=new AbortController(),stop=()=>{controller.abort();if(id)try{engine.cancel(id);}catch{}};
  process.on('SIGINT',stop);process.on('SIGTERM',stop);
  try{
    if(action==='proposal')return {...readInlinePaidContract(),credentialRequested:false};
    if(action==='preflight'&&directory==='-')return {ready:false,reason:'history_directory_required',...readInlinePaidContract(),credentialRequested:false};
    if(action==='init'){const c=readInlinePaidContract();inspectInlinePaidAcknowledgement(c.contract,confirmation);}
    existing(directory);engine=new Nightvoyage(directory);
    if(action==='read')return {...result(engine),credentialRequested:false};
    if(action==='init'){const record=initInlineTrialAuthorization(engine.store,{confirmation,mode:'live',dispatchKind:'provider'});return {status:'initialized',contractHash:record.terms.contractHash,termsHash:record.termsHash,credentialRequested:false};}
    if(action==='revoke'){revokeInlineTrialAuthorization(engine.store);return {status:'revoked',credentialRequested:false};}
    const saved=result(engine);
    if(saved.status==='completed'){
      const grant=readInlineTrialAuthorization(engine.store,{allowExpired:true,allowRevoked:true}),run=engine.run(engine.store.state.requests[inlineTrialAllowanceId].runId);
      if(grant.mode!=='live'||grant.terms.dispatchKind!==(action==='rehearse'?'rehearsal':'provider')||run.trialAuthorizationHash!==grant.termsHash||run.billingAllowanceId!==inlineTrialAllowanceId)throw Error('trial_dispatch_kind_mismatch');
      return action==='preflight'?{ready:false,reason:'completed_replay_available',credentialRequested:false}:{...saved,credentialRequested:false};
    }
    if(!engine.store.state.inlineTrialAuthorization){new InlineHistoryGuard(engine.store).assertPreserved();if(action==='preflight')return {ready:false,reason:'explicit_current_contract_approval_required',...readInlinePaidContract(),credentialRequested:false};throw Error('explicit_current_contract_approval_required');}
    engine.close();engine=new InlinePaidRuntime(directory);
    const options={resume:action==='resume',dispatchKind:action==='rehearse'?'rehearsal':'provider',create:action!=='preflight'},gate=engine.prepare(options);id=gate.id;
    if(action==='preflight')return {ready:true,reason:'limits_checked',...gate,credentialRequested:false};
    if(controller.signal.aborted)throw Error('cancelled');requested=true;
    send({type:'credential_required',contractHash:gate.contractHash,termsHash:gate.termsHash,nextRequestBytes:gate.nextRequestBytes,nextReservationMicroCny:gate.nextReservationMicroCny});
    engine.credential=await readInlineCredentialFrame(process.stdin,{signal:controller.signal});
    if(controller.signal.aborted)throw Error('cancelled');engine.prepare(options);engine.client.enabled=true;
    if(options.resume)await engine.resume(id,{retryUnknown:true});else await engine.execute(id);
    return {...result(engine),credentialRequested:true};
  }catch(error){
    const codes=['explicit_current_contract_approval_required','existing_external_history_required','paid_contract_expired','source_withdrawn','trial_authorization_revoked','ambiguous_attempt','explicit_resume_required','inline_resume_requires_committed_prefix','allowance_exhausted','credential_pipe_refused','trial_dispatch_kind_mismatch','cancelled'];
    return {status:'blocked',ready:false,reason:codes.includes(error.message)?error.message:'inline_paid_entry_refused',credentialRequested:requested,qualityAssessed:false};
  }finally{process.off('SIGINT',stop);process.off('SIGTERM',stop);if(engine){engine.credential=undefined;engine.close();}}
}
