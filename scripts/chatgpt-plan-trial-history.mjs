// Body-free historical status. Never adopts an approval or loads an adapter/session.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {Store} from '../src/store.js';
import {hash,safeId} from '../src/contract.js';
import {reviewedPlanResponseDiagnostic} from './plan-response-diagnostic.mjs';
const fail=()=>{throw Error('trial_history_invalid');};
export function readPlanTrialHistory(directory){
  if(typeof directory!=='string'||!path.isAbsolute(directory))fail();
  if(!fs.existsSync(path.join(directory,'state.json')))return {status:'trial_not_found',ready:false,dispatchEnabled:false,credentialRead:false};
  const allowed=['gpt-plan-first-fictional-dream-v1-original.json','gpt-plan-first-fictional-dream-v1.json'].map(name=>JSON.parse(fs.readFileSync(new URL(`../docs/proposals/${name}`,import.meta.url),'utf8')));
  const store=new Store(directory);
  try{
    const t=store.state.planDreamTrial;
    if(Object.keys(store.state).some(k=>!['version','runs','requests','sessions','entries','recalls','planDreamTrial'].includes(k))||!t||!allowed.some(p=>hash(p)===hash(t.proposal))||!['approved','authorizing','executing','completed','failed'].includes(t.status)||![null,true,false,'unknown'].includes(t.remoteRevocationConfirmed))fail();
    if(!Number.isSafeInteger(t.approvedAt)||t.expiresAt!==t.approvedAt+86400000||t.fixtureEgressApproved!==true||t.extraCreditsDisabledConfirmed!==true||t.noServerTokenCapAcknowledged!==true)fail();
    if(t.runId!==null&&(typeof t.runId!=='string'||! /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(t.runId)))fail();
    const runs=Object.values(store.state.runs);if(runs.length>1||runs.some(r=>r.id!==t.runId))fail();
    const r=t.runId?store.state.runs[t.runId]:null;if(t.runId&&!r)fail();
    if(r&&(r.modelPortVersion!=='dream-model-port-v1'||r.modelSelection?.adapter_kind!=='ChatGPTPlanAdapter'||r.modelSelection?.provider_kind!=='openai'||r.modelSelection?.model_id!=='gpt-5.6-sol'||r.modelSelection?.auth_mode!=='chatgpt_plan'||r.modelSelection?.protocol_version!=='chatgpt-plan-inline-http-v1'))fail();
    if(r&&(!['queued','running','failed','uncertain','completed','cancelled','revoked','deleted'].includes(r.status)||!Array.isArray(r.attempts)||r.attempts.length>3||(!['revoked','deleted'].includes(r.status)&&!Array.isArray(r.scenes))||(r.scenes?.length??0)>2))fail();
    const usage=(r?.attempts??[]).map((a,i)=>{if(!safeId(a.request_id)||a.request_id!==`stage-${r.id}-${i===2?'wake':'scene'}-${i}`||a.stage!==(i===2?'wake':'scene')||a.index!==i||!['dispatched','committed'].includes(a.state)||a.external_call_intent!==true)fail();const u=a.usage;let normalized='unknown';if(u!=='unknown'){if(!u||!['input_tokens','output_tokens','total_tokens'].every(k=>Number.isSafeInteger(u[k])&&u[k]>=0)||u.input_tokens+u.output_tokens!==u.total_tokens)fail();normalized={input_tokens:u.input_tokens,output_tokens:u.output_tokens,total_tokens:u.total_tokens};}return {request_id:a.request_id,usage:normalized};});
    return {status:r?.status??t.status,ready:false,dispatchEnabled:false,credentialRead:false,model_id:'gpt-5.6-sol',adapter_kind:'ChatGPTPlanAdapter',protocol_version:'chatgpt-plan-inline-http-v1',runId:t.runId,external_calls_started:r?.attempts.filter(a=>a.external_call_intent).length??0,checkpoint:{saved_scenes:r?.scenes?.length??0,wake_saved:r?.status==='completed'},usage,error_category:['authorization_required','adapter_unavailable','budget_exhausted','cancelled','timeout','ambiguous_attempt','invalid_model_response','source_withdrawn','storage_io_failure','foreign_execution_owner'].includes(r?.modelPortError)?r.modelPortError:null,validation_diagnostic:reviewedPlanResponseDiagnostic(r?.modelPortDiagnostic),historicalCauseRecoverable:!!reviewedPlanResponseDiagnostic(r?.modelPortDiagnostic),remoteRevocationConfirmed:t.remoteRevocationConfirmed,money:'unknown',qualityAssessed:false};
  }finally{store.close();}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    if(process.argv.length!==2)fail();const base=process.platform==='win32'?process.env.LOCALAPPDATA:path.join(os.homedir(),'.local','share');if(!base||!path.isAbsolute(base))fail();
    console.log(JSON.stringify(readPlanTrialHistory(path.join(base,'Nightvoyage','gpt-subscription-first-dream')),null,2));
  }catch{console.error(JSON.stringify({status:'history_unavailable',dispatchEnabled:false,credentialRead:false}));process.exitCode=1;}
}
