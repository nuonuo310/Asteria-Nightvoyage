import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {codexCatalogCase,codexCatalogCaseIds} from '../scripts/codex-catalog-comparison.mjs';
import {observeNativeCodexCatalogCase,rehearseCodexCatalogCase} from '../scripts/codex-catalog-comparison-owner.mjs';
const cli=fileURLToPath(new URL('../scripts/check-codex-catalog-comparison.mjs',import.meta.url));
function boundary(r){
 for(const k of ['dispatchEnabled','modelEntitlementVerified','toolExclusionVerified','credentialEnvironmentSupplied','accountAuthorizationRequested','generatedResponseSupplied','catalogRepresentsRealModel','subscriptionCapabilityInferred'])assert.equal(r[k],false,k);
 assert.ok(r.fixtureModelPosts<=1);assert.ok(r.appServerTurnsRequested<=1);
 if(r.processStarted){assert.equal(r.ownedProcessClosed,true);assert.equal(r.temporaryCleanupComplete,true);}
 assert.equal(r.descendantTerminationConfirmed,'unknown');
 const text=JSON.stringify(r);for(const secret of ['http://','fictional-private','fictional-metadata-thread','fictional-observer-turn'])assert.equal(text.includes(secret),false,secret);
}
test('comparison profiles are detached fictional data and vary only image modality and the explicit environment bundle',()=>{
 assert.deepEqual(codexCatalogCaseIds,['image_default','text_default','image_empty','text_empty']);
 const profiles=codexCatalogCaseIds.map(codexCatalogCase);
 for(const p of profiles){assert.equal(p.catalog.models[0].slug,'gpt-5.6-sol');assert.equal(p.environmentless,p.caseId.endsWith('_empty'));}
 const a=profiles[0].catalog,b=profiles[1].catalog;assert.deepEqual(a.models[0].input_modalities,['text','image']);assert.deepEqual(b.models[0].input_modalities,['text']);
 b.models[0].input_modalities=['text','image'];assert.deepEqual(a,b);
 a.models[0].slug='fictional-mutated';assert.equal(codexCatalogCase('image_default').catalog.models[0].slug,'gpt-5.6-sol');
 assert.throws(()=>codexCatalogCase('real'),/catalog_comparison_case_invalid/);
});
for(const caseId of codexCatalogCaseIds)test('actual independent peer observation: '+caseId,async()=>{
 const r=await rehearseCodexCatalogCase(caseId);boundary(r);assert.equal(r.status,'request_observed');assert.equal(r.caseId,caseId);
 assert.equal(r.fictionalCatalogConfigured,true);assert.equal(r.fictionalCatalogBytesChecked,true);assert.equal(r.fixtureModelPosts,1);
 assert.equal(r.emptyEnvironmentsSent,caseId.endsWith('_empty'));
 // This expectation describes the independently scripted peer, not native tool selection.
 assert.equal(r.requestObservation.toolCount,caseId.endsWith('_empty')?0:1);
 assert.equal(r.inputModalities,caseId.startsWith('image_')?'text_and_image':'text_only');
});
for(const scenario of ['unknown_tools','missing_tools','catalog_body_changed','catalog_path_mismatch','model_metadata_warning','auth_header','wrong_provider'])test('comparison stops on '+scenario,async()=>{
 const r=await rehearseCodexCatalogCase('image_empty',scenario);boundary(r);assert.equal(r.status,'blocked');
 if(['catalog_body_changed','catalog_path_mismatch','wrong_provider'].includes(scenario))assert.equal(r.fixtureModelPosts,0);
});
test('queued/active cancellation and bounded timeout retain closed child and workspace ownership',async()=>{
 const queued=new AbortController();queued.abort();const q=await rehearseCodexCatalogCase('text_empty','observed',{signal:queued.signal});boundary(q);assert.equal(q.processStarted,false);
 const active=new AbortController(),pending=rehearseCodexCatalogCase('text_empty','stall_thread',{signal:active.signal});setTimeout(()=>active.abort(),100);const r=await pending;boundary(r);assert.equal(r.status,'cancelled');
 const t=await rehearseCodexCatalogCase('text_default','stall_thread',{timeoutMs:100});boundary(t);assert.equal(t.reason,'preparation_timeout');
});
test('no caller catalogue, credential, provider, executable alias or getter can enter comparison settings',()=>{
 let reads=0;assert.throws(()=>rehearseCodexCatalogCase('image_default','observed',{get timeoutMs(){reads++;return 100;}}));assert.equal(reads,0);
 for(const value of [{catalog:{}},{token:'fictional'},{env:{}},{provider:'openai'},{model:'other'}])assert.throws(()=>rehearseCodexCatalogCase('image_default','observed',value));
 assert.throws(()=>observeNativeCodexCatalogCase(process.execPath,'image_default'));assert.throws(()=>rehearseCodexCatalogCase('image_default','login'));
});
test('CLI defaults to four independent peers, refuses real-provider/fee flags and has no production admission',()=>{
 const result=spawnSync(process.execPath,[cli],{encoding:'utf8'});assert.equal(result.status,0);const r=JSON.parse(result.stdout);
 assert.equal(r.status,'comparison_observed');assert.equal(r.observedCases,4);assert.equal(r.peerToolsAreScripted,true);assert.equal(r.productionAdmission,false);r.reports.forEach(boundary);
 for(const args of [['--live'],['login'],['--approve-budget-cny','3'],['--catalog','fictional']]){const p=spawnSync(process.execPath,[cli,...args],{encoding:'utf8'});assert.equal(p.status,1);assert.equal(JSON.parse(p.stdout).dispatchEnabled,false);}
});
