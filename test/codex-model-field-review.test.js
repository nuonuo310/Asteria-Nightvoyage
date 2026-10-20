import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { reviewOfflineModelFields } from '../scripts/codex-model-field-review.mjs';
import { reviewPlanCatalogShape } from '../scripts/plan-catalog-shape.mjs';

test('offline field review distinguishes native vocabulary and aliases without admitting dispatch', () => {
  const shellCases = [['unified_exec', 'unified_exec', 'recognized'], ['disabled', 'disabled', 'recognized'],
    ['default', 'unified_exec', 'recognized_alias'], ['local', 'unified_exec', 'recognized_alias'],
    ['shell_command', 'unified_exec', 'recognized_alias']];
  for (const [raw, canonical, status] of shellCases) for (const mode of ['direct', 'code_mode', 'code_mode_only']) {
    const input = Object.freeze({ shell_type: raw, tool_mode: mode });
    const result = reviewOfflineModelFields(input);
    assert.deepEqual(result.shell, { status, value: canonical });
    assert.deepEqual(result.toolMode, { status: 'recognized', value: mode });
    for (const key of ['rustDeserializationTested', 'nativeCompatibilityVerified', 'inferenceEntitlementVerified', 'productionAdmission', 'dispatchEnabled']) assert.equal(result[key], false);
    assert.deepEqual(input, { shell_type: raw, tool_mode: mode });
  }
});

test('unknown, omitted, null and malformed metadata stay distinct and never echo raw values', () => {
  for (const key of ['shell_type', 'tool_mode']) {
    const outputKey = key === 'shell_type' ? 'shell' : 'toolMode';
    for (const [raw, status] of [[null, 'null'], [undefined, 'invalid_type'], [false, 'invalid_type'], [[], 'invalid_type'], [{ secret: 'independent-sentinel' }, 'invalid_type'], ['independent-sentinel', 'unreviewed'], ['DIRECT', 'unreviewed']]) {
      const result = reviewOfflineModelFields({ [key]: raw });
      assert.deepEqual(result[outputKey], { status, value: null });
      assert.ok(!JSON.stringify(result).includes('independent-sentinel'));
    }
    assert.deepEqual(reviewOfflineModelFields({})[outputKey], { status: 'missing', value: null });
  }
});

test('own-data review rejects accessors and exotic roots, ignores inherited and unrelated fields', () => {
  let reads = 0;
  for (const key of ['shell_type', 'tool_mode']) {
    const input = Object.defineProperty({}, key, { get() { reads++; throw Error('must not run'); } });
    assert.throws(() => reviewOfflineModelFields(input), /offline_model_field_accessor/);
  }
  const input = Object.defineProperty(Object.create(null), 'unrelated', { get() { reads++; } });
  assert.equal(reviewOfflineModelFields(input).shell.status, 'missing');
  for (const root of [null, [], Object.create({ shell_type: 'disabled' }), 'disabled']) assert.throws(() => reviewOfflineModelFields(root), /offline_model_field_input/);
  assert.equal(reads, 0);
});

test('new offline vocabulary neither changes the pinned projection nor reconstructs the consumed receipt', () => {
  const receiptUrl = new URL('../docs/validation/user-local-plan-catalog-review-windows.json', import.meta.url);
  const before = fs.readFileSync(receiptUrl);
  const receipt = JSON.parse(before).receipt;
  assert.equal(receipt.review.shellType, 'unreviewed');
  assert.equal(receipt.review.toolMode, 'unreviewed');
  // Independent counterexample: supported native enum values are not recognized by v1.
  const model = { slug: 'gpt-5.6-sol', shell_type: 'disabled', tool_mode: 'code_mode' };
  const original = reviewPlanCatalogShape({ models: [model] });
  assert.equal(original.shellType, 'unreviewed');
  assert.equal(original.toolMode, 'unreviewed');
  assert.equal(reviewOfflineModelFields(model).shell.value, 'disabled');
  // The projection stores camelCase labels, not raw native fields. No recovery is possible.
  const unavailable = reviewOfflineModelFields(receipt.review);
  assert.equal(unavailable.shell.status, 'missing');
  assert.equal(unavailable.toolMode.status, 'missing');
  assert.deepEqual(fs.readFileSync(receiptUrl), before);
});
