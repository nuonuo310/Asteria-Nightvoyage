// Independently fabricated history, never a user's Store, dream or configuration.
import {spawnSync} from 'node:child_process';
import {prepareCoupledHistory} from './coupled-trial-fixtures.js';
export function prepareContinuityHistory(t){
  const d=prepareCoupledHistory(t),script=`import fs from 'node:fs';import {BudgetedNightvoyage} from './src/budgeted-runtime.js';import {continuityResponse} from './test-support/continuity-runtime-fixtures.js';import {coupledTrialId,coupledTrialInput} from './src/coupled-trial-config.js';const p=JSON.parse(fs.readFileSync('src/coupled-trial-profile.json'));Date.now=()=>p.allowance.pricing.checkedAt+1000;globalThis.fetch=async(_url,r)=>new Response(JSON.stringify(continuityResponse({body:JSON.parse(r.body)}).body));const e=new BudgetedNightvoyage(process.argv[1],{allowance:p.allowance,mode:'live',enabled:true,protocol:'coupled-affect-v1',credential:'DUMMY-HISTORY-SIMULATOR'});e.store.atomic(coupledTrialId+'.json',p);const id=e.start(coupledTrialId,coupledTrialId,coupledTrialInput(p));await e.execute(id);if(e.status(id).status!=='completed')throw Error('synthetic_coupled_history_failed');e.close();`;
  const r=spawnSync(process.execPath,['--input-type=module','-e',script,d],{cwd:new URL('..',import.meta.url),encoding:'utf8'});if(r.status!==0)throw Error('synthetic_history_preparation_failed');return d;
}
