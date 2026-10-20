# Local native candidate: one fixed exec denial

**Current candidate: v3 notification-envelope correction.** The [v2 native observation](validation/user-local-codex-guarded-exec-warning-windows.json) passed configuration/thread preparation and stopped on a warning before any local model POST. The [v3 correction](CODEX-GUARD-WARNING-ENVELOPE.md) handles only the official optional emission timestamp; exact warning text/binding and unknown-field rejection remain required. Native v3 outcome is pending.

**Earlier v2 input-schema correction:** The [first Windows native observation](validation/user-local-codex-guarded-exec-startup-windows.json) was blocked before initialize by configuration rejection. The old input path was invalid; [correction and evidence](CODEX-GUARD-CONFIG-CORRECTION.md) explain the implementation/test gap. Native v2 outcome is pending.

The [independent guard/journal rehearsal](CODEX-CODE-MODE-GUARD-REHEARSAL.md) is followed by a separate executable local fixture owner. The new entry is `node scripts/check-codex-guarded-exec.mjs`. Default execution uses an independent Node peer with **scripted** identities, configuration, warning and denial. Native execution requires the explicit `--native-executable ABSOLUTE_CODEX_PATH` option. No account, OAuth owner or real provider is connected.

## Exact scope

One owned app-server child uses a fresh private profile/cwd/state outside the checkout, the existing independent fictional code_mode_only catalogue and an owned loopback Responses fixture. The original comparison, identity owner, legacy tool classifier, production adapters, source pins, allowances and failed runs are not changed. The new owner preserves the legacy classifier's `toolInventoryReviewed:false` result; its exception permits only this local scripted call, not production admission.

The owner first checks effective configuration, including explicit `features.code_mode_host.enabled=false` AND `features.code_mode_host.disable_in_process_fallback=false`, the prior isolation controls, exact local provider endpoint, zero transport retries, file catalogue identity and unchanged bytes, ephemeral thread and empty turn environments. Its sealed argv supplies no remote code-mode-host argument. Effective configuration alone is not general provider-injection proof.

Only the exact source-reviewed unavailable warning for this owned thread is eligible for local continuation. A warning arriving after the first HTTP request still gates the response. Missing, altered, foreign or repeated warnings stop the probe. Unknown notification, server request, configuration warning or startup error also stops; no new blanket stderr continuation rule is added.

The first local POST must contain exactly two root public identities: custom exec and function wait. This checks bounded request shape and name/kind identity, **not the complete native tool schema**. After configuration, catalogue, warning and inventory checks, the fixture emits one fixed custom call: `exec`, source `1+1`, independently fixed call ID. No caller source, paths, scripts, wait cell, shell command, file read/edit or nested-tool invocation is accepted.

The owner recognizes a second local POST only when it contains exactly one matching `custom_tool_call_output` with the exact text `code-mode host is disabled`, with the same bounded model/inventory checks. A different output (including an arithmetic result), call ID, output kind, duplicate output or extra tool is rejected. It then sends a fixed HTTP error and closes the child; it does not continue to a final model answer. A selected denial is narrower than proof of all-handler denial or full turn completion.

At most two local POSTs are accepted. A third incoming request is rejected and, if observed, remains counted in `fixtureModelPosts`; it cannot acquire a third accepted observation. Observed counts are saved before fixture replies in the private temporary workspace and removed during cleanup. These are **already-arrived local POST observations**, not outbound real-provider reservations. The independent outbound journal from the previous slice is not falsely wired onto app-server turn/start as real per-request accounting. `realProviderAccountingIntegrated` remains false.

The owner uses bounded request/RPC/stdout/stderr parsing, sanitized diagnostics, closed options and a bounded timeout/cancellation path. It checks owned-child closure and retries only private-directory cleanup. Broader background network activity is not instrumented; descendant termination stays unknown. The executable is explicit and checked as a regular absolute codex/codex.exe path. Its runtime version is not checked by the owner, so `nativeVersionVerified:false` remains honest; the Windows preparation below checks the installed wrapper/platform package/version separately.

## Source contract

All public upstream findings are pinned to OpenAI Codex `a956835d020762cb2b570053af06f643a11c0ecc` (rust-v0.160.0), not inferred from the scripted peer:

| Source | Finding |
| --- | --- |
| [protocol/src/models.rs](https://github.com/openai/codex/blob/a956835d020762cb2b570053af06f643a11c0ecc/codex-rs/protocol/src/models.rs) | custom_tool_call uses name/input/call_id; custom output has a separate custom_tool_call_output type and string-or-content output encoding. |
| [tools/src/function_call_error.rs](https://github.com/openai/codex/blob/a956835d020762cb2b570053af06f643a11c0ecc/codex-rs/tools/src/function_call_error.rs) and [core/src/tools/parallel.rs](https://github.com/openai/codex/blob/a956835d020762cb2b570053af06f643a11c0ecc/codex-rs/core/src/tools/parallel.rs) | RespondToModel displays the contained text; failure_response places that text in a custom output for a custom payload. |
| [core/src/tools/context.rs](https://github.com/openai/codex/blob/a956835d020762cb2b570053af06f643a11c0ecc/codex-rs/core/src/tools/context.rs) | Custom payloads produce custom-tool outputs rather than function-call outputs. |
| [core/src/tools/code_mode/execute_handler.rs](https://github.com/openai/codex/blob/a956835d020762cb2b570053af06f643a11c0ecc/codex-rs/core/src/tools/code_mode/execute_handler.rs) | Session acquisition error is returned through RespondToModel before obtaining a started cell. |
| [core/src/tools/code_mode/mod.rs](https://github.com/openai/codex/blob/a956835d020762cb2b570053af06f643a11c0ecc/codex-rs/core/src/tools/code_mode/mod.rs) | Fixed unavailable warning behavior and common session service; source-level evidence only. |
| [app-server-protocol/src/protocol/v2/notification.rs](https://github.com/openai/codex/blob/a956835d020762cb2b570053af06f643a11c0ecc/codex-rs/app-server-protocol/src/protocol/v2/notification.rs) | WarningNotification contains optional threadId and message. This probe requires its owned thread, not a global warning. |

Provider-constructor and exact disabled-session error provenance remain in the [earlier source audit](CODEX-CODE-MODE-EXECUTION-BOUNDARY.md). Native output/notification differences must stop and be reviewed; do not broaden accepted output merely to obtain a pass.

## Current verification and remaining boundary

The default peer really starts an independent Node process and exchanges two HTTP POSTs, but **does not execute the arithmetic or call native handlers**. Its denial is invented fixture data. Local tests cover failed guard flags, warning binding/order/duplicates, inventory changes, malformed/oversized/encoded requests, duplicate initial requests, wrong route, wrong call/output, startup errors, cancellation, missing warning/continuation and owned cleanup. No matching native executable is selected in the maintainer environment; Windows native outcome remains pending.

The candidate is ready for one user-side local native observation using the installed 0.160.0 package. It requires no login or subscription inference approval. Stop after that one result. Success would establish only this fixed selected-call observation under the checked local fixture. Wait denial, broader schema/handler qualification, real subscription entitlement, egress accounting and production admission remain unverified. The wait fixture is deliberately deferred until the first native guard result is available. No Asteria bridge is implemented.
