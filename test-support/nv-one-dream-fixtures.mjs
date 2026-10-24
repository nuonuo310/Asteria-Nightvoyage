// Synthetic history and clocks only. This is never a user approval or user Store.
import {Store} from '../src/store.js';
import {prepareInlineAdmissionHistory} from './inline-admission-fixtures.js';
import {readOneDreamContract} from '../scripts/nv-deepseek-one-dream/contract.mjs';
import {initOneDreamAuthorization} from '../scripts/nv-deepseek-one-dream/authorization.mjs';
import {createOneDreamLoopback} from '../scripts/nv-deepseek-one-dream/local-http.mjs';

export const oneDreamTestNow=Date.parse('2026-10-24T17:00:00Z');
export function useOneDreamClock(t,now=oneDreamTestNow){
  const original=Date.now;Date.now=()=>now;t.after(()=>{Date.now=original;});return now;
}
export function oneDreamConfirmationFor(contract){
  return {contractHash:readOneDreamContract({now:oneDreamTestNow}).contractHash,budgetCny:3,caseId:contract.material.caseId,allowFictionalEgress:true,acknowledgePreservedHolds:true,acknowledgeMutableModelAlias:true,accountCurrency:'CNY'};
}
export function prepareOneDreamHistory(t,{mode='stub',authorize=true,now=oneDreamTestNow}={}){
  useOneDreamClock(t,now);
  const directory=prepareInlineAdmissionHistory(t),store=new Store(directory);
  try{
    const oldAccounts=structuredClone(store.state.billing.accounts),checked=readOneDreamContract({now}),confirmation=oneDreamConfirmationFor(checked.contract);
    const record=authorize?initOneDreamAuthorization(store,{confirmation,mode,now}):null;
    return {directory,oldAccounts,contract:checked.contract,contractHash:checked.contractHash,confirmation,record};
  }finally{store.close();}
}
export async function startOneDreamLoopback(t,options={}){
  const loopback=await createOneDreamLoopback(options);t.after(()=>loopback.close());return loopback;
}
export async function waitFor(predicate,{timeoutMs=2000,stepMs=5}={}){
  const deadline=Date.now()+timeoutMs;
  while(Date.now()<deadline){if(predicate())return;await new Promise(resolve=>setTimeout(resolve,stepMs));}
  throw Error('one_dream_wait_timeout');
}
