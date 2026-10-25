// Offline-only selfcheck. Synthetic history, local stand-ins, no key or user Store.
import {Store} from '../src/store.js';
import {readOneDreamContract,oneDreamContractPath} from './nv-deepseek-fresh-dream-02/contract.mjs';
import {launchOneDream} from './nv-deepseek-fresh-dream-02/entry.mjs';
import {runOneDreamSession} from './nv-deepseek-fresh-dream-02/session.mjs';
import {DiagnosticOneDreamRuntime} from './nv-deepseek-fresh-dream-02/diagnostic.mjs';
import {oneDreamAllowanceId,oneDreamLocalCredential,oneDreamLoopbackKind} from './nv-deepseek-fresh-dream-02/policy.mjs';
import {prepareFreshDream02History,freshDreamTestNow,priorOneDreamAllowanceId} from '../test-support/nv-fresh-dream-02-fixtures.mjs';
import {readDiagnosticReceipts} from './nv-deepseek-failure-diagnostics/journal.mjs';
import {dreambookCatalog} from './dreambook.mjs';
import {readDreambookView} from './dreambook-view-records.mjs';
import {renderDreambookViewHtml} from './dreambook-view-html.mjs';

const cleanups=[],t={after:fn=>cleanups.push(fn)};
try{
  const {contract,contractHash}=readOneDreamContract({now:freshDreamTestNow}),h=prepareFreshDream02History(t,{mode:'stub'});
  let credentialSupplierCalls=0;const supplier=()=>{credentialSupplierCalls++;throw Error('checker_never_reads_a_key');};
  const run=await launchOneDream('rehearse',h.directory,{credentialSupplier:supplier});
  if(run.status!=='completed'||run.scenesSaved!==2||run.wakeSaved!==true||run.settledCalls!==3||run.credentialSupplierCalls!==0)throw Error('fresh_dream_rehearsal_failed');
  let oldAccountsUnchanged=true,dreamId=null;
  const store=new Store(h.directory);
  try{
    const account=store.state.billing.accounts[oneDreamAllowanceId],rows=Object.values(account.attempts);
    if(account.runIds.length!==1||rows.length!==3||rows.some(row=>row.status!=='settled'))throw Error('fresh_dream_ledger_failed');
    for(const [id,value]of Object.entries(h.oldAccounts))if(JSON.stringify(store.state.billing.accounts[id])!==JSON.stringify(value))oldAccountsUnchanged=false;
    if(!store.state.billing.accounts[priorOneDreamAllowanceId])throw Error('prior_one_dream_account_missing');
    dreamId=dreambookCatalog(store).dreams.at(-1)?.id??null;
    if(!dreamId)throw Error('fresh_dream_reader_catalogue_failed');
    const view=readDreambookView(store,dreamId),html=renderDreambookViewHtml(view,{demo:false});
    if(view.narrative.dream.scenes.length!==2||view.narrative.wake.origin!=='wake_note')throw Error('fresh_dream_split_failed');
    if(/DeepSeek|deepseek-flash|provider|adapter/i.test(html))throw Error('fresh_dream_reader_label_leak');
    if(!oldAccountsUnchanged)throw Error('fresh_dream_old_history_changed');
  }finally{store.close();}
  const preflight=await runOneDreamSession('preflight',h.directory,null,supplier);
  if(preflight.ready!==false||preflight.reason!=='completed_replay_available'||preflight.credentialRequested!==false)throw Error('fresh_dream_preflight_replay_failed');
  const replay=await launchOneDream('rehearse',h.directory,{credentialSupplier:supplier});
  if(replay.status!=='completed'||replay.credentialSupplierCalls!==0)throw Error('fresh_dream_replay_failed');
  const read=await runOneDreamSession('read',h.directory,null,supplier);
  if(credentialSupplierCalls!==0||read.credentialRequested!==false)throw Error('fresh_dream_key_boundary_failed');
  const failedHistory=prepareFreshDream02History(t,{mode:'stub'}),posts={value:0};
  const failingLoopback=Object.freeze({kind:oneDreamLoopbackKind,host:'127.0.0.1',async transport(){posts.value++;return new Response(null,{status:429});}});
  const engine=new DiagnosticOneDreamRuntime(failedHistory.directory,{mode:'offline',loopback:failingLoopback,enabled:true,timeoutMs:60000});
  let failureStatus;
  try{const gate=engine.prepare({dispatchKind:'rehearsal',create:true});engine.credential=oneDreamLocalCredential;failureStatus=await engine.execute(gate.id);}finally{engine.close();}
  const receipts=readDiagnosticReceipts(failedHistory.directory),receipt=receipts[0];
  if(failureStatus.status!=='failed'||posts.value!==1||receipts.length!==1||receipt.phase!=='http_response'||receipt.diagnosticClass!=='http_rate_limited'||receipt.dispatchIntent!=='persisted'||receipt.delivery!=='unknown'||receipt.usage!=='unknown'||receipt.money!=='unknown')throw Error('fresh_dream_diagnostics_failed');
  console.log(JSON.stringify({
    schemaVersion:1,kind:'nv_deepseek_fresh_dream_02_offline_selfcheck',status:'passed',
    contractPath:oneDreamContractPath,contractHash,fixtureHash:contract.material.fixtureHash,
    pricing:{currency:contract.pricing.currency,model:contract.provider.model,observedRevision:contract.provider.observedRevision,inputMicroCnyPerMillion:contract.pricing.inputMicroCnyPerMillion,outputMicroCnyPerMillion:contract.pricing.outputMicroCnyPerMillion,inputTokenBound:contract.pricing.inputTokenBound,fullPerCallReservationMicroCny:contract.pricing.fullPerCallReservationMicroCny,aggregateThreeCallReservationMicroCny:contract.pricing.aggregateThreeCallReservationMicroCny,checkedAt:new Date(contract.pricing.checkedAt).toISOString(),expiresAt:new Date(contract.pricing.expiresAt).toISOString()},
    preflight:{ready:preflight.ready,reason:preflight.reason,credentialRequested:preflight.credentialRequested},
    rehearsal:{status:run.status,scenesSaved:run.scenesSaved,wakeSaved:run.wakeSaved,settledCalls:run.settledCalls,heldOrSpentMicroCny:run.heldOrSpentMicroCny,loopbackPosts:run.loopbackPosts},
    replay:{status:replay.status,credentialSupplierCalls:replay.credentialSupplierCalls},
    diagnostics:{phase:receipt.phase,diagnosticClass:receipt.diagnosticClass,dispatchIntent:receipt.dispatchIntent,delivery:receipt.delivery,usage:receipt.usage,money:receipt.money,posts:posts.value},
    reader:{dreamIdPresent:dreamId!==null,providerOrModelLabelVisible:false,oldAccountsUnchanged},
    credentialSupplierCalls,providerNetworkRequests:0,userStoreAccessed:false,realApprovalRecorded:false,liveRequestStarted:false,qualityAssessed:false,semanticSupport:'not_assessed'
  },null,2));
}catch{
  console.error('nv_deepseek_fresh_dream_02_check_failed');process.exitCode=1;
}finally{
  for(const fn of cleanups.reverse())try{fn();}catch{}
}
