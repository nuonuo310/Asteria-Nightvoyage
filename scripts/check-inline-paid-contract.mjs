// Fixed review-clock rehearsal, not a current live authorization or price renewal.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {Store} from '../src/store.js';
import {hash} from '../src/contract.js';
import {readInlinePaidContract,inlinePaidContractPreflight,inspectInlinePaidAdmission,inspectInlinePaidAcknowledgement} from '../src/inline-paid-contract.js';
import {prepareInlineAdmissionHistory} from '../test-support/inline-admission-fixtures.js';
const now=Date.parse('2026-10-17T14:49:01Z'),cleanups=[],env=process.env,native=globalThis.fetch;let keys=0,requests=0,store;
process.env=new Proxy(env,{get(target,key){if(key==='NIGHTVOYAGE_DEEPSEEK_KEY'){keys++;throw Error('credential_forbidden');}return Reflect.get(target,key);}});
globalThis.fetch=()=>{requests++;throw Error('native_network_forbidden');};
try{
  const directory=prepareInlineAdmissionHistory({after:f=>cleanups.push(f)}),{contract,contractHash}=readInlinePaidContract({now}),state=inlinePaidContractPreflight({historyDirectory:directory,now});assert.equal(state.ready,false);assert.equal(state.history.checked,true);
  store=new Store(directory);const before=hash(store.state),saved=fs.readFileSync(path.join(directory,'state.json'));
  const evidence=inspectInlinePaidAdmission(store,contract,{now}),ack=inspectInlinePaidAcknowledgement(contract,{contractHash,budgetCny:3,caseId:'sparse-context',allowFictionalEgress:true,acknowledgePreservedHolds:true,acknowledgeMutableModelAlias:true},{now});
  assert.equal(hash(store.state),before);assert.deepEqual(fs.readFileSync(path.join(directory,'state.json')),saved);assert.equal(keys,0);assert.equal(requests,0);assert.equal(evidence.createsAccount,false);assert.equal(ack.createsAuthorization,false);
  console.log(JSON.stringify({command:'node scripts/check-inline-paid-contract.mjs',node:process.version,platform:process.platform,reviewClock:new Date(now).toISOString(),reviewClockIsFixture:true,contractHash,firstRequestBytes:evidence.firstRequestBytes,requestByteLimit:65536,nextReservationMicroCny:evidence.nextReservationMicroCny,preservedUnknowns:4,preservedUnknownMicroCny:'8812800',oldStateAndAccountBytesUnchanged:true,acknowledgementShapeChecked:true,createsAuthorization:false,createsAccount:false,credentialReads:keys,nativeRequests:requests,realModelRequests:0,userStoreAccessed:false,sourcePinsAutomaticallyRefreshed:false,liveEntryAvailable:false,implementationReady:false,qualityAssessed:false,semanticSupport:'not_assessed'},null,2));
}finally{store?.close();process.env=env;globalThis.fetch=native;for(const cleanup of cleanups.reverse())cleanup();}
