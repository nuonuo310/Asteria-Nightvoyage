// Versioned low-level component, not an end-user approval or runnable trial entry.
// Reuse the pinned public HTTP transport; this wrapper only brands a new protocol.
import {createMissingTypeHttpTransport} from './missing-type-plan-http.mjs';
const transports=new WeakSet();
export const envelopeHttpProtocolVersion='chatgpt-plan-reasoning-envelope-http-v1';
export const isEnvelopeHttpTransport=value=>transports.has(value);
export function createEnvelopeHttpTransport(options){
 if(!options||typeof options!=='object'||![Object.prototype,null].includes(Object.getPrototypeOf(options)))throw Error('authorization_required');
 const d=Object.getOwnPropertyDescriptors(options),allowed=['session','model','authorize','allowMissingContentType','allowReasoningDiscard'];
 if(Reflect.ownKeys(d).some(k=>!allowed.includes(k)||!('value' in d[k])||!d[k].enumerable)||allowed.some(k=>!d[k]))throw Error('authorization_required');
 if(d.allowReasoningDiscard.value!==true||d.allowMissingContentType.value!==true)throw Error('authorization_required');
 const native=createMissingTypeHttpTransport({session:d.session.value,model:d.model.value,authorize:d.authorize.value,allowMissingContentType:true});
 const transport=Object.freeze({model:native.model,protocolVersion:envelopeHttpProtocolVersion,ready:()=>native.ready(),stream:(draft,request,context)=>native.stream(draft,request,context)});
 transports.add(transport);return transport;
}
