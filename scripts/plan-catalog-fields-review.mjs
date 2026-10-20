// Separately approved login/catalogue-only owner. No Codex, model POST, token file or dream store.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {Store} from '../src/store.js';
import {hash} from '../src/contract.js';
import {jsonFields} from './dream-model-port.mjs';
import {withCheckedPlanSession,planSessionCredential,planHttpJson,loginDiagnostic} from './chatgpt-plan-login.mjs';
import {planResource} from './chatgpt-plan-auth.mjs';
import {reviewPlanCatalogFields,validPlanCatalogFields} from './plan-catalog-fields-shape.mjs';
const fail=code=>{throw Error(code);};
const absolute=p=>{if(typeof p!=='string'||!path.isAbsolute(p))fail('catalog_absolute_directory_required');};
const approvals=['approveCatalogLogin','acknowledgeNoInference','acknowledgePriorReviewNotRecoverable'];
const phases=['approved','authorizing','observed','failed','cancelled'];
const errors=[null,'cancelled','authorization_failed','catalog_shape_invalid','catalog_selected_missing','catalog_selected_duplicate'];
const authPhases=['discovery_http','discovery_validation','browser_callback','registration_save','token_http','jwks_http','identity_validation','identity_save','catalog_http','catalog_validation','authorized_action'];
const networkCodes=['ENOTFOUND','EAI_AGAIN','ECONNREFUSED','ECONNRESET','ETIMEDOUT','UND_ERR_CONNECT_TIMEOUT','UND_ERR_SOCKET','CERT_HAS_EXPIRED','DEPTH_ZERO_SELF_SIGNED_CERT','UNABLE_TO_VERIFY_LEAF_SIGNATURE','ERR_TLS_CERT_ALTNAME_INVALID'];
function authSummary(v){const h=v?.httpDiagnostic;return {status:['login_not_completed','plan_action_finished','plan_action_failed'].includes(v?.status)?v.status:'plan_action_failed',reason:v?.reason?loginDiagnostic(Error(v.reason)):null,failureStage:authPhases.includes(v?.failureStage)?v.failureStage:null,httpDiagnostic:h?{http_status:Number.isInteger(h.http_status)&&h.http_status>=100&&h.http_status<=599?h.http_status:null,network_code:networkCodes.includes(h.network_code)?h.network_code:'unknown'}:null};}

export function calculatePlanCatalogFieldsReviewProposal(){
 const pins={},root=new URL('../',import.meta.url),visit=p=>{if(Object.hasOwn(pins,p))return;if(path.isAbsolute(p)||p.startsWith('../'))fail('catalog_source_changed');const text=fs.readFileSync(new URL(p,root),'utf8').replaceAll('\r\n','\n');pins[p]=createHash('sha256').update(text).digest('hex');for(const m of text.matchAll(/(?:import|export)\s+(?:[^'";]*?\s+from\s*)?['"](\.[^'"]+)['"]/g))visit(path.posix.normalize(path.posix.join(path.posix.dirname(p),m[1])));};
 visit('scripts/plan-catalog-fields-review.mjs');visit('scripts/plan-catalog-fields-review-cli.mjs');visit('package.json');
 return {contractVersion:'plan-catalog-fields-review-v1',operation:'login_and_selected_catalogue_fields_only',priorReviewRecovery:false,fieldContractVersion:'offline-codex-0160-field-review-v1',model_id:'gpt-5.6-sol',maxAuthorizationAttempts:1,maxAdditionalCatalogGets:1,maxTotalAuthenticatedCatalogGets:2,maxModelRequests:0,maxNativeChildren:0,rawMetadataPersisted:false,credentialsPersisted:false,productionAdmission:false,automaticRetry:false,continuesPriorRun:false,extraCreditsApproved:false,approvalLifetimeMs:86400000,sourcePins:Object.fromEntries(Object.entries(pins).sort(([a],[b])=>a.localeCompare(b)))};
}
export function planCatalogFieldsReviewProposal(){const p=calculatePlanCatalogFieldsReviewProposal(),reviewed=JSON.parse(fs.readFileSync(new URL('../docs/proposals/plan-catalog-fields-review-v1.json',import.meta.url),'utf8'));if(hash(p)!==hash(reviewed))fail('catalog_source_changed');return p;}
function check(store,{expiry=true}={}){
 store.assert();if(Object.keys(store.state).some(k=>!['version','runs','requests','sessions','entries','recalls','planCatalogFieldsReview'].includes(k))||['runs','requests','sessions','entries','recalls'].some(k=>Object.keys(store.state[k]).length)||store.withdrawn.length||store.deletions.length)fail('foreign_execution_owner');
 const t=store.state.planCatalogFieldsReview;if(!t)fail('catalog_approval_required');
 jsonFields(t,['approval','proposal','approvedAt','expiresAt','phase','authorizationAttempts','additionalCatalogGetIntents','review','error','authorization','remoteRevocationConfirmed']);jsonFields(t.approval,approvals);
 if(approvals.some(k=>t.approval[k]!==true)||hash(t.proposal)!==hash(planCatalogFieldsReviewProposal())||!Number.isSafeInteger(t.approvedAt)||t.expiresAt!==t.approvedAt+86400000||!phases.includes(t.phase)||![0,1].includes(t.authorizationAttempts)||![0,1].includes(t.additionalCatalogGetIntents)||!errors.includes(t.error)||![null,true,false,'unknown'].includes(t.remoteRevocationConfirmed))fail('catalog_record_invalid');
 if(t.phase==='approved'&&(t.authorizationAttempts!==0||t.additionalCatalogGetIntents!==0||t.review!==null||t.error!==null||t.authorization!==null||t.remoteRevocationConfirmed!==null))fail('catalog_record_invalid');
 if(['authorizing','observed','failed'].includes(t.phase)&&t.authorizationAttempts!==1||t.additionalCatalogGetIntents>t.authorizationAttempts)fail('catalog_record_invalid');
 if(t.phase!=='observed'&&t.review!==null||t.review!==null&&!validPlanCatalogFields(t.review)||t.phase==='observed'&&(t.review===null||t.additionalCatalogGetIntents!==1||t.error!==null))fail('catalog_record_invalid');
 if(t.authorization!==null){jsonFields(t.authorization,['status','reason','failureStage','httpDiagnostic']);if(hash(t.authorization)!==hash(authSummary(t.authorization)))fail('catalog_record_invalid');}
 if(expiry&&(Date.now()<t.approvedAt||Date.now()>=t.expiresAt))fail('catalog_approval_expired');return t;
}
function report(t){return {contractVersion:'plan-catalog-fields-review-v1',status:t.phase==='authorizing'?'uncertain':t.phase,ready:false,model_id:'gpt-5.6-sol',authorizationAttempts:t.authorizationAttempts,additionalCatalogGetIntents:t.additionalCatalogGetIntents,maxTotalAuthenticatedCatalogGets:2,external_calls_started:0,realModelRequests:0,nativeChildrenStarted:0,credentialsPersisted:false,apiKeyReads:0,rawMetadataPersisted:false,review:t.review?structuredClone(t.review):null,error:t.error,authorization:t.authorization?structuredClone(t.authorization):null,remoteRevocationConfirmed:t.remoteRevocationConfirmed,remoteCleanupMayBeRequired:[false,'unknown'].includes(t.remoteRevocationConfirmed),cleanupNotice:[false,'unknown'].includes(t.remoteRevocationConfirmed)?'Remote session revocation was not confirmed. Disconnect the app in ChatGPT Settings if authorization completed.':null,automaticRetry:false,productionAdmission:false,generationEnabled:false,expiresAt:t.expiresAt};}
export function initPlanCatalogFieldsReview(directory,approval){
 absolute(directory);jsonFields(approval,approvals);if(approvals.some(k=>approval[k]!==true))fail('catalog_approval_required');const proposal=planCatalogFieldsReviewProposal(),store=new Store(directory);
 try{if(!store.state.planCatalogFieldsReview){if(Object.keys(store.state).some(k=>!['version','runs','requests','sessions','entries','recalls'].includes(k))||['runs','requests','sessions','entries','recalls'].some(k=>Object.keys(store.state[k]).length)||store.withdrawn.length||store.deletions.length)fail('foreign_execution_owner');const now=Date.now();store.state.planCatalogFieldsReview={approval:structuredClone(approval),proposal,approvedAt:now,expiresAt:now+86400000,phase:'approved',authorizationAttempts:0,additionalCatalogGetIntents:0,review:null,error:null,authorization:null,remoteRevocationConfirmed:null};store.save();}const t=check(store,{expiry:false});return {...report(t),ready:t.phase==='approved'&&Date.now()>=t.approvedAt&&Date.now()<t.expiresAt};}finally{store.close();}
}
export function preflightPlanCatalogFieldsReview(directory){
 absolute(directory);if(!fs.existsSync(path.join(directory,'state.json')))return {ready:false,reason:'catalog_approval_required',credentialRead:false,proposal:planCatalogFieldsReviewProposal()};const store=new Store(directory);try{const t=check(store,{expiry:false}),current=Date.now()>=t.approvedAt&&Date.now()<t.expiresAt;return {...report(t),ready:current&&t.phase==='approved',credentialRead:false,reason:!current?'catalog_approval_expired':t.phase==='approved'?'limits_checked':'catalog_review_consumed'};}finally{store.close();}
}
export async function executePlanCatalogFieldsReview(options){
 if(!options||Object.getPrototypeOf(options)!==Object.prototype||Reflect.ownKeys(options).some(k=>!['directory','connectionDirectory','onReady','signal'].includes(k)||!Object.hasOwn(Object.getOwnPropertyDescriptor(options,k),'value')))fail('catalog_arguments_invalid');
 const {directory,connectionDirectory,onReady,signal}=options;absolute(directory);absolute(connectionDirectory);
 if(directory===connectionDirectory||onReady!==undefined&&typeof onReady!=='function'||signal!==undefined&&!(signal instanceof AbortSignal))fail('catalog_arguments_invalid');
 if(!fs.existsSync(path.join(directory,'state.json')))fail('catalog_approval_required');const store=new Store(directory);
 try{
  let t=check(store,{expiry:false});if(t.phase!=='approved')return report(t);check(store);
  if(signal?.aborted){t.phase='cancelled';t.error='cancelled';store.save();return report(t);}
  t.phase='authorizing';t.authorizationAttempts=1;t.remoteRevocationConfirmed='unknown';store.save();
  const authorization=await withCheckedPlanSession({directory:connectionDirectory,onReady,signal},async session=>{
   t=check(store);if(signal?.aborted)throw Error('cancelled');
   // The login owner has already done one authenticated catalogue GET. This is the sole additional GET.
   const credential=planSessionCredential(session,'gpt-5.6-sol');t.additionalCatalogGetIntents=1;store.save();
   try{
    const catalog=await planHttpJson(`${planResource}/models`,{headers:{Authorization:`Bearer ${credential}`}},signal);
    check(store);if(signal?.aborted)throw Error('cancelled');t.review=reviewPlanCatalogFields(catalog);t.phase='observed';store.save();
   }catch(error){if(store.poisoned)throw error;t.phase=signal?.aborted?'cancelled':'failed';t.error=signal?.aborted?'cancelled':errors.includes(error?.message)?error.message:'authorization_failed';store.save();}
  });
  store.assert();t=check(store,{expiry:false});if(t.phase==='authorizing'){t.phase=signal?.aborted?'cancelled':'failed';t.error=signal?.aborted?'cancelled':'authorization_failed';}
  t.authorization=authSummary(authorization);t.remoteRevocationConfirmed=authorization.remoteRevocationConfirmed;store.save();return report(t);
 }finally{store.close();}
}
