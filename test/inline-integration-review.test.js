import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {assertPlainFakeOwner,ReviewedPlainFake,currentSourceInventory} from '../test-support/inline-integration-review.js';
import {inlineSeed} from '../test-support/inline-budget-fixtures.js';
for(const marker of ['billingAllowanceId','billingProtocolVersion','appraisalProtocolVersion','stubAccountingVersion','stubAllowanceId','stubAllowanceHash','accountingMode'])test(`candidate plain fake ownership refuses ${marker}, including undefined own markers`,()=>{
  for(const value of [undefined,'another-owner'])assert.throws(()=>assertPlainFakeOwner({id:'fictional',status:'failed',[marker]:value}),/foreign_execution_owner/);
});
test('candidate policy rejects invalid/foreign owner and permits only ordinary unmarked fake records',()=>{
  for(const v of [null,[],{executionOwner:'another-owner'}])assert.throws(()=>assertPlainFakeOwner(v),/foreign_execution_owner/);assert.doesNotThrow(()=>assertPlainFakeOwner({id:'old-fake'}));assert.doesNotThrow(()=>assertPlainFakeOwner({executionOwner:'plain-fake-v1'}));
});
test('reviewed fake wrapper still completes ordinary fictional local generation and copied provenance reads',async()=>{
  const d=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-owner-fake-')),e=new ReviewedPlainFake(d);try{const id=e.start('fake','fake',inlineSeed());await e.execute(id);const packet=e.result(id);assert.equal(packet.receipt.status,'completed');assert.equal(packet.dream.origin,'dream');assert.equal(packet.dream.isRealityFact,false);assert.equal(e.start('fake','fake',inlineSeed()),id);await e.execute(id);assert.equal(e.status(id).budget.calls,3);}finally{e.close();fs.rmSync(d,{recursive:true,force:true});}
});
test('current source inventory is exact for the current top-level profile without promoting offline code',()=>{
  const v=currentSourceInventory();assert.equal(v.currentProductionJs,60);assert.equal(v.reviewedPins,50);assert.equal(v.exactTopLevelCoverage,false);assert.equal(v.pinsMatch,false);assert.equal(v.productionImportsTestSupport,0);
});
test('fixed probe demonstrates current generic resume gap and candidate refusal with no native transport or key',()=>{
  const r=spawnSync(process.execPath,['scripts/check-inline-integration.mjs'],{encoding:'utf8',timeout:15000});assert.equal(r.status,0,r.stderr);const v=JSON.parse(r.stdout);assert.equal(v.productionFixApplied,true);assert.equal(v.productionIntegrationReady,false);assert.equal(v.nativeRequests,0);assert.equal(v.credentialReads,0);assert.equal(v.probes[0].fakeDreamPublished,false);assert.equal(v.probes[1].rejected,true);assert.equal(v.probes[1].runStateUnchanged,true);assert.equal(v.probes[1].fakeDreamPublished,false);assert.ok(v.probes.every(p=>p.syntheticUnknownHoldUnchanged));assert.equal(v.qualityAssessed,false);
});
