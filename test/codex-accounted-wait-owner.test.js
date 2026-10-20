import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {rehearseCodexAccountedWait,observeNativeCodexAccountedWait} from '../scripts/codex-accounted-wait-owner.mjs';
test('separate wait owner gates each peer POST through saved pre-forward intent before fixture arrival',async()=>{
 const r=await rehearseCodexAccountedWait();assert.equal(r.status,'selected_wait_denial_observed',JSON.stringify(r));
 assert.equal(r.fixtureModelPosts,2);assert.equal(r.localForwardAccounting.forwardedLocalRequests,2);assert.equal(r.localForwardAccounting.intentsCheckedBeforeFixtureArrival,2);assert.equal(r.localForwardAccounting.journal.phase,'completed');
 assert.equal(r.localForwardAccounting.realProviderAccountingIntegrated,false);assert.equal(r.localForwardAccounting.logicalTrialBudgetIntegrated,false);assert.equal(r.localForwardAccounting.nativeAppServerClient,false);assert.equal(r.localForwardAccounting.independentPeerClient,true);
 assert.equal(r.selectedWaitObservation.selectedWaitDisabledHostObserved,true);assert.equal(r.ownedProcessClosed,true);assert.equal(r.temporaryCleanupComplete,true);assert.equal(r.dispatchEnabled,false);
});
for(const scenario of ['host_enabled','foreign_warning','wrong_output','wrong_call','second_unknown_tools','stderr_error'])test('pre-forward wait owner retains checked boundary: '+scenario,async()=>{
 const r=await rehearseCodexAccountedWait(scenario,{timeoutMs:1500});assert.equal(r.status,'blocked');assert.ok(r.localForwardAccounting.forwardedLocalRequests<=2);assert.equal(r.ownedProcessClosed,true);assert.equal(r.temporaryCleanupComplete,true);assert.equal(r.realProviderAccountingIntegrated,false);assert.ok(!JSON.stringify(r).includes('FICTIONAL-PRIVATE'));
});
test('late cancellation and extra continuation cannot expand local forward cap',async()=>{
 const controller=new AbortController(),pending=rehearseCodexAccountedWait('stall_after_call',{signal:controller.signal});setTimeout(()=>controller.abort(),300);
 const r=await pending;assert.equal(r.status,'cancelled');assert.equal(r.localForwardAccounting.forwardedLocalRequests,1);assert.equal(r.ownedProcessClosed,true);assert.equal(r.temporaryCleanupComplete,true);
 const extra=await rehearseCodexAccountedWait('third_post',{timeoutMs:1500});assert.ok(extra.localForwardAccounting.forwardedLocalRequests<=2);assert.ok(extra.fixtureModelPosts<=2);assert.equal(extra.temporaryCleanupComplete,true);
});
test('accounted entry cannot request a login, remote target, cell or caller token',()=>{
 for(const settings of [{target:'https://api.openai.com/v1/responses'},{token:'fictional'},{cell_id:'other'}])assert.throws(()=>rehearseCodexAccountedWait('observed',settings));
 assert.throws(()=>observeNativeCodexAccountedWait(process.execPath));
 const cli=fileURLToPath(new URL('../scripts/check-codex-accounted-wait.mjs',import.meta.url));
 for(const args of [['--login'],['--target','https://api.openai.com'],['--native-executable']]){const p=spawnSync(process.execPath,[cli,...args],{encoding:'utf8'});assert.equal(p.status,1);assert.equal(JSON.parse(p.stdout).dispatchEnabled,false);}
});
