// One explicit reconnect for a durably failed probe with zero generation intents.
// The original record is immutable. Public discovery is checked before consuming reconnect.
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {Store} from '../src/store.js';
import {hash,snapshot} from '../src/contract.js';
import {ChatGPTPlanAdapter,stageRequest,jsonFields,portError} from './dream-model-port.mjs';
import {createPlanHttpTransport} from './chatgpt-plan-http.mjs';
import {withCheckedPlanSession,planSessionBinding,planHttpJson,validatePlanDiscovery,loginDiagnostic,planHttpDiagnostic} from './chatgpt-plan-login.mjs';
import {planDiscovery} from './chatgpt-plan-auth.mjs';
import {planResponseDiagnostic,reviewedPlanResponseDiagnostic} from './plan-response-diagnostic.mjs';
import {readPlanTrialHistory} from './chatgpt-plan-trial-history.mjs';
const fail=code=>{throw Error(code);};
const root=new URL('../',import.meta.url),digest=value=>createHash('sha256').update(value).digest('hex');
const fixturePath=new URL('../examples/gpt-plan-trial.snapshot.json',import.meta.url),fixtureHash='b2481512fe1f4f3d597863eeaf8754cef61ef37ebad2d60ddf76f75e7772378a';
const originalCandidatePath=new URL('../docs/proposals/gpt-plan-single-response-diagnostic-v1.json',import.meta.url);
export function calculateProbeReconnectProposal(){
 const pins={},visit=p=>{if(Object.hasOwn(pins,p))return;if(path.isAbsolute(p)||p.startsWith('../'))fail('reconnect_source_changed');const source=fs.readFileSync(new URL(p,root),'utf8').replaceAll('\r\n','\n');pins[p]=digest(source);for(const m of source.matchAll(/(?:import|export)\s+(?:[^'";]*?\s+from\s*)?['"](\.[^'"]+)['"]/g))visit(path.posix.normalize(path.posix.join(path.posix.dirname(p),m[1])));};
 visit('scripts/chatgpt-plan-probe-reconnect.mjs');visit('scripts/chatgpt-plan-probe-reconnect-cli.mjs');visit('package.json');
 for(const file of ['docs/proposals/gpt-plan-single-response-diagnostic-v1.json','docs/proposals/gpt-plan-first-fictional-dream-v1-original.json','docs/proposals/gpt-plan-first-fictional-dream-v1.json'])pins[file]=digest(fs.readFileSync(new URL(file,root),'utf8').replaceAll('\r\n','\n'));
 const raw=fs.readFileSync(fixturePath,'utf8').replaceAll('\r\n','\n');if(digest(raw)!==fixtureHash||snapshot(JSON.parse(raw)).sources.some(s=>s.grant.modelEgress))fail('reconnect_fixture_changed');
 return {contractVersion:'gpt-plan-zero-call-reconnect-v1',model_id:'gpt-5.6-sol',adapter_kind:'ChatGPTPlanAdapter',provider_kind:'openai',auth_mode:'chatgpt_plan',protocol_version:'chatgpt-plan-inline-http-v1',sourcePins:Object.fromEntries(Object.entries(pins).sort(([a],[b])=>a.localeCompare(b))),fixtureHash,maxReconnects:1,maxDiagnosticFamilyExternalCalls:1,extendsOriginalExpiry:false,publicDiscoveryBeforeAuthorization:true,persistsGeneratedBody:false,automaticRetry:false,apiFallback:false,extraCreditsApproved:false,serverOutputTokenCap:null};
}
export function probeReconnectProposal(){const current=calculateProbeReconnectProposal(),reviewed=JSON.parse(fs.readFileSync(new URL('../docs/proposals/gpt-plan-zero-call-reconnect-v1.json',import.meta.url),'utf8'));if(hash(current)!==hash(reviewed))fail('reconnect_source_changed');return current;}
const originalFields=['approval','proposal','approvedAt','expiresAt','parentReceiptHash','phase','externalCallIntents','requestId','runId','accountBinding','diagnostic','errorCategory','usage','remoteRevocationConfirmed'];
const originalApprovals=['approveOneSubscriptionCall','allowFictionalEgress','acknowledgePriorFailedTrial','confirmNoExtraCredits','acknowledgeNoServerTokenCap'];
const approvalFields=['approveZeroCallReconnect','allowFictionalEgress','confirmOneCallLimit','confirmNoExtraCredits','acknowledgeNoServerTokenCap'];
const reconnectFields=['approval','proposal','approvedAt','expiresAt','originalProbeHash','parentReceiptHash','phase','externalCallIntents','requestId','runId','accountBinding','diagnostic','errorCategory','usage','authorizationSummary','remoteRevocationConfirmed'];
const uuid=value=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
function absolute(value){if(typeof value!=='string'||!path.isAbsolute(value))fail('reconnect_absolute_directory_required');}
function input(){const value=JSON.parse(fs.readFileSync(fixturePath,'utf8'));for(const s of value.sources)s.grant.modelEgress=true;return snapshot(value);}
function original(store,parentDirectory){
 store.assert();if(Object.keys(store.state).some(k=>!['version','runs','requests','sessions','entries','recalls','planResponseProbe','planResponseReconnect'].includes(k))||['runs','requests','sessions','entries','recalls'].some(k=>Object.keys(store.state[k]).length))fail('foreign_execution_owner');
 const t=store.state.planResponseProbe;if(!t)fail('reconnect_zero_call_failure_required');jsonFields(t,originalFields);jsonFields(t.approval,originalApprovals);
 const candidate=JSON.parse(fs.readFileSync(originalCandidatePath,'utf8'));
 if(hash(t.proposal)!==hash(candidate)||Object.values(t.approval).some(v=>v!==true)||!Number.isSafeInteger(t.approvedAt)||t.expiresAt!==t.approvedAt+86400000||!uuid(t.runId)||t.requestId!==`probe-${t.runId}-scene-0`||t.phase!=='failed'||t.externalCallIntents!==0||t.accountBinding!==null||t.diagnostic!==null||t.errorCategory!==null||t.usage!=='unknown'||t.remoteRevocationConfirmed!==null)fail('reconnect_zero_call_failure_required');
 const parent=readPlanTrialHistory(parentDirectory);if(parent.status!=='failed'||parent.external_calls_started!==1||parent.checkpoint?.saved_scenes!==0||parent.checkpoint?.wake_saved!==false||parent.error_category!=='invalid_model_response'||parent.validation_diagnostic!==null||parent.remoteRevocationConfirmed!==true||parent.usage?.length!==1||parent.usage[0].usage!=='unknown'||hash(parent)!==t.parentReceiptHash)fail('reconnect_parent_changed');
 if(input().sources.some(s=>store.withdrawn.includes(s.id)))fail('source_withdrawn');return t;
}
function check(store,parentDirectory,{expiry=true}={}){
 const old=original(store,parentDirectory),t=store.state.planResponseReconnect;if(!t)fail('reconnect_approval_required');jsonFields(t,reconnectFields);jsonFields(t.approval,approvalFields);
 if(Object.values(t.approval).some(v=>v!==true)||hash(t.proposal)!==hash(probeReconnectProposal())||t.originalProbeHash!==hash(old)||t.parentReceiptHash!==old.parentReceiptHash)fail('reconnect_record_invalid');
 if(!Number.isSafeInteger(t.approvedAt)||t.approvedAt<old.approvedAt||t.expiresAt!==Math.min(old.expiresAt,t.approvedAt+86400000)||!uuid(t.runId)||t.requestId!==`reconnect-${t.runId}-scene-0`||!['approved','authorizing','dispatched','accepted','rejected','failed','cancelled'].includes(t.phase)||![0,1].includes(t.externalCallIntents)||![null,true,false,'unknown'].includes(t.remoteRevocationConfirmed)||(t.accountBinding!==null&&!/^[a-f0-9]{64}$/.test(t.accountBinding)))fail('reconnect_record_invalid');
 if((['approved','authorizing'].includes(t.phase)&&t.externalCallIntents!==0)||(['dispatched','accepted','rejected'].includes(t.phase)&&t.externalCallIntents!==1)||(t.phase==='accepted'&&(t.usage==='unknown'||t.diagnostic!==null||t.errorCategory!==null)))fail('reconnect_record_invalid');
 if(t.diagnostic!==null&&!reviewedPlanResponseDiagnostic(t.diagnostic))fail('reconnect_record_invalid');if(t.errorCategory!==null&&portError({message:t.errorCategory})!==t.errorCategory)fail('reconnect_record_invalid');
 if(t.usage!=='unknown'){jsonFields(t.usage,['input_tokens','output_tokens','total_tokens']);if(!Object.values(t.usage).every(n=>Number.isSafeInteger(n)&&n>=0)||t.usage.input_tokens+t.usage.output_tokens!==t.usage.total_tokens)fail('reconnect_record_invalid');}
 if(t.authorizationSummary!==null&&hash(t.authorizationSummary)!==hash(authSummary(t.authorizationSummary)))fail('reconnect_record_invalid');
 if(expiry&&(Date.now()<t.approvedAt||Date.now()>=t.expiresAt))fail('reconnect_expired');return t;
}
const phases=new Set(['discovery_http','discovery_validation','browser_callback','registration_save','token_http','jwks_http','identity_validation','identity_save','catalog_http','catalog_validation','authorized_action']);
const networkCodes=new Set(['ENOTFOUND','EAI_AGAIN','ECONNREFUSED','ECONNRESET','ETIMEDOUT','UND_ERR_CONNECT_TIMEOUT','UND_ERR_SOCKET','CERT_HAS_EXPIRED','DEPTH_ZERO_SELF_SIGNED_CERT','UNABLE_TO_VERIFY_LEAF_SIGNATURE','ERR_TLS_CERT_ALTNAME_INVALID','unknown']);
function authSummary(value){
 const raw=value?.httpDiagnostic;return {status:['login_not_completed','plan_action_finished','plan_action_failed'].includes(value?.status)?value.status:'plan_action_failed',reason:typeof value?.reason==='string'?loginDiagnostic(Error(value.reason)):null,failureStage:phases.has(value?.failureStage)?value.failureStage:null,httpDiagnostic:raw?{http_status:Number.isInteger(raw.http_status)&&raw.http_status>=100&&raw.http_status<=599?raw.http_status:null,network_code:networkCodes.has(raw.network_code)?raw.network_code:'unknown'}:null};
}
function report(store,t){return {ready:false,adapter_kind:'ChatGPTPlanAdapter',provider_kind:'openai',auth_mode:'chatgpt_plan',protocol_version:'chatgpt-plan-inline-http-v1',model_id:'gpt-5.6-sol',kind:'explicit_zero_call_reconnect',status:['authorizing','dispatched'].includes(t.phase)?'uncertain':t.phase,originalProbePreserved:true,originalProbeExternalCallsStarted:store.state.planResponseProbe.externalCallIntents,reconnectExternalCallsStarted:t.externalCallIntents,diagnosticFamilyExternalCallsStarted:store.state.planResponseProbe.externalCallIntents+t.externalCallIntents,validation_diagnostic:reviewedPlanResponseDiagnostic(t.diagnostic),error_category:t.errorCategory,usage:structuredClone(t.usage),authorization:t.authorizationSummary?authSummary(t.authorizationSummary):null,remoteRevocationConfirmed:t.remoteRevocationConfirmed,remoteCleanupMayBeRequired:[false,'unknown'].includes(t.remoteRevocationConfirmed),apiKeyReads:0,credentialsPersisted:false,persistedGeneratedBody:false,automaticRetry:false,extraCreditsApproved:false,usageSettingsVerification:'user_assertion_only',serverOutputTokenCap:null,remoteCancellationConfirmed:'unknown',money:'unknown',qualityAssessed:false,semanticSupport:'not_assessed'};}
export function initProbeReconnect(directory,parentDirectory,approval){
 absolute(directory);absolute(parentDirectory);jsonFields(approval,approvalFields);if(Object.values(approval).some(v=>v!==true))fail('reconnect_approval_required');const proposal=probeReconnectProposal();if(!fs.existsSync(path.join(directory,'state.json')))fail('reconnect_zero_call_failure_required');
 const store=new Store(directory);try{const old=original(store,parentDirectory);if(!store.state.planResponseReconnect){if(Date.now()<old.approvedAt||Date.now()>=old.expiresAt)fail('reconnect_expired');const now=Date.now(),runId=randomUUID();store.state.planResponseReconnect={approval:structuredClone(approval),proposal,approvedAt:now,expiresAt:Math.min(old.expiresAt,now+86400000),originalProbeHash:hash(old),parentReceiptHash:old.parentReceiptHash,phase:'approved',externalCallIntents:0,requestId:`reconnect-${runId}-scene-0`,runId,accountBinding:null,diagnostic:null,errorCategory:null,usage:'unknown',authorizationSummary:null,remoteRevocationConfirmed:null};store.save();}const t=check(store,parentDirectory);return {...report(store,t),ready:t.phase==='approved',credentialRead:false,expiresAt:t.expiresAt};}finally{store.close();}
}
export function preflightProbeReconnect(directory,parentDirectory){
 absolute(directory);absolute(parentDirectory);if(!fs.existsSync(path.join(directory,'state.json')))return {ready:false,reason:'reconnect_zero_call_failure_required',credentialRead:false,proposal:probeReconnectProposal()};
 const store=new Store(directory);try{original(store,parentDirectory);if(!store.state.planResponseReconnect)return {ready:false,reason:'reconnect_approval_required',credentialRead:false,proposal:probeReconnectProposal()};const t=check(store,parentDirectory,{expiry:false}),current=Date.now()>=t.approvedAt&&Date.now()<t.expiresAt;return {...report(store,t),ready:t.phase==='approved'&&current,reason:!current?'reconnect_expired':t.phase==='approved'?'limits_checked':'reconnect_consumed',credentialRead:false,expiresAt:t.expiresAt};}finally{store.close();}
}
export async function executeProbeReconnect({directory,parentDirectory,connectionDirectory,onReady,signal}){
 for(const p of [directory,parentDirectory,connectionDirectory])absolute(p);if(!fs.existsSync(path.join(directory,'state.json')))fail('reconnect_approval_required');const store=new Store(directory);
 try{let t=check(store,parentDirectory,{expiry:false});if(t.phase!=='approved')return report(store,t);check(store,parentDirectory);
  if(signal?.aborted){t.phase='cancelled';t.errorCategory='cancelled';store.save();return report(store,t);}
  // An explicit run gets one public check. Failure does not consume OAuth or repeat itself.
  try{validatePlanDiscovery(await planHttpJson(planDiscovery,{},signal));}catch(error){if(signal?.aborted){t.phase='cancelled';t.errorCategory='cancelled';store.save();return report(store,t);}return {...report(store,t),status:'network_precheck_blocked',networkPrecheck:{reason:loginDiagnostic(error),httpDiagnostic:planHttpDiagnostic(error)},credentialRead:false};}
  check(store,parentDirectory);if(signal?.aborted){t.phase='cancelled';t.errorCategory='cancelled';store.save();return report(store,t);}
  t.phase='authorizing';t.remoteRevocationConfirmed='unknown';store.save();
  const auth=await withCheckedPlanSession({directory:connectionDirectory,onReady,signal},async session=>{
   t=check(store,parentDirectory);t.accountBinding=hash(planSessionBinding(session));if(signal?.aborted){t.phase='cancelled';t.errorCategory='cancelled';store.save();return;}
   const request=stageRequest({contract_version:'dream-model-port-v1',request_id:t.requestId,run_id:t.runId,stage:'scene',index:0,snapshot:input(),scenes:[]});
   const authorize=value=>{const current=check(store,parentDirectory);if(signal?.aborted)fail('cancelled');if(current.phase!=='dispatched'||current.externalCallIntents!==1||current.accountBinding!==hash(planSessionBinding(session))||hash(value)!==hash(request))fail('ambiguous_attempt');};
   const adapter=new ChatGPTPlanAdapter({model_id:'gpt-5.6-sol',httpTransport:createPlanHttpTransport({session,model:'gpt-5.6-sol',authorize})});if(!adapter.preflight().ready)fail('authorization_required');t.phase='dispatched';t.externalCallIntents=1;store.save();
   try{const value=await adapter.generate(request,{signal});authorize(request);t.phase='accepted';t.usage=value.usage;store.save();}catch(error){if(store.poisoned)throw error;t.phase=signal?.aborted?'cancelled':'rejected';t.errorCategory=portError(error);t.diagnostic=planResponseDiagnostic(error);store.save();}
  });
  store.assert();t=store.state.planResponseReconnect;if(['authorizing','dispatched'].includes(t.phase))t.phase='failed';t.remoteRevocationConfirmed=auth.remoteRevocationConfirmed;t.authorizationSummary=authSummary(auth);store.save();return report(store,t);
 }finally{store.close();}
}
