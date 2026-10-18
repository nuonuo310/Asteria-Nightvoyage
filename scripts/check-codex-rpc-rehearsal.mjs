// Independent scripted peer only. Never launches Codex, logs in or reads a key.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {CodexAdapter,selectAdapter} from './dream-model-port.mjs';
import {ModelPortNightvoyage} from './dream-model-runtime.mjs';
import {codexRpcRehearsalVersion} from './codex-rpc-rehearsal.mjs';
import {rpcTranscript} from '../test-support/codex-rpc-fixtures.js';
if(process.argv.length!==2)throw Error('rehearsal_accepts_no_arguments');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-codex-rpc-')),directory=path.join(root,'book');
const snapshot=JSON.parse(fs.readFileSync(new URL('../examples/adapter-boundary.snapshot.json',import.meta.url),'utf8'));
let calls=0,engine;const requests=[];
const adapter=new CodexAdapter({model_id:'fiction-protocol-model',simulator:d=>{calls++;return rpcTranscript(d,{early:calls===2,requests});}}),selection=selectAdapter({primary:adapter});
try{
 engine=new ModelPortNightvoyage(directory,{selection});const id=engine.start('fiction-rpc','fiction-rpc',snapshot);await engine.execute(id);const result=engine.result(id);
 if(result.receipt.status!=='completed'||calls!==3||result.receipt.external_calls_started!==0)throw Error('rpc_rehearsal_failed');
 const original=JSON.stringify(engine.read(result.dream.id));engine.close();engine=new ModelPortNightvoyage(directory,{selection});await engine.execute(id);
 const preserved=JSON.stringify(engine.read(result.dream.id))===original;if(calls!==3||!preserved)throw Error('rpc_replay_failed');
 engine.withdraw(snapshot.sources[0].id);engine.close();engine=new ModelPortNightvoyage(directory,{selection});
 if(engine.result(id).dream!==null)throw Error('rpc_withdrawal_failed');
 console.log(JSON.stringify({command:'node scripts/check-codex-rpc-rehearsal.mjs',node:process.version,platform:process.platform,protocolVersion:codexRpcRehearsalVersion,status:'completed',syntheticStageCalls:calls,syntheticRpcRequests:requests.filter(r=>r.id).length,syntheticInitializedNotifications:requests.filter(r=>r.method==='initialized').length,savedScenes:2,wakeSaved:true,reopened:true,replayAdditionalCalls:0,originalUnchanged:preserved,withdrawalSuppressedAfterReopen:true,usage:'unknown',nativeCodexProcessStarted:false,processTransportImplemented:false,toolDisableVerified:false,realModelRequests:0,credentialReads:0,userStoreAccessed:false,subscriptionEligibilityVerified:false,qualityAssessed:false,asteriaAdapter:'pending'},null,2));
}finally{engine?.close();fs.rmSync(root,{recursive:true,force:true});}
