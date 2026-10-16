// Independent public synthetic metadata, not a repair of any real failed run.
import fs from 'node:fs';
import {prepareInlineEntryHistory} from './inline-entry-fixtures.js';
import {Store} from '../src/store.js';
export function prepareInlineAdmissionHistory(t){
  const directory=prepareInlineEntryHistory(t),profile=JSON.parse(fs.readFileSync(new URL('../src/continuity-trial-profile.json',import.meta.url),'utf8')),s=new Store(directory);
  try{const a=s.state.billing.accounts[profile.batchId],old=Object.keys(a.attempts)[0],row=a.attempts[old],runId=row.runId;delete a.attempts[old];row.requestId=`stage-${runId}-scene-0`;a.attempts[row.requestId]=row;s.state.requests[profile.batchId]={runId};s.state.runs[runId]={id:runId,status:'failed',scenes:[],sourceIds:['q-sparse-memory'],billingAllowanceId:profile.batchId,billingProtocolVersion:profile.protocolVersion,appraisalProtocolVersion:profile.protocolVersion};s.atomic(profile.batchId+'.json',profile);s.save();}finally{s.close();}
  return directory;
}
