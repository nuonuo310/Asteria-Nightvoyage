// Pure closed projection: no raw model metadata, unknown values, instructions or account data returned.
const fail=code=>{throw Error(code);};
const object=v=>v&&[Object.prototype,null].includes(Object.getPrototypeOf(v));
function own(v,k){if(!object(v))fail('catalog_shape_invalid');const d=Object.getOwnPropertyDescriptor(v,k);if(!d)return undefined;if(!Object.hasOwn(d,'value'))fail('catalog_shape_invalid');return d.value;}
const scalar=(v,known)=>v===undefined?'missing':v===null?'null':known.includes(v)?v:'unreviewed';
export function reviewPlanCatalogShape(catalog){
 const models=own(catalog,'models');if(!Array.isArray(models)||models.length>1000)fail('catalog_shape_invalid');
 const selected=[];
 for(let i=0;i<models.length;i++){const d=Object.getOwnPropertyDescriptor(models,String(i));if(!d||!Object.hasOwn(d,'value'))fail('catalog_shape_invalid');if(own(d.value,'slug')==='gpt-5.6-sol')selected.push(d.value);}
 if(selected.length!==1)fail(selected.length?'catalog_selected_duplicate':'catalog_selected_missing');
 const m=selected[0],modalities=own(m,'input_modalities'),tools=own(m,'experimental_supported_tools'),messages=own(m,'model_messages');
 let inputModalities='missing';
 if(modalities!==undefined){if(Array.isArray(modalities)&&modalities.length<=4){const a=[];for(let i=0;i<modalities.length;i++){const d=Object.getOwnPropertyDescriptor(modalities,String(i));if(!d||!Object.hasOwn(d,'value'))fail('catalog_shape_invalid');a.push(d.value);}inputModalities=a.length===1&&a[0]==='text'?'text_only':a.length===2&&new Set(a).size===2&&a.includes('text')&&a.includes('image')?'text_and_image':'unreviewed';}else inputModalities='unreviewed';}
 return {reviewVersion:'selected-plan-catalog-shape-v1',model_id:'gpt-5.6-sol',selectedModelPresent:true,
  visibility:scalar(own(m,'visibility'),['list','hide']),shellType:scalar(own(m,'shell_type'),['unified_exec']),
  patchType:scalar(own(m,'apply_patch_tool_type'),['freeform']),toolMode:scalar(own(m,'tool_mode'),['direct']),inputModalities,
  experimentalTools:tools===undefined?'missing':Array.isArray(tools)&&tools.length===0?'empty':'unreviewed',
  instructions:messages===undefined?'missing':object(messages)&&typeof own(messages,'instructions_template')==='string'?'text_present':'unreviewed',
  rawMetadataReturned:false,inferenceEntitlementVerified:false,nativeCompatibilityVerified:false,productionAdmission:false};
}
export function validPlanCatalogShape(v){
 try{
  const required=['reviewVersion','model_id','selectedModelPresent','visibility','shellType','patchType','toolMode','inputModalities','experimentalTools','instructions','rawMetadataReturned','inferenceEntitlementVerified','nativeCompatibilityVerified','productionAdmission'];
  if(!object(v)||Reflect.ownKeys(v).length!==required.length||required.some(k=>!Object.hasOwn(v,k)))return false;
  const expected={reviewVersion:['selected-plan-catalog-shape-v1'],model_id:['gpt-5.6-sol'],selectedModelPresent:[true],visibility:['list','hide','missing','null','unreviewed'],shellType:['unified_exec','missing','null','unreviewed'],patchType:['freeform','missing','null','unreviewed'],toolMode:['direct','missing','null','unreviewed'],inputModalities:['text_only','text_and_image','missing','unreviewed'],experimentalTools:['missing','empty','unreviewed'],instructions:['missing','text_present','unreviewed']};
  return required.every(k=>(expected[k]??[false]).includes(own(v,k)));
 }catch{return false;}
}
