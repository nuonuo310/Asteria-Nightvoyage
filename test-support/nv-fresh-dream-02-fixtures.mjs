// Synthetic history and clocks only. This is never a user approval or user Store.
import {Store} from '../src/store.js';
import {hash} from '../src/contract.js';
import {prepareInlineAdmissionHistory} from './inline-admission-fixtures.js';
import {readOneDreamContract} from '../scripts/nv-deepseek-fresh-dream-02/contract.mjs';
import {initOneDreamAuthorization} from '../scripts/nv-deepseek-fresh-dream-02/authorization.mjs';
import {createOneDreamLoopback} from '../scripts/nv-deepseek-fresh-dream-02/local-http.mjs';

export const freshDreamTestNow=Date.parse('2026-10-25T13:20:00Z');
export const priorOneDreamAllowanceId='nv-deepseek-one-dream-20261025';
export function useFreshDreamClock(t,now=freshDreamTestNow){
  const original=Date.now;Date.now=()=>now;t.after(()=>{Date.now=original;});return now;
}
export function freshDreamConfirmationFor(contract){
  return {contractHash:readOneDreamContract({now:freshDreamTestNow}).contractHash,budgetCny:3,caseId:contract.material.caseId,allowFictionalEgress:true,acknowledgePreservedHolds:true,acknowledgeMutableModelAlias:true,accountCurrency:'CNY'};
}
function seedPriorOneDreamUnknown(store){
  const allowance={id:priorOneDreamAllowanceId,mode:'stub',approved:true,expiresAt:Date.parse('2026-10-25T16:45:00Z'),limits:{maxRuns:1,maxCalls:3,maxMicroCny:3000000},pricing:{model:'deepseek-flash',contextTokenLimit:1048576,inputMicroCnyPerMillion:2000000,outputMicroCnyPerMillion:8000000,reference:'https://api-docs.deepseek.com/zh-cn/quick_start/pricing/',checkedAt:Date.parse('2026-10-24T16:45:00Z')},protocolVersion:'inline-evidence-quotes-v1',entryAuthorizationVersion:'nv-deepseek-one-dream-authorization-v1'};
  const runId='prior-one-dream-run',requestId=`stage-${runId}-scene-0`;
  store.state.billing.accounts[priorOneDreamAllowanceId]={fingerprint:hash(allowance),allowance,attempts:{[requestId]:{requestId,runId,fingerprint:'b'.repeat(64),sourceRefs:[{id:'fiction-night-station-source',version:'1'}],status:'unknown',maxOutputTokens:400,reservedMicroCny:'2100352',chargedMicroCny:'2100352'}},runIds:[runId]};
  store.save();
}
export function prepareFreshDream02History(t,{mode='stub',authorize=true,now=freshDreamTestNow}={}){
  useFreshDreamClock(t,now);
  const directory=prepareInlineAdmissionHistory(t),store=new Store(directory);
  try{
    seedPriorOneDreamUnknown(store);
    const oldAccounts=structuredClone(store.state.billing.accounts),checked=readOneDreamContract({now}),confirmation=freshDreamConfirmationFor(checked.contract);
    const record=authorize?initOneDreamAuthorization(store,{confirmation,mode,now}):null;
    return {directory,oldAccounts,contract:checked.contract,contractHash:checked.contractHash,confirmation,record};
  }finally{store.close();}
}
export async function startFreshDreamLoopback(t,options={}){
  const loopback=await createOneDreamLoopback(options);t.after(()=>loopback.close());return loopback;
}
export async function waitFor(predicate,{timeoutMs=2000,stepMs=5}={}){
  const deadline=Date.now()+timeoutMs;
  while(Date.now()<deadline){if(predicate())return;await new Promise(resolve=>setTimeout(resolve,stepMs));}
  throw Error('fresh_dream_wait_timeout');
}
