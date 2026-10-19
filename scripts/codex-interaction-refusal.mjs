import {fixedFinalAnswerSse,CodexFixedCompletion} from './codex-fixed-completion.mjs';
// Separate fixed interaction refusal probe. Local fictional server only; never a model adapter.
import {fixedInteractionRefusalSse,reviewInteractionRefusalContinuation} from './codex-refusal-fixture.mjs';
import {CodexRefusalStderrWitness} from './codex-refusal-stderr-witness.mjs';
import {CodexRefusalTracePolicy} from './codex-refusal-trace-policy.mjs';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {createHash} from 'node:crypto';
import {fictionalCodexCatalog,fictionalCodexCatalogVersion} from './codex-fictional-catalog.mjs';
import {fileURLToPath} from 'node:url';
import {codexIsolationOverrides,reviewCodexConfigReply} from './codex-isolation-review.mjs';
import {reviewObserverWarning} from './codex-observer-warning-review.mjs';
import {observerNotificationWitness} from './codex-observer-notification-witness.mjs';
import {reviewCodexLocalRequest} from './codex-request-tool-review.mjs';
import {CodexStartupDiagnostics} from './codex-startup-diagnostics.mjs';
const model='gpt-5.6-sol',provider='nightvoyage_metadata_fixture';
const probeText='Independent fictional transport probe. No person or memory is represented.';
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
function options(value){
 if(!value||Object.getPrototypeOf(value)!==Object.prototype||Reflect.ownKeys(value).some(key=>!['signal','timeoutMs'].includes(key)||!Object.hasOwn(Object.getOwnPropertyDescriptor(value,key),'value')))throw Error('metadata_options_invalid');
 const {signal,timeoutMs=10000}=value;
 if(signal!==undefined&&!(signal instanceof AbortSignal)||!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>30000)throw Error('metadata_options_invalid');
 return {signal,timeoutMs};
}
export function observeNativeCodexInteractionRefusal(executable,value={}){
 const settings=options(value);
 if(typeof executable!=='string'||!path.isAbsolute(executable)||!/^codex(?:\.exe)?$/i.test(path.basename(executable)))throw Error('metadata_executable_invalid');
 let binary;try{binary=fs.realpathSync(executable);if(!fs.statSync(binary).isFile())throw Error();}catch{throw Error('metadata_executable_invalid');}
 return run({kind:'native',binary,environmentless:true,fictionalCatalog:true},settings);
}
export function rehearseCodexInteractionRefusal(scenario='refusal_unsupported',value={}){
 const settings=options(value);
 if(!['refusal_unsupported','refusal_other_output','refusal_wrong_call','refusal_nonempty_tools','refusal_server_request','refusal_stall','refusal_duplicate_output','refusal_late_body','refusal_controls_changed','refusal_stderr_unsupported','refusal_stderr_other','refusal_stderr_before','refusal_stderr_no_newline'].includes(scenario))throw Error('metadata_scenario_invalid');
 return run({kind:'independent_node_peer',scenario,environmentless:true,fictionalCatalog:true},settings);
}

export function observeNativeCodexRefusalContinuation(executable,value={}){
 const settings=options(value);
 if(typeof executable!=='string'||!path.isAbsolute(executable)||!/^codex(?:\.exe)?$/i.test(path.basename(executable)))throw Error('metadata_executable_invalid');
 let binary;try{binary=fs.realpathSync(executable);if(!fs.statSync(binary).isFile())throw Error();}catch{throw Error('metadata_executable_invalid');}
 return run({kind:'native',binary,environmentless:true,fictionalCatalog:true,continueExpectedTrace:true},settings);
}
export function rehearseCodexRefusalContinuation(scenario='refusal_trace_then_unsupported',value={}){
 const settings=options(value);
 if(!['refusal_trace_then_unsupported','refusal_trace_then_other','refusal_trace_unknown_after','refusal_trace_double','refusal_trace_wrong_tool','refusal_trace_early','refusal_trace_no_continuation','refusal_trace_no_linebreak','refusal_trace_late_body','refusal_trace_optout_ignored','refusal_trace_other_account','refusal_trace_unknown_notification','refusal_late_body','refusal_nonempty_tools'].includes(scenario))throw Error('metadata_scenario_invalid');
 return run({kind:'independent_node_peer',scenario,environmentless:true,fictionalCatalog:true,continueExpectedTrace:true},settings);
}

export function observeNativeCodexFinalCompletion(executable,value={}){
 const settings=options(value);
 if(typeof executable!=='string'||!path.isAbsolute(executable)||!/^codex(?:\.exe)?$/i.test(path.basename(executable)))throw Error('metadata_executable_invalid');
 let binary;try{binary=fs.realpathSync(executable);if(!fs.statSync(binary).isFile())throw Error();}catch{throw Error('metadata_executable_invalid');}
 return run({kind:'native',binary,environmentless:true,fictionalCatalog:true,finalCompletion:true},settings);
}
export function rehearseCodexFinalCompletion(scenario='final_success',value={}){
 const settings=options(value);
 if(!['final_success','final_wrong_text','final_wrong_item','final_wrong_turn','final_failed','final_hidden_tool','final_no_complete','final_tool_request','final_nonempty_tools','final_duplicate_item','final_stderr','final_late'].includes(scenario))throw Error('metadata_scenario_invalid');
 return run({kind:'independent_node_peer',scenario,environmentless:true,fictionalCatalog:true,finalCompletion:true},settings);
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
async function run(launch,{signal,timeoutMs}){
 const report={contractVersion:launch.finalCompletion?'codex-local-final-completion-v1':launch.continueExpectedTrace?'codex-local-refusal-continuation-v1':'codex-local-interaction-refusal-v1',kind:launch.kind,status:'not_started',reason:null,
  requestedModel:model,initializeChecked:false,configurationChecked:false,threadPrepared:false,threadEphemeralVerified:false,
  processStarted:false,ownedProcessClosed:false,temporaryCleanupComplete:false,temporaryCleanupFailureCode:null,configWarnings:0,
  fixtureCatalogGets:0,fixtureModelPosts:0,unexpectedHttpRequests:0,methodsQueued:[],startupDiagnostics:null,refusalStderrWitness:null,expectedTraceContinuationRequested:launch.continueExpectedTrace===true,refusalTracePolicy:null,
  notificationOptOutRequested:launch.continueExpectedTrace||launch.finalCompletion?['account/rateLimits/updated']:[],notificationOptOutVerified:false,
  accountRateLimitPayloadInterpreted:false,accountRateLimitDataReturned:false,
  requestObservation:null,refusalObservation:null,finalObservation:null,scriptedResponseSupplied:false,localRequestLimit:launch.finalCompletion?1:2,notificationRejection:null,requestBodyRetained:false,generatedResponseSupplied:false,
  catalogMode:launch.fictionalCatalog?'fixed_fictional_startup_catalog':'original_empty_fixture_catalog',
  fictionalCatalogVersion:launch.fictionalCatalog?fictionalCodexCatalogVersion:null,
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
 let server,child,stop=()=>{},failure=null,prepared=false,observed=false;
 const catalogPath=path.join(root,'fictional-model-catalog.json');
 const catalogBytes=launch.fictionalCatalog?Buffer.from(JSON.stringify(fictionalCodexCatalog())):null;
 try{
  for(const dir of [state,cwd,home])fs.mkdirSync(dir);
  if(catalogBytes){fs.writeFileSync(catalogPath,catalogBytes,{flag:'wx',mode:0o600});report.fictionalCatalogSha256=createHash('sha256').update(catalogBytes).digest('hex');}
  server=http.createServer((req,res)=>{
   const reject=reason=>{stop(reason);req.destroy();};
   if(req.headers.authorization){report.unexpectedHttpRequests++;reject('unexpected_authorization_header');return;}
   if(req.method==='GET'&&req.url==='/models'&&report.fixtureCatalogGets<4){
    report.fixtureCatalogGets++;res.writeHead(200,{'Content-Type':'application/json'});res.end('{"models":[]}');return;
   }
   if(req.method!=='POST'||req.url!=='/v1/responses'){
    if(req.method==='POST')report.fixtureModelPosts++;report.unexpectedHttpRequests++;reject('unexpected_fixture_dispatch');return;
   }
   report.fixtureModelPosts++;
   if(report.fixtureModelPosts>report.localRequestLimit||(report.fixtureModelPosts===2&&!report.scriptedResponseSupplied)||report.appServerTurnsRequested!==1||!report.threadPrepared){reject('unexpected_fixture_dispatch');return;}
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
    try{
     const bytes=Buffer.concat(chunks);chunks=[];
     if(report.fixtureModelPosts===1){
      report.requestObservation=reviewCodexLocalRequest(bytes);
      if(!report.requestObservation.toolInventoryReviewed||!report.requestObservation.toolsFieldPresent||report.requestObservation.toolCount!==0){stop('refusal_requires_empty_tools');return;}
      report.scriptedResponseSupplied=true;report.generatedResponseSupplied=true;
      res.writeHead(200,{'Content-Type':'text/event-stream'});res.end(launch.finalCompletion?fixedFinalAnswerSse():fixedInteractionRefusalSse());return;
     }
     report.refusalObservation=reviewInteractionRefusalContinuation(bytes);
     observed=report.refusalObservation.selectedCallUnsupportedObserved;
     if(!observed)failure??='native_refusal_unconfirmed';
    }catch{stop('refusal_continuation_rejected');return;}
    finally{chunks=[];}
    res.writeHead(400,{'Content-Type':'application/json'});
    res.end('{"error":{"code":"nightvoyage_local_refusal_complete","message":"Local refusal fixture complete"}}',()=>stop(observed?null:'native_refusal_unconfirmed'));

   });
  });
  server.maxHeadersCount=32;server.headersTimeout=3000;server.requestTimeout=3000;
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const base=`http://127.0.0.1:${server.address().port}/v1`,catalog=base.replace(/\/v1$/,'/models');
  const overrides=[...codexIsolationOverrides(),'cli_auth_credentials_store="file"','features.shell_snapshot=false',`model="${model}"`,`model_provider="${provider}"`,
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
  const childArgs=launch.kind==='native'?args:[fileURLToPath(new URL('../test-support/codex-request-observer-peer.mjs',import.meta.url)),launch.scenario,...args];
  const decoder=new TextDecoder('utf-8',{fatal:true}),diagnostics=new CodexStartupDiagnostics(),stderrWitness=new CodexRefusalStderrWitness(),tracePolicy=launch.continueExpectedTrace?new CodexRefusalTracePolicy():null;
  const traceContext=()=>({responseQueued:report.scriptedResponseSupplied,emptyInventoryChecked:report.requestObservation?.toolsFieldPresent===true&&report.requestObservation?.toolInventoryReviewed===true&&report.requestObservation?.toolCount===0,threadPrepared:report.threadPrepared,catalogBytesChecked:report.fictionalCatalogBytesChecked,continuationObserved:report.refusalObservation!==null});
  const stderrPhase=()=>report.refusalObservation?'after_continuation_observed':report.scriptedResponseSupplied?'after_response_queued':'before_response_queued';
  let finalCompletion=null;
  let pending='',bytes=0,frames=0,phase='initialize',expected=1,threadId=null,earlyThreadId=null,threadNotificationSeen=false,closing=false,turnId=null,earlyTurnId=null,turnStarted=false,userItemId=null,userItemDone=false;
  const samePath=(a,b)=>typeof a==='string'&&(process.platform==='win32'?path.resolve(a).toLowerCase()===path.resolve(b).toLowerCase():path.resolve(a)===path.resolve(b));
  await new Promise(resolve=>{
   let timer;
   const terminate=()=>{
    if(!child||child.exitCode!==null||child.signalCode!==null)return;
    try{if(process.platform!=='win32')process.kill(-child.pid,'SIGKILL');else child.kill('SIGKILL');}catch{try{child.kill('SIGKILL');}catch{}}
   };
   stop=reason=>{if(reason&&!failure)failure=reason;closing=true;terminate();};
   const abort=()=>stop('cancelled');
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
      const review=reviewCodexConfigReply(JSON.stringify(message)),config=result.config,p=config?.model_providers?.[provider];
      if(!review.configuredControlsMatched||config?.model!==model||config?.model_provider!==provider||config?.cli_auth_credentials_store!=='file'||p?.base_url!==base||p?.model_catalog_url!==catalog||p?.requires_openai_auth!==false||p?.supports_websockets!==false||p?.request_max_retries!==0||p?.stream_max_retries!==0)throw Error('configuration_mismatch');
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
      report.configurationChecked=true;phase='thread';expected=3;
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
      turnId=result.turn.id;
      if(launch.finalCompletion){
       if(result.turn.status!=='inProgress'||result.turn.error||result.turn.items!==undefined&&(!Array.isArray(result.turn.items)||result.turn.items.length!==0))throw Error('turn_mismatch');
       finalCompletion=new CodexFixedCompletion(threadId,turnId);
      }
      phase='observing';expected=null;
     }else throw Error('unexpected_rpc_reply');
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
    }else if(launch.finalCompletion&&phase==='observing'&&finalCompletion&&
      (['item/agentMessage/delta','turn/completed','thread/tokenUsage/updated'].includes(message.method)||['item/started','item/completed'].includes(message.method)&&message.params?.item?.type!=='userMessage')){
     if(!report.scriptedResponseSupplied)throw Error('final_completion_rejected');
     const result=finalCompletion.push(message);
     if(result){report.finalObservation=result;observed=true;stop(null);}
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
    }catch(error){stop(['rpc_shape_invalid','unexpected_server_request','rpc_rejected','initialize_mismatch','configuration_mismatch','thread_mismatch','unexpected_rpc_reply','unexpected_notification','stdout_limit','configuration_warning_observed','turn_mismatch','fictional_catalog_changed','final_completion_rejected'].includes(error.message)?error.message:'stdout_invalid');}
   });
   child.stderr.on('data',chunk=>{try{stderrWitness.push(chunk,stderrPhase());const labels=diagnostics.push(chunk);if(tracePolicy?!tracePolicy.push(chunk,traceContext()):labels.some(label=>['sandbox_executable_lookup_failed','unrecognized_configuration','unclassified_startup_error'].includes(label)))stop('startup_error_observed');}catch{stop('stderr_invalid');}});
   // An escaped descendant may keep inherited pipe descriptors open after its owner exits.
   // Close only our pipe handles; do not claim descendant termination.
   child.once('exit',()=>{child.stdin.destroy();child.stdout.destroy();child.stderr.destroy();});
   child.once('close',()=>{
    clearTimeout(timer);signal?.removeEventListener('abort',abort);report.ownedProcessClosed=report.processStarted;
    try{pending+=decoder.decode();if(pending.trim())failure??='stdout_incomplete';report.refusalStderrWitness=stderrWitness.finish(stderrPhase());report.startupDiagnostics=diagnostics.finish();if(tracePolicy){report.refusalTracePolicy=tracePolicy.finish(traceContext());if(report.refusalTracePolicy.blocked)failure??='startup_error_observed';}else if(report.startupDiagnostics.labels.some(label=>['sandbox_executable_lookup_failed','unrecognized_configuration','unclassified_startup_error'].includes(label)))failure??='startup_error_observed';}catch{failure??='diagnostic_incomplete';}
    if(!observed)failure??=prepared?(launch.finalCompletion?'process_exited_before_final_completion':'process_exited_before_refusal_observation'):'process_exited_before_thread';resolve();
   });
   timer=setTimeout(()=>stop('preparation_timeout'),timeoutMs);
   signal?.addEventListener('abort',abort,{once:true});
   if(signal?.aborted)abort();else send({id:1,method:'initialize',params:{clientInfo:{name:'asteria-nightvoyage',title:'Asteria-Nightvoyage',version:'0.1.0'},...(launch.environmentless?{capabilities:{experimentalApi:true,...(launch.continueExpectedTrace||launch.finalCompletion?{optOutNotificationMethods:['account/rateLimits/updated']}: {})}}:{})}});
  });
 }catch{failure??='metadata_owner_failed';}
 finally{
  if(server){server.closeAllConnections();await new Promise(resolve=>server.close(()=>resolve()));}
  // Retry only removal of this invocation's private workspace; never restart Codex.
  try{await fs.promises.rm(root,{recursive:true,force:true,maxRetries:5,retryDelay:100});report.temporaryCleanupComplete=true;}
  catch(error){report.temporaryCleanupFailureCode=['EBUSY','EPERM','EACCES','ENOTEMPTY','EMFILE','ENFILE'].includes(error?.code)?error.code:'unknown';failure??='temporary_cleanup_failed';}
 }
 report.status=failure==='cancelled'?'cancelled':failure?'blocked':launch.finalCompletion?'fixed_final_completion_observed':'selected_refusal_observed';report.reason=failure;
 return report;
}
