import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

test('versioned admission receipt proves current fail-closed, exact historical evidence and the synthetic wake loop',()=>{
  const result=spawnSync(process.execPath,['scripts/check-versioned-wake-admission.mjs'],{cwd:new URL('..',import.meta.url),encoding:'utf8',timeout:20000,env:{...process.env,NIGHTVOYAGE_DEEPSEEK_KEY:'DUMMY-SENTINEL'}});
  assert.equal(result.status,0,result.stderr);assert.equal(result.stderr,'');assert.ok(!result.stdout.includes('DUMMY-SENTINEL'));
  const receipt=JSON.parse(result.stdout);
  assert.equal(receipt.currentPreflightReason,'source_inventory_changed');assert.equal(receipt.currentPaidContractReason,'paid_contract_source_changed');assert.equal(receipt.currentPaidEntryFailClosed,true);assert.equal(receipt.currentPaidEntryError,'inline_paid_entry_refused');assert.equal(receipt.currentPaidEntryCredentialSupplierCalls,0);assert.equal(receipt.currentPaidEntryHistoryBytesUnchanged,true);assert.equal(receipt.currentPaidEntryOwnerLockAbsent,true);assert.equal(receipt.oldPreflightSourceMatches,true);assert.equal(receipt.oldHistoryPreserved,true);assert.equal(receipt.oldContractSourcePinned,true);assert.equal(receipt.firstFeelingStatus,'present');assert.equal(receipt.dreamAndReceiptUnchanged,true);assert.equal(receipt.billingUnchanged,true);assert.equal(receipt.oldPermissionReused,false);assert.equal(receipt.manifestRefreshed,false);assert.equal(receipt.userStoreAccessed,false);assert.equal(receipt.credentialReads,0);assert.equal(receipt.networkAttempts,0);assert.equal(receipt.realModelRequests,0);assert.equal(receipt.qualityAssessed,false);
});
