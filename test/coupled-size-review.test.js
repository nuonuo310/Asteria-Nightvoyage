import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { reviewCoupledSizes } from '../src/coupled-size-review.js';
const fixture=JSON.parse(fs.readFileSync(new URL('../fixtures/coupled-affect-review.json',import.meta.url))),seed=JSON.parse(fs.readFileSync(new URL('../fixtures/quality/sparse-context.json',import.meta.url)));
const input=()=>({fixture:structuredClone(fixture),seed:structuredClone(seed)});
test('coupled size audit measures bytes, leaves scripted inputs/grants unchanged and returns no narrative',()=>{
  const i=input(),before=structuredClone(i),r=reviewCoupledSizes(i);assert.deepEqual(i,before);assert.equal(r.rows.length,15);assert.equal(r.realModelRequests,0);assert.equal(r.actualModelTokenCount,null);assert.equal(r.qualityAssessed,false);
  for(const c of i.fixture.cases)assert.ok(!JSON.stringify(r).includes(c.coupled.event));assert.ok(!JSON.stringify(r).includes(seed.sources[0].text));
});
test('coupled exact 1200-byte output passes and 1201 fails without affecting shape validity',()=>{
  const [exact,over]=reviewCoupledSizes(input()).boundaries;assert.equal(exact.jsonBytes,1200);assert.equal(exact.passesBothGuards,true);assert.equal(over.jsonBytes,1201);assert.equal(over.shapeAccepted,true);assert.equal(over.jsonParserAccepted,false);assert.equal(over.parserCheck,'provider_empty_or_oversized_content');
});
test('individually valid maximal quotation table can exceed the unchanged response bound',()=>{
  const x=reviewCoupledSizes(input()).boundaries.find(x=>x.id==='five-maximal-quotations');assert.equal(x.shapeAccepted,true);assert.ok(x.jsonBytes>1200);assert.equal(x.passesBothGuards,false);assert.equal(x.actualModelTokenCount,null);
});
test('JSON escapes and astral UTF-8 are measured in serialized bytes rather than character count',()=>{
  const r=reviewCoupledSizes(input()),[escaped,exact,over]=r.boundaries.slice(3);assert.equal(escaped.jsonBytes,1700);assert.equal(escaped.passesBothGuards,false);assert.equal(exact.jsonBytes,1200);assert.equal(exact.passesBothGuards,true);assert.equal(over.jsonBytes,1204);assert.equal(over.passesBothGuards,false);
});
test('synthetic large fictional request explicitly requires a future gated pre-reservation byte guard',()=>{
  const r=reviewCoupledSizes(input());assert.ok(r.requests.fictionalFixtureBodyBytes<65536);assert.ok(r.requests.syntheticLargeBodyBytes>65536);assert.equal(r.requests.syntheticLargeRequiresPreDispatchRejection,true);assert.equal(r.requests.offlineBuilderAppliesGatedByteCeiling,false);
});
test('size audit refuses real, unmarked, egress-enabled or unsafe scripted inputs',()=>{
  for(const change of [i=>i.seed.materialKind='real',i=>i.fixture.scriptedOnly=false,i=>i.fixture.materialKind='real',i=>i.seed.sources[0].grant.modelEgress=true,i=>i.fixture.cases[0].id='unsafe free text']){const i=input();change(i);assert.throws(()=>reviewCoupledSizes(i),/fictional_size_review_required/);}
});
test('independent byte audit command dispatches nothing and verifies existing live source pins',()=>{
  const r=spawnSync(process.execPath,['scripts/audit-coupled-affect-size.mjs'],{cwd:new URL('..',import.meta.url),encoding:'utf8'});assert.equal(r.status,0,r.stderr);const p=JSON.parse(r.stdout);assert.equal(p.realModelRequests,0);assert.equal(p.persistentWrites,0);assert.equal(p.liveSourcePinsUnchanged,true);assert.equal(p.qualityAssessed,false);
});
test('isolated source-drift probe reproduces old configuration read coupling without opening a user Store',t=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-pin-read-probe-'));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  for(const name of ['src','fixtures'])fs.cpSync(new URL(`../${name}`,import.meta.url),path.join(directory,name),{recursive:true});fs.copyFileSync(new URL('../package.json',import.meta.url),path.join(directory,'package.json'));
  const program=`import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';import assert from 'node:assert/strict';import {prunedV2TrialProposal,prunedV2TrialId,readPrunedV2Trial} from './src/pruned-v2-trial-config.js';import {validateAllowance} from './src/budget-ledger.js';import {pricingProfile,profileExpiresAt} from './src/trial-config.js';globalThis.fetch=()=>{throw Error('forbidden');};const c={...prunedV2TrialProposal(),fixtureEgressApproved:true,paidEvaluationApproved:true,allowance:validateAllowance({id:prunedV2TrialId,mode:'live',approved:true,expiresAt:profileExpiresAt,protocolVersion:'compact-appraisal-quotes-v2-pruned-unused',limits:{maxRuns:1,maxCalls:3,maxMicroCny:3000000},pricing:pricingProfile})};fs.mkdirSync('synthetic-config');fs.writeFileSync('synthetic-config/'+prunedV2TrialId+'.json',JSON.stringify(c));assert.deepEqual(readPrunedV2Trial('synthetic-config'),c);fs.appendFileSync('src/gated-deepseek-client.js','\\n// isolated byte-drift probe only\\n');assert.throws(()=>prunedV2TrialProposal(),/pruned_v2_protocol_source_changed/);assert.throws(()=>readPrunedV2Trial('synthetic-config'),/pruned_v2_protocol_source_changed/);console.log(JSON.stringify({readBefore:true,readAfterBlocked:true,realModelRequests:0,userStoreOpened:false}));`;
  const r=spawnSync(process.execPath,['--input-type=module','-e',program],{cwd:directory,encoding:'utf8'});assert.equal(r.status,0,r.stderr);assert.deepEqual(JSON.parse(r.stdout),{readBefore:true,readAfterBlocked:true,realModelRequests:0,userStoreOpened:false});
});
