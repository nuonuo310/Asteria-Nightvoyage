// Explicit independent rehearsal; no network, process, account or user Store.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {FakeAdapter,ChatGPTPlanAdapter,CodexAdapter,selectAdapter,selectSubscriptionAdapter} from './dream-model-port.mjs';
import {ModelPortNightvoyage} from './dream-model-runtime.mjs';
import {planTranscript,codexTranscript} from '../test-support/model-port-protocol-fixtures.js';
if(process.argv.length!==2)throw Error('rehearsal_accepts_no_arguments');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-subscription-ports-')),snapshot=JSON.parse(fs.readFileSync(new URL('../examples/adapter-boundary.snapshot.json',import.meta.url),'utf8'));
const adapters=[new FakeAdapter(),new ChatGPTPlanAdapter({model_id:'fiction-protocol-model',simulator:draft=>planTranscript(draft)}),new CodexAdapter({model_id:'fiction-protocol-model',simulator:draft=>codexTranscript(draft)})],results=[];let engine;
try{
 for(const [index,adapter]of adapters.entries()){
  const directory=path.join(root,'book-'+index),selection=selectAdapter({primary:adapter});engine=new ModelPortNightvoyage(directory,{selection});
  const id=engine.start('fiction-run','fiction-run',snapshot);await engine.execute(id);const result=engine.result(id);
  if(result.receipt.status!=='completed'||result.receipt.stage_dispatches_started!==3||result.receipt.external_calls_started!==0)throw Error('protocol_rehearsal_failed');
  const original=JSON.stringify(engine.read(result.dream.id));engine.close();engine=new ModelPortNightvoyage(directory,{selection});await engine.execute(id);
  const preserved=JSON.stringify(engine.read(result.dream.id))===original;engine.withdraw(snapshot.sources[0].id);engine.close();engine=new ModelPortNightvoyage(directory,{selection});
  const suppressed=engine.result(id).dream===null;if(!preserved||!suppressed)throw Error('persistence_rehearsal_failed');
  results.push({adapter_kind:result.receipt.adapter_kind,auth_mode:result.receipt.auth_mode,stagesSaved:result.receipt.stagesSaved,stageDispatches:3,externalCallsStarted:0,replayAdditionalCalls:0,originalUnchanged:preserved,withdrawalSuppressedAfterReopen:suppressed,usageAvailable:result.receipt.usage[0].usage!=='unknown'});engine.close();engine=null;
 }
 console.log(JSON.stringify({command:'node scripts/check-subscription-model-ports.mjs',node:process.version,platform:process.platform,results,liveDefaultReady:selectSubscriptionAdapter().ready,realModelRequests:0,credentialReads:0,userStoreAccessed:false,nativeCodexProcessStarted:false,providerNetworkTested:false,accountEligibilityVerified:false,qualityAssessed:false,asteriaAdapter:'pending'},null,2));
}finally{engine?.close();fs.rmSync(root,{recursive:true,force:true});}
