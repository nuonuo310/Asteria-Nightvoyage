// Fixed fictional history; Store lifecycle may recover/save, guard itself never writes.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {inlineStubAllowance} from '../test-support/inline-budget-fixtures.js';
import {prepareInlineAdmissionHistory} from '../test-support/inline-admission-fixtures.js';
import {createFrozenInlineEntrySource,frozenModule} from '../test-support/frozen-inline-entry-source.js';
const cleanups=[],env=process.env,native=globalThis.fetch;let keys=0,requests=0,store,frozen;
const frozenSource=createFrozenInlineEntrySource();cleanups.push(frozenSource.cleanup);frozen=frozenSource.directory;
const {Store}=await frozenModule(frozen,'src/store.js'),{BudgetLedger}=await frozenModule(frozen,'src/budget-ledger.js'),{InlineHistoryGuard,inlineCandidateAllowanceId}=await frozenModule(frozen,'src/inline-entry-admission.js'),{inlineProtocolVersion}=await frozenModule(frozen,'src/inline-evidence-protocol.js');
process.env=new Proxy(env,{get(t,k){if(k==='NIGHTVOYAGE_DEEPSEEK_KEY'){keys++;throw Error('credential_forbidden');}return Reflect.get(t,k);}});globalThis.fetch=()=>{requests++;throw Error('network_forbidden');};
try{
  const d=prepareInlineAdmissionHistory({after:f=>cleanups.push(f)});store=new Store(d);const old=structuredClone(store.state.billing.accounts),disk=fs.readFileSync(path.join(d,'state.json'),'utf8'),g=new InlineHistoryGuard(store);assert.equal(g.assertPreserved().dispatchAuthorized,false);assert.equal(fs.readFileSync(path.join(d,'state.json'),'utf8'),disk);
  new BudgetLedger(store).approve({...inlineStubAllowance(),id:inlineCandidateAllowanceId,protocolVersion:inlineProtocolVersion});assert.equal(g.assertPreserved().historyPreserved,true);for(const [id,a]of Object.entries(old))assert.deepEqual(store.state.billing.accounts[id],a);store.close();store=new Store(d);const again=new InlineHistoryGuard(store);assert.equal(again.assertPreserved().historyPreserved,true);store.withdraw('q-sparse-memory');assert.throws(()=>again.assertPreserved(),/source_withdrawn/);for(const [id,a]of Object.entries(old))assert.deepEqual(store.state.billing.accounts[id],a);assert.equal(keys,0);assert.equal(requests,0);
  console.log(JSON.stringify({command:'node scripts/check-inline-history-guard.mjs',node:process.version,platform:process.platform,sourceIdentity:'frozen-manifest-reconstruction',preservedSyntheticUnknowns:4,syntheticHeldMicroCny:'8812800',ownerLockChecked:true,guardStateBytesUnchanged:true,candidateAccountMode:'stub',oldAccountsUnchanged:true,reopened:true,baselineRecreatedAfterReopen:true,durableApprovalBaselineImplemented:false,withdrawalBlocksGuard:true,storeLifecycleMayWrite:true,credentialReads:keys,nativeRequests:requests,userStoreAccessed:false,dispatchAuthorized:false,liveEntryAvailable:false,semanticSupport:'not_assessed',qualityAssessed:false},null,2));
}finally{store?.close();process.env=env;globalThis.fetch=native;for(const f of cleanups.reverse())f();}
