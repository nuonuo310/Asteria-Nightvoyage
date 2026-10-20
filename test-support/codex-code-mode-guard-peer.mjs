// Independent invented RPC/config/tool/output peer. It never executes the supplied source.
import readline from 'node:readline';
import fs from 'node:fs';
import {validateGuardInputProjection} from './codex-0160-guard-input-projection.mjs';
const scenario=process.argv[2],args=process.argv.slice(3);
const config={features:{shell_tool:false,apps:false,multi_agent:false,hooks:false,memories:false,goals:false,code_mode:{enabled:false}},apps:{_default:{enabled:false}},mcp_servers:{},web_search:'disabled',approval_policy:'never',sandbox_mode:'read-only'};
for(let i=0;i<args.length;i++)if(args[i]==='-c'){
 const text=args[++i],at=text.indexOf('='),keys=text.slice(0,at).split('.');let o=config;
 for(const k of keys.slice(0,-1))o=o[k]??={};o[keys.at(-1)]=JSON.parse(text.slice(at+1));
}
if(scenario==='legacy_invalid_root')config.code_mode={disable_in_process_fallback:false};
try{validateGuardInputProjection(JSON.stringify(config));}catch{fs.writeSync(2,'Unrecognized configuration setting: independent rejected guard projection\n');process.exit(57);}
if(['OPENAI_API_KEY','ACCESS_TOKEN','NODE_OPTIONS','NODE_PATH','HTTPS_PROXY','NIGHTVOYAGE_DEEPSEEK_KEY'].some(k=>process.env[k]))process.exit(51);
const write=x=>process.stdout.write(JSON.stringify(x)+'\n');
const warning=()=>({method:'warning',params:{threadId:scenario==='foreign_warning'?'fictional-other-thread':'fictional-guard-thread-1',message:scenario==='unknown_warning'?'FICTIONAL-PRIVATE-WARNING':'Code Mode is unavailable because code-mode host is disabled. Code mode will fail closed; enable `features.code_mode_host` and install `codex-code-mode-host`.'}});
const thread='fictional-guard-thread-1',turn='fictional-guard-turn';
let phase='initialize';
readline.createInterface({input:process.stdin}).on('line',async line=>{
 const m=JSON.parse(line);if(m.method.startsWith('account/'))process.exit(52);
 if(m.method==='initialize'&&phase==='initialize'){
  if(m.params.capabilities?.experimentalApi!==true||JSON.stringify(m.params.capabilities.optOutNotificationMethods)!=='["account/rateLimits/updated"]')process.exit(53);
  write({id:1,result:{codexHome:process.env.CODEX_HOME,platformFamily:'fictional',platformOs:'fictional',userAgent:'independent-guard-peer'}});phase='initialized';
 }else if(m.method==='initialized'&&phase==='initialized')phase='config';
 else if(m.method==='config/read'&&phase==='config'){
  if(scenario==='host_enabled')config.features.code_mode_host.enabled=true;
  if(scenario==='fallback_enabled')config.features.code_mode_host.disable_in_process_fallback=true;
  if(scenario==='missing_guard')delete config.features.code_mode_host;
  if(scenario==='catalog_body_changed')fs.writeFileSync(config.model_catalog_json,'independent changed fixture');
  if(scenario==='early_post'){try{await fetch(config.model_providers.nightvoyage_metadata_fixture.base_url+'/responses',{method:'POST'});}catch{}return;}
  write({id:2,result:{config}});phase='thread';
 }else if(m.method==='thread/start'&&phase==='thread'){
  if(scenario==='stall_thread')return;
  write({id:3,result:{model:config.model,modelProvider:scenario==='wrong_provider'?'fictional-other':config.model_provider,approvalPolicy:'never',sandbox:{type:'readOnly'},thread:{id:thread,ephemeral:true}}});phase='turn';
 }else if(m.method==='turn/start'&&phase==='turn'){
  if(m.params.threadId!==thread||!Array.isArray(m.params.environments)||m.params.environments.length!==0)process.exit(54);
  if(scenario==='server_request'){write({id:77,method:'item/commandExecution/requestApproval',params:{}});return;}
  write({id:4,result:{turn:{id:turn,status:'inProgress'}}});
  write({method:'turn/started',params:{threadId:thread,turn:{id:turn}}});
  if(!['no_warning','warning_after_request'].includes(scenario))write(warning());if(scenario==='duplicate_warning')write(warning());
  const tools=[{type:'custom',name:'exec',format:{type:'grammar',syntax:'lark',definition:'start: /.+/'}},{type:'function',name:'wait',parameters:{type:'object',properties:{cell_id:{type:'string'}},required:['cell_id'],additionalProperties:false}}];
  if(scenario==='unknown_tools')tools[0].name='FICTIONAL-PRIVATE-TOOL';
  const b={model:config.model,input:[],tools};if(scenario==='missing_tools')delete b.tools;
  const url=config.model_providers.nightvoyage_metadata_fixture.base_url+(scenario==='wrong_path'?'/other':'/responses'),headers={'Content-Type':'application/json'};
  if(scenario==='auth_header')headers.Authorization='Bearer FICTIONAL-PRIVATE-KEY';
  if(scenario==='encoded_body')headers['Content-Encoding']='gzip';
  try{
   const serialized=scenario==='malformed_body'?'{':scenario==='oversized_body'?'x'.repeat(262145):JSON.stringify(b);
   if(scenario==='duplicate_initial'){await Promise.all([fetch(url,{method:'POST',headers,body:serialized}),fetch(url,{method:'POST',headers,body:serialized})]);return;}
   const pending=fetch(url,{method:'POST',headers,body:serialized});
   if(scenario==='warning_after_request')setTimeout(()=>write(warning()),50);
   const first=await pending,text=await first.text();
   const events=text.split('\n').filter(l=>l.startsWith('data: ')).map(l=>JSON.parse(l.slice(6))),item=events.find(e=>e.type==='response.output_item.done')?.item;
   if(item?.type!=='custom_tool_call'||item.name!=='exec'||item.input!=='1+1'||item.call_id!=='nightvoyage-fictional-guard-exec-call')process.exit(55);
   if(scenario==='stall_after_call')return;
   if(scenario==='stderr_error'){process.stderr.write('ERROR FICTIONAL-PRIVATE-EXECUTION-ERROR\n');return;}
   const output={type:scenario==='wrong_kind'?'function_call_output':'custom_tool_call_output',call_id:scenario==='wrong_call'?'fictional-other-call':item.call_id,output:scenario==='wrong_output'?'2':'code-mode host is disabled'};
   if(scenario==='second_unknown_tools')b.tools.push({type:'function',name:'FICTIONAL-PRIVATE-NEW-TOOL',parameters:{}});
   const next=JSON.stringify({...b,input:scenario==='duplicate_output'?[output,output]:[output]});
   if(scenario==='third_post')await Promise.all([fetch(url,{method:'POST',headers,body:next}),fetch(url,{method:'POST',headers,body:next})]);
   else await fetch(url,{method:'POST',headers,body:next});
  }catch{}
 }else process.exit(56);
});
