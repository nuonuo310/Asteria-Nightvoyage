// Constructs requests only; no real/fake provider and no runtime Store.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {compareSceneContinuityRequest,sceneContinuityPromptVersion,sceneContinuityPrompt} from '../src/scene-continuity-prompt.js';
import {normalizeBudgetCoupledScene} from '../src/coupled-affect-protocol.js';
import {auditAffectSupportContrasts} from '../src/affect-support-contrast.js';
import {coupledTrialPinsMatch} from '../src/coupled-trial-config.js';
const seed=JSON.parse(fs.readFileSync(new URL('../fixtures/quality/sparse-context.json',import.meta.url))),fixture=JSON.parse(fs.readFileSync(new URL('../fixtures/affect-support-contrasts.json',import.meta.url)));
const env=process.env,fetch=globalThis.fetch;let requests=0,keyReads=0;
process.env=new Proxy(env,{get(t,k){if(k==='NIGHTVOYAGE_DEEPSEEK_KEY'){keyReads++;throw Error('credential_forbidden');}return Reflect.get(t,k);}});
globalThis.fetch=()=>{requests++;throw Error('transport_forbidden');};
try {
  const first=normalizeBudgetCoupledScene(fixture.scenes.find(s=>s.id==='explicit-unchanged').raw,fixture.before),second=normalizeBudgetCoupledScene(fixture.scenes.find(s=>s.id==='explicit-relief').raw,first.after);
  const comparisons=[{snapshot:seed,scenes:[],stage:'scene',index:0},{snapshot:seed,scenes:[first],stage:'scene',index:1},{snapshot:seed,scenes:[first,second],stage:'wake',index:2}].map(compareSceneContinuityRequest);
  const changed=comparisons.map(r=>r.bodyChanged);assert.deepEqual(changed,[false,true,false]);assert.equal(coupledTrialPinsMatch(),true);assert.equal(requests,0);assert.equal(keyReads,0);
  console.log(JSON.stringify({command:'node scripts/check-scene-continuity-prompt.mjs',node:process.version,platform:process.platform,candidateVersion:sceneContinuityPromptVersion,addedSecondSceneSystemText:sceneContinuityPrompt,requestsConstructed:3,bodyChangedByStage:changed,requestByteComparisons:comparisons.map(r=>r.requestBytes),actualModelTokenCount:null,fakeGenerationCalls:0,realModelRequests:requests,credentialReads:keyReads,storeOpened:false,paidEntryAvailable:false,liveSourcePinsUnchanged:true,authoredTransitionReview:auditAffectSupportContrasts(fixture).transitionObservations,automaticSemanticRanking:false,modelComplianceImproved:'not_assessed',qualityAssessed:false},null,2));
}finally{process.env=env;globalThis.fetch=fetch;}
