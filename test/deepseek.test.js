import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildDeepSeekRequest, parseDeepSeekResponse, normalizeDeepSeekStage, OfflineDeepSeekProvider } from '../src/deepseek-protocol.js';
import { Nightvoyage } from '../src/engine.js';
import { FakeProvider } from '../src/fake-provider.js';
const fixture=JSON.parse(fs.readFileSync(new URL('../fixtures/paper-harbor.json',import.meta.url)));
const settings={model:'deepseek-flash'};
const payload=()=>({stage:'scene',index:0,snapshot:structuredClone(fixture),scenes:[]});
const scene={event:'The fictional paper bridge bends.',appraisal:{goalEffect:-1,control:0.4,uncertainty:0.7},delta:{valence:-0.1,arousal:0.1}};
const response=(data=scene)=>({status:200,body:{model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(data)}}],usage:{prompt_tokens:100,completion_tokens:60,total_tokens:160,prompt_cache_hit_tokens:20,prompt_cache_miss_tokens:80}}});
function setup(t,provider){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-protocol-'));const e=new Nightvoyage(dir,{provider});t.after(()=>{e.close();fs.rmSync(dir,{recursive:true,force:true});});return e;}
test('request enables JSON, caps output, disables streaming/thinking and exposes no tools or credentials',()=>{
 const p=payload();p.privateConfig='DO NOT EXPORT';const r=buildDeepSeekRequest(p,settings);
 assert.equal(r.endpoint,'https://api.deepseek.com/chat/completions');assert.equal(r.body.max_tokens,400);assert.equal(r.body.stream,false);assert.equal(r.body.thinking.type,'disabled');assert.equal(r.body.response_format.type,'json_object');
 assert.equal('tools' in r.body,false);assert.equal('headers' in r,false);assert.ok(r.body.messages[0].content.includes('JSON'));
 const user=JSON.parse(r.body.messages[1].content);assert.equal(user.materialKind,'fictional');assert.equal(user.isRealityFact,false);assert.ok(!JSON.stringify(r).includes(p.privateConfig));
});
test('model choice is explicit, output bound and stages are checked before simulation',()=>{
 assert.throws(()=>buildDeepSeekRequest(payload(),{}),/unreviewed/);
 assert.throws(()=>buildDeepSeekRequest(payload(),{...settings,maxOutputTokens:401}),/invalid_output/);
 assert.throws(()=>buildDeepSeekRequest({...payload(),stage:'tool'},settings),/invalid_protocol/);
 assert.throws(()=>buildDeepSeekRequest({...payload(),stage:'wake'},settings),/invalid_protocol/);
 const p=payload();p.snapshot.materialKind='real';assert.throws(()=>buildDeepSeekRequest(p,settings),/invalid_snapshot/);
});
test('parser returns normalized usage, not provider reasoning or arbitrary metadata',()=>{
 const r=response();r.body.choices[0].message.reasoning_content='UNSAVED REASONING';r.body.extra='UNSAVED EXTRA';const parsed=parseDeepSeekResponse(r,settings);
 assert.deepEqual(parsed.data,scene);assert.deepEqual(parsed.receipt.usage,{inputTokens:100,outputTokens:60,totalTokens:160,cacheHitTokens:20,cacheMissTokens:80});assert.ok(!JSON.stringify(parsed).includes('UNSAVED'));
});
test('empty, invalid JSON, scalar, truncated and tool outputs are rejected without repair calls',()=>{
 for(const content of ['', ' ', '{', '[]', 'null', 'true', 'x'.repeat(1201)]){const r=response();r.body.choices[0].message.content=content;assert.throws(()=>parseDeepSeekResponse(r,settings),/provider_/);}
 for(const finish of ['length','tool_calls','content_filter','aborted','insufficient_system_resource']){const r=response();r.body.choices[0].finish_reason=finish;assert.throws(()=>parseDeepSeekResponse(r,settings),/incomplete/);}
 const r=response();r.body.choices[0].message.tool_calls=[{function:{name:'delete'}}];assert.throws(()=>parseDeepSeekResponse(r,settings),/tools_forbidden/);
});
test('HTTP failures are sanitized and do not return provider error bodies or credentials',()=>{
 for(const status of [401,403,429,500])assert.throws(()=>parseDeepSeekResponse({status,body:{error:'PRIVATE PROVIDER BODY'}},settings),e=>e.message.startsWith('provider_')&&!e.message.includes('PRIVATE'));
});
test('missing, inconsistent, excessive and invalid usage fails closed',()=>{
 for(const usage of [null,{}, {prompt_tokens:100,completion_tokens:401,total_tokens:501},{prompt_tokens:100,completion_tokens:60,total_tokens:999},{prompt_tokens:-1,completion_tokens:60,total_tokens:59},{prompt_tokens:100,completion_tokens:60,total_tokens:160,prompt_cache_hit_tokens:200,prompt_cache_miss_tokens:0}]){const r=response();r.body.usage=usage;assert.throws(()=>parseDeepSeekResponse(r,settings),/invalid_usage/);}
});
test('offline protocol rehearsal traverses the real local engine using only a local simulator',async t=>{
 let calls=0;const fake=new FakeProvider();const provider=new OfflineDeepSeekProvider({...settings,simulator:async request=>{calls++;const material=JSON.parse(request.body.messages[1].content);return response(material.stage==='wake'?{fragment:material.previousScenes.at(-1).event,residue:0.1,associations:[]}:await fake.generate({stage:material.stage,index:material.sceneIndex}));}});
 const e=setup(t,provider),id=e.start('protocol','session',fixture);assert.equal((await e.execute(id)).status,'completed');assert.equal(calls,3);assert.equal(e.result(id).dream.isRealityFact,false);assert.deepEqual(e.result(id).associations,[]);assert.equal(e.recall('lantern','cue')[0].origin,'dream');
});
test('bad provider shape consumes one engine attempt and never triggers implicit repair or retry',async t=>{
 let calls=0;const provider=new OfflineDeepSeekProvider({...settings,simulator:async()=>{calls++;const r=response();r.body.choices[0].message.content='{';return r;}});
 const e=setup(t,provider),id=e.start('r','s',fixture);assert.equal((await e.execute(id)).status,'failed');assert.equal(calls,1);assert.equal(e.result(id).dream,null);
});
test('offline cancellation reaches the simulator and suppresses late protocol output',async t=>{
 let mark,deliver,signal;const started=new Promise(resolve=>mark=resolve);
 const provider=new OfflineDeepSeekProvider({...settings,simulator:(_,{signal:s})=>{signal=s;mark();return new Promise(resolve=>deliver=resolve);}});
 const e=setup(t,provider),id=e.start('r','s',fixture),work=e.execute(id);await started;e.cancel(id);assert.equal((await work).status,'cancelled');assert.equal(signal.aborted,true);deliver(response());await new Promise(resolve=>setImmediate(resolve));assert.equal(e.result(id).dream,null);
});
test('offline provider cannot load credentials or send anything without a supplied simulator',()=>{
 assert.throws(()=>new OfflineDeepSeekProvider(settings),/offline_simulator_required/);
 assert.throws(()=>new Nightvoyage('unused',{provider:{generate(){throw new Error('not allowed');}}}),/real_provider_not_authorized/);
});

test('wake excerpts are grounded in saved scenes with program-owned evidence',()=>{
 const material={stage:'wake',previousScenes:[{event:'梦里的人停在蓝色的门边。'},{event:'门没有打开，灯还亮着。'}]};
 const frozen=structuredClone(material);
 const out=normalizeDeepSeekStage({fragment:'灯还亮着',residue:0.2,associations:['这扇门让我想到什么？'],fragmentBasis:{kind:'provider_claim',sceneIndex:99}},material);
 assert.equal(out.fragment,'灯还亮着');assert.deepEqual(out.fragmentBasis,{kind:'scene_excerpt',sceneIndex:1});assert.deepEqual(material,frozen);assert.equal(out.residue,0.2);assert.equal(out.associations.length,1);
});
test('wake paraphrases, invented aftermath and joined excerpts are rejected without trimming or seed fallback',()=>{
 const material={stage:'wake',previousScenes:[{event:'A blue bell stayed silent.'},{event:'A window remained closed.'}],sources:[{text:'The door opened.'}]};
 for(const fragment of ['The door opened.','The window opened.','A blue bell A window','Afterward the bell rang.',' A blue bell stayed silent. ',' ']){
  assert.throws(()=>normalizeDeepSeekStage({fragment,residue:0.1,associations:[],fragmentBasis:{kind:'scene_excerpt',sceneIndex:0}},material),/wake_fragment_not_grounded/);
 }
});
test('offline provider also refuses novel wake events with no repair request',async t=>{
 let calls=0;const fake=new FakeProvider();const provider=new OfflineDeepSeekProvider({...settings,simulator:async request=>{calls++;const m=JSON.parse(request.body.messages[1].content);return response(m.stage==='wake'?{fragment:'An invented later event.',residue:0.1,associations:[]}:await fake.generate({stage:m.stage,index:m.sceneIndex}));}});
 const e=setup(t,provider),id=e.start('r','s',fixture);assert.equal((await e.execute(id)).status,'failed');assert.equal(e.status(id).stagesSaved,2);assert.equal(e.result(id).dream,null);assert.equal(calls,3);
});
