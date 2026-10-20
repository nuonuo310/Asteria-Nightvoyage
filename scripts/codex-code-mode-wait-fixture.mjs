// Independent fictional cell only; never a running user cell, exec source or terminate request.
export {exactGuardWarning,reviewGuardWarningEnvelope} from './codex-code-mode-exec-fixture.mjs';
export const guardWaitFixtureVersion='local-fixed-code-mode-wait-denial-v1';
const callId='nightvoyage-fictional-guard-wait-call';
export function fixedGuardWaitSse(){
 if(arguments.length)throw Error('guard_wait_fixture_arguments_invalid');
 const args={cell_id:'nightvoyage-fictional-no-cell',yield_time_ms:1,max_tokens:1,terminate:false};
 const events=[{type:'response.output_item.done',item:{type:'function_call',call_id:callId,name:'wait',arguments:JSON.stringify(args)}},{type:'response.completed',response:{id:'nightvoyage-fictional-guard-wait-response'}}];
 return Buffer.from(events.map(e=>`event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join(''));
}
export function reviewGuardWaitContinuation(bytes){
 if(!(bytes instanceof Uint8Array)||bytes.byteLength>262144)throw Error('guard_wait_continuation_rejected');
 let b;try{b=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw Error('guard_wait_continuation_rejected');}
 if(b?.model!=='gpt-5.6-sol'||!Array.isArray(b.input)||b.input.length>512)throw Error('guard_wait_continuation_rejected');
 const outputs=b.input.filter(i=>['function_call_output','custom_tool_call_output'].includes(i?.type));
 if(outputs.length!==1||outputs[0].type!=='function_call_output'||outputs[0].call_id!==callId)throw Error('guard_wait_continuation_rejected');
 const denied=outputs[0].output==='code-mode host is disabled';
 return {reviewVersion:guardWaitFixtureVersion,callIdentityChecked:true,
  classification:denied?'selected_wait_disabled_host':'unclassified_tool_output',selectedWaitDisabledHostObserved:denied,
  bodyReturned:false,toolArgumentsReturned:false,allHandlerDenialVerified:false,terminatePathVerified:false,
  dispatchEnabled:false,productionAdmission:false,modelEntitlementVerified:false};
}
