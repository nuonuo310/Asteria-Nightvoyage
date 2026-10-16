import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {freezeOwnerCore} from './frozen-owner-project.js';
import os from 'node:os';
import path from 'node:path';
import {Store} from '../src/store.js';
import {BudgetLedger} from '../src/budget-ledger.js';
import {hash} from '../src/contract.js';
import {initQualityBatch} from '../src/quality-config.js';
import {pricingProfile} from '../src/trial-config.js';
import {compactTrialId,initCompactTrial} from '../src/compact-trial-config.js';
import {diagnosticId,initSingleSceneDiagnostic} from '../src/single-scene-diagnostic.js';
const now=pricingProfile.checkedAt+1000;
export function preparePrunedHistory(t,complete=true){
 const project=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-history-source-'));t.after(()=>fs.rmSync(project,{recursive:true,force:true}));
 for(const name of ['src','fixtures','test-support'])fs.cpSync(new URL('../'+name,import.meta.url),path.join(project,name),{recursive:true});
 fs.copyFileSync(new URL('../package.json',import.meta.url),path.join(project,'package.json'));freezeOwnerCore(project);
 const script="import {preparePrunedHistoryUnchecked} from './test-support/pruned-history-fixtures.js';const d=preparePrunedHistoryUnchecked({after(){}},"+JSON.stringify(complete)+");console.log(JSON.stringify({directory:d}));";
 const child=spawnSync(process.execPath,['--input-type=module','-e',script],{cwd:project,encoding:'utf8',timeout:15000});if(child.status!==0)throw Error('synthetic_history_preparation_failed');const d=JSON.parse(child.stdout).directory;t.after(()=>fs.rmSync(d,{recursive:true,force:true}));return d;
}
export function preparePrunedHistoryUnchecked(t,complete=true){const d=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-compact-entry-'));t.after(()=>fs.rmSync(d,{recursive:true,force:true}));
  const prior=initQualityBatch(d,{budgetCny:3,approvedCases:['courtyard-cloth','drawer-and-orbit','sparse-context'],approveFictionalEgress:true,acknowledgePreservedHolds:true,now});
  const s=new Store(d),l=new BudgetLedger(s);if(complete)for(let i=0;i<9;i++){
    const requestId=`prior-${i}`;l.reserve(prior.allowance.id,{requestId,runId:`prior-run-${Math.floor(i/3)}`,fingerprint:hash(requestId),sourceRefs:[{id:'q-sparse-memory',version:'1'}],maxOutputTokens:400},now);l.dispatch(prior.allowance.id,requestId);l.settle(prior.allowance.id,requestId,{model:'deepseek-flash',usage:{inputTokens:100,outputTokens:50,totalTokens:150}});
  }s.close();
  if(complete){
    const c=initCompactTrial(d,{budgetCny:3,approvedCase:'sparse-context',approveFictionalEgress:true,acknowledgePreservedHolds:true,now});
    let st=new Store(d),le=new BudgetLedger(st);const id='old-failed';
    st.state.requests[compactTrialId]={runId:id};st.state.runs[id]={id,status:'failed',error:'compact_appraisal_invalid',scenes:[],sourceIds:['q-sparse-memory'],billingAllowanceId:compactTrialId,billingProtocolVersion:c.protocolVersion,appraisalProtocolVersion:c.protocolVersion};st.save();
    le.reserve(compactTrialId,{requestId:`stage-${id}-scene-0`,runId:id,fingerprint:hash(id),sourceRefs:c.sourceRefs,maxOutputTokens:400},now);le.dispatch(compactTrialId,`stage-${id}-scene-0`);le.unknown(compactTrialId,`stage-${id}-scene-0`);st.close();
    initSingleSceneDiagnostic(d,{budgetCny:3,approvedCase:'sparse-context',approveFictionalEgress:true,approvePreservedHold:true,now});
    st=new Store(d);le=new BudgetLedger(st);const req=`${diagnosticId}-scene-0`;
    st.state.protocolDiagnostics={[diagnosticId]:{schemaVersion:1,protocolVersion:c.protocolVersion,allowanceId:diagnosticId,status:'failed'}};st.save();
    le.reserve(diagnosticId,{requestId:req,runId:diagnosticId,fingerprint:hash(req),sourceRefs:c.sourceRefs,maxOutputTokens:400},now);le.dispatch(diagnosticId,req);le.unknown(diagnosticId,req,{schemaVersion:1,protocolVersion:c.protocolVersion,stage:'scene',check:'unused_compact_evidence'});st.close();
  }
  return d;
}
