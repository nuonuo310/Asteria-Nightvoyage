import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {rehearseCodexNativeMetadata,inspectNativeCodexMetadata} from '../scripts/codex-native-metadata.mjs';
const cli=fileURLToPath(new URL('../scripts/check-codex-native-metadata.mjs',import.meta.url));
function boundary(report){
 assert.equal(report.accountAuthorizationRequested,false);assert.equal(report.appServerTurnsRequested,0);
 assert.equal(report.dispatchEnabled,false);assert.equal(report.toolExclusionVerified,false);assert.equal(report.modelEntitlementVerified,false);
 assert.ok(!report.methodsQueued.some(method=>method==='turn/start'||method.startsWith('account/')));
 if(report.processStarted){assert.equal(report.ownedProcessClosed,true);assert.equal(report.temporaryCleanupComplete,true);}
 assert.equal(report.descendantTerminationConfirmed,'unknown');
}
test('metadata owner verifies a fixed fictional provider and ephemeral thread, then closes without a turn',async()=>{
 const result=await rehearseCodexNativeMetadata();boundary(result);
 assert.equal(result.status,'metadata_prepared');assert.equal(result.threadPrepared,true);assert.equal(result.threadEphemeralVerified,true);
 assert.deepEqual(result.methodsQueued,['initialize','initialized','config/read','thread/start']);
 assert.equal(result.fixtureModelPosts,0);assert.equal(result.credentialEnvironmentSupplied,false);
 assert.ok(!JSON.stringify(result).includes('http://'));assert.ok(!JSON.stringify(result).includes('fictional-metadata-thread'));
});
for(const scenario of ['wrong_model','wrong_provider','not_ephemeral','rpc_error','server_request','invalid_stdout','early_exit','early_thread_mismatch','config_warning']){
 test(`metadata owner rejects ${scenario} without emitting private replies or any model turn`,async()=>{
  const result=await rehearseCodexNativeMetadata(scenario);boundary(result);assert.equal(result.status,'blocked');assert.equal(result.threadPrepared,false);
  assert.ok(!JSON.stringify(result).includes('fictional-private-error'));assert.ok(!JSON.stringify(result).includes('fictional command'));
 });
}
test('a short stderr error remains visible but never proves tool absence or subscription entitlement',async()=>{
 const result=await rehearseCodexNativeMetadata('lookup_error');boundary(result);
 assert.ok(result.startupDiagnostics.labels.includes('sandbox_executable_lookup_failed'));assert.equal(result.status,'blocked');assert.equal(result.reason,'startup_error_observed');assert.ok(!result.methodsQueued.includes('thread/start'));
});
test('an unexpected local fixture POST is stopped and counted, never accepted as a dream or another turn',async()=>{
 const result=await rehearseCodexNativeMetadata('unexpected_post');boundary(result);
 assert.equal(result.status,'blocked');assert.equal(result.reason,'unexpected_fixture_dispatch');assert.equal(result.fixtureModelPosts,1);assert.equal(result.threadPrepared,false);
});
test('thread preparation timeout closes its peer and temporary workspace without retry',async()=>{
 const result=await rehearseCodexNativeMetadata('stall_thread',{timeoutMs:300});boundary(result);
 assert.equal(result.status,'blocked');assert.equal(result.reason,'preparation_timeout');
 assert.equal(result.methodsQueued.filter(method=>method==='initialize').length,1);
});
test('queued cancellation starts no process; in-flight cancellation closes the metadata peer',async()=>{
 const controller=new AbortController();controller.abort();const queued=await rehearseCodexNativeMetadata('success',{signal:controller.signal});boundary(queued);
 assert.equal(queued.processStarted,false);assert.equal(queued.status,'cancelled');
 const active=new AbortController(),pending=rehearseCodexNativeMetadata('stall_thread',{signal:active.signal});setTimeout(()=>active.abort(),100);
 const result=await pending;boundary(result);assert.equal(result.status,'cancelled');
});
test('closed arguments reject getters, provider/login authority, unknown scenarios and non-native executable paths',()=>{
 let invoked=false;assert.throws(()=>rehearseCodexNativeMetadata('success',{get timeoutMs(){invoked=true;return 1;}}));assert.equal(invoked,false);
 for(const value of [{provider:'openai'},{key:'fictional'},{timeoutMs:0},{timeoutMs:30001},{env:{}}])assert.throws(()=>rehearseCodexNativeMetadata('success',value));
 assert.throws(()=>rehearseCodexNativeMetadata('login'));assert.throws(()=>inspectNativeCodexMetadata('codex'));assert.throws(()=>inspectNativeCodexMetadata(process.execPath));
});
test('parent credentials, Node options and proxy configuration are not inherited by the independent peer',async()=>{
 const names=['OPENAI_API_KEY','ACCESS_TOKEN','NODE_OPTIONS','NODE_PATH','NIGHTVOYAGE_DEEPSEEK_KEY','HTTPS_PROXY'];
 const saved=names.map(name=>[name,process.env[name]]);
 try{for(const name of names)process.env[name]='fictional-parent-sentinel';const result=await rehearseCodexNativeMetadata();boundary(result);assert.equal(result.status,'metadata_prepared');}
 finally{for(const [name,value] of saved)if(value===undefined)delete process.env[name];else process.env[name]=value;}
});
test('CLI defaults to the independent peer, and rejects inference flags without starting native software',()=>{
 const rejected=spawnSync(process.execPath,[cli,'--live'],{encoding:'utf8'});assert.equal(rejected.status,1);
 assert.equal(JSON.parse(rejected.stdout).appServerTurnsRequested,0);
 const result=spawnSync(process.execPath,[cli],{encoding:'utf8'});assert.equal(result.status,0);const report=JSON.parse(result.stdout);boundary(report);assert.equal(report.kind,'independent_node_peer');
});

test('fixture catalog access stays local, is counted, and cannot authorize a model turn',async()=>{
 const result=await rehearseCodexNativeMetadata('catalog_get');boundary(result);
 assert.equal(result.status,'metadata_prepared');assert.equal(result.fixtureCatalogGets,1);assert.equal(result.fixtureModelPosts,0);
});

for(const scenario of ['config_wrong_endpoint','config_auth_required','initialize_wrong_home']){
 test(`altered ${scenario} blocks before any thread is requested`,async()=>{
  const result=await rehearseCodexNativeMetadata(scenario);boundary(result);assert.equal(result.status,'blocked');
  assert.ok(!result.methodsQueued.includes('thread/start'));assert.equal(result.fixtureModelPosts,0);
 });
}

test('a temporary directory inside a Git checkout is rejected before creating owner state',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'fictional-metadata-git-'));
 try{
  fs.mkdirSync(path.join(root,'.git'));
  const result=spawnSync(process.execPath,[cli],{encoding:'utf8',env:{...process.env,TMPDIR:root,TMP:root,TEMP:root}});
  assert.equal(result.status,1);assert.equal(JSON.parse(result.stdout).reason,'metadata_arguments_or_environment_invalid');
  assert.deepEqual(fs.readdirSync(root),['.git']);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
