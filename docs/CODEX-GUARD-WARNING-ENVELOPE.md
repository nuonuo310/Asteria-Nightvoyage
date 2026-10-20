# Guard notification envelope correction

The [user's Windows v2 receipt](validation/user-local-codex-guarded-exec-warning-windows.json) advances beyond the earlier startup rejection: initialize/configuration/ephemeral thread and catalogue bytes were checked, turn/start was requested, then an owned-thread warning was rejected. It reports zero local model POSTs, zero supplied scripted calls, no credentials and successful owned cleanup. The warning body and envelope fields were not retained. It does not establish the presence of a timestamp in that specific warning, its exact text, a unique rejection cause or selected-call denial.

## Definite source/implementation mismatch

The public rust-v0.160.0 source at commit `a956835d020762cb2b570053af06f643a11c0ecc` defines a flattened `ServerNotificationEnvelope` with optional `emittedAtMs`. The current server's timestamped notification constructor populates it. V2's special guard matcher required exactly method/params and therefore rejected a correctly worded, correctly bound warning with that standard timestamp. The independent peer omitted envelope timestamps, so previous scripted passes missed this real protocol input case.

| Pinned public source | Git blob | Finding |
| --- | --- | --- |
| [app-server-protocol/src/protocol/common.rs](https://github.com/openai/codex/blob/a956835d020762cb2b570053af06f643a11c0ecc/codex-rs/app-server-protocol/src/protocol/common.rs) | c37c4956f1c3cbf21f293ca2aa41a6fec209bcfa | ServerNotificationEnvelope flattens the notification and declares optional i64 emitted_at_ms, serialized camelCase; absence is backward-compatible. |
| [app-server/src/outgoing_message.rs](https://github.com/openai/codex/blob/a956835d020762cb2b570053af06f643a11c0ecc/codex-rs/app-server/src/outgoing_message.rs) | 961eccc2aad51cb17b3e9206ed95c34dab686c2e | timestamped_server_notification supplies emitted_at_ms before fanout. |
| [core/src/tools/code_mode/mod.rs](https://github.com/openai/codex/blob/a956835d020762cb2b570053af06f643a11c0ecc/codex-rs/core/src/tools/code_mode/mod.rs) | 79a95b2ac26288ff141e5d670bf49bb8ae3f7eda | Disabled-host warning template remains unchanged. |
| [code-mode/src/remote_session.rs](https://github.com/openai/codex/blob/a956835d020762cb2b570053af06f643a11c0ecc/codex-rs/code-mode/src/remote_session.rs) | 36e4e1a74f57847f12608fc714b5d1228158c925 | Disabled provider's fixed availability/session error remains unchanged. |

This source-proven matcher defect is corrected. It is not retroactive proof that the discarded v2 native warning had this exact form. The v2 receipt remains rejected and unmodified; no native outcome is reconstructed from source.

## V3's narrow change

`codex-local-guarded-exec-denial-v3-warning-envelope` accepts only either the old bare method/params envelope or method/params plus emittedAtMs. When present, the timestamp must be a nonnegative safe JSON integer; null, strings, fractions, negative/unsafe values and unknown envelope fields are rejected. This is intentionally narrower than the full Rust i64 domain for this current-time observation. The value is not retained or used for expiry, authority or consent.

The warning method, exact disabled-host message, exact public params fields, owned-thread binding, two explicit host configuration values and single-warning rule remain required. No variable host-error message, direct-tool fallback warning, arbitrary JSON-RPC field or unknown warning is accepted. No fields are stripped from incoming data to make it pass. Startup errors and other notification/server-request rejection remain unchanged.

A separate body-free diagnostic splits envelope shape, timestamp shape, params shape, thread binding and exact-message equality into fixed labels/booleans. It returns no text, timestamp, thread identity, unknown key name or tool argument. Its `changesAcceptance:false` and `warningAccepted:false` distinguish observation from the owner's separate guard decision. Native rejected-warning records from v2 have no such added diagnostic and are not backfilled.

The independent peer now emits timestamped notifications by default using a fixed fictional value, without importing the production matcher. Tests cover the old rejection counterexample, bare compatibility, bounds/types, unknown fields, altered text, foreign threads, actual peer lifecycle and terminal invalid cases. These are scripted peer results, not native handler proof. Only fictional fixtures are used in automatic tests.

The v2 input correction remains unchanged. The native probe still uses the fresh private profile/cwd/catalogue, one owned child, local-only provider, at most two accepted local POSTs, one fixed arithmetic call, exact call/output binding, cancellation and cleanup. No account, real model or production admission is added; wait qualification and real outbound request accounting remain pending.

After verified publication, run the existing Windows helper once to observe v3. The helper now includes these warning-envelope tests. Matching native execution is unavailable here, so the Linux tests cannot establish the Windows result. Return the final JSON without automatic retry. [Validation](validation/codex-guard-warning-envelope.json).

## Subsequent Windows result and current candidate

The user v3 result checked the timestamped warning and supplied the fixed call, then stopped on a stderr error before a bound output. Its discarded error text/phase cannot establish the cause. [V4 scoped trace policy](CODEX-GUARD-BOUND-TRACE.md) is the current local candidate; older pending statements above describe those earlier slices, not a newly established native denial.
