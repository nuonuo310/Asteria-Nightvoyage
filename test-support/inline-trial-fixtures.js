// Synthetic confirmations on independently fabricated history, never user consent.
import {prepareInlineAdmissionHistory} from './inline-admission-fixtures.js';
import {Store} from '../src/store.js';
import {readInlinePaidContract} from '../src/inline-paid-contract.js';
import {initInlineTrialAuthorization} from '../src/inline-trial-authorization.js';
export {authorizedTransport as trialTransport} from './inline-authorization-fixtures.js';
export const trialFixtureNow=Date.parse('2026-10-17T15:00:00Z');
export function trialConfirmation(){const {contractHash}=readInlinePaidContract();return {contractHash,budgetCny:3,caseId:'sparse-context',allowFictionalEgress:true,acknowledgePreservedHolds:true,acknowledgeMutableModelAlias:true,accountCurrency:'CNY'};}
export function prepareTrialHistory(t,{mode='stub',authorize=true,dispatchKind=mode==='stub'?'rehearsal':'provider'}={}){
  const clock=Date.now;Date.now=()=>trialFixtureNow;t.after(()=>Date.now=clock);
  const directory=prepareInlineAdmissionHistory(t),s=new Store(directory);
  try{const oldAccounts=structuredClone(s.state.billing.accounts),confirmation=trialConfirmation(),record=authorize?initInlineTrialAuthorization(s,{confirmation,mode,dispatchKind}):null;return {directory,oldAccounts,confirmation,record};}finally{s.close();}
}
