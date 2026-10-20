# Local guard v4: scoped router trace plus bound denial

The user Windows v3 receipt passed configuration, exact timestamped warning, catalogue and public identity checks. It observed one local POST and supplied the fixed arithmetic call, then stopped on an error. The original error text and read phase were not retained. Its cause cannot be recovered or uniquely attributed; it is not a selected-call denial. The archived receipt is not reinterpreted.

V4 introduces a separate local-only stderr policy. After the checked guard, warning, catalogue, thread and identities, it may continue one newline-complete router ERROR line with the fixed disabled-host suffix. Both the first byte and line completion must be observed after the fixed call was queued, before a continuation or terminal state. This is read-time ordering, not proof of when the native error occurred. ANSI SGR and CRLF are handled with bounded fatal UTF-8 decoding. Limits remain 32768 bytes, 128 lines and 8192 bytes per line. Duplicate, unknown, wrong-target, unsupported-call, early, late, incomplete and control errors still stop.

The original startup diagnostic labels remain visible. A permitted log is never a successful outcome by itself: the owner must observe the second local POST containing exactly the same fixed call ID and exact `code-mode host is disabled` custom-tool output. Quiet exact denial also remains valid. No third accepted POST, arbitrary output, real provider, credential, automatic retry or production admission is added.

## Pinned public source

All findings below refer to OpenAI Codex release commit `a956835d020762cb2b570053af06f643a11c0ecc`.

| Source | Git blob | Finding |
| --- | --- | --- |
| [core/src/tools/router.rs](https://github.com/openai/codex/blob/a956835d020762cb2b570053af06f643a11c0ecc/codex-rs/core/src/tools/router.rs) | d9f1f63eed9cd28b40ac69820e82d6f796ad1dea | Tool dispatch functions use tracing instrumentation with error recording. This supports reviewing a router error pattern, not reconstructing the discarded Windows line. |
| [core/src/tools/code_mode/execute_handler.rs](https://github.com/openai/codex/blob/a956835d020762cb2b570053af06f643a11c0ecc/codex-rs/core/src/tools/code_mode/execute_handler.rs) | 2215209053284c66a1feece99819e2f419cf29bb | Session execution error maps into RespondToModel before a started cell is obtained. |
| [code-mode/src/remote_session.rs](https://github.com/openai/codex/blob/a956835d020762cb2b570053af06f643a11c0ecc/codex-rs/code-mode/src/remote_session.rs) | 36e4e1a74f57847f12608fc714b5d1228158c925 | Disabled session availability returns the fixed disabled-host error. |
| [tools/src/function_call_error.rs](https://github.com/openai/codex/blob/a956835d020762cb2b570053af06f643a11c0ecc/codex-rs/tools/src/function_call_error.rs) | 1ab8335b259a9ba30caa1dc210913ca5dd9af1d3 | RespondToModel displays its contained text. |
| [core/src/tools/parallel.rs](https://github.com/openai/codex/blob/a956835d020762cb2b570053af06f643a11c0ecc/codex-rs/core/src/tools/parallel.rs) | 0a7afc54cc2844d2fd51810bc813661e7af185d3 | Nonfatal custom-call failure is represented as a bound custom-tool output. |

A pattern match is not a causal proof, native schema validation, universal handler denial, network containment or subscription entitlement. The independent peer invents its fixed trace and output; it executes no arithmetic. Native v4 remains pending. Background network instrumentation, descendant termination and real-provider per-POST accounting are unchanged and unverified. No Asteria bridge is implemented.

## Verification and next operation

Linux Node v24.19.0: targeted 60/60; full 1687/1687, zero failures, cancellations or skips. The default independent-process check observed its scripted trace and bound second POST, with owned cleanup complete. See [validation](validation/codex-guard-bound-trace.json).

The existing `scripts/Invoke-CodexGuardedExec.ps1` helper now includes the new regressions. It retains the exact installed 0.160.0 package resolver/version check and performs one local native observation. It needs no login or real inference. The new helper has been statically reviewed here; Windows execution must be reported separately. Stop after the result and return only the final JSON. No old approval or failed dream is resumed.
