// Local stub loop and byte comparison; no credentials, provider tokens or real quality measurement.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { normalizeAppraisalScene } from '../src/appraisal-rehearsal.js';
import { compactSceneData, compactProtocolVersion } from '../src/compact-appraisal-protocol.js';
import { BudgetedNightvoyage } from '../src/budgeted-runtime.js';
import { readAppraisalView } from '../src/appraisal-view.js';
import { neutral } from '../src/contract.js';
const probes=JSON.parse(fs.readFileSync(new URL('../fixtures/appraisal-probes.json',import.meta.url)));
const bytes=value=>Buffer.byteLength(JSON.stringify(value),'utf8');
const sizes=probes.scenes.map(({id,event,appraisal,delta,basis})=>{
  const expanded={event,appraisal,delta,basis},compact=compactSceneData(normalizeAppraisalScene(expanded,neutral()));
  const row={id,expandedJsonBytes:bytes(expanded),compactJsonBytes:bytes(compact),savedBytes:bytes(expanded)-bytes(compact)};
  assert.ok(row.savedBytes>0);return row;
});
const q='波'.repeat(64),expanded={event:q,appraisal:{goalEffect:-1,control:0.2,uncertainty:0.8},delta:{valence:-0.1,arousal:0.1},
  basis:{goal:{goalExcerpt:q,outcomeExcerpt:q},controlExcerpt:q,uncertaintyExcerpt:q,affectExcerpt:q}};
const compact=compactSceneData(normalizeAppraisalScene(expanded,neutral()));
const sharedBoundaryProbe={kind:'synthetic_literal_boundary_only',expandedJsonBytes:bytes(expanded),compactJsonBytes:bytes(compact),quoteTableEntries:compact.evidence.length,semanticSupport:'not_assessed'};
assert.ok(sharedBoundaryProbe.expandedJsonBytes>1200);assert.ok(sharedBoundaryProbe.compactJsonBytes<=1200);assert.equal(compact.evidence.length,1);
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-compact-check-'));let engine,calls=0,nativeCalls=0;
const oldFetch=globalThis.fetch;globalThis.fetch=()=>{nativeCalls++;throw Error('Native HTTP is forbidden in this rehearsal');};
const config={id:'compact-local-stub',mode:'stub',approved:true,expiresAt:Date.now()+60000,limits:{maxRuns:1,maxCalls:3,maxMicroCny:1000000},
  pricing:{model:'deepseek-flash',contextTokenLimit:1000,inputMicroCnyPerMillion:1000000,outputMicroCnyPerMillion:2000000,reference:'https://api-docs.deepseek.com/TEST-ONLY',checkedAt:1}};
const simulator=async(_url,request)=>{
  calls++;const m=JSON.parse(JSON.parse(request.body).messages[1].content),data=m.stage==='wake'?{fragment:m.previousScenes.at(-1).event,residue:0.1,associations:[]}:compactSceneData(normalizeAppraisalScene(probes.scenes[m.sceneIndex],neutral()));
  return new Response(JSON.stringify({model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(data)}}],usage:{prompt_tokens:100,completion_tokens:80,total_tokens:180}}));
};
try {
  const input=JSON.parse(fs.readFileSync(new URL('../fixtures/quality/sparse-context.json',import.meta.url)));
  assert.ok(input.sources.every(s=>s.grant.modelEgress===false));for(const s of input.sources)s.grant.modelEgress=true;
  const options={allowance:config,credential:'DUMMY-LOCAL-REHEARSAL',enabled:true,mode:'stub',protocol:'compact-appraisal-v1',fetchImpl:simulator};
  engine=new BudgetedNightvoyage(directory,options);const id=engine.start('rehearsal','rehearsal',input);await engine.execute(id);assert.equal(engine.status(id).status,'completed');assert.equal(calls,3);
  const first=engine.result(id),view=readAppraisalView(engine.store,first.dream.id);assert.equal(view.scenes[0].control.value,null);assert.equal(view.scenes[1].control.status,'model_estimate');assert.ok(first.receipt.billing.every(r=>r.status==='settled'));
  engine.close();engine=new BudgetedNightvoyage(directory,options);assert.equal(engine.start('rehearsal','rehearsal',input),id);await engine.execute(id);assert.deepEqual(engine.result(id).dream,first.dream);assert.equal(calls,3);assert.equal(nativeCalls,0);
  console.log(JSON.stringify({command:'node scripts/check-compact-appraisal.mjs',node:process.version,platform:process.platform,protocolVersion:compactProtocolVersion,
    providerOutputTokenCap:400,responseByteSafetyCeiling:1200,actualModelTokenCount:null,units:'UTF-8 JSON bytes; not model tokens',
    realModelRequests:nativeCalls,stubCalls:calls,stubSettledCalls:first.receipt.billing.length,reopened:true,duplicateCalls:0,typedAppraisalView:true,
    qualityAssessed:false,sizes,sharedBoundaryProbe},null,2));
} finally {engine?.close();globalThis.fetch=oldFetch;fs.rmSync(directory,{recursive:true,force:true});}
