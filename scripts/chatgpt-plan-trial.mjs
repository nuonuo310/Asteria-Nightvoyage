// One explicit fictional subscription trial. No API allowance or silent fallback.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {Store} from '../src/store.js';
import {hash,snapshot} from '../src/contract.js';
import {withCheckedPlanSession,planSessionBinding} from './chatgpt-plan-login.mjs';
import {createPlanHttpTransport,planHttpProtocolVersion} from './chatgpt-plan-http.mjs';
import {ChatGPTPlanAdapter,selectAdapter,jsonFields} from './dream-model-port.mjs';
import {ModelPortNightvoyage} from './dream-model-runtime.mjs';
import {reviewedPlanResponseDiagnostic} from './plan-response-diagnostic.mjs';
import {readModelPortContent} from './model-port-content-view.mjs';
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
  visit('scripts/chatgpt-plan-trial.mjs');visit('scripts/chatgpt-plan-trial-cli.mjs');visit('package.json');
  return Object.fromEntries(Object.entries(pins).sort(([a],[b])=>a.localeCompare(b)));
}
export const planTrialVersion='chatgpt-plan-fictional-trial-v1';
const settings=Object.freeze({scenes:2,maxCalls:3,inputTokens:65536,outputTokens:3600,perCallOutput:1200,timeoutMs:60000});
function calculateProposal(){
  const raw=fs.readFileSync(fixturePath,'utf8').replaceAll('\r\n','\n');
  if(digest(raw)!==fixtureHash)fail('trial_fixture_changed');
  const input=snapshot(JSON.parse(raw));if(input.sources.some(s=>s.grant.modelEgress))fail('trial_fixture_changed');
  const pins=sourcePins();
  return {contractVersion:planTrialVersion,batchId:'gpt-plan-first-fictional-dream-v1',adapter_kind:'ChatGPTPlanAdapter',provider_kind:'openai',model_id:'gpt-5.6-sol',auth_mode:'chatgpt_plan',protocol_version:planHttpProtocolVersion,fixtureHash,sourcePins:pins,maxRuns:1,maxCalls:3,settings:{...settings},localLimits:{requestBytes:65536,streamBytes:65536,contentBytes:1200,serverOutputTokenCap:null},apiFallback:false,extraCreditsApproved:false};
}
export function planTrialProposal(){
  const current=calculateProposal();
  const reviewed=JSON.parse(fs.readFileSync(new URL('../docs/proposals/gpt-plan-first-fictional-dream-v1.json',import.meta.url),'utf8'));
  if(hash(current)!==hash(reviewed))fail('trial_source_pins_changed');
  return current;
}

function approvedSnapshot(){const input=JSON.parse(fs.readFileSync(fixturePath,'utf8'));for(const s of input.sources)s.grant.modelEgress=true;return snapshot(input);}
function absolute(directory){if(typeof directory!=='string'||!path.isAbsolute(directory))fail('absolute_trial_directory_required');}
function ownTrialStore(store){
  store.assert();if(Object.keys(store.state).some(k=>!['version','runs','requests','sessions','entries','recalls','planDreamTrial'].includes(k)))fail('foreign_execution_owner');
}
function check(store,{expiry=true}={}){
  ownTrialStore(store);const t=store.state.planDreamTrial;
  if(!t)fail('trial_approval_required');
  jsonFields(t,['proposal','approvedAt','expiresAt','fixtureEgressApproved','extraCreditsDisabledConfirmed','noServerTokenCapAcknowledged','status','runId','accountBinding','remoteRevocationConfirmed']);
  if(!['approved','authorizing','executing','completed','failed'].includes(t.status)||![null,true,false,'unknown'].includes(t.remoteRevocationConfirmed)||(t.accountBinding!==null&&!/^[a-f0-9]{64}$/.test(t.accountBinding)))fail('trial_approval_invalid');
  if(hash(t.proposal)!==hash(planTrialProposal()))fail('trial_source_pins_changed');
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
  return {contract_version:planTrialVersion,status:r?.status??t.status,runId:t.runId,adapter_kind:t.proposal.adapter_kind,provider_kind:t.proposal.provider_kind,model_id:t.proposal.model_id,auth_mode:t.proposal.auth_mode,protocol_version:t.proposal.protocol_version,fallback_from:null,fallback_reason:null,
    external_calls_started:r?.attempts.filter(a=>a.external_call_intent).length??0,checkpoint:{saved_scenes:r?.scenes?.length??0,wake_saved:r?.status==='completed'},usage:r?.attempts.map(a=>({request_id:a.request_id,usage:a.usage??'unknown'}))??[],error_category:r?.modelPortError??null,
    validation_diagnostic:reviewedPlanResponseDiagnostic(r?.modelPortDiagnostic),
    money:'unknown',remoteRevocationConfirmed:t.remoteRevocationConfirmed,remoteCleanupMayBeRequired:[false,'unknown'].includes(t.remoteRevocationConfirmed),serverOutputTokenCap:null,extraCreditsApproved:false,usageSettingsVerification:'user_assertion_only',remoteCancellationConfirmed:'unknown',qualityAssessed:false};
}
function result(store,t){
  store.assert();
  const r=t.runId?store.state.runs[t.runId]:null,view=r?.status==='completed'?readModelPortContent(store,r.entryId):null;
  let residue=null;
  if(view){const e=store.state.entries[r.entryId],a=e.residue;if(!a||a.strength!==view.narrative.wake.residue||!Number.isFinite(a.startedAt)||a.durationMs!==3600000)fail('trial_record_invalid');residue={schemaVersion:1,origin:'simulated_affect',materialKind:'fictional',isRealityFact:false,sourceRefs:view.sourceRefs,derivedFrom:[r.entryId],strength:a.strength*Math.max(0,1-Math.max(0,Date.now()-a.startedAt)/a.durationMs)};}
  return {dream:view?.narrative.dream??null,wake:view?.narrative.wake??null,residue,associations:view?view.narrative.wake.associations.map(text=>({origin:'dream_association',materialKind:'fictional',isRealityFact:false,sourceRefs:view.sourceRefs,derivedFrom:[r.entryId],text})):[],receipt:receipt(store,t)};
}
export function initPlanTrial(directory,approval){
  absolute(directory);jsonFields(approval,['approveFictionalSubscriptionTrial','confirmExtraCreditsDisabled','acknowledgeNoServerTokenCap']);
  if(Object.values(approval).some(v=>v!==true))fail('trial_approval_required');
  const proposal=planTrialProposal(),store=new Store(directory);
  try{
    ownTrialStore(store);
    if(!store.state.planDreamTrial){
      if(Object.keys(store.state.runs).length||Object.keys(store.state.entries).length||Object.keys(store.state.requests).length||Object.keys(store.state.sessions).length||Object.keys(store.state.recalls).length||store.state.billing)fail('foreign_execution_owner');
      if(approvedSnapshot().sources.some(s=>store.withdrawn.includes(s.id)))fail('source_withdrawn');
      if(store.withdrawn.length||store.deletions.length)fail('foreign_execution_owner');
      const now=Date.now();store.state.planDreamTrial={proposal,approvedAt:now,expiresAt:now+86400000,fixtureEgressApproved:true,extraCreditsDisabledConfirmed:true,noServerTokenCapAcknowledged:true,status:'approved',runId:null,accountBinding:null,remoteRevocationConfirmed:null};store.save();
    }
    const t=check(store);return {ready:t.status==='approved',...receipt(store,t),expiresAt:t.expiresAt};
  }finally{store.close();}
}
export function preflightPlanTrial(directory){
  absolute(directory);if(!fs.existsSync(path.join(directory,'state.json')))return {ready:false,reason:'trial_approval_required',credentialRead:false,proposal:planTrialProposal()};
  const store=new Store(directory);try{const t=check(store,{expiry:false});let reason=t.status==='approved'?'limits_checked':'trial_consumed';if(Date.now()<t.approvedAt||Date.now()>=t.expiresAt)reason='trial_expired';return {ready:reason==='limits_checked',reason,credentialRead:false,expiresAt:t.expiresAt,...receipt(store,t)};}finally{store.close();}
}
export async function executePlanTrial({directory,connectionDirectory,onReady,signal}){
  absolute(directory);absolute(connectionDirectory);
  if(!fs.existsSync(path.join(directory,'state.json')))fail('trial_approval_required');
  let store=new Store(directory),engine=null,runId=null;
  try{
    let t=check(store,{expiry:false});
    // A terminal replay is local, including after expiry. Never opens OAuth or dispatches.
    if(t.status!=='approved')return result(store,t);
    check(store);if(signal?.aborted)fail('cancelled');
    t.status='authorizing';t.remoteRevocationConfirmed='unknown';store.save();
    const auth=await withCheckedPlanSession({directory:connectionDirectory,signal,onReady},async session=>{
      check(store);if(signal?.aborted)fail('cancelled');
      t.accountBinding=hash(planSessionBinding(session));t.status='executing';store.save();
      const authorize=request=>{
        const current=check(engine.store),r=engine.run(runId),last=r.attempts.at(-1);
        if(hash(r.config)!==hash(settings)||current.status!=='executing'||current.runId!==runId||current.accountBinding!==hash(planSessionBinding(session))||r.status!=='running'||request.run_id!==runId||r.attempts.length>3||r.budget.calls>3||hash(request.snapshot)!==hash(approvedSnapshot())||hash(request.scenes)!==hash(r.scenes)||last?.request_id!==request.request_id||last.state!=='dispatched'||last.stage!==request.stage||last.index!==request.index||last.external_call_intent!==true)fail('ambiguous_attempt');
      };
      const transport=createPlanHttpTransport({session,model:t.proposal.model_id,authorize}),adapter=new ChatGPTPlanAdapter({model_id:t.proposal.model_id,httpTransport:transport});
      store.close();engine=new ModelPortNightvoyage(directory,{selection:selectAdapter({primary:adapter})});store=engine.store;t=check(store);
      runId=engine.start('gpt-plan-first-fictional-dream','gpt-plan-first-fictional-dream',approvedSnapshot(),settings);t.runId=runId;store.save();
      const cancel=()=>engine.cancel(runId);signal?.addEventListener('abort',cancel,{once:true});
      try{if(signal?.aborted)cancel();await engine.execute(runId);}finally{signal?.removeEventListener('abort',cancel);}
      t.status=engine.run(runId).status==='completed'?'completed':'failed';store.save();return receipt(store,t);
    });
    if(store.closed&&!engine)store=new Store(directory);
    if(!store.closed&&!store.poisoned){t=check(store,{expiry:false});if(['authorizing','executing'].includes(t.status))t.status='failed';t.remoteRevocationConfirmed=auth.remoteRevocationConfirmed;store.save();}
    return {...result(store,t),authorization:{status:auth.status,reason:auth.reason??null,failureStage:auth.failureStage??null,httpDiagnostic:auth.httpDiagnostic??null,remoteRevocationConfirmed:auth.remoteRevocationConfirmed,credentialsPersisted:false,...(auth.cleanupNotice?{cleanupNotice:auth.cleanupNotice}:{})}};
  }finally{if(engine)engine.close();else if(!store.closed)store.close();}
}
