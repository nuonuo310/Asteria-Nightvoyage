// Independent offline protocol. No transport, credentials or live execution.
import {normalizeBudgetCoupledScene} from './coupled-affect-protocol.js';
import {assertAppraisalReviewJsonData} from './appraisal-review-memory.js';
import {buildDeepSeekRequest} from './deepseek-protocol.js';
import {sceneContinuityPrompt} from './scene-continuity-prompt-text.js';
import {hash,snapshot,neutral} from './contract.js';
import {copy,fail} from './store.js';

export const generatedWakeProtocolVersion='generated-wake-offline-v1';
export const generatedWakeRuntimeVersion='offline-generated-wake-runtime-v1';
export const generatedWakeViewVersion='generated-wake-offline-view-v1';
export const generatedWakeRecordOrigin='generated_wake_first_feeling';
export const generatedWakeTextBasis='generated_fictional_wake';
const exact=(value,names)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===names.length&&names.every(name=>Object.hasOwn(value,name));
const sceneRules=[
  'Return exactly event, appraisal, basis and affect. No evidence table, links or numeric evidence references. No explanations or hidden reasoning.',
  'basis contains exactly goal, control and uncertainty. goal is null or [exactGoalText,exactOutcomeText]; control and uncertainty are null or exact event text.',
  'Use goalEffect:0 and basis.goal:null without a stated goal effect. Nonzero goalEffect requires both exact goal and outcome quotations. Mystery alone is not goal damage.',
  'Null control/uncertainty basis requires value 0.5 as UNKNOWN placeholder; another numeric value requires a quotation.',
  'affect is exactly unchanged or an explicit estimated delta with an exact excerpt. Estimated zero also requires an excerpt. Never infer unchanged merely to omit evidence.',
  'Every non-null excerpt must be a nonblank exact contiguous quote from this event, at most 64 Unicode codepoints; repeat the exact text when fields share evidence. No offsets or automatic repairs.',
  'Keep event and every quotation within the same 400-token/1200-JSON-byte cap. Literal quotes do not establish semantic support. No scene invented merely to justify a number.'
];
const wakeRules=[
  'Return exactly fragment, associations and residue, with optional firstFeeling. No other keys and no Markdown.',
  'fragment must be one brief, non-whitespace contiguous excerpt copied EXACTLY from one previousScenes event. Do not paraphrase, combine scenes, change pronouns, add details or continue what happens next.',
  'associations contain zero or one unverified question kept outside fragment. Residue strength is independent and is 0..0.3.',
  'firstFeeling may be omitted to mean not recorded. If supplied it is exactly {\u0022status\u0022:\u0022present\u0022,\u0022text\u0022:\u0022...\u0022}, {\u0022status\u0022:\u0022absent\u0022} or {\u0022status\u0022:\u0022uncertain\u0022}.',
  'A present firstFeeling describes the fictional dream subject just after waking as a short independent fictional narrative. It is not an explanation of the dream, not a continuation, and not a claim about the real user or model. Do not invent a gender, comfort, response or positive ending. Quiet, negative, mixed, uncertain and absent are all allowed.',
  'Present text must be nonblank after trimming and at most 240 Unicode code points. absent and uncertain must not carry text. Never truncate, repair or silently omit an invalid firstFeeling.'
];
export const generatedWakePromptHash=hash({sceneRules,wakeRules,secondScene:sceneContinuityPrompt});
export const generatedWakeIdentity=()=>({promptCandidateHash:generatedWakePromptHash,evidenceEncodingVersion:'direct-quotation-interning-v1',affectEncodingVersion:'explicit-affect-union-v1',wakePolicyVersion:'saved-scene-excerpt-and-generated-first-feeling-v1',firstFeelingPolicyVersion:'generated-fictional-wake-v1'});

function compact(raw){
  if(!exact(raw,['event','appraisal','basis','affect'])||
     !exact(raw.appraisal,['goalEffect','control','uncertainty'])||
     !exact(raw.basis,['goal','control','uncertainty']))fail('invalid_generated_wake_scene');
  const evidence=[];
  let supplied=0;
  const index=quote=>{
    if(typeof quote!=='string'||!quote.trim())fail('invalid_generated_wake_excerpt');
    supplied++;
    let position=evidence.indexOf(quote);
    if(position<0){position=evidence.length;evidence.push(quote);}
    return position;
  };
  const basis=raw.basis;
  let goal=null;
  if(basis.goal!==null){
    if(!Array.isArray(basis.goal)||basis.goal.length!==2)fail('invalid_generated_wake_goal');
    goal=basis.goal.map(index);
  }
  const links={goal,control:basis.control===null?null:index(basis.control),uncertainty:basis.uncertainty===null?null:index(basis.uncertainty)};
  let affect;
  if(exact(raw.affect,['kind'])&&raw.affect.kind==='unchanged')affect={kind:'unchanged'};
  else if(exact(raw.affect,['kind','delta','excerpt'])&&raw.affect.kind==='estimated'){
    affect={kind:'estimated',delta:copy(raw.affect.delta),evidence:index(raw.affect.excerpt)};
  }else fail('invalid_generated_wake_affect');
  return {value:{event:raw.event,appraisal:copy(raw.appraisal),evidence,links,affect},supplied};
}

function wire(saved){
  const evidence=saved.appraisalBasis.evidence;
  return {event:saved.event,appraisal:copy(saved.appraisal),basis:{goal:evidence.goal===null?null:[evidence.goal.goalExcerpt,evidence.goal.outcomeExcerpt],control:evidence.controlExcerpt,uncertainty:evidence.uncertaintyExcerpt},affect:saved.affectDeclaration.kind==='unchanged'?{kind:'unchanged'}:{kind:'estimated',delta:copy(saved.delta),excerpt:evidence.affectExcerpt}};
}

export function normalizeGeneratedWakeScene(raw,before){
  try{assertAppraisalReviewJsonData(raw);assertAppraisalReviewJsonData(before);}catch{fail('invalid_generated_wake_scene');}
  if(!exact(before,['valence','arousal'])||!Number.isFinite(before.valence)||before.valence< -1||before.valence>1||!Number.isFinite(before.arousal)||before.arousal<0||before.arousal>1)fail('invalid_generated_wake_before');
  if(Buffer.byteLength(JSON.stringify(raw))>1200)fail('generated_wake_output_too_large');
  const projected=compact(raw),value=normalizeBudgetCoupledScene(projected.value,before);
  value.appraisalBasis.protocolVersion=generatedWakeProtocolVersion;
  return value;
}

export function normalizeGeneratedWakeCheckpoint(saved,before){
  let value;
  try{
    assertAppraisalReviewJsonData(saved);
    if(saved?.appraisalBasis?.protocolVersion!==generatedWakeProtocolVersion)fail('invalid_generated_wake_checkpoint');
    value=normalizeGeneratedWakeScene(wire(saved),before);
  }catch{fail('invalid_generated_wake_checkpoint');}
  if(hash(value)!==hash(saved))fail('invalid_generated_wake_checkpoint');
  return value;
}

function normalizedScenes(payload,input){
  let before=input.channels.affect.value??neutral();
  return payload.scenes.map(saved=>{
    const value=normalizeGeneratedWakeCheckpoint(saved,before);
    before=value.after;
    return value;
  });
}

export function buildGeneratedWakeRequest(payload){
  try{assertAppraisalReviewJsonData(payload);}catch{fail('invalid_generated_wake_json_data');}
  if(!exact(payload,['snapshot','scenes','stage','index'])||
     !Array.isArray(payload.scenes)||payload.scenes.length>2||
     payload.index!==payload.scenes.length||!['scene','wake'].includes(payload.stage)||
     (payload.stage==='scene'&&payload.index>1)||
     (payload.stage==='wake'&&payload.index!==2))fail('invalid_generated_wake_stage');
  const input=snapshot(payload.snapshot);
  if(payload.snapshot.sources.some(source=>source.grant.modelEgress!==false)||
     input.sources.some(source=>source.grant.modelEgress!==false))fail('offline_no_egress_fixture_required');
  const previous=normalizedScenes(payload,input);
  const request=buildDeepSeekRequest({...payload,snapshot:input,scenes:previous},{model:'deepseek-flash',maxOutputTokens:400});
  const material=JSON.parse(request.body.messages[1].content);
  material.previousScenes=previous;
  request.body.messages[1].content=JSON.stringify(material);
  if(payload.stage==='scene'){
    const example={event:'A fictional scene event.',appraisal:{goalEffect:0,control:.5,uncertainty:.5},basis:{goal:null,control:null,uncertainty:null},affect:{kind:'unchanged'}};
    request.body.messages[0].content=[...sceneRules,`JSON shape example: ${JSON.stringify(example)}`,...(payload.index===1?[sceneContinuityPrompt]:[])].join('\n');
  }else{
    const example={fragment:previous.at(-1).event,associations:[],residue:.1,firstFeeling:{status:'uncertain'}};
    request.body.messages[0].content=[...wakeRules,`JSON shape example: ${JSON.stringify(example)}`].join('\n');
  }
  request.protocolVersion=generatedWakeProtocolVersion;
  if(Buffer.byteLength(JSON.stringify(request.body))>65536)fail('request_too_large');
  return request;
}

const statuses=new Set(['present','absent','uncertain']);
function firstFeeling(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||typeof raw.status!=='string')fail('invalid_generated_wake_first_feeling');
  if(raw.status==='present'){
    if(!exact(raw,['status','text'])||typeof raw.text!=='string'||!raw.text.isWellFormed()||
       !raw.text.trim()||[...raw.text].length>240)fail('invalid_generated_wake_first_feeling');
    return {status:'present',text:raw.text};
  }
  if(!statuses.has(raw.status)||!exact(raw,['status']))fail('invalid_generated_wake_first_feeling');
  return {status:raw.status};
}

export function normalizeGeneratedWakeResponse(data,{previousScenes}={}){
  try{assertAppraisalReviewJsonData(data);}catch{fail('invalid_generated_wake_response');}
  if(!data||typeof data!=='object'||Array.isArray(data)||
     !['fragment','associations','residue'].every(key=>Object.hasOwn(data,key))||
     Object.keys(data).some(key=>!['fragment','associations','residue','firstFeeling'].includes(key)))fail('invalid_generated_wake_response');
  if(typeof data.fragment!=='string'||!data.fragment.trim()||data.fragment.length>20000)fail('invalid_generated_wake_fragment');
  if(!Array.isArray(data.associations)||data.associations.length>1||
     data.associations.some(value=>typeof value!=='string'||!value.trim()||value.length>20000))fail('invalid_generated_wake_associations');
  if(!Number.isFinite(data.residue)||data.residue<0||data.residue>0.3)fail('invalid_generated_wake_residue');
  const scenes=Array.isArray(previousScenes)?previousScenes:[];
  const sceneIndex=scenes.findIndex(scene=>typeof scene?.event==='string'&&scene.event.includes(data.fragment));
  if(sceneIndex<0)fail('generated_wake_fragment_not_grounded');
  const omitted=!Object.hasOwn(data,'firstFeeling');
  const feeling=omitted?null:firstFeeling(data.firstFeeling);
  return {wake:{fragment:data.fragment,associations:[...data.associations],residue:data.residue,fragmentBasis:{kind:'scene_excerpt',sceneIndex}},firstFeeling:copy(feeling),firstFeelingOmitted:omitted};
}
