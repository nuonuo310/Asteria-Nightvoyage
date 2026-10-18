// Independent fictional selfcheck. No supplied directory, key or provider.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import http from 'node:http';
import https from 'node:https';
import {LocalDreamPorts} from './local-dream-ports.mjs';
if(process.argv.length!==2)throw Error('no_arguments_supported');
const env=process.env,fetchBefore=globalThis.fetch,httpBefore=http.request,httpsBefore=https.request;
let credentialReads=0,transportAttempts=0;
process.env=new Proxy(env,{get(target,key){if(key==='NIGHTVOYAGE_DEEPSEEK_KEY'){credentialReads++;throw Error('credential_forbidden');}return Reflect.get(target,key);}});
const stop=()=>{transportAttempts++;throw Error('transport_forbidden');};globalThis.fetch=http.request=https.request=stop;
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-port-check-'));let port;
try{
  port=new LocalDreamPorts(directory);
  const {snapshot}=port.readSnapshot({file:fileURLToPath(new URL('../examples/adapter-boundary.snapshot.json',import.meta.url))});
  assert.ok(snapshot.sources.every(s=>s.grant.modelEgress===false));
  const request={requestId:'fictional-ports-request',sessionId:'fictional-ports-session',snapshot};
  const {runId}=port.start(request),result=await port.execute({runId});assert.equal(result.receipt.status,'completed');assert.equal(result.receipt.budget.calls,3);
  const entryId=result.dream.id,original=port.readEntry({entryId}).entry,now=original.residue.startedAt;
  port.append({entryId,kind:'recollection',text:'Independent fictional recollection.'});
  port.append({entryId,kind:'imagined_continuation',text:'Independent fictional continuation.'});
  assert.deepEqual(port.readEntry({entryId}).entry,original);assert.equal(port.start(request).runId,runId);assert.equal((await port.execute({runId})).receipt.budget.calls,3);
  const {candidates}=port.recall({cue:'lantern',requestId:'fictional-port-cue',now});assert.equal(candidates.length,1);assert.equal(candidates[0].origin,'dream');assert.equal(candidates[0].isRealityFact,false);assert.deepEqual(candidates[0].sourceRefs,result.dream.sourceRefs);
  port.close();port=new LocalDreamPorts(directory);assert.deepEqual(port.readEntry({entryId}).entry,original);
  port.withdraw({sourceId:snapshot.sources[0].id});port.close();port=new LocalDreamPorts(directory);
  assert.equal(port.readEntry({entryId}).entry,null);assert.deepEqual(port.listEntries({}).entries,[]);assert.deepEqual(port.recall({cue:'lantern',requestId:'fictional-port-cue',now}).candidates,[]);
  assert.equal(credentialReads,0);assert.equal(transportAttempts,0);
  console.log(JSON.stringify({command:'node scripts/check-local-dream-ports.mjs',node:process.version,platform:process.platform,contractVersion:port.capabilities().contractVersion,adapter:'local_file',executionFamily:'plain-fake-v1',asteriaAdapter:'pending',fakeStageCalls:3,completedReplayAdditionalCalls:0,separateResultAndRecall:true,originalNotOverwrittenByAppends:true,reopened:true,withdrawalSuppressesReadRecallAndDescendants:true,credentialReads,transportAttempts,realModelRequests:0,userStoreAccessed:false,paidExecutionSupported:false,automaticDelivery:false,remoteAuthentication:false,deliveryAcknowledgement:false,qualityAssessed:false},null,2));
}finally{
  port?.close();process.env=env;globalThis.fetch=fetchBefore;http.request=httpBefore;https.request=httpsBefore;fs.rmSync(directory,{recursive:true,force:true});
}
