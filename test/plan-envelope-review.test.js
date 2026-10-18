import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {planEnvelopeReview} from '../scripts/plan-envelope-review.mjs';
const bytes=value=>Buffer.from(typeof value==='string'?value:JSON.stringify(value));
test('offline envelope review distinguishes HTTP200 nonstream bodies without accepting inference or returning content',()=>{
 const cases=[['application/json',bytes({object:'response',output:[{text:'PRIVATE-GENERATED-BODY'}]}),'json','json_response'],['text/html',bytes('<!doctype html><html>PRIVATE-HTML</html>'),'html','html_like'],['text/plain',bytes('PRIVATE-TEXT'),'plain','unparsed_text'],[null,undefined,'missing','not_read'],['text/event-stream; charset=utf-8',bytes('event: response.completed\ndata: {}\n\n'),'event_stream','sse_like']];
 for(const [contentType,body,media,shape]of cases){const out=planEnvelopeReview({httpStatus:200,contentType,body});assert.equal(out.httpStatus,200);assert.equal(out.mediaClass,media);assert.equal(out.bodyShape,shape);assert.equal(out.inferenceAccepted,false);assert.equal(out.dispatchEnabled,false);assert.equal(out.bodyReturned,false);assert.equal(out.usage,'unknown');assert.equal(JSON.stringify(out).includes('PRIVATE'),false);}
});
test('only exact documented error and parameter vocabulary survives; messages, detail, IDs and arbitrary text do not',()=>{
 const out=planEnvelopeReview({httpStatus:403,contentType:'application/json',body:bytes({error:{code:'subscription_sharing_route_not_supported',param:'model',message:'PRIVATE-MESSAGE'},request_id:'PRIVATE-ID'})});assert.equal(out.errorCode,'subscription_sharing_route_not_supported');assert.equal(out.errorParam,'model');assert.equal(out.bodyShape,'json_error');assert.equal(JSON.stringify(out).includes('PRIVATE'),false);
 for(const value of [{error:{code:'PRIVATE-CODE',param:'PRIVATE-PARAM',message:'PRIVATE'}},{detail:'PRIVATE-DETAIL'},{error:{code:'subscription_sharing_route_not_supported EXTRA',param:'model EXTRA'}}]){const r=planEnvelopeReview({httpStatus:200,contentType:'application/json',body:bytes(value)});assert.equal(JSON.stringify(r).includes('PRIVATE'),false);assert.equal(JSON.stringify(r).includes('EXTRA'),false);}
 assert.equal(planEnvelopeReview({body:bytes({detail:{error:{code:'subscription_sharing_invalid_user'}}})}).errorCode,null);
});
test('byte, UTF8, MIME and status boundaries remain fixed and never sniff a body into successful SSE',()=>{
 const cases=[[new Uint8Array(8193),'over_limit'],[new Uint8Array([255]),'invalid_utf8'],[bytes(''),'empty'],[bytes('[]'),'json_nonobject'],[bytes('{'),'unparsed_text'],['PRIVATE-NOT-BYTES','invalid_input']];for(const [body,shape]of cases)assert.equal(planEnvelopeReview({body}).bodyShape,shape);
 for(const contentType of ['__proto__','constructor','toString','PRIVATE-MEDIA','text/event-streamx','text/event-stream\nPRIVATE','application/json'.repeat(100)]){const out=planEnvelopeReview({httpStatus:999,contentType,body:bytes('data: {}\n\n')});assert.equal(out.mediaClass,'other');assert.equal(out.httpStatus,null);assert.equal(out.inferenceAccepted,false);assert.equal(JSON.stringify(out).includes('PRIVATE'),false);}
});
test('parsed object special keys are data and output is detached fixed metadata only',()=>{
 const body=bytes('{"__proto__":{"polluted":"PRIVATE"},"error":{"code":"subscription_sharing_usage_limit_exceeded","param":null}}'),out=planEnvelopeReview({body});assert.equal(out.errorCode,'subscription_sharing_usage_limit_exceeded');assert.equal({}.polluted,undefined);out.errorCode='PRIVATE';assert.equal(planEnvelopeReview({body}).errorCode,'subscription_sharing_usage_limit_exceeded');
});
test('review module has no network, account, Store, execution or production transport dependency',()=>{
 const source=fs.readFileSync(new URL('../scripts/plan-envelope-review.mjs',import.meta.url),'utf8');assert.equal(/^import\s/m.test(source),false);assert.equal(/\bfetch\s*\(|child_process|createPlanHttpTransport|planSessionCredential/.test(source),false);
});
