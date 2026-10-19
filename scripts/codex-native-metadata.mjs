// Explicit metadata inspection only. This owner has no login or turn/start operation.
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {codexIsolationOverrides,reviewCodexConfigReply} from './codex-isolation-review.mjs';
import {CodexStartupDiagnostics} from './codex-startup-diagnostics.mjs';
const model='gpt-5.6-sol',provider='nightvoyage_metadata_fixture';
const scenarios=['success','stall_thread','wrong_model','wrong_provider','not_ephemeral','rpc_error','server_request','invalid_stdout','early_exit','unexpected_post','lookup_error','catalog_get','config_warning','early_thread_mismatch','config_wrong_endpoint','config_auth_required','initialize_wrong_home'];
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
function options(value){
 if(!value||Object.getPrototypeOf(value)!==Object.prototype||Reflect.ownKeys(value).some(key=>!['signal','timeoutMs'].includes(key)||!Object.hasOwn(Object.getOwnPropertyDescriptor(value,key),'value')))throw Error('metadata_options_invalid');
 const {signal,timeoutMs=10000}=value;
 if(signal!==undefined&&!(signal instanceof AbortSignal)||!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>30000)throw Error('metadata_options_invalid');
 return {signal,timeoutMs};
}
export function inspectNativeCodexMetadata(executable,value={}){
 const settings=options(value);
 if(typeof executable!=='string'||!path.isAbsolute(executable)||!/^codex(?:\.exe)?$/i.test(path.basename(executable)))throw Error('metadata_executable_invalid');
 let binary;try{binary=fs.realpathSync(executable);if(!fs.statSync(binary).isFile())throw Error();}catch{throw Error('metadata_executable_invalid');}
 return run({kind:'native',binary},settings);
}
export function rehearseCodexNativeMetadata(scenario='success',value={}){
 const settings=options(value);if(!scenarios.includes(scenario))throw Error('metadata_scenario_invalid');
 return run({kind:'independent_node_peer',scenario},settings);
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
 const report={contractVersion:'codex-native-metadata-only-v1',kind:launch.kind,status:'not_started',reason:null,
  requestedModel:model,initializeChecked:false,configurationChecked:false,threadPrepared:false,threadEphemeralVerified:false,
  processStarted:false,ownedProcessClosed:false,temporaryCleanupComplete:false,configWarnings:0,
  fixtureCatalogGets:0,fixtureModelPosts:0,unexpectedHttpRequests:0,methodsQueued:[],startupDiagnostics:null,
  accountAuthorizationRequested:false,appServerTurnsRequested:0,credentialEnvironmentSupplied:false,
  dispatchEnabled:false,toolExclusionVerified:false,modelEntitlementVerified:false,
  backgroundNetworkInstrumented:false,descendantTerminationConfirmed:'unknown',qualityAssessed:false};
 if(signal?.aborted)return {...report,status:'cancelled',reason:'cancelled_before_start'};
 const root=fs.mkdtempSync(path.join(temporaryParent(),'nightvoyage-metadata-only-'));
 const state=path.join(root,'state'),cwd=path.join(root,'cwd'),home=path.join(root,'profile');
 let server,child,stop=()=>{},failure=null,prepared=false;
 try{
  for(const dir of [state,cwd,home])fs.mkdirSync(dir);
  server=http.createServer((req,res)=>{
   if(req.headers.authorization){report.unexpectedHttpRequests++;stop('unexpected_authorization_header');}
   if(req.method==='GET'&&req.url==='/models'&&report.fixtureCatalogGets<4){
    report.fixtureCatalogGets++;res.writeHead(200,{'Content-Type':'application/json'});res.end('{"models":[]}');
   }else{
    if(req.method==='POST')report.fixtureModelPosts++;else report.unexpectedHttpRequests++;
    req.destroy();stop('unexpected_fixture_dispatch');
   }
  });
  server.maxHeadersCount=32;server.headersTimeout=3000;server.requestTimeout=3000;
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const base=`http://127.0.0.1:${server.address().port}/v1`,catalog=base.replace(/\/v1$/,'/models');
  const overrides=[...codexIsolationOverrides(),'cli_auth_credentials_store="file"','features.shell_snapshot=false',`model="${model}"`,`model_provider="${provider}"`,
   `model_providers.${provider}.name="Nightvoyage metadata fixture"`,`model_providers.${provider}.base_url="${base}"`,
   `model_providers.${provider}.model_catalog_url="${catalog}"`,`model_providers.${provider}.wire_api="responses"`,
   `model_providers.${provider}.requires_openai_auth=false`,`model_providers.${provider}.supports_websockets=false`,
   `model_providers.${provider}.request_max_retries=0`,`model_providers.${provider}.stream_max_retries=0`];
  const args=['app-server','--listen','stdio://',...overrides.flatMap(value=>['-c',value])];
  const dirs=[path.dirname(process.execPath),...(launch.binary?[path.dirname(launch.binary)]:[])];
  const env={CODEX_HOME:state,HOME:home,USERPROFILE:home,XDG_CONFIG_HOME:home,APPDATA:home,LOCALAPPDATA:home,TEMP:root,TMP:root};
  if(process.platform==='win32'){
   if(!process.env.SystemRoot||!path.isAbsolute(process.env.SystemRoot))throw Error('system_root_unavailable');
   env.SystemRoot=process.env.SystemRoot;env.WINDIR=process.env.SystemRoot;dirs.push(path.join(process.env.SystemRoot,'System32'));
  }else dirs.push('/usr/bin','/bin');
  env.PATH=[...new Set(dirs)].join(path.delimiter);
  const executable=launch.kind==='native'?launch.binary:process.execPath;
  const childArgs=launch.kind==='native'?args:[fileURLToPath(new URL('../test-support/codex-native-metadata-peer.mjs',import.meta.url)),launch.scenario,...args];
  const decoder=new TextDecoder('utf-8',{fatal:true}),diagnostics=new CodexStartupDiagnostics();
  let pending='',bytes=0,frames=0,phase='initialize',expected=1,threadId=null,earlyThreadId=null,threadNotificationSeen=false,closing=false;
  const samePath=(a,b)=>typeof a==='string'&&(process.platform==='win32'?path.resolve(a).toLowerCase()===path.resolve(b).toLowerCase():path.resolve(a)===path.resolve(b));
  await new Promise(resolve=>{
   let timer;
   const terminate=()=>{
    if(!child||child.exitCode!==null||child.signalCode!==null)return;
    try{if(process.platform!=='win32')process.kill(-child.pid,'SIGKILL');else child.kill('SIGKILL');}catch{try{child.kill('SIGKILL');}catch{}}
   };
   stop=reason=>{if(!failure)failure=reason;closing=true;terminate();};
   const abort=()=>stop('cancelled');
   const send=frame=>{report.methodsQueued.push(frame.method);child.stdin.write(JSON.stringify(frame)+'\n',error=>{if(error&&!closing)stop('stdin_failed');});};
   const frame=message=>{
    if(!object(message))throw Error('rpc_shape_invalid');
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
      report.configurationChecked=true;phase='thread';expected=3;
      send({id:3,method:'thread/start',params:{model,modelProvider:provider,ephemeral:true,approvalPolicy:'never',sandbox:'read-only',cwd}});
     }else if(phase==='thread'){
      if(result.model!==model||result.modelProvider!==provider||result.approvalPolicy!=='never'||result.sandbox?.type!=='readOnly'||result.thread?.ephemeral!==true||(earlyThreadId!==null&&earlyThreadId!==result.thread.id)||typeof result.thread.id!=='string'||!/^[A-Za-z0-9_-]{1,200}$/.test(result.thread.id))throw Error('thread_mismatch');
      threadId=result.thread.id;report.threadPrepared=true;report.threadEphemeralVerified=true;prepared=true;phase='complete';expected=null;closing=true;terminate();
     }else throw Error('unexpected_rpc_reply');
    }else if(message.method==='configWarning'){report.configWarnings++;throw Error('configuration_warning_observed');}
    else if(message.method==='remoteControl/status/changed'){}
    else if(message.method==='thread/started'&&['thread','complete'].includes(phase)){
     const id=message.params?.thread?.id;
     if(threadNotificationSeen||typeof id!=='string'||!/^[A-Za-z0-9_-]{1,200}$/.test(id)||threadId!==null&&id!==threadId)throw Error('thread_mismatch');
     threadNotificationSeen=true;earlyThreadId=id;
    }else throw Error('unexpected_notification');
   };
   child=spawn(executable,childArgs,{cwd,env,shell:false,windowsHide:true,detached:process.platform!=='win32',stdio:['pipe','pipe','pipe']});
   child.once('spawn',()=>{report.processStarted=true;});
   child.once('error',()=>stop('spawn_failed'));child.stdin.on('error',()=>{if(!closing)stop('stdin_failed');});
   child.stdout.on('error',()=>stop('stdout_failed'));child.stderr.on('error',()=>stop('stderr_failed'));
   child.stdout.on('data',chunk=>{
    if(failure)return;
    try{
     bytes+=chunk.byteLength;if(bytes>262144)throw Error('stdout_limit');
     pending+=decoder.decode(chunk,{stream:true});let end;
     while((end=pending.indexOf('\n'))>=0){const line=pending.slice(0,end);pending=pending.slice(end+1);if(!line.trim())continue;if(++frames>64||Buffer.byteLength(line)>65536)throw Error('stdout_limit');frame(JSON.parse(line));}
     if(Buffer.byteLength(pending)>65536)throw Error('stdout_limit');
    }catch(error){stop(['rpc_shape_invalid','unexpected_server_request','rpc_rejected','initialize_mismatch','configuration_mismatch','thread_mismatch','unexpected_rpc_reply','unexpected_notification','stdout_limit','configuration_warning_observed'].includes(error.message)?error.message:'stdout_invalid');}
   });
   child.stderr.on('data',chunk=>{try{const labels=diagnostics.push(chunk);if(labels.some(label=>['sandbox_executable_lookup_failed','unrecognized_configuration','unclassified_startup_error'].includes(label)))stop('startup_error_observed');}catch{stop('stderr_invalid');}});
   // An escaped descendant may keep inherited pipe descriptors open after its owner exits.
   // Close only our pipe handles; do not claim descendant termination.
   child.once('exit',()=>{child.stdin.destroy();child.stdout.destroy();child.stderr.destroy();});
   child.once('close',()=>{
    clearTimeout(timer);signal?.removeEventListener('abort',abort);report.ownedProcessClosed=report.processStarted;
    try{pending+=decoder.decode();if(pending.trim())failure??='stdout_incomplete';report.startupDiagnostics=diagnostics.finish();if(report.startupDiagnostics.labels.some(label=>['sandbox_executable_lookup_failed','unrecognized_configuration','unclassified_startup_error'].includes(label)))failure??='startup_error_observed';}catch{failure??='diagnostic_incomplete';}
    if(!prepared)failure??='process_exited_before_thread';resolve();
   });
   timer=setTimeout(()=>stop('preparation_timeout'),timeoutMs);
   signal?.addEventListener('abort',abort,{once:true});
   if(signal?.aborted)abort();else send({id:1,method:'initialize',params:{clientInfo:{name:'asteria-nightvoyage',title:'Asteria-Nightvoyage',version:'0.1.0'}}});
  });
 }catch{failure??='metadata_owner_failed';}
 finally{
  if(server){server.closeAllConnections();await new Promise(resolve=>server.close(()=>resolve()));}
  try{fs.rmSync(root,{recursive:true,force:true});report.temporaryCleanupComplete=true;}catch{failure??='temporary_cleanup_failed';}
 }
 report.status=failure==='cancelled'?'cancelled':failure?'blocked':'metadata_prepared';report.reason=failure;
 return report;
}
