// Pure presentation for the validated generated-wake read projection.
// Reading layout and palette adapt #95@ce0153fb43a19804af3f9163a843ddfdb4eb8404
// scripts/dreambook-story-html.mjs (blob 14b45a2dbb1b43afc47bba99a5c336af87211764).
// This module imports nothing from #95 and is not a cherry-pick of that branch.
import {assertGeneratedWakeView} from '../src/generated-wake-records.js';

const isControl=code=>code<9||code===11||code===12||code===13||code>=14&&code<=31||code>=127&&code<=159;
const visibleControl=ch=>isControl(ch.codePointAt(0))?String.fromCharCode(92)+'u'+ch.codePointAt(0).toString(16).padStart(4,'0'):ch;
const entities=Object.freeze({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'});

export function escapeGeneratedWakeStoryText(value){
  const clean=Array.from(String(value),visibleControl).join('');
  return clean.replace(/[&<>"']/g,ch=>entities[ch]);
}

const text=value=>escapeGeneratedWakeStoryText(value);
const number=value=>Number.isFinite(value)?String(Math.round(value*1000)/1000):'不可用';
const chapter=(title,id,content,className)=>`<section class="chapter ${className}" aria-labelledby="${id}"><div class="chapter-title"><span class="chapter-rule" aria-hidden="true"></span><h2 id="${id}">${title}</h2></div>${content}</section>`;

function renderDream(view){
  const passages=view.dream.scenes.map((scene,index)=>`<section class="passage" aria-label="原梦第 ${index+1} 幕"><p class="scene-index">第 ${index+1} 幕</p><p>${text(scene.event)}</p></section>`).join('\n');
  return chapter('原梦','dream-title',`<div class="passages">${passages}</div>`,'dream');
}

function renderWake(view){
  const association=view.wake.associations.length?`<p class="association">梦里还留下一句没有答案的话：<q>${text(view.wake.associations[0])}</q></p>`:'';
  return chapter('醒来残片','wake-title',`<p class="fragment">${text(view.wake.fragment)}</p>${association}`,'wake');
}

function renderFeeling(view){
  const feeling=view.firstFeeling;
  if(feeling===null)return '';
  const copy=feeling.status==='present'?`<p class="feeling-copy">${text(feeling.text)}</p>`:
    feeling.status==='absent'?'<p class="feeling-quiet">无（明确记为无）。</p>':
      '<p class="feeling-quiet">刚醒时的心情，说不清（不确定）。</p>';
  return chapter('刚醒心情','feeling-title',copy,'feeling');
}

function renderResidue(view){
  const strength=number(view.residue.strength);
  return chapter('模拟余韵','residue-title',`<p class="residue-copy">模拟余韵强度：${strength}。这是独立模拟估计，不是刚醒心情，也不是持续心情记录。</p>`,'residue');
}

function renderLater(view){
  if(!view.later.length)return '';
  const items=view.later.map(item=>`<li>${text(item.text)}</li>`).join('\n');
  return chapter('后来回想','later-title',`<ol class="later-list">${items}</ol>`,'later');
}

const styles=`:root{color-scheme:dark;--night:#141826;--cocoa:#282027;--deep:#101421;--milk:#f4ede4;--quiet:#c1bec8;--rose:#d8b2b8;--sky:#aebbd0;--gold:#dcc9a7}
*{box-sizing:border-box}
html{background:var(--deep)}
body{margin:0;min-height:100vh;overflow-x:clip;color:var(--milk);background:radial-gradient(ellipse 40rem 27rem at 86% -3%,rgba(194,176,171,.11),transparent 74%),radial-gradient(ellipse 40rem 34rem at 0% 72%,rgba(126,150,177,.09),transparent 75%),linear-gradient(157deg,var(--cocoa) -24%,var(--night) 32%,var(--deep) 78%,#24232e 110%);font-family:"Noto Sans CJK SC","Source Han Sans SC","Microsoft YaHei",sans-serif}
.page{position:relative;width:min(100% - 40px,660px);margin:auto;padding:clamp(58px,10vw,100px) 0 80px}
.page:before{content:"";position:absolute;top:0;right:0;width:min(70vw,360px);height:430px;background:radial-gradient(ellipse at 50% 34%,rgba(232,210,185,.075),transparent 68%);pointer-events:none}
header{position:relative;margin-bottom:clamp(62px,10vw,94px)}
.mark{margin:0 0 32px;color:var(--gold);font-size:.76rem;letter-spacing:.32em}
.moon{position:absolute;right:0;top:-10px;width:clamp(92px,19vw,168px);height:clamp(132px,25vw,226px);border:1px solid rgba(233,213,194,.19);border-radius:52% 48% 49% 51%/55% 45% 55% 45%;transform:rotate(18deg);box-shadow:inset 0 0 42px rgba(222,195,181,.045),0 0 48px rgba(218,189,171,.035);pointer-events:none}
.moon:after{content:"";position:absolute;inset:14px;border:1px solid rgba(233,213,194,.065);border-radius:inherit}
h1{position:relative;margin:0;font:400 clamp(2.45rem,8vw,4.1rem)/1.24 "Noto Serif CJK SC","Source Han Serif SC","Songti SC",serif;letter-spacing:.06em;text-shadow:0 2px 24px rgba(15,16,25,.2)}
.intro{position:relative;margin:24px 0 0;max-width:28em;color:var(--quiet);font-size:.86rem;line-height:1.8;letter-spacing:.03em}
.chapter{position:relative;margin:0 0 clamp(58px,9vw,88px)}
.chapter-title{display:flex;align-items:center;gap:14px;margin:0 0 26px}
.chapter-rule{width:32px;height:1px;flex:none;background:rgba(216,201,184,.28)}
h2{margin:0;color:var(--quiet);font:400 .9rem/1.6 "Noto Sans CJK SC","Microsoft YaHei",sans-serif;letter-spacing:.15em}
.passages{position:relative;margin-left:4px}
.passage{position:relative;margin:0;padding:0 0 clamp(40px,7vw,64px) clamp(24px,4vw,36px);border-left:1px solid rgba(216,201,184,.22)}
.passage:before{content:"";position:absolute;left:-3px;top:.7em;width:5px;height:5px;border-radius:50%;background:var(--gold);box-shadow:0 0 14px rgba(226,207,178,.38)}
.passage:last-child{padding-bottom:8px}
.scene-index{margin:0 0 12px;color:var(--gold);font-size:.7rem;letter-spacing:.2em}
.passage p:last-child{margin:0;max-width:34em;white-space:pre-wrap;overflow-wrap:anywhere;font-size:clamp(1.06rem,2.7vw,1.2rem);line-height:2.1;letter-spacing:.02em}
.wake{padding:clamp(38px,7vw,58px) clamp(24px,6vw,44px) 36px;background:linear-gradient(135deg,rgba(236,226,219,.085),rgba(183,191,209,.025) 68%,transparent);border-top:1px solid rgba(240,226,210,.2);border-left:1px solid rgba(240,226,210,.1);border-radius:0 0 0 36px}
.wake:before{content:"✧";position:absolute;top:-.65em;left:clamp(24px,6vw,44px);padding:0 12px;background:var(--deep);color:var(--rose);font-size:1.35rem;line-height:1}
.fragment{margin:0;max-width:30em;color:var(--milk);font:400 clamp(1.2rem,3.7vw,1.5rem)/1.95 "Noto Serif CJK SC","Source Han Serif SC","Songti SC",serif;white-space:pre-wrap;overflow-wrap:anywhere}
.association{margin:clamp(24px,4vw,34px) 0 0;max-width:32em;color:var(--quiet);font-size:.88rem;line-height:1.85;overflow-wrap:anywhere}
.association q{color:var(--sky)}
.feeling{padding:clamp(26px,5vw,38px) 0 0;border-top:1px solid rgba(216,178,184,.16)}
.feeling-copy{margin:0;max-width:32em;color:#f2dfe0;font:400 clamp(1.12rem,3vw,1.32rem)/1.95 "Noto Serif CJK SC","Source Han Serif SC","Songti SC",serif;white-space:pre-wrap;overflow-wrap:anywhere}
.feeling-quiet{margin:0;color:var(--quiet);font-size:.96rem;line-height:1.9}
.later-list{margin:0;padding:0 0 0 1.35em;max-width:34em;color:var(--milk)}
.later-list li{padding:0 0 18px 8px;line-height:1.95;overflow-wrap:anywhere}
.later-list li::marker{color:var(--gold);font-size:.82em}
.technical{margin-top:clamp(48px,8vw,72px);border-top:1px solid rgba(216,201,184,.18);color:var(--quiet);font-size:.8rem;line-height:1.8}
.technical summary{cursor:pointer;padding:18px 0 10px;color:var(--sky);letter-spacing:.08em}
.technical summary:focus-visible{outline:1px solid var(--gold);outline-offset:4px}
.technical-body{padding:4px 0 0;overflow-wrap:anywhere}
.technical-body p{margin:0 0 12px}
.technical strong{color:var(--milk);font-weight:400}
.unavailable{border-left:1px solid rgba(216,201,184,.22);padding-left:24px}
.unavailable p{margin:0;color:var(--quiet);line-height:1.9}
footer{margin-top:72px;color:var(--quiet);font-size:.8rem;line-height:1.8;opacity:.78}
@media(max-width:480px){.page{width:min(100% - 36px,660px);padding-top:64px}.moon{right:0;top:12px;opacity:.72}.mark{margin-bottom:40px}.passage{padding-left:23px}.wake{margin-left:-6px;margin-right:-6px;padding-left:26px;padding-right:26px}.wake:before{left:20px}.chapter-title{gap:11px}.chapter-rule{width:24px}}
@media(prefers-reduced-motion:reduce){*,*:before,*:after{animation:none!important;transition:none!important}}`;

function shell(body,demo){
  const note=demo?'<p class="intro">这是一则虚构演示；梦、心情与后来回想均为固定测试输入。</p>':'';
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src 'none'; font-src 'none'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'">
  <title>夜航 · 醒来以后</title>
  <style>${styles}</style>
</head>
<body>
  <main class="page">
    <header><span class="moon" aria-hidden="true"></span><p class="mark">夜航 · 离线梦簿</p><h1>醒来以后</h1>${note}</header>
    ${body}
    <footer>梦里的事，仍留在梦里。</footer>
  </main>
</body>
</html>`;
}

export function renderGeneratedWakeStoryHtml(view,{demo=false}={}){
  if(view===null)return shell('<section class="unavailable" aria-labelledby="unavailable-title"><div class="chapter-title"><span class="chapter-rule" aria-hidden="true"></span><h2 id="unavailable-title">不可读取</h2></div><p>这场梦现在不可读取。</p></section>',demo);
  assertGeneratedWakeView(view);
  return shell(`<article class="story" aria-label="离线梦簿">${renderDream(view)}${renderWake(view)}${renderFeeling(view)}${renderResidue(view)}${renderLater(view)}</article>`,demo);
}
