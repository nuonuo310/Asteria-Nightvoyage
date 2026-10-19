// Independent fictional peer. It has no provider credentials or model generation.
import readline from 'node:readline';
import fs from 'node:fs';
import {fictionalConfigReply} from './codex-isolation-fixtures.mjs';
const scenario=process.argv[2],args=process.argv.slice(3),config=fictionalConfigReply().result.config;
for(let i=0;i<args.length;i++)if(args[i]==='-c'){
 const value=args[++i],split=value.indexOf('='),keys=value.slice(0,split).split('.');let target=config;
 for(const key of keys.slice(0,-1))target=target[key]??={};
 target[keys.at(-1)]=JSON.parse(value.slice(split+1));
}
if(['OPENAI_API_KEY','ACCESS_TOKEN','NODE_OPTIONS','NODE_PATH','NIGHTVOYAGE_DEEPSEEK_KEY','HTTPS_PROXY'].some(key=>process.env[key]))process.exit(31);
const output=message=>process.stdout.write(JSON.stringify(message)+'\n');
const lines=readline.createInterface({input:process.stdin});let phase='initialize',rateLimitOptOut=false;
lines.on('line',async line=>{
 const message=JSON.parse(line);
 if(message.method.startsWith('account/'))process.exit(32);
 if(message.method==='initialize'&&phase==='initialize'){
  if(config.tools?.experimental_request_user_input?.enabled===false&&message.params.capabilities?.experimentalApi!==true)process.exit(43);
  const optOut=message.params.capabilities?.optOutNotificationMethods;
  if(optOut!==undefined){if(!Array.isArray(optOut)||optOut.length!==1||optOut[0]!=='account/rateLimits/updated')process.exit(45);rateLimitOptOut=true;}
  if(scenario==='early_exit')process.exit(21);
  if(scenario==='invalid_stdout'){process.stdout.write('fictional bad frame\n');return;}
  if(scenario==='lookup_error')process.stderr.write('ERROR Codex could not find bubblewrap on PATH. Fictional fixture.\n');
  output({id:1,result:{codexHome:scenario==='initialize_wrong_home'?'fictional-other-state':process.env.CODEX_HOME,platformFamily:'fictional',platformOs:'fictional',userAgent:'independent-fictional-peer'}});phase='initialized';
 }else if(message.method==='initialized'&&phase==='initialized')phase='config';
 else if(message.method==='config/read'&&phase==='config'){
  if(config.model_catalog_json){
   const catalog=JSON.parse(fs.readFileSync(config.model_catalog_json,'utf8'));
   if(catalog.models?.length!==1||catalog.models[0].slug!=='gpt-5.6-sol'||!catalog.models[0].display_name.includes('fictional')||catalog.models[0].shell_type!=='unified_exec'||catalog.models[0].apply_patch_tool_type!=='freeform')process.exit(41);
   if(scenario==='catalog_body_changed')fs.writeFileSync(config.model_catalog_json,'fictional-changed-catalog');
   if(scenario==='catalog_missing')fs.unlinkSync(config.model_catalog_json);
   if(scenario==='catalog_path_mismatch')config.model_catalog_json='fictional-other-catalog.json';
  }
  if(scenario==='refusal_trace_early'){process.stderr.write('ERROR codex_core::tools::router: error=unsupported call: request_user_input\n');return;}
  if(scenario==='refusal_stderr_before'){process.stderr.write('ERROR codex_core::tools::router: error=unsupported call: request_user_input\n');return;}
  if(scenario==='config_wrong_endpoint')config.model_providers.nightvoyage_metadata_fixture.base_url='http://127.0.0.1:1/v1';
  if(scenario==='early_post'){try{await fetch(config.model_providers.nightvoyage_metadata_fixture.base_url+'/responses',{method:'POST',body:'fictional'});}catch{}return;}
  if(scenario==='environment_controls_omitted')config.tools={};
  if(scenario==='refusal_controls_changed')config.tools.experimental_request_user_input.enabled=true;
  if(scenario==='environment_controls_changed')config.tools.experimental_request_user_input.enabled=true;
  if(scenario==='config_auth_required')config.model_providers.nightvoyage_metadata_fixture.requires_openai_auth=true;
  if(scenario==='config_warning')output({method:'configWarning',params:{summary:'fictional-private-warning'}});
  output({id:2,result:{config,origins:{fictional:'not persisted'}}});phase='thread';
 }else if(message.method==='thread/start'&&phase==='thread'){
  if(scenario==='stall_thread')return;
  if(scenario==='rpc_error'){output({id:3,error:{message:'fictional-private-error'}});return;}
  if(scenario==='server_request'){output({id:20,method:'item/commandExecution/requestApproval',params:{command:'fictional command'}});return;}
  if(scenario==='unexpected_post'){
   try{await fetch(config.model_providers.nightvoyage_metadata_fixture.base_url+'/responses',{method:'POST',body:'fictional forbidden request'});}catch{}
   return;
  }
  if(scenario==='catalog_get'){await fetch(config.model_providers.nightvoyage_metadata_fixture.model_catalog_url);}
  if(scenario==='early_thread_mismatch')output({method:'thread/started',params:{thread:{id:'fictional-other-thread'}}});
  const response={id:3,result:{model:scenario==='wrong_model'?'fictional-other-model':config.model,
   modelProvider:scenario==='wrong_provider'?'fictional-other-provider':config.model_provider,
   approvalPolicy:'never',sandbox:{type:'readOnly'},thread:{id:'fictional-metadata-thread',ephemeral:scenario!=='not_ephemeral'}}};
  output(response);phase='complete';
 }else if(message.method==='turn/start'&&phase==='complete'){
  if(config.tools?.experimental_request_user_input?.enabled===false||scenario==='environment_controls_omitted'){
   if((scenario!=='environment_controls_omitted'&&config.tools?.update_plan?.enabled!==false)||!Array.isArray(message.params.environments)||message.params.environments.length!==0)process.exit(42);
  }
  if(scenario==='refusal_server_request'){output({id:12,method:'item/tool/requestUserInput',params:{fictional:'not returned'}});return;}
  if(scenario==='server_request'){output({id:12,method:'item/commandExecution/requestApproval',params:{command:'fictional-private-command'}});return;}
  if(scenario==='rpc_error'){output({id:4,error:{message:'fictional-private-error'}});return;}
  if(scenario==='tool_notification'){output({method:'item/started',params:{item:{type:'commandExecution',command:'fictional-private-command'}}});return;}
  output({id:4,result:{turn:{id:'fictional-observer-turn',status:'inProgress'}}});
  output({method:'turn/started',params:{threadId:'fictional-metadata-thread',turn:{id:'fictional-observer-turn'}}});
  if(['model_metadata_warning','unclassified_warning','foreign_warning','oversized_warning','missing_warning_message'].includes(scenario)){
   const params={threadId:scenario==='foreign_warning'?'fictional-other-thread':'fictional-metadata-thread',message:scenario==='model_metadata_warning'?'Model metadata for `gpt-5.6-sol` not found. Fictional fallback metadata warning.':scenario==='oversized_warning'?'x'.repeat(4097):'fictional-private-warning'};
   if(scenario==='missing_warning_message')delete params.message;
   output({method:'warning',params});return;
  }
  if(scenario==='warning_notification'){output({method:'windows/worldWritableWarning',params:{fictional:'fictional-private-path'}});return;}
  if(scenario==='outside_notification'){output({method:'fictional/private_sensitive_method',params:{fictional:'fictional-private-path'}});return;}
  if(['lifecycle','foreign_turn','altered_user_item','approval_status','invalid_item_id'].includes(scenario)){
   output({method:'thread/status/changed',params:{threadId:'fictional-metadata-thread',status:{type:'active',activeFlags:scenario==='approval_status'?['waitingOnApproval']:[]}}});
   const params={threadId:'fictional-metadata-thread',turnId:scenario==='foreign_turn'?'fictional-other-turn':'fictional-observer-turn',item:{id:scenario==='invalid_item_id'?'fictional/private-path':'fictional-user-item',type:'userMessage',content:[{type:'text',text:scenario==='altered_user_item'?'fictional-private-altered-prompt':message.params.input[0].text,text_elements:[]}]}};
   output({method:'item/started',params});output({method:'item/completed',params});
  }
  const tool={type:'function',name:scenario==='unknown_tools'?'fictional_private_tool_name':'view_image',parameters:{type:'object'},description:'fictional-private-description'};
  let body={model:scenario==='wrong_model'?'other':config.model,input:'fictional-private-prompt',tools:(['empty_tools','environmentless_tools','environment_controls_omitted'].includes(scenario)||(scenario.startsWith('refusal_')&&scenario!=='refusal_nonempty_tools')||(scenario.startsWith('final_')&&scenario!=='final_nonempty_tools'))?[]:[tool]};
  if(scenario==='missing_tools')delete body.tools;
  const base=config.model_providers.nightvoyage_metadata_fixture.base_url;
  const url=base+(scenario==='wrong_path'?'/other':'/responses');
  const headers={'Content-Type':'application/json'};
  if(scenario==='auth_header')headers.Authorization='Bearer fictional-private-key';
  if(scenario==='encoded_body')headers['Content-Encoding']='gzip';
  if(scenario==='stalled_body'){
   const http=await import('node:http');const req=http.request(url,{method:'POST',headers});req.on('error',()=>{});req.write('{');return;
  }
  const serialized=scenario==='malformed_body'?'{':scenario==='oversized_body'?'x'.repeat(262145):JSON.stringify(body);
  try{
   if(scenario==='duplicate_post')await Promise.all([fetch(url,{method:'POST',headers,body:serialized}),fetch(url,{method:'POST',headers,body:serialized})]);
   else if(scenario.startsWith('final_')){
    const response=await fetch(url,{method:'POST',headers,body:serialized});
    const body=await response.text();
    const fixtureText='{"event":"A fictional blue cup rests on a quiet sill."}';
    if(!body.includes('output_item.done')||!body.includes('fictional-final-message'))process.exit(46);
    if(scenario==='final_stderr'){process.stderr.write('ERROR fictional-private-final-error\n');return;}
    if(scenario==='final_late')await new Promise(resolve=>setTimeout(resolve,600));
    if(scenario==='final_tool_request'){output({id:77,method:'item/tool/requestUserInput',params:{fictional:'fictional-private-tool-value'}});return;}
    const item={id:'fictional-final-message',type:'agentMessage',phase:'final_answer',text:''};
    const params={threadId:'fictional-metadata-thread',turnId:scenario==='final_wrong_turn'?'fictional-other-turn':'fictional-observer-turn',item};
    output({method:'item/started',params});
    output({method:'item/agentMessage/delta',params:{threadId:params.threadId,turnId:params.turnId,itemId:item.id,delta:'fictional-private-partial-text'}});
    item.text=scenario==='final_wrong_text'?'fictional-private-wrong-answer':fixtureText;
    if(scenario==='final_wrong_item')item.id='fictional-other-item';
    output({method:'item/completed',params});
    if(scenario==='final_duplicate_item')output({method:'item/completed',params});
    if(scenario==='final_no_complete')return;
    output({method:'turn/completed',params:{threadId:params.threadId,turn:{id:params.turnId,status:scenario==='final_failed'?'failed':'completed',items:scenario==='final_hidden_tool'?[{id:'fictional-tool',type:'commandExecution'}]:[item]}}});
   }else if(scenario.startsWith('refusal_')){
    const first=await fetch(url,{method:'POST',headers,body:serialized});const text=await first.text();
    if(!text.includes('request_user_input')||!text.includes('nightvoyage-fictional-refusal-call'))process.exit(44);
    if(scenario.startsWith('refusal_trace_')){
     const trace='ERROR codex_core::tools::router: error=unsupported call: '+(scenario==='refusal_trace_wrong_tool'?'view_image':'request_user_input');
     process.stderr.write(trace+(scenario==='refusal_trace_no_linebreak'?'':'\n'));
     if(scenario==='refusal_trace_double'){process.stderr.write(trace+'\n');return;}
     if(scenario==='refusal_trace_unknown_after'){process.stderr.write('ERROR fictional-private-later-error\n');return;}
     if(['refusal_trace_wrong_tool','refusal_trace_no_continuation'].includes(scenario))return;
     await new Promise(resolve=>setTimeout(resolve,30));
     if(!rateLimitOptOut||scenario==='refusal_trace_optout_ignored'){output({method:'account/rateLimits/updated',params:{rateLimits:{fictionalPrivateIdentity:'fictional-private-account-value'}}});return;}
     if(scenario==='refusal_trace_other_account'){output({method:'account/updated',params:{fictionalPrivateIdentity:'fictional-private-account-value'}});return;}
     if(scenario==='refusal_trace_unknown_notification'){output({method:'fictional/privateMethod',params:{fictionalPrivateIdentity:'fictional-private-account-value'}});return;}
    }
    if(scenario==='refusal_stderr_unsupported'){process.stderr.write('ERROR codex_core::tools::router: error=unsupported call: request_user_input\n');return;}
    if(scenario==='refusal_stderr_other'){process.stderr.write('ERROR fictional-private-stderr-token\n');return;}
    if(scenario==='refusal_stderr_no_newline'){process.stderr.write('ERROR codex_core::tools::router: error=unsupported call: request_user_input',()=>process.exit(29));return;}
    if(scenario==='refusal_stall')return;
    if(['refusal_late_body','refusal_trace_late_body'].includes(scenario))await new Promise(resolve=>setTimeout(resolve,600));
    const item={type:'function_call_output',call_id:scenario==='refusal_wrong_call'?'fictional-wrong-call':'nightvoyage-fictional-refusal-call',output:['refusal_other_output','refusal_trace_then_other'].includes(scenario)?'fictional-private-tool-output':'unsupported call: request_user_input'};
    const input=scenario==='refusal_duplicate_output'?[item,item]:[item];
    await fetch(url,{method:'POST',headers,body:JSON.stringify({model:config.model,input})});
   }else await fetch(url,{method:'POST',headers,body:serialized});
  }catch{}
 }else process.exit(33);
});
