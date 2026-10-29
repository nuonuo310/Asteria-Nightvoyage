import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {generatedWakeFixture as fixture} from '../fixtures/generated-wake-offline.js';
import {GeneratedWakeRehearsal} from '../src/generated-wake-runtime.js';
import {readGeneratedWakeView,renderGeneratedWakeView} from '../src/generated-wake-records.js';
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
  return {engine,dir,calls,snapshot};
}
async function complete(t,id='generated-wake-story',options){
  const context=setup(t,options),runId=context.engine.start(id,id,context.snapshot);
  const status=await context.engine.execute(runId),packet=context.engine.result(runId);
  return {...context,runId,status,packet,view:packet.dream?readGeneratedWakeView(context.engine.store,packet.dream.id,{now:at}):null};
}

test('reader orders dream, wake, feeling, residue and recollection without technical internals',async t=>{
  const context=await complete(t,'story-present');
  context.engine.append(context.packet.dream.id,'recollection','后来先想起水声。');
  context.engine.append(context.packet.dream.id,'recollection','再后来想起灯光。');
  const view=readGeneratedWakeView(context.engine.store,context.packet.dream.id,{now:at});
  const html=renderGeneratedWakeStoryHtml(view);
  const labels=['>原梦</h2>','>醒来残片</h2>','>刚醒心情</h2>','>模拟余韵</h2>','>后来回想</h2>'];
  const positions=labels.map(label=>html.indexOf(label));
  assert.ok(positions.every(position=>position>=0));
  assert.deepEqual(positions,[...positions].sort((a,b)=>a-b));
  assert.equal((html.match(/class="passage"/g)||[]).length,3);
  assert.ok(html.indexOf(fixture.scenes[0].event)<html.indexOf(fixture.scenes[1].event));
  assert.ok(html.indexOf(fixture.scenes[1].event)<html.indexOf(fixture.scenes[2].event));
  assert.ok(html.includes(fixture.wake.firstFeeling.text));
  assert.ok(html.includes(fixture.wake.associations[0]));
  assert.ok(html.indexOf('后来先想起水声。')<html.indexOf('再后来想起灯光。'));
  assert.ok(html.includes('模拟余韵强度：0.12。这是独立模拟估计，不是刚醒心情'));
  const terminal=renderGeneratedWakeView(view);
  for(const label of ['【原梦】','【醒来残片】','【刚醒心情】','【模拟余韵】','【后来回想】'])
    assert.ok(terminal.includes(label),label);
  assert.ok(terminal.indexOf('【原梦】')<terminal.indexOf('【醒来残片】'));
  assert.ok(terminal.indexOf('【醒来残片】')<terminal.indexOf('【刚醒心情】'));
  assert.ok(terminal.indexOf('【刚醒心情】')<terminal.indexOf('【模拟余韵】'));
  assert.ok(terminal.indexOf('【模拟余韵】')<terminal.indexOf('【后来回想】'));
  for(const value of ['deepseek','provider','authorization','promptHash','unbasedAppraisalAudit',
    'unbased_requires_unknown','integrityHash','requestId','generated-wake-offline-source',
    view.dream.id,view.firstFeeling.id,view.wake.wakeRequestId]){
    assert.equal(html.includes(value),false,value);
    assert.equal(terminal.includes(value),false,value);
  }
  assert.equal(html.includes('<details'),false);
  assert.equal(html.includes('技术详情'),false);
  assert.equal(html.includes('虚构演示'),false);
  assert.equal(html.includes('<script'),false);
  assert.equal(unsafe.test(html),false);
  assert.match(html,/<meta http-equiv="Content-Security-Policy"/);
  assert.match(html,/<meta name="referrer" content="no-referrer">/);
});

test('absent, uncertain and omitted feelings stay distinct and omitted remains hidden',async t=>{
  const absent=await complete(t,'story-absent',{wakeOptions:{firstFeeling:{status:'absent'}}});
  const uncertain=await complete(t,'story-uncertain',{wakeOptions:{firstFeeling:{status:'uncertain'}}});
  const omitted=await complete(t,'story-omitted',{wakeOptions:{omitFirstFeeling:true}});
  const absentHtml=renderGeneratedWakeStoryHtml(absent.view);
  const uncertainHtml=renderGeneratedWakeStoryHtml(uncertain.view);
  const omittedHtml=renderGeneratedWakeStoryHtml(omitted.view);
  assert.ok(absentHtml.includes('无（明确记为无）。'));
  assert.ok(absentHtml.includes('id="feeling-title"'));
  assert.ok(uncertainHtml.includes('说不清（不确定）'));
  assert.ok(uncertainHtml.includes('id="feeling-title"'));
  assert.equal(omittedHtml.includes('id="feeling-title"'),false);
  assert.equal(omittedHtml.includes('无（明确记为无）。'),false);
  for(const html of [absentHtml,uncertainHtml,omittedHtml]){
    assert.ok(html.includes(fixture.scenes[0].event));
    assert.ok(html.includes('id="residue-title"'));
  }
});

test('empty recollection generates no sample or empty section and later records keep order',async t=>{
  const context=await complete(t,'story-later');
  const emptyHtml=renderGeneratedWakeStoryHtml(context.view);
  assert.equal(emptyHtml.includes('id="later-title"'),false);
  assert.equal(emptyHtml.includes('后来回想'),false);
  assert.equal(context.view.later.length,0);
  context.engine.append(context.packet.dream.id,'recollection','第一条测试回想');
  context.engine.append(context.packet.dream.id,'recollection','第二条测试回想');
  const view=readGeneratedWakeView(context.engine.store,context.packet.dream.id,{now:at});
  const html=renderGeneratedWakeStoryHtml(view);
  assert.ok(html.indexOf('第一条测试回想')<html.indexOf('第二条测试回想'));
  assert.equal((html.match(/<li>/g)||[]).length,2);
});

test('deleted feeling and deleted dream are not backfilled from adjacent records',async t=>{
  const context=await complete(t,'story-delete-feeling');
  context.engine.deleteEntry(context.view.firstFeeling.id);
  const withoutFeeling=readGeneratedWakeView(context.engine.store,context.packet.dream.id,{now:at});
  assert.equal(withoutFeeling.firstFeeling,null);
  assert.equal(withoutFeeling.firstFeelingDeleted,true);
  const feelingHtml=renderGeneratedWakeStoryHtml(withoutFeeling);
  assert.equal(feelingHtml.includes('id="feeling-title"'),false);
  assert.equal(feelingHtml.includes(fixture.wake.firstFeeling.text),false);
  assert.equal(feelingHtml.includes('无（明确记为无）。'),false);
  assert.ok(feelingHtml.includes('id="residue-title"'));
  context.engine.deleteEntry(context.packet.dream.id);
  assert.equal(readGeneratedWakeView(context.engine.store,context.packet.dream.id,{now:at}),null);
  const deletedHtml=renderGeneratedWakeStoryHtml(null);
  for(const value of [fixture.scenes[0].event,fixture.wake.fragment,fixture.wake.firstFeeling.text])
    assert.equal(deletedHtml.includes(value),false);
  assert.equal(deletedHtml.includes('<details'),false);
});

test('source withdrawal makes later exports unreadable without leaking stored text',async t=>{
  const context=await complete(t,'story-withdraw');
  context.engine.withdraw(fixture.snapshot.sources[0].id);
  assert.equal(readGeneratedWakeView(context.engine.store,context.packet.dream.id,{now:at}),null);
  const html=renderGeneratedWakeStoryHtml(null);
  assert.match(html,/这场梦现在不可读取。/);
  for(const value of [fixture.scenes[0].event,fixture.wake.fragment,fixture.wake.firstFeeling.text])
    assert.equal(html.includes(value),false);
});

test('narrative text is escaped and terminal control characters remain inert',async t=>{
  const scenes=structuredClone(fixture.scenes);
  scenes[0].event='第一幕 <b>not markup</b> & "quote"';
  scenes[1].event='第二幕 </p><img src=x onerror=alert(1)>';
  scenes[1].affect.excerpt='第二幕';
  const feeling='心情 <script>alert(1)</script> & '+String.fromCharCode(27)+'[31m';
  const context=await complete(t,'story-escape',{scenes,wakeOptions:{firstFeeling:{status:'present',text:feeling}}});
  context.engine.append(context.packet.dream.id,'recollection','回想 <iframe src="x"></iframe>');
  const view=readGeneratedWakeView(context.engine.store,context.packet.dream.id,{now:at});
  const html=renderGeneratedWakeStoryHtml(view);
  assert.equal((html.match(/<script\b/gi)||[]).length,0);
  assert.equal((html.match(/<img\b/gi)||[]).length,0);
  assert.equal((html.match(/<iframe\b/gi)||[]).length,0);
  assert.equal(unsafe.test(html),false);
  assert.ok(html.includes('&lt;b&gt;not markup&lt;/b&gt;'));
  assert.ok(html.includes('&quot;quote&quot;'));
  assert.ok(html.includes('心情 &lt;script&gt;alert(1)&lt;/script&gt; &amp; \\u001b[31m'));
  assert.ok(html.includes('回想 &lt;iframe src=&quot;x&quot;&gt;&lt;/iframe&gt;'));
  assert.equal(html.includes(String.fromCharCode(27)),false);
});

test('read and render are byte-stable and do not add fake generation calls',async t=>{
  const context=await complete(t,'story-stable');
  context.engine.append(context.packet.dream.id,'recollection','稳定字节测试');
  const stateFile=path.join(context.dir,'state.json'),before=fs.readFileSync(stateFile),callsBefore=context.calls.length;
  const view=readGeneratedWakeView(context.engine.store,context.packet.dream.id,{now:at});
  const first=renderGeneratedWakeStoryHtml(view),second=renderGeneratedWakeStoryHtml(view);
  assert.equal(first,second);
  assert.deepEqual(fs.readFileSync(stateFile),before);
  assert.equal(context.calls.length,callsBefore);
});

test('the renderer refuses a forged projection instead of bypassing the view gate',async t=>{
  const context=await complete(t,'story-gate');
  const forged=structuredClone(context.view);forged.origin='forged_origin';
  assert.throws(()=>renderGeneratedWakeStoryHtml(forged),/invalid_generated_wake_view/);
});
