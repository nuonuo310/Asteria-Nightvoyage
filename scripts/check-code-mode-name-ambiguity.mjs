// Independent fictional counterexamples. No native process, auth, account or network access.
import assert from 'node:assert/strict';
import { reviewCodexLocalRequest } from './codex-request-tool-review.mjs';

if (process.argv.length !== 2) {
  console.log(JSON.stringify({ status: 'blocked', reason: 'offline_ambiguity_arguments_invalid', dispatchEnabled: false }));
  process.exitCode = 1;
} else {
  const wait = () => ({ type: 'function', name: 'wait', parameters: { type: 'object', properties: {} } });
  const custom = name => ({ type: 'custom', name, format: { type: 'grammar', syntax: 'lark', definition: 'start: "fictional"' } });
  const review = tools => reviewCodexLocalRequest(Buffer.from(JSON.stringify({ model: 'gpt-5.6-sol', tools, tool_choice: 'auto' })));
  const empty = review([]), codeNames = review([custom('exec'), wait()]);
  const unrelated = review([custom('fictional_unrelated_tool'), wait()]);
  assert.equal(empty.toolCount, 0);
  assert.equal(empty.toolInventoryReviewed, true);
  assert.equal(codeNames.toolCount, 2);
  assert.equal(codeNames.unknownToolCount, 1);
  assert.deepEqual(codeNames.toolClasses, ['agents']);
  assert.equal(codeNames.toolInventoryReviewed, false);
  assert.deepEqual(codeNames, unrelated);
  assert.equal(codeNames.toolExclusionVerified, false);
  assert.equal(codeNames.dispatchEnabled, false);
  console.log(JSON.stringify({
    command: 'node scripts/check-code-mode-name-ambiguity.mjs',
    reviewVersion: 'offline-code-mode-name-ambiguity-v1', status: 'counterexamples_checked',
    independentFictionalCases: 3, oldClassifierUnchanged: true,
    distinctToolIdentitiesHaveIdenticalLegacySummary: true,
    legacyAgentsLabelIsNameBased: true, historicalToolNamesRecoverable: false,
    emptySummary: empty, codeNameCounterexample: codeNames, unrelatedCounterexample: unrelated,
    rustSchemaExecutionTested: false, nativeHandlerExecutionTested: false,
    originalNativeReceiptReplayed: false, realModelRequests: 0, credentialReads: 0,
    nativeChildrenStarted: 0, accountAuthorizationRequested: false,
    requestBodyReturned: false, toolSchemasReturned: false,
    dispatchEnabled: false, productionAdmission: false,
  }, null, 2));
}
