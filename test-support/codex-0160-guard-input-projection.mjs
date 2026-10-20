// Release-schema-derived PEER check. This is a scoped projection, not a Rust parser.
import fs from 'node:fs';
const schema=JSON.parse(fs.readFileSync(new URL('./codex-0160-guard-input-projection.json',import.meta.url),'utf8'));
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
export function validateGuardInputProjection(text){
 if(typeof text!=='string'||Buffer.byteLength(text)>1048576)throw Error('guard_input_projection_rejected');
 let c;try{c=JSON.parse(text);}catch{throw Error('guard_input_projection_rejected');}
 if(!object(c)||Object.keys(c).some(k=>!schema.rootAllowedKeys.includes(k)))throw Error('guard_input_projection_rejected');
 const f=c.features;
 if(f!==undefined&&(!object(f)||Object.keys(f).some(k=>!schema.featureAllowedKeys.includes(k))))throw Error('guard_input_projection_rejected');
 const host=f?.code_mode_host;
 if(host!==undefined&&typeof host!=='boolean'&&(!object(host)||Object.keys(host).some(k=>!Object.hasOwn(schema.hostDefinition.properties,k)||typeof host[k]!=='boolean')))throw Error('guard_input_projection_rejected');
 const mode=f?.code_mode;
 if(mode!==undefined&&typeof mode!=='boolean'&&(!object(mode)||Object.keys(mode).some(k=>!schema.codeModeAllowedKeys.includes(k))||Object.hasOwn(mode,'enabled')&&typeof mode.enabled!=='boolean'))throw Error('guard_input_projection_rejected');
 return {projectionVersion:schema.projectionVersion,checked:true,fullRustConfigValidation:false};
}
