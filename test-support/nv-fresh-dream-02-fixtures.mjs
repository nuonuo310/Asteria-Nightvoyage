// Synthetic history and clocks only. This is never a user approval or user Store.
import {randomBytes} from 'node:crypto';
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
export function randomizeLegacyUnknownIdentities(store){
  const accounts=store.state.billing.accounts,oldAccountIds=Object.entries(accounts).filter(([,account])=>Object.values(account?.attempts??{}).some(row=>row?.status==='unknown')).map(([accountId])=>accountId),result=[];
  for(const oldAccountId of oldAccountIds){
    const account=accounts[oldAccountId],newAccountId=`legacy-${randomBytes(8).toString('hex')}`,attempts=account.attempts??{},replacements={};
    for(const [oldRequestId,row]of Object.entries(attempts)){
      if(row?.status!=='unknown'){replacements[oldRequestId]=row;continue;}
      const oldRunId=row.runId,newRunId=`synthetic-${randomBytes(10).toString('hex')}`,newRequestId=`stage-${newRunId}-scene-0`;
      row.runId=newRunId;row.requestId=newRequestId;row.fingerprint=randomBytes(32).toString('hex');row.sourceRefs=[{id:`source-${randomBytes(8).toString('hex')}`,version:'1'}];
      replacements[newRequestId]=row;result.push({accountId:newAccountId,requestId:newRequestId,runId:newRunId,fingerprint:row.fingerprint,sourceId:row.sourceRefs[0].id,reservedMicroCny:row.reservedMicroCny,chargedMicroCny:row.chargedMicroCny});
      const request=store.state.requests?.[oldAccountId];if(request&&request.runId===oldRunId)store.state.requests[newAccountId]={...request,runId:newRunId};
      if(store.state.runs?.[oldRunId]){const run=store.state.runs[oldRunId];delete store.state.runs[oldRunId];run.id=newRunId;if(run.billingAllowanceId===oldAccountId)run.billingAllowanceId=newAccountId;store.state.runs[newRunId]=run;}
    }
    account.attempts=replacements;if(account.allowance)account.allowance.id=newAccountId;if(Array.isArray(account.runIds))account.runIds=Object.values(replacements).map(row=>row.runId);if(account.allowance)account.fingerprint=hash(account.allowance);
    accounts[newAccountId]=account;delete accounts[oldAccountId];
  }
  for(const oldAccountId of oldAccountIds)delete store.state.requests?.[oldAccountId];
  store.save();
  return result.sort((a,b)=>`${a.accountId}\0${a.requestId}`.localeCompare(`${b.accountId}\0${b.requestId}`,'en'));
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
