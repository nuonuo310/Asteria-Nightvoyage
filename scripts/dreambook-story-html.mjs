// A quiet reading projection of the same validated Dreambook view.
// Technical identity, review and provenance remain available in the existing view.
import {escapeDreambookText} from './dreambook-view-html.mjs';
import {renderContentReview} from '../src/content-review.js';

export function renderDreambookStoryHtml(view,{demo=false}={}){
  // Keep the strict view gate used by the technical projection.
  renderContentReview(view);
  const scenes=view.narrative.dream.scenes;
  const wake=view.narrative.wake;
  const escape=escapeDreambookText;
  const passages=scenes.map((scene,index)=>`<section class="passage" aria-label="梦的第 ${index+1} 段"><p>${escape(scene.event)}</p></section>`).join('\n');
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <title>夜航 · 一场梦</title>
  <style>
    :root{color-scheme:dark;--night:#151928;--night-deep:#101422;--milk:#f0e9df;--quiet:#bcb8c2;--rose:#d6abae;--gold:#d8c5a1}
    *{box-sizing:border-box}
    html{background:var(--night-deep)}
    body{margin:0;min-height:100vh;color:var(--milk);background:radial-gradient(ellipse 34rem 25rem at 85% 5%,rgba(198,178,167,.10),transparent 72%),radial-gradient(ellipse 30rem 36rem at 8% 74%,rgba(150,158,185,.07),transparent 75%),linear-gradient(165deg,var(--night),var(--night-deep));font-family:"Noto Sans CJK SC","Source Han Sans SC","Microsoft YaHei",sans-serif}
    .page{width:min(100% - 44px,680px);margin:auto;padding:clamp(64px,12vw,116px) 0 82px}
    header{position:relative;margin-bottom:clamp(48px,10vw,88px)}
    .mark{margin:0 0 22px;color:var(--gold);font-size:.75rem;letter-spacing:.32em}
    .moon{position:absolute;right:4px;top:-36px;width:100px;height:100px;border:1px solid rgba(216,197,161,.25);border-radius:50%;box-shadow:0 0 0 24px rgba(216,197,161,.025);pointer-events:none}
    h1{position:relative;margin:0;font:400 clamp(2.5rem,10vw,4.8rem)/1.23 "Noto Serif CJK SC","Source Han Serif SC","Songti SC",serif;letter-spacing:.04em}
    .intro{margin:20px 0 0;color:var(--quiet);font-size:.92rem;letter-spacing:.05em}
    .passage{margin:0 0 clamp(36px,8vw,62px);padding:0 0 0 clamp(18px,4vw,30px);border-left:1px solid rgba(216,197,161,.25)}
    .passage p{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;font-size:clamp(1.08rem,2.7vw,1.27rem);line-height:2.05;letter-spacing:.025em}
    .wake{margin-top:clamp(68px,14vw,108px);padding-top:42px;border-top:1px solid rgba(240,233,223,.16)}
    .wake:before{content:"✧";display:block;color:var(--rose);font-size:1.3rem;line-height:1;margin-bottom:26px}
    h2{margin:0 0 20px;color:var(--quiet);font:400 .92rem/1.5 "Noto Sans CJK SC","Microsoft YaHei",sans-serif;letter-spacing:.16em}
    .fragment{margin:0;color:var(--milk);font:400 clamp(1.28rem,4vw,1.7rem)/1.85 "Noto Serif CJK SC","Source Han Serif SC","Songti SC",serif;white-space:pre-wrap;overflow-wrap:anywhere}
    footer{margin-top:100px;color:var(--quiet);font-size:.78rem;line-height:1.8;opacity:.8}
    @media(max-width:480px){.page{width:min(100% - 40px,680px);padding-top:72px}.moon{width:72px;height:72px;right:3px;top:-30px}.intro{max-width:18rem}.passage{padding-left:17px}}
    @media(prefers-reduced-motion:reduce){*,*:before,*:after{animation:none!important;transition:none!important}}
  </style>
</head>
<body>
  <main class="page">
    <header><span class="moon" aria-hidden="true"></span><p class="mark">夜航</p><h1>一场梦</h1>${demo?'<p class="intro">这是一场虚构演示梦。</p>':''}</header>
    <div aria-label="梦的正文">${passages}</div>
    <section class="wake" aria-labelledby="wake-title"><h2 id="wake-title">醒来时，留下的</h2><p class="fragment">${escape(wake.fragment)}</p></section>
    <footer>梦里的事，仍留在梦里。</footer>
  </main>
</body>
</html>`;
}
