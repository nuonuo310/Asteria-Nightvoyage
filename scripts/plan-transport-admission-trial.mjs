// Fresh, single-run ChatGPT subscription admission candidate. This module can create
// durable approval only when explicitly invoked; the reviewed proposal creates none.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {Store} from '../src/store.js';
import {hash,snapshot} from '../src/contract.js';
import {withCheckedPlanSession,planSessionBinding,loginDiagnostic,planHttpDiagnostic} from './chatgpt-plan-login.mjs';
import {createPlanTransportAdmissionHttpTransport,planTransportAdmissionHttpVersion} from './plan-transport-admission-http.mjs';
import {planTransportAdmissionAdapterVersion as adapterVersion,planTransportAdmissionModel,ChatGPTPlanAdapter,selectAdapter,jsonFields} from './plan-transport-admission-port.mjs';
import {ModelPortNightvoyage} from './plan-transport-admission-runtime.mjs';
import {reviewedEnvelopeDiagnostic} from './envelope-diagnostic.mjs';
import {readModelPortContent} from './plan-transport-admission-content-view.mjs';
const fail=code=>{throw Error(code);};
const root=new URL('../',import.meta.url),fixturePath=new URL('../examples/plan-transport-admission.snapshot.json',import.meta.url);
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const fixtureHash='5710d9e1180b50f6d9cc88cecbd0e71e017188572b0d6c90d43d36eed9646af7';
const proposalPath='docs/proposals/nv-plan-transport-admission-01-v1.json';
const implementationBase='d7ab7f3de3c4e850b2a71510f0718c9272220b27',authorityCommit='19f14308497bc843294af0847d5adad10f2a8250',authorityPath='docs/construction-envelopes/2026-10-23-plan-transport-admission-v1.md';
export const planTransportAdmissionVersion='nv-plan-transport-admission-01-v1';
const settings=Object.freeze({scenes:2,maxCalls:3,inputTokens:65536,outputTokens:3600,perCallOutput:1200,timeoutMs:60000});
function sourcePins(){
  const pins={},visit=p=>{
    if(Object.hasOwn(pins,p))return;
    if(p.startsWith('../')||path.isAbsolute(p))fail('trial_source_pins_changed');
    const source=fs.readFileSync(new URL(p,root),'utf8').replaceAll('\r\n','\n');pins[p]=digest(source);
    const imports=[...source.matchAll(/(?:import|export)\s+(?:[^'";]*?\s+from\s*)?['"](\.[^'"]+)['"]/g)];
    for(const match of imports)visit(path.posix.normalize(path.posix.join(path.posix.dirname(p),match[1])));
  };
  visit('scripts/plan-transport-admission-trial.mjs');
  visit('scripts/plan-transport-admission-cli.mjs');
  visit('scripts/check-plan-transport-admission.mjs');
  visit('scripts/dreambook.mjs');
  visit('package.json');
  const raw=fs.readFileSync(fixturePath,'utf8').replaceAll('\r\n','\n');pins['examples/plan-transport-admission.snapshot.json']=digest(raw);
  pins[authorityPath]=digest(fs.readFileSync(new URL(authorityPath,root),'utf8').replaceAll('\r\n','\n'));
  return Object.fromEntries(Object.entries(pins).sort(([a],[b])=>a.localeCompare(b)));
}
export function calculatePlanTransportAdmissionProposal(){
  const raw=fs.readFileSync(fixturePath,'utf8').replaceAll('\r\n','\n');
  if(digest(raw)!==fixtureHash)fail('trial_fixture_changed');
  const input=snapshot(JSON.parse(raw));if(input.sources.some(s=>s.grant.modelEgress))fail('trial_fixture_changed');
  const pins=sourcePins();
  return {
    contractVersion:planTransportAdmissionVersion,
    batchId:'nv-plan-transport-admission-01-v1',
    admissionState:'OFFLINE_READY_AWAITING_FRESH_APPROVAL',
    baselineCommit:implementationBase,authorityCommit,authorityPath,
    adapter_kind:'ChatGPTPlanAdapter',provider_kind:'openai',model_id:planTransportAdmissionModel,auth_mode:'chatgpt_plan',
    protocol_version:planTransportAdmissionHttpVersion,adapter_version:adapterVersion,
    upstreamTransport:'chatgpt-plan-inline-missing-type-v1',decoderVersion:'offline-aggregate-envelope-v1',
    fixtureHash,sourcePins:pins,sourceIdentity:hash(pins),
    maxRuns:1,maxCalls:3,oneDreamOnly:true,firstStageFailureStops:true,settings:{...settings},
    localLimits:{requestBytes:65536,httpStreamBytes:65536,aggregateStreamBytes:65536,aggregateEvents:1024,contentBytes:1200,serverOutputTokenCap:null},
    approvalWindowMs:86400000,apiFallback:false,codexFallback:false,extraCreditsApproved:false,
    headerPolicy:'explicit-missing-only-complete-sse-v1',reasoningPolicy:'validated_discard_only',
    aggregateEventPolicy:'single-owner-1024-events-v1',permitCreated:false,permitConsumed:false,
    stopConditions:['first_stage_failure','invalid_or_incomplete_stream','unknown_or_forbidden_event','model_or_usage_mismatch','dream_stage_failure','checkpoint_failure','cancellation','timeout','source_withdrawal','expiry','unconfirmed_remote_cancellation','extra_credits_or_fallback_required'],
    officialContract:{readAt:'2026-10-23',sources:[
      'https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference',
      'https://developers.openai.com/siwc/token-sharing-open-source/errors-and-recovery',
      'https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations',
      'https://developers.openai.com/api/docs/guides/streaming-responses',
      'https://developers.openai.com/api/reference/resources/responses/streaming-events'
    ]},
    accountModelAvailability:'unverified'
  };
}
export function planTransportAdmissionProposal(){
  const current=calculatePlanTransportAdmissionProposal();
  const reviewed=JSON.parse(fs.readFileSync(new URL('../'+proposalPath,import.meta.url),'utf8'));
  if(hash(current)!==hash(reviewed))fail('trial_source_pins_changed');
  return current;
}
function approvedSnapshot(){const input=JSON.parse(fs.readFileSync(fixturePath,'utf8'));for(const s of input.sources)s.grant.modelEgress=true;return snapshot(input);}
function absolute(directory){if(typeof directory!=='string'||!path.isAbsolute(directory))fail('absolute_trial_directory_required');}
function ownTrialStore(store){
  store.assert();
  if(Object.keys(store.state).some(k=>!['version','runs','requests','sessions','entries','recalls','planTransportAdmissionTrial'].includes(k)))fail('foreign_execution_owner');
}
function check(store,{expiry=true,allowWithdrawn=false}={}){
  ownTrialStore(store);const t=store.state.planTransportAdmissionTrial;
  if(!t)fail('trial_approval_required');
  jsonFields(t,['proposal','approvedAt','expiresAt','fixtureEgressApproved','extraCreditsDisabledConfirmed','noServerTokenCapAcknowledged','missingTypeCompatibilityApproved','reasoningDiscardApproved','aggregateStreamBudgetApproved','independentVersionAcknowledged','noFallbackConfirmed','status','runId','accountBinding','remoteRevocationConfirmed']);
  if(!['approved','authorizing','executing','completed','failed','cancelled'].includes(t.status)||![null,true,false,'unknown'].includes(t.remoteRevocationConfirmed)||(t.accountBinding!==null&&!/^[a-f0-9]{64}$/.test(t.accountBinding)))fail('trial_approval_invalid');
  if(t.fixtureEgressApproved!==true||t.extraCreditsDisabledConfirmed!==true||t.noServerTokenCapAcknowledged!==true||t.missingTypeCompatibilityApproved!==true||t.reasoningDiscardApproved!==true||t.aggregateStreamBudgetApproved!==true||t.independentVersionAcknowledged!==true||t.noFallbackConfirmed!==true)fail('trial_approval_invalid');
  if(hash(t.proposal)!==hash(planTransportAdmissionProposal()))fail('trial_source_pins_changed');
  if(!Number.isSafeInteger(t.approvedAt)||!Number.isSafeInteger(t.expiresAt)||t.expiresAt!==t.approvedAt+86400000)fail('trial_approval_invalid');
  if(expiry&&(Date.now()<t.approvedAt||Date.now()>=t.expiresAt))fail('trial_expired');
  if(!allowWithdrawn&&approvedSnapshot().sources.some(s=>store.withdrawn.includes(s.id)))fail('source_withdrawn');
  if(Object.keys(store.state.runs).length>1||Object.values(store.state.runs).some(r=>r.id!==t.runId))fail('foreign_execution_owner');
  return t;
}
const emptyLayers=()=>({http:null,responses_envelope:null,responses_protocol:null,dream_stage:null,unclassified:null});
function diagnosticLayers(value){const reviewed=reviewedEnvelopeDiagnostic(value),out=emptyLayers();if(reviewed&&Object.hasOwn(out,reviewed.layer))out[reviewed.layer]=reviewed;return out;}
function receipt(store,t){
  store.assert();const r=t.runId?store.state.runs[t.runId]:null;if(t.runId&&!r)fail('trial_record_invalid');
  const status=r?(['queued','running'].includes(r.status)&&['authorizing','executing'].includes(t.status)?'uncertain':r.status):(['authorizing','executing'].includes(t.status)?'uncertain':t.status);
  const diagnostic=reviewedEnvelopeDiagnostic(r?.modelPortDiagnostic);
  return {contract_version:planTransportAdmissionVersion,admissionState:'OFFLINE_READY_AWAITING_FRESH_APPROVAL',status,runId:t.runId,
    adapter_kind:t.proposal.adapter_kind,provider_kind:t.proposal.provider_kind,model_id:t.proposal.model_id,auth_mode:t.proposal.auth_mode,protocol_version:t.proposal.protocol_version,fallback_from:null,fallback_reason:null,
    fixtureHash:t.proposal.fixtureHash,sourceIdentity:t.proposal.sourceIdentity,proposalHash:hash(t.proposal),
    external_calls_started:r?.attempts.filter(a=>a.external_call_intent).length??0,stage_dispatches_started:r?.attempts.length??0,maxCalls:t.proposal.maxCalls,
    checkpoint:{saved_scenes:r?.scenes?.length??0,wake_saved:r?.status==='completed',last_committed:r?.attempts.filter(a=>a.state==='committed').at(-1)?.request_id??null},
    usage:r?.attempts.map(a=>({request_id:a.request_id,usage:a.usage??'unknown'}))??[],
    stage_diagnostics:r?.attempts.map(a=>({request_id:a.request_id,stage:a.stage,index:a.index,state:a.state,usage:a.usage??'unknown',diagnostic:reviewedEnvelopeDiagnostic(a.diagnostic)}))??[],error_category:r?.modelPortError??null,
    validation_diagnostic:diagnostic,diagnostic_layers:diagnosticLayers(diagnostic),
    headerPolicy:t.proposal.headerPolicy,reasoningPolicy:t.proposal.reasoningPolicy,aggregateEventPolicy:t.proposal.aggregateEventPolicy,
    aggregateEventLimit:1024,httpStreamByteLimit:65536,aggregateStreamByteLimit:65536,finalContentByteLimit:1200,
    money:'unknown',remoteRevocationConfirmed:t.remoteRevocationConfirmed,remoteCancellationConfirmed:'unknown',usageSettingsVerification:'user_assertion_only',
    serverOutputTokenCap:null,extraCreditsApproved:false,apiFallback:false,codexFallback:false,firstStageFailureStops:true,
    reasoningReturned:false,qualityAssessed:false,inferenceEntitlementProven:false};
}
function result(store,t){
  store.assert();const r=t.runId?store.state.runs[t.runId]:null,view=r?.status==='completed'?readModelPortContent(store,r.entryId):null;
  let residue=null;
  if(view){const e=store.state.entries[r.entryId],a=e.residue;if(!a||a.strength!==view.narrative.wake.residue||!Number.isFinite(a.startedAt)||a.durationMs!==3600000)fail('trial_record_invalid');residue={schemaVersion:1,origin:'simulated_affect',materialKind:'fictional',isRealityFact:false,sourceRefs:view.sourceRefs,derivedFrom:[r.entryId],strength:a.strength*Math.max(0,1-Math.max(0,Date.now()-a.startedAt)/a.durationMs)};}
  return {dream:view?.narrative.dream??null,wake:view?.narrative.wake??null,residue,associations:view?view.narrative.wake.associations.map(text=>({origin:'dream_association',materialKind:'fictional',isRealityFact:false,sourceRefs:view.sourceRefs,derivedFrom:[r.entryId],text})):[],receipt:receipt(store,t)};
}
export function initPlanTransportAdmission(directory,approval){
  absolute(directory);jsonFields(approval,['approveFictionalSubscriptionTrial','confirmExtraCreditsDisabled','acknowledgeNoServerTokenCap','approveMissingContentTypeCompatibility','approveReasoningDiscard','approveAggregateStreamBudget','acknowledgeIndependentVersion','confirmNoFallbackOrCodex']);
  if(Object.values(approval).some(v=>v!==true))fail('trial_approval_required');
  const proposal=planTransportAdmissionProposal(),store=new Store(directory);
  try{
    ownTrialStore(store);
    if(!store.state.planTransportAdmissionTrial){
      if(Object.keys(store.state.runs).length||Object.keys(store.state.entries).length||Object.keys(store.state.requests).length||Object.keys(store.state.sessions).length||Object.keys(store.state.recalls).length||store.state.billing)fail('foreign_execution_owner');
      if(approvedSnapshot().sources.some(s=>store.withdrawn.includes(s.id)))fail('source_withdrawn');
      if(store.withdrawn.length||store.deletions.length)fail('foreign_execution_owner');
      const now=Date.now();
      store.state.planTransportAdmissionTrial={proposal,approvedAt:now,expiresAt:now+86400000,fixtureEgressApproved:true,extraCreditsDisabledConfirmed:true,noServerTokenCapAcknowledged:true,missingTypeCompatibilityApproved:true,reasoningDiscardApproved:true,aggregateStreamBudgetApproved:true,independentVersionAcknowledged:true,noFallbackConfirmed:true,status:'approved',runId:null,accountBinding:null,remoteRevocationConfirmed:null};store.save();
    }
    const t=check(store);return {ready:t.status==='approved',...receipt(store,t),expiresAt:t.expiresAt};
  }finally{store.close();}
}
export function preflightPlanTransportAdmission(directory){
  absolute(directory);if(!fs.existsSync(path.join(directory,'state.json')))return {ready:false,reason:'fresh_approval_required',credentialRead:false,proposal:planTransportAdmissionProposal()};
  const store=new Store(directory);
  try{const t=check(store,{expiry:false});let reason=t.status==='approved'?'limits_checked':'trial_consumed';if(Date.now()<t.approvedAt||Date.now()>=t.expiresAt)reason='trial_expired';return {ready:reason==='limits_checked',reason,credentialRead:false,expiresAt:t.expiresAt,...receipt(store,t)};}finally{store.close();}
}
export async function executePlanTransportAdmission({directory,connectionDirectory,onReady,signal}){
  absolute(directory);absolute(connectionDirectory);
  if(!fs.existsSync(path.join(directory,'state.json')))fail('trial_approval_required');
  let store=new Store(directory),engine=null,runId=null;
  try{
    let t=check(store,{expiry:false,allowWithdrawn:true});
    // Terminal replay stays local, including after expiry or source withdrawal.
    if(t.status!=='approved')return result(store,t);
    check(store);const cancelBefore=()=>{t.status='cancelled';store.save();return result(store,t);};if(signal?.aborted)return cancelBefore();
    t.status='authorizing';t.remoteRevocationConfirmed='unknown';store.save();
    const auth=await withCheckedPlanSession({directory:connectionDirectory,signal,onReady},async session=>{
      check(store);if(signal?.aborted)fail('cancelled');
      t.accountBinding=hash(planSessionBinding(session));t.status='executing';store.save();
      const authorize=request=>{
        const current=check(engine.store),r=engine.run(runId),last=r.attempts.at(-1);
        if(hash(r.config)!==hash(settings)||current.status!=='executing'||current.runId!==runId||current.accountBinding!==hash(planSessionBinding(session))||r.status!=='running'||request.run_id!==runId||r.attempts.length>3||r.budget.calls>3||hash(request.snapshot)!==hash(approvedSnapshot())||hash(request.scenes)!==hash(r.scenes)||last?.request_id!==request.request_id||last.state!=='dispatched'||last.stage!==request.stage||last.index!==request.index||last.external_call_intent!==true)fail('ambiguous_attempt');
      };
      const transport=createPlanTransportAdmissionHttpTransport({session,model:t.proposal.model_id,authorize,allowMissingContentType:true,allowReasoningDiscard:true,allowAggregateStream:true});
      const adapter=new ChatGPTPlanAdapter({httpTransport:transport});
      store.close();engine=new ModelPortNightvoyage(directory,{selection:selectAdapter({primary:adapter})});store=engine.store;t=check(store);
      runId=engine.start('nv-plan-transport-admission-01','nv-plan-transport-admission-01',approvedSnapshot(),settings);t.runId=runId;store.save();
      const cancel=()=>engine.cancel(runId);signal?.addEventListener('abort',cancel,{once:true});
      try{if(signal?.aborted)cancel();await engine.execute(runId);}finally{signal?.removeEventListener('abort',cancel);}
      const status=engine.run(runId).status;t.status=status==='completed'?'completed':status==='cancelled'?'cancelled':'failed';store.save();return receipt(store,t);
    });
    if(store.closed&&!engine)store=new Store(directory);
    if(!store.closed&&!store.poisoned){t=check(store,{expiry:false,allowWithdrawn:true});if(['authorizing','executing'].includes(t.status))t.status='failed';t.remoteRevocationConfirmed=auth.remoteRevocationConfirmed;store.save();}
    return {...result(store,t),authorization:{status:auth.status,reason:auth.reason??null,failureStage:auth.failureStage??null,httpDiagnostic:auth.httpDiagnostic??null,remoteRevocationConfirmed:auth.remoteRevocationConfirmed,credentialsPersisted:false,...(auth.cleanupNotice?{cleanupNotice:auth.cleanupNotice}:{})}};
  }finally{if(engine)engine.close();else if(!store.closed)store.close();}
}
