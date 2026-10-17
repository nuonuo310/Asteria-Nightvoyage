// Exercises the new authority through the production core. Stub mode only.
import {BudgetedNightvoyage} from './budgeted-runtime.js';
import {GatedDeepSeekClient} from './gated-deepseek-client.js';
import {copy,fail} from './store.js';
import {readInlineTrialAuthorization,requireInlineTrialAuthorization,inlineTrialInput,assertInlineTrialStage,revokeInlineTrialAuthorization,inlineTrialAuthorizationVersion} from './inline-trial-authorization.js';
class TrialClient extends GatedDeepSeekClient{
  checkAdmission(context,phase){if(this.mode!=='stub'||this.protocol!=='inline-evidence-v1')fail('trial_live_runtime_pending');try{assertInlineTrialStage(this.store,context,phase);}catch(error){if(!['source_withdrawn','paid_contract_expired','trial_authorization_revoked','ambiguous_attempt'].includes(error.message))this.store.poisoned=true;throw error;}}
  send(args){if(typeof args?.publish!=='function')fail('managed_publication_required');return super.send({...args,payload:copy(args.payload)});}
}
export class InlineTrialRehearsalRuntime extends BudgetedNightvoyage{
  constructor(directory,options={}){
    if(!options||Object.keys(options).some(k=>!['enabled','fetchImpl','fault','timeoutMs'].includes(k))||typeof options.fetchImpl!=='function')fail('explicit_trial_stub_transport_required');
    requireInlineTrialAuthorization(directory,{mode:'stub'});
    super(directory,{...options,credential:'DUMMY-TRIAL-REHEARSAL',mode:'stub',protocol:'inline-evidence-v1'});
    try{const r=readInlineTrialAuthorization(this.store);this.provider.identity+=`:${inlineTrialAuthorizationVersion}:${r.termsHash}`;}catch(error){this.client.close();this.store.close();throw error;}
  }
  beforeBudgetAccount(){const r=readInlineTrialAuthorization(this.store);if(r.mode!=='stub')fail('trial_live_runtime_pending');return r.terms.allowance;}
  createBudgetClient(options){return new TrialClient(this.store,options);}
  initialRunMetadata(){const r=readInlineTrialAuthorization(this.store);return {...super.initialRunMetadata(),trialAuthorizationVersion:inlineTrialAuthorizationVersion,trialAuthorizationHash:r.termsHash};}
  assertRunIdentity(id){const r=readInlineTrialAuthorization(this.store);super.assertRunIdentity(id);if(this.run(id).trialAuthorizationVersion!==inlineTrialAuthorizationVersion||this.run(id).trialAuthorizationHash!==r.termsHash)fail('trial_authorized_stage_mismatch');}
  start(...args){if(args.length)fail('fixed_trial_run_required');const r=readInlineTrialAuthorization(this.store);return super.start(r.terms.requestId,r.terms.sessionId,inlineTrialInput(),r.terms.runConfig);}
  revokeAuthorization(){const r=revokeInlineTrialAuthorization(this.store);this.client.close();return r;}
}
