import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareChatgptPlanRequest,ChatgptPlanStream,chatgptPlanLimits} from '../scripts/chatgpt-plan-protocol.mjs';
import {inlineSeed,inlineResponse} from '../test-support/inline-runtime-fixtures.js';
import {normalizeInlineStage} from '../src/inline-evidence-protocol.js';
const model='synthetic-plan-model';
const payload=()=>({snapshot:inlineSeed(),scenes:[],stage:'scene',index:0});
const frame=e=>`event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`;
const completion=(data={fragment:'虚构残片'},changes={})=>({type:'response.completed',response:{id:'synthetic-response',model,status:'completed',output:[{type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:JSON.stringify(data)}]}],usage:{input_tokens:100,output_tokens:80,total_tokens:180},...changes}});
function decode(text,step=7){const stream=new ChatgptPlanStream(model),bytes=Buffer.from(text);for(let i=0;i<bytes.length;i+=step)stream.push(bytes.subarray(i,i+step));return stream.finish();}

test('plan preparation whitelists the official HTTP shape without credentials, dispatch or a fake token guarantee',()=>{
  const input=payload(),saved=structuredClone(input),r=prepareChatgptPlanRequest(input,{model});
  assert.deepEqual(input,saved);assert.equal(r.dispatchAuthorized,false);assert.equal(r.endpoint,'https://api.openai.com/v1/responses');
  assert.deepEqual(Object.keys(r.body),['model','instructions','input','store','stream']);assert.equal(r.body.store,false);assert.equal(r.body.stream,true);
  assert.deepEqual(Object.keys(r.body.input[0]),['role','content']);assert.equal(r.body.input[0].role,'user');
  assert.ok(!r.body.instructions.includes('400-token'));assert.match(r.body.instructions,/not a model-token cap/);assert.equal(r.limits.serverOutputTokenCap,null);
  assert.equal(JSON.parse(r.body.input[0].content).isRealityFact,false);assert.ok(input.snapshot.sources.every(s=>s.grant.modelEgress===false));
  r.body.model='mutated';assert.equal(prepareChatgptPlanRequest(input,{model}).body.model,model);
});

test('settings, real materials, getters, invalid checkpoints and stages cannot expand the draft contract',()=>{
  for(const settings of [{},{model:''},{model:'bad/url'},{model,apiKey:'not-allowed'},{model,tools:[]}])assert.throws(()=>prepareChatgptPlanRequest(payload(),settings));
  let touched=false;assert.throws(()=>prepareChatgptPlanRequest(payload(),{get model(){touched=true;return model;}}));assert.equal(touched,false);
  const real=payload();real.snapshot.materialKind='real';assert.throws(()=>prepareChatgptPlanRequest(real,{model}));
  for(const change of [{stage:'tool'},{stage:'wake',index:0},{index:2},{scenes:[{event:'forged'}],index:1}])assert.throws(()=>prepareChatgptPlanRequest({...payload(),...change},{model}));
  const big=payload();big.snapshot.sources[0].text='字'.repeat(20000);big.snapshot.sources.push({...structuredClone(big.snapshot.sources[0]),id:'another-fictional-source'});big.snapshot.channels.memory.sourceIds.push('another-fictional-source');assert.throws(()=>prepareChatgptPlanRequest(big,{model}));
});

test('split multibyte UTF-8 and CRLF SSE release only a completed object and normalized actual usage',()=>{
  const e=completion({fragment:'灯影落在空碗里'});e.response.usage={input_tokens:100,output_tokens:601,total_tokens:701,private_detail:'NOT-RETURNED'};
  const data=frame({type:'response.output_text.delta',delta:'not published'})+frame(e);
  const result=decode(data.replaceAll('\n','\r\n'),1);assert.deepEqual(result,{data:{fragment:'灯影落在空碗里'},usage:{inputTokens:100,outputTokens:601,totalTokens:701}});
  const stream=new ChatgptPlanStream(model);assert.equal(stream.push(Buffer.from(frame(e))),undefined);assert.deepEqual(stream.finish(),result);assert.throws(()=>stream.finish(),/closed/);assert.throws(()=>stream.push(Buffer.from('x')),/closed/);
});

test('failed, incomplete, refusal, tools, reasoning and unknown events never publish partial bodies',()=>{
  for(const e of [{type:'response.failed',response:{error:{message:'PRIVATE-SENTINEL'}}},{type:'response.incomplete'},{type:'error',message:'PRIVATE-SENTINEL'},{type:'response.refusal.delta',delta:'PRIVATE-SENTINEL'},{type:'response.output_item.added',item:{type:'function_call',arguments:'PRIVATE-SENTINEL'}},{type:'response.output_item.done',item:{type:'reasoning'}},{type:'unknown.private',text:'PRIVATE-SENTINEL'}]){
    assert.throws(()=>decode(frame(e)+frame(completion())),error=>/^plan_/.test(error.message)&&!error.message.includes('PRIVATE-SENTINEL'));
  }
  assert.throws(()=>decode(frame({type:'response.output_text.delta',delta:'unfinished'})),/incomplete/);
});

test('stream bounds, invalid UTF-8, malformed JSON and trailing events permanently close the decoder',()=>{
  for(const text of ['data: [DONE]\n\n','event: other\ndata: {"type":"response.completed"}\n\n',frame(completion())+frame(completion()),frame(completion())+'trailing',frame(completion()).trimEnd(),frame({type:'response.in_progress'}).repeat(chatgptPlanLimits.events+1)])assert.throws(()=>decode(text));
  for(const chunk of [Buffer.from([0xff]),Buffer.alloc(chatgptPlanLimits.streamBytes+1), 'not bytes']){
    const stream=new ChatgptPlanStream(model);assert.throws(()=>stream.push(chunk));assert.throws(()=>stream.finish(),/closed/);
  }
  const truncated=new ChatgptPlanStream(model);truncated.push(Buffer.from([0xe4]));assert.throws(()=>truncated.finish(),/invalid_stream/);
});

test('completed shape and usage are checked; arbitrary provider metadata and errors are not returned',()=>{
  for(const changes of [{status:'incomplete'},{model:'other'},{output:[]},{output:[{type:'function_call'}]},{usage:{input_tokens:1,output_tokens:1,total_tokens:3}},{usage:null},{usage:{input_tokens:-1,output_tokens:2,total_tokens:1}}])assert.throws(()=>decode(frame(completion({},changes))));
  for(const text of ['not JSON','[]','null',JSON.stringify({text:'字'.repeat(500)})]){
    const e=completion();e.response.output[0].content[0].text=text;assert.throws(()=>decode(frame(e)));
  }
  const e=completion();e.response.secretMetadata='PRIVATE-SENTINEL';assert.ok(!JSON.stringify(decode(frame(e))).includes('PRIVATE-SENTINEL'));
});

test('three scripted Responses stages retain project-owned inline evidence and extractive wake validation',()=>{
  const p=payload(),scenes=[];let calls=0;
  for(const stage of ['scene','scene','wake']){
    const request=prepareChatgptPlanRequest({...p,stage,scenes,index:scenes.length},{model});
    const material=JSON.parse(request.body.input[0].content);
    const raw=JSON.parse(inlineResponse({body:{messages:[{}, {content:JSON.stringify(material)}]}}).body.choices[0].message.content);
    const result=decode(frame(completion(raw)));calls++;
    const value=normalizeInlineStage(result.data,material);
    if(stage==='scene')scenes.push(value);
    else{assert.equal(value.fragmentBasis.kind,'scene_excerpt');assert.ok(scenes[value.fragmentBasis.sceneIndex].event.includes(value.fragment));assert.throws(()=>normalizeInlineStage({...raw,fragment:'一个新编造的结局'},material),/wake_fragment_not_grounded/);}
  }
  assert.equal(calls,3);assert.equal(scenes.length,2);assert.deepEqual(scenes.map(s=>s.affectDeclaration.kind),['unchanged','estimated']);
});
