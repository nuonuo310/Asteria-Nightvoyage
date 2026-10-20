import { observeNativeCodexCodeModeWitness, rehearseCodexCodeModeWitness } from './codex-code-mode-witness-owner.mjs';
try {
  const args = process.argv.slice(2);
  if (args.length !== 0 && !(args.length === 2 && args[0] === '--native-executable')) throw Error();
  const native = args.length === 2;
  const report = native ? await observeNativeCodexCodeModeWitness(args[1]) : await rehearseCodexCodeModeWitness();
  const observed = report.requestIdentityWitness !== null && report.ownedProcessClosed && report.temporaryCleanupComplete &&
    [null, 'tool_exposure_requires_review', 'request_tools_unreviewed'].includes(report.reason);
  console.log(JSON.stringify({
    command: 'node scripts/check-codex-code-mode-witness.mjs', node: process.version, platform: process.platform,
    status: observed ? 'identity_witness_observed' : 'blocked', kind: native ? 'native' : 'independent_node_peer',
    fixedCase: 'code_only_empty', maximumNativeChildren: 1, maximumLocalPosts: 1,
    peerIdentitiesAreScripted: !native, realModelRequests: 0, credentialReads: 0,
    accountAuthorizationRequested: false, generatedResponseSupplied: false,
    automaticRetry: false, oldComparisonReinterpreted: false, productionAdmission: false, dispatchEnabled: false, report,
  }, null, 2));
  if (!observed) process.exitCode = 1;
} catch {
  console.log(JSON.stringify({ status: 'blocked', reason: 'code_mode_witness_arguments_invalid', dispatchEnabled: false, accountAuthorizationRequested: false, rawErrorReturned: false }));
  process.exitCode = 1;
}
