// Fixed synthetic receipt: old gates stay closed while the new offline loop completes.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {inlineEntryPreflight,inlineEntryInventory} from '../src/inline-entry-preflight.js';
import {readInlinePaidContract} from '../src/inline-paid-contract.js';
import {launchInlinePaid} from '../src/inline-paid-entry.js';
import {hash} from '../src/contract.js';
import {generatedWakeFixture as fixture} from '../fixtures/generated-wake-offline.js';
import {GeneratedWakeRehearsal} from '../src/generated-wake-runtime.js';
import {readGeneratedWakeView,renderGeneratedWakeView} from '../src/generated-wake-records.js';
import {generatedWakeProtocolVersion,generatedWakeRuntimeVersion,generatedWakeTextBasis,generatedWakePromptHash} from '../src/generated-wake-protocol.js';
import {wakeFirstFeelingVersion} from '../src/wake-first-feeling.js';
import {prepareInlineAdmissionHistory} from '../test-support/inline-admission-fixtures.js';
import {createFrozenInlineEntrySource} from '../test-support/frozen-inline-entry-source.js';

const expectedOldManifestLfSha256='21e08f5444ef0923d9bdc8bc9b2736a1f491601cb3dd960a5b4107ff37d52d6a';
const expectedOldInventoryHash='b4a06baeaeb4d9cf572bb349117d651db993957f413518a4b7ea1caf975a908d';
const expectedAdded=[
  'fixtures/generated-wake-offline.js','fixtures/wake-first-feeling.json',
  'src/generated-wake-protocol.js','src/generated-wake-records.js',
  'src/generated-wake-runtime.js','src/wake-first-feeling.js'
];
const reviewNow=Date.parse('2026-10-17T14:49:01Z');
const cleanups=[],environment=process.env,nativeFetch=globalThis.fetch;
let credentialReads=0,networkAttempts=0,engine,frozen;
globalThis.fetch=()=>{networkAttempts++;throw Error('network_forbidden');};
try{
  frozen=createFrozenInlineEntrySource();cleanups.push(frozen.cleanup);
  const historyDirectory=prepareInlineAdmissionHistory({after:file=>cleanups.push(file)});
  process.env=new Proxy(environment,{get(target,key){
    if(key==='NIGHTVOYAGE_DEEPSEEK_KEY'){credentialReads++;throw Error('credential_forbidden');}
    return Reflect.get(target,key);
  }});
  const manifestBytes=fs.readFileSync(new URL('../src/inline-entry-review.json',import.meta.url));
  const manifestLfBytes=Buffer.from(manifestBytes.toString('utf8').replaceAll('\r\n','\n'));
  const manifestSha256=createHash('sha256').update(manifestLfBytes).digest('hex'),profile=JSON.parse(manifestLfBytes);
  const currentInventory=inlineEntryInventory(),added=Object.keys(currentInventory).filter(file=>!Object.hasOwn(profile.files,file)).sort();
  assert.equal(manifestSha256,expectedOldManifestLfSha256);assert.equal(hash(profile.files),expectedOldInventoryHash);
  assert.deepEqual(added,expectedAdded);assert.notEqual(hash(currentInventory),expectedOldInventoryHash);

  const currentPreflight=inlineEntryPreflight(),historicalPreflight=inlineEntryPreflight({repositoryRoot:frozen.directory,historyDirectory});
  assert.equal(currentPreflight.sourceInventoryMatches,false);assert.equal(currentPreflight.reason,'source_inventory_changed');
  assert.equal(historicalPreflight.sourceInventoryMatches,true);assert.equal(historicalPreflight.history.checked,true);
  assert.equal(historicalPreflight.history.preservedUnknowns,4);assert.equal(historicalPreflight.history.heldMicroCny,'8812800');
  assert.equal(historicalPreflight.reason,'paid_profile_and_explicit_approval_pending');assert.equal(historicalPreflight.ready,false);
  assert.throws(()=>readInlinePaidContract({now:reviewNow}),/paid_contract_source_changed/);
  const oldContract=readInlinePaidContract({repositoryRoot:frozen.directory,now:reviewNow});
  assert.equal(oldContract.contract.source.inventoryHash,expectedOldInventoryHash);
  assert.equal(oldContract.contract.paidEvaluationApproved,false);assert.equal(oldContract.contract.fictionalEgressApproved,false);
  assert.equal(oldContract.contract.qualityAssessed,false);

  const beforeLaunchState=fs.readFileSync(path.join(historyDirectory,'state.json'));
  let currentPaidEntryError,currentPaidEntryCredentialSupplierCalls=0;
  try{
    await launchInlinePaid('preflight',historyDirectory,{credentialSupplier:()=>{currentPaidEntryCredentialSupplierCalls++;throw Error('credential_forbidden');}});
  }catch(error){currentPaidEntryError=error.message;}
  const currentPaidEntryHistoryBytesUnchanged=fs.readFileSync(path.join(historyDirectory,'state.json')).equals(beforeLaunchState);
  const currentPaidEntryOwnerLockAbsent=!fs.existsSync(path.join(historyDirectory,'owner.lock'));
  assert.equal(currentPaidEntryError,'inline_paid_entry_refused');assert.equal(currentPaidEntryCredentialSupplierCalls,0);
  assert.equal(currentPaidEntryHistoryBytesUnchanged,true);assert.equal(currentPaidEntryOwnerLockAbsent,true);

  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-generated-wake-'));
  cleanups.push(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const calls=[];
  const simulator=request=>{
    const material=JSON.parse(request.body.messages[1].content);
    calls.push(request);
    const data=material.stage==='wake'
      ? {fragment:material.previousScenes[fixture.wake.fragmentSceneIndex].event,residue:fixture.wake.residue,
          associations:[...fixture.wake.associations],firstFeeling:structuredClone(fixture.wake.firstFeeling)}
      : structuredClone(fixture.scenes[material.sceneIndex]);
    return {status:200,body:{model:'deepseek-flash',
      choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(data)}}],
      usage:{prompt_tokens:100,completion_tokens:80,total_tokens:180}}};
  };
  engine=new GeneratedWakeRehearsal(directory,{allowance:structuredClone(fixture.allowance),simulator,enabled:true});
  const id=engine.start('generated-wake-receipt','generated-wake-receipt',fixture.snapshot);
  const status=await engine.execute(id),packet=engine.result(id),dream=packet.dream;
  assert.equal(status.status,'completed');assert.ok(dream);assert.equal(calls.length,3);
  assert.ok(calls.every(request=>request.body.max_tokens===400));
  const rows=engine.rows(id);assert.equal(rows.length,3);assert.ok(rows.every(row=>row.status==='settled'));
  assert.equal(engine.store.state.billing,undefined);assert.ok(engine.store.state.generatedWakeBilling);
  const beforeDream=structuredClone(engine.read(dream.id)),beforeReceipt=structuredClone(engine.status(id));
  const beforeGeneratedBilling=structuredClone(engine.store.state.generatedWakeBilling);
  engine.append(dream.id,'recollection','后来只记得水面没有声音。');
  const view=readGeneratedWakeView(engine.store,dream.id,{now:Date.now()}),rendered=renderGeneratedWakeView(view);
  assert.equal(view.protocolVersion,generatedWakeProtocolVersion);assert.equal(view.dream.scenes.length,2);
  assert.equal(view.wake.fragment,fixture.scenes[1].event);assert.equal(view.firstFeeling.status,'present');
  assert.equal(view.firstFeeling.text,fixture.wake.firstFeeling.text);assert.equal(view.firstFeeling.textBasis,generatedWakeTextBasis);
  assert.notEqual(view.firstFeeling.textBasis,'explicit_fictional_record');assert.equal(view.firstFeeling.wakeAttempt.index,2);
  assert.equal(view.firstFeeling.wakeAttempt.protocolVersion,generatedWakeProtocolVersion);assert.equal(view.later.length,1);
  assert.equal(view.residue.label,'simulated_estimate');assert.deepEqual(engine.read(dream.id),beforeDream);
  assert.deepEqual(engine.status(id),beforeReceipt);assert.deepEqual(engine.store.state.generatedWakeBilling,beforeGeneratedBilling);
  const labels=['【原梦】','【醒来残片】','【刚醒心情】','【后来回想】'],positions=labels.map(label=>rendered.indexOf(label));
  assert.ok(positions.every(position=>position>=0));assert.deepEqual(positions,[...positions].sort((a,b)=>a-b));
  assert.equal(rendered.includes('deepseek'),false);assert.equal(JSON.stringify(view).includes('deepseek'),false);
  assert.equal(Object.values(engine.store.state.entries).some(entry=>entry?.origin==='wake_first_feeling'),false);

  console.log(JSON.stringify({command:'node scripts/check-generated-wake-offline.mjs',node:process.version,platform:process.platform,
    status:'COMPLETE_SYNTHETIC_ONLY',generatedWakeProtocolVersion,generatedWakeRuntimeVersion,generatedWakePromptHash,wakeFirstFeelingVersion,
    oldManifestLfSha256:manifestSha256,oldInventoryHash:expectedOldInventoryHash,newInventoryHash:hash(currentInventory),
    oldInventoryFiles:Object.keys(profile.files).length,newInventoryFiles:Object.keys(currentInventory).length,addedFiles:added,
    currentPreflightReason:currentPreflight.reason,currentPaidContractReason:'paid_contract_source_changed',
    currentPaidEntryFailClosed:currentPaidEntryError==='inline_paid_entry_refused',currentPaidEntryError,
    currentPaidEntryCredentialSupplierCalls,currentPaidEntryHistoryBytesUnchanged,currentPaidEntryOwnerLockAbsent,
    oldPreflightSourceMatches:historicalPreflight.sourceInventoryMatches,oldHistoryPreserved:historicalPreflight.history.checked,
    oldHistoryHeldMicroCny:historicalPreflight.history.heldMicroCny,oldContractSourcePinned:oldContract.contract.source.inventoryHash===expectedOldInventoryHash,
    oldContractApprovals:false,dreamStages:view.dream.scenes.length,wakeFragmentExact:view.wake.fragment===fixture.scenes[1].event,
    generatedCalls:calls.length,settledRows:rows.filter(row=>row.status==='settled').length,perCallMaxOutputTokens:400,
    firstFeelingStatus:view.firstFeeling.status,firstFeelingTextBasis:view.firstFeeling.textBasis,firstFeelingWakeAttempt:view.firstFeeling.wakeAttempt.index,
    firstFeelingSourceVersion:view.firstFeeling.sourceVersion,recordedAtIsLocalRecordTime:Number.isSafeInteger(view.firstFeeling.recordedAt),
    recollectionCount:view.later.length,residueKind:view.residue.label,dreamAndReceiptUnchanged:true,generatedBillingUnchanged:true,
    completionPublishLocation:'budget_ledger_settle_callback',programmaticMoodMappingPresent:false,oldRecordMigrated:false,
    oldPermissionReused:false,manifestRefreshed:false,implementationMovedOutsideInventory:false,userStoreAccessed:false,
    keyReads:credentialReads,networkAttempts,realModelRequests:0,readyPulledOrMerged:false,qualityAssessed:false,semanticSupport:'not_assessed'},null,2));
}finally{
  engine?.close();
  process.env=environment;
  globalThis.fetch=nativeFetch;
  for(const cleanup of cleanups.reverse())cleanup();
}
