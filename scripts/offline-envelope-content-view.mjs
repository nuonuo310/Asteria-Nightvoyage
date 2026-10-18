// Read-only projection for the new owner. Never impersonates a historical API run.
import {Store,copy} from '../src/store.js';
import {hash,neutral,snapshot} from '../src/contract.js';
import {normalizeInlineCheckpoint,normalizeInlineStage} from '../src/inline-evidence-protocol.js';
import {contentReviewVersion} from '../src/content-review.js';
import {appraisalViewVersion} from '../src/appraisal-view.js';
import {dreamModelPortVersion,jsonFields} from './dream-model-port.mjs';
const fail=()=>{throw Error('invalid_model_port_book');};
const unknown=()=>({status:'not_stated',value:null,evidence:null});
const estimate=(value,evidence)=>({status:'model_estimate',value:copy(value),evidence:copy(evidence)});
export function readModelPortContent(store,dreamId){
 if(!(store instanceof Store))fail();store.assert();const entry=Object.hasOwn(store.state.entries,dreamId)?store.state.entries[dreamId]:null;if(!entry)return null;
 const run=Object.hasOwn(store.state.runs,entry.runId)?store.state.runs[entry.runId]:null;
 if(!run||['revoked','deleted'].includes(run.status)||entry.sourceRefs?.some(s=>store.withdrawn.includes(s.id)))return null;
 if(run.modelPortVersion!==dreamModelPortVersion||run.status!=='completed'||run.entryId!==dreamId||dreamId!==`dream-${run.id}`||entry.runId!==run.id)fail();
 const s=run.modelSelection;jsonFields(s,['adapter_kind','provider_kind','model_id','auth_mode','protocol_version','fallback_from','fallback_reason','selection_id']);
 const identities={FakeAdapter:['local_fake','none','inline-evidence-quotes-v1'],ChatGPTPlanAdapter:['openai_protocol_simulator','synthetic_stub','offline-chatgpt-plan-inline-v1'],CodexAdapter:['openai_protocol_simulator','synthetic_stub','codex-dream-transcript-rehearsal-v1']};
 const livePlan=s.adapter_kind==='ChatGPTPlanAdapter'&&s.provider_kind==='openai'&&s.auth_mode==='chatgpt_plan'&&['chatgpt-plan-inline-http-v1','chatgpt-plan-inline-missing-type-v1'].includes(s.protocol_version);
 const candidateStub=s.adapter_kind==='ChatGPTPlanAdapter'&&s.provider_kind==='openai_protocol_simulator'&&s.auth_mode==='synthetic_stub'&&['offline-chatgpt-plan-missing-type-v1','offline-plan-reasoning-envelope-v1'].includes(s.protocol_version);
 if(!livePlan&&!candidateStub&&(!Object.hasOwn(identities,s.adapter_kind)||identities[s.adapter_kind].some((v,i)=>v!==[s.provider_kind,s.auth_mode,s.protocol_version][i])))fail();
 if(typeof s.model_id!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(s.model_id)||typeof entry.cherished!=='boolean'||!['manual','cue'].includes(entry.recallAccess))fail();
 const identity={adapter_kind:s.adapter_kind,provider_kind:s.provider_kind,model_id:s.model_id,auth_mode:s.auth_mode,protocol_version:s.protocol_version};
 if(s.selection_id!==hash({identity,fallback_from:s.fallback_from,fallback_reason:s.fallback_reason})||hash(run.executionOwner)!==hash({schemaVersion:1,family:dreamModelPortVersion,providerIdentity:hash({port:dreamModelPortVersion,identity,selection:s.selection_id})}))fail();
 const input=snapshot(run.snapshot),refs=input.sources.map(source=>({id:source.id,version:source.version}));
 if(hash(input)!==hash(run.snapshot)||hash(run.sourceIds)!==hash(input.sources.map(source=>source.id))||!Array.isArray(run.scenes)||run.scenes.length!==2||hash(run.scenes)!==hash(entry.scenes))fail();
 const envelope=(value,id,origin)=>value?.schemaVersion===1&&value.id===id&&value.runId===run.id&&value.origin===origin&&value.materialKind==='fictional'&&value.isRealityFact===false&&hash(value.sourceRefs)===hash(refs)&&hash(value.derivedFrom)===hash([input.id]);
 if(!envelope(entry,dreamId,'dream')||!envelope(entry.wake,`wake-${run.id}`,'wake_note'))fail();
 let before=input.channels.affect.value??neutral();const scenes=entry.scenes.map(saved=>{const value=normalizeInlineCheckpoint(saved,before);before=value.after;return value;});
 const wake=normalizeInlineStage(entry.wake,{stage:'wake',previousScenes:scenes});
 if(hash(wake)!==hash(run.wake)||hash(wake.fragmentBasis)!==hash(entry.wake.fragmentBasis))fail();
 // No review writer currently supports this owner. Never silently hide a record.
 if(Object.values(store.state.entries).some(e=>e.origin==='dream_appraisal_review'&&(e.runId===run.id||e.derivedFrom?.includes(dreamId))))throw Error('model_port_review_reader_pending');
 const viewEnvelope={schemaVersion:1,materialKind:'fictional',isRealityFact:false,sourceRefs:copy(refs),derivedFrom:[dreamId]};
 const appraisalScenes=scenes.map((v,sceneIndex)=>{const e=v.appraisalBasis.evidence;return {sceneIndex,event:v.event,affectDeclaration:copy(v.affectDeclaration),
  goalEffect:e.goal===null?unknown():estimate(v.appraisal.goalEffect,e.goal),control:e.controlExcerpt===null?unknown():estimate(v.appraisal.control,e.controlExcerpt),uncertainty:e.uncertaintyExcerpt===null?unknown():estimate(v.appraisal.uncertainty,e.uncertaintyExcerpt),affectChange:e.affectExcerpt===null?unknown():estimate(v.delta,e.affectExcerpt),appliedAffect:{origin:'simulated_affect',isRealityFact:false,before:copy(v.before),delta:copy(v.delta),after:copy(v.after)}};});
 return {...viewEnvelope,viewVersion:contentReviewVersion,origin:'dream_content_review_view',
  narrative:{dream:{schemaVersion:1,id:dreamId,runId:run.id,origin:'dream',materialKind:'fictional',isRealityFact:false,sourceRefs:copy(refs),derivedFrom:[input.id],scenes:copy(scenes),cherished:entry.cherished,recallAccess:entry.recallAccess},wake:{schemaVersion:1,id:entry.wake.id,runId:run.id,origin:'wake_note',materialKind:'fictional',isRealityFact:false,sourceRefs:copy(refs),derivedFrom:[input.id],...wake}},
  appraisalView:{...viewEnvelope,viewVersion:appraisalViewVersion,origin:'dream_appraisal_view',status:'available',scenes:appraisalScenes},reviews:[],semanticSupport:'not_assessed',qualityAssessed:false};
}
