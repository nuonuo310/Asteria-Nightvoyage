// Explicitly supplied local transport and durable synthetic authority only.
import {BudgetedNightvoyage} from './budgeted-runtime.js';
import {GatedDeepSeekClient} from './gated-deepseek-client.js';
import {copy,fail} from './store.js';
import {inlineAuthorizationVersion,readInlineAuthorization,requireExistingInlineAuthorization,inlineAuthorizedInput,assertInlineAuthorizedStage,revokeInlineAuthorization} from './inline-entry-authorization.js';
class AuthorizedStubClient extends GatedDeepSeekClient {
  checkAdmission(context,phase){if(this.mode!=='stub'||this.protocol!=='inline-evidence-v1')fail('inline_live_entry_pending');try{assertInlineAuthorizedStage(this.store,context,phase);}catch(error){if(['preserved_history_changed','admission_history_invalid','preserved_history_identity_mismatch','preserved_history_binding_mismatch','invalid_history_approval','unsafe_history_approval','admission_source_changed','authorization_account_mismatch','invalid_inline_authorization','inline_authorization_terms_changed','admission_owner_lock_required'].includes(error.message))this.store.poisoned=true;throw error;}}
  send(args){if(typeof args?.publish!=='function')fail('managed_publication_required');return super.send({...args,payload:copy(args.payload)});}
}
export class InlineAuthorizedStubRuntime extends BudgetedNightvoyage {
  constructor(directory,options={}){
    if(!options||Object.keys(options).some(k=>!['enabled','fetchImpl','fault','timeoutMs'].includes(k))||typeof options.fetchImpl!=='function')fail('explicit_local_stub_transport_required');
    requireExistingInlineAuthorization(directory);
    // Terms are rechecked under the Store owner before this candidate account is touched.
    super(directory,{...options,credential:'DUMMY-AUTHORIZED-STUB',mode:'stub',protocol:'inline-evidence-v1'});
    try{const record=readInlineAuthorization(this.store);this.provider.identity+=`:${inlineAuthorizationVersion}:${record.termsHash}`;}catch(error){this.client.close();this.store.close();throw error;}
  }
  beforeBudgetAccount(options){const record=readInlineAuthorization(this.store);if(options.mode!=='stub'||options.protocol!=='inline-evidence-v1')fail('inline_live_entry_pending');return record.terms.allowance;}
  createBudgetClient(options){return new AuthorizedStubClient(this.store,options);}
  initialRunMetadata(){const record=readInlineAuthorization(this.store);return {...super.initialRunMetadata(),authorizationVersion:inlineAuthorizationVersion,authorizationHash:record.termsHash};}
  assertRunIdentity(id){const record=readInlineAuthorization(this.store);super.assertRunIdentity(id);if(this.run(id).authorizationHash!==record.termsHash||this.run(id).authorizationVersion!==inlineAuthorizationVersion)fail('inline_authorized_stage_mismatch');}
  start(...args){if(args.length)fail('fixed_authorized_run_required');const r=readInlineAuthorization(this.store);return super.start(r.terms.requestId,r.terms.sessionId,inlineAuthorizedInput(),r.terms.runConfig);}
  revokeAuthorization(){const record=revokeInlineAuthorization(this.store);this.client.close();return record;}
}
