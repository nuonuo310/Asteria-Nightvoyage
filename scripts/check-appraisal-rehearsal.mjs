// Independent fictional scripted outputs, not a real model or narrative-quality evaluation.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { AppraisalRehearsal, appraisalProtocolVersion } from '../src/appraisal-rehearsal.js';
const probes=JSON.parse(fs.readFileSync(new URL('../fixtures/appraisal-probes.json',import.meta.url)));
const scenarios=[
  {id:'ordinary-unchanged',input:'courtyard-cloth',scenes:[0,0]},
  {id:'explicit-goal-effects',input:'drawer-and-orbit',scenes:[1,2]},
  {id:'affect-without-resolution',input:'sparse-context',scenes:[3,0]}
];
const results=[];
for (const scenario of scenarios) {
  const input=JSON.parse(fs.readFileSync(new URL(`../fixtures/quality/${scenario.input}.json`,import.meta.url)));
  assert.ok(input.sources.every(s=>s.grant.modelEgress===false));
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-appraisal-check-'));let engine,calls=0;
  const simulator=async request=>{
    calls++;const m=JSON.parse(request.body.messages[1].content);
    const data=m.stage==='wake'?{fragment:m.previousScenes.at(-1).event,residue:0.1,associations:[]}:probes.scenes[scenario.scenes[m.sceneIndex]];
    return {status:200,body:{model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(data)}}],usage:{prompt_tokens:100,completion_tokens:80,total_tokens:180}}};
  };
  try {
    engine=new AppraisalRehearsal(directory,{model:'deepseek-flash',simulator});const id=engine.start(scenario.id,scenario.id,input);await engine.execute(id);
    const result=engine.result(id);assert.equal(result.receipt.status,'completed');assert.equal(calls,3);assert.equal(result.dream.origin,'dream');assert.equal(result.dream.isRealityFact,false);
    assert.ok(result.dream.scenes.every(s=>s.appraisalBasis.verification==='literal_excerpt_only'&&s.appraisalBasis.semanticSupport==='not_assessed'));
    assert.equal(result.wake.fragment,result.dream.scenes[result.wake.fragmentBasis.sceneIndex].event);
    engine.close();engine=new AppraisalRehearsal(directory,{model:'deepseek-flash',simulator});
    assert.deepEqual(engine.result(id).dream.scenes,result.dream.scenes);assert.equal(engine.start(scenario.id,scenario.id,input),id);await engine.execute(id);assert.equal(calls,3);
    results.push({id:scenario.id,status:'completed',fakeStageCalls:calls,evidencePersisted:true,reopened:true,duplicateCalls:0,semanticSupport:'not_assessed',qualityAssessed:false});
  } finally {engine?.close();fs.rmSync(directory,{recursive:true,force:true});}
}
console.log(JSON.stringify({command:'node scripts/check-appraisal-rehearsal.mjs',node:process.version,platform:process.platform,
  protocolVersion:appraisalProtocolVersion,scriptedSimulatorOnly:true,realModelRequests:0,
  fakeStageCalls:results.reduce((n,r)=>n+r.fakeStageCalls,0),qualityAssessed:false,liveEntryChanged:false,results},null,2));
