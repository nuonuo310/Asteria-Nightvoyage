# Rejected response event classification — offline only

## Latest user report

The user supplied a terminal Windows aggregate-envelope receipt: one external intent, zero saved scenes, no wake record, `invalid_model_response`, and `responses_envelope / unknown_event`. Revocation is reported confirmed; credentials were not persisted and usage/money remain unknown. The new grant is consumed. Local run/request identifiers, paths, authorization links and provider body are deliberately omitted here. This is user-reported evidence, not a maintainer Windows execution.

This does not prove the latest response crossed 128 events, the aggregate repair was qualified by real inference, or the provider completed a dream. No event name or ordinal was retained. The discarded historical event cannot now be classified or reconstructed.

## Public references and ambiguity

The [official Responses streaming reference](https://developers.openai.com/api/reference/resources/responses/streaming-events), checked 2026-10-18, distinguishes queued, failed, incomplete and error events, as well as output annotations and compaction progress. The [official Sign in with ChatGPT inference guidance](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference) requires completion for success and notes that subscription usage errors may occur after streaming begins. These contracts establish possible categories, not what happened in this user's discarded response or the availability of this account/model.

The current aggregate decoder rejects several distinct event types at its `unknown_event` branch. Independent synthetic streams demonstrate that the old metadata can represent any of the cases below. No captured provider example or third-party parser implementation is copied.

| Exact event type in a scripted rejected frame | Offline candidate category |
| --- | --- |
| `response.failed` | `upstream_failed_event` |
| `response.incomplete` | `upstream_incomplete_event` |
| `error` | `upstream_error_event` |
| `response.queued` | `unsupported_queue_event` |
| `response.output_text.annotation.added` | `unsupported_annotation_event` |
| `response.compaction.compacting` | `unsupported_compaction_event` |
| Every other rejected type | `unreviewed_event` |

This is a deliberately incomplete fixed catalog. A category describes only a rejected type string, not validation of that event's payload, proof of provider identity, actual quota exhaustion, correct annotation, safe compaction or successful inference. Arbitrary event names, hashes, IDs, messages, error codes, reasoning and user material never enter these diagnostics.

## Implemented offline slice

`rejected-event-class.mjs` provides private-branded failures and a descriptor-checked, closed three-field metadata schema. `offline-event-class-envelope.mjs` is the aggregate decoder with narrowly guarded version/import/rejection-metadata changes. Every formerly rejected event stays rejected, and other malformed/byte/lifecycle/refusal/tool checks retain their precedence. No live parser, permission owner, transport, accepted event set or budget is changed.

A simulator-only adapter/runtime exercises failure persistence: one local failed stage, unknown usage, no dream/wake, no implicit replay/resume, body-free diagnostic after reopen, and source/recall suppression after withdrawal. It has a distinct offline identity and Fake default. No native transport, API fallback, user Store, login or real model is supplied. Existing managed Store/backup boundaries and the absence of physical-erasure guarantees remain unchanged.

```sh
node --test test/rejected-event-class.test.js
node scripts/check-rejected-event-classes.mjs
```

The script outputs aggregate synthetic comparisons only. It cannot diagnose the stopped historical response. Whole-file comparisons normalize CRLF only and guard the limited transformation; existing live proposal pins must still match.

## Next boundary

Do not approve another full dream merely on the hope that one additional event type fixes the response. First review this closed metadata policy and a separate one-request diagnostic entry using the fixed model/fictional fixture and preserved predecessor. Such an entry must stop without publishing a dream, retain no rejected body, preserve unknown usage/cancellation, forbid replay/retry and require fresh explicit login/inference permission. That separate entry is now implemented and locally rehearsed in [the diagnostic-owner follow-up](PLAN-REJECTED-EVENT-DIAGNOSTIC.md); fresh real login/inference remains unapproved. This offline slice itself did not implement or authorize it. Any later acceptance change needs its own complete schema/lifecycle review; being named in official documentation is not automatic permission to ignore an event.

No new real request has been made. No GPT subscription dream is validated by the evidence available here. Codex and Asteria native bridges remain pending. Independent MIT project code and fictional fixtures only; no dependency or copied private/third-party implementation.
