// A metadata review, never an inference grant or proof of the emitted tool set.
export const codexIsolationReviewVersion='codex-config-observation-v1';
const featureNames=Object.freeze(['shell_tool','apps','multi_agent','hooks','memories','goals']);
export function codexIsolationOverrides(){
 return [...featureNames.map(name=>`features.${name}=false`),'features.code_mode.enabled=false','apps._default.enabled=false','web_search="disabled"','approval_policy="never"','sandbox_mode="read-only"'];
}
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const own=(value,key)=>object(value)&&Object.hasOwn(value,key)?value[key]:undefined;
const state=(value,expected)=>value===expected?'matched':value===undefined?'unknown':'different';
export function reviewCodexConfigReply(text){
 if(typeof text!=='string'||Buffer.byteLength(text,'utf8')>65536)throw Error('codex_config_review_rejected');
 let reply;
 try{reply=JSON.parse(text);}catch{throw Error('codex_config_review_rejected');}
 const result=own(reply,'result'),config=own(result,'config');
 if(!object(reply)||reply.id!==2||Object.hasOwn(reply,'error')||!object(config))throw Error('codex_config_review_rejected');
 const features=own(config,'features'),apps=own(config,'apps'),mcp=own(config,'mcp_servers');
 const controls={};
 for(const name of featureNames)controls[name]=state(own(features,name),false);
 controls.code_mode=state(own(own(features,'code_mode'),'enabled'),false);
 controls.apps_default=state(own(own(apps,'_default'),'enabled'),false);
 controls.app_overrides=apps===undefined?'unknown':object(apps)&&Object.keys(apps).every(key=>key==='_default')?'matched':'different';
 controls.mcp_servers=mcp===undefined?'unknown':object(mcp)&&Object.keys(mcp).length===0?'matched':'different';
 controls.web_search=state(own(config,'web_search'),'disabled');
 controls.approval_policy=state(own(config,'approval_policy'),'never');
 controls.sandbox_mode=state(own(config,'sandbox_mode'),'read-only');
 return {reviewVersion:codexIsolationReviewVersion,status:'configuration_observed',controls,
  configuredControlsMatched:Object.values(controls).every(value=>value==='matched'),
  toolExclusionVerified:false,dispatchEnabled:false,rawMetadataReturned:false,
  modelEntitlementVerified:false,qualityAssessed:false};
}
