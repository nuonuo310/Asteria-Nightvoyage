// Fresh-process dependency constraint rehearsal, never a model/Store launcher.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {inlineDependencyGraph,constrainInlineModules} from '../src/inline-entry-dependencies.js';
const expected=JSON.parse(fs.readFileSync(new URL('../src/inline-entry-graph.json',import.meta.url),'utf8')),graph=inlineDependencyGraph();assert.deepEqual(graph,expected);
const env=process.env,native=globalThis.fetch;let keys=0,requests=0,hook;
process.env=new Proxy(env,{get(t,k){if(k==='NIGHTVOYAGE_DEEPSEEK_KEY'){keys++;throw Error('credential_forbidden');}return Reflect.get(t,k);}});globalThis.fetch=()=>{requests++;throw Error('network_forbidden');};
try{
  hook=constrainInlineModules(graph);const loaded=await import('../src/inline-authorized-runtime.js');assert.equal(typeof loaded.InlineAuthorizedStubRuntime,'function');
  await assert.rejects(import('../test-support/inline-entry-fixtures.js'),/inline_dependency_constraint_failed/);
  await assert.rejects(import('data:text/javascript,globalThis.unreviewedModuleExecuted=true'),/inline_dependency_constraint_failed/);assert.equal(globalThis.unreviewedModuleExecuted,undefined);
  await assert.rejects(import('node:net'),/inline_dependency_constraint_failed/);assert.equal(keys,0);assert.equal(requests,0);
  console.log(JSON.stringify({command:'node --experimental-vm-modules scripts/check-inline-entry-dependencies.mjs',node:process.version,platform:process.platform,staticGraphMatches:true,parsedModules:Object.keys(graph.files).length,staticEdges:Object.values(graph.edges).reduce((n,a)=>n+a.length,0),allowedBuiltins:graph.builtins.length,parseOnlyGraphEvaluated:false,reviewedModulesLoadedUnderHooks:true,unpinnedDynamicImportRejected:true,dataModuleRejected:true,unlistedBuiltinRejected:true,credentialReads:keys,nativeRequests:requests,scope:'fresh_process_esm_resolution_and_load_only',sandboxClaimed:false,fullDynamicClosureProved:false,liveEntryAvailable:false,dispatchAuthorized:false,semanticSupport:'not_assessed',qualityAssessed:false},null,2));
}finally{hook?.deregister();process.env=env;globalThis.fetch=native;}
