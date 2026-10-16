import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { Store, fail, copy } from './store.js';
import { hash, own } from './contract.js';
import { BudgetLedger, validateAllowance, maximumCost } from './budget-ledger.js';
import { GatedDeepSeekClient } from './gated-deepseek-client.js';
import { pricingProfile, profileExpiresAt } from './trial-config.js';
import { compactTrialId, compactTrialProposal, compactHistoricalProposal, readCompactTrial, compactTrialInput, compactTrialState } from './compact-trial-config.js';

export const diagnosticId='compact-single-scene-diagnostic-20261015';
const filename=`${diagnosticId}.json`,requestId=`${diagnosticId}-scene-0`;
const diagnosticPin='931a0bd25e03755570a8931fc5efa4d25a2c2548b164ede0051b005b17d9c0be';
const clockReady=now=>Number.isFinite(now)&&now>=pricingProfile.checkedAt&&now<profileExpiresAt;
export function singleSceneProposal() {
  const p=compactTrialProposal();
  const bytes=fs.readFileSync(new URL('./validation-diagnostic.js',import.meta.url),'utf8').replace(/\r\n/g,'\n');
  if(createHash('sha256').update(bytes).digest('hex')!==diagnosticPin)fail('diagnostic_source_changed');
  return historicalDiagnosticProposal(p);
}
function historicalDiagnosticProposal(p=compactHistoricalProposal()){
  return {...p,batchId:diagnosticId,protocolSourcePins:{...p.protocolSourcePins,'validation-diagnostic.js':diagnosticPin},
    kind:'single_scene_protocol_diagnostic',maxAdditionalCalls:1,maxAdditionalRuns:1,
    persistsGeneratedBody:false,continuesPriorRun:false,diagnosesDiscardedPriorResponse:false};
}
function reviewedConfig() {
  return {...historicalDiagnosticProposal(),fixtureEgressApproved:true,paidEvaluationApproved:true,
    allowance:validateAllowance({id:diagnosticId,mode:'live',approved:true,expiresAt:profileExpiresAt,
      limits:{maxRuns:1,maxCalls:1,maxMicroCny:3000000},pricing:pricingProfile})};
}
export function readSingleSceneConfig(directory) {
  const file=path.join(directory,filename);
  if(!fs.existsSync(file)||!fs.lstatSync(file).isFile()||fs.lstatSync(file).isSymbolicLink())fail('diagnostic_approval_missing_or_unsafe');
  const config=JSON.parse(fs.readFileSync(file,'utf8'));
  if(hash(config)!==hash(reviewedConfig()))fail('diagnostic_config_not_reviewed');return config;
}
function previousFailure(store,ledger,now) {
  const config=readCompactTrial(store.directory),state=compactTrialState(store,config,now),prior=ledger.status(compactTrialId);
  const run=state.run&&own(store.state.runs,state.run.id),row=prior.attempts[0];
  if(!run||run.status!=='failed'||run.error!=='compact_appraisal_invalid'||state.run.stagesSaved!==0||
      prior.calls!==1||prior.runs!==1||row.status!=='unknown'||row.runId!==run.id||
      row.requestId!==`stage-${run.id}-scene-0`||row.chargedMicroCny!==row.reservedMicroCny)
    fail('expected_prior_compact_failure_required');
  // Only the explicitly reviewed old hold is allowed; other unresolved attempts block.
  for(const [id,account] of Object.entries(store.state.billing.accounts))
    if(id!==diagnosticId&&Object.values(account.attempts).some(t=>t.status!=='settled'&&!(id===compactTrialId&&t.requestId===row.requestId)))
      fail('other_unsettled_attempt_requires_review');
  return prior;
}
export function initSingleSceneDiagnostic(directory,{budgetCny,approvedCase,approveFictionalEgress=false,approvePreservedHold=false,now=Date.now()}={}) {
  if(String(budgetCny)!=='3'||approvedCase!=='sparse-context'||approveFictionalEgress!==true||approvePreservedHold!==true)
    fail('explicit_diagnostic_approval_required');
  if(!clockReady(now))fail('pricing_review_expired');
  singleSceneProposal();
  const config=reviewedConfig();readCompactTrial(directory);const store=new Store(directory);
  try {
    if(config.sourceRefs.some(s=>store.withdrawn.includes(s.id)))fail('source_withdrawn');
    const ledger=new BudgetLedger(store);previousFailure(store,ledger,now);
    if(fs.existsSync(path.join(store.directory,filename)))readSingleSceneConfig(store.directory);else store.atomic(filename,config);
    ledger.approve(config.allowance);return config;
  }finally{store.close();}
}
export function singleSceneState(store,config,now=Date.now()) {
  if(hash(config)!==hash(readSingleSceneConfig(store.directory)))fail('diagnostic_config_not_reviewed');
  const ledger=new BudgetLedger(store),current=ledger.status(diagnosticId),prior=ledger.status(compactTrialId);
  if(hash(current.allowance)!==hash(config.allowance))fail('allowance_conflict');
  const record=own(store.state.protocolDiagnostics??{},diagnosticId);
  if(record&&(record.schemaVersion!==1||record.protocolVersion!==config.protocolVersion||record.allowanceId!==diagnosticId||
      !['running','accepted','failed','cancelled'].includes(record.status)))fail('diagnostic_run_identity_mismatch');
  const row=current.attempts[0];
  if(current.calls>1||current.runs>1||row&&(row.runId!==diagnosticId||row.requestId!==requestId))fail('diagnostic_run_identity_mismatch');
  const cost=maximumCost(config.allowance.pricing,400);
  let sourcePinsMatch=true;try{singleSceneProposal();}catch{sourcePinsMatch=false;}
  let reason=!sourcePinsMatch?'diagnostic_source_changed':!clockReady(now)?'pricing_or_allowance_expired':config.sourceRefs.some(s=>store.withdrawn.includes(s.id))?'source_withdrawn':
    current.calls?'diagnostic_attempt_consumed':record?'diagnostic_already_started':BigInt(current.heldOrSpentMicroCny)+cost>3000000n?'reservation_exceeds_remaining_budget':'limits_checked';
  if(reason==='limits_checked')previousFailure(store,ledger,now);
  const summary=s=>({calls:s.calls,runs:s.runs,heldOrSpentMicroCny:s.heldOrSpentMicroCny}),all=Object.keys(store.state.billing.accounts).map(id=>ledger.status(id));
  return {ready:reason==='limits_checked',reason,sourcePinsMatch,credentialRead:false,batchId:diagnosticId,caseId:config.caseId,model:config.model,
    kind:'single_scene_protocol_diagnostic',materialKind:'fictional',generatedEventOrigin:'dream',isRealityFact:false,sourceRefs:copy(config.sourceRefs),
    additionalBudgetCny:3,maxAdditionalRuns:1,maxAdditionalCalls:1,nextReservationCny:Number(cost)/1000000,
    diagnosticStatus:row?.status==='settled'?'accepted':record?.status==='running'&&row?.status==='unknown'?'interrupted':record?.status??(row?'interrupted':'not_started'),
    protocolValidation:row?.status==='settled'?'accepted':row?.validationDiagnostic?'rejected':'not_assessed',
    validationDiagnostic:copy(row?.validationDiagnostic??null),
    previousCompactTrial:summary(prior),diagnosticAllowance:summary(current),
    allAllowances:{calls:all.reduce((n,s)=>n+s.calls,0),runs:all.reduce((n,s)=>n+s.runs,0),heldOrSpentMicroCny:all.reduce((n,s)=>n+BigInt(s.heldOrSpentMicroCny),0n).toString()},
    billing:copy(current.attempts),persistedGeneratedBody:false,semanticSupport:'not_assessed',qualityAssessed:false};
}
export function singleScenePreflight(directory,now=Date.now()) {
  if(!fs.existsSync(path.join(directory,filename)))return {ready:false,reason:'single_scene_approval_required',credentialRead:false,proposal:singleSceneProposal()};
  const store=new Store(directory);try{return singleSceneState(store,readSingleSceneConfig(store.directory),now);}finally{store.close();}
}
// No fake production mode, alternate HTTP/model, output body, resume or reset path.
export async function executeSingleSceneDiagnostic(store,config,{credential,signal,fault=()=>{}}={}) {
  if(!singleSceneState(store,config).ready)fail('diagnostic_preflight_blocked');
  if(typeof credential!=='string'||!credential.trim()||credential.length>2000||/[\r\n]/.test(credential))fail('credential_required');
  const client=new GatedDeepSeekClient(store,{enabled:true,mode:'live',protocol:'compact-appraisal-v1',timeoutMs:60000,fault});
  try {
    store.state.protocolDiagnostics??={};
    const record={schemaVersion:1,protocolVersion:config.protocolVersion,allowanceId:diagnosticId,status:'running'};
    store.state.protocolDiagnostics[diagnosticId]=record;store.save();fault('diagnostic_started');
    try {
      // Exact prior approved fixture and unchanged first-scene protocol. No prior dream is supplied.
      const input=compactTrialInput(readCompactTrial(store.directory));
      await client.send({allowanceId:diagnosticId,requestId,runId:diagnosticId,credential,signal,
        payload:{stage:'scene',index:0,snapshot:input,scenes:[]},
        publish:()=>{record.status='accepted';}});
      // Publication callback stores only status atomically with the original ledger settlement.
    } catch {
      // Do not persist exception strings. Check/HTTP/billing detail stays in existing safe receipt fields.
      if(!store.poisoned&&!store.closed){record.status=signal?.aborted?'cancelled':'failed';store.save();}
      else fail('storage_io_failure');
    }
    return singleSceneState(store,config);
  }finally{client.close();}
}
