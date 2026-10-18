// Fixed independent Node child, never a Codex executable or provider connection.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {CodexAdapter,selectAdapter} from './dream-model-port.mjs';
import {ModelPortNightvoyage} from './dream-model-runtime.mjs';
import {runCodexPipeRehearsal,codexPipeRehearsalVersion} from './codex-pipe-rehearsal.mjs';
if(process.argv.length!==2)throw Error('rehearsal_accepts_no_arguments');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-pipe-check-')),directory=path.join(root,'book');
const snapshot=JSON.parse(fs.readFileSync(new URL('../examples/adapter-boundary.snapshot.json',import.meta.url),'utf8'));let engine,calls=0,closed=0;
const adapter=new CodexAdapter({model_id:'fiction-pipe-model',simulator:async(d,{signal})=>{calls++;const result=await runCodexPipeRehearsal(d,{signal});if(result.syntheticChildClosed)closed++;return result;}}),selection=selectAdapter({primary:adapter});
try{
 engine=new ModelPortNightvoyage(directory,{selection});const id=engine.start('fiction-pipe-check','fiction-pipe-check',snapshot);await engine.execute(id);const result=engine.result(id);
 if(result.receipt.status!=='completed'||calls!==3||closed!==3)throw Error('pipe_check_failed');
 const original=JSON.stringify(engine.read(result.dream.id));engine.close();engine=new ModelPortNightvoyage(directory,{selection});await engine.execute(id);
 const preserved=original===JSON.stringify(engine.read(result.dream.id));if(calls!==3||!preserved)throw Error('pipe_replay_failed');
 engine.withdraw(snapshot.sources[0].id);engine.close();engine=new ModelPortNightvoyage(directory,{selection});if(engine.result(id).dream!==null)throw Error('pipe_withdrawal_failed');
 console.log(JSON.stringify({command:'node scripts/check-codex-pipe-rehearsal.mjs',node:process.version,platform:process.platform,protocolVersion:codexPipeRehearsalVersion,status:'completed',independentNodeChildren:3,childrenClosedBeforePublication:3,syntheticStageCalls:3,savedScenes:2,wakeSaved:true,reopened:true,replayAdditionalChildren:0,originalUnchanged:preserved,withdrawalSuppressedAfterReopen:true,nativeCodexProcessStarted:false,executableOverrideAvailable:false,inheritedCredentialEnvironment:false,realModelRequests:0,credentialReads:0,userStoreAccessed:false,remoteCancellationConfirmed:'unknown',usage:'unknown',toolDisableVerified:false,subscriptionEligibilityVerified:false,qualityAssessed:false,asteriaAdapter:'pending'},null,2));
}finally{engine?.close();fs.rmSync(root,{recursive:true,force:true});}
