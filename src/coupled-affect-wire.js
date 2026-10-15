// Explicit wire decoding only; never fills missing fields or repairs supplied deltas.
import { copy, fail } from './store.js';
const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
export function decodeCoupledScene(raw) {
  if(!exact(raw,['event','appraisal','evidence','links','affect'])||!exact(raw.links,['goal','control','uncertainty']))fail('invalid_coupled_scene_shape');
  const a=raw.affect;let delta,reference;
  if(exact(a,['kind'])&&a.kind==='unchanged') {delta={valence:0,arousal:0};reference=null;}
  else if(exact(a,['kind','delta','evidence'])&&a.kind==='estimated'&&exact(a.delta,['valence','arousal'])&&Number.isSafeInteger(a.evidence)&&a.evidence>=0) {
    delta=copy(a.delta);reference=a.evidence;
  } else fail('coupled_affect_shape_invalid');
  // Declared unchanged encodes zero. Never infer a branch or drop supplied fields.
  // Referenced estimates preserve every supplied number; all original v2 guards run.
  return {event:raw.event,appraisal:copy(raw.appraisal),evidence:copy(raw.evidence),
    links:{...copy(raw.links),affect:reference},delta};
}
