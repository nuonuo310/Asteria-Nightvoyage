import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { reviewCodeModeToolIdentity } from '../scripts/codex-code-mode-identity-review.mjs';
import { reviewCodexLocalRequest } from '../scripts/codex-request-tool-review.mjs';
import { rehearseCodexCodeModeWitness, observeNativeCodexCodeModeWitness } from '../scripts/codex-code-mode-witness-owner.mjs';
const bytes = tools => Buffer.from(JSON.stringify({ model: 'gpt-5.6-sol', tools }));
const custom = name => ({ type: 'custom', name, format: {} });
const wait = () => ({ type: 'function', name: 'wait', parameters: {} });
function boundary(r) {
  for (const key of ['dispatchEnabled', 'toolExclusionVerified', 'modelEntitlementVerified', 'credentialEnvironmentSupplied', 'accountAuthorizationRequested', 'generatedResponseSupplied', 'catalogRepresentsRealModel']) assert.equal(r[key], false, key);
  assert.ok(r.fixtureModelPosts <= 1); assert.ok(r.appServerTurnsRequested <= 1);
  if (r.processStarted) { assert.equal(r.ownedProcessClosed, true); assert.equal(r.temporaryCleanupComplete, true); }
  assert.equal(r.descendantTerminationConfirmed, 'unknown');
}
test('public names are witnessed without changing legacy rejection or identifying the shared wait handler', () => {
  const b = bytes([custom('exec'), wait()]), old = reviewCodexLocalRequest(b), r = reviewCodeModeToolIdentity(b);
  assert.deepEqual(r.publicCodes, ['public_exec_custom', 'shared_wait_function']);
  assert.equal(r.waitHandlerRole, 'not_established_by_name'); assert.equal(r.nativeSchemaValidated, false);
  assert.equal(r.nativeHandlerDenialVerified, false); assert.equal(r.productionAdmission, false);
  assert.equal(old.toolInventoryReviewed, false); assert.deepEqual(old.toolClasses, ['agents']); assert.equal(old.unknownToolCount, 1);
  assert.deepEqual(reviewCodexLocalRequest(b), old);
});
test('unknown names, wrong kinds and unfamiliar namespaces cannot acquire reviewed public identity', () => {
  for (const tools of [[custom('SYNTHETIC-PRIVATE-NAME')], [{ type: 'function', name: 'exec', parameters: {} }], [{ type: 'namespace', name: 'private_namespace', tools: [custom('exec'), wait()] }]]) {
    const r = reviewCodeModeToolIdentity(bytes(tools)); assert.deepEqual(r.publicCodes, []); assert.ok(r.unreviewedIdentities > 0); assert.ok(!JSON.stringify(r).includes('SYNTHETIC-PRIVATE'));
  }
  const r = reviewCodeModeToolIdentity(bytes([{ type: 'namespace', name: 'functions', tools: [custom('exec'), wait()] }])); assert.equal(r.publicCodes.length, 2);
  for (const b of [Buffer.from('{'), bytes([wait(), wait()]), Buffer.alloc(262145)]) assert.throws(() => reviewCodeModeToolIdentity(b));
  assert.equal(reviewCodeModeToolIdentity(bytes([])).toolCount, 0);
});
test('actual independent peer emits reviewed identities but exposure remains blocked and no output is supplied', async () => {
  const r = await rehearseCodexCodeModeWitness(); boundary(r);
  assert.equal(r.status, 'blocked'); assert.equal(r.reason, 'tool_exposure_requires_review'); assert.equal(r.fixtureModelPosts, 1);
  assert.deepEqual(r.requestIdentityWitness.publicCodes, ['public_exec_custom', 'shared_wait_function']);
  assert.equal(r.requestObservation.toolInventoryReviewed, false); assert.equal(r.requestObservation.unknownToolCount, 1);
});
for (const scenario of ['unknown_tools', 'missing_tools', 'catalog_body_changed', 'catalog_path_mismatch', 'model_metadata_warning', 'auth_header', 'wrong_provider']) test('witness retains stop boundary: ' + scenario, async () => {
  const r = await rehearseCodexCodeModeWitness(scenario); boundary(r); assert.equal(r.status, 'blocked');
  if (scenario === 'unknown_tools') { assert.deepEqual(r.requestIdentityWitness.publicCodes, []); assert.ok(r.requestIdentityWitness.unreviewedIdentities > 0); }
  if (['catalog_body_changed', 'catalog_path_mismatch', 'wrong_provider'].includes(scenario)) assert.equal(r.fixtureModelPosts, 0);
});
test('fixed case/settings reject overrides and queued cancellation creates no process', async () => {
  const q = new AbortController(); q.abort(); const r = await rehearseCodexCodeModeWitness('observed', { signal: q.signal }); boundary(r); assert.equal(r.processStarted, false);
  let reads = 0; assert.throws(() => rehearseCodexCodeModeWitness('observed', { get timeoutMs() { reads++; } })); assert.equal(reads, 0);
  for (const options of [{ token: 'fictional' }, { toolMode: 'direct' }, { catalog: {} }]) assert.throws(() => rehearseCodexCodeModeWitness('observed', options));
  assert.throws(() => observeNativeCodexCodeModeWitness(process.execPath));
});
test('CLI completes only the bounded identity diagnostic and never promotes declared tools to admission', () => {
  const cli = fileURLToPath(new URL('../scripts/check-codex-code-mode-witness.mjs', import.meta.url));
  const p = spawnSync(process.execPath, [cli], { encoding: 'utf8' }); assert.equal(p.status, 0, p.stderr); const r = JSON.parse(p.stdout);
  assert.equal(r.status, 'identity_witness_observed'); assert.equal(r.peerIdentitiesAreScripted, true); assert.equal(r.report.status, 'blocked'); assert.equal(r.productionAdmission, false);
  for (const args of [['--login'], ['--live'], ['--case', 'direct_empty']]) { const bad = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' }); assert.equal(bad.status, 1); assert.equal(JSON.parse(bad.stdout).dispatchEnabled, false); }
});

test('active cancellation and bounded timeout close the one owned child without a request witness',async()=>{
 const controller=new AbortController();const pending=rehearseCodexCodeModeWitness('stall_thread',{signal:controller.signal});setTimeout(()=>controller.abort(),100);
 const cancelled=await pending;boundary(cancelled);assert.equal(cancelled.status,'cancelled');assert.equal(cancelled.requestIdentityWitness,null);
 const timed=await rehearseCodexCodeModeWitness('stall_thread',{timeoutMs:100});boundary(timed);assert.equal(timed.reason,'preparation_timeout');assert.equal(timed.requestIdentityWitness,null);
});
