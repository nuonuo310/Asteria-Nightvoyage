import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {fictionalCodexCatalog} from '../scripts/codex-fictional-catalog.mjs';
import {rehearseCodexRequestWithFictionalCatalog as rehearse,observeNativeCodexRequestWithFictionalCatalog as observe,rehearseCodexRequestObserver} from '../scripts/codex-request-observer.mjs';
const cli=fileURLToPath(new URL('../scripts/check-codex-fictional-catalog.mjs',import.meta.url));
function boundary(r){
 for(const key of ['catalogRepresentsRealModel','subscriptionCapabilityInferred','dispatchEnabled','toolExclusionVerified','modelEntitlementVerified','accountAuthorizationRequested','credentialEnvironmentSupplied','generatedResponseSupplied','requestBodyRetained'])assert.equal(r[key],false);
 assert.equal(r.catalogControlsToolExposure,true);assert.equal(r.descendantTerminationConfirmed,'unknown');assert.ok(r.appServerTurnsRequested<=1);
 if(r.processStarted){assert.equal(r.ownedProcessClosed,true);assert.equal(r.temporaryCleanupComplete,true);}
 for(const text of ['http://','fictional-metadata-thread','fictional-observer-turn',os.tmpdir()])assert.ok(!JSON.stringify(r).includes(text));
}
test('catalogue is independent detached fictional protocol data and does not suppress patch/shell/image surface by metadata',()=>{
 const c=fictionalCodexCatalog();assert.equal(c.models.length,1);const m=c.models[0];assert.equal(m.slug,'gpt-5.6-sol');assert.match(m.display_name,/fictional/);assert.equal(m.supported_in_api,false);
 assert.equal(m.shell_type,'unified_exec');assert.equal(m.apply_patch_tool_type,'freeform');assert.ok(m.input_modalities.includes('image'));assert.equal(m.tool_mode,'direct');assert.ok(!Object.hasOwn(m,'used_fallback_model_metadata'));
 m.slug='fictional-mutated';m.model_messages.instructions_template='fictional-mutated';assert.equal(fictionalCodexCatalog().models[0].slug,'gpt-5.6-sol');assert.ok(!JSON.stringify(fictionalCodexCatalog()).includes('fictional-mutated'));
});
test('startup catalogue is byte-checked before the sole local turn; a declared tool is observed without inference admission',async()=>{
 const r=await rehearse();boundary(r);assert.equal(r.contractVersion,'codex-local-fictional-catalog-observer-v1');assert.equal(r.status,'request_observed');
 assert.equal(r.fictionalCatalogConfigured,true);assert.equal(r.fictionalCatalogBytesChecked,true);assert.match(r.fictionalCatalogSha256,/^[a-f0-9]{64}$/);assert.equal(r.fixtureModelPosts,1);assert.equal(r.appServerTurnsRequested,1);assert.deepEqual(r.requestObservation.toolClasses,['file_read']);
});
for(const [scenario,reason] of [['catalog_path_mismatch','configuration_mismatch'],['catalog_body_changed','fictional_catalog_changed'],['catalog_missing','fictional_catalog_changed']])test(`fictional ${scenario} prevents the local turn`,async()=>{
 const r=await rehearse(scenario);boundary(r);assert.equal(r.status,'blocked');assert.equal(r.reason,reason);assert.equal(r.appServerTurnsRequested,0);assert.equal(r.fixtureModelPosts,0);assert.equal(r.fictionalCatalogBytesChecked,false);
});
test('an explicit empty tool array is not upgraded to GPT capability or handler denial',async()=>{
 const r=await rehearse('empty_tools');boundary(r);assert.equal(r.status,'request_observed');assert.equal(r.requestObservation.toolExposureStatus,'no_tools_declared');assert.equal(r.requestObservation.handlerDenialVerified,false);
});
test('fallback warning, unknown tool and missing tool field still block in catalogue mode',async()=>{
 for(const scenario of ['model_metadata_warning','unknown_tools','missing_tools']){
  const r=await rehearse(scenario);boundary(r);assert.equal(r.status,'blocked');
  if(scenario==='model_metadata_warning'){assert.equal(r.fixtureModelPosts,0);assert.equal(r.notificationRejection.method,'warning');}
  else assert.equal(r.reason,'request_tools_unreviewed');
 }
});
test('original observer stays on original empty fixture mode without a catalogue or silent fallback',async()=>{
 const r=await rehearseCodexRequestObserver();boundary(r);assert.equal(r.contractVersion,'codex-local-request-observer-v1');assert.equal(r.catalogMode,'original_empty_fixture_catalog');assert.equal(r.fictionalCatalogSha256,null);assert.equal(r.fictionalCatalogConfigured,false);
});
test('catalogue mode cancellation and timeout keep one process attempt and suppress late request',async()=>{
 const queued=new AbortController();queued.abort();const q=await rehearse('known_tools',{signal:queued.signal});boundary(q);assert.equal(q.processStarted,false);
 const active=new AbortController(),p=rehearse('stalled_body',{signal:active.signal});setTimeout(()=>active.abort(),200);const r=await p;boundary(r);assert.equal(r.status,'cancelled');assert.equal(r.requestObservation,null);
 const timed=await rehearse('stall_thread',{timeoutMs:300});boundary(timed);assert.equal(timed.reason,'preparation_timeout');assert.equal(timed.appServerTurnsRequested,0);
});
test('no arbitrary catalogue path, model, provider, auth or getters can be supplied',()=>{
 let touched=false;assert.throws(()=>rehearse('known_tools',{get timeoutMs(){touched=true;return 1;}}));assert.equal(touched,false);
 for(const value of [{catalogPath:'fictional'}, {provider:'openai'},{model:'other'},{key:'fictional'}])assert.throws(()=>rehearse('known_tools',value));
 assert.throws(()=>observe('codex.cmd'));assert.throws(()=>observe(process.execPath));assert.throws(()=>rehearse('login'));
});
test('catalogue CLI defaults to independent peer and refuses fee/login/real-provider flags',()=>{
 const r=spawnSync(process.execPath,[cli],{encoding:'utf8'});assert.equal(r.status,0);boundary(JSON.parse(r.stdout));
 for(const args of [['--live'],['login'],['--model','other'],['--catalog','fictional']]){const r=spawnSync(process.execPath,[cli,...args],{encoding:'utf8'});assert.equal(r.status,1);assert.equal(JSON.parse(r.stdout).dispatchEnabled,false);}
});
test('redirecting temporary storage inside a checkout blocks before creating a catalogue',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'fictional-catalog-parent-'));
 try{fs.mkdirSync(path.join(root,'.git'));const r=spawnSync(process.execPath,[cli],{encoding:'utf8',env:{...process.env,TMPDIR:root,TMP:root,TEMP:root}});assert.equal(r.status,1);assert.deepEqual(fs.readdirSync(root),['.git']);}
 finally{fs.rmSync(root,{recursive:true,force:true});}
});
