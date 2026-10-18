// A separately approved, one-call protocol diagnostic. No dream or rejected body is saved.
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {Store} from '../src/store.js';
import {hash,snapshot} from '../src/contract.js';
import {stageRequest,jsonFields,portError} from './dream-model-port.mjs';
import {EventWitnessProbeAdapter} from './event-witness-probe-port.mjs';
import {createEventWitnessProbeHttpTransport} from './event-witness-probe-http.mjs';
import {withCheckedPlanSession,planSessionBinding,planHttpJson,validatePlanDiscovery,loginDiagnostic,planHttpDiagnostic} from './chatgpt-plan-login.mjs';
import {planDiscovery} from './chatgpt-plan-auth.mjs';
import {eventWitnessDiagnostic,reviewedEventWitnessDiagnostic,eventWitnessDecision,eventWitnessVersion,eventWitnessCatalogueHash} from './response-event-witness.mjs';
import {preflightEventClassProbe,eventClassProbeProposal} from './event-class-probe.mjs';
const fail=code=>{throw Error(code);};
const root=new URL('../',import.meta.url),digest=s=>createHash('sha256').update(s).digest('hex');
const fixture=new URL('../examples/gpt-plan-trial.snapshot.json',import.meta.url);
const fixtureHash='b2481512fe1f4f3d597863eeaf8754cef61ef37ebad2d60ddf76f75e7772378a';
export function calculateEventWitnessProbeProposal(){
 const pins={},visit=p=>{if(Object.hasOwn(pins,p))return;if(path.isAbsolute(p)||p.startsWith('../'))fail('probe_source_changed');const source=fs.readFileSync(new URL(p,root),'utf8').replaceAll('\r\n','\n');pins[p]=digest(source);for(const m of source.matchAll(/(?:import|export)\s+(?:[^'";]*?\s+from\s*)?['"](\.[^'"]+)['"]/g))visit(path.posix.normalize(path.posix.join(path.posix.dirname(p),m[1])));};
 visit('scripts/event-witness-probe.mjs');visit('scripts/event-witness-probe-cli.mjs');visit('package.json');
 const raw=fs.readFileSync(fixture,'utf8').replaceAll('\r\n','\n');if(digest(raw)!==fixtureHash||snapshot(JSON.parse(raw)).sources.some(s=>s.grant.modelEgress))fail('probe_fixture_changed');
 for(const file of Object.keys(eventClassProbeProposal().sourcePins))visit(file);
 visit('docs/proposals/plan-rejected-event-diagnostic-v1.json');visit('test-support/reviewed-response-event-types.json');
 return {contractVersion:'plan-event-witness-probe-v1',batchId:'plan-event-witness-diagnostic-v1',adapter_kind:'ChatGPTPlanAdapter',provider_kind:'openai',model_id:'gpt-5.6-sol',auth_mode:'chatgpt_plan',protocol_version:'plan-event-witness-probe-http-v1',sourcePins:Object.fromEntries(Object.entries(pins).sort(([a],[b])=>a.localeCompare(b))),fixtureHash,metadataPolicy:{policyVersion:eventWitnessVersion,catalogueHash:eventWitnessCatalogueHash,rawOutsideName:false,outsideCatalogueDecision:'provider_contract_unverified_stop'},maxAdditionalCalls:1,maxAdditionalRuns:1,persistsGeneratedBody:false,continuesPriorRun:false,diagnosesDiscardedPriorResponse:false,apiFallback:false,extraCreditsApproved:false,serverOutputTokenCap:null,limits:{requestBytes:65536,streamBytes:65536,contentBytes:1200,timeoutMs:60000}};
}
export function eventWitnessProbeProposal(){const current=calculateEventWitnessProbeProposal(),reviewed=JSON.parse(fs.readFileSync(new URL('../docs/proposals/plan-event-witness-diagnostic-v1.json',import.meta.url),'utf8'));if(hash(current)!==hash(reviewed))fail('probe_source_changed');return current;}
function absolute(value){if(typeof value!=='string'||!path.isAbsolute(value))fail('probe_absolute_directory_required');}
const historyFields=['consumedDiagnosticDirectory','failedAggregateTrialDirectory','failedEnvelopeTrialDirectory','failedTrialDirectory','prefixDirectory','envelopeDirectory','priorDirectory','parentDirectory'];
function historyPaths(history){jsonFields(history,historyFields);for(const value of Object.values(history))absolute(value);}
function parentReceipt(history){
 historyPaths(history);const {consumedDiagnosticDirectory,...ancestors}=history,value=preflightEventClassProbe(consumedDiagnosticDirectory,ancestors);
 if(value.protocol_version!=='plan-rejected-event-probe-http-v1'||value.model_id!=='gpt-5.6-sol'||value.status!=='rejected'||value.external_calls_started!==1||value.error_category!=='invalid_model_response'||hash(value.validation_diagnostic)!==hash({schemaVersion:1,layer:'rejected_response_event',check:'unreviewed_event'})||value.usage!=='unknown'||value.remoteRevocationConfirmed!==true||value.authorization?.status!=='plan_action_finished'||value.persistedGeneratedBody!==false||value.bodyReturned!==false||value.dreamInferenceAccepted!==false)fail('probe_prior_failed_trial_required');
 return value;
}
function input(){const value=JSON.parse(fs.readFileSync(fixture,'utf8'));for(const s of value.sources)s.grant.modelEgress=true;return snapshot(value);}
const approvalFields=['approveOneSubscriptionCall','allowFictionalEgress','acknowledgePriorFailedTrial','confirmNoExtraCredits','acknowledgeNoServerTokenCap','approveMissingContentTypeCompatibility','approveReasoningDiscard','approveAggregateEventBudget','approveClosedEventWitness'];
const fields=['approval','proposal','approvedAt','expiresAt','parentReceiptHash','phase','externalCallIntents','requestId','runId','accountBinding','diagnostic','errorCategory','usage','remoteRevocationConfirmed','authorizationSummary'];
const phases=new Set(['discovery_http','discovery_validation','browser_callback','registration_save','token_http','jwks_http','identity_validation','identity_save','catalog_http','catalog_validation','authorized_action']);
const net=new Set(['ENOTFOUND','EAI_AGAIN','ECONNREFUSED','ECONNRESET','ETIMEDOUT','UND_ERR_CONNECT_TIMEOUT','UND_ERR_SOCKET','CERT_HAS_EXPIRED','DEPTH_ZERO_SELF_SIGNED_CERT','UNABLE_TO_VERIFY_LEAF_SIGNATURE','ERR_TLS_CERT_ALTNAME_INVALID','unknown']);
function authSummary(v){const h=v?.httpDiagnostic;return {status:['login_not_completed','plan_action_finished','plan_action_failed'].includes(v?.status)?v.status:'plan_action_failed',reason:typeof v?.reason==='string'?loginDiagnostic(Error(v.reason)):null,failureStage:phases.has(v?.failureStage)?v.failureStage:null,httpDiagnostic:h?{http_status:Number.isInteger(h.http_status)&&h.http_status>=100&&h.http_status<=599?h.http_status:null,network_code:net.has(h.network_code)?h.network_code:'unknown'}:null};}
function check(store,history,{expiry=true}={}){
 store.assert();if(Object.keys(store.state).some(k=>!['version','runs','requests','sessions','entries','recalls','planEventWitnessProbe'].includes(k))||['runs','requests','sessions','entries','recalls'].some(k=>Object.keys(store.state[k]).length))fail('foreign_execution_owner');
 const t=store.state.planEventWitnessProbe;if(!t)fail('probe_approval_required');jsonFields(t,fields);jsonFields(t.approval,approvalFields);if(Object.values(t.approval).some(v=>v!==true))fail('probe_record_invalid');
 if(hash(t.proposal)!==hash(eventWitnessProbeProposal()))fail('probe_source_changed');
 if(!Number.isSafeInteger(t.approvedAt)||t.expiresAt!==t.approvedAt+86400000||!['approved','authorizing','dispatched','accepted','rejected','failed','cancelled'].includes(t.phase)||! /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(t.runId)||t.requestId!==`probe-${t.runId}-scene-0`||![0,1].includes(t.externalCallIntents)||![null,true,false,'unknown'].includes(t.remoteRevocationConfirmed)||(t.accountBinding!==null&&!/^[a-f0-9]{64}$/.test(t.accountBinding)))fail('probe_record_invalid');
 if((['approved','authorizing'].includes(t.phase)&&t.externalCallIntents!==0)||(['dispatched','accepted','rejected'].includes(t.phase)&&t.externalCallIntents!==1)||(t.phase==='accepted'&&(t.usage==='unknown'||t.diagnostic!==null||t.errorCategory!==null)))fail('probe_record_invalid');
 if(t.diagnostic!==null&&!reviewedEventWitnessDiagnostic(t.diagnostic))fail('probe_record_invalid');
 if(t.errorCategory!==null&&portError({message:t.errorCategory})!==t.errorCategory)fail('probe_record_invalid');
 if(t.usage!=='unknown'){jsonFields(t.usage,['input_tokens','output_tokens','total_tokens']);if(!Object.values(t.usage).every(n=>Number.isSafeInteger(n)&&n>=0)||t.usage.input_tokens+t.usage.output_tokens!==t.usage.total_tokens)fail('probe_record_invalid');}
 if(t.authorizationSummary!==null&&hash(t.authorizationSummary)!==hash(authSummary(t.authorizationSummary)))fail('probe_record_invalid');
 if(t.parentReceiptHash!==hash(parentReceipt(history)))fail('probe_parent_changed');
 if(expiry&&(Date.now()<t.approvedAt||Date.now()>=t.expiresAt))fail('probe_expired');
 if(input().sources.some(s=>store.withdrawn.includes(s.id)))fail('source_withdrawn');
 return t;
}
function report(t){return {contract_version:'plan-event-witness-probe-v1',ready:false,apiKeyReads:0,credentialsPersisted:false,adapter_kind:'ChatGPTPlanAdapter',provider_kind:'openai',auth_mode:'chatgpt_plan',protocol_version:'plan-event-witness-probe-http-v1',kind:'one_request_closed_event_witness_diagnostic',model_id:'gpt-5.6-sol',status:t.phase==='dispatched'||t.phase==='authorizing'?'uncertain':t.phase,external_calls_started:t.externalCallIntents,validation_diagnostic:reviewedEventWitnessDiagnostic(t.diagnostic),error_category:t.errorCategory,usage:structuredClone(t.usage),remoteRevocationConfirmed:t.remoteRevocationConfirmed,remoteCleanupMayBeRequired:[false,'unknown'].includes(t.remoteRevocationConfirmed),bodyReturned:false,persistedGeneratedBody:false,dreamInferenceAccepted:false,classificationScope:'closed_event_witness',witnessPolicyVersion:eventWitnessVersion,diagnosticDecision:t.diagnostic?.layer==='responses_event_witness'?eventWitnessDecision(t.diagnostic.witness):t.phase==='accepted'?'single_stage_only_not_dream':'review_other_failure',outsideCatalogueNamePersisted:false,priorFailedTrialIntentsPreserved:3,priorDiagnosticIntentsPreserved:4,materialKind:'fictional',generatedEventOrigin:'dream',isRealityFact:false,authorization:t.authorizationSummary?authSummary(t.authorizationSummary):null,automaticRetry:false,oldTrialContinued:false,remoteCancellationConfirmed:'unknown',money:'unknown',qualityAssessed:false,semanticSupport:'not_assessed',extraCreditsApproved:false,usageSettingsVerification:'user_assertion_only',serverOutputTokenCap:null};}
export function initEventWitnessProbe(directory,history,approval){
 absolute(directory);historyPaths(history);jsonFields(approval,approvalFields);if(Object.values(approval).some(v=>v!==true))fail('probe_approval_required');
 const proposal=eventWitnessProbeProposal(),parentReceiptHash=hash(parentReceipt(history));
 const store=new Store(directory);try{
  if(!store.state.planEventWitnessProbe){if(Object.keys(store.state).some(k=>!['version','runs','requests','sessions','entries','recalls'].includes(k))||['runs','requests','sessions','entries','recalls'].some(k=>Object.keys(store.state[k]).length)||store.withdrawn.length||store.deletions.length)fail('foreign_execution_owner');const now=Date.now(),runId=randomUUID();store.state.planEventWitnessProbe={approval:structuredClone(approval),proposal,approvedAt:now,expiresAt:now+86400000,parentReceiptHash,phase:'approved',externalCallIntents:0,requestId:`probe-${runId}-scene-0`,runId,accountBinding:null,diagnostic:null,errorCategory:null,usage:'unknown',remoteRevocationConfirmed:null,authorizationSummary:null};store.save();}
  const t=check(store,history);return {...report(t),credentialRead:false,ready:t.phase==='approved',expiresAt:t.expiresAt};
 }finally{store.close();}
}
export function preflightEventWitnessProbe(directory,history){
 absolute(directory);historyPaths(history);if(!fs.existsSync(path.join(directory,'state.json')))return {ready:false,reason:'probe_approval_required',credentialRead:false,proposal:eventWitnessProbeProposal()};
 const store=new Store(directory);try{const t=check(store,history,{expiry:false}),current=Date.now()>=t.approvedAt&&Date.now()<t.expiresAt;return {...report(t),credentialRead:false,ready:t.phase==='approved'&&current,reason:!current?'probe_expired':t.phase==='approved'?'limits_checked':'probe_consumed',expiresAt:t.expiresAt};}finally{store.close();}
}
export async function executeEventWitnessProbe({directory,history,connectionDirectory,onReady,signal}){
 for(const value of [directory,connectionDirectory])absolute(value);historyPaths(history);if(!fs.existsSync(path.join(directory,'state.json')))fail('probe_approval_required');
 const store=new Store(directory);try{
  let t=check(store,history,{expiry:false});if(t.phase!=='approved')return report(t);check(store,history);
  if(signal?.aborted){t.phase='cancelled';t.errorCategory='cancelled';store.save();return report(t);}
  try{validatePlanDiscovery(await planHttpJson(planDiscovery,{},signal));}catch(error){if(signal?.aborted){t.phase='cancelled';t.errorCategory='cancelled';store.save();return report(t);}return {...report(t),status:'network_precheck_blocked',networkPrecheck:{reason:loginDiagnostic(error),httpDiagnostic:planHttpDiagnostic(error)},credentialRead:false};}
  check(store,history);if(signal?.aborted){t.phase='cancelled';t.errorCategory='cancelled';store.save();return report(t);}
  t.phase='authorizing';t.remoteRevocationConfirmed='unknown';store.save();
  const authorization=await withCheckedPlanSession({directory:connectionDirectory,onReady,signal},async session=>{
   t=check(store,history);t.accountBinding=hash(planSessionBinding(session));
   if(signal?.aborted){t.phase='cancelled';t.errorCategory='cancelled';store.save();return;}
   const request=stageRequest({contract_version:'dream-model-port-v1',request_id:t.requestId,run_id:t.runId,stage:'scene',index:0,snapshot:input(),scenes:[]});
   const authorize=value=>{const current=check(store,history);if(signal?.aborted)fail('cancelled');if(current.phase!=='dispatched'||current.externalCallIntents!==1||current.accountBinding!==hash(planSessionBinding(session))||hash(value)!==hash(request))fail('ambiguous_attempt');};
   const transport=createEventWitnessProbeHttpTransport({session,model:'gpt-5.6-sol',authorize,allowMissingContentType:true,allowReasoningDiscard:true,allowAggregateEventBudget:true}),adapter=new EventWitnessProbeAdapter({model_id:'gpt-5.6-sol',httpTransport:transport});
   if(!adapter.preflight().ready)fail('authorization_required');
   t.phase='dispatched';t.externalCallIntents=1;store.save();
   try{const result=await adapter.generate(request,{signal});authorize(request);t.phase='accepted';t.usage=result.usage;store.save();}
   catch(error){if(store.poisoned)throw error;let failure=error;try{authorize(request);}catch(blocked){failure=blocked;}t.phase=signal?.aborted?'cancelled':'rejected';t.errorCategory=signal?.aborted?'cancelled':portError(failure);t.diagnostic=failure===error&&!signal?.aborted?eventWitnessDiagnostic(error):null;store.save();}
  });
  // Do not use a failed source/parent check to hide a cleanup attempt. No body survives.
  store.assert();t=store.state.planEventWitnessProbe;if(['authorizing','dispatched'].includes(t.phase))t.phase='failed';t.remoteRevocationConfirmed=authorization.remoteRevocationConfirmed;t.authorizationSummary=authSummary(authorization);store.save();
  return report(t);
 }finally{store.close();}
}
