// Presentation only: the existing validated view and stored reviews remain unchanged.
import {renderContentReview} from '../src/content-review.js';
const q=value=>JSON.stringify(value);
const labels=Object.freeze({related:'与所引事件相关',unclear:'关联尚不清楚',apparently_unrelated:'看起来无关',compatible:'可以相容（不表示唯一解释）',underdetermined:'依据不足，方向难以确定',apparent_conflict:'看起来存在冲突',not_reviewed:'尚未评审',not_established:'尚未确立',not_applicable:'不适用'});
const label=value=>Object.hasOwn(labels,value)?labels[value]:`未识别状态 ${q(value)}`;
export function renderDreambookReview(view,{reviewJson=false}={}){
  const original=renderContentReview(view);
  if(view===null||reviewJson)return original;
  const lines=['【已有独立评审意见】'];
  if(!view.reviews.length)lines.push('暂无已保存的独立评审意见。');
  for(const [i,r]of view.reviews.entries()){
    const a=r.assessment;
    lines.push(`意见 ${i+1} · 第 ${r.parent.sceneIndex+1} 幕`,
      `评审者：${q(r.reviewer.actorId)}；身份：${r.reviewer.kind==='assistant'?'助手':r.reviewer.kind==='person'?'个人（本地身份声明）':q(r.reviewer.kind)}。`,
      `事件关联：${label(a.eventRelevance)}。`,
      `情绪方向：愉悦度（valence）${label(a.direction.valence)}；唤醒度（arousal）${label(a.direction.arousal)}。`,
      `精确幅度：愉悦度 ${label(a.magnitude.valence)}；唤醒度 ${label(a.magnitude.arousal)}。`,
      `原始备注（保持原文）：${Object.hasOwn(a,'note')?q(a.note):'未填写'}。`,
      `评审编号：${q(r.id)}。`,
      `修订关系：${r.supersedesReviewId===null?'未声明替代旧意见':`替代 ${q(r.supersedesReviewId)}；旧意见仍保留`}。`,'');
  }
  lines.push('以上为独立评审者的意见；不改写模型数值，不自动构成人工验收或总体质量通过。',
    '完整记录（来源版本、父幕指纹、请求编号和结构校验状态）：同一 read 命令追加 --review-json。');
  // Match the entire program-owned section, never user text or a free-form note.
  const section=`【已有独立评审意见】\n${q(view.reviews)}\n\n【这次只判断三件事】`;
  return original.replace(section,()=>`${lines.join('\n')}\n\n【这次只判断三件事】`);
}
