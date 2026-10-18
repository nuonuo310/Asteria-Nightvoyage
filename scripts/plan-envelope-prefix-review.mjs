// Offline-only prefix labels. A truncated prefix cannot prove a complete protocol.
const limit=8192;
export function planEnvelopePrefixReview(bytes){
 const out={reviewVersion:'offline-plan-envelope-prefix-v1',prefixShape:'unknown',inspectedByteLimit:limit,bodyReturned:false,completeBodyValidated:false,inferenceAccepted:false,dispatchEnabled:false,usage:'unknown',qualityAssessed:false};
 if(!(bytes instanceof Uint8Array)){out.prefixShape='invalid_input';return out;}
 // Copy only the bounded prefix. Streaming decode tolerates a final split UTF-8
 // code point, while still rejecting malformed bytes inside the inspected prefix.
 let text;try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(0,limit),{stream:true});}catch{out.prefixShape='invalid_utf8';return out;}
 const start=text.trimStart();
 if(!start){out.prefixShape='empty_prefix';return out;}
 if(/^<(?:!doctype\s+html|html)(?:\s|>)/i.test(start))out.prefixShape='html_like_prefix';
 else if(/^(?:event:|data:|:)/.test(start))out.prefixShape='sse_like_prefix';
 else if(start.startsWith('{')||start.startsWith('['))out.prefixShape='json_like_prefix';
 else out.prefixShape='unrecognized_prefix';
 return out;
}
