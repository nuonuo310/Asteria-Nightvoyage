# Offline reasoning-envelope candidate

Version: `offline-plan-reasoning-envelope-v1`. This is an isolated protocol experiment, not a live adapter, a provider switch, a new permission or a completed subscription integration.

## Behavior

The candidate accepts bounded synthetic SSE, recognizes separately typed reasoning items and their summary/text events, validates their shape and links streamed reasoning identifiers/indices through a completed item, and discards that content. It passes only the one assistant text message to the existing strict completed-response validator. That validator still requires matching model, completed response/message, bounded JSON object and consistent integer usage. The dream-stage validator remains separate and mandatory; an envelope is not a dream.

It returns normalized text JSON, usage and a closed audit containing counts and policy identity. Reasoning text, encrypted content, provider identifiers and partial answer text are never returned. Internal buffers/maps are cleared on failure or finish. This is transient in-process disposal, not a claim of physical memory erasure.

Exactly one assistant message is required; at most 16 reasoning items are permitted. All incoming events, including discarded ones, count against the existing 128-event and 65536-byte bounds. Reasoning schema is a closed subset: unknown fields/types, malformed nested parts, tools, refusal, mismatched indices/identifiers, missing streamed completion, invalid UTF-8, incomplete/trailing output and ambiguous messages reject. The final-only completion form is allowed; it need not fabricate earlier stream events. When lifecycle events are present they must link to completed reasoning items. The candidate does not verify semantic agreement between reasoning summaries and text, and does not retain reasoning for that purpose.

The final result still cannot be released before `finish()`. No reasoning output, provider thread or summary becomes a memory source. Existing source grants remain no-egress.

## Validation and limits

- Tests exercise split UTF-8/CRLF, strict controls, linked summary/text discard, malformed metadata and lifecycle, tools/refusal/unknown output, completion/model/usage/JSON gates, byte/event bounds and a three-stage synthetic scene/wake protocol rehearsal.
- `node scripts/check-offline-plan-envelope.mjs` validates two synthetic scenes and one extractive wake against the existing inline stage contract. It checks the original strict decoder still rejects the same reasoning envelope and the existing missing-type/envelope/prefix proposal pins still match.
- No transport, OAuth, user Store, real credential or real model is used. This candidate is not imported by a live entry or exposed in provider selection. Persistence, checkpoint recovery, cancellation and source withdrawal integration have **not yet been exercised with this candidate**. Passing protocol tests does not qualify an account, establish the cause of the historical failure or accept dream quality.

The official references and historical evidence are in [output-shape review](PLAN-OUTPUT-SHAPE-REVIEW.md). Implementation and fixtures are independently authored MIT project code, with reuse of the project's validator; no third-party/private implementation is copied.

Subsequent work has added a separately identified [simulator lifecycle integration](OFFLINE-ENVELOPE-LIFECYCLE.md), with persistence, recovery, cancellation, withdrawal and reader tests. The protocol-only results above retain their original scope; the later integration adds its own evidence. Native transport/approval integration remains pending. No further login is requested by either offline slice.
