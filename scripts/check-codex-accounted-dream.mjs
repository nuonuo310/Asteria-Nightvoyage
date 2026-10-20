// Default is an independent Node peer. Native mode is explicit, local-only and one-shot.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {AccountedCodexDream} from './codex-accounted-dream-runtime.mjs';
import {readModelPortContent} from './accounted-codex-content-view.mjs';
const args=process.argv.slice(2),native=args.length>0;
const contractVersion='codex-accounted-fictional-dream-check-v1';
let root,engine,report,versionVerified=false;
try{
 if(args.length!==0&&!(args.length===4&&args[0]==='--native-executable'&&args[2]==='--state-directory'))throw Error('entry_arguments_invalid');
 const options={};
 if(native){
  const [executable,directory]=[args[1],args[3]];
  if(!path.isAbsolute(executable)||!/^codex(?:\.exe)?$/i.test(path.basename(executable))||!path.isAbsolute(directory))throw Error('entry_arguments_invalid');
  options.executable=fs.realpathSync(executable);if(!fs.statSync(options.executable).isFile()||!/^codex(?:\.exe)?$/i.test(path.basename(options.executable)))throw Error('entry_arguments_invalid');
  if(!fs.lstatSync(directory).isDirectory()||fs.lstatSync(directory).isSymbolicLink()||fs.readdirSync(directory).length)throw Error('entry_directory_consumed_or_invalid');
  root=fs.realpathSync(directory);
  for(let cursor=root;;){if(fs.existsSync(path.join(cursor,'.git')))throw Error('entry_directory_invalid');const next=path.dirname(cursor);if(next===cursor)break;cursor=next;}
  const env={PATH:[path.dirname(options.executable),path.dirname(process.execPath)].join(path.delimiter)};
  if(process.platform==='win32'){if(!process.env.SystemRoot||!path.isAbsolute(process.env.SystemRoot))throw Error('entry_environment_invalid');env.SystemRoot=process.env.SystemRoot;env.WINDIR=env.SystemRoot;}
  const result=spawnSync(options.executable,['--version'],{env,encoding:'utf8',timeout:3000,maxBuffer:1024,windowsHide:true,shell:false});
  if(result.status!==0||result.stdout.trim()!=='codex-cli 0.160.0')throw Error('native_version_requires_review');versionVerified=true;
  const fixture=fs.readFileSync(new URL('../examples/adapter-boundary.snapshot.json',import.meta.url));
  const sha=value=>createHash('sha256').update(value).digest('hex');
  const selectedFiles=['codex-accounted-dream-runtime.mjs','codex-accounted-stage-transport.mjs','codex-accounted-stage-owner.mjs','codex-dream-http-account.mjs','codex-local-forward-owner.mjs'];
  fs.writeFileSync(path.join(root,'entry-once.json'),JSON.stringify({contractVersion,kind:'independent_fictional_fixture',model:'gpt-5.6-sol',protocol:'codex-native-accounted-stage-v1',maxAppServerChildren:3,maxLoopbackPosts:3,fixtureHash:sha(fixture),selectedImplementationHashes:Object.fromEntries(selectedFiles.map(name=>[name,sha(fs.readFileSync(new URL(name,import.meta.url)))])),wholeDependencyGraphPinned:false,realUserInferenceApproval:false}),{flag:'wx',mode:0o600});
 }else root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-accounted-dream-check-'));
 const directory=path.join(root,'book'),snapshot=JSON.parse(fs.readFileSync(new URL('../examples/adapter-boundary.snapshot.json',import.meta.url)));
 engine=new AccountedCodexDream(directory,options);const id=engine.start('independent-accounted-dream-v1','independent-accounted-dream-v1',snapshot,{timeoutMs:30000});
 await engine.execute(id);const result=engine.result(id),receipt=result.receipt,reports=engine.transport.status().reports;
 const stages=reports.map((r,i)=>({stage:i===2?'wake':'scene',index:i,status:r.status,reason:r.reason,posts:r.fixtureModelPosts,
  forwarded:r.localForwardAccounting?.forwardedLocalRequests??0,persistedIntentsChecked:r.localForwardAccounting?.dreamStage.arrivalsChecked??0,
  completedHttp:r.localForwardAccounting?.dreamStage.completed??0,normalEof:r.ownedShutdown?.gracefulZeroExitObserved===true,
  ownedProcessClosed:r.ownedProcessClosed,temporaryCleanupComplete:r.temporaryCleanupComplete,cleanupAttempts:r.cleanupReview?.attempts??0}));
 let replayAdditionalChildren=null,originalUnchanged=null,withdrawalSuppressed=null,dreambookReadable=false;
 const firstComplete=receipt.status==='completed'&&receipt.local_http_accounting.calls===3&&stages.length===3&&stages.every(r=>r.posts===1&&r.forwarded===1&&r.persistedIntentsChecked===1&&r.completedHttp===1&&r.normalEof&&r.ownedProcessClosed&&r.temporaryCleanupComplete);
 if(firstComplete){
  const original=JSON.stringify(engine.read(result.dream.id));dreambookReadable=!!readModelPortContent(engine.store,result.dream.id);engine.close();engine=new AccountedCodexDream(directory,options);
  await engine.execute(id);replayAdditionalChildren=engine.transport.status().exchangesStarted;originalUnchanged=JSON.stringify(engine.read(result.dream.id))===original;
  engine.withdraw(snapshot.sources[0].id);engine.close();engine=new AccountedCodexDream(directory,options);await engine.execute(id);
  withdrawalSuppressed=engine.result(id).dream===null&&readModelPortContent(engine.store,result.dream.id)===null&&engine.recall('cup','independent-accounted-cue',1).length===0;
 }
 const complete=firstComplete&&replayAdditionalChildren===0&&originalUnchanged&&dreambookReadable&&withdrawalSuppressed;
 report={command:'node scripts/check-codex-accounted-dream.mjs',contractVersion,node:process.version,platform:process.platform,
  status:complete?'accounted_fictional_dream_completed':'blocked',kind:native?'native':'independent_node_peer',nativeVersionVerified:versionVerified,
  metadataVersionChecks:native?1:0,maximumAppServerChildren:3,maximumLoopbackPosts:3,fixtureIsScripted:true,
  adapter_kind:receipt.adapter_kind,auth_mode:receipt.auth_mode,protocol_version:receipt.protocol_version,
  savedScenes:receipt.checkpoint.saved_scenes,wakeSaved:receipt.checkpoint.wake_saved,stageDispatches:receipt.stage_dispatches_started,
  persistedLocalHttpIntents:receipt.local_http_accounting.calls,stages,replayAdditionalChildren,originalUnchanged,dreambookReadable,
  withdrawalSuppressesReopenedViews:withdrawalSuppressed,retainedBodyFreeHttpRows:engine.status(id).local_http_accounting.calls,
  appServerChildrenStarted:reports.filter(r=>r.processStarted).length,nativeAppServerIntegrated:native&&complete,realModelRequests:0,credentialReads:0,userStoreAccessed:false,realUserApprovalRecorded:false,
  automaticRetry:false,realProviderAccountingIntegrated:false,powerLossDurabilityVerified:false,
  backgroundNetworkInstrumented:false,descendantTerminationConfirmed:'unknown',remoteCancellationConfirmed:'unknown',
  allHandlerDenialVerified:false,productionAdmission:false,qualityAssessed:false,wholeDependencyGraphPinned:false,
  retainedFixtureState:native,retainedPathReturned:false,oldTrialContinued:false};
 if(!complete)process.exitCode=1;
}catch(error){
 const known=['entry_arguments_invalid','entry_directory_consumed_or_invalid','entry_directory_invalid','entry_environment_invalid','native_version_requires_review'];
 report={contractVersion,status:'blocked',reason:known.includes(error.message)?error.message:'fixture_check_failed',kind:native?'native':'independent_node_peer',nativeVersionVerified:versionVerified,automaticRetry:false,realModelRequests:0,credentialReads:0,productionAdmission:false,rawErrorReturned:false};process.exitCode=1;
}finally{
 try{engine?.close();}finally{if(root&&!native)fs.rmSync(root,{recursive:true,force:true});}
}
console.log(JSON.stringify(report,null,2));
