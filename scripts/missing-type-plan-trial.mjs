// One explicit fictional subscription trial. No API allowance or silent fallback.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {Store} from '../src/store.js';
import {hash,snapshot} from '../src/contract.js';
import {withCheckedPlanSession,planSessionBinding,planHttpJson,validatePlanDiscovery,loginDiagnostic,planHttpDiagnostic} from './chatgpt-plan-login.mjs';
import {createMissingTypeHttpTransport,missingTypeHttpProtocolVersion} from './missing-type-plan-http.mjs';
import {preflightPrefixProbe} from './plan-prefix-probe.mjs';
import {planDiscovery} from './chatgpt-plan-auth.mjs';
import {MissingTypePlanAdapter,selectAdapter,jsonFields} from './missing-type-model-port.mjs';
import {ModelPortNightvoyage} from './missing-type-model-runtime.mjs';
import {reviewedPlanResponseDiagnostic} from './plan-response-diagnostic.mjs';
import {readModelPortContent} from './missing-type-content-view.mjs';
const fail=code=>{throw Error(code);};
const root=new URL('../',import.meta.url),fixturePath=new URL('../examples/gpt-plan-trial.snapshot.json',import.meta.url);
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const fixtureHash='b2481512fe1f4f3d597863eeaf8754cef61ef37ebad2d60ddf76f75e7772378a';
// Pin the full relative static-import closure, not just the transport file.
function sourcePins(){
  const pins={},visit=p=>{
    if(Object.hasOwn(pins,p))return;
    if(p.startsWith('../')||path.isAbsolute(p))fail('trial_source_pins_changed');
    const source=fs.readFileSync(new URL(p,root),'utf8').replaceAll('\r\n','\n');pins[p]=digest(source);
    const imports=[...source.matchAll(/(?:import|export)\s+(?:[^'";]*?\s+from\s*)?['"](\.[^'"]+)['"]/g)];
    for(const match of imports)visit(path.posix.normalize(path.posix.join(path.posix.dirname(p),match[1])));
  };
  visit('scripts/missing-type-plan-trial.mjs');visit('scripts/missing-type-plan-trial-cli.mjs');visit('package.json');
  for(const name of ['plan-http-prefix-probe-v1.json','plan-http-envelope-probe-v1.json','gpt-plan-zero-call-reconnect-v1.json','gpt-plan-single-response-diagnostic-v1.json','gpt-plan-first-fictional-dream-v1-original.json','gpt-plan-first-fictional-dream-v1.json']){const p='docs/proposals/'+name;pins[p]=digest(fs.readFileSync(new URL(p,root),'utf8').replaceAll('\r\n','\n'));}
  return Object.fromEntries(Object.entries(pins).sort(([a],[b])=>a.localeCompare(b)));
}
export const missingTypeTrialVersion='chatgpt-plan-missing-type-trial-v1';
const settings=Object.freeze({scenes:2,maxCalls:3,inputTokens:65536,outputTokens:3600,perCallOutput:1200,timeoutMs:60000});
export function calculateMissingTypeTrialProposal(){
  const raw=fs.readFileSync(fixturePath,'utf8').replaceAll('\r\n','\n');
  if(digest(raw)!==fixtureHash)fail('trial_fixture_changed');
  const input=snapshot(JSON.parse(raw));if(input.sources.some(s=>s.grant.modelEgress))fail('trial_fixture_changed');
  const pins=sourcePins();
  return {contractVersion:missingTypeTrialVersion,batchId:'gpt-plan-missing-type-fictional-dream-v1',adapter_kind:'ChatGPTPlanAdapter',provider_kind:'openai',model_id:'gpt-5.6-sol',auth_mode:'chatgpt_plan',protocol_version:missingTypeHttpProtocolVersion,fixtureHash,sourcePins:pins,maxRuns:1,maxCalls:3,settings:{...settings},localLimits:{requestBytes:65536,streamBytes:65536,contentBytes:1200,serverOutputTokenCap:null},apiFallback:false,extraCreditsApproved:false,headerPolicy:'explicit-missing-only-complete-sse-v1',preservesConsumedDiagnostics:true};
}
export function missingTypeTrialProposal(){
  const current=calculateMissingTypeTrialProposal();
  const reviewed=JSON.parse(fs.readFileSync(new URL('../docs/proposals/gpt-plan-missing-type-fictional-dream-v1.json',import.meta.url),'utf8'));
  if(hash(current)!==hash(reviewed))fail('trial_source_pins_changed');
  return current;
}

function prior(history){
 jsonFields(history,['prefixDirectory','envelopeDirectory','priorDirectory','parentDirectory']);for(const p of Object.values(history))absolute(p);
 const p=preflightPrefixProbe(history.prefixDirectory,history.envelopeDirectory,history.priorDirectory,history.parentDirectory);
 if(p.status!=='observed'||p.additionalRequestIntents!==1||p.priorDiagnosticIntentsPreserved!==2||p.observation?.readOutcome!=='prefix_limit'||p.observation.review?.httpStatus!==200||p.observation.review?.mediaClass!=='missing'||p.observation.prefix?.prefixShape!=='sse_like_prefix'||p.error_category!==null||p.remoteRevocationConfirmed!==true||p.authorization?.status!=='plan_action_finished')fail('trial_consumed_sse_prefix_required');
 return {status:p.status,model_id:p.model_id,additionalCalls:p.additionalRequestIntents,priorCalls:p.priorDiagnosticIntentsPreserved,observation:p.observation,authorization:p.authorization,remoteRevocationConfirmed:p.remoteRevocationConfirmed,expiresAt:p.expiresAt};
}

function approvedSnapshot(){const input=JSON.parse(fs.readFileSync(fixturePath,'utf8'));for(const s of input.sources)s.grant.modelEgress=true;return snapshot(input);}
function absolute(directory){if(typeof directory!=='string'||!path.isAbsolute(directory))fail('absolute_trial_directory_required');}
function ownTrialStore(store){
  store.assert();if(Object.keys(store.state).some(k=>!['version','runs','requests','sessions','entries','recalls','planMissingTypeDreamTrial'].includes(k)))fail('foreign_execution_owner');
}
function check(store,history,{expiry=true}={}){
  ownTrialStore(store);const t=store.state.planMissingTypeDreamTrial;
  if(!t)fail('trial_approval_required');
  jsonFields(t,['proposal','approvedAt','expiresAt','fixtureEgressApproved','extraCreditsDisabledConfirmed','noServerTokenCapAcknowledged','status','runId','accountBinding','remoteRevocationConfirmed','priorReceiptHash','missingTypeCompatibilityApproved','consumedDiagnosticsAcknowledged']);
  if(!['approved','authorizing','executing','completed','failed','cancelled'].includes(t.status)||![null,true,false,'unknown'].includes(t.remoteRevocationConfirmed)||(t.accountBinding!==null&&!/^[a-f0-9]{64}$/.test(t.accountBinding)))fail('trial_approval_invalid');
  if(t.priorReceiptHash!==hash(prior(history))||t.missingTypeCompatibilityApproved!==true||t.consumedDiagnosticsAcknowledged!==true)fail('trial_approval_invalid');
  if(hash(t.proposal)!==hash(missingTypeTrialProposal()))fail('trial_source_pins_changed');
  if(!Number.isSafeInteger(t.approvedAt)||!Number.isSafeInteger(t.expiresAt)||t.expiresAt!==t.approvedAt+86400000||t.fixtureEgressApproved!==true||t.extraCreditsDisabledConfirmed!==true||t.noServerTokenCapAcknowledged!==true)fail('trial_approval_invalid');
  if(expiry&&(Date.now()<t.approvedAt||Date.now()>=t.expiresAt))fail('trial_expired');
  if(approvedSnapshot().sources.some(s=>store.withdrawn.includes(s.id)))fail('source_withdrawn');
  if(Object.keys(store.state.runs).length>1||Object.values(store.state.runs).some(r=>r.id!==t.runId))fail('foreign_execution_owner');
  return t;
}
function receipt(store,t){
  store.assert();
  const r=t.runId?store.state.runs[t.runId]:null;
  if(t.runId&&!r)fail('trial_record_invalid');
  return {contract_version:missingTypeTrialVersion,status:r?(['queued','running'].includes(r.status)&&['authorizing','executing'].includes(t.status)?'uncertain':r.status):(['authorizing','executing'].includes(t.status)?'uncertain':t.status),runId:t.runId,adapter_kind:t.proposal.adapter_kind,provider_kind:t.proposal.provider_kind,model_id:t.proposal.model_id,auth_mode:t.proposal.auth_mode,protocol_version:t.proposal.protocol_version,fallback_from:null,fallback_reason:null,
    external_calls_started:r?.attempts.filter(a=>a.external_call_intent).length??0,checkpoint:{saved_scenes:r?.scenes?.length??0,wake_saved:r?.status==='completed'},usage:r?.attempts.map(a=>({request_id:a.request_id,usage:a.usage??'unknown'}))??[],error_category:r?.modelPortError??null,
    validation_diagnostic:reviewedPlanResponseDiagnostic(r?.modelPortDiagnostic),
    headerPolicy:'explicit-missing-only-complete-sse-v1',priorDiagnosticIntentsPreserved:3,money:'unknown',remoteRevocationConfirmed:t.remoteRevocationConfirmed,remoteCleanupMayBeRequired:[false,'unknown'].includes(t.remoteRevocationConfirmed),serverOutputTokenCap:null,extraCreditsApproved:false,usageSettingsVerification:'user_assertion_only',remoteCancellationConfirmed:'unknown',qualityAssessed:false};
}
function result(store,t){
  store.assert();
  const r=t.runId?store.state.runs[t.runId]:null,view=r?.status==='completed'?readModelPortContent(store,r.entryId):null;
  let residue=null;
  if(view){const e=store.state.entries[r.entryId],a=e.residue;if(!a||a.strength!==view.narrative.wake.residue||!Number.isFinite(a.startedAt)||a.durationMs!==3600000)fail('trial_record_invalid');residue={schemaVersion:1,origin:'simulated_affect',materialKind:'fictional',isRealityFact:false,sourceRefs:view.sourceRefs,derivedFrom:[r.entryId],strength:a.strength*Math.max(0,1-Math.max(0,Date.now()-a.startedAt)/a.durationMs)};}
  return {dream:view?.narrative.dream??null,wake:view?.narrative.wake??null,residue,associations:view?view.narrative.wake.associations.map(text=>({origin:'dream_association',materialKind:'fictional',isRealityFact:false,sourceRefs:view.sourceRefs,derivedFrom:[r.entryId],text})):[],receipt:receipt(store,t)};
}
export function initMissingTypeTrial(directory,history,approval){
  absolute(directory);jsonFields(approval,['approveFictionalSubscriptionTrial','confirmExtraCreditsDisabled','acknowledgeNoServerTokenCap','approveMissingContentTypeCompatibility','acknowledgeConsumedDiagnostics']);
  if(Object.values(approval).some(v=>v!==true))fail('trial_approval_required');
  const proposal=missingTypeTrialProposal(),priorReceiptHash=hash(prior(history)),store=new Store(directory);
  try{
    ownTrialStore(store);
    if(!store.state.planMissingTypeDreamTrial){
      if(Object.keys(store.state.runs).length||Object.keys(store.state.entries).length||Object.keys(store.state.requests).length||Object.keys(store.state.sessions).length||Object.keys(store.state.recalls).length||store.state.billing)fail('foreign_execution_owner');
      if(approvedSnapshot().sources.some(s=>store.withdrawn.includes(s.id)))fail('source_withdrawn');
      if(store.withdrawn.length||store.deletions.length)fail('foreign_execution_owner');
      const now=Date.now();store.state.planMissingTypeDreamTrial={proposal,approvedAt:now,expiresAt:now+86400000,fixtureEgressApproved:true,extraCreditsDisabledConfirmed:true,noServerTokenCapAcknowledged:true,status:'approved',runId:null,accountBinding:null,remoteRevocationConfirmed:null,priorReceiptHash,missingTypeCompatibilityApproved:true,consumedDiagnosticsAcknowledged:true};store.save();
    }
    const t=check(store,history);return {ready:t.status==='approved',...receipt(store,t),expiresAt:t.expiresAt};
  }finally{store.close();}
}
export function preflightMissingTypeTrial(directory,history){
  absolute(directory);if(!fs.existsSync(path.join(directory,'state.json')))return {ready:false,reason:'trial_approval_required',credentialRead:false,proposal:missingTypeTrialProposal()};
  const store=new Store(directory);try{const t=check(store,history,{expiry:false});let reason=t.status==='approved'?'limits_checked':'trial_consumed';if(Date.now()<t.approvedAt||Date.now()>=t.expiresAt)reason='trial_expired';return {ready:reason==='limits_checked',reason,credentialRead:false,expiresAt:t.expiresAt,...receipt(store,t)};}finally{store.close();}
}
export async function executeMissingTypeTrial({directory,history,connectionDirectory,onReady,signal}){
  absolute(directory);absolute(connectionDirectory);
  if(!fs.existsSync(path.join(directory,'state.json')))fail('trial_approval_required');
  let store=new Store(directory),engine=null,runId=null;
  try{
    let t=check(store,history,{expiry:false});
    // A terminal replay is local, including after expiry. Never opens OAuth or dispatches.
    if(t.status!=='approved')return result(store,t);
    check(store,history);const cancelBefore=()=>{t.status='cancelled';store.save();return result(store,t);};if(signal?.aborted)return cancelBefore();
    try{validatePlanDiscovery(await planHttpJson(planDiscovery,{},signal));}catch(error){if(signal?.aborted)return cancelBefore();return {...result(store,t),networkPrecheck:{reason:loginDiagnostic(error),httpDiagnostic:planHttpDiagnostic(error)}};}
    check(store,history);if(signal?.aborted)return cancelBefore();
    t.status='authorizing';t.remoteRevocationConfirmed='unknown';store.save();
    const auth=await withCheckedPlanSession({directory:connectionDirectory,signal,onReady},async session=>{
      check(store,history);if(signal?.aborted)fail('cancelled');
      t.accountBinding=hash(planSessionBinding(session));t.status='executing';store.save();
      const authorize=request=>{
        const current=check(engine.store,history),r=engine.run(runId),last=r.attempts.at(-1);
        if(hash(r.config)!==hash(settings)||current.status!=='executing'||current.runId!==runId||current.accountBinding!==hash(planSessionBinding(session))||r.status!=='running'||request.run_id!==runId||r.attempts.length>3||r.budget.calls>3||hash(request.snapshot)!==hash(approvedSnapshot())||hash(request.scenes)!==hash(r.scenes)||last?.request_id!==request.request_id||last.state!=='dispatched'||last.stage!==request.stage||last.index!==request.index||last.external_call_intent!==true)fail('ambiguous_attempt');
      };
      const transport=createMissingTypeHttpTransport({session,model:t.proposal.model_id,authorize,allowMissingContentType:true}),adapter=new MissingTypePlanAdapter({model_id:t.proposal.model_id,httpTransport:transport});
      store.close();engine=new ModelPortNightvoyage(directory,{selection:selectAdapter({primary:adapter})});store=engine.store;t=check(store,history);
      runId=engine.start('gpt-plan-missing-type-fictional-dream','gpt-plan-missing-type-fictional-dream',approvedSnapshot(),settings);t.runId=runId;store.save();
      const cancel=()=>engine.cancel(runId);signal?.addEventListener('abort',cancel,{once:true});
      try{if(signal?.aborted)cancel();await engine.execute(runId);}finally{signal?.removeEventListener('abort',cancel);}
      t.status=engine.run(runId).status==='completed'?'completed':'failed';store.save();return receipt(store,t);
    });
    if(store.closed&&!engine)store=new Store(directory);
    if(!store.closed&&!store.poisoned){t=check(store,history,{expiry:false});if(['authorizing','executing'].includes(t.status))t.status='failed';t.remoteRevocationConfirmed=auth.remoteRevocationConfirmed;store.save();}
    return {...result(store,t),authorization:{status:auth.status,reason:auth.reason??null,failureStage:auth.failureStage??null,httpDiagnostic:auth.httpDiagnostic??null,remoteRevocationConfirmed:auth.remoteRevocationConfirmed,credentialsPersisted:false,...(auth.cleanupNotice?{cleanupNotice:auth.cleanupNotice}:{})}};
  }finally{if(engine)engine.close();else if(!store.closed)store.close();}
}
