// Fixed fictional stub rehearsal. No key, native fetch, CLI approval or live account.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { BudgetedNightvoyage } from '../src/budgeted-runtime.js';
import { coupledBudgetVersion } from '../src/coupled-affect-protocol.js';
import { readAppraisalView } from '../src/appraisal-view.js';
import { prunedV2SourcePinsMatch } from '../src/pruned-v2-trial-config.js';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-coupled-budget-'));
const seed=JSON.parse(fs.readFileSync(new URL('../fixtures/quality/sparse-context.json',import.meta.url))),pairs=JSON.parse(fs.readFileSync(new URL('../fixtures/coupled-affect-review.json',import.meta.url))).cases;
const allowance={id:'coupled-STUB-ONLY',mode:'stub',approved:true,protocolVersion:coupledBudgetVersion,expiresAt:Date.now()+60000,
  limits:{maxRuns:1,maxCalls:3,maxMicroCny:1000000},pricing:{model:'deepseek-flash',contextTokenLimit:1000,inputMicroCnyPerMillion:1000000,outputMicroCnyPerMillion:2000000,reference:'https://api-docs.deepseek.com/TEST-ONLY',checkedAt:1}};
let calls=0,nativeCalls=0,credentialReads=0,engine;const priorFetch=globalThis.fetch,priorEnv=process.env;
process.env=new Proxy(priorEnv,{get(target,key){if(key==='NIGHTVOYAGE_DEEPSEEK_KEY'){credentialReads++;throw Error('credential_access_forbidden');}return Reflect.get(target,key);}});
globalThis.fetch=()=>{nativeCalls++;throw Error('native_transport_forbidden');};
const fetchImpl=async(_url,r)=>{
  calls++;const m=JSON.parse(JSON.parse(r.body).messages[1].content),data=m.stage==='wake'?{fragment:m.previousScenes.at(-1).event.split('。')[0]+'。',residue:.1,associations:[]}:structuredClone(pairs[m.sceneIndex].coupled);
  if(m.stage==='scene')data.evidence.push('梦');
  return new Response(JSON.stringify({model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(data)}}],usage:{prompt_tokens:100,completion_tokens:80,total_tokens:180}}));
};
const options={allowance,mode:'stub',enabled:true,protocol:'coupled-affect-v1',credential:'DUMMY-STUB-ONLY',fetchImpl};
try {
  const originalNoEgress=seed.sources.every(s=>s.grant.modelEgress===false);for(const s of seed.sources)s.grant.modelEgress=true;
  engine=new BudgetedNightvoyage(root,options);const id=engine.start('coupled-stub','coupled-stub',seed);await engine.execute(id);
  const packet=engine.result(id),view=readAppraisalView(engine.store,packet.dream.id),declarations=packet.dream.scenes.map(s=>s.affectDeclaration.kind);
  assert.equal(packet.receipt.status,'completed');assert.deepEqual(declarations,['unchanged','estimated']);assert.equal(packet.receipt.billing.length,3);assert.ok(packet.receipt.billing.every(s=>s.status==='settled'));engine.close();
  engine=new BudgetedNightvoyage(root,options);const before=calls;await engine.execute(id);assert.equal(calls,before);assert.equal(view.status,'available');
  const recall=engine.recall('小船','stub-cue');assert.equal(recall.length,1);engine.withdraw('q-sparse-memory');assert.deepEqual(engine.recall('小船','after-withdraw'),[]);assert.equal(readAppraisalView(engine.store,packet.dream.id),null);engine.close();
  engine=new BudgetedNightvoyage(root,options);assert.equal(engine.result(id).dream,null);assert.equal(nativeCalls,0);assert.equal(credentialReads,0);
  console.log(JSON.stringify({command:'node scripts/check-coupled-budget.mjs',node:process.version,platform:process.platform,protocolVersion:coupledBudgetVersion,
    status:'completed',stubCalls:calls,stubSettledCalls:packet.receipt.billing.length,affectDeclarations:declarations,normalizationAudits:packet.dream.scenes.map(s=>s.normalizationAudit),
    reopened:true,duplicateCalls:calls-before,typedViewAvailable:true,recallCandidates:recall.length,recallOrigin:recall[0].origin,recallIsRealityFact:recall[0].isRealityFact,
    withdrawalViewNull:true,withdrawalSurvivesReopen:true,originalSourceGrantsNoEgress:originalNoEgress,historicalPrunedDispatchPinsMatch:prunedV2SourcePinsMatch(),
    realModelRequests:nativeCalls,credentialEnvironmentRead:credentialReads!==0,paidEntryAvailable:false,semanticSupport:'not_assessed',qualityAssessed:false},null,2));
}finally{engine?.close();globalThis.fetch=priorFetch;process.env=priorEnv;fs.rmSync(root,{recursive:true,force:true});}
