// New versioned admission wrapper over the reviewed ChatGPT-plan HTTP boundary.
// It adds no endpoint, credential loader, retry, tool or fallback.
import {createMissingTypeHttpTransport,missingTypeHttpProtocolVersion} from './missing-type-plan-http.mjs';
const transports=new WeakSet();
export const planTransportAdmissionHttpVersion='chatgpt-plan-aggregate-admission-v1';
export const isPlanTransportAdmissionHttp=value=>transports.has(value);
const fail=code=>{throw Error(code);};
export function createPlanTransportAdmissionHttpTransport(options){
  if(!options||typeof options!=='object'||![Object.prototype,null].includes(Object.getPrototypeOf(options)))fail('authorization_required');
  const d=Object.getOwnPropertyDescriptors(options),allowed=['session','model','authorize','allowMissingContentType','allowReasoningDiscard','allowAggregateStream'];
  if(Reflect.ownKeys(d).some(k=>!allowed.includes(k)||!('value' in d[k])||!d[k].enumerable)||allowed.some(k=>!d[k]))fail('authorization_required');
  if(d.model.value!=='gpt-5.6-sol'||d.allowMissingContentType.value!==true||d.allowReasoningDiscard.value!==true||d.allowAggregateStream.value!==true)fail('authorization_required');
  const native=createMissingTypeHttpTransport({session:d.session.value,model:d.model.value,authorize:d.authorize.value,allowMissingContentType:true});
  const transport=Object.freeze({
    model:native.model,
    protocolVersion:planTransportAdmissionHttpVersion,
    upstreamProtocolVersion:missingTypeHttpProtocolVersion,
    ready:()=>native.ready(),
    stream:(draft,request,context)=>native.stream(draft,request,context)
  });
  transports.add(transport);return transport;
}
