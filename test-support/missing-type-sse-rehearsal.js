// Independent fictional full-stream rehearsal. No account, OAuth, fetch or user Store.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {ChatGPTPlanAdapter,selectAdapter} from '../scripts/dream-model-port.mjs';
import {ModelPortNightvoyage} from '../scripts/dream-model-runtime.mjs';
import {planMissingTypePolicy} from '../scripts/plan-missing-type-policy.mjs';
import {planTranscript} from './model-port-protocol-fixtures.js';
export async function checkMissingTypeSse(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-missing-type-')),directory=path.join(root,'book'),input=JSON.parse(fs.readFileSync(new URL('../examples/adapter-boundary.snapshot.json',import.meta.url),'utf8'));let engine,calls=0;const audits=[];
 const adapter=new ChatGPTPlanAdapter({model_id:'fiction-missing-type-v1',simulator:draft=>{calls++;audits.push(planMissingTypePolicy({httpStatus:200,contentType:null,allowMissingContentType:true}));return planTranscript(draft);}});
 try{
  engine=new ModelPortNightvoyage(directory,{selection:selectAdapter({primary:adapter})});const runId=engine.start('missing-type','missing-type',input);await engine.execute(runId);const result=engine.result(runId);if(result.receipt.status!=='completed')throw Error('synthetic_missing_type_incomplete');
  const original=JSON.stringify(result.dream),wake=JSON.stringify(result.wake);engine.close();engine=new ModelPortNightvoyage(directory,{selection:selectAdapter({primary:adapter})});await engine.execute(runId);const replay=engine.result(runId),replayAdditionalCalls=calls-3;
  const candidates=engine.recall('clock','fiction-cue',1);engine.withdraw(input.sources[0].id);engine.close();engine=new ModelPortNightvoyage(directory,{selection:selectAdapter({primary:adapter})});
  return {kind:'fictional_missing_type_complete_stream_rehearsal',policyVersion:'offline-missing-content-type-sse-candidate-v1',status:result.receipt.status,simulatorStageCalls:calls,externalCallsStarted:result.receipt.external_calls_started,realModelRequests:0,credentialReads:0,userStoreAccessed:false,savedScenes:result.receipt.checkpoint.saved_scenes,wakeSaved:result.receipt.checkpoint.wake_saved,allMissingHeaderAdmissions:audits.every(a=>a.missingHeaderCompatibilityUsed),strictDecoderAndStageChecksUsed:true,adapterProvider:result.receipt.provider_kind,authMode:result.receipt.auth_mode,reopened:true,replayAdditionalCalls,originalAndWakeUnchanged:JSON.stringify(replay.dream)===original&&JSON.stringify(replay.wake)===wake,recallOrigin:candidates[0]?.origin??null,recallIsRealityFact:candidates[0]?.isRealityFact??null,withdrawalSuppressesReopenedResult:engine.result(runId).dream===null,withdrawalSuppressesReopenedRecall:engine.recall('clock','fiction-cue',2).length===0,liveTransportModified:false,liveSourcePinsChanged:false,realInferenceQualified:false,qualityAssessed:false,semanticSupport:'not_assessed'};
 }finally{engine?.close();fs.rmSync(root,{recursive:true,force:true});}
}
