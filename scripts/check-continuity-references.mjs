// Independent fictional counterexamples. Never reads a rejected/user response or Store.
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {neutral,hash} from '../src/contract.js';
import {normalizeContinuityScene,buildContinuityRequest,continuityDiagnostic} from '../src/scene-continuity-protocol.js';
import {buildBudgetCoupledRequest} from '../src/coupled-affect-protocol.js';
import {continuityTrialPinsMatch} from '../src/continuity-trial-config.js';
import {sceneContinuityPrompt} from '../src/scene-continuity-prompt-text.js';
const base=()=>({event:'梦里的人望着桌边的纸片。',appraisal:{goalEffect:0,control:.5,uncertainty:.5},evidence:['桌边的纸片'],links:{goal:null,control:null,uncertainty:null},affect:{kind:'unchanged'}});
export const referenceProbes=[
  ['negative-control',x=>x.links.control=-1,'invalid_compact_reference'],
  ['text-control',x=>x.links.control='0','invalid_compact_reference'],
  ['fraction-control',x=>x.links.control=.5,'invalid_compact_reference'],
  ['out-of-range-uncertainty',x=>x.links.uncertainty=1,'invalid_compact_reference'],
  ['one-index-goal',x=>x.links.goal=[0],'invalid_compact_reference'],
  ['out-of-range-goal',x=>x.links.goal=[0,1],'invalid_compact_reference'],
  ['text-goal',x=>x.links.goal='0','invalid_compact_reference'],
  ['out-of-range-affect',x=>x.affect={kind:'estimated',delta:{valence:.1,arousal:0},evidence:1},'invalid_compact_reference'],
  ['negative-affect-declaration',x=>x.affect={kind:'estimated',delta:{valence:.1,arousal:0},evidence:-1},'coupled_affect_shape_invalid'],
  ['valid-unused-quote',()=>{},'accepted'],
  ['valid-zero-reference',x=>x.links.control=0,'accepted']
];
export function checkContinuityReferences(){
  const results=referenceProbes.map(([id,mutate,expected])=>{const raw=base();mutate(raw);const before=hash(raw);let actual='accepted';try{normalizeContinuityScene(raw,neutral());}catch(e){actual=continuityDiagnostic(e.message).check;}assert.equal(actual,expected,id);assert.equal(hash(raw),before);return {id,expected,actual,scriptedOnly:true};});
  const seed=JSON.parse(fs.readFileSync(new URL('../fixtures/quality/sparse-context.json',import.meta.url),'utf8')),payload={stage:'scene',index:0,snapshot:seed,scenes:[]},settings={model:'deepseek-flash',maxOutputTokens:400},candidate=buildContinuityRequest(payload,settings),baseline=buildBudgetCoupledRequest(payload,settings);
  assert.equal(hash(candidate.body),hash(baseline.body));assert.equal(candidate.body.messages[0].content.includes(sceneContinuityPrompt),false);assert.equal(continuityTrialPinsMatch(),true);
  return {schemaVersion:1,kind:'fictional_reference_guard_review',scriptedCases:results.length,results,firstSceneBodyMatchesBaseline:true,secondSceneCandidatePromptAppliedToFirst:false,currentTrialPinsMatch:true,discardedLiveResponseAvailable:false,liveFailureSpecificReference:'unknown',automaticReferenceRepair:false,realModelRequests:0,storeOpened:false,persistentRuntimeWrites:0,semanticSupport:'not_assessed',qualityAssessed:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const env=process.env,native=globalThis.fetch;let keyReads=0,requests=0;
  process.env=new Proxy(env,{get(t,k){if(k==='NIGHTVOYAGE_DEEPSEEK_KEY'){keyReads++;throw Error('credential_forbidden');}return Reflect.get(t,k);}});globalThis.fetch=()=>{requests++;throw Error('native_fetch_forbidden');};
  try{const result=checkContinuityReferences();assert.equal(keyReads,0);assert.equal(requests,0);console.log(JSON.stringify({command:'node scripts/check-continuity-references.mjs',node:process.version,platform:process.platform,...result,credentialReads:keyReads},null,2));}finally{process.env=env;globalThis.fetch=native;}
}
