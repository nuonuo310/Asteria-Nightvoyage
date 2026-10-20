import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { codexToolModeCaseIds, codexToolModeCase } from '../scripts/codex-tool-mode-comparison.mjs';
import { rehearseCodexToolModeCase, observeNativeCodexToolModeCase } from '../scripts/codex-tool-mode-comparison-owner.mjs';
const cli = fileURLToPath(new URL('../scripts/check-codex-tool-mode-comparison.mjs', import.meta.url));
function boundary(r) {
  for (const key of ['dispatchEnabled', 'toolExclusionVerified', 'modelEntitlementVerified', 'credentialEnvironmentSupplied', 'accountAuthorizationRequested', 'generatedResponseSupplied', 'catalogRepresentsRealModel', 'subscriptionCapabilityInferred']) assert.equal(r[key], false, key);
  assert.ok(r.fixtureModelPosts <= 1); assert.ok(r.appServerTurnsRequested <= 1);
  if (r.processStarted) { assert.equal(r.ownedProcessClosed, true); assert.equal(r.temporaryCleanupComplete, true); }
  assert.equal(r.descendantTerminationConfirmed, 'unknown');
  assert.equal(r.backgroundNetworkInstrumented, false);
  for (const marker of ['http://', 'fictional-metadata-thread', 'fictional-observer-turn']) assert.ok(!JSON.stringify(r).includes(marker));
}
test('detached fictional conditions differ only in tool_mode; both retain the same empty-environment bundle', () => {
  assert.deepEqual(codexToolModeCaseIds, ['direct_empty', 'code_only_empty']);
  const a = codexToolModeCase('direct_empty'), b = codexToolModeCase('code_only_empty');
  assert.equal(a.environmentless, true); assert.equal(b.environmentless, true);
  assert.equal(a.toolMode, 'direct'); assert.equal(b.toolMode, 'code_mode_only');
  assert.equal(b.catalog.models[0].shell_type, 'unified_exec');
  assert.deepEqual(b.catalog.models[0].input_modalities, ['text', 'image']);
  b.catalog.models[0].tool_mode = 'direct'; assert.deepEqual(a.catalog, b.catalog);
  a.catalog.models[0].slug = 'independent-mutated'; assert.equal(codexToolModeCase('direct_empty').catalog.models[0].slug, 'gpt-5.6-sol');
  assert.throws(() => codexToolModeCase('account'), /tool_mode_case_invalid/);
});
for (const id of codexToolModeCaseIds) test('independent scripted peer observes one local request: ' + id, async () => {
  const r = await rehearseCodexToolModeCase(id); boundary(r);
  assert.equal(r.status, 'request_observed'); assert.equal(r.contractVersion, 'codex-local-tool-mode-comparison-v1');
  assert.equal(r.toolMode, codexToolModeCase(id).toolMode); assert.equal(r.emptyEnvironmentsSent, true);
  assert.equal(r.fictionalCatalogBytesChecked, true); assert.equal(r.fixtureModelPosts, 1);
  // The peer scripts an empty tools list in both conditions. It does not implement native mode selection.
  assert.equal(r.requestObservation.toolCount, 0);
});
for (const scenario of ['unknown_tools', 'missing_tools', 'catalog_body_changed', 'catalog_path_mismatch', 'model_metadata_warning', 'auth_header', 'wrong_provider']) test('unchanged stop rule: ' + scenario, async () => {
  const r = await rehearseCodexToolModeCase('code_only_empty', scenario); boundary(r); assert.equal(r.status, 'blocked');
  if (['catalog_body_changed', 'catalog_path_mismatch', 'wrong_provider'].includes(scenario)) assert.equal(r.fixtureModelPosts, 0);
});
test('queued/active cancellation and timeout cannot start a second child or request', async () => {
  const q = new AbortController(); q.abort(); const r = await rehearseCodexToolModeCase('code_only_empty', 'observed', { signal: q.signal }); boundary(r); assert.equal(r.processStarted, false);
  const a = new AbortController(), pending = rehearseCodexToolModeCase('code_only_empty', 'stall_thread', { signal: a.signal });
  setTimeout(() => a.abort(), 100); const cancelled = await pending; boundary(cancelled); assert.equal(cancelled.status, 'cancelled');
  const timeout = await rehearseCodexToolModeCase('code_only_empty', 'stall_thread', { timeoutMs: 100 }); boundary(timeout); assert.equal(timeout.reason, 'preparation_timeout');
});
test('no account catalogue, provider, key, mode override, arbitrary executable or getter can enter settings', () => {
  let reads = 0; assert.throws(() => rehearseCodexToolModeCase('direct_empty', 'observed', { get timeoutMs() { reads++; } })); assert.equal(reads, 0);
  for (const options of [{ catalog: {} }, { toolMode: 'direct' }, { token: 'fictional' }, { env: {} }, { provider: 'openai' }]) assert.throws(() => rehearseCodexToolModeCase('direct_empty', 'observed', options));
  assert.throws(() => observeNativeCodexToolModeCase(process.execPath, 'direct_empty'));
  assert.throws(() => rehearseCodexToolModeCase('direct_empty', 'login'));
});
test('CLI defaults to two scripted peers and refuses authentication, API and caller metadata flags', () => {
  const p = spawnSync(process.execPath, [cli], { encoding: 'utf8' }); assert.equal(p.status, 0, p.stderr);
  const r = JSON.parse(p.stdout); assert.equal(r.status, 'comparison_observed'); assert.equal(r.plannedCases, 2); assert.equal(r.observedCases, 2);
  assert.equal(r.peerToolsAreScripted, true); assert.equal(r.realModelRequests, 0); assert.equal(r.productionAdmission, false); r.reports.forEach(boundary);
  for (const args of [['--live'], ['--login'], ['--catalog', 'account'], ['--mode', 'direct'], ['--approve-budget-cny', '3']]) {
    const bad = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' }); assert.equal(bad.status, 1); assert.equal(JSON.parse(bad.stdout).dispatchEnabled, false);
  }
});
