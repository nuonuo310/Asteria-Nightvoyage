// Separate local-only wait denial owner; no account, real provider or production capability.
import {spawn} from 'node:child_process';
import {createOwnedChildStop} from './codex-owned-child-stop.mjs';
import {openLocalForwardOwner} from './codex-local-forward-owner.mjs';
import {openFictionalTrialStore} from './codex-fictional-trial-store.mjs';
import {createOwnedProbeCleanup} from './codex-owned-probe-cleanup.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {codeModeGuardOverrides,reviewCodeModeGuardConfig} from './codex-code-mode-guard-review.mjs';
import {fixedGuardWaitSse,exactGuardWarning,reviewGuardWaitContinuation,reviewGuardWarningEnvelope} from './codex-code-mode-wait-fixture.mjs';
import {reviewObserverWarning} from './codex-observer-warning-review.mjs';
import {observerNotificationWitness} from './codex-observer-notification-witness.mjs';
import {reviewCodexLocalRequest} from './codex-request-tool-review.mjs';
import {CodexStartupDiagnostics} from './codex-startup-diagnostics.mjs';
import {GuardExecTracePolicy} from './codex-guard-exec-trace-policy.mjs';
import {codexToolModeCase,codexToolModeComparisonVersion} from './codex-tool-mode-comparison.mjs';
import {reviewCodeModeToolIdentity} from './codex-code-mode-identity-review.mjs';
const model='gpt-5.6-sol',provider='nightvoyage_metadata_fixture';
const probeText='Independent fictional transport probe. No person or memory is represented.';
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
function options(value){
 if(!value||Object.getPrototypeOf(value)!==Object.prototype||Reflect.ownKeys(value).some(key=>!['signal','timeoutMs','stateDirectory'].includes(key)||!Object.hasOwn(Object.getOwnPropertyDescriptor(value,key),'value')))throw Error('metadata_options_invalid');
 const {signal,timeoutMs=10000,stateDirectory}=value;
 if(typeof stateDirectory!=='string'||!path.isAbsolute(stateDirectory))throw Error('metadata_options_invalid');
 if(signal!==undefined&&!(signal instanceof AbortSignal)||!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>30000)throw Error('metadata_options_invalid');
 return {signal,timeoutMs,stateDirectory};
}
export function observeNativeCodexPersistentWait(executable,value={}){
 const settings=options(value),comparison=codexToolModeCase('code_only_empty');
 if(typeof executable!=='string'||!path.isAbsolute(executable)||!/^codex(?:\.exe)?$/i.test(path.basename(executable)))throw Error('metadata_executable_invalid');
 let binary;try{binary=fs.realpathSync(executable);if(!fs.statSync(binary).isFile()||!/^codex(?:\.exe)?$/i.test(path.basename(binary)))throw Error();}catch{throw Error('metadata_executable_invalid');}
 return persistentRun({kind:'native',binary,fictionalCatalog:true,environmentless:comparison.environmentless,comparison},settings);
}
export function rehearseCodexPersistentWait(scenario='observed',value={}){
 const settings=options(value),comparison=codexToolModeCase('code_only_empty');
 if(!['observed','quiet_denial','trace_before_call','trace_duplicate','trace_unknown_after','trace_wrong_target','trace_unsupported_exec','trace_no_continuation','trace_no_newline','trace_prefix_before_call','legacy_invalid_root','invalid_warning_timestamp','extra_warning_field','bare_warning','host_enabled','fallback_enabled','missing_guard','unknown_warning','foreign_warning','duplicate_warning','no_warning','unknown_tools','missing_tools','wrong_output','wrong_call','duplicate_output','wrong_kind','auth_header','early_post','third_post','duplicate_initial','malformed_body','oversized_body','encoded_body','wrong_path','second_unknown_tools','warning_after_request','server_request','stderr_error','stall_thread','stall_after_call','catalog_body_changed','wrong_provider'].includes(scenario))throw Error('metadata_scenario_invalid');
 return persistentRun({kind:'independent_node_peer',scenario,fictionalCatalog:true,environmentless:true,comparison},settings);
}

export function persistentWaitIdentity(){
 const comparison=codexToolModeCase('code_only_empty');
 const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
 return {approval_id:'independent-persistent-wait-v1',run_id:'independent-persistent-wait-v1',adapter_kind:'CodexAdapter',model_id:model,
  protocol_version:'codex-local-persistent-wait-v1',source_hash:hash({guard:codeModeGuardOverrides(),probeText,provider}),
  fixture_hash:hash({catalog:comparison.catalog,sse:fixedGuardWaitSse()}),expires_at:Date.parse('2026-11-01T00:00:00.000Z'),max_calls:2,confirmation_origin:'independent_fictional_fixture'};
}
async function persistentRun(launch,settings){
 let trial;
 try{trial=openFictionalTrialStore({directory:settings.stateDirectory,identity:persistentWaitIdentity(),mode:'create',now:Date.now()});}
 catch{return {contractVersion:'codex-local-persistent-wait-v1',kind:launch.kind,status:'blocked',reason:'persistent_trial_create_blocked',processStarted:false,ownedProcessClosed:false,temporaryCleanupComplete:false,retainedAllowanceOpened:false,retainedAllowanceClosed:false,retainedAllowancePresent:'not_inspected',realModelRequests:0,credentialReads:0,dispatchEnabled:false,productionAdmission:false};}
 let report;
 try{
  if(settings.signal?.aborted){trial.cancel(Date.now());report={contractVersion:'codex-local-persistent-wait-v1',kind:launch.kind,status:'cancelled',reason:'cancelled_before_start',processStarted:false};}
  else report=await run(launch,{...settings,trial});
 }catch{report={contractVersion:'codex-local-persistent-wait-v1',kind:launch.kind,status:'blocked',reason:'persistent_owner_failed',processStarted:'unknown'};}
 finally{try{trial.close();}catch{if(report){report.status='blocked';report.reason='persistent_owner_close_failed';}}}
 return {...report,retainedAllowance:trial.view(),retainedAllowanceClosed:trial.view().closed,
  retainedAllowancePresent:fs.existsSync(path.join(settings.stateDirectory,'fictional-trial.json')),
  retainedRelayPresent:fs.existsSync(path.join(settings.stateDirectory,'relay','forward-journal.json')),
  retainedPathReturned:false,realUserApprovalRecorded:false,realProviderAccountingIntegrated:false,nativePersistentFixtureIntegrated:launch.kind==='native'&&report.fixtureModelPosts===2,dispatchEnabled:false,productionAdmission:false};
}

function temporaryParent(){
 try{
  const parent=fs.realpathSync(os.tmpdir()),source=fs.realpathSync(fileURLToPath(new URL('../',import.meta.url)));
  const relative=path.relative(source,parent);
  if(relative===''||relative!=='..'&&!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative))throw Error();
  for(let cursor=parent;;){
   if(fs.existsSync(path.join(cursor,'.git')))throw Error();
   const next=path.dirname(cursor);if(next===cursor)break;cursor=next;
  }
  return parent;
 }catch{throw Error('metadata_workspace_unavailable');}
}
async function run(launch,{signal,timeoutMs,stateDirectory,trial}){
 const report={contractVersion:'codex-local-persistent-wait-v1',kind:launch.kind,status:'not_started',reason:null,
  requestedModel:model,initializeChecked:false,configurationChecked:false,threadPrepared:false,threadEphemeralVerified:false,
  processStarted:false,ownedProcessClosed:false,temporaryCleanupComplete:false,temporaryCleanupFailureCode:null,cleanupReview:null,configWarnings:0,
  fixtureCatalogGets:0,fixtureModelPosts:0,unexpectedHttpRequests:0,methodsQueued:[],startupDiagnostics:null,guardWaitTracePolicy:null,
  requestObservation:null,requestIdentityWitness:null,notificationRejection:null,requestBodyRetained:false,generatedResponseSupplied:false,
  candidateGuardConfigurationMatched:false,expectedGuardWarningObserved:false,guardWarningEnvelopeReview:null,scriptedWaitCallSupplied:false,selectedWaitObservation:null,
  observedPostRecords:0,postRecordsSavedBeforeFixtureReply:false,realProviderAccountingIntegrated:false,localForwardAccounting:null,ownedShutdown:null,
  remoteHostArgumentSupplied:false,nativeVersionVerified:false,allHandlerDenialVerified:false,
  catalogMode:'independent_tool_mode_comparison',caseId:launch.comparison.caseId,toolMode:launch.comparison.toolMode,inputModalities:launch.comparison.inputModalities,comparisonVersion:codexToolModeComparisonVersion,
  fictionalCatalogVersion:codexToolModeComparisonVersion,
  fictionalCatalogSha256:null,fictionalCatalogConfigured:false,fictionalCatalogBytesChecked:false,
  catalogRepresentsRealModel:false,catalogControlsToolExposure:true,subscriptionCapabilityInferred:false,
  experimentalApiRequested:launch.environmentless===true,environmentMode:launch.environmentless?'explicit_empty_turn_environments':'default_thread_environment',
  additionalToolControlsRequested:launch.environmentless===true,additionalToolControlsConfigured:false,additionalToolControlsStatus:'not_requested',emptyEnvironmentsSent:false,environmentHandlerDenialVerified:false,
  accountAuthorizationRequested:false,appServerTurnsRequested:0,credentialEnvironmentSupplied:false,
  dispatchEnabled:false,toolExclusionVerified:false,modelEntitlementVerified:false,
  backgroundNetworkInstrumented:false,descendantTerminationConfirmed:'unknown',qualityAssessed:false};
 if(signal?.aborted)return {...report,status:'cancelled',reason:'cancelled_before_start'};
 const root=fs.mkdtempSync(path.join(temporaryParent(),'nightvoyage-request-observer-'));
 const state=path.join(root,'state'),cwd=path.join(root,'cwd'),home=path.join(root,'profile');
 let server,child,relay,cleanup,shutdown,relayIntents=0,stop=()=>{},failure=null,prepared=false,observed=false,pendingFixtureResponse=null;
 const postRecordsPath=path.join(root,'local-post-observations.json');
 const relayState=path.join(stateDirectory,'relay');
 const catalogPath=path.join(root,'fictional-model-catalog.json');
 const catalogBytes=launch.fictionalCatalog?Buffer.from(JSON.stringify(launch.comparison.catalog)):null;
 try{
  cleanup=createOwnedProbeCleanup(root);
  for(const dir of [state,cwd,home,relayState])fs.mkdirSync(dir);
  if(catalogBytes){fs.writeFileSync(catalogPath,catalogBytes,{flag:'wx',mode:0o600});report.fictionalCatalogSha256=createHash('sha256').update(catalogBytes).digest('hex');}
  server=http.createServer((req,res)=>{
   const reject=reason=>{stop(reason);req.destroy();};
   if(req.headers.authorization){report.unexpectedHttpRequests++;reject('unexpected_authorization_header');return;}

   if(req.method!=='POST'||req.url!=='/v1/responses'){
    if(req.method==='POST')report.fixtureModelPosts++;report.unexpectedHttpRequests++;reject('unexpected_fixture_dispatch');return;
   }
   report.fixtureModelPosts++;
   try{const logical=JSON.parse(fs.readFileSync(path.join(stateDirectory,'fictional-trial.json'),'utf8'));if(logical.identity_hash!==trial.view().identity_hash||logical.phase!=='pending'||logical.attempts.length!==report.fixtureModelPosts||logical.attempts.at(-1).state!=='pending')throw Error();const saved=JSON.parse(fs.readFileSync(path.join(relayState,'forward-journal.json'),'utf8'));if(saved.calls!==report.fixtureModelPosts||saved.phase!==(saved.calls===1?'first_in_flight':'second_in_flight'))throw Error();relayIntents++;}catch{reject('pre_forward_intent_missing');return;}
   if(report.fixtureModelPosts>2||report.appServerTurnsRequested!==1||!report.threadPrepared||!report.candidateGuardConfigurationMatched||report.fixtureModelPosts===2&&!report.scriptedWaitCallSupplied){reject('unexpected_fixture_dispatch');return;}
   if(req.headers['content-encoding']&&req.headers['content-encoding']!=='identity'){reject('request_encoding_unsupported');return;}
   if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']??'')){reject('request_media_invalid');return;}
   let chunks=[],size=0,finished=false;
   const timer=setTimeout(()=>{chunks=[];reject('request_read_timeout');},3000);
   req.on('data',chunk=>{if(finished||failure)return;size+=chunk.length;if(size>262144){finished=true;chunks=[];clearTimeout(timer);reject('request_byte_limit');}else chunks.push(chunk);});
   req.on('error',()=>{chunks=[];clearTimeout(timer);if(!observed)stop('request_read_failed');});
   req.on('aborted',()=>{chunks=[];clearTimeout(timer);if(!observed)stop('request_read_failed');});
   req.on('close',()=>clearTimeout(timer));
   req.on('end',()=>{
    if(finished||failure){chunks=[];return;}finished=true;clearTimeout(timer);
    const ordinal=report.fixtureModelPosts;
    try{
     const bytes=Buffer.concat(chunks);
     const o=reviewCodexLocalRequest(bytes),r=reviewCodeModeToolIdentity(bytes);
     if(ordinal===1){report.requestObservation=o;report.requestIdentityWitness=r;}
     if(o.namespaceCount!==0||o.toolCount!==2||r.unreviewedIdentities!==0||[...r.publicCodes].sort().join(',')!=='public_exec_custom,shared_wait_function')throw Error('guard_inventory_rejected');
     if(ordinal===2){
      report.selectedWaitObservation=reviewGuardWaitContinuation(bytes);
      if(!report.selectedWaitObservation.selectedWaitDisabledHostObserved)throw Error('guard_wait_output_unclassified');
     }
     // This records an already observed LOCAL POST, not an outbound provider reservation.
     fs.writeFileSync(postRecordsPath+'.next',JSON.stringify({version:'local-guard-observed-posts-v1',observedPosts:ordinal}),{mode:0o600});
     fs.renameSync(postRecordsPath+'.next',postRecordsPath);report.observedPostRecords=ordinal;
     if(ordinal===1){
      pendingFixtureResponse=()=>{
       if(failure||!report.expectedGuardWarningObserved||report.scriptedWaitCallSupplied)return;
       report.scriptedWaitCallSupplied=true;report.generatedResponseSupplied=true;report.postRecordsSavedBeforeFixtureReply=true;
       res.writeHead(200,{'Content-Type':'text/event-stream'});res.end(fixedGuardWaitSse());pendingFixtureResponse=null;
      };
      pendingFixtureResponse();
     }else{
      observed=true;
      res.writeHead(400,{'Content-Type':'application/json'});
      res.end('{"error":{"code":"nightvoyage_local_guard_complete","message":"Local fixture complete"}}',()=>{
       const check=()=>{if(failure||relay.view().closed)return;if(relay.view().failed){stop('local_forward_failed');return;}if(relay.view().journal.phase==='completed')stop(null);else setTimeout(check,5);};check();
      });
     }
    }catch(error){stop(['guard_inventory_rejected','guard_wait_output_unclassified'].includes(error.message)?error.message:'guard_request_review_rejected');res.destroy();}
    finally{chunks=[];}
   });
  });
  server.maxHeadersCount=32;server.headersTimeout=3000;server.requestTimeout=3000;
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  relay=await openLocalForwardOwner({target:`http://127.0.0.1:${server.address().port}/v1/responses`,stateDirectory:relayState,fictionalTrial:trial});
  const base=relay.endpoint.replace(/\/responses$/,''),catalog=base.replace(/\/v1$/,'/models');
  const overrides=[...codeModeGuardOverrides(),'cli_auth_credentials_store="file"','features.shell_snapshot=false',`model="${model}"`,`model_provider="${provider}"`,
   `model_providers.${provider}.name="Nightvoyage metadata fixture"`,`model_providers.${provider}.base_url="${base}"`,
   `model_providers.${provider}.model_catalog_url="${catalog}"`,`model_providers.${provider}.wire_api="responses"`,
   `model_providers.${provider}.requires_openai_auth=false`,`model_providers.${provider}.supports_websockets=false`,
   `model_providers.${provider}.request_max_retries=0`,`model_providers.${provider}.stream_max_retries=0`];
  if(catalogBytes)overrides.push('model_catalog_json='+JSON.stringify(catalogPath));
  if(launch.environmentless)overrides.push('tools.experimental_request_user_input.enabled=false','tools.update_plan.enabled=false');
  const args=['app-server','--listen','stdio://',...overrides.flatMap(value=>['-c',value])];
  const dirs=[path.dirname(process.execPath),...(launch.binary?[path.dirname(launch.binary)]:[])];
  const env={CODEX_HOME:state,HOME:home,USERPROFILE:home,XDG_CONFIG_HOME:home,APPDATA:home,LOCALAPPDATA:home,TEMP:root,TMP:root};
  if(process.platform==='win32'){
   if(!process.env.SystemRoot||!path.isAbsolute(process.env.SystemRoot))throw Error('system_root_unavailable');
   env.SystemRoot=process.env.SystemRoot;env.WINDIR=process.env.SystemRoot;dirs.push(path.join(process.env.SystemRoot,'System32'));
  }else dirs.push('/usr/bin','/bin');
  env.PATH=[...new Set(dirs)].join(path.delimiter);
  const executable=launch.kind==='native'?launch.binary:process.execPath;
  const childArgs=launch.kind==='native'?args:[fileURLToPath(new URL('../test-support/codex-code-mode-wait-peer.mjs',import.meta.url)),launch.scenario,...args];
  const decoder=new TextDecoder('utf-8',{fatal:true}),diagnostics=new CodexStartupDiagnostics(),tracePolicy=new GuardExecTracePolicy();
  const traceContext=()=>({responseQueued:report.scriptedWaitCallSupplied,guardMatched:report.candidateGuardConfigurationMatched,warningMatched:report.expectedGuardWarningObserved,identitiesMatched:report.requestIdentityWitness?.unreviewedIdentities===0&&report.requestIdentityWitness?.toolCount===2,threadPrepared:report.threadPrepared,catalogBytesChecked:report.fictionalCatalogBytesChecked,continuationObserved:observed,terminal:failure!==null||closing});
  let pending='',bytes=0,frames=0,phase='initialize',expected=1,threadId=null,earlyThreadId=null,threadNotificationSeen=false,closing=false,turnId=null,earlyTurnId=null,turnStarted=false,userItemId=null,userItemDone=false;
  const samePath=(a,b)=>typeof a==='string'&&(process.platform==='win32'?path.resolve(a).toLowerCase()===path.resolve(b).toLowerCase():path.resolve(a)===path.resolve(b));
  await new Promise(resolve=>{
   let timer;
   const terminate=()=>{
    if(!child||child.exitCode!==null||child.signalCode!==null)return;
    try{if(process.platform!=='win32')process.kill(-child.pid,'SIGKILL');else child.kill('SIGKILL');}catch{try{child.kill('SIGKILL');}catch{}}
   };
   stop=reason=>{if(reason&&!failure)failure=reason;closing=true;if(shutdown){if(reason)shutdown.abort();else shutdown.finishNormally();}else terminate();};
   const abort=()=>{try{relay.cancel();stop('cancelled');}catch{stop('cancellation_persistence_failed');}};
   const send=frame=>{report.methodsQueued.push(frame.method);child.stdin.write(JSON.stringify(frame)+'\n',error=>{if(error&&!closing)stop('stdin_failed');});};
   const frame=message=>{
    if(!object(message))throw Error('rpc_shape_invalid');
    const rejectNotification=(check,reason='unexpected_notification')=>{
     if(report.notificationRejection===null){
      report.notificationRejection=observerNotificationWitness(message.method,check,phase,message.params?.item?.type);
      if(message.method==='warning'){
       const id=message.params?.threadId;
       const binding=id===undefined?'missing':id===null?'global':threadId!==null&&id===threadId?'matches':'different';
       report.notificationRejection.warningDiagnostic=reviewObserverWarning(message.params?.message,binding);
      }
     }
     throw Error(reason);
    };
    if(Object.hasOwn(message,'id')){
     if(Object.hasOwn(message,'method'))throw Error('unexpected_server_request');
     if(message.id!==expected||message.error||!object(message.result))throw Error('rpc_rejected');
     const result=message.result;
     if(phase==='initialize'){
      if(!samePath(result.codexHome,state)||!['platformFamily','platformOs','userAgent'].every(key=>typeof result[key]==='string'&&result[key].length>0&&result[key].length<=4096))throw Error('initialize_mismatch');
      report.initializeChecked=true;phase='config';expected=2;
      send({method:'initialized',params:{}});send({id:2,method:'config/read',params:{includeLayers:false}});
     }else if(phase==='config'){
      const review=reviewCodeModeGuardConfig(JSON.stringify(message)),config=result.config,p=config?.model_providers?.[provider];
      if(!review.candidateConfigurationMatched||config?.model!==model||config?.model_provider!==provider||config?.cli_auth_credentials_store!=='file'||p?.base_url!==base||p?.model_catalog_url!==catalog||p?.requires_openai_auth!==false||p?.supports_websockets!==false||p?.request_max_retries!==0||p?.stream_max_retries!==0)throw Error('configuration_mismatch');
      if(catalogBytes){
       if(!samePath(config.model_catalog_json,catalogPath))throw Error('configuration_mismatch');
       report.fictionalCatalogConfigured=true;
      }
      if(launch.environmentless){
       const values=[config.tools?.experimental_request_user_input?.enabled,config.tools?.update_plan?.enabled];
       if(values.some(value=>value!==undefined&&value!==false))throw Error('configuration_mismatch');
       report.additionalToolControlsConfigured=values.every(value=>value===false);
       report.additionalToolControlsStatus=report.additionalToolControlsConfigured?'matched':'not_reported';
      }
      report.candidateGuardConfigurationMatched=true;report.configurationChecked=true;phase='thread';expected=3;
      send({id:3,method:'thread/start',params:{model,modelProvider:provider,ephemeral:true,approvalPolicy:'never',sandbox:'read-only',cwd}});
     }else if(phase==='thread'){
      if(result.model!==model||result.modelProvider!==provider||result.approvalPolicy!=='never'||result.sandbox?.type!=='readOnly'||result.thread?.ephemeral!==true||(earlyThreadId!==null&&earlyThreadId!==result.thread.id)||typeof result.thread.id!=='string'||!/^[A-Za-z0-9_-]{1,200}$/.test(result.thread.id))throw Error('thread_mismatch');
      threadId=result.thread.id;report.threadPrepared=true;report.threadEphemeralVerified=true;prepared=true;phase='turn';expected=4;
      if(catalogBytes){
       let current;try{const stat=fs.lstatSync(catalogPath);if(!stat.isFile()||stat.isSymbolicLink()||stat.size!==catalogBytes.length)throw Error();current=fs.readFileSync(catalogPath);}catch{throw Error('fictional_catalog_changed');}
       if(!current.equals(catalogBytes))throw Error('fictional_catalog_changed');
       report.fictionalCatalogBytesChecked=true;
      }
      report.appServerTurnsRequested=1;
      if(launch.environmentless)report.emptyEnvironmentsSent=true;
      send({id:4,method:'turn/start',params:{threadId,input:[{type:'text',text:probeText,text_elements:[]}],...(launch.environmentless?{environments:[]}: {})}});
     }else if(phase==='turn'){
      if(typeof result.turn?.id!=='string'||!/^[A-Za-z0-9_-]{1,200}$/.test(result.turn.id)||earlyTurnId!==null&&earlyTurnId!==result.turn.id)throw Error('turn_mismatch');
      turnId=result.turn.id;phase='observing';expected=null;
     }else throw Error('unexpected_rpc_reply');
    }else if(message.method==='warning'&&['turn','observing'].includes(phase)){
     report.guardWarningEnvelopeReview=reviewGuardWarningEnvelope(JSON.stringify(message),threadId);
     if(!report.candidateGuardConfigurationMatched||report.expectedGuardWarningObserved||!exactGuardWarning(message,threadId))rejectNotification('guard_warning_rejected');
     report.expectedGuardWarningObserved=true;pendingFixtureResponse?.();
    }else if(message.method==='configWarning'){report.configWarnings++;throw Error('configuration_warning_observed');}
    else if(message.method==='remoteControl/status/changed'){}
    else if(message.method==='thread/started'&&['thread','turn','observing'].includes(phase)){
     const id=message.params?.thread?.id;
     if(threadNotificationSeen||typeof id!=='string'||!/^[A-Za-z0-9_-]{1,200}$/.test(id)||threadId!==null&&id!==threadId)throw Error('thread_mismatch');
     threadNotificationSeen=true;earlyThreadId=id;
    }else if(message.method==='turn/started'&&['turn','observing'].includes(phase)){
     const id=message.params?.turn?.id;
     if(turnStarted||message.params?.threadId!==threadId||typeof id!=='string'||!/^[A-Za-z0-9_-]{1,200}$/.test(id)||turnId!==null&&turnId!==id)rejectNotification('turn_started_mismatch','turn_mismatch');
     turnStarted=true;earlyTurnId=id;
    }else if(message.method==='thread/status/changed'&&['turn','observing'].includes(phase)){
     const p=message.params;
     if(p?.threadId!==threadId)rejectNotification('notification_thread_mismatch','turn_mismatch');
     if(!['idle','active'].includes(p.status?.type)||p.status.type==='active'&&(!Array.isArray(p.status.activeFlags)||p.status.activeFlags.length!==0))rejectNotification('thread_status_rejected','turn_mismatch');
    }else if(['item/started','item/completed'].includes(message.method)&&['turn','observing'].includes(phase)){
     const p=message.params,item=p?.item,id=turnId??earlyTurnId;
     if(id===null)rejectNotification('user_item_before_turn_identity');
     if(p?.threadId!==threadId)rejectNotification('notification_thread_mismatch');
     if(p.turnId!==id)rejectNotification('notification_turn_mismatch');
     if(item?.type!=='userMessage')rejectNotification('non_user_item');
     if(typeof item.id!=='string'||!/^[A-Za-z0-9_-]{1,200}$/.test(item.id))rejectNotification('user_item_id_shape');
     if(!Array.isArray(item.content)||item.content.length!==1||item.content[0]?.type!=='text')rejectNotification('user_item_content_shape');
     if(item.content[0].text!==probeText)rejectNotification('user_item_text_mismatch');
     if(message.method==='item/started'){if(userItemId!==null)rejectNotification('user_item_duplicate_start');userItemId=item.id;}
     else {if(userItemId!==item.id||userItemDone)rejectNotification('user_item_completion_mismatch');userItemDone=true;}
    }else rejectNotification('notification_not_reviewed');
   };
   child=spawn(executable,childArgs,{cwd,env,shell:false,windowsHide:true,detached:process.platform!=='win32',stdio:['pipe','pipe','pipe']});
   shutdown=createOwnedChildStop(child);
   child.once('spawn',()=>{report.processStarted=true;});
   child.once('error',()=>stop('spawn_failed'));child.stdin.on('error',()=>{if(!closing)stop('stdin_failed');});
   child.stdout.on('error',()=>stop('stdout_failed'));child.stderr.on('error',()=>stop('stderr_failed'));
   child.stdout.on('data',chunk=>{
    if(failure||observed)return;
    try{
     bytes+=chunk.byteLength;if(bytes>262144)throw Error('stdout_limit');
     pending+=decoder.decode(chunk,{stream:true});let end;
     while((end=pending.indexOf('\n'))>=0){const line=pending.slice(0,end);pending=pending.slice(end+1);if(!line.trim())continue;if(++frames>64||Buffer.byteLength(line)>65536)throw Error('stdout_limit');frame(JSON.parse(line));}
     if(Buffer.byteLength(pending)>65536)throw Error('stdout_limit');
    }catch(error){stop(['rpc_shape_invalid','unexpected_server_request','rpc_rejected','initialize_mismatch','configuration_mismatch','thread_mismatch','unexpected_rpc_reply','unexpected_notification','stdout_limit','configuration_warning_observed','turn_mismatch','fictional_catalog_changed'].includes(error.message)?error.message:'stdout_invalid');}
   });
   child.stderr.on('data',chunk=>{try{diagnostics.push(chunk);if(!tracePolicy.push(chunk,traceContext()))stop('startup_error_observed');}catch{stop('stderr_invalid');}});
   // An escaped descendant may keep inherited pipe descriptors open after its owner exits.
   // Close only our pipe handles; do not claim descendant termination.
   child.once('exit',()=>{child.stdin.destroy();child.stdout.destroy();child.stderr.destroy();});
   child.once('close',()=>{
    clearTimeout(timer);signal?.removeEventListener('abort',abort);report.ownedProcessClosed=report.processStarted;
    try{pending+=decoder.decode();if(pending.trim())failure??='stdout_incomplete';report.startupDiagnostics=diagnostics.finish();report.guardWaitTracePolicy=tracePolicy.finish(traceContext());if(report.guardWaitTracePolicy.blocked)failure??='startup_error_observed';if(report.guardWaitTracePolicy.expectedTraceLinesContinued&&!observed)failure??='guard_trace_without_bound_continuation';}catch{failure??='diagnostic_incomplete';}
    report.ownedShutdown=shutdown.view();if(!observed)failure??=prepared?'process_exited_before_selected_denial':'process_exited_before_thread';resolve();
   });
   timer=setTimeout(()=>stop(report.scriptedWaitCallSupplied?'selected_denial_timeout':report.requestObservation&&!report.expectedGuardWarningObserved?'guard_warning_missing':'preparation_timeout'),timeoutMs);
   signal?.addEventListener('abort',abort,{once:true});
   if(signal?.aborted)abort();else send({id:1,method:'initialize',params:{clientInfo:{name:'Asteria-Nightvoyage',title:'Asteria-Nightvoyage',version:'0.1.0'},...(launch.environmentless?{capabilities:{experimentalApi:true,optOutNotificationMethods:['account/rateLimits/updated']}}:{})}});
  });
 }catch{failure??='metadata_owner_failed';}
 finally{
  if(relay){try{await relay.close();}catch{failure??='local_forward_cleanup_failed';}report.localForwardAccounting={...relay.view(),appServerIntegrated:launch.kind==='native'&&relayIntents>0,intentsCheckedBeforeFixtureArrival:relayIntents,nativeAppServerClient:launch.kind==='native'&&relayIntents>0,independentPeerClient:launch.kind!=='native'&&relayIntents>0,logicalTrialBudgetIntegrated:true,logicalTrialScope:'independent_fictional_two_http_calls'};if(observed&&(relayIntents!==2||relay.view().journal.phase!=='completed'||relay.view().forwardedLocalRequests!==2||trial.view().phase!=='completed'||trial.view().calls!==2))failure??='local_forward_accounting_incomplete';}
  if(server){server.closeAllConnections();await new Promise(resolve=>server.close(()=>resolve()));}
  // Retry only removal of this invocation's private workspace; never restart Codex.
  try{if(!cleanup)throw Error();report.cleanupReview=await cleanup();report.temporaryCleanupComplete=report.cleanupReview.status==='removed';if(!report.temporaryCleanupComplete){report.temporaryCleanupFailureCode=report.cleanupReview.lastFailure?.code??'unknown';failure??='temporary_cleanup_failed';}}
  catch{report.temporaryCleanupFailureCode='unknown';failure??='temporary_cleanup_failed';}
 }
 report.status=failure==='cancelled'?'cancelled':failure?'blocked':'selected_wait_denial_observed';report.reason=failure;
 return report;
}
