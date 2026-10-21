# Windows credential rehearsal repair v1

Status: **COMPLETE for the bounded Windows offline fixture repair**. This reproduces and repairs the fixed independent Node credential-lifetime rehearsal only. It does not authenticate, read real credentials, start Codex, contact a provider, perform remote revocation or validate production credential handling.

Authority: [NV-WINDOWS-CREDENTIAL-01 v1](construction-envelopes/2026-10-21-windows-credential-rehearsal-v1.md), commit `fe55734f209f3aaa59b2cdf59bd27b19488a6233`. The authority commit adds this package to parent `f75e4054bd82bbd0c7023f8b3a73536f44d74b97` and changes no other file. All five input hashes in the Opening Gate matched before editing.

## Reproduction and earliest boundary

The unchanged authority worktree on Windows `10.0.26200.0`, AMD64 and Node `v24.19.0` ran:

```text
node --test test/codex-plan-credential-owner.test.js
```

The measured baseline was 8 tests, 2 pass, 6 fail and 0 skipped. Besides the four reported categories, `cancel` and `late_response` also returned `child_failed` instead of `cancelled`. `failed_spawn` and closed-input rejection passed.

A bounded key-class probe found the earliest boundary before any scenario: the parent supplied four keys, while the fixed child observed twelve. Windows startup supplemented `HOMEDRIVE`, `HOMEPATH`, `LOGONSERVER`, `SYSTEMDRIVE`, `TEMP`, `USERDOMAIN`, `USERNAME` and `USERPROFILE`. The synthetic token still matched, but the child's strict four-key allowlist correctly exited with code 2 before running the requested scenario. The probe retained no environment values, stdout, stderr, usernames, home paths or arbitrary exception text.

## Repair

The new `scripts/codex-credential-rehearsal-policy.mjs` owns only this fixture's closed policy. On Windows the parent now supplies ten explicit empty placeholders for startup-supplemented keys, so Windows neither injects the caller's profile/temp values nor changes the key set. The fixed child validates the complete isolated key set case-insensitively, including the fixed synthetic token, Node directory, `SystemRoot`/`WINDIR`, empty placeholders, unknown-key refusal and duplicate refusal. Validation completes before placeholders are deleted. Accessor values are rejected without evaluation, and the parent environment is never modified.

The production `src/inline-child-environment.js` helper is not imported or changed. The child remains the fixed independent Node peer, the token remains the fixed public sentinel, and no arbitrary executable, environment, endpoint, session or model is accepted.

The checker now compares all seven exact scenario status/reason contracts with the shared expected-outcome table, in addition to the lifetime invariants. A success/blocked/child_failed drift therefore exits nonzero rather than passing on lifetime fields alone.

## Verification

- Final targeted: 13 tests, 13 pass, 0 fail, 0 skipped.
- Checker: exit 0, status `passed`, all seven exact outcomes, `exactOutcomes: true`.
- The seven outcomes are `completed/null`, `blocked/timeout`, `blocked/cancelled` twice, `blocked/spawn_failed`, and `blocked/untrusted_child_output` twice.
- Negative coverage includes missing/relative `SystemRoot`, dummy inherited configuration, case-variant placeholders, unexpected keys, nonempty placeholders, wrong token, duplicate canonical keys, accessors, reason drift and unexpected checker arguments.
- Final full suite: 1849 tests, 1841 pass, 8 fail, 0 skipped. All seven credential scenarios passed inside the full run. The eight failures are the preserved Windows `EPERM` `fs.symlinkSync` capability class in unrelated symlink tests; no new assertion failure was observed.

Exact counts, sanitized failure classes, input/final hashes and development notes are in [validation/codex-credential-windows-repair.json](validation/codex-credential-windows-repair.json).

## Remaining limits

The eight symlink tests remain unavailable in this sandbox and are not relabelled as passing. Real remote cancellation/revocation and native credential containment remain unverified. This verifies one Windows independent Node-peer fixture run, not Linux, native Codex, provider authentication, tool entitlement, billing or production credential ownership. Any future Windows/Node startup supplementation outside the explicit policy fails closed pending review.
