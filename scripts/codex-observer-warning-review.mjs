// Diagnostic text-pattern review only. No warning can authorize continuation.
export function reviewObserverWarning(message,threadBinding){
 const binding=['matches','global','missing','different'].includes(threadBinding)?threadBinding:'unknown';
 const result={reviewVersion:'codex-observer-warning-pattern-v1',threadBinding:binding,
  warningClass:'unclassified',messageShape:'not_string',patternProvesRootCause:false,
  rawMessageReturned:false,warningAccepted:false,dispatchEnabled:false};
 if(typeof message!=='string')return result;
 if(Buffer.byteLength(message,'utf8')>4096)return {...result,messageShape:'over_limit'};
 result.messageShape='bounded_string';
 if(message.startsWith('Model metadata for `gpt-5.6-sol` not found.')&&message.includes('fallback metadata'))result.warningClass='requested_model_metadata_fallback_pattern';
 return result;
}
