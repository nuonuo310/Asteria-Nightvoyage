// Fixed synthetic history, no user Store; preparation is never a live admission.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {inlineEntryPreflight} from '../src/inline-entry-preflight.js';
import {prepareInlineEntryHistory} from '../test-support/inline-entry-fixtures.js';
import {createFrozenInlineEntrySource} from '../test-support/frozen-inline-entry-source.js';
const cleanups=[],env=process.env,nativeFetch=globalThis.fetch;let keys=0,requests=0,writes=0;const saved=new Map();
process.env=new Proxy(env,{get(t,k){if(k==='NIGHTVOYAGE_DEEPSEEK_KEY'){keys++;throw Error('credential_forbidden');}return Reflect.get(t,k);}});
globalThis.fetch=()=>{requests++;throw Error('network_forbidden');};
try{
  const directory=prepareInlineEntryHistory({after:f=>cleanups.push(f)}),frozen=createFrozenInlineEntrySource();cleanups.push(frozen.cleanup);const snapshot=()=>Object.fromEntries(fs.readdirSync(directory).sort().filter(f=>fs.statSync(path.join(directory,f)).isFile()).map(f=>[f,fs.readFileSync(path.join(directory,f)).toString('base64')])),before=snapshot();
  for(const name of ['writeFileSync','mkdirSync','unlinkSync','renameSync','rmSync']){saved.set(name,fs[name]);fs[name]=()=>{writes++;throw Error('write_forbidden');};}
  const current=inlineEntryPreflight(),source=inlineEntryPreflight({repositoryRoot:frozen.directory}),history=inlineEntryPreflight({repositoryRoot:frozen.directory,historyDirectory:directory});assert.equal(current.reason,'source_inventory_changed');assert.equal(current.sourceInventoryMatches,false);assert.equal(source.sourceInventoryMatches,true);assert.equal(source.reason,'history_directory_required');assert.equal(history.reason,'paid_profile_and_explicit_approval_pending');assert.equal(history.ready,false);assert.equal(history.history.preservedUnknowns,4);assert.equal(history.history.heldMicroCny,'8812800');assert.deepEqual(snapshot(),before);assert.equal(keys,0);assert.equal(requests,0);assert.equal(writes,0);
  console.log(JSON.stringify({command:'node scripts/check-inline-entry-preflight.mjs',node:process.version,platform:process.platform,reviewVersion:history.reviewVersion,protocolVersion:history.protocolVersion,inventoryFiles:history.inventoryFiles,currentSourceRejected:true,currentReason:current.reason,historicalSourceMatches:true,historicalReason:source.reason,sourceIdentity:'frozen-manifest-reconstruction',recursiveImportClosureProved:false,nextRequestBytes:history.requestBytes,requestByteLimit:65536,requestFits:history.requestFits,historyKind:history.history.kind,syntheticUnknowns:4,syntheticHeldMicroCny:'8812800',historyBytesUnchanged:true,preflightMutationCalls:writes,credentialReads:keys,realModelRequests:requests,ready:false,reason:history.reason,paidProfileAdded:false,budgetSelected:false,pricingReviewed:false,fixtureEgressApproved:false,liveEntryAvailable:false,userStoreAccessed:false,newWindowsHostResult:false,semanticSupport:'not_assessed',qualityAssessed:false},null,2));
}finally{for(const [name,value]of saved)fs[name]=value;process.env=env;globalThis.fetch=nativeFetch;for(const f of cleanups.reverse())f();}
