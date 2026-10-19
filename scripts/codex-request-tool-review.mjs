// Original bounded metadata classifier. Never returns request bodies or tool schemas.
const names=new Map([
 ['shell','shell'],['shell_command','shell'],['exec_command','shell'],['write_stdin','shell'],
 ['apply_patch','file_edit'],['view_image','file_read'],['update_plan','planning'],
 ['request_user_input','interaction'],['request_user_input_async','interaction'],
 ['send_message_to_user_async','interaction'],['request_permissions','permissions'],
 ['spawn_agent','agents'],['send_input','agents'],['wait','agents'],['close_agent','agents'],
 ['list_agents','agents'],['resume_agent','agents'],['interrupt_agent','agents'],
 ['followup_task','agents'],['send_message','agents'],['wait_agent','agents'],
 ['list_mcp_resources','external_resources'],['list_mcp_resource_templates','external_resources'],
 ['read_mcp_resource','external_resources'],['tool_search','tool_discovery'],
 ['list_available_plugins_to_install','tool_discovery'],['request_plugin_install','tool_discovery'],
 ['get_current_time','utilities'],['sleep','utilities'],['get_context_remaining','utilities'],
 ['new_context_window','utilities']
]);
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const label=x=>typeof x==='string'&&/^[A-Za-z0-9_.-]{1,128}$/.test(x);
export function reviewCodexLocalRequest(bytes){
 if(!(bytes instanceof Uint8Array)||bytes.byteLength>262144)throw Error('codex_request_review_rejected');
 let body;try{body=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw Error('codex_request_review_rejected');}
 if(!object(body)||body.model!=='gpt-5.6-sol')throw Error('codex_request_review_rejected');
 let toolCount=0,unknownToolCount=0,namespaceCount=0,unknownNamespaceCount=0;const classes=new Set(),identities=new Set();
 function walk(tools,depth=0,namespace=''){
  if(!Array.isArray(tools)||tools.length>128||depth>2)throw Error('codex_request_review_rejected');
  for(const tool of tools){
   if(!object(tool)||!label(tool.type))throw Error('codex_request_review_rejected');
   if(tool.type==='namespace'){
    if(!label(tool.name)||++namespaceCount>16)throw Error('codex_request_review_rejected');
    if(namespace+tool.name+'.'!=='functions.')unknownNamespaceCount++;
    walk(tool.tools,depth+1,namespace+tool.name+'.');continue;
   }
   if(++toolCount>128)throw Error('codex_request_review_rejected');
   let category;
   if(tool.type==='function'||tool.type==='custom'){
    if(!label(tool.name)||(tool.type==='function'&&!object(tool.parameters))||(tool.type==='custom'&&!object(tool.format)))throw Error('codex_request_review_rejected');
    const id=namespace+tool.name;if(identities.has(id))throw Error('codex_request_review_rejected');identities.add(id);
    // Unknown namespaces cannot acquire reviewed identity from a familiar leaf name.
    category=(!namespace||namespace==='functions.')?names.get(tool.name):undefined;
   }else if(['web_search','web_search_preview'].includes(tool.type))category='web';
   else if(tool.type==='tool_search')category='tool_discovery';
   if(category)classes.add(category);else unknownToolCount++;
  }
 }
 const toolsFieldPresent=Object.hasOwn(body,'tools');
 if(toolsFieldPresent)walk(body.tools);
 return {reviewVersion:'codex-local-request-tools-v1',modelChecked:true,toolsFieldPresent,
  toolCount,namespaceCount,unknownNamespaceCount,unknownToolCount,toolClasses:[...classes].sort(),
  toolInventoryReviewed:toolsFieldPresent&&unknownToolCount===0&&unknownNamespaceCount===0,
  toolExposureStatus:!toolsFieldPresent?'unknown':toolCount?'tools_declared':namespaceCount?'empty_namespaces':'no_tools_declared',
  toolChoice:body.tool_choice===undefined?'unknown':['none','auto','required'].includes(body.tool_choice)?body.tool_choice:'other',
  requestBodyReturned:false,toolSchemasReturned:false,dispatchEnabled:false,
  toolExclusionVerified:false,handlerDenialVerified:false,modelEntitlementVerified:false,qualityAssessed:false};
}
