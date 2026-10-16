// Offline request comparison only. No provider, transport, Store, approval or selector.
import {snapshot,hash} from './contract.js';
import {copy,fail} from './store.js';
import {buildBudgetCoupledRequest} from './coupled-affect-protocol.js';
import {assertAppraisalReviewJsonData} from './appraisal-review-memory.js';
export const sceneContinuityPromptVersion='offline-scene-continuity-prompt-v1';
export const sceneContinuityPrompt=[
  'Write the next moment being lived in this dream. An ordinary action, perception, or lingering attention may carry the scene.',
  'A quiet return or confirmation is allowed. If a scene adds only a recap of what is already established, consider a lived moment within the same situation.',
  'No quota for novelty, new objects, location changes, conflict, insight, emotional explanations, or positive endings. Keep all existing source, perspective, affect-evidence, schema, and output limits.'
].join('\n');
export function compareSceneContinuityRequest(payload) {
  assertAppraisalReviewJsonData(payload);
  const names=['snapshot','scenes','stage','index'];
  if(!payload||Array.isArray(payload)||Object.keys(payload).length!==names.length||names.some(k=>!Object.hasOwn(payload,k))||!Array.isArray(payload.scenes)||payload.scenes.length>2||!Number.isSafeInteger(payload.index)||payload.index!==payload.scenes.length||!['scene','wake'].includes(payload.stage)||
    (payload.stage==='scene'&&payload.index>1)||(payload.stage==='wake'&&payload.index!==2))fail('invalid_continuity_comparison');
  const input=snapshot(payload.snapshot);
  if(payload.snapshot.sources.some(s=>s.grant.modelEgress!==false)||input.sources.some(s=>s.grant.modelEgress!==false))fail('offline_no_egress_fixture_required');
  const baseline=buildBudgetCoupledRequest({...copy(payload),snapshot:input},{model:'deepseek-flash',maxOutputTokens:400}),candidate=copy(baseline),changed=payload.stage==='scene'&&payload.index===1;
  // Offline identity prevents confusing this constructed request with an approved entry.
  candidate.protocolVersion=sceneContinuityPromptVersion;
  if(changed)candidate.body.messages[0].content+='\n'+sceneContinuityPrompt;
  const baselineBytes=Buffer.byteLength(JSON.stringify(baseline.body)),candidateBytes=Buffer.byteLength(JSON.stringify(candidate.body));
  return {schemaVersion:1,kind:'offline_prompt_request_comparison',candidateVersion:sceneContinuityPromptVersion,offlineOnly:true,paidEntryAvailable:false,realModelRequests:0,
    bodyChanged:changed,requestBytes:{baseline:baselineBytes,candidate:candidateBytes,limit:65536,baselineFits:baselineBytes<=65536,candidateFits:candidateBytes<=65536,units:'UTF-8 JSON bytes; not model tokens'},baseline,candidate,baselineBodyHash:hash(baseline.body),candidateBodyHash:hash(candidate.body),modelComplianceImproved:'not_assessed',qualityAssessed:false};
}
