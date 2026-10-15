// Project-owned protocol. Shared quotations reduce output repetition, not semantic uncertainty.
import { buildDeepSeekRequest, normalizeDeepSeekStage } from './deepseek-protocol.js';
import { normalizeAppraisalScene } from './appraisal-rehearsal.js';
import { hash, neutral } from './contract.js';
import { fail, copy } from './store.js';

export const compactProtocolVersion='compact-appraisal-quotes-v1';
function keys(value,wanted) {return value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===wanted.length&&wanted.every(k=>Object.hasOwn(value,k));}
function canonical(data,before) {
  const value=normalizeAppraisalScene(data,before);
  value.appraisalBasis.protocolVersion=compactProtocolVersion;return value;
}
export function normalizeCompactScene(data,before) {
  if (!Array.isArray(data?.evidence)||data.evidence.length>5||new Set(data.evidence).size!==data.evidence.length||
      !data.evidence.every(q=>typeof q==='string'&&q.trim()&&Array.from(q).length<=64&&typeof data.event==='string'&&data.event.includes(q))||
      !keys(data.links,['goal','control','uncertainty','affect'])) fail('invalid_compact_evidence');
  const used=new Set(),quote=index=>{
    if (!Number.isSafeInteger(index)||index<0||index>=data.evidence.length) fail('invalid_compact_reference');
    used.add(index);return data.evidence[index];
  };
  const links=data.links;
  let goal=null;
  if (links.goal!==null) {
    if (!Array.isArray(links.goal)||links.goal.length!==2) fail('invalid_compact_reference');
    goal={goalExcerpt:quote(links.goal[0]),outcomeExcerpt:quote(links.goal[1])};
  }
  const basis={goal,controlExcerpt:links.control===null?null:quote(links.control),
    uncertaintyExcerpt:links.uncertainty===null?null:quote(links.uncertainty),affectExcerpt:links.affect===null?null:quote(links.affect)};
  if (used.size!==data.evidence.length) fail('unused_compact_evidence');
  return canonical({...data,basis},before);
}
export function normalizeCompactCheckpoint(saved,before) {
  const result=canonical({...saved,basis:saved.appraisalBasis?.evidence},before);
  if (hash(result)!==hash(saved)) fail('invalid_compact_checkpoint');return result;
}
export function compactSceneData(value) {
  const table=[],index=quote=>{
    if (quote===null) return null;
    let i=table.indexOf(quote);if(i<0){i=table.length;table.push(quote);}return i;
  };
  const e=value.appraisalBasis.evidence;
  const links={goal:e.goal===null?null:[index(e.goal.goalExcerpt),index(e.goal.outcomeExcerpt)],
    control:index(e.controlExcerpt),uncertainty:index(e.uncertaintyExcerpt),affect:index(e.affectExcerpt)};
  const raw={event:value.event,appraisal:copy(value.appraisal),delta:copy(value.delta),evidence:table,links};
  // This is an encoding of already supplied evidence, never extraction or a repair call.
  normalizeCompactScene(raw,value.before);return raw;
}
export function buildCompactAppraisalRequest(payload,settings) {
  const request=buildDeepSeekRequest(payload,settings),material=JSON.parse(request.body.messages[1].content);
  let before=material.channels.affect.value??neutral();
  material.previousScenes=payload.scenes.map(saved=>{const value=normalizeCompactCheckpoint(saved,before);before=value.after;return value;});
  const example=payload.stage==='scene'?{
    event:'梦里的人望着停在桌边的纸片。',appraisal:{goalEffect:0,control:0.5,uncertainty:0.5},delta:{valence:0,arousal:0},
    evidence:[],links:{goal:null,control:null,uncertainty:null,affect:null}
  }:{fragment:material.previousScenes.at(-1).event,residue:0.1,associations:[]};
  const additions=payload.stage==='scene'?[
    'Return event, appraisal, delta, evidence and links only. Keep the scene concise; all fields share one 400-token cap. No analysis, explanations, hidden reasoning or repair request.',
    'Use 梦里的人 or omit the subject. Avoid gendered and first/second-person subject pronouns. Source gaps do not authorize new real background facts.',
    'evidence is a UNIQUE table of at most five brief exact contiguous quotations from THIS event, each at most 64 characters. Reuse an index for the same quotation; include no unused quotation. Do not count character offsets.',
    'links indices are zero-based integers into evidence, never text or guessed offsets. links.goal is null or [goalIndex,outcomeIndex]; control, uncertainty and affect each are null or one index.',
    'Only use nonzero goalEffect if this event states a goal and its helped/hindered outcome, with both quotations linked. Mystery alone is not goal damage. With no stated impact use goalEffect:0 and links.goal:null.',
    'Null control/uncertainty links require the corresponding value 0.5, explicitly an UNKNOWN compatibility placeholder. A quotation is required for another value. Null affect requires both deltas zero. Affect can change without a goal effect; unchanged ordinary scenes are welcome.',
    'Quotation existence is literal evidence only, not a semantic guarantee. Numbers must be supported by their linked event, without inventing a scene merely to justify numeric change. No mood quota or forced resolution.'
  ]:[
    'Prefer a distinctive central experience with enough context and negation when selecting the exact excerpt. Representativeness still needs human review. Never paraphrase, combine scenes or add aftermath to improve selection.'
  ];
  const system=request.body.messages[0].content.split('\n').filter(line=>!line.startsWith('JSON shape example:')).join('\n');
  request.body.messages=[{role:'system',content:[system,...additions,`JSON shape example: ${JSON.stringify(example)}`].join('\n')},
    {role:'user',content:JSON.stringify(material)}];
  return request;
}
export function normalizeCompactStage(data,material) {
  if (material.stage!=='scene') return normalizeDeepSeekStage(data,material);
  try {return normalizeCompactScene(data,material.previousAffect);} catch {fail('compact_appraisal_invalid');}
}
