# Offline aggregate-envelope candidate

This implements an independently versioned repair candidate for the [event-budget counterexamples](ENVELOPE-EVENT-BUDGET-REVIEW.md). It is not wired into a live adapter, user grant, historical trial or the generic dreambook reader. No new real request is authorized or performed.

## Ownership of bounds

`OfflineAggregateEnvelopeStream` owns aggregate UTF-8 decoding, SSE framing, total bytes, event count, item lifecycle and completion. The original strict decoder checks each allowed transient event separately without accumulating it. Only the sanitized `response.completed` frame enters a persistent strict decoder, which continues to validate the exact model, completed assistant message, final JSON object, content size and integer usage. This removes the nested cumulative 128-event bottleneck without editing the pinned original decoder.

| Bound | Candidate | Status |
| --- | ---: | --- |
| Request bytes | 65,536 | Unchanged request builder |
| Entire incoming stream bytes | 65,536 | Unchanged, including comments and CRLF |
| Final JSON content bytes | 1,200 | Unchanged strict validator |
| Non-comment events per stream | 1,024 | New offline candidate bound |
| Item/content/summary index range | 0–127 | Unchanged; event budget does not enlarge indices |
| Reasoning items | 16 | Unchanged |
| Server output-token cap | Unknown/absent (`null`) | Not inferred from local bounds |

The proposed 1,024-event ceiling is a finite local processing policy, eight times the old event budget. It accommodates the demonstrated fine-delta cases while retaining a tested ceiling for compact repeated progress events. It is not derived from model tokens or official entitlement, and is not a claim that a future provider stream fits. Tests accept exactly 1,024 compact frames below the byte ceiling and reject frame 1,025; oversized streams remain rejected first when that byte boundary is crossed. No unlimited parsing or configurable caller override is added.

All other envelope acceptance rules remain those of the previous candidate, guarded by a whole-file transformation comparison. This slice does not introduce stronger transient-delta/final-text equality, global sequence continuity or semantic checks that the previous decoder did not perform. Synthetic fixtures intentionally match their scripted deltas to their final messages. Reasoning and encrypted text are transient validation inputs, never returned stage values or persistent dream content. Clearing references is not physical memory erasure.

## Offline integration

`OfflineAggregatePlanAdapter` requires an explicit trusted simulator callback and model identity. It advertises `openai_protocol_simulator / synthetic_stub / offline-aggregate-envelope-v1`, with zero external-generation intents. Its selector defaults to Fake and rejects native/old subscription adapters, API transports, fallback policies and forged selections. Callback execution is trusted project code, not a network or OS sandbox; no credential loader, transport or API fallback is supplied by this candidate.

The runtime is the existing lifecycle with exactly two import substitutions: candidate model selection and existing closed envelope diagnostics. It persists typed scenes, wake and usage atomically; original dream, wake residue, later recollections and imagined continuations remain separate. Replays do not dispatch again. Explicit recovery is possible only from a committed checkpoint with no ambiguous dispatched stage, under the same identity. Actual child-death tests cover both durable intent and committed first-scene boundaries. Existing trial CLIs still do not expose automatic recovery or new grants.

Cancellation, timeout, direct Store withdrawal, durable storage failure and a second owner prevent late content from publishing. Source withdrawal suppresses reads, derivatives and cached recalls across reopen and purges managed state bodies. The boundary remains the owned Store: external copies/backups, prior terminal output, provider-held data and physical erasure are not managed here. No automatic delivery or Asteria state write is implemented.

Run the independent rehearsal:

```sh
node --test test/offline-aggregate-envelope.test.js test/offline-aggregate-runtime.test.js
node scripts/check-offline-aggregate-envelope.mjs
```

The rehearsal runs three simulator stages, each with 159 events and approximately 30 KB, persists two scenes and wake, reopens, replays with zero additional stages, recalls a dream-tagged candidate and verifies withdrawal. No user Store, real login, credential, provider network or real model is used. Existing live proposal pins must still match. The parser audit is aggregate metadata and is not added to the stage-value schema.

## Completion and next boundary

The offline decoder and simulator lifecycle are implemented and tested. Live transport integration, a separately reviewed source-bound trial owner, user-specific fresh permission and real inference qualification remain separate work. This does not rescue the discarded historical response, continue the consumed dream, establish GPT dream quality or connect either Asteria bridge. New live components must use a distinct protocol identity and preserve all prior permission/account/run boundaries.

All code and fixtures reuse this MIT project's own implementation. No third-party implementation, private repository text or dependency is copied.
