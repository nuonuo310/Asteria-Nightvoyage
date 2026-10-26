// Fixed synthetic receipt for two source identities and one non-paid wake-feeling loop.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {inlineEntryPreflight,inlineEntryInventory} from '../src/inline-entry-preflight.js';
import {readInlinePaidContract} from '../src/inline-paid-contract.js';
import {launchInlinePaid} from '../src/inline-paid-entry.js';
import {hash} from '../src/contract.js';
import {Nightvoyage} from '../src/engine.js';
import {FakeProvider} from '../src/fake-provider.js';
import {readWakeFirstFeelingView,recordWakeFirstFeeling,renderWakeFirstFeelingView,wakeFirstFeelingVersion} from '../src/wake-first-feeling.js';
import {prepareInlineAdmissionHistory} from '../test-support/inline-admission-fixtures.js';
import {createFrozenInlineEntrySource} from '../test-support/frozen-inline-entry-source.js';

const expectedOldManifestLfSha256='21e08f5444ef0923d9bdc8bc9b2736a1f491601cb3dd960a5b4107ff37d52d6a';
const expectedOldInventoryHash='b4a06baeaeb4d9cf572bb349117d651db993957f413518a4b7ea1caf975a908d';
const reviewNow=Date.parse('2026-10-17T14:49:01Z');
const fixture=JSON.parse(fs.readFileSync(new URL('../fixtures/wake-first-feeling.json',import.meta.url),'utf8'));
class SyntheticWakeProvider extends FakeProvider{
  identity='fake-versioned-wake-admission-v1';
  async generate({stage,scenes}){
    if(stage==='wake')return {fragment:scenes.at(-1).event,residue:0.18,associations:[]};
    if(scenes.length===0)return {event:'一个虚构的守灯人把最后一盏纸灯挂到木桥边，河面没有风。',appraisal:{goalEffect:0,control:0.5,uncertainty:0.6},delta:{valence:-0.05,arousal:0.05}};
    return {event:'守灯人松开灯线，纸灯沿水面慢慢漂远，桥下的灯影分成两半。',appraisal:{goalEffect:-1,control:0.3,uncertainty:0.7},delta:{valence:-0.15,arousal:0.1}};
  }
}
const cleanups=[],environment=process.env,nativeFetch=globalThis.fetch;let credentialReads=0,networkAttempts=0,engine,frozen;
globalThis.fetch=()=>{networkAttempts++;throw Error('network_forbidden');};
try{
  frozen=createFrozenInlineEntrySource();cleanups.push(frozen.cleanup);
  const historyDirectory=prepareInlineAdmissionHistory({after:f=>cleanups.push(f)});
  process.env=new Proxy(environment,{get(target,key){if(key==='NIGHTVOYAGE_DEEPSEEK_KEY'){credentialReads++;throw Error('credential_forbidden');}return Reflect.get(target,key);}});
  const manifestBytes=fs.readFileSync(new URL('../src/inline-entry-review.json',import.meta.url)),manifestLfBytes=Buffer.from(manifestBytes.toString('utf8').replaceAll('\r\n','\n')),manifestSha256=createHash('sha256').update(manifestLfBytes).digest('hex'),profile=JSON.parse(manifestLfBytes);
  const currentInventory=inlineEntryInventory(),added=Object.keys(currentInventory).filter(file=>!Object.hasOwn(profile.files,file)).sort();
  assert.equal(manifestSha256,expectedOldManifestLfSha256);assert.equal(hash(profile.files),expectedOldInventoryHash);assert.deepEqual(added,['fixtures/generated-wake-offline.js','fixtures/wake-first-feeling.json','src/generated-wake-protocol.js','src/generated-wake-records.js','src/generated-wake-runtime.js','src/wake-first-feeling.js']);assert.notEqual(hash(currentInventory),expectedOldInventoryHash);

  const currentPreflight=inlineEntryPreflight(),historicalPreflight=inlineEntryPreflight({repositoryRoot:frozen.directory,historyDirectory});
  assert.equal(currentPreflight.sourceInventoryMatches,false);assert.equal(currentPreflight.reason,'source_inventory_changed');assert.equal(historicalPreflight.sourceInventoryMatches,true);assert.equal(historicalPreflight.history.checked,true);assert.equal(historicalPreflight.history.preservedUnknowns,4);assert.equal(historicalPreflight.history.heldMicroCny,'8812800');assert.equal(historicalPreflight.reason,'paid_profile_and_explicit_approval_pending');assert.equal(historicalPreflight.ready,false);
  assert.throws(()=>readInlinePaidContract({now:reviewNow}),/paid_contract_source_changed/);
  const oldContract=readInlinePaidContract({repositoryRoot:frozen.directory,now:reviewNow});
  assert.equal(oldContract.contract.source.inventoryHash,expectedOldInventoryHash);assert.equal(oldContract.contract.paidEvaluationApproved,false);assert.equal(oldContract.contract.fictionalEgressApproved,false);assert.equal(oldContract.contract.qualityAssessed,false);

  const beforeLaunchState=fs.readFileSync(path.join(historyDirectory,'state.json'));let currentPaidEntryError,currentPaidEntryCredentialSupplierCalls=0;
  try{await launchInlinePaid('preflight',historyDirectory,{credentialSupplier:()=>{currentPaidEntryCredentialSupplierCalls++;throw Error('credential_forbidden');}});}catch(error){currentPaidEntryError=error.message;}
  const currentPaidEntryHistoryBytesUnchanged=fs.readFileSync(path.join(historyDirectory,'state.json')).equals(beforeLaunchState),currentPaidEntryOwnerLockAbsent=!fs.existsSync(path.join(historyDirectory,'owner.lock'));
  assert.equal(currentPaidEntryError,'inline_paid_entry_refused');assert.equal(currentPaidEntryCredentialSupplierCalls,0);assert.equal(currentPaidEntryHistoryBytesUnchanged,true);assert.equal(currentPaidEntryOwnerLockAbsent,true);

  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-versioned-wake-'));cleanups.push(()=>fs.rmSync(directory,{recursive:true,force:true}));
  engine=new Nightvoyage(directory,{provider:new SyntheticWakeProvider()});
  const id=engine.start('versioned-wake-receipt','versioned-wake-receipt',fixture),status=await engine.execute(id),dream=engine.result(id).dream;
  assert.equal(status.status,'completed');assert.ok(dream);
  const beforeDream=structuredClone(engine.read(dream.id)),beforeBilling=structuredClone(engine.store.state.billing??null),beforeReceipt=structuredClone(engine.status(dream.runId));
  const feeling=recordWakeFirstFeeling(engine.store,{dreamId:dream.id,requestId:'versioned-wake-feeling',status:'present',text:'醒来时胸口有点空，像还站在桥上；这是虚构角色的醒后心情。',now:1761369000000});
  engine.append(dream.id,'recollection','后来再想起时，只记得纸灯在水上没有发出声音。');
  const view=readWakeFirstFeelingView(engine.store,dream.id,{now:1761369060000}),rendered=renderWakeFirstFeelingView(view);
  assert.equal(wakeFirstFeelingVersion,'wake-first-feeling-v1');assert.equal(feeling.origin,'wake_first_feeling');assert.equal(feeling.order,1);assert.equal(feeling.isRealityFact,false);assert.equal(view.wake.fragment,beforeDream.scenes[1].event);assert.equal(view.firstFeeling.text,feeling.text);assert.equal(view.later.length,1);assert.ok(rendered.indexOf('【原梦】')<rendered.indexOf('【醒来】')&&rendered.indexOf('【醒来】')<rendered.indexOf('【刚醒心情】')&&rendered.indexOf('【刚醒心情】')<rendered.indexOf('【后来回想】'));
  assert.deepEqual(engine.read(dream.id),beforeDream);assert.deepEqual(engine.store.state.billing??null,beforeBilling);assert.deepEqual(engine.status(dream.runId),beforeReceipt);

  console.log(JSON.stringify({command:'node scripts/check-versioned-wake-admission.mjs',node:process.version,platform:process.platform,oldManifestLfSha256:manifestSha256,oldInventoryHash:expectedOldInventoryHash,newInventoryHash:hash(currentInventory),oldInventoryFiles:Object.keys(profile.files).length,newInventoryFiles:Object.keys(currentInventory).length,addedFiles:added,currentPreflightReason:currentPreflight.reason,currentPaidContractReason:'paid_contract_source_changed',currentPaidEntryFailClosed:currentPaidEntryError==='inline_paid_entry_refused',currentPaidEntryError,currentPaidEntryCredentialSupplierCalls,currentPaidEntryHistoryBytesUnchanged,currentPaidEntryOwnerLockAbsent,oldPreflightSourceMatches:historicalPreflight.sourceInventoryMatches,oldHistoryPreserved:historicalPreflight.history.checked,oldHistoryHeldMicroCny:historicalPreflight.history.heldMicroCny,oldContractSourcePinned:oldContract.contract.source.inventoryHash===expectedOldInventoryHash,oldContractApprovals:false,wakeFirstFeelingVersion,dreamStages:view.dream.scenes.length,wakeFragmentExact:true,firstFeelingStatus:view.firstFeeling.status,firstFeelingOrder:view.firstFeeling.order,recollectionCount:view.later.length,residueKind:view.residue?.label,dreamAndReceiptUnchanged:true,billingUnchanged:true,manualFeelingFromValenceArousal:false,oldRecordMigrated:false,oldPermissionReused:false,manifestRefreshed:false,implementationMovedOutsideInventory:false,userStoreAccessed:false,credentialReads,networkAttempts,realModelRequests:0,qualityAssessed:false,semanticSupport:'not_assessed'},null,2));
}finally{
  engine?.close();process.env=environment;globalThis.fetch=nativeFetch;for(const cleanup of cleanups.reverse())cleanup();
}
