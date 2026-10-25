// Offline-only diagnostics selfcheck. Synthetic Store, local transport stand-in, no Key or provider request.
import fs from 'node:fs';
import {Store} from '../src/store.js';
import {DiagnosticOneDreamRuntime} from './nv-deepseek-failure-diagnostics/runtime.mjs';
import {diagnosticJournalPath,readDiagnosticReceipts} from './nv-deepseek-failure-diagnostics/journal.mjs';
import {diagnosticsVersion} from './nv-deepseek-failure-diagnostics/policy.mjs';
import {oneDreamAllowanceId,oneDreamLocalCredential,oneDreamLoopbackKind} from './nv-deepseek-one-dream/policy.mjs';
import {prepareOneDreamHistory} from '../test-support/nv-one-dream-fixtures.mjs';

const cleanups=[],t={after:fn=>cleanups.push(fn)};
try{
  const h=prepareOneDreamHistory(t,{mode:'stub'});let posts=0,engine;
  const loopback=Object.freeze({kind:oneDreamLoopbackKind,host:'127.0.0.1',async transport(){posts++;return new Response(null,{status:429});}});
  engine=new DiagnosticOneDreamRuntime(h.directory,{mode:'offline',loopback,enabled:true,timeoutMs:60000});
  const gate=engine.prepare({dispatchKind:'rehearsal',create:true});engine.credential=oneDreamLocalCredential;
  const status=await engine.execute(gate.id);engine.close();engine=undefined;
  if(status.status!=='failed'||posts!==1)throw Error('diagnostics_failure_path_invalid');
  const receipts=readDiagnosticReceipts(h.directory);
  if(receipts.length!==1)throw Error('diagnostics_receipt_missing');
  const receipt=receipts[0];
  if(receipt.phase!=='http_response'||receipt.diagnosticClass!=='http_rate_limited'||receipt.dispatchIntent!=='persisted'||receipt.delivery!=='unknown'||receipt.usage!=='unknown'||receipt.money!=='unknown')throw Error('diagnostics_receipt_invalid');
  const journal=fs.readFileSync(diagnosticJournalPath(h.directory),'utf8');
  for(const marker of [oneDreamLocalCredential,'127.0.0.1','Authorization','Bearer','deepseek-flash'])if(journal.includes(marker))throw Error('diagnostics_sensitive_material_leak');
  let oldAccountsUnchanged=true;const store=new Store(h.directory);
  try{
    for(const [id,account]of Object.entries(h.oldAccounts))if(JSON.stringify(store.state.billing.accounts[id])!==JSON.stringify(account))oldAccountsUnchanged=false;
    if(!Object.hasOwn(store.state.billing.accounts,oneDreamAllowanceId))throw Error('diagnostics_allowance_missing');
  }finally{store.close();}
  if(!oldAccountsUnchanged)throw Error('diagnostics_old_history_changed');
  console.log(JSON.stringify({
    schemaVersion:1,kind:'nv_deepseek_failure_diagnostics_offline_selfcheck',status:'passed',diagnosticsVersion,
    receipt:{phase:receipt.phase,diagnosticClass:receipt.diagnosticClass,dispatchIntent:receipt.dispatchIntent,delivery:receipt.delivery,usage:receipt.usage,money:receipt.money},
    posts,oldAccountsUnchanged,credentialReads:0,providerNetworkRequests:0,userStoreAccessed:false,liveRequestStarted:false,realApprovalRecorded:false
  },null,2));
}catch(error){
  console.error(error?.message==='diagnostics_sensitive_material_leak'?'diagnostics_sensitive_material_leak':'nv_deepseek_failure_diagnostics_check_failed');process.exitCode=1;
}finally{
  for(const fn of cleanups.reverse())try{fn();}catch{}
}
