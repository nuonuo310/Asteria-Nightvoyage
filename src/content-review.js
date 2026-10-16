// Logically read-only derived content view; no provider, budget or review-write API.
import {Store,copy,fail} from './store.js';
import {own,hash} from './contract.js';
import {LocalFileAppraisalReviewAdapter} from './appraisal-review-adapter.js';
import {assertAppraisalReviewJsonData} from './appraisal-review-memory.js';
import {normalizeDeepSeekStage} from './deepseek-protocol.js';
export const contentReviewVersion='local-dream-content-review-v1';
export function readContentReview(store,dreamId) {
  if(!(store instanceof Store))fail('managed_store_required');
  const adapter=new LocalFileAppraisalReviewAdapter(store,{actorId:'local-content-reader',kind:'assistant'}),bundle=adapter.readDreamReviewBundle({dreamId});
  if(!bundle)return null;
  const entry=own(store.state.entries,dreamId),run=own(store.state.runs,entry.runId),wake=entry.wake;
  if(!wake||wake.schemaVersion!==1||wake.id!==`wake-${entry.runId}`||wake.origin!=='wake_note'||wake.materialKind!==entry.materialKind||wake.isRealityFact!==false||wake.runId!==entry.runId||hash(wake.sourceRefs)!==hash(entry.sourceRefs)||hash(wake.derivedFrom)!==hash([run.snapshot.id]))fail('invalid_content_review_wake');
  let normalized;
  try{normalized=normalizeDeepSeekStage(wake,{stage:'wake',previousScenes:entry.scenes});}catch{fail('invalid_content_review_wake');}
  if(hash(normalized)!==hash(run.wake)||hash(wake.fragmentBasis)!==hash(normalized.fragmentBasis))fail('invalid_content_review_wake');
  return {schemaVersion:1,viewVersion:contentReviewVersion,origin:'dream_content_review_view',materialKind:entry.materialKind,isRealityFact:false,sourceRefs:copy(entry.sourceRefs),derivedFrom:[entry.id],
    narrative:{dream:bundle.dream,wake:{schemaVersion:1,id:wake.id,origin:wake.origin,runId:wake.runId,materialKind:wake.materialKind,isRealityFact:false,sourceRefs:copy(wake.sourceRefs),derivedFrom:copy(wake.derivedFrom),...normalized}},
    appraisalView:bundle.appraisalView,reviews:bundle.reviews,semanticSupport:'not_assessed',qualityAssessed:false};
}
// Text is quoted as JSON strings to escape terminal controls; never interpreted as commands.
const quote=value=>JSON.stringify(value);
export function renderContentReview(view) {
  if(view===null)return '梦境内容当前不可访问。';
  assertAppraisalReviewJsonData(view);
  if(view.viewVersion!==contentReviewVersion||view.origin!=='dream_content_review_view'||view.materialKind!=='fictional'||view.isRealityFact!==false||view.narrative?.dream?.origin!=='dream'||view.narrative.dream.isRealityFact!==false||view.narrative.wake?.origin!=='wake_note'||view.narrative.wake.isRealityFact!==false||view.appraisalView?.origin!=='dream_appraisal_view'||view.appraisalView.isRealityFact!==false||!Array.isArray(view.reviews)||view.reviews.some(r=>r.origin!=='dream_appraisal_review'||r.materialKind!=='fictional'||r.isRealityFact!==false))fail('invalid_content_review_view');
  const lines=['夜航 · 本地梦境内容查看','身份：素材为虚构；以下事件属于梦境，不是现实事实。','本次只查看保存结果，不新增生成或评审。',`来源编号与版本：${quote({origin:view.origin,sourceRefs:view.sourceRefs,derivedFrom:view.derivedFrom})}`,'', '【先读梦】'];
  view.narrative.dream.scenes.forEach((s,i)=>lines.push(`第 ${i+1} 幕：${quote(s.event)}`));
  const wake=view.narrative.wake;
  lines.push('','【醒来残片】',quote(wake.fragment),`摘录来源：第 ${wake.fragmentBasis.sceneIndex+1} 幕；scene_excerpt（逐字出现不等于代表性已通过）。`,
    `醒后余韵初始强度（模拟）：${wake.residue}；独立于梦中 valence/arousal。`,
    `待验证联想（非事实）：${quote(wake.associations)}`,'','【再看梦中评价与依据】');
  view.appraisalView.scenes.forEach(s=>{
    lines.push(`第 ${s.sceneIndex+1} 幕声明：${quote(s.affectDeclaration.kind)}；这是模型声明，结构已校验。`,
      `before / delta / after（模拟）：${quote(s.appliedAffect.before)} / ${quote(s.appliedAffect.delta)} / ${quote(s.appliedAffect.after)}`,
      `情绪变化字面依据：${quote(s.affectChange.evidence)}；状态：${quote(s.affectChange.status)}`,
      `目标影响：${quote(s.goalEffect)}；可控程度：${quote(s.control)}；不确定程度：${quote(s.uncertainty)}`);
  });
  lines.push('','【已有独立评审意见】',quote(view.reviews), '','【这次只判断三件事】',
    '1. 后幕带来了什么体验？普通、安静或变化少本身不扣分。',
    '2. 事件与情绪方向是否有可解释的联系？允许多种解释和难以判断；精确幅度仍未验证。',
    '3. 醒来残片留下了什么？不要求覆盖全梦、固定末幕、给出启示或正向结尾。',
    '显示不等于语义支持、人工验收或梦境质量通过；原梦和已保存评审均未改写。');
  return lines.join('\n');
}
