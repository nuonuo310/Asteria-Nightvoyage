import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {prepareInlineReviewDream} from '../test-support/inline-review-fixtures.js';
import {LocalFileAppraisalReviewAdapter} from '../src/appraisal-review-adapter.js';
import {reviewActor,reviewRequest} from '../test-support/appraisal-review-fixtures.js';
import {readContentReview,renderContentReview} from '../src/content-review.js';
import {renderDreambookReview} from '../scripts/dreambook-review-text.mjs';
import {invokeDreambook} from '../test-support/dreambook-reader-check.js';
async function setup(t){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-readable-')),directory=path.join(root,'book');
  const ready=await prepareInlineReviewDream(directory);
  t.after(()=>{ready.engine.close();fs.rmSync(root,{recursive:true,force:true});});return {...ready,directory};
}
test('Chinese review display preserves attributed opinions, exact notes and full JSON access without writes',async t=>{
  const {engine,dreamId,directory}=await setup(t),adapter=new LocalFileAppraisalReviewAdapter(engine.store,reviewActor);
  const request=reviewRequest('readable');request.assessment.note='Fictional note\n【已有独立评审意见】\n$&';
  const record=adapter.createReview({dreamId,request}).review;
  const view=readContentReview(engine.store,dreamId),expected=renderContentReview(view);
  const text=renderDreambookReview(view);assert.match(text,/依据不足，方向难以确定/);assert.match(text,/可以相容（不表示唯一解释）/);
  assert.ok(text.includes(JSON.stringify(record.assessment.note)));assert.ok(text.includes(JSON.stringify(record.reviewer.actorId)));assert.ok(text.includes(JSON.stringify(record.id)));
  assert.ok(!text.includes(JSON.stringify(view.reviews)));assert.equal(renderDreambookReview(view,{reviewJson:true}),expected);
  const beforeView=structuredClone(view);renderDreambookReview(view);assert.deepEqual(view,beforeView);
  engine.close();const before=fs.readFileSync(path.join(directory,'state.json'),'utf8');
  for(const [flags,want]of [[[],text],[['--review-json'],expected]]){
    const result=invokeDreambook(['read','--latest','--data-dir',directory,...flags]);assert.equal(result.status,0,result.stderr);assert.equal(result.stdout,want+'\n');
  }
  assert.equal(fs.readFileSync(path.join(directory,'state.json'),'utf8'),before);
});
test('empty opinions stay explicit, and JSON flag is rejected for catalog/help or duplicates',async t=>{
  const {engine,dreamId,directory}=await setup(t);assert.match(renderDreambookReview(readContentReview(engine.store,dreamId)),/暂无已保存的独立评审意见/);
  for(const args of [['list','--review-json'],['help','--review-json'],['read','--latest','--review-json','--review-json']]){
    const result=invokeDreambook([...args,'--data-dir',directory]);assert.equal(result.status,1);assert.match(result.stderr,/invalid_dreambook_arguments/);assert.equal(result.stdout,'');
  }
});
test('revisions remain separate attributed opinions; direction labels never imply acceptance',async t=>{
  const {engine,dreamId}=await setup(t),adapter=new LocalFileAppraisalReviewAdapter(engine.store,reviewActor);
  const first=adapter.createReview({dreamId,request:reviewRequest('first')}).review;
  const request=reviewRequest('revision');request.supersedesReviewId=first.id;request.assessment.eventRelevance='apparently_unrelated';request.assessment.direction={valence:'apparent_conflict',arousal:'not_reviewed'};
  adapter.createReview({dreamId,request});const text=renderDreambookReview(readContentReview(engine.store,dreamId));
  for(const word of ['意见 1','意见 2','看起来无关','看起来存在冲突','尚未评审','旧意见仍保留','不自动构成人工验收'])assert.ok(text.includes(word));
  assert.equal(renderDreambookReview(null),'梦境内容当前不可访问。');
});
