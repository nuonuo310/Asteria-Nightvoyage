// Project-owned offline protocol preparation. No fetch, credentials or dispatch.
import {buildInlineRequest} from '../src/inline-evidence-protocol.js';
import {assertAppraisalReviewJsonData} from '../src/appraisal-review-memory.js';
export const chatgptPlanProtocolVersion='chatgpt-plan-inline-preparation-v1';
export const chatgptPlanLimits=Object.freeze({requestBytes:65536,streamBytes:65536,contentBytes:1200,events:128,serverOutputTokenCap:null});
const fail=code=>{throw Error(code);};
const validModel=model=>typeof model==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/.test(model);
export function prepareChatgptPlanRequest(payload,settings){
  assertAppraisalReviewJsonData(settings);
  if(!settings||Object.keys(settings).length!==1||!Object.hasOwn(settings,'model')||!validModel(settings.model))fail('plan_explicit_model_required');
  // Only reuse this project's stage prompt/checkpoints, not its provider or tariff.
  const source=buildInlineRequest(payload,{model:'deepseek-flash',maxOutputTokens:400});
  const instructions=source.body.messages[0].content.replace('same 400-token/1200-JSON-byte cap','same 1200-UTF-8-JSON-byte content ceiling (not a model-token cap)');
  const body={model:settings.model,instructions,input:[{role:'user',content:source.body.messages[1].content}],store:false,stream:true};
  if(Buffer.byteLength(JSON.stringify(body))>chatgptPlanLimits.requestBytes)fail('plan_request_too_large');
  return {protocolVersion:chatgptPlanProtocolVersion,dispatchAuthorized:false,endpoint:'https://api.openai.com/v1/responses',method:'POST',body,limits:{...chatgptPlanLimits}};
}
const integer=n=>Number.isSafeInteger(n)&&n>=0;
function completed(response,model){
  if(!response||response.status!=='completed'||response.model!==model||typeof response.id!=='string'||!response.id||response.id.length>200)fail('plan_incomplete_response');
  if(!Array.isArray(response.output)||response.output.length!==1)fail('plan_output_shape');
  const message=response.output[0];
  if(message?.type!=='message'||message.role!=='assistant'||message.status!=='completed'||!Array.isArray(message.content)||message.content.length!==1||message.content[0]?.type!=='output_text')fail('plan_output_shape');
  const text=message.content[0].text;
  if(typeof text!=='string'||!text.trim()||Buffer.byteLength(text)>chatgptPlanLimits.contentBytes)fail('plan_content_limit');
  let data;try{data=JSON.parse(text);}catch{fail('plan_invalid_json');}
  assertAppraisalReviewJsonData(data);
  if(!data||typeof data!=='object'||Array.isArray(data))fail('plan_invalid_json');
  const u=response.usage;
  if(!u||!integer(u.input_tokens)||!integer(u.output_tokens)||!integer(u.total_tokens)||u.input_tokens+u.output_tokens!==u.total_tokens)fail('plan_invalid_usage');
  return {data,usage:{inputTokens:u.input_tokens,outputTokens:u.output_tokens,totalTokens:u.total_tokens}};
}
// Bounded incremental UTF-8/SSE decoder. Only finish() releases validated data.
// The future transport must separately enforce timeout, cancellation and durable limits.
export class ChatgptPlanStream {
  #decoder=new TextDecoder('utf-8',{fatal:true});#pending='';#bytes=0;#events=0;#result=null;#failed=false;#finished=false;#model;
  constructor(model){if(!validModel(model))fail('plan_explicit_model_required');this.#model=model;}
  push(chunk){
    if(this.#failed||this.#finished)fail('plan_stream_closed');
    try{
      if(!(chunk instanceof Uint8Array))fail('plan_invalid_stream');
      this.#bytes+=chunk.byteLength;if(this.#bytes>chatgptPlanLimits.streamBytes)fail('plan_stream_limit');
      this.#pending+=this.#decoder.decode(chunk,{stream:true});this.#consume();
    }catch(error){this.#failed=true;this.#pending='';this.#result=null;throw Error(/^plan_/.test(error.message)?error.message:'plan_invalid_stream');}
  }
  #consume(){
    // Normalize complete CRLF pairs only; a CR may straddle chunks.
    this.#pending=this.#pending.replaceAll('\r\n','\n');
    let end;while((end=this.#pending.indexOf('\n\n'))>=0){const frame=this.#pending.slice(0,end);this.#pending=this.#pending.slice(end+2);this.#frame(frame);}
  }
  #frame(frame){
    const lines=frame.split('\n');if(lines.every(l=>!l||l.startsWith(':')))return;
    if(++this.#events>chatgptPlanLimits.events||this.#result)fail('plan_invalid_stream');
    const data=lines.filter(l=>l.startsWith('data:')).map(l=>l.slice(5).replace(/^ /,'')).join('\n');
    if(!data)fail('plan_invalid_stream');
    let event;try{event=JSON.parse(data);}catch{fail('plan_invalid_stream');}
    const name=lines.filter(l=>l.startsWith('event:')).map(l=>l.slice(6).trim());
    if(!event||typeof event.type!=='string'||name.length>1||(name.length&&name[0]!==event.type))fail('plan_invalid_stream');
    if(event.type==='response.completed'){this.#result=completed(event.response,this.#model);return;}
    if(['error','response.failed','response.incomplete'].includes(event.type))fail('plan_incomplete_response');
    // Never execute or return a tool, refusal, reasoning or partial text event.
    if(event.type==='response.output_item.added'||event.type==='response.output_item.done'){
      if(event.item?.type!=='message'||event.item.role!=='assistant')fail('plan_output_shape');
    }else if(event.type==='response.content_part.added'||event.type==='response.content_part.done'){
      if(event.part?.type!=='output_text')fail('plan_output_shape');
    }else if(!['response.created','response.in_progress','response.output_text.delta','response.output_text.done'].includes(event.type))fail('plan_output_shape');
  }
  finish(){
    if(this.#failed||this.#finished)fail('plan_stream_closed');this.#finished=true;
    try{
      this.#pending+=this.#decoder.decode();this.#consume();
      if(this.#pending.trim()||!this.#result)fail('plan_incomplete_response');
      const result=this.#result;this.#result=null;return result;
    }catch(error){this.#failed=true;this.#result=null;throw Error(/^plan_/.test(error.message)?error.message:'plan_invalid_stream');}
    finally{this.#pending='';}
  }
}
