import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {generatedWakeFixture as fixture} from '../fixtures/generated-wake-offline.js';
import {GeneratedWakeRehearsal} from '../src/generated-wake-runtime.js';
import {readGeneratedWakeView} from '../src/generated-wake-records.js';
import {renderGeneratedWakeStoryHtml} from '../scripts/generated-wake-story-html.mjs';

const at=1760000000000;
const unsafe=/<script\b|<iframe\b|<img\b|<link\b|<object\b|<embed\b|https?:\/\/|localStorage|sessionStorage|<[^>]+\son[a-z]+\s*=/i;

function directory(t){
  const value=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-generated-wake-story-'));
  t.after(()=>fs.rmSync(value,{recursive:true,force:true}));
  return value;
}
function http(data){
  return {status:200,body:{model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(data)}}],
    usage:{prompt_tokens:100,completion_tokens:80,total_tokens:180}}};
}
function setup(t,{scenes=fixture.scenes,wakeOptions={},snapshot=fixture.snapshot}={}){
  const dir=directory(t),calls=[];
  const simulator=request=>{
    const material=JSON.parse(request.body.messages[1].content);calls.push(request);
    if(material.stage==='scene')return http(structuredClone(scenes[material.sceneIndex]));
    const data={fragment:material.previousScenes[fixture.wake.fragmentSceneIndex].event,residue:fixture.wake.residue,
      associations:[...fixture.wake.associations]};
    if(!wakeOptions.omitFirstFeeling)data.firstFeeling=structuredClone(wakeOptions.firstFeeling??fixture.wake.firstFeeling);
    return http(data);
  };
  const engine=new GeneratedWakeRehearsal(dir,{allowance:structuredClone(fixture.allowance),simulator,enabled:true,now:()=>at});
  t.after(()=>engine.close());
  return {engine,dir,calls,simulator,snapshot};
}
async function complete(t,id='generated-wake-story',options){
  const context=setup(t,options),runId=context.engine.start(id,id,context.snapshot);
  const status=await context.engine.execute(runId),packet=context.engine.result(runId);
  return {...context,runId,status,packet,view:packet.dream?readGeneratedWakeView(context.engine.store,packet.dream.id,{now:at}):null};
}

test('present story exports dream, wake, feeling and ordered recollections without technical ids',async t=>{
  const context=await complete(t,'story-present');
  context.engine.append(context.packet.dream.id,'recollection','后来先想起水声。');
  context.engine.append(context.packet.dream.id,'recollection','再后来想起灯光。');
  const view=readGeneratedWakeView(context.engine.store,context.packet.dream.id,{now:at});
  const html=renderGeneratedWakeStoryHtml(view);
  const labels=['>原梦</h2>','>醒来残片</h2>','>刚醒心情</h2>','>后来回想</h2>'];
  const positions=labels.map(label=>html.indexOf(label));
  assert.ok(positions.every(position=>position>=0));assert.deepEqual(positions,[...positions].sort((a,b)=>a-b));
  assert.ok(html.indexOf(fixture.scenes[0].event)<html.indexOf(fixture.scenes[fixture.wake.fragmentSceneIndex].event));
  assert.ok(html.includes(fixture.wake.firstFeeling.text));
  assert.ok(html.includes(fixture.wake.associations[0]));
  assert.ok(html.indexOf('后来先想起水声。')<html.indexOf('再后来想起灯光。'));
  const details=html.indexOf('<details class="technical">'),main=html.slice(0,details);
  assert.ok(details>0);
  assert.equal(main.includes('模拟余韵强度'),false);assert.equal(main.includes('视图版本'),false);
  assert.ok(html.slice(details).includes('模拟余韵强度（随时间衰减）'));
  assert.ok(html.slice(details).includes('视图版本 generated-wake-offline-view-v1；'));
  assert.ok(html.includes('不是持续心情记录，也不随真实回应更新'));
  assert.ok(html.includes('已经导出的副本不会被自动撤回'));
  for(const value of ['deepseek','generated-wake-offline-source',view.dream.id,view.firstFeeling.id,view.wake.wakeRequestId])assert.equal(html.includes(value),false,value);
  assert.equal(html.includes('虚构演示'),false);
  assert.equal(html.includes('<script'),false);assert.equal(unsafe.test(html),false);
  assert.match(html,/<meta http-equiv="Content-Security-Policy"/);assert.match(html,/<meta name="referrer" content="no-referrer">/);
});

test('absent, uncertain and omitted feelings stay distinct and omitted is hidden',async t=>{
  const absent=await complete(t,'story-absent',{wakeOptions:{firstFeeling:{status:'absent'}}});
  const uncertain=await complete(t,'story-uncertain',{wakeOptions:{firstFeeling:{status:'uncertain'}}});
  const omitted=await complete(t,'story-omitted',{wakeOptions:{omitFirstFeeling:true}});
  const absentHtml=renderGeneratedWakeStoryHtml(absent.view),uncertainHtml=renderGeneratedWakeStoryHtml(uncertain.view),omittedHtml=renderGeneratedWakeStoryHtml(omitted.view);
  assert.match(absentHtml,/没有记下刚醒时的心情。/);assert.ok(absentHtml.includes('id="feeling-title"'));
  assert.match(uncertainHtml,/刚醒时的心情，还说不清。/);assert.ok(uncertainHtml.includes('id="feeling-title"'));
  assert.equal(omittedHtml.includes('id="feeling-title"'),false);assert.equal(omittedHtml.includes('刚醒心情'),false);
  for(const html of [absentHtml,uncertainHtml,omittedHtml])assert.ok(html.includes(fixture.scenes[0].event));
});

test('no later section appears without records and multiple records keep source order',async t=>{
  const empty=await complete(t,'story-no-later');
  const emptyHtml=renderGeneratedWakeStoryHtml(empty.view);
  assert.equal(emptyHtml.includes('id="later-title"'),false);assert.equal(emptyHtml.includes('后来回想'),false);
  empty.engine.append(empty.packet.dream.id,'recollection','第一条测试回想');
  empty.engine.append(empty.packet.dream.id,'recollection','第二条测试回想');
  const many=readGeneratedWakeView(empty.engine.store,empty.packet.dream.id,{now:at});
  const manyHtml=renderGeneratedWakeStoryHtml(many);
  assert.ok(manyHtml.indexOf('第一条测试回想')<manyHtml.indexOf('第二条测试回想'));
  assert.equal((manyHtml.match(/<li>/g)||[]).length,2);
});

test('deleting the feeling hides its section without inventing a quiet mood',async t=>{
  const context=await complete(t,'story-delete-feeling');
  const before=renderGeneratedWakeStoryHtml(context.view);
  assert.ok(before.includes(fixture.wake.firstFeeling.text));
  context.engine.deleteEntry(context.view.firstFeeling.id);
  const view=readGeneratedWakeView(context.engine.store,context.packet.dream.id,{now:at});
  assert.equal(view.firstFeeling,null);assert.equal(view.firstFeelingDeleted,true);
  const html=renderGeneratedWakeStoryHtml(view);
  assert.equal(html.includes('id="feeling-title"'),false);assert.equal(html.includes(fixture.wake.firstFeeling.text),false);
  assert.equal(html.includes('没有记下刚醒时的心情。'),false);
});

test('source withdrawal and dream deletion make later exports unreadable and body-free',async t=>{
  const withdrawn=await complete(t,'story-withdraw');
  assert.ok(renderGeneratedWakeStoryHtml(withdrawn.view).includes(fixture.scenes[0].event));
  withdrawn.engine.withdraw(fixture.snapshot.sources[0].id);
  assert.equal(readGeneratedWakeView(withdrawn.engine.store,withdrawn.packet.dream.id,{now:at}),null);
  const withdrawnHtml=renderGeneratedWakeStoryHtml(null);
  assert.match(withdrawnHtml,/这场梦现在不可读取。/);assert.equal(withdrawnHtml.includes('技术详情'),false);
  for(const value of [fixture.scenes[0].event,fixture.wake.fragment,fixture.wake.firstFeeling.text])assert.equal(withdrawnHtml.includes(value),false);
  const deleted=await complete(t,'story-delete-dream');
  assert.ok(renderGeneratedWakeStoryHtml(deleted.view).includes(fixture.scenes[fixture.wake.fragmentSceneIndex].event));
  deleted.engine.deleteEntry(deleted.packet.dream.id);
  assert.equal(readGeneratedWakeView(deleted.engine.store,deleted.packet.dream.id,{now:at}),null);
  const deletedHtml=renderGeneratedWakeStoryHtml(null);
  assert.equal(deletedHtml.includes(fixture.scenes[fixture.wake.fragmentSceneIndex].event),false);assert.equal(deletedHtml.includes('<details'),false);
});

test('all narrative and detail text is escaped and control characters remain inert',async t=>{
  const scenes=structuredClone(fixture.scenes);
  scenes[0].event='第一幕 <b>not markup</b> & "quote"';
  scenes[1].event='第二幕 </p><img src=x onerror=alert(1)>';
  scenes[1].affect.excerpt='第二幕';
  const feeling='心情 <script>alert(1)</script> & '+String.fromCharCode(27)+'[31m';
  const context=await complete(t,'story-escape',{scenes,wakeOptions:{firstFeeling:{status:'present',text:feeling}}});
  context.engine.append(context.packet.dream.id,'recollection','回想 <iframe src="x"></iframe>');
  const view=readGeneratedWakeView(context.engine.store,context.packet.dream.id,{now:at});
  const html=renderGeneratedWakeStoryHtml(view);
  assert.equal((html.match(/<script\b/gi)||[]).length,0);assert.equal((html.match(/<img\b/gi)||[]).length,0);
  assert.equal((html.match(/<iframe\b/gi)||[]).length,0);assert.equal(unsafe.test(html),false);
  assert.ok(html.includes('&lt;b&gt;not markup&lt;/b&gt;'));assert.ok(html.includes('&quot;quote&quot;'));
  assert.ok(html.includes('心情 &lt;script&gt;alert(1)&lt;/script&gt; &amp; \\u001b[31m'));
  assert.ok(html.includes('回想 &lt;iframe src=&quot;x&quot;&gt;&lt;/iframe&gt;'));
  assert.equal(html.includes(String.fromCharCode(27)),false);
});

test('read and render leave the temporary Store bytes and generation count unchanged',async t=>{
  const context=await complete(t,'story-stable');
  context.engine.append(context.packet.dream.id,'recollection','稳定字节测试');
  const stateFile=path.join(context.dir,'state.json'),before=fs.readFileSync(stateFile),callsBefore=context.calls.length;
  const view=readGeneratedWakeView(context.engine.store,context.packet.dream.id,{now:at});
  const first=renderGeneratedWakeStoryHtml(view),second=renderGeneratedWakeStoryHtml(view);
  assert.equal(first,second);assert.deepEqual(fs.readFileSync(stateFile),before);assert.equal(context.calls.length,callsBefore);
});

test('the story renderer refuses a forged projection instead of bypassing the view gate',async t=>{
  const context=await complete(t,'story-gate'),view=readGeneratedWakeView(context.engine.store,context.packet.dream.id,{now:at});
  const forged=structuredClone(view);forged.origin='forged_origin';
  assert.throws(()=>renderGeneratedWakeStoryHtml(forged),/invalid_generated_wake_view/);
});

test('the fixed demo exports one scriptless fictional HTML and keeps its Store closed',()=>{
  const result=spawnSync(process.execPath,['scripts/generated-wake-story-demo.mjs'],{cwd:new URL('..',import.meta.url),encoding:'utf8',
    timeout:30000,env:{...process.env,NIGHTVOYAGE_DEEPSEEK_KEY:'DUMMY-SENTINEL'}});
  assert.equal(result.status,0,result.stderr);assert.equal(result.stderr,'');assert.ok(!result.stdout.includes('DUMMY-SENTINEL'));
  const receipt=JSON.parse(result.stdout);
  assert.equal(receipt.status,'COMPLETE_SYNTHETIC_EXPORT');assert.equal(receipt.dreamStages,2);assert.equal(receipt.generatedCalls,3);
  assert.equal(receipt.recollections,2);assert.equal(receipt.stateBytesUnchanged,true);assert.equal(receipt.storeClosedOnStop,true);
  assert.equal(receipt.userStoreAccessed,false);assert.equal(receipt.keyReads,0);assert.equal(receipt.networkAttempts,0);
  assert.equal(receipt.realModelRequests,0);assert.equal(receipt.ready,false);assert.equal(receipt.merged,false);assert.equal(receipt.deployed,false);
  const sample=fs.readFileSync(new URL('../docs/examples/generated-wake-story-example.html',import.meta.url),'utf8');
  assert.ok(sample.includes(fixture.scenes[0].event));assert.ok(sample.includes(fixture.wake.firstFeeling.text));
  assert.equal((sample.match(/虚构演示/g)||[]).length,1);assert.equal(unsafe.test(sample),false);
  assert.equal(sample.includes('<script'),false);assert.equal(sample.includes('<details class="technical">'),true);
});

test('the HTML example is a pure local artifact with no remote assets or scripts',()=>{
  const sample=fs.readFileSync(new URL('../docs/examples/generated-wake-story-example.html',import.meta.url),'utf8');
  assert.ok(sample.startsWith('<!doctype html>'));assert.match(sample,/lang="zh-CN"/);assert.match(sample,/viewport/);
  assert.equal(sample.includes('<details class="technical">'),true);assert.equal(sample.includes('模拟余韵强度（随时间衰减）'),true);
  assert.equal(unsafe.test(sample),false);
});
