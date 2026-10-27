// Fixed fictional-only three-run protocol. No transport, credential or Store access.
import {createHash} from 'node:crypto';
import {hash,neutral,snapshot} from '../../src/contract.js';
import {maximumCost} from '../../src/budget-ledger.js';
import {parseDeepSeekResponse} from '../../src/deepseek-protocol.js';
import {generatedWakePromptSource,generatedWakeProtocolVersion,normalizeGeneratedWakeCheckpoint,normalizeGeneratedWakeResponse,normalizeGeneratedWakeScene} from '../../src/generated-wake-protocol.js';
import {copy,fail} from '../../src/store.js';

export const richSampleProtocolVersion='nv-rich-fictional-dream-sample-v1';
export const richSampleRuntimeVersion='nv-rich-fictional-dream-sample-fake-runtime-v1';
export const richSamplePromptVersion='nv-rich-fictional-dream-sample-prompt-v1';
export const richSampleNormalizationVersion='nv-rich-fictional-dream-sample-normalization-v1';
export const richSampleExtractionVersion='nv-rich-fictional-dream-sample-extraction-v1';
export const richSampleRecordOrigin='rich_fictional_dream_sample_feeling';
export const richSampleTextBasis='rich_fictional_dream_sample_wake';
export const richSampleModel='deepseek-flash';
export const richSampleMaxOutputTokens=400;
export const richSampleRequestByteLimit=16384;
export const richSampleScenesPerRun=3;
export const richSampleCallsPerRun=4;
export const richSampleRunCount=3;
export const richSampleMaxCalls=12;
export const richSampleRunRequestIds=Object.freeze([
  'nv-rich-dream-sample-run-1','nv-rich-dream-sample-run-2','nv-rich-dream-sample-run-3'
]);
export const richSampleRunIds=Object.freeze([
  'nv-rich-dream-sample-dream-1','nv-rich-dream-sample-dream-2','nv-rich-dream-sample-dream-3'
]);
export const richSampleSessionIds=Object.freeze([
  'nv-rich-dream-sample-session-1','nv-rich-dream-sample-session-2','nv-rich-dream-sample-session-3'
]);

export const richSampleSource=Object.freeze({
  id:'rich-fictional-dream-sample-memory',version:'1',
  text:'两个虚构人物曾在雨停后走过一条小街。一个人轻敲杯沿两下，说有件事下次再讲；另一个人保留了一张折过的车票，票面日期后来模糊了。除此之外没有关于两人关系、那件事的内容或后来结局的资料。'
});
export const richSampleSourceHash=createHash('sha256').update(richSampleSource.text,'utf8').digest('hex');
export const richSampleAllowanceId='nv-rich-fictional-dream-sample-001';

export function richSampleFixedSnapshot(){
  return {
    id:'rich-fictional-dream-sample-snapshot',version:'1',materialKind:'fictional',
    sources:[{...richSampleSource,grant:{dream:true,modelEgress:true}}],
    channels:{
      memory:{availability:'present',sourceIds:[richSampleSource.id]},
      background:{availability:'unavailable',sourceIds:[]},
      affect:{availability:'absent',sourceIds:[]},
      mind:{availability:'denied',sourceIds:[]},
      intents:{availability:'stale',sourceIds:[]}
    }
  };
}
export const richSampleCanonicalSnapshot=snapshot(richSampleFixedSnapshot());
export const richSampleSourceRefs=Object.freeze([Object.freeze({id:richSampleSource.id,version:richSampleSource.version})]);

const priceReference='https://api-docs.deepseek.com/zh-cn/quick_start/pricing/';
const priceCheckedAt=Date.parse('2026-10-27T00:00:00Z');
const allowanceExpiresAt=Date.parse('2026-10-28T00:00:00Z');
export const richSamplePriceSnapshot=Object.freeze({
  source:priceReference,checkedAt:priceCheckedAt,currency:'CNY',peak:true,
  modelAlias:richSampleModel,observedModelAlias:'DeepSeek-V4.1-Flash-1017',modelAliasMutable:true,
  inputMicroCnyPerMillion:2000000,outputMicroCnyPerMillion:8000000,
  contextTokenLimit:16384,maxOutputTokens:richSampleMaxOutputTokens,
  scenesPerRun:richSampleScenesPerRun,callsPerRun:richSampleCallsPerRun,maxRuns:richSampleRunCount,maxCalls:richSampleMaxCalls,
  requestByteLimit:richSampleRequestByteLimit,conservativeTokensPerRequestByte:1,
  worstInputTokens:196608,worstOutputTokens:4800,worstMicroCny:431616,allowanceCapMicroCny:480000
});
export const richSamplePriceSnapshotHash=hash(richSamplePriceSnapshot);

function allowance(mode){
  return {
    id:richSampleAllowanceId,mode,approved:true,expiresAt:allowanceExpiresAt,
    limits:{maxRuns:richSampleRunCount,maxCalls:richSampleMaxCalls,maxMicroCny:480000},
    pricing:{model:richSampleModel,contextTokenLimit:16384,inputMicroCnyPerMillion:2000000,
      outputMicroCnyPerMillion:8000000,reference:priceReference,checkedAt:priceCheckedAt}
  };
}
export const richSampleStubAllowance=Object.freeze(allowance('stub'));
export const richSampleLiveAllowance=Object.freeze(allowance('live'));
export const richSamplePerCallMaximumMicroCny=Number(maximumCost(richSampleStubAllowance.pricing,richSampleMaxOutputTokens));
if(richSamplePerCallMaximumMicroCny*richSampleMaxCalls!==richSamplePriceSnapshot.worstMicroCny)fail('rich_sample_price_contract_mismatch');

const base=generatedWakePromptSource();
const commonRules=[...base.commonRules,
  'This is a fixed batch of exactly three independent fictional dreams. Each run has exactly three scenes followed by one wake. Do not add a fourth scene, second wake, retry or alternate run.',
  'The supplied source intentionally leaves the relationship, the unfinished matter and any later outcome unresolved. Keep them unresolved; do not decide romance, separation, tragedy, motive or an ending.',
  'Do not turn source wording into firstFeeling automatically. If firstFeeling is present, write a short independent fictional waking state; omitted, present, absent and uncertain are all allowed.'
];
const sceneRules=[...base.sceneRules,
  'Continue an ongoing moment across three scenes. Allow an action, obstacle or consequence to appear without demanding a climax, tragedy, healing, explanation or copied source wording.'
];
const wakeRules=[...base.wakeRules,
  'firstFeeling remains independent from the fragment and source. Simulated residue is not a measured emotion or a persistent mood record.'
];
const sceneExample={event:'A fictional scene event.',appraisal:{goalEffect:0,control:.5,uncertainty:.5},basis:{goal:null,control:null,uncertainty:null},affect:{kind:'unchanged'}};
const wakeExample={fragment:'<exact excerpt from one previous scene>',associations:[],residue:.1,firstFeeling:{status:'uncertain'}};
export const richSamplePromptSource=Object.freeze({baseProtocolVersion:generatedWakeProtocolVersion,
  commonRules:[...commonRules],sceneRules:[...sceneRules],wakeRules:[...wakeRules],
  secondScene:base.secondScene,sceneExample:copy(sceneExample),wakeExample:copy(wakeExample)});
export const richSamplePromptHash=hash(richSamplePromptSource);
const sceneSystem=index=>[...commonRules,...sceneRules,`JSON shape example: ${JSON.stringify(sceneExample)}`,...(index>0?[base.secondScene]:[])].join('\n');
const wakeSystem=()=>[...commonRules,...wakeRules,`JSON shape example: ${JSON.stringify(wakeExample)}`].join('\n');

const exact=(value,names)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===names.length&&names.every(name=>Object.hasOwn(value,name));
export function assertRichSamplePriceSnapshot(observed){
  if(hash(observed)!==richSamplePriceSnapshotHash)fail('rich_sample_price_snapshot_mismatch');
  return copy(richSamplePriceSnapshot);
}
export function assertRequestBounds(request){
  const bytes=Buffer.byteLength(JSON.stringify(request?.body));
  if(bytes>richSampleRequestByteLimit)fail('rich_sample_request_too_large');
  if(request?.body?.model!==richSampleModel||request.body.max_tokens!==richSampleMaxOutputTokens||
     request.body.stream!==false||request.body.thinking?.type!=='disabled'||
     request.body.response_format?.type!=='json_object')fail('rich_sample_request_shape_mismatch');
  return bytes;
}
function stamp(value){
  const result=copy(value);result.appraisalBasis.protocolVersion=richSampleNormalizationVersion;return result;
}
export function normalizeRichSampleScene(raw,before){return stamp(normalizeGeneratedWakeScene(raw,before));}
export function normalizeRichSampleCheckpoint(saved,before){
  if(saved?.appraisalBasis?.protocolVersion!==richSampleNormalizationVersion)fail('invalid_rich_sample_checkpoint');
  const old=copy(saved);old.appraisalBasis.protocolVersion=generatedWakeProtocolVersion;
  const normalized=stamp(normalizeGeneratedWakeCheckpoint(old,before));
  if(hash(normalized)!==hash(saved))fail('invalid_rich_sample_checkpoint');
  return normalized;
}
function normalizedChain(scenes,input){
  let before=input.channels.affect.value??neutral();
  const normalized=scenes.map(saved=>{const value=normalizeRichSampleCheckpoint(saved,before);before=value.after;return value;});
  return {scenes:normalized,before};
}
function assertFixedSnapshot(input){
  if(hash(snapshot(input))!==hash(richSampleCanonicalSnapshot))fail('rich_sample_fixed_source_required');
}

export function buildRichSampleRequest(payload){
  if(!exact(payload,['snapshot','scenes','stage','index'])||!Array.isArray(payload.scenes)||
     payload.scenes.length!==payload.index||payload.index<0||payload.index>richSampleScenesPerRun||
     !['scene','wake'].includes(payload.stage)||(payload.stage==='scene'&&payload.index>=richSampleScenesPerRun)||
     (payload.stage==='wake'&&payload.index!==richSampleScenesPerRun))fail('invalid_rich_sample_stage');
  const input=snapshot(payload.snapshot);assertFixedSnapshot(input);
  const chain=normalizedChain(payload.scenes,input);
  const material={materialKind:'fictional',generatedEventOrigin:'dream',isRealityFact:false,
    stage:payload.stage,sceneIndex:payload.index,channels:copy(input.channels),
    sources:input.sources.map(source=>({id:source.id,version:source.version,text:source.text})),
    previousScenes:copy(chain.scenes),previousAffect:copy(chain.before)};
  const request={endpoint:'https://api.deepseek.com/chat/completions',method:'POST',protocolVersion:richSampleProtocolVersion,
    body:{model:richSampleModel,stream:false,thinking:{type:'disabled'},response_format:{type:'json_object'},max_tokens:richSampleMaxOutputTokens,
      messages:[{role:'system',content:payload.stage==='scene'?sceneSystem(payload.index):wakeSystem()},
        {role:'user',content:JSON.stringify(material)}]}};
  assertRequestBounds(request);
  return request;
}
export function parseRichSampleResponse(response){
  const parsed=parseDeepSeekResponse(response,{model:richSampleModel,maxOutputTokens:richSampleMaxOutputTokens});
  return {data:parsed.data,receipt:{...parsed.receipt,protocolVersion:richSampleProtocolVersion}};
}
export function normalizeRichSampleWake(data,scenes){
  const value=normalizeGeneratedWakeResponse(data,{previousScenes:scenes});
  return {wake:value.wake,firstFeeling:value.firstFeeling,firstFeelingOmitted:value.firstFeelingOmitted};
}
