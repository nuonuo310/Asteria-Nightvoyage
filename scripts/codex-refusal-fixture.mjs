// Independent fictional interaction-call fixture. Never model output or an auth grant.
export const codexRefusalFixtureVersion='local-fixed-interaction-refusal-v1';
const callId='nightvoyage-fictional-refusal-call';
export function fixedInteractionRefusalSse(){
 if(arguments.length)throw Error('refusal_fixture_arguments_invalid');
 const events=[{type:'response.output_item.done',item:{type:'function_call',name:'request_user_input',call_id:callId,arguments:'{"questions":[]}' }},{type:'response.completed',response:{id:'nightvoyage-fictional-refusal-response'}}];
 return Buffer.from(events.map(event=>`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`).join(''));
}
export function reviewInteractionRefusalContinuation(bytes){
 if(!(bytes instanceof Uint8Array)||bytes.byteLength>262144)throw Error('refusal_continuation_rejected');
 let body;try{body=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw Error('refusal_continuation_rejected');}
 if(body?.model!=='gpt-5.6-sol'||!Array.isArray(body.input)||body.input.length>512)throw Error('refusal_continuation_rejected');
 const outputs=body.input.filter(item=>item?.type==='function_call_output'||item?.type==='custom_tool_call_output');
 if(outputs.length!==1||outputs[0].type!=='function_call_output'||outputs[0].call_id!==callId)throw Error('refusal_continuation_rejected');
 const text=outputs[0].output;
 const unsupported=['unsupported call: request_user_input','unsupported call: functions.request_user_input'].includes(text);
 return {reviewVersion:codexRefusalFixtureVersion,classification:unsupported?'selected_call_unsupported':'unclassified_tool_output',
  selectedCallUnsupportedObserved:unsupported,callIdentityChecked:true,bodyReturned:false,toolArgumentsReturned:false,
  nativeHandlerDenialVerified:false,toolExclusionVerified:false,dispatchEnabled:false,modelEntitlementVerified:false,qualityAssessed:false};
}
