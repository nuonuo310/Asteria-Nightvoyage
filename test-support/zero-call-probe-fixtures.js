// Independent synthetic parent and zero-call failure; no user receipt or Store.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Store} from '../src/store.js';
import {initPlanTrial,executePlanTrial} from '../scripts/chatgpt-plan-trial.mjs';
import {initPlanResponseProbe,executePlanResponseProbe} from '../scripts/chatgpt-plan-response-probe.mjs';
import {syntheticPlanHttp,trialApproval} from './plan-trial-fixtures.js';
export const reconnectApproval=()=>({approveZeroCallReconnect:true,allowFictionalEgress:true,confirmOneCallLimit:true,confirmNoExtraCredits:true,acknowledgeNoServerTokenCap:true});
export async function zeroCallProbeFixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'gpt-zero-call-reconnect-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const d={root,directory:path.join(root,'probe'),parentDirectory:path.join(root,'parent'),connectionDirectory:path.join(root,'connection')};
 initPlanTrial(d.parentDirectory,trialApproval());const http=syntheticPlanHttp({onGenerate:()=>new Response('INDEPENDENT-REJECTED-PARENT',{headers:{'Content-Type':'application/json'}})});http.install();try{await executePlanTrial({directory:d.parentDirectory,connectionDirectory:d.connectionDirectory,onReady:http.onReady});}finally{http.restore();}
 const parent=new Store(d.parentDirectory);delete Object.values(parent.state.runs)[0].modelPortDiagnostic;parent.state.planDreamTrial.proposal=JSON.parse(fs.readFileSync(new URL('../docs/proposals/gpt-plan-first-fictional-dream-v1-original.json',import.meta.url),'utf8'));parent.save();parent.close();
 initPlanResponseProbe(d.directory,d.parentDirectory,{approveOneSubscriptionCall:true,allowFictionalEgress:true,acknowledgePriorFailedTrial:true,confirmNoExtraCredits:true,acknowledgeNoServerTokenCap:true});const saved=globalThis.fetch;globalThis.fetch=async()=>{throw Error('SYNTHETIC-NETWORK-DETAIL',{cause:{code:'UND_ERR_CONNECT_TIMEOUT'}});};
 let failure;try{failure=await executePlanResponseProbe({...d,onReady:()=>{throw Error('unexpected login');}});}finally{globalThis.fetch=saved;}
 return {...d,failure};
}
