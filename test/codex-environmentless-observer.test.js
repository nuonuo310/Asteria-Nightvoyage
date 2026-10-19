import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {rehearseCodexWithoutEnvironment as rehearse,observeNativeCodexWithoutEnvironment as observe,rehearseCodexRequestWithFictionalCatalog} from '../scripts/codex-request-observer.mjs';
const cli=fileURLToPath(new URL('../scripts/check-codex-environmentless.mjs',import.meta.url));
function closed(r){
 for(const key of ['dispatchEnabled','toolExclusionVerified','modelEntitlementVerified','environmentHandlerDenialVerified','subscriptionCapabilityInferred','catalogRepresentsRealModel','credentialEnvironmentSupplied','accountAuthorizationRequested','generatedResponseSupplied','requestBodyRetained'])assert.equal(r[key],false);
 assert.ok(r.appServerTurnsRequested<=1);assert.ok(r.fixtureModelPosts<=1);
 if(r.processStarted){assert.equal(r.ownedProcessClosed,true);assert.equal(r.temporaryCleanupComplete,true);}
 assert.equal(r.descendantTerminationConfirmed,'unknown');
}
test('independent peer requires empty turn environments and checked utility controls; empty tools never grant inference',async()=>{
 const r=await rehearse();closed(r);assert.equal(r.contractVersion,'codex-local-environmentless-observer-v1');assert.equal(r.status,'request_observed');assert.equal(r.experimentalApiRequested,true);assert.equal(r.additionalToolControlsConfigured,true);assert.equal(r.emptyEnvironmentsSent,true);assert.equal(r.fixtureModelPosts,1);assert.equal(r.requestObservation.toolCount,0);assert.equal(r.requestObservation.handlerDenialVerified,false);
 assert.equal(r.fictionalCatalogSha256,'366eda4ff7b887afd29bfa06546fd050b4730bbf5407c3a8f00ca4a8e4625189');
});
test('changed interaction control blocks before a local turn or request',async()=>{
 const r=await rehearse('environment_controls_changed');closed(r);assert.equal(r.reason,'configuration_mismatch');assert.equal(r.appServerTurnsRequested,0);assert.equal(r.fixtureModelPosts,0);assert.equal(r.emptyEnvironmentsSent,false);
});
test('catalogue tampering still blocks environmentless launch before turn',async()=>{
 const r=await rehearse('catalog_body_changed');closed(r);assert.equal(r.reason,'fictional_catalog_changed');assert.equal(r.appServerTurnsRequested,0);assert.equal(r.fixtureModelPosts,0);
});
test('actual tool declarations stay visible rather than being filtered by requested environment policy',async()=>{
 const r=await rehearse('known_tools');closed(r);assert.equal(r.status,'request_observed');assert.equal(r.requestObservation.toolCount,1);assert.deepEqual(r.requestObservation.toolClasses,['file_read']);
 for(const scenario of ['unknown_tools','missing_tools','model_metadata_warning']){const r=await rehearse(scenario);closed(r);assert.equal(r.status,'blocked');if(scenario==='model_metadata_warning')assert.equal(r.fixtureModelPosts,0);else assert.equal(r.reason,'request_tools_unreviewed');}
});
test('queued cancellation and stalled turn do not dispatch; cancellation during body suppresses late observation',async()=>{
 const queued=new AbortController();queued.abort();const q=await rehearse('environmentless_tools',{signal:queued.signal});closed(q);assert.equal(q.processStarted,false);
 const stalled=await rehearse('stall_thread',{timeoutMs:300});closed(stalled);assert.equal(stalled.reason,'preparation_timeout');assert.equal(stalled.appServerTurnsRequested,0);
 const active=new AbortController();const task=rehearse('stalled_body',{signal:active.signal});setTimeout(()=>active.abort(),250);const r=await task;closed(r);assert.equal(r.status,'cancelled');assert.equal(r.requestObservation,null);
});
test('original fictional-catalogue mode does not silently remove its environment or interaction setting',async()=>{
 const r=await rehearseCodexRequestWithFictionalCatalog();closed(r);assert.equal(r.experimentalApiRequested,false);assert.equal(r.environmentMode,'default_thread_environment');assert.equal(r.additionalToolControlsConfigured,false);assert.equal(r.emptyEnvironmentsSent,false);assert.equal(r.contractVersion,'codex-local-fictional-catalog-observer-v1');
});
test('caller cannot supply tools, environment, credentials, retry or another provider',()=>{
 let touched=false;assert.throws(()=>rehearse('environmentless_tools',{get timeoutMs(){touched=true;return 1;}}));assert.equal(touched,false);
 for(const value of [{environments:[]},{tools:[]},{provider:'openai'},{key:'fictional'},{retry:true}])assert.throws(()=>rehearse('environmentless_tools',value));
 assert.throws(()=>observe('codex.cmd'));assert.throws(()=>observe(process.execPath));assert.throws(()=>rehearse('login'));
});
test('entry defaults to independent peer and has no live, login, model or fee switch',()=>{
 const r=spawnSync(process.execPath,[cli],{encoding:'utf8'});assert.equal(r.status,0);closed(JSON.parse(r.stdout));
 for(const args of [['--live'],['login'],['--model','other'],['--approve-budget-cny','3']]){const r=spawnSync(process.execPath,[cli,...args],{encoding:'utf8'});assert.equal(r.status,1);assert.equal(JSON.parse(r.stdout).dispatchEnabled,false);}
});

test('official config/read projection may omit utility switches; missing verification remains explicit and never grants inference',async()=>{
 const r=await rehearse('environment_controls_omitted');closed(r);assert.equal(r.status,'request_observed');assert.equal(r.additionalToolControlsRequested,true);assert.equal(r.additionalToolControlsConfigured,false);assert.equal(r.additionalToolControlsStatus,'not_reported');assert.equal(r.requestObservation.toolCount,0);
});
