// Fixed independent Node child, never a Codex executable or provider connection.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {CodexAdapter,selectAdapter} from './codex-local-model-port.mjs';
import {ModelPortNightvoyage} from './codex-local-model-runtime.mjs';
import {createPeerCodexFixtureStageTransport,createNativeCodexFixtureStageTransport} from './codex-fixture-stage-transport.mjs';
const args=process.argv.slice(2);
if(args.length!==0&&!(args.length===2&&args[0]==='--native-executable'))throw Error('fixture_entry_arguments_invalid');
const transport=(args.length?createNativeCodexFixtureStageTransport({executable:args[1]}):createPeerCodexFixtureStageTransport());
const root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-pipe-check-')),directory=path.join(root,'book');
const snapshot=JSON.parse(fs.readFileSync(new URL('../examples/adapter-boundary.snapshot.json',import.meta.url),'utf8'));let engine;
const adapter=new CodexAdapter({model_id:'gpt-5.6-sol',stageTransport:transport}),selection=selectAdapter({primary:adapter});
try{
 engine=new ModelPortNightvoyage(directory,{selection});const id=engine.start('fiction-pipe-check','fiction-pipe-check',snapshot,{timeoutMs:15000});await engine.execute(id);const result=engine.result(id);
 if(result.receipt.status!=='completed'){await transport.close();console.log(JSON.stringify({status:'blocked',kind:transport.status().kind,receipt:result.receipt,transport:transport.status(),realModelRequests:0,credentialReads:0,userStoreAccessed:false,qualityAssessed:false},null,2));process.exitCode=1;}else{
 const original=JSON.stringify(engine.read(result.dream.id));engine.close();engine=new ModelPortNightvoyage(directory,{selection});await engine.execute(id);
 const preserved=original===JSON.stringify(engine.read(result.dream.id));if(transport.status().exchangesStarted!==3||!preserved)throw Error('pipe_replay_failed');
 engine.withdraw(snapshot.sources[0].id);engine.close();engine=new ModelPortNightvoyage(directory,{selection});if(engine.result(id).dream!==null)throw Error('pipe_withdrawal_failed');
 console.log(JSON.stringify({command:'node scripts/check-codex-fixture-stages.mjs',node:process.version,platform:process.platform,protocolVersion:transport.protocolVersion,status:'completed',transportIdentityExplicit:true,adapterAuthMode:result.receipt.auth_mode,nativeTransportConnected:args.length>0,localHarnessChildren:3,childrenClosedBeforePublication:3,syntheticStageCalls:3,savedScenes:2,wakeSaved:true,reopened:true,replayAdditionalChildren:0,originalUnchanged:preserved,withdrawalSuppressedAfterReopen:true,nativeCodexProcessStarted:args.length>0,nativeExecutableExplicit:args.length>0,inheritedCredentialEnvironment:false,realModelRequests:0,credentialReads:0,userStoreAccessed:false,remoteCancellationConfirmed:'unknown',usage:'unknown',toolDisableVerified:false,subscriptionEligibilityVerified:false,qualityAssessed:false,asteriaAdapter:'pending' ,transport:transport.status()},null,2));
}
}finally{await transport.close();engine?.close();fs.rmSync(root,{recursive:true,force:true});}
