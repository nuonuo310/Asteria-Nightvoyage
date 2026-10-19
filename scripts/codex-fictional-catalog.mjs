// Independent fictional protocol data, never a real model capability catalogue.
const catalog={models:[{
 slug:'gpt-5.6-sol',display_name:'Nightvoyage fictional transport fixture',
 description:'Synthetic protocol metadata only; not GPT capability or subscription evidence.',
 supported_reasoning_levels:[],default_reasoning_level:null,
 shell_type:'unified_exec',visibility:'hide',supported_in_api:false,priority:0,
 availability_nux:null,upgrade:null,
 model_messages:{instructions_template:'This is an independent fictional transport observation. The local server returns only an error; no dream or real person is represented.'},
 support_verbosity:false,default_verbosity:null,apply_patch_tool_type:'freeform',
 truncation_policy:{mode:'bytes',limit:8192},context_window:16000,
 experimental_supported_tools:[],input_modalities:['text','image'],tool_mode:'direct',
 include_skills_usage_instructions:false,include_plugin_usage_instructions:false,
 include_apps_usage_instructions:false,supports_reasoning_summary_parameter:false
}]};
export function fictionalCodexCatalog(){return structuredClone(catalog);}
export const fictionalCodexCatalogVersion='independent-local-codex-catalog-v1';
