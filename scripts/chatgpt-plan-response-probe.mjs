// A separately approved, one-call protocol diagnostic. No dream or rejected body is saved.
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {Store} from '../src/store.js';
import {hash,snapshot} from '../src/contract.js';
import {ChatGPTPlanAdapter,stageRequest,jsonFields,portError} from './dream-model-port.mjs';
import {createPlanHttpTransport} from './chatgpt-plan-http.mjs';
import {withCheckedPlanSession,planSessionBinding} from './chatgpt-plan-login.mjs';
import {planResponseDiagnostic,reviewedPlanResponseDiagnostic} from './plan-response-diagnostic.mjs';
import {readPlanTrialHistory} from './chatgpt-plan-trial-history.mjs';
const fail=code=>{throw Error(code);};
const root=new URL('../',import.meta.url),digest=s=>createHash('sha256').update(s).digest('hex');
const fixture=new URL('../examples/gpt-plan-trial.snapshot.json',import.meta.url);
const fixtureHash='b2481512fe1f4f3d597863eeaf8754cef61ef37ebad2d60ddf76f75e7772378a';
export function calculatePlanResponseProbeProposal(){
 const pins={},visit=p=>{if(Object.hasOwn(pins,p))return;if(path.isAbsolute(p)||p.startsWith('../'))fail('probe_source_changed');const source=fs.readFileSync(new URL(p,root),'utf8').replaceAll('\r\n','\n');pins[p]=digest(source);for(const m of source.matchAll(/(?:import|export)\s+(?:[^'";]*?\s+from\s*)?['"](\.[^'"]+)['"]/g))visit(path.posix.normalize(path.posix.join(path.posix.dirname(p),m[1])));};
 visit('scripts/chatgpt-plan-response-probe.mjs');visit('scripts/chatgpt-plan-response-probe-cli.mjs');visit('package.json');
 const raw=fs.readFileSync(fixture,'utf8').replaceAll('\r\n','\n');if(digest(raw)!==fixtureHash||snapshot(JSON.parse(raw)).sources.some(s=>s.grant.modelEgress))fail('probe_fixture_changed');
 // Historical proposal files are read by the status reader; bind these data dependencies too.
 for(const file of ['docs/proposals/gpt-plan-first-fictional-dream-v1-original.json','docs/proposals/gpt-plan-first-fictional-dream-v1.json'])pins[file]=digest(fs.readFileSync(new URL(file,root),'utf8').replaceAll('\r\n','\n'));
 return {contractVersion:'gpt-plan-response-probe-v1',batchId:'gpt-plan-single-response-diagnostic-v1',adapter_kind:'ChatGPTPlanAdapter',provider_kind:'openai',model_id:'gpt-5.6-sol',auth_mode:'chatgpt_plan',protocol_version:'chatgpt-plan-inline-http-v1',sourcePins:Object.fromEntries(Object.entries(pins).sort(([a],[b])=>a.localeCompare(b))),fixtureHash,maxAdditionalCalls:1,maxAdditionalRuns:1,persistsGeneratedBody:false,continuesPriorRun:false,diagnosesDiscardedPriorResponse:false,apiFallback:false,extraCreditsApproved:false,serverOutputTokenCap:null,limits:{requestBytes:65536,streamBytes:65536,contentBytes:1200,timeoutMs:60000}};
}
export function planResponseProbeProposal(){const current=calculatePlanResponseProbeProposal(),reviewed=JSON.parse(fs.readFileSync(new URL('../docs/proposals/gpt-plan-single-response-diagnostic-v1.json',import.meta.url),'utf8'));if(hash(current)!==hash(reviewed))fail('probe_source_changed');return current;}
function absolute(value){if(typeof value!=='string'||!path.isAbsolute(value))fail('probe_absolute_directory_required');}
function parentReceipt(directory){const value=readPlanTrialHistory(directory);if(value.status!=='failed'||value.external_calls_started!==1||value.checkpoint?.saved_scenes!==0||value.checkpoint?.wake_saved!==false||value.error_category!=='invalid_model_response'||value.validation_diagnostic!==null||value.remoteRevocationConfirmed!==true||value.usage?.length!==1||value.usage[0].usage!=='unknown')fail('probe_prior_failed_trial_required');return value;}
function input(){const value=JSON.parse(fs.readFileSync(fixture,'utf8'));for(const s of value.sources)s.grant.modelEgress=true;return snapshot(value);}
const approvalFields=['approveOneSubscriptionCall','allowFictionalEgress','acknowledgePriorFailedTrial','confirmNoExtraCredits','acknowledgeNoServerTokenCap'];
const fields=['approval','proposal','approvedAt','expiresAt','parentReceiptHash','phase','externalCallIntents','requestId','runId','accountBinding','diagnostic','errorCategory','usage','remoteRevocationConfirmed'];
function check(store,parentDirectory,{expiry=true}={}){
 store.assert();if(Object.keys(store.state).some(k=>!['version','runs','requests','sessions','entries','recalls','planResponseProbe'].includes(k))||['runs','requests','sessions','entries','recalls'].some(k=>Object.keys(store.state[k]).length))fail('foreign_execution_owner');
 const t=store.state.planResponseProbe;if(!t)fail('probe_approval_required');jsonFields(t,fields);jsonFields(t.approval,approvalFields);if(Object.values(t.approval).some(v=>v!==true))fail('probe_record_invalid');
 if(hash(t.proposal)!==hash(planResponseProbeProposal()))fail('probe_source_changed');
 if(!Number.isSafeInteger(t.approvedAt)||t.expiresAt!==t.approvedAt+86400000||!['approved','authorizing','dispatched','accepted','rejected','failed','cancelled'].includes(t.phase)||! /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(t.runId)||t.requestId!==`probe-${t.runId}-scene-0`||![0,1].includes(t.externalCallIntents)||![null,true,false,'unknown'].includes(t.remoteRevocationConfirmed)||(t.accountBinding!==null&&!/^[a-f0-9]{64}$/.test(t.accountBinding)))fail('probe_record_invalid');
 if((['approved','authorizing'].includes(t.phase)&&t.externalCallIntents!==0)||(['dispatched','accepted','rejected'].includes(t.phase)&&t.externalCallIntents!==1)||(t.phase==='accepted'&&(t.usage==='unknown'||t.diagnostic!==null||t.errorCategory!==null)))fail('probe_record_invalid');
 if(t.diagnostic!==null&&!reviewedPlanResponseDiagnostic(t.diagnostic))fail('probe_record_invalid');
 if(t.errorCategory!==null&&portError({message:t.errorCategory})!==t.errorCategory)fail('probe_record_invalid');
 if(t.usage!=='unknown'){jsonFields(t.usage,['input_tokens','output_tokens','total_tokens']);if(!Object.values(t.usage).every(n=>Number.isSafeInteger(n)&&n>=0)||t.usage.input_tokens+t.usage.output_tokens!==t.usage.total_tokens)fail('probe_record_invalid');}
 if(t.parentReceiptHash!==hash(parentReceipt(parentDirectory)))fail('probe_parent_changed');
 if(expiry&&(Date.now()<t.approvedAt||Date.now()>=t.expiresAt))fail('probe_expired');
 if(input().sources.some(s=>store.withdrawn.includes(s.id)))fail('source_withdrawn');
 return t;
}
function report(t){return {ready:false,apiKeyReads:0,credentialsPersisted:false,adapter_kind:'ChatGPTPlanAdapter',provider_kind:'openai',auth_mode:'chatgpt_plan',protocol_version:'chatgpt-plan-inline-http-v1',kind:'one_scene_response_protocol_diagnostic',model_id:'gpt-5.6-sol',status:t.phase==='dispatched'||t.phase==='authorizing'?'uncertain':t.phase,external_calls_started:t.externalCallIntents,validation_diagnostic:reviewedPlanResponseDiagnostic(t.diagnostic),error_category:t.errorCategory,usage:structuredClone(t.usage),remoteRevocationConfirmed:t.remoteRevocationConfirmed,remoteCleanupMayBeRequired:[false,'unknown'].includes(t.remoteRevocationConfirmed),persistedGeneratedBody:false,oldTrialContinued:false,remoteCancellationConfirmed:'unknown',money:'unknown',qualityAssessed:false,semanticSupport:'not_assessed',extraCreditsApproved:false,usageSettingsVerification:'user_assertion_only',serverOutputTokenCap:null};}
export function initPlanResponseProbe(directory,parentDirectory,approval){
 absolute(directory);absolute(parentDirectory);jsonFields(approval,approvalFields);if(Object.values(approval).some(v=>v!==true))fail('probe_approval_required');
 const proposal=planResponseProbeProposal(),parentReceiptHash=hash(parentReceipt(parentDirectory));
 const store=new Store(directory);try{
  if(!store.state.planResponseProbe){if(Object.keys(store.state).some(k=>!['version','runs','requests','sessions','entries','recalls'].includes(k))||['runs','requests','sessions','entries','recalls'].some(k=>Object.keys(store.state[k]).length)||store.withdrawn.length||store.deletions.length)fail('foreign_execution_owner');const now=Date.now(),runId=randomUUID();store.state.planResponseProbe={approval:structuredClone(approval),proposal,approvedAt:now,expiresAt:now+86400000,parentReceiptHash,phase:'approved',externalCallIntents:0,requestId:`probe-${runId}-scene-0`,runId,accountBinding:null,diagnostic:null,errorCategory:null,usage:'unknown',remoteRevocationConfirmed:null};store.save();}
  const t=check(store,parentDirectory);return {...report(t),credentialRead:false,ready:t.phase==='approved',expiresAt:t.expiresAt};
 }finally{store.close();}
}
export function preflightPlanResponseProbe(directory,parentDirectory){
 absolute(directory);absolute(parentDirectory);if(!fs.existsSync(path.join(directory,'state.json')))return {ready:false,reason:'probe_approval_required',credentialRead:false,proposal:planResponseProbeProposal()};
 const store=new Store(directory);try{const t=check(store,parentDirectory,{expiry:false}),current=Date.now()>=t.approvedAt&&Date.now()<t.expiresAt;return {...report(t),credentialRead:false,ready:t.phase==='approved'&&current,reason:!current?'probe_expired':t.phase==='approved'?'limits_checked':'probe_consumed',expiresAt:t.expiresAt};}finally{store.close();}
}
export async function executePlanResponseProbe({directory,parentDirectory,connectionDirectory,onReady,signal}){
 for(const value of [directory,parentDirectory,connectionDirectory])absolute(value);if(!fs.existsSync(path.join(directory,'state.json')))fail('probe_approval_required');
 const store=new Store(directory);try{
  let t=check(store,parentDirectory,{expiry:false});if(t.phase!=='approved')return report(t);check(store,parentDirectory);
  if(signal?.aborted){t.phase='cancelled';t.errorCategory='cancelled';store.save();return report(t);}
  t.phase='authorizing';t.remoteRevocationConfirmed='unknown';store.save();
  const authorization=await withCheckedPlanSession({directory:connectionDirectory,onReady,signal},async session=>{
   t=check(store,parentDirectory);t.accountBinding=hash(planSessionBinding(session));
   if(signal?.aborted){t.phase='cancelled';t.errorCategory='cancelled';store.save();return;}
   const request=stageRequest({contract_version:'dream-model-port-v1',request_id:t.requestId,run_id:t.runId,stage:'scene',index:0,snapshot:input(),scenes:[]});
   const authorize=value=>{const current=check(store,parentDirectory);if(signal?.aborted)fail('cancelled');if(current.phase!=='dispatched'||current.externalCallIntents!==1||current.accountBinding!==hash(planSessionBinding(session))||hash(value)!==hash(request))fail('ambiguous_attempt');};
   const transport=createPlanHttpTransport({session,model:'gpt-5.6-sol',authorize}),adapter=new ChatGPTPlanAdapter({model_id:'gpt-5.6-sol',httpTransport:transport});
   if(!adapter.preflight().ready)fail('authorization_required');
   t.phase='dispatched';t.externalCallIntents=1;store.save();
   try{const result=await adapter.generate(request,{signal});authorize(request);t.phase='accepted';t.usage=result.usage;store.save();}
   catch(error){if(store.poisoned)throw error;t.phase=signal?.aborted?'cancelled':'rejected';t.errorCategory=portError(error);t.diagnostic=planResponseDiagnostic(error);store.save();}
  });
  // Do not use a failed source/parent check to hide a cleanup attempt. No body survives.
  store.assert();t=store.state.planResponseProbe;if(['authorizing','dispatched'].includes(t.phase))t.phase='failed';t.remoteRevocationConfirmed=authorization.remoteRevocationConfirmed;store.save();
  return {...report(t),authorization:{status:authorization.status,reason:authorization.reason??null,failureStage:authorization.failureStage??null,httpDiagnostic:authorization.httpDiagnostic??null,credentialsPersisted:false,remoteRevocationConfirmed:authorization.remoteRevocationConfirmed,...(authorization.cleanupNotice?{cleanupNotice:authorization.cleanupNotice}:{})}};
 }finally{store.close();}
}
