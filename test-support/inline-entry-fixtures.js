// Independent synthetic accounting history; never a user's Store or discarded response.
import fs from 'node:fs';
import {prepareCoupledHistory} from './coupled-trial-fixtures.js';
import {Store} from '../src/store.js';
import {BudgetLedger} from '../src/budget-ledger.js';
import {hash} from '../src/contract.js';
export function prepareInlineEntryHistory(t){
  const directory=prepareCoupledHistory(t),profile=JSON.parse(fs.readFileSync(new URL('../src/continuity-trial-profile.json',import.meta.url),'utf8')),store=new Store(directory),ledger=new BudgetLedger(store),requestId='synthetic-fourth-entry-history';
  try{ledger.approve(profile.allowance);ledger.reserve(profile.allowance.id,{requestId,runId:'synthetic-entry-history-run',fingerprint:hash(requestId),sourceRefs:[{id:'q-sparse-memory',version:'1'}],maxOutputTokens:400},profile.allowance.pricing.checkedAt+1000);ledger.dispatch(profile.allowance.id,requestId);ledger.unknown(profile.allowance.id,requestId);}
  finally{store.close();}
  return directory;
}
