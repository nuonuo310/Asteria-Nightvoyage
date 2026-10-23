# Offline aggregate-integration candidate

## Scope and baseline

This candidate is based on the exact `main@476b4378e78a0eab5371e2d6801bbd0f99c537dc` and reuses the reviewed `OfflineAggregateEnvelopeStream`. It adds an independently versioned, simulator-only DreamModelPort rehearsal and a read-only dreambook projection. It does not modify the Phase One freeze, Asteria bridges, historical proposals, consumed grants, failed receipts, or PR #85's proposal and trial artifacts.

PR #85's terminal receipt reports one external stage call, zero saved scenes, zero wake, and `invalid_model_response` with `responses_protocol / plan_stream_limit`. That adapter folded envelope `event_limit` and `stream_byte_limit` into one diagnostic, so the receipt cannot identify the underlying layer. This candidate neither recovers that discarded response nor claims to diagnose or repair it. The live authorization remains consumed.

## Layer ownership

| Layer | Limit | Owner | Diagnostic |
| --- | ---: | --- | --- |
| HTTP-shaped cumulative bytes | 65,536 | `boundedOfflineAggregateChunks` | `http / http_stream_limit` |
| Aggregate stream bytes | 65,536 | `OfflineAggregateEnvelopeStream` | `responses_envelope / stream_byte_limit` |
| Aggregate non-comment events | 1,024 | `OfflineAggregateEnvelopeStream` | `responses_envelope / event_limit` |
| Transient strict frame bytes | 65,536 | one fresh `ChatgptPlanStream` per forwarded frame | `responses_protocol / plan_stream_limit` |
| Final strict answer, model and usage | unchanged | persistent `ChatgptPlanStream` for the sanitized completion | `responses_protocol / plan_*` |
| Dream-stage shape and source provenance | unchanged | `validateStageResponse` / inline contract | `dream_stage / *` |

The HTTP wrapper runs before the aggregate decoder and therefore normally reports `http_stream_limit` first when the same 65,536-byte body ceiling is crossed. The outer byte and event diagnostics are independently testable through the decoder. The inner strict decoder no longer accumulates the whole stream: each forwarded transient frame starts a fresh counter, while the single sanitized completion enters the persistent final-answer validator.

This makes the 128/129 distinction explicit. A standalone historical `ChatgptPlanStream` accepts 128 events and rejects 129 with `plan_invalid_stream`; the integration path accepts both 128 and 129 total events because the outer owner permits up to 1,024. The integration path accepts 1,024 total events and rejects 1,025 with `responses_envelope / event_limit`, provided the byte ceiling is not crossed first.

Canonical reframing adds an `event:` line to a data-only transient frame. A synthetic 65,503-byte data-only delta frame becomes a 65,537-byte strict frame and yields `responses_protocol / plan_stream_limit` while HTTP and aggregate bytes remain under their limits. This narrow inner-boundary behavior is intentionally preserved and diagnosed rather than collapsed into a byte guess; it is not evidence about #85's discarded stream.

## Fixed offline port

`offline-aggregate-integration-port.mjs` advertises protocol `offline-aggregate-integration-v1`, adapter identity `ChatGPTPlanAdapter / openai_protocol_simulator / synthetic_stub`, and fixed model `synthetic-aggregate-integration-v1`. The stage contract remains `dream-model-port-v1`; the independently versioned protocol and selection hash distinguish this owner.

The adapter accepts only an explicitly supplied trusted simulator. Default selection is `FakeAdapter`. HTTP/OAuth transports, API keys, endpoints, fallback policies and forged selections are rejected without evaluating getters. `external_generation` is always `false`; there is no fetch call, credential loader, provider fallback or live selection path. The simulator callback is project test code, not an OS sandbox.

`offline-aggregate-integration-runtime.mjs` preserves the existing durable Store and dream lifecycle. It requires two scenes and one wake, commits usage with each checkpoint, supports explicit replay without redispatch, allows recovery only from an unambiguous committed scene checkpoint, and suppresses late output after cancellation, timeout or source withdrawal. Reasoning, summaries and encrypted content are transient validation inputs and never enter a stage value, Store entry, receipt or dreambook view.

`offline-aggregate-integration-content-view.mjs` accepts only this exact protocol/model identity and validates ownership, source versions, the two-scene chain, wake and typed fictional provenance before exposing a detached local view. `dreambook.mjs` routes only this protocol to that projection; historical readers remain unchanged.

## Verification

```sh
node --test test/offline-aggregate-integration.test.js
node scripts/check-offline-aggregate-integration.mjs
node --test
```

The synthetic check performs two scenes and the wake, verifies three local dispatches with zero external intents, reads the managed dreambook, reopens and replays without another dispatch, and withdraws the source to verify suppression and body purge. Targeted tests additionally cover fine reasoning/answer events, unknown events, tools, refusal, malformed UTF-8/JSON, empty and truncated streams, invalid final JSON/usage/model, all four diagnostic layers, 128/129 and 1,024/1,025 boundaries, cancellation, timeout, checkpoint failure and resume, duplicate requests, replay and source withdrawal.

This is offline acceptance only. It establishes no real GPT inference, account entitlement, remote cancellation, billing, dream quality, semantic support, Asteria integration or permission for another live run. Any future transport integration requires a new version, a new exact-source binding, fresh review and fresh authorization; it must not reuse #85's proposal, grant or receipt.
