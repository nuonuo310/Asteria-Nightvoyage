import fs from 'node:fs';
import { normalizeAppraisalScene } from '../src/appraisal-rehearsal.js';
import { compactSceneData } from '../src/compact-appraisal-protocol.js';
import { reviewUnusedQuotations, unusedQuotationReviewVersion } from '../src/unused-quotation-review.js';
import { neutral } from '../src/contract.js';

// Explicitly offline, no input path, key loading, Store opening or provider.
globalThis.fetch=()=>{throw new Error('native_transport_forbidden_in_offline_review');};
const probes=JSON.parse(fs.readFileSync(new URL('../fixtures/appraisal-probes.json',import.meta.url)));
if(probes.materialKind!=='fictional'||probes.scriptedSimulatorOnly!==true)throw new Error('fictional_scripted_probes_required');
const context=raw=>({materialKind:'fictional',origin:'dream',isRealityFact:false,raw,before:neutral()});
const unused=raw=>({...structuredClone(raw),evidence:[Array.from(raw.event)[0],...raw.evidence],links:{
  goal:raw.links.goal===null?null:raw.links.goal.map(i=>i+1),control:raw.links.control===null?null:raw.links.control+1,
  uncertainty:raw.links.uncertainty===null?null:raw.links.uncertainty+1,affect:raw.links.affect===null?null:raw.links.affect+1}});
const results=[];
for(const p of probes.scenes){const raw=compactSceneData(normalizeAppraisalScene(p,neutral()));
  results.push({id:p.id+'-unchanged',...reviewUnusedQuotations(context(raw))});
  results.push({id:p.id+'-unused-inserted',...reviewUnusedQuotations(context(unused(raw)))});
}
const ordinary=compactSceneData(normalizeAppraisalScene(probes.scenes[0],neutral()));
for(const [id,mutate]of [
  ['missing-affect-basis',x=>x.delta.arousal=0.1],['missing-control-basis',x=>x.appraisal.control=0],
  ['missing-goal-basis',x=>x.appraisal.goalEffect=-1],['invalid-index',x=>x.links.control=99],
  ['ungrounded-unused-quote',x=>x.evidence[0]='not in event'],['duplicate-unused-quote',x=>x.evidence.push(x.evidence[0])],
  ['overlong-unused-quote',x=>{x.event='波'.repeat(65);x.evidence=[x.event];}]
]){const raw=unused(ordinary);mutate(raw);results.push({id,...reviewUnusedQuotations(context(raw))});}
console.log(JSON.stringify({command:'node scripts/check-unused-quotation-policy.mjs',node:process.version,platform:process.platform,
  reviewVersion:unusedQuotationReviewVersion,cases:results.length,realModelRequests:0,liveProtocolChanged:false,
  userResponseReconstructed:false,qualityAssessed:false,results},null,2));
