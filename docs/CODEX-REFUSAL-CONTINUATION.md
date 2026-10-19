# Explicit continuation past one expected local refusal trace

## Evidence behind this mode

The latest user Windows receipt still stops before a continuation: one local request, an explicit empty tools array and the fixed scripted response supplied; current owned closure/cleanup succeeds. Its new body-free witness classifies exactly one error as the fixed-interaction unsupported suffix pattern, core_tools target, read after the response was queued. This is an observed pattern, not authenticated root cause or completed native refusal. [User receipt](validation/user-local-codex-refusal-stderr-pattern-windows.json).

## Separate implemented policy

The original check-codex-interaction-refusal entry still stops at that error. A new explicit entry, check-codex-refusal-continuation.mjs, selects a narrow local observation policy. No caller-supplied policy/tool/provider/model/response is accepted and there is no default fallback into it.

Exactly one complete stderr error line may be observed without stopping only when all of these hold:

- The owned thread is prepared, the fixed fictional catalogue bytes checked, the actual declared tool array reviewed and empty, the fixed response queued, and no tool-output continuation classified yet.
- The line has an uppercase ERROR marker, a reviewed core tools router/registry/parallel target, and the exact anchored error=unsupported call: request_user_input suffix (or functions.request_user_input). It contains no fatal/panic marker and no startup-control error.
- No earlier error blocked the policy and no expected trace has already been continued.

Every other error, duplicate expected line, missing prerequisite, unknown/changed tool or suffix, sandbox lookup failure, unrecognized config, invalid UTF-8, byte/line overflow or malformed context stops. The policy preserves existing stderr limits: 32768 bytes total, 128 lines, 8192 bytes per line/pending line. Raw text stays suppressed. Read-time phase cannot authenticate native emission time; an unterminated line first completed at close after a continuation cannot acquire the earlier phase.

The original shared startup diagnostic and body-free witness remain visible, including their generic error label; the new refusalTracePolicy records whether one line was continued and whether another condition blocked. Keeping a log line does not count as successful refusal. Success still requires the second loopback request with the fixed model, exactly one correctly bound function tool output and an exact reviewed unsupported-call result. Unclassified output, timeout, cancellation, process death or notification suppression cannot replace it. An error discovered at close still blocks the overall result even if a continuation was provisionally classified.

## Scope and limits

The local exchange is unchanged: one ephemeral app-server turn, fixed synthetic interaction-only response, at most two served local POSTs, then a fixed HTTP error. No shell, patch, filename or real user material is supplied. Original observers, old approvals and DreamModelPort real-inference gates are unchanged. Every real-dispatch, general tool/handler-denial, subscription entitlement and quality flag stays false.

A selected_refusal_observed result qualifies only this fixed bound unsupported output in the local exchange. It cannot qualify real model metadata, all handlers, another account/catalogue, process descendants or background networking. There is no login, real inference, paid API or credential environment. Default CLI operation is an independent Node peer, not native execution.

Independent tests cover successful scripted continuation, all stage prerequisites, arbitrary context/getters, UTF-8/ANSI/CRLF splitting, wrong target/tool/suffix, fatal/panic, repeated and unrelated errors, EOF timing, cancellation after the allowed trace, lack of continuation, unclassified continuation, old-entry behavior and rejected CLI overrides. Actual maintainer native 0.159.2 still times out preparing a thread before any turn or local POST; Windows native continuation remains pending. [Exact validation](validation/codex-refusal-continuation.json).

Commands:

- Independent peer: `node scripts/check-codex-refusal-continuation.mjs`.
- Explicit native: `node scripts/check-codex-refusal-continuation.mjs --native-executable ABSOLUTE_NATIVE_CODEX_PATH`.

Use the checked installed native 0.160.0 executable for the Windows comparison. No live/login/fee or arbitrary policy switch is available. Do not automatically repeat a blocked result.

## Official source review, rust-v0.160.0

- [Router](https://github.com/openai/codex/blob/rust-v0.160.0/codex-rs/core/src/tools/router.rs), Git blob d9f1f63eed9cd28b40ac69820e82d6f796ad1dea: err tracing instrumentation on dispatch paths.
- [Registry](https://github.com/openai/codex/blob/rust-v0.160.0/codex-rs/core/src/tools/registry.rs), blob 7d88650f59d9bf3cabbabfd346bbf8d9f0ca8495: missing entry returns RespondToModel with unsupported-call text before handler invocation.
- [Tool error type](https://github.com/openai/codex/blob/rust-v0.160.0/codex-rs/tools/src/function_call_error.rs), blob 1ab8335b259a9ba30caa1dc210913ca5dd9af1d3: RespondToModel displays its payload; Fatal is separately marked.
- [Parallel runtime](https://github.com/openai/codex/blob/rust-v0.160.0/codex-rs/core/src/tools/parallel.rs), blob 0a7afc54cc2844d2fd51810bc813661e7af185d3: nonfatal errors are converted into response items.

These explain why logging and a subsequent tool-output continuation can coexist. They do not certify the user's runtime cause, eliminate the need for a bound continuation or authorize real inference. No upstream implementation copied.

The next user native attempt passed the scoped trace but stopped at account/rateLimits/updated before its continuation. An [exact initialization opt-out](CODEX-RATE-NOTIFICATION-OPTOUT.md) is now requested for this local entry only; received notification validation remains unchanged. Windows suppression/continuation is pending, not inferred from source or fixtures.
