import fs from 'node:fs';
import assert from 'node:assert/strict';
import { prunedV2SourcePinsMatch } from '../src/pruned-v2-trial-config.js';
import { prunedV2ReviewedProposal } from '../src/pruned-v2-reviewed-profile.js';
import os from 'node:os';
import path from 'node:path';
import { CoupledAffectRehearsal, coupledAffectVersion } from '../src/coupled-affect-offline.js';
import { readAppraisalView } from '../src/appraisal-view.js';

let nativeCalls=0;
globalThis.fetch=()=>{nativeCalls++;throw Error('native_transport_forbidden_in_offline_rehearsal');};
const pairs=JSON.parse(fs.readFileSync(new URL('../fixtures/coupled-affect-review.json',import.meta.url))).cases;
const seed=JSON.parse(fs.readFileSync(new URL('../fixtures/quality/sparse-context.json',import.meta.url)));
let calls=0;
const simulator=async request=>{
  calls++;const m=JSON.parse(request.body.messages[1].content);let data;
  if(m.stage==='wake')data={fragment:m.previousScenes.at(-1).event.split('。')[0]+'。',residue:0.1,associations:[]};
  else{data=structuredClone(pairs[m.sceneIndex].coupled);data.evidence.push('梦');}
  return {status:200,body:{model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(data)}}],usage:{prompt_tokens:100,completion_tokens:80,total_tokens:180}}};
};
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-v2-offline-'));let engine;
try {
  engine=new CoupledAffectRehearsal(directory,{model:'deepseek-flash',simulator});
  const id=engine.start('v2-offline','v2-offline',seed),status=await engine.execute(id),packet=engine.result(id),audits=packet.dream.scenes.map(s=>s.normalizationAudit);
  engine.close();engine=new CoupledAffectRehearsal(directory,{model:'deepseek-flash',simulator});
  const before=calls;await engine.execute(id);const view=readAppraisalView(engine.store,packet.dream.id),recall=engine.recall('小船','coupled-cue');
  engine.withdraw('q-sparse-memory');const withdrawnView=readAppraisalView(engine.store,packet.dream.id),withdrawnRecall=engine.recall('小船','coupled-cue');
  assert.equal(status.status,'completed');assert.equal(calls,3);assert.equal(calls-before,0);assert.equal(view.status,'available');assert.equal(recall.length,1);assert.equal(withdrawnRecall.length,0);assert.equal(withdrawnView,null);assert.equal(nativeCalls,0);assert.equal(prunedV2ReviewedProposal().protocolVersion,'compact-appraisal-quotes-v2-pruned-unused');
  console.log(JSON.stringify({command:'node scripts/check-coupled-affect-offline.mjs',node:process.version,platform:process.platform,protocolVersion:coupledAffectVersion,
    status:status.status,fakeStageCalls:calls,realModelRequests:nativeCalls,liveSourcePinsUnchanged:prunedV2SourcePinsMatch(),recallCandidates:recall.length,recallOrigin:recall[0].origin,recallIsRealityFact:recall[0].isRealityFact,withdrawnRecallCount:withdrawnRecall.length,reopened:true,duplicateCalls:calls-before,normalizationAudits:audits,affectDeclarations:packet.dream.scenes.map(s=>s.affectDeclaration),
    typedViewAvailable:view.status==='available',absentControlValue:view.scenes[0].control.value,withdrawalViewNull:withdrawnView===null,
    originalSourceGrantsNoEgress:seed.sources.every(s=>s.grant.modelEgress===false),liveProtocolEnabled:false,semanticSupport:'not_assessed',qualityAssessed:false},null,2));
}finally{engine?.close();fs.rmSync(directory,{recursive:true,force:true});}
