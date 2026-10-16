// Fixed public fictional data; no provider, Store or caller-supplied files.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {buildAppraisalReviewDraft,projectAppraisalReviewDraft} from '../src/appraisal-review-memory.js';
import {normalizeBudgetCoupledScene} from '../src/coupled-affect-protocol.js';
import {coupledTrialPinsMatch} from '../src/coupled-trial-config.js';
const fixture=JSON.parse(fs.readFileSync(new URL('../fixtures/affect-support-contrasts.json',import.meta.url),'utf8'));
const example=JSON.parse(fs.readFileSync(new URL('../examples/appraisal-review-draft.json',import.meta.url),'utf8'));
const scene=normalizeBudgetCoupledScene(fixture.scenes.find(s=>s.id===example.fixtureReference.caseId).raw,fixture.before);
const parent={dreamId:'dream-design-example',runId:'run-design-example',status:'completed',protocolVersion:'coupled-affect-quotes-v1',origin:'dream',materialKind:'fictional',isRealityFact:false,sourceRefs:[{id:'fictional-design-source',version:'1'}],initialAffect:fixture.before,scenes:[scene]};
const context={kind:'fictional_appraisal_review_context',parent,reviewer:example.recordDraft.reviewer,withdrawnSourceIds:[],deletedDreamIds:[]};
const r=example.recordDraft,request={id:r.id,requestId:r.requestId,sceneIndex:0,assessment:r.assessment,supersedesReviewId:null};
const env=process.env,fetch=globalThis.fetch,original=structuredClone({context,request});let calls=0,keyReads=0,writes=0;const restore=[];
process.env=new Proxy(env,{get(t,k){if(k==='NIGHTVOYAGE_DEEPSEEK_KEY'){keyReads++;throw Error('offline_key_forbidden');}return Reflect.get(t,k);}});
globalThis.fetch=()=>{calls++;throw Error('offline_network_forbidden');};
for(const [object,names] of [[fs,['writeFileSync','appendFileSync','mkdirSync','renameSync','rmSync','openSync']],[fs.promises,['writeFile','appendFile','mkdir','rename','rm','open']]])for(const name of names){const old=object[name];object[name]=()=>{writes++;throw Error('offline_runtime_write_forbidden');};restore.push(()=>object[name]=old);}
try {
  const draft=buildAppraisalReviewDraft(context,request);assert.deepEqual(draft.recordDraft,r);assert.deepEqual(projectAppraisalReviewDraft(context,draft),draft);assert.deepEqual({context,request},original);
  const before=structuredClone(parent);request.assessment=structuredClone(request.assessment);request.assessment.direction.valence='apparent_conflict';buildAppraisalReviewDraft(context,request);assert.deepEqual(parent,before);
  context.withdrawnSourceIds=['fictional-design-source'];assert.equal(projectAppraisalReviewDraft(context,draft),null);assert.throws(()=>buildAppraisalReviewDraft(context,request),/parent_unavailable/);
  assert.equal(coupledTrialPinsMatch(),false);assert.equal(calls,0);assert.equal(keyReads,0);assert.equal(writes,0);
  console.log(JSON.stringify({command:'node scripts/check-appraisal-review-memory.mjs',node:process.version,platform:process.platform,stage:'A_pure_memory_only',exampleMatches:true,originalParentUnchanged:true,sourceWithdrawalProjectionNull:true,withdrawalKind:'caller_supplied_fictional_simulation_only',liveSourcePinsUnchanged:coupledTrialPinsMatch(),realModelRequests:calls,credentialReads:keyReads,persistentRuntimeWrites:writes,managedStoreIntegrated:false,durableIdempotencyImplemented:false,revisionsImplemented:false,qualityAssessed:false,semanticSupport:'not_assessed'},null,2));
} finally {for(const undo of restore)undo();process.env=env;globalThis.fetch=fetch;}
