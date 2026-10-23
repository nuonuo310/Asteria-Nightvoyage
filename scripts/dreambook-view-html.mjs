// Pure server-side presentation. Input is an existing validated Dreambook view.
import {renderContentReview} from '../src/content-review.js';
const controls=/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g;
const entities=Object.freeze({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' });
export function escapeDreambookText(value){
  const clean=String(value).replace(controls,ch=>`\\u${ch.charCodeAt(0).toString(16).padStart(4,'0')}`);
  return clean.replace(/[&<>"']/g,ch=>entities[ch]);
}
const text=value=>escapeDreambookText(value);
const json=value=>text(JSON.stringify(value));
const reviewLabels=Object.freeze({related:'与所引事件相关',unclear:'关联尚不清楚',apparently_unrelated:'看起来无关',compatible:'可以相容（不表示唯一解释）',underdetermined:'依据不足，方向难以确定',apparent_conflict:'看起来存在冲突',not_reviewed:'尚未评审',not_established:'尚未确立',not_applicable:'不适用'});
const reviewLabel=value=>Object.hasOwn(reviewLabels,value)?reviewLabels[value]:`未识别状态 ${json(value)}`;
const reviewerKindLabel=kind=>kind==='assistant'?'助手':kind==='person'?'个人（本地身份声明）':json(kind);
const finite=value=>typeof value==='number'&&Number.isFinite(value);
const number=value=>finite(value)?String(Math.round(value*1000)/1000):json(value);
const statuses=Object.freeze({not_stated:'未说明',model_estimate:'模拟估计'});
const statusLabel=status=>Object.hasOwn(statuses,status)?statuses[status]:`未识别状态 ${json(status)}`;
const affectLabel=kind=>kind==='unchanged'?'保持不变':kind==='estimated'?'有估计变化':`未识别状态 ${json(kind)}`;
function metadataList(sourceRefs,derivedFrom){
  return `<ul class="metadata-list">${sourceRefs.map((ref,index)=>`<li><span class="metadata-key">来源 ${index+1}</span><code>${text(ref.id)}</code><span class="metadata-version">版本 ${text(ref.version)}</span></li>`).join('')}</ul><p class="derived">派生自：${derivedFrom.map(value=>`<code>${text(value)}</code>`).join(' ')}</p>`;
}
function renderEstimate(label,estimate){
  const value=estimate?.value===null||estimate?.value===undefined?'未给出':json(estimate.value);
  const evidence=estimate?.evidence===null||estimate?.evidence===undefined?'':`<span class="estimate-evidence">依据：<q>${text(estimate.evidence)}</q></span>`;
  return `<li><span class="estimate-label">${label}</span><span class="estimate-state">${text(statusLabel(estimate?.status))} · <code>${value}</code></span>${evidence}</li>`;
}
function renderAxis(label,before,delta,after){
  return `<div class="axis"><span class="axis-name">${label}</span><span class="axis-track" aria-hidden="true"><i style="--level:${finite(after)?Math.max(0,Math.min(1,(after+1)/2)):.5}"></i></span><span class="axis-values">${number(before)} <span>→</span> ${number(after)} <small>Δ ${number(delta)}</small></span></div>`;
}
function renderAppraisal(scene){
  const applied=scene.appliedAffect??{};
  return `<article class="appraisal-card">
    <div class="appraisal-heading"><span class="mini-index">${String(scene.sceneIndex+1).padStart(2,'0')}</span><h3>第 ${scene.sceneIndex+1} 幕</h3><span class="soft-tag">模拟评价</span></div>
    <p class="declaration">情绪声明：<strong>${text(affectLabel(scene.affectDeclaration?.kind))}</strong>。这是模型声明，仅校验形状；不是现实测量。</p>
    <div class="axes">${renderAxis('愉悦度',applied.before?.valence,applied.delta?.valence,applied.after?.valence)}${renderAxis('唤醒度',applied.before?.arousal,applied.delta?.arousal,applied.after?.arousal)}</div>
    <ul class="estimate-list">${renderEstimate('目标影响',scene.goalEffect)}${renderEstimate('可控程度',scene.control)}${renderEstimate('不确定程度',scene.uncertainty)}${renderEstimate('情绪变化依据',scene.affectChange)}</ul>
  </article>`;
}
function renderReview(review,index){
  const assessment=review.assessment;
  const note=Object.hasOwn(assessment,'note')?text(assessment.note):'未填写';
  return `<article class="review-card">
    <div class="review-top"><span class="mini-index">${String(index+1).padStart(2,'0')}</span><span class="soft-tag">独立意见</span></div>
    <h3>第 ${review.parent.sceneIndex+1} 幕 · ${text(reviewerKindLabel(review.reviewer.kind))}意见</h3>
    <p class="reviewer">评审者 <strong>${text(review.reviewer.actorId)}</strong>；这是本地身份声明，不是已验证的现实人物。</p>
    <dl class="review-grid">
      <div><dt>事件关联</dt><dd>${text(reviewLabel(assessment.eventRelevance))}</dd></div>
      <div><dt>愉悦度方向</dt><dd>${text(reviewLabel(assessment.direction.valence))}</dd></div>
      <div><dt>唤醒度方向</dt><dd>${text(reviewLabel(assessment.direction.arousal))}</dd></div>
      <div><dt>愉悦度幅度</dt><dd>${text(reviewLabel(assessment.magnitude.valence))}</dd></div>
      <div><dt>唤醒度幅度</dt><dd>${text(reviewLabel(assessment.magnitude.arousal))}</dd></div>
    </dl>
    <blockquote class="review-note"><p>${note}</p></blockquote>
    <p class="review-meta">评审编号 <code>${text(review.id)}</code> · ${review.supersedesReviewId===null?'未声明替代旧意见':`替代 <code>${text(review.supersedesReviewId)}</code>；旧意见仍保留`}</p>
  </article>`;
}
const laterLabels=Object.freeze({recollection:'后来回想',imagined_continuation:'想象续写'});
function renderLater(record,index){
  return `<article class="later-card">
    <div class="later-top"><span class="mini-index">${String(index+1).padStart(2,'0')}</span><h3>${text(laterLabels[record.origin]??'未识别记录')}</h3><span class="soft-tag">独立子记录</span></div>
    <p class="detail-line">派生自原梦 <code>${text(record.derivedFrom[0])}</code>；不是原梦正文，不改写、补写或替代上面两幕。</p>
    <p class="later-text">${text(record.text)}</p>
  </article>`;
}
export function renderDreambookViewHtml(view,{demo=false,laterRecords=[]}={}){
  if(!view)throw Error('invalid_content_review_view');
  // Use the existing strict text projection as the view validator before presentation.
  renderContentReview(view);
  const dream=view.narrative.dream,wake=view.narrative.wake,appraisal=view.appraisalView;
  const scenes=dream.scenes.map((scene,index)=>`<article class="scene-card" aria-labelledby="scene-${index+1}"><div class="scene-heading"><span class="scene-number">${String(index+1).padStart(2,'0')}</span><h3 id="scene-${index+1}">第 ${index+1} 幕</h3></div><p class="story">${text(scene.event)}</p></article>`).join('');
  const associations=wake.associations.length?`<ul class="association-list">${wake.associations.map(value=>`<li>${text(value)}</li>`).join('')}</ul>`:'<p class="muted">没有保存待验证联想。</p>';
  const reviews=view.reviews.length?view.reviews.map(renderReview).join(''):'<p class="empty-state">暂无已保存的独立评审意见。</p>';
  const later=Array.isArray(laterRecords)&&laterRecords.length?laterRecords.map(renderLater).join(''):'<p class="empty-state">没有保存后来回想或想象续写。</p>';
  const mode=demo?'固定虚构演示':'本地已保存梦境';
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <title>夜航梦簿 · ${text(mode)}</title>
  <style>
    :root{color-scheme:dark;--ink:#ece7db;--muted:#aaa8b8;--paper:#181c2d;--paper-2:#20253b;--line:rgba(236,231,219,.14);--rose:#e0a78e;--gold:#d7be83;--mint:#9ac8bc;--shadow:0 30px 90px rgba(0,0,0,.42)}
    *{box-sizing:border-box}
    html{background:#0e1120}
    body{margin:0;min-height:100vh;color:var(--ink);background:radial-gradient(circle at 84% 7%,rgba(215,190,131,.17),transparent 24rem),radial-gradient(circle at 9% 36%,rgba(112,137,181,.16),transparent 30rem),linear-gradient(150deg,#0e1120,#15182a 58%,#111522);font-family:"Noto Serif CJK SC","Source Han Serif SC","Songti SC","SimSun",Georgia,serif;line-height:1.75}
    body:before{content:"";position:fixed;inset:0;pointer-events:none;background:linear-gradient(90deg,transparent 49.8%,rgba(255,255,255,.025) 50%,transparent 50.2%);background-size:5px 5px;opacity:.35}
    .page{width:min(100% - 28px,980px);margin:0 auto;padding:34px 0 52px;position:relative}
    .shell{border:1px solid var(--line);border-radius:30px;background:linear-gradient(180deg,rgba(32,37,59,.94),rgba(24,28,45,.97));box-shadow:var(--shadow);overflow:hidden}
    .hero{position:relative;padding:46px clamp(24px,6vw,68px) 42px;border-bottom:1px solid var(--line);background:radial-gradient(circle at 86% 16%,rgba(215,190,131,.16),transparent 17rem)}
    .hero:after{content:"";position:absolute;width:118px;height:118px;border:1px solid rgba(215,190,131,.34);border-radius:50%;right:clamp(18px,5vw,58px);top:28px;box-shadow:0 0 0 22px rgba(215,190,131,.035),0 0 0 46px rgba(215,190,131,.02)}
    .eyebrow{font:600 .69rem/1.4 ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.2em;color:var(--gold);text-transform:uppercase;margin:0 0 18px}
    h1{font-size:clamp(2.5rem,8vw,5rem);line-height:1.02;letter-spacing:-.045em;margin:0;font-weight:600}
    .subtitle{max-width:38rem;color:var(--muted);font-size:clamp(1rem,2vw,1.14rem);margin:18px 0 24px}
    .badges{display:flex;flex-wrap:wrap;gap:9px;position:relative;z-index:1}
    .badge{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--line);border-radius:999px;padding:6px 11px;background:rgba(255,255,255,.035);font:600 .72rem/1.2 ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.04em}
    .badge:before{content:"";width:6px;height:6px;border-radius:50%;background:var(--gold)}
    .badge.nonfact:before{background:var(--rose)}.badge.demo:before{background:var(--mint)}
    main{padding:0 clamp(18px,5vw,58px)}
    section{padding:38px 0;border-bottom:1px solid var(--line)}
    section:last-of-type{border-bottom:0}
    .section-head{display:flex;align-items:baseline;gap:14px;margin-bottom:22px}
    .section-kicker{font:600 .68rem/1 ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.16em;color:var(--gold)}
    h2{font-size:clamp(1.45rem,3vw,2rem);line-height:1.2;margin:0;font-weight:600}
    .section-note{color:var(--muted);margin:-10px 0 22px;max-width:48rem;font-size:.92rem}
    .scene-card,.appraisal-card,.review-card,.wake-card,.later-card,.provenance-card{border:1px solid var(--line);border-radius:19px;background:rgba(255,255,255,.028);padding:clamp(18px,4vw,28px)}
    .scene-card + .scene-card{margin-top:14px}
    .scene-heading,.appraisal-heading,.review-top,.later-top{display:flex;align-items:center;gap:12px}
    .scene-heading h3,.appraisal-heading h3,.review-card h3,.later-card h3{margin:0;font-size:1rem;font-weight:600;letter-spacing:.02em}
    .scene-number,.mini-index{display:inline-grid;place-items:center;width:38px;height:38px;border-radius:50%;border:1px solid rgba(215,190,131,.34);color:var(--gold);font:600 .73rem/1 ui-monospace,SFMono-Regular,Consolas,monospace;flex:0 0 auto}
    .story{font-size:clamp(1.12rem,2.4vw,1.35rem);line-height:1.9;margin:18px 0 0;white-space:pre-wrap;overflow-wrap:anywhere}
    .soft-tag{margin-left:auto;border:1px solid rgba(154,200,188,.26);border-radius:999px;padding:3px 9px;color:var(--mint);font:600 .65rem/1.2 ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.05em}
    .wake-card{position:relative;border-color:rgba(224,167,142,.26);background:linear-gradient(135deg,rgba(224,167,142,.08),rgba(255,255,255,.02))}
    .wake-card:before{content:"";position:absolute;left:0;top:22px;bottom:22px;width:2px;border-radius:2px;background:linear-gradient(var(--rose),transparent)}
    .fragment{font-size:clamp(1.05rem,2.2vw,1.24rem);margin:0 0 18px;padding-left:18px;border-left:2px solid rgba(224,167,142,.52);white-space:pre-wrap;overflow-wrap:anywhere}
    .detail-line{margin:9px 0;color:#d3cfc4;font-size:.9rem}.detail-line strong{color:var(--ink)}
    .association-list,.metadata-list,.estimate-list{margin:12px 0 0;padding:0;list-style:none}
    .association-list li{padding:7px 0;border-bottom:1px dashed var(--line)}.association-list li:last-child{border-bottom:0}
    .appraisal-card + .appraisal-card,.review-card + .review-card,.later-card + .later-card{margin-top:14px}
    .later-card{border-color:rgba(215,190,131,.22);background:linear-gradient(135deg,rgba(215,190,131,.045),rgba(255,255,255,.018))}
    .later-text{margin:12px 0 0;padding-left:16px;border-left:2px solid rgba(215,190,131,.38);font-size:1.02rem;line-height:1.85;white-space:pre-wrap;overflow-wrap:anywhere}
    .declaration{color:var(--muted);font-size:.9rem;margin:14px 0 18px}
    .axes{display:grid;gap:9px;padding:16px;border-radius:13px;background:rgba(9,12,23,.38)}
    .axis{display:grid;grid-template-columns:74px minmax(80px,1fr) 160px;gap:12px;align-items:center;font-size:.82rem}
    .axis-name{color:var(--muted)}.axis-track{height:5px;border-radius:99px;background:rgba(255,255,255,.1);overflow:hidden}.axis-track i{display:block;height:100%;width:calc(var(--level)*100%);border-radius:inherit;background:linear-gradient(90deg,var(--mint),var(--gold))}
    .axis-values{text-align:right;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;color:#dad5c9}.axis-values span{color:var(--muted);padding:0 3px}.axis-values small{color:var(--muted);margin-left:5px}
    .estimate-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 18px;margin-top:16px}
    .estimate-list li{display:flex;flex-direction:column;gap:2px;padding:9px 0;border-top:1px solid rgba(255,255,255,.055);font-size:.82rem}.estimate-label{color:var(--muted)}.estimate-state{color:#dad5c9}.estimate-evidence{color:var(--muted);font-size:.76rem}
    code,q{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:.9em;overflow-wrap:anywhere}q{color:#d8d2c4;font-style:italic}
    .review-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 20px;margin:16px 0}
    .review-grid div{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06)}
    dt{color:var(--muted);font-size:.78rem;margin:0}dd{margin:0;text-align:right;font-size:.82rem}
    .review-note{margin:18px 0 12px;padding:18px 20px;border:1px solid rgba(215,190,131,.18);border-radius:14px;background:rgba(215,190,131,.045);color:#e7e0d2;font-size:1rem;white-space:pre-wrap;overflow-wrap:anywhere}.review-note p{margin:0}
    .review-meta,.derived,.reviewer,.muted{color:var(--muted);font-size:.8rem}
    .reviewer{margin:8px 0 0}.reviewer strong{color:var(--ink)}
    .provenance-card{padding-top:22px}
    details summary{cursor:pointer;color:var(--gold);font:600 .76rem/1.4 ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.05em}
    details summary:focus-visible{outline:2px solid var(--gold);outline-offset:5px;border-radius:3px}
    .metadata-list li{display:flex;flex-wrap:wrap;gap:6px 10px;padding:8px 0;border-bottom:1px dashed var(--line);font-size:.8rem}.metadata-key{color:var(--muted);min-width:58px}.metadata-version{color:var(--muted);margin-left:auto}
    .empty-state{margin:0;padding:20px;border:1px dashed var(--line);border-radius:14px;color:var(--muted);text-align:center}
    footer{padding:24px clamp(18px,5vw,58px) 30px;color:var(--muted);font-size:.76rem;border-top:1px solid var(--line)}
    footer p{margin:6px 0}abbr{text-decoration:none;border-bottom:1px dotted var(--muted)}
    @media (max-width:640px){.page{padding:12px 0 28px;width:min(100% - 16px,980px)}.shell{border-radius:22px}.hero{padding:32px 22px}.hero:after{width:74px;height:74px;right:18px;top:24px;opacity:.7}.axis{grid-template-columns:62px 1fr}.axis-track{display:none}.axis-values{text-align:right}.estimate-list,.review-grid{grid-template-columns:1fr}.review-grid div{align-items:baseline}main{padding:0 18px}}
    @media (prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}
  </style>
</head>
<body>
  <div class="page"><div class="shell">
    <header class="hero">
      <p class="eyebrow">Nightvoyage · Local Dreambook</p>
      <h1>夜航梦簿</h1>
      <p class="subtitle">把已经保存的梦放回可读的地方。这里只呈现记录，不生成、不评判、不把梦境变成现实。</p>
      <div class="badges"><span class="badge">虚构素材</span><span class="badge nonfact">非现实事实</span><span class="badge demo">${text(mode)}</span></div>
    </header>
    <main>
      <section aria-labelledby="dream-heading">
        <div class="section-head"><span class="section-kicker">01 / SAVED DREAM</span><h2 id="dream-heading">已保存的原梦</h2></div>
        <p class="section-note">以下按保存顺序阅读。文字是想象事件，不是现实记忆、人格或任务。</p>
        ${scenes}
      </section>
      <section aria-labelledby="wake-heading">
        <div class="section-head"><span class="section-kicker">02 / WAKE</span><h2 id="wake-heading">醒来之后</h2></div>
        <article class="wake-card">
          <p class="fragment">${text(wake.fragment)}</p>
          <p class="detail-line"><strong>摘录来源：</strong>第 ${wake.fragmentBasis.sceneIndex+1} 幕，逐字摘录；逐字出现不等于代表性已通过。</p>
          <p class="detail-line"><strong>醒后模拟余韵：</strong>${number(wake.residue)}。这是独立的模拟强度，不是现实情绪测量。</p>
          <p class="detail-line"><strong>待验证联想（非事实）：</strong></p>${associations}
        </article>
      </section>
      <section aria-labelledby="later-heading">
        <div class="section-head"><span class="section-kicker">03 / LATER RECORDS</span><h2 id="later-heading">后来记录（非原梦）</h2></div>
        <p class="section-note">后来回想与想象续写分别保存为独立子记录；它们不是新的原梦、现实记忆或质量证据。</p>
        ${later}
      </section>
      <section aria-labelledby="appraisal-heading">
        <div class="section-head"><span class="section-kicker">04 / SIMULATED APPRAISAL</span><h2 id="appraisal-heading">模拟评价与依据</h2></div>
        <p class="section-note">方向与幅度来自模型声明或模拟估计；结构校验不等于语义支持，也不等于质量通过。</p>
        ${appraisal.scenes.map(renderAppraisal).join('')}
      </section>
      <section aria-labelledby="review-heading">
        <div class="section-head"><span class="section-kicker">05 / INDEPENDENT OPINIONS</span><h2 id="review-heading">独立评审意见</h2></div>
        <p class="section-note">每条意见单独归属、保留原文；不自动构成人工验收、事实确认或总体质量结论。</p>
        ${reviews}
      </section>
      <section aria-labelledby="provenance-heading">
        <div class="section-head"><span class="section-kicker">06 / PROVENANCE</span><h2 id="provenance-heading">来源与身份</h2></div>
        <div class="provenance-card">
          ${metadataList(view.sourceRefs,view.derivedFrom)}
          <details><summary>展开技术来源</summary><p class="detail-line">梦境编号：<code>${text(dream.id)}</code></p><p class="detail-line">运行编号：<code>${text(dream.runId)}</code></p><p class="detail-line">评价协议：<code>${text(appraisal.protocolVersion??'unknown')}</code></p><p class="detail-line">查看视图：<code>${text(view.viewVersion)}</code></p><p class="detail-line">语义支持：<code>${text(view.semanticSupport)}</code>；质量验收：<code>${String(view.qualityAssessed)}</code>。</p></details>
        </div>
      </section>
    </main>
    <footer>
      <p>本页只读：不生成新梦、不写评审、不修改来源、不删除记录。浏览阶段不调用模型或外部网络。</p>
      <p>${demo?'演示在启动前由仓库内固定虚构 fixture 本地合成；此页面加载不会再生成。':'这是你明确选择的本地已保存梦簿。'}</p>
      <p>原梦、醒来、后来回想、想象续写、模拟评价与已保存独立意见分别成段；后来记录不会混入或改写原梦。浏览器副本、打印件与截图不能因来源后来撤回而被远程擦除。</p>
    </footer>
  </div></div>
</body>
</html>`;
}
