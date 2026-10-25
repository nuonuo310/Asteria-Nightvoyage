// Offline-only selfcheck. Synthetic history, local HTTP stand-in, no key or user Store.
import {Store} from '../src/store.js';
import {readOneDreamContract,oneDreamContractPath} from './nv-deepseek-one-dream/contract.mjs';
import {launchOneDream} from './nv-deepseek-one-dream/entry.mjs';
import {runOneDreamSession} from './nv-deepseek-one-dream/session.mjs';
import {oneDreamAllowanceId} from './nv-deepseek-one-dream/policy.mjs';
import {prepareOneDreamHistory,oneDreamTestNow} from '../test-support/nv-one-dream-fixtures.mjs';
import {dreambookCatalog} from './dreambook.mjs';
import {readDreambookView} from './dreambook-view-records.mjs';
import {renderDreambookViewHtml} from './dreambook-view-html.mjs';

const cleanups=[],t={after:fn=>cleanups.push(fn)};
try{
  const {contract,contractHash}=readOneDreamContract({now:oneDreamTestNow}),h=prepareOneDreamHistory(t,{mode:'stub'});
  let credentialSupplierCalls=0;const supplier=()=>{credentialSupplierCalls++;throw Error('checker_never_reads_a_key');};
  const run=await launchOneDream('rehearse',h.directory,{credentialSupplier:supplier});
  if(run.status!=='completed'||run.scenesSaved!==2||run.wakeSaved!==true||run.settledCalls!==3||run.credentialSupplierCalls!==0)throw Error('one_dream_rehearsal_failed');
  let oldAccountsUnchanged=true;let dreamId=null;
  const store=new Store(h.directory);
  try{
    const account=store.state.billing.accounts[oneDreamAllowanceId];
    const rows=Object.values(account.attempts);
    if(account.runIds.length!==1||rows.length!==3||rows.some(row=>row.status!=='settled'))throw Error('one_dream_ledger_failed');
    for(const [id,value]of Object.entries(h.oldAccounts))if(JSON.stringify(store.state.billing.accounts[id])!==JSON.stringify(value))oldAccountsUnchanged=false;
    dreamId=dreambookCatalog(store).dreams.at(-1)?.id??null;
    if(!dreamId)throw Error('one_dream_reader_catalogue_failed');
    const view=readDreambookView(store,dreamId),html=renderDreambookViewHtml(view,{demo:false});
    if(view.narrative.dream.scenes.length!==2||view.narrative.wake.origin!=='wake_note')throw Error('one_dream_split_failed');
    if(/DeepSeek|deepseek-flash|provider|adapter/i.test(html))throw Error('one_dream_reader_label_leak');
    if(!oldAccountsUnchanged)throw Error('one_dream_old_history_changed');
  }finally{store.close();}
  const preflight=await runOneDreamSession('preflight',h.directory,null,supplier);
  if(preflight.ready!==false||preflight.reason!=='completed_replay_available'||preflight.credentialRequested!==false)throw Error('one_dream_preflight_replay_failed');
  const replay=await launchOneDream('rehearse',h.directory,{credentialSupplier:supplier});
  if(replay.status!=='completed'||replay.credentialSupplierCalls!==0)throw Error('one_dream_replay_failed');
  const read=await runOneDreamSession('read',h.directory,null,supplier);
  if(credentialSupplierCalls!==0||read.credentialRequested!==false)throw Error('one_dream_key_boundary_failed');
  console.log(JSON.stringify({
    schemaVersion:1,kind:'nv_deepseek_one_dream_offline_selfcheck',status:'passed',
    contractPath:oneDreamContractPath,contractHash,fixtureHash:contract.material.fixtureHash,
    preflight:{ready:preflight.ready,reason:preflight.reason,credentialRequested:preflight.credentialRequested},
    rehearsal:{status:run.status,scenesSaved:run.scenesSaved,wakeSaved:run.wakeSaved,settledCalls:run.settledCalls,heldOrSpentMicroCny:run.heldOrSpentMicroCny,loopbackPosts:run.loopbackPosts},
    replay:{status:replay.status,credentialSupplierCalls:replay.credentialSupplierCalls},
    reader:{dreamIdPresent:dreamId!==null,providerOrModelLabelVisible:false,oldAccountsUnchanged},
    credentialSupplierCalls,providerNetworkRequests:0,userStoreAccessed:false,realApprovalRecorded:false,liveRequestStarted:false,qualityAssessed:false,semanticSupport:'not_assessed'
  },null,2));
}catch{
  console.error('nv_deepseek_one_dream_check_failed');process.exitCode=1;
}finally{
  for(const fn of cleanups.reverse())try{fn();}catch{}
}
