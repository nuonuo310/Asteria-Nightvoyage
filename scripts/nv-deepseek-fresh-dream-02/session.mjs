// Loaded only after the new worker's graph/source checks. No implicit mode or retry.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Nightvoyage} from '../../src/engine.js';
import {Store, fail} from '../../src/store.js';
import {readAppraisalView} from '../../src/appraisal-view.js';
import {readOneDreamContract, oneDreamFixtureSummary} from './contract.mjs';
import {initOneDreamAuthorization, inspectOneDreamConfirmation, readOneDreamAuthorization, revokeOneDreamAuthorization} from './authorization.mjs';
import {oneDreamRunSummary} from './runtime.mjs';
import {DiagnosticOneDreamRuntime as OneDreamRuntime} from './diagnostic.mjs';
import {createOneDreamLoopback} from './local-http.mjs';
import {readInlineCredentialFrame} from '../../src/inline-credential-pipe.js';
import {oneDreamAllowanceId, oneDreamAuthorizationField, oneDreamLocalCredential, oneDreamRequestId} from './policy.mjs';

const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
function existing(directory){
  if(!path.isAbsolute(directory)||directory===root||directory.startsWith(root+path.sep))fail('one_dream_existing_external_history_required');
  let current=directory;for(;;){if(fs.lstatSync(current).isSymbolicLink())fail('one_dream_existing_external_history_required');const parent=path.dirname(current);if(parent===current)break;current=parent;}
  const stat=fs.lstatSync(path.join(directory,'state.json'));if(!stat.isFile()||stat.isSymbolicLink()||stat.size>2097152)fail('one_dream_existing_external_history_required');
}
function result(engine){
  const id=engine.store.state.requests[oneDreamRequestId]?.runId;if(!id)return {status:'not_started',credentialRequested:false,qualityAssessed:false};
  const packet=engine.result(id);
  return {status:packet.receipt.status,...packet,appraisalView:packet.dream?readAppraisalView(engine.store,packet.dream.id):null,credentialRequested:false,qualityAssessed:false,semanticSupport:'not_assessed'};
}
function proposal(){return {...readOneDreamContract(),fixture:oneDreamFixtureSummary(),credentialRequested:false,liveEntryAvailable:true,paidEvaluationApproved:false,fictionalEgressApproved:false};}
export async function runOneDreamSession(action,directory,confirmation,send){
  let engine,loopback,id,requested=false;const controller=new AbortController(),stop=()=>{controller.abort();if(id)try{engine?.cancel(id);}catch{}};
  process.on('SIGINT',stop);process.on('SIGTERM',stop);
  try{
    if(action==='proposal')return proposal();
    if(action==='preflight'&&directory==='-')return {ready:false,reason:'one_dream_history_directory_required',...proposal(),credentialRequested:false};
    if(action==='init'){const checked=readOneDreamContract();inspectOneDreamConfirmation(checked.contract,confirmation);}
    existing(directory);engine=new Nightvoyage(directory);
    if(action==='read')return result(engine);
    if(action==='init'){
      const record=initOneDreamAuthorization(engine.store,{confirmation,mode:'live',dispatchKind:'provider'});
      return {status:'initialized',contractHash:record.terms.contractHash,termsHash:record.termsHash,credentialRequested:false,paidEvaluationApproved:false,fictionalEgressApproved:false};
    }
    if(action==='revoke'){revokeOneDreamAuthorization(engine.store);return {status:'revoked',credentialRequested:false};}
    const saved=result(engine);
    if(saved.status==='completed'){
      const record=readOneDreamAuthorization(engine.store,{allowExpired:true,allowRevoked:true}),run=engine.run(engine.store.state.requests[oneDreamRequestId].runId),expectedKind=action==='rehearse'?'rehearsal':action==='preflight'?record.terms.dispatchKind:'provider';
      if(record.terms.dispatchKind!==expectedKind||run.nvDeepSeekOneDreamAuthorizationHash!==record.termsHash||run.billingAllowanceId!==oneDreamAllowanceId)fail('one_dream_dispatch_kind_mismatch');
      return action==='preflight'?{ready:false,reason:'completed_replay_available',credentialRequested:false,status:'completed'}:{...saved,credentialRequested:false};
    }
    const record=engine.store.state[oneDreamAuthorizationField];
    if(!record){
      if(action==='preflight')return {ready:false,reason:'fresh_explicit_one_dream_approval_required',...proposal(),credentialRequested:false};
      fail('one_dream_fresh_explicit_approval_required');
    }
    engine.close();engine=undefined;
    if(action==='rehearse'){
      loopback=await createOneDreamLoopback();engine=new OneDreamRuntime(directory,{mode:'offline',loopback,enabled:true,timeoutMs:60000});
      const gate=engine.prepare({dispatchKind:'rehearsal',create:true});id=gate.id;engine.credential=oneDreamLocalCredential;await engine.execute(id);
      const summary=oneDreamRunSummary(engine,id);
      return {...summary,appraisalView:summary.status==='completed'?readAppraisalView(engine.store,`dream-${id}`):null,credentialRequested:false,loopbackPosts:loopback.posts,loopbackOrigin:loopback.origin,providerNetworkRequests:0,paidEvaluationApproved:false,qualityAssessed:false};
    }
    if(!['preflight','run','resume'].includes(action))fail('one_dream_invalid_action');
    engine=new OneDreamRuntime(directory,{mode:'live',enabled:false,timeoutMs:60000});
    const options={resume:action==='resume',dispatchKind:'provider',create:action!=='preflight'},gate=engine.prepare(options);id=gate.id;
    if(action==='preflight')return {ready:true,reason:'one_dream_limits_checked',...gate,credentialRequested:false};
    if(controller.signal.aborted)fail('one_dream_cancelled');requested=true;
    send({type:'credential_required',contractHash:gate.contractHash,termsHash:gate.termsHash,nextRequestBytes:gate.nextRequestBytes,nextReservationMicroCny:gate.nextReservationMicroCny});
    engine.credential=await readInlineCredentialFrame(process.stdin,{signal:controller.signal});
    if(controller.signal.aborted)fail('one_dream_cancelled');engine.prepare(options);engine.client.enabled=true;
    if(options.resume)await engine.resume(id,{retryUnknown:true});else await engine.execute(id);
    return {...result(engine),credentialRequested:true};
  }catch(error){
    const codes=['one_dream_fresh_explicit_approval_required','one_dream_existing_external_history_required','one_dream_contract_expired','one_dream_source_withdrawn','one_dream_authorization_revoked','one_dream_ambiguous_attempt','one_dream_explicit_resume_requires_existing_run','one_dream_inline_resume_requires_committed_prefix','one_dream_allowance_exhausted','one_dream_credential_pipe_refused','one_dream_dispatch_kind_mismatch','one_dream_cancelled','credential_pipe_refused','one_dream_confirmation_mismatch','one_dream_legacy_history_changed'];
    return {status:'blocked',ready:false,reason:codes.includes(error?.message)?error.message:'one_dream_entry_refused',credentialRequested:requested,qualityAssessed:false,semanticSupport:'not_assessed'};
  }finally{
    process.off('SIGINT',stop);process.off('SIGTERM',stop);if(engine){engine.credential=undefined;try{engine.close();}catch{}}if(loopback)await loopback.close();
  }
}
