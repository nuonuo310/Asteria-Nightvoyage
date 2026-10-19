# Fixed local interaction refusal probe

This is a separate no-auth fictional protocol probe, not CodexAdapter, an inference grant or a dream. The Windows empty-tools observation is recorded separately; an empty advertised list does not prove absent native handlers.

## Implemented exchange

The owner independently creates fresh disposable state/cwd/profile and the same pinned fictional catalogue, requests the existing isolation controls, utility switches and explicit empty turn environments, and validates the effective provider/model/config/thread. The original observers are unchanged and remain error-only.

Only after the first actual loopback request contains a reviewed, present, empty tools array does the probe supply a fixed, independently authored SSE fixture. That fixture contains exactly one function_call for request_user_input with an empty questions array, a fixed fictional call identity and one terminal response frame. It includes no shell command, filename, patch, user material, generated narrative or reasoning. This is an interaction-only test, not an attempt to invoke file read/edit handlers.

At most two local POSTs may be served: the initial request and the continuation carrying tool output. A further POST, wrong endpoint, auth header, unsupported encoding/media, oversized/stalled body or wrong model fails closed. The continuation must have exactly one function tool output, matching the fixed call identity. Only the exact reviewed unsupported-call strings for request_user_input or functions.request_user_input get selected_call_unsupported. Other output is unclassified; raw text and arguments never appear in receipts. The second response is a fixed HTTP error; there is no model-generated answer or inference retry. There is one app-server turn, not two turns.

The reported scriptedResponseSupplied / generatedResponseSupplied fields describe the synthetic HTTP response supplied by the local fixture server; they do not mean real model output or dream generation. Cancellation, timeout, a tool notification, native server request, missing-file/error text or cleanup failure cannot become a successful refusal result. A native interaction request is rejected without answering it; this does not prove its handler never started. No shell/file handler call is supplied. Only the owner's disposable test files are created/removed.

A selected_refusal_observed receipt proves only the observed bound unsupported output for this fixed call in this exchange. nativeHandlerDenialVerified, environmentHandlerDenialVerified, toolExclusionVerified, subscription capability, model entitlement and production dispatch stay false. No claim is made for all handlers, another model catalogue/account, background networking or escaped descendants.

## Runtime status

Independent Node peer and adversarial tests exercise the real local owner and loopback server. These are mechanism tests. Actual maintainer native CLI 0.159.2 still times out preparing its thread, before a local turn or HTTP request; current owned process/workspace cleanup succeeds. No native unsupported-call result is claimed. The user Windows 0.160.0 refusal attempt is blocked after one local request and a supplied scripted response; it has no refusal continuation. See the follow-up below. Native refusal remains unqualified. See [exact validation](validation/codex-interaction-refusal.json).

- Independent peer: `node scripts/check-codex-interaction-refusal.mjs`.
- Explicit native comparison: `node scripts/check-codex-interaction-refusal.mjs --native-executable ABSOLUTE_NATIVE_CODEX_PATH`.

There are no login, fee, live, arbitrary response/tool/model/provider or retry options. Do not run an earlier observer again to substitute for this distinct response-path test. No old subscription grant is reused.

## Official versioned protocol references

Reviewed rust-v0.160.0 public data shapes and behavior; no upstream implementation or schema bundle copied:

- [Router](https://github.com/openai/codex/blob/rust-v0.160.0/codex-rs/core/src/tools/router.rs), Git blob d9f1f63eed9cd28b40ac69820e82d6f796ad1dea: model-visible specs and executable registry are separate.
- [Registry](https://github.com/openai/codex/blob/rust-v0.160.0/codex-rs/core/src/tools/registry.rs), blob 7d88650f59d9bf3cabbabfd346bbf8d9f0ca8495: missing registry entry returns unsupported-call error before handler dispatch. This static review does not establish the user's registry.
- [Response item models](https://github.com/openai/codex/blob/rust-v0.160.0/codex-rs/protocol/src/models.rs), blob 318a4faa3df0d840fedcfecbea4cba4ca81096d3: function-call name/arguments/call_id and function-call-output fields.
- [SSE parser](https://github.com/openai/codex/blob/rust-v0.160.0/codex-rs/codex-api/src/sse/responses.rs), blob 6b2a7ed47cb662f375f47bcac908b8c17bedc75e: output_item.done and completed frames. Independent payloads are synthetic and do not reconstruct a past provider response.

## Windows error and bounded stderr witness

The user native receipt prepared the ephemeral thread, checked the fictional catalogue bytes, observed a present empty tools array and queued/supplied the fixed scripted response. It then stopped at startup_error_observed, with no refusalObservation and no second fixture POST. Current owned closure/cleanup completed. stderr metadata has 487 bytes, two lines and the generic error label. No message text or per-line read phase was retained. The specific cause cannot be recovered from those counts. [Sanitized user evidence](validation/user-local-codex-interaction-refusal-windows.json).

The legacy stop reason uses startup terminology even for later error observations. This follow-up preserves that fail-closed behavior and the unchanged shared startup diagnostic; it adds refusalStderrWitness only to the separate refusal owner. The witness records fixed labels for the first error, an error-line count and phaseObserved: before_response_queued, after_response_queued or after_continuation_observed. These phases describe when this process read a complete line (or finalized an unterminated line), not the time the native writer emitted the bytes. The after-response phase does not establish that Codex parsed or accepted the fixture.

A suffix matching error=unsupported call: request_user_input (or functions.request_user_input) receives a diagnostic pattern label. Known core-tools or codex-api targets receive only fixed target classes; no target name, message, path, account, thread ID or arguments are returned. Unknown messages stay unclassified. The first error remains first; later patterns do not overwrite it. Limits are 32768 total bytes, 128 lines and 8192 bytes per pending/complete line, with fatal UTF-8 validation. ANSI stripping and CRLF are handled without broad error suppression. All existing error labels still stop immediately, including the recognized pattern. No native tool result or admission is inferred from this witness.

Official rust-v0.160.0 [router source](https://github.com/openai/codex/blob/rust-v0.160.0/codex-rs/core/src/tools/router.rs), blob d9f1f63eed9cd28b40ac69820e82d6f796ad1dea, uses tracing instrumentation with err on dispatch paths. [Registry source](https://github.com/openai/codex/blob/rust-v0.160.0/codex-rs/core/src/tools/registry.rs), blob 7d88650f59d9bf3cabbabfd346bbf8d9f0ca8495, has a missing-tool RespondToModel unsupported-call path. [Parallel execution source](https://github.com/openai/codex/blob/rust-v0.160.0/codex-rs/core/src/tools/parallel.rs), blob 0a7afc54cc2844d2fd51810bc813661e7af185d3, converts nonfatal tool errors to response items. These sources motivate a candidate diagnostic pattern; they do not reconstruct the user's unknown stderr or prove a harmless cause. No upstream implementation copied.

Final-source independent tests include byte-split UTF-8/ANSI/CRLF, wrong tools and suffixes, arbitrary text/targets, first-error preservation, EOF without newline, bounds, early/late phase observations and process-owner integration. Scripted matching and nonmatching errors remain blocked with no refusal result. Actual maintainer native 0.159.2 still times out before thread preparation; no native pattern is claimed. [Exact validation and hashes](validation/codex-refusal-stderr-witness.json).

Next minimum external action is one explicit Windows local-only diagnostic run of the updated refusal entry. It does not change the model, provider, fixed response, request cap, account/credential policy, real generation gate or old subscription approvals. Do not repeat the prior unchanged binary workflow or send raw stderr to chat. A matched pattern would still require review before any later acceptance change.
