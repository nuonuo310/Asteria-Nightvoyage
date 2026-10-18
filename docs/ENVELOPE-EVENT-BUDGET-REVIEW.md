# Envelope event-budget review

## User-reported stopped trial

The user supplied a terminal Windows receipt for the separately approved validated-envelope trial: one external request intent, zero saved scenes, no wake record, `invalid_model_response`, and the closed diagnostic `responses_envelope / event_limit`. Remote authorization revocation was reported as confirmed. Usage and money remain unknown. This is user-reported evidence, not a maintainer-executed Windows run. No local identifiers, authorization links, callback values, credentials or response body are reproduced here.

The trial is consumed. Preserve its failed record and permission; do not rerun it, continue another model, refresh approval or create a replacement grant automatically. No validated GPT subscription dream has been saved on the evidence available here.

## What the code establishes

`ValidatedEnvelopeStream` increments a counter for each non-comment SSE frame before parsing its JSON. The configured ceiling is 128. Consequently `event_limit` means the 129th non-comment frame was encountered. It does not establish the type, shape or validity of that frame, the earlier event mix, final completion, total eventual bytes, actual model usage or semantic quality. The stream may have been valid or invalid beyond the boundary; its discarded body cannot now establish which.

The parser retains an independent 65,536-byte stream ceiling and a 1,200-byte final JSON ceiling. Bytes, SSE events and model tokens are different units. The original strict decoder also has an independent cumulative 128-event ceiling for forwarded events. Raising only the outer ceiling would leave that second boundary and is not a complete repair.

## Independent synthetic counterexamples

Run:

```sh
node --test test/envelope-event-budget.test.js
node scripts/check-envelope-event-budget.mjs
```

These fictional streams are constructed locally, with no transport, OAuth, credentials or user Store. Final messages and reasoning summaries match their scripted deltas. They demonstrate framing sensitivity within the existing byte ceiling, not conformance of any historical provider stream or dream-stage quality.

| Scripted case | Events | UTF-8 stream bytes | Current result |
| --- | ---: | ---: | --- |
| Fine reasoning deltas | 128 | 24,556 | Accepted, reasoning omitted |
| One additional reasoning delta | 129 | 24,743 | `event_limit` |
| Fine final-answer deltas | 138 | 22,140 | Outer and standalone strict decoders reject |

Coarsely framing the same final answer passes both decoders. A malformed 129th frame yields the same `event_limit`, proving that diagnostic alone does not distinguish valid dense streams from malformed continuations. Comment frames do not count as events but still consume the byte ceiling. These tests do not establish a suitable replacement event budget.

## Repair requirements and remaining boundary

This slice changes no live decoder, transport, event/byte/content limit, grant, historical proposal or default adapter. The current trial source closure still matches its published proposal. No new real request or user approval is recorded.

The next implementation should be an independently versioned offline candidate that gives one layer ownership of the aggregate stream budget and preserves the strict final-answer validator. Review both outer and inner counters together. A proposed event ceiling requires explicit finite bounds and counterexamples for fine answer/reasoning deltas, repeated progress events, unknown/tool/refusal events, malformed frames, incomplete or trailing streams, oversized bodies and cancellation/withdrawal. It must still require complete validation before returning any answer, discard reasoning and preserve fixed model identity. Passing that review would justify testing a candidate, not retroactively accepting this failed dream or asserting that a fresh real trial will pass.

Only after offline and lifecycle verification should any new live entry or fresh real-call permission be considered. Codex fallback cannot continue this already-started dream. No Asteria bridge is implemented here. Independent MIT project fixtures and code; no third-party implementation or private source is copied.
