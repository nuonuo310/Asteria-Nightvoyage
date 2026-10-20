// One independent arithmetic-only call. No caller code, paths, credentials or model output.
export const guardExecFixtureVersion='local-fixed-code-mode-exec-denial-v1';
const callId='nightvoyage-fictional-guard-exec-call';
const warning='Code Mode is unavailable because code-mode host is disabled. Code mode will fail closed; enable `features.code_mode_host` and install `codex-code-mode-host`.';
export function fixedGuardExecSse(){
 if(arguments.length)throw Error('guard_fixture_arguments_invalid');
 const events=[{type:'response.output_item.done',item:{type:'custom_tool_call',call_id:callId,name:'exec',input:'1+1'}},{type:'response.completed',response:{id:'nightvoyage-fictional-guard-response'}}];
 return Buffer.from(events.map(e=>`event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join(''));
}
export function exactGuardWarning(message,threadId){
 if(typeof threadId!=='string'||!/^[A-Za-z0-9_-]{1,200}$/.test(threadId))return false;
 const p=message?.params,keys=message&&typeof message==='object'?Object.keys(message).sort().join(','):'';
 const timestampValid=!Object.hasOwn(message??{},'emittedAtMs')||Number.isSafeInteger(message.emittedAtMs)&&message.emittedAtMs>=0;
 return message?.method==='warning'&&p?.threadId===threadId&&p?.message===warning&&timestampValid&&
  ['method,params','emittedAtMs,method,params'].includes(keys)&&Object.keys(p).sort().join(',')==='message,threadId';
}
export function reviewGuardWarningEnvelope(text,threadId){
 if(typeof text!=='string'||Buffer.byteLength(text)>65536)throw Error('guard_warning_envelope_rejected');
 let m;try{m=JSON.parse(text);}catch{throw Error('guard_warning_envelope_rejected');}
 const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
 const keys=object(m)?Object.keys(m).sort().join(','):'';
 const hasTime=object(m)&&Object.hasOwn(m,'emittedAtMs'),time=hasTime?m.emittedAtMs:undefined;
 const p=object(m?.params)?m.params:null,id=p?.threadId;
 return {reviewVersion:'guard-warning-envelope-diagnostic-v1',
  envelopeShape:keys==='method,params'?'bare':keys==='emittedAtMs,method,params'?'timestamped':'unreviewed',
  timestampShape:hasTime?Number.isSafeInteger(time)&&time>=0?'safe_nonnegative_integer':'invalid':'absent',
  paramsShape:p&&Object.keys(p).sort().join(',')==='message,threadId'?'exact_public_fields':'unreviewed',
  threadBinding:id===undefined?'missing':id===null?'global':id===threadId?'matches':'different',
  expectedMessageMatched:p?.message===warning,
  exactCandidateWarningMatched:exactGuardWarning(m,threadId),
  timestampValueReturned:false,rawMessageReturned:false,identityReturned:false,
  warningAccepted:false,changesAcceptance:false,dispatchEnabled:false,productionAdmission:false};
}
export function reviewGuardExecContinuation(bytes){
 if(!(bytes instanceof Uint8Array)||bytes.byteLength>262144)throw Error('guard_continuation_rejected');
 let b;try{b=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw Error('guard_continuation_rejected');}
 if(b?.model!=='gpt-5.6-sol'||!Array.isArray(b.input)||b.input.length>512)throw Error('guard_continuation_rejected');
 const outputs=b.input.filter(i=>['function_call_output','custom_tool_call_output'].includes(i?.type));
 if(outputs.length!==1||outputs[0].type!=='custom_tool_call_output'||outputs[0].call_id!==callId)throw Error('guard_continuation_rejected');
 const denied=outputs[0].output==='code-mode host is disabled';
 return {reviewVersion:guardExecFixtureVersion,callIdentityChecked:true,
  classification:denied?'selected_exec_disabled_host':'unclassified_tool_output',selectedExecDisabledHostObserved:denied,
  bodyReturned:false,toolArgumentsReturned:false,allHandlerDenialVerified:false,
  dispatchEnabled:false,productionAdmission:false,modelEntitlementVerified:false};
}
