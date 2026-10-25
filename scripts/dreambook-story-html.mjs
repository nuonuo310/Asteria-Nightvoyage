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
    :root{color-scheme:dark;--night:#141826;--cocoa:#282027;--deep:#101421;--milk:#f4ede4;--quiet:#c1bec8;--rose:#d8b2b8;--sky:#aebbd0;--gold:#dcc9a7}
    *{box-sizing:border-box}
    html{background:var(--deep)}
    body{margin:0;min-height:100vh;color:var(--milk);background:radial-gradient(ellipse 40rem 27rem at 86% -3%,rgba(194,176,171,.11),transparent 74%),radial-gradient(ellipse 40rem 34rem at 0% 72%,rgba(126,150,177,.09),transparent 75%),linear-gradient(157deg,var(--cocoa) -24%,var(--night) 32%,var(--deep) 78%,#24232e 110%);font-family:"Noto Sans CJK SC","Source Han Sans SC","Microsoft YaHei",sans-serif}
    .page{position:relative;width:min(100% - 48px,660px);margin:auto;padding:clamp(64px,10vw,104px) 0 88px}
    .page:before{content:"";position:absolute;top:0;right:-12vw;width:min(46vw,360px);height:430px;background:radial-gradient(ellipse at 50% 34%,rgba(232,210,185,.075),transparent 68%);pointer-events:none}
    header{position:relative;margin-bottom:clamp(66px,11vw,98px)}
    .mark{margin:0 0 34px;color:var(--gold);font-size:.76rem;letter-spacing:.36em}
    .moon{position:absolute;right:2%;top:-10px;width:clamp(100px,20vw,180px);height:clamp(140px,27vw,240px);border:1px solid rgba(233,213,194,.19);border-radius:52% 48% 49% 51%/55% 45% 55% 45%;transform:rotate(18deg);box-shadow:inset 0 0 42px rgba(222,195,181,.045),0 0 48px rgba(218,189,171,.035);pointer-events:none}
    .moon:after{content:"";position:absolute;inset:14px;border:1px solid rgba(233,213,194,.065);border-radius:inherit}
    h1{position:relative;margin:0;font:400 clamp(2.65rem,8vw,4.35rem)/1.24 "Noto Serif CJK SC","Source Han Serif SC","Songti SC",serif;letter-spacing:.065em;text-shadow:0 2px 24px rgba(15,16,25,.2)}
    .intro{position:relative;margin:22px 0 0;color:var(--quiet);font-size:.88rem;line-height:1.8;letter-spacing:.035em}
    [aria-label="梦的正文"]{position:relative;margin-left:6px}
    .passage{position:relative;margin:0;padding:0 0 clamp(44px,8vw,72px) clamp(24px,4vw,36px);border-left:1px solid rgba(216,201,184,.22)}
    .passage:before{content:"";position:absolute;left:-3px;top:.85em;width:5px;height:5px;border-radius:50%;background:var(--gold);box-shadow:0 0 14px rgba(226,207,178,.38)}
    .passage:last-child{padding-bottom:8px}
    .passage p{margin:0;max-width:34em;white-space:pre-wrap;overflow-wrap:anywhere;font-size:clamp(1.09rem,2.7vw,1.24rem);line-height:2.12;letter-spacing:.022em}
    .wake{position:relative;margin-top:clamp(82px,15vw,126px);padding:clamp(42px,8vw,66px) clamp(24px,6vw,44px) 36px;background:linear-gradient(135deg,rgba(236,226,219,.085),rgba(183,191,209,.025) 68%,transparent);border-top:1px solid rgba(240,226,210,.20);border-left:1px solid rgba(240,226,210,.10);border-radius:0 0 0 36px}
    .wake:before{content:"✧";position:absolute;top:-.65em;left:clamp(24px,6vw,44px);padding:0 12px;background:var(--deep);color:var(--rose);font-size:1.35rem;line-height:1}
    h2{margin:0 0 24px;color:var(--quiet);font:400 .89rem/1.6 "Noto Sans CJK SC","Microsoft YaHei",sans-serif;letter-spacing:.16em}
    .fragment{margin:0;max-width:30em;color:var(--milk);font:400 clamp(1.24rem,3.7vw,1.55rem)/1.95 "Noto Serif CJK SC","Source Han Serif SC","Songti SC",serif;white-space:pre-wrap;overflow-wrap:anywhere}
    footer{margin-top:88px;color:var(--quiet);font-size:.8rem;line-height:1.8;opacity:.78}
    @media(max-width:480px){.page{width:min(100% - 40px,660px);padding-top:70px}.moon{right:1%;top:12px;opacity:.75}.mark{margin-bottom:42px}.passage{padding-left:23px}.wake{margin-left:-8px;margin-right:-8px;padding-left:28px;padding-right:28px}.wake:before{left:22px}}
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
