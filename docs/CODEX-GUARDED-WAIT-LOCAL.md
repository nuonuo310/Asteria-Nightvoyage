# Local fixed wait denial candidate

This is a separate candidate after the user-reported [Windows selected exec denial](CODEX-GUARD-EXEC-WINDOWS-RESULT.md). It neither reruns nor reinterprets that result. The new implementation uses no account, subscription, real model, API key, real cell or user store.

## Exact scope

`node scripts/check-codex-guarded-wait.mjs` defaults to an independent Node peer with invented protocol/configuration/output. It launches a real child and exchanges local HTTP requests; it does not run native Codex or a real wait handler. Only the explicit `--native-executable` option selects a regular absolute native codex/codex.exe file. All source/cell/terminate/model/provider/login/remote-host overrides are unavailable.

The candidate starts one owned app-server in a fresh private temporary profile/cwd/state outside any Git checkout, with credential-free environment, fixed loopback provider, zero request/stream retries, ephemeral read-only thread, never approvals and empty turn environments. It keeps both supported code-mode-host feature fields explicitly false, checks effective configuration, exact owned-thread warning, catalogue bytes and the two public exec/wait identities. The legacy inventory classifier remains unchanged and does not grant production acceptance.

After prerequisites, the first local POST receives exactly one fixed `function_call`: default-namespace `wait`, an independent constant fictional cell ID, `yield_time_ms=1`, `max_tokens=1`, `terminate=false`. There was no preceding exec and no real cell ID is loaded. The function is a deliberately injected fixture call, not a model instruction or actual generated dream.

The second POST must contain exactly one `function_call_output` with the same fixed wait call ID and exact string `code-mode host is disabled`. A custom exec output, exec call ID, duplicate output, successful result, unknown output encoding, generic unsupported-call error or extra tool fails. The owner records at most two accepted local POST observations before replies, responds with a fixed HTTP error after the selected result and closes; there is no final inference turn. These counts concern already-arrived loopback POSTs, not outbound provider reservations.

The existing one-line bounded router-error policy is reused without widening its accepted pattern. It requires line start and completion inside checked scope; unknown, duplicate, early/late, incomplete or control errors remain terminal. The original diagnostic ERROR label remains visible. A continued trace alone is not success; same-call function output is mandatory. Cancellation, timeout, malformed RPC/HTTP, unknown notifications and tool inventory changes remain terminal, with owned cleanup checked. Cleanup retries do not restart a child.

## Implementation isolation

The new wait owner and independent peer are explicit derivatives of the exec implementation at commit `5d7d60c42f0f48d3b16aafd5529368b5fafce1b4`. Their separate entry points, fixed fixture, output classifier and receipts prevent a caller-supplied mode/cell from changing the checked exec path. The existing exec owner, peer, fixture, entry point and helper are unchanged. Reused guard/warning/input/identity/trace modules are also unchanged. This bounded duplication avoids refactoring the verified exec path in this slice; future maintenance must check both owners explicitly.

The peer independently checks the literal function arguments without importing the wait fixture/output classifier. It invents the disabled-host text; its pass cannot qualify native handlers. The output reviewer separately rejects custom/function identity substitutions and unsupported results. No old source-pinned login/trial grant or DreamModelPort production adapter is changed.

## Pinned public source

Release commit: `a956835d020762cb2b570053af06f643a11c0ecc` (rust-v0.160.0).

| Source | Git blob | Finding |
| --- | --- | --- |
| [wait_spec.rs](https://github.com/openai/codex/blob/a956835d020762cb2b570053af06f643a11c0ecc/codex-rs/core/src/tools/code_mode/wait_spec.rs) | 01b713e515c1aed3a43d4aac5e0afae84db07958 | Function wait has cell_id and optional yield_time_ms/max_tokens/terminate; additional properties are disabled in the bundled schema. |
| [wait_handler.rs](https://github.com/openai/codex/blob/a956835d020762cb2b570053af06f643a11c0ecc/codex-rs/core/src/tools/code_mode/wait_handler.rs) | b0e447913434a4052153ee45f683995a77f49160 | Default-namespace function payload parses arguments; terminate=false calls wait, true calls terminate. Session errors map to RespondToModel. |
| [code_mode/mod.rs](https://github.com/openai/codex/blob/a956835d020762cb2b570053af06f643a11c0ecc/codex-rs/core/src/tools/code_mode/mod.rs) | 79a95b2ac26288ff141e5d670bf49bb8ae3f7eda | Wait/terminate acquire the common session before delegating. |
| [tools/parallel.rs](https://github.com/openai/codex/blob/a956835d020762cb2b570053af06f643a11c0ecc/codex-rs/core/src/tools/parallel.rs) | 0a7afc54cc2844d2fd51810bc813661e7af185d3 | Non-custom failure payload becomes FunctionCallOutput with the error text and originating call ID. |

Disabled-provider and router-trace provenance remain in [the trace audit](CODEX-GUARD-BOUND-TRACE.md). These source findings motivate the candidate, not a claim that native wait denial has occurred.

## Verification and remaining work

Targeted exec/wait/trace regression: 92/92 on Linux Node v24.19.0, zero failures/cancellations/skips. Default wait check observed its two scripted POSTs and owned cleanup. Full regression: 1729/1729, zero failures/cancellations/skips. The peer wait-property refinement during that run is covered by the final 92-test targeted run and final standalone check; verification ordering is recorded explicitly. Full results and file hashes: [validation](validation/codex-guarded-wait.json).

Native wait outcome is pending. `terminate=true` remains deliberately untested; even a successful selected wait result is not universal handler denial. Complete native schema qualification, remote-host exclusion beyond supplied arguments, background network instrumentation, descendant termination, real-provider per-POST accounting and subscription eligibility remain unverified. `dispatchEnabled`, `productionAdmission`, `allHandlerDenialVerified` and `modelEntitlementVerified` remain false. No Asteria bridge or real dream generation is delivered.

## One Windows observation

After syncing main, use `scripts/Invoke-CodexGuardedWait.ps1`. It runs independent regressions, uses the exact existing installed-wrapper/platform-package resolver, checks `codex-cli 0.160.0`, then invokes one local native wait probe. The --version preparation is separate from its one probe child. The helper is statically reviewed here; maintainer Windows execution is unavailable. It does not install/update, log in, reuse an account profile or request inference. Stop and return only the final JSON, with no automatic repetition.

Windows wait result received: [selected fixed wait denial observed](CODEX-GUARD-WAIT-WINDOWS-RESULT.md). Same-call second POST and owned cleanup passed; earlier pending statements describe the implementation slice. Real-provider request accounting and subscription inference remain unverified.
