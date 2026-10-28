// Bounded, non-publishing wake diagnostics. Only model content or its parsed
// JSON form is retained; transport envelopes, headers, credentials and errors
// are never serialized here.
import {copy} from '../../../src/store.js';

export const liveDiagnosticVersion='nv-dream-climate-live-r3-diagnostic-v1';
export const liveDiagnosticByteLimit=16384;

const stableSubreasons=Object.freeze({
  invalid_generated_wake_response:'response',
  invalid_generated_wake_fragment:'fragment',
  invalid_generated_wake_associations:'associations',
  invalid_generated_wake_residue:'residue',
  invalid_generated_wake_first_feeling:'firstFeeling',
  generated_wake_fragment_not_grounded:'fragmentGrounding',
  invalid_generated_wake_scene:'scene',
  invalid_generated_wake_before:'before',
  generated_wake_output_too_large:'responseSize',
  provider_empty_or_oversized_content:'responseSize'
});

const codePattern=/^[a-z0-9_]{1,96}$/;
const bytes=value=>Buffer.byteLength(JSON.stringify(value),'utf8');

export function safeErrorCode(error,{timedOut=false}={}){
  if(timedOut)return 'timeout';
  const code=typeof error?.message==='string'?error.message:'';
  return codePattern.test(code)?code:'unclassified_stage_error';
}

export function stableValidationSubreason(errorCode){
  return stableSubreasons[errorCode]??null;
}

function modelContentByteLength(response){
  const content=response?.body?.choices?.[0]?.message?.content;
  return typeof content==='string'?Buffer.byteLength(content,'utf8'):null;
}

function fallbackRecord(base){
  return {...base,responseAvailable:false,contentByteLength:null,
    diagnosticOmission:{reason:'diagnostic_size_limit_exceeded',recordByteLength:bytes(base)}};
}

export function buildStageDiagnostic({
  runId,requestId,stage,errorCode,response,parsed,usageValidation,settlement,
  publication='rejected_non_published',subreason=null,credentialEchoRejected=false,
  version=liveDiagnosticVersion
}){
  const contentByteLength=modelContentByteLength(response);
  const base={version,runId,requestId,stage,
    originalError:safeErrorCode({message:errorCode}),subreason,
    responseAvailable:Boolean(response),contentByteLength,
    usageValidation,settlement,publication,rejected:true,published:false,
    credentialEchoRejected:Boolean(credentialEchoRejected)};
  if(bytes(base)>liveDiagnosticByteLimit)return fallbackRecord(base);
  if(parsed?.data===undefined)return contentByteLength===null?base:{...base,
    diagnosticOmission:{reason:'unparsed_content_not_retained',contentByteLength}};
  let parsedJson;
  try{parsedJson=copy(parsed.data);}catch{return {...base,
    diagnosticOmission:{reason:'parsed_json_not_copyable',contentByteLength}};}
  const candidate={...base,parsedJson};
  if(bytes(candidate)>liveDiagnosticByteLimit)return {...base,
    diagnosticOmission:{reason:'diagnostic_size_limit_exceeded',contentByteLength,
      parsedJsonByteLength:bytes(parsedJson)}};
  return candidate;
}

export function assertBoundedDiagnostic(value){
  if(!value||bytes(value)>liveDiagnosticByteLimit)return false;
  const serialized=JSON.stringify(value);
  return !serialized.includes('Authorization')&&!serialized.includes('Stack')&&
    !serialized.includes('headers');
}
