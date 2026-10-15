// Pure offline byte-boundary audit. Builds inert requests; never dispatches them.
import { normalizeCoupledScene, buildCoupledRequest, coupledAffectVersion } from './coupled-affect-offline.js';
import { parseDeepSeekResponse } from './deepseek-protocol.js';
import { compactValidationDiagnostic } from './validation-diagnostic.js';
import { neutral, safeId } from './contract.js';
import { copy, fail } from './store.js';
const settings=Object.freeze({model:'deepseek-flash',maxOutputTokens:400});
const bytes=x=>Buffer.byteLength(JSON.stringify(x),'utf8');
const check=e=>['invalid_coupled_scene_shape','coupled_affect_shape_invalid','provider_empty_or_oversized_content'].includes(e?.message)?e.message:compactValidationDiagnostic(e?.message).check;
function examine(id,raw) {
  let shapeAccepted=false,shapeCheck=null,parserAccepted=false,parserCheck=null;
  try {normalizeCoupledScene(raw,neutral());shapeAccepted=true;}catch(e){shapeCheck=check(e);}
  try {parseDeepSeekResponse({status:200,body:{model:settings.model,choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(raw)}}],usage:{prompt_tokens:100,completion_tokens:400,total_tokens:500}}},settings);parserAccepted=true;}catch(e){parserCheck=check(e);}
  return {id,jsonBytes:bytes(raw),shapeAccepted,shapeCheck,jsonParserAccepted:parserAccepted,parserCheck,
    passesBothGuards:shapeAccepted&&parserAccepted,claimedOutputTokens:400,actualModelTokenCount:null};
}
function ordinary(event) {return {event,appraisal:{goalEffect:0,control:0.5,uncertainty:0.5},evidence:[],links:{goal:null,control:null,uncertainty:null},affect:{kind:'unchanged'}};}
function atBytes(target) {const value=ordinary('梦里的人看着字条。');value.event+='x'.repeat(target-bytes(value));return value;}
export function reviewCoupledSizes({fixture,seed}={}) {
  if(fixture?.materialKind!=='fictional'||fixture.scriptedOnly!==true||!Array.isArray(fixture.cases)||
    fixture.cases.some(c=>!safeId(c.id))||seed?.materialKind!=='fictional'||!Array.isArray(seed.sources)||seed.sources.some(s=>s.grant?.modelEgress!==false))fail('fictional_size_review_required');
  const pairs=copy(fixture.cases),rows=pairs.map(c=>examine(c.id,c.coupled));
  const quotes=['甲','乙','丙','丁','戊'].map(x=>x.repeat(64));
  const maximal={event:'梦里的人看着五张字条：'+quotes.join('，'),appraisal:{goalEffect:1,control:0.8,uncertainty:0.7},
    evidence:quotes,links:{goal:[0,1],control:2,uncertainty:3},affect:{kind:'estimated',delta:{valence:0.1,arousal:0.1},evidence:4}};
  const boundaries=[examine('exact-byte-limit',atBytes(1200)),examine('one-byte-over',atBytes(1201)),
    examine('five-maximal-quotations',maximal),examine('escaped-json-expansion',ordinary('梦里的人看着字条。'+'"\\\n'.repeat(250))),
    examine('astral-exact-byte-limit',ordinary('梦里的人看着字条。'+'🌙'.repeat(250))),examine('astral-over-byte-limit',ordinary('梦里的人看着字条。'+'🌙'.repeat(251)))];
  const request=buildCoupledRequest({stage:'scene',index:0,snapshot:seed,scenes:[]},settings);
  const large=copy(seed);large.sources=Array.from({length:5},(_,i)=>({id:`size-only-${i}`,version:'1',text:'x'.repeat(20000),grant:{dream:true,modelEgress:false}}));large.channels.memory={availability:'present',sourceIds:large.sources.map(s=>s.id)};
  const oversized=buildCoupledRequest({stage:'scene',index:0,snapshot:large,scenes:[]},settings);
  return {schemaVersion:1,protocolVersion:coupledAffectVersion,materialKind:'fictional',generatedEventOrigin:'dream',isRealityFact:false,
    unit:'UTF-8 JSON bytes; not model tokens',outputTokenCap:400,responseByteSafetyCeiling:1200,actualModelTokenCount:null,
    responseParserUsage:'independent synthetic claims only; not provider usage',rows,boundaries,
    requests:{fictionalFixtureBodyBytes:bytes(request.body),syntheticLargeBodyBytes:bytes(oversized.body),futureGatedRequestByteCeiling:65536,
      syntheticLargeRequiresPreDispatchRejection:bytes(oversized.body)>65536,offlineBuilderAppliesGatedByteCeiling:false},
    realModelRequests:0,persistentWrites:0,semanticSupport:'not_assessed',modelComplianceImproved:'not_assessed',qualityAssessed:false};
}
