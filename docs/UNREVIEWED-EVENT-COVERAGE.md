# Unreviewed-event stop: evidence and offline coverage audit

## Reported outcome and limits

The user reported the separate Windows diagnostic stopping as `rejected`, with one request intent, `rejected_response_event / unreviewed_event`, unknown usage/money, confirmed session revocation, no persisted credential or generated body. Postflight was consumed. This is a sanitized account of the user report, not a maintainer Windows execution or a copied runtime record. The new permission is consumed; do not repeat it, reset it or create a replacement allowance automatically.

The diagnostic completed its stopping mechanism but did not identify the event. The finite catalog was too narrow for that goal. Its code retains six exact categories and maps every other string reaching the final rejection branch to the same label. The actual event type and payload were discarded. They cannot be recovered from the receipt, and no generated dream can be reconstructed.

## Public reference audit

The [official Responses streaming reference](https://developers.openai.com/api/reference/resources/responses/streaming-events), checked 2026-10-18, also documents audio, function, search, image, MCP, code and shell event families. API identifiers from this reference form a static reviewed list; no documentation examples, SDK or server implementation are copied. Project-authored fictional frames test local routing. The list does not claim to enumerate every service-specific or future event.

| Route in current decoder | Reviewed names |
| --- | ---: |
| Core shape/completion validation | 9 |
| Reasoning shape/lifecycle validation | 6 |
| Refusal rejection | 2 |
| Exact type-specific rejection label | 6 |
| Documented tool types reaching unreviewed rejection | 32 |
| Documented audio types reaching unreviewed rejection | 4 |
| Total reviewed reference identifiers | 59 |

The audit replays all 36 last-row-family names as independent synthetic frames and obtains the same existing `unreviewed_event` label. These are routing counterexamples, not valid tool/audio payloads or proof of what the provider sent. Arbitrary names and even an empty string can also reach that label. A nonstring type is rejected earlier by the event-shape guard. Prefix membership alone never establishes official catalog membership.

Thus the report cannot distinguish a documented unsupported tool/audio event from an out-of-catalog string. It does not establish a tool executed, that audio was generated, a model refusal, quota exhaustion, a network fault or a finished GPT dream. Being documented does not authorize accepting or ignoring an event.

## Implemented offline work

`response-event-coverage.mjs` gives an exact-match, fixed-label audit over the independent identifier fixture. It has no transport, Store, login, grant, credentials, model execution or event-acceptance hook. Its routing labels are not protocol schema validation. Existing native diagnostic and aggregate-trial manifests still match; their records and decoder behavior are untouched. Fake remains the automatic test default, and Asteria/Codex bridges are not implemented here.

```sh
node --test test/response-event-coverage.test.js test/rejected-event-class.test.js
node scripts/check-response-event-coverage.mjs
```

The check script installs no provider and reports aggregate synthetic results only; a test forbids fetch entirely. Tests cover every ambiguous reference type, arbitrary names/getters/nonstrings, a complete existing valid stream, body-free diagnostics and unchanged live source pins. See [validation](validation/response-event-coverage.json).

## Engineering decision

Keep the consumed diagnostic terminal. Do not loosen acceptance, rename its old result, assign an invented event type, or run another full dream hoping for a different response. Another real attempt should wait for a reviewed diagnostic contract that can distinguish the required cases without body/credential retention and that has an explicit outcome for names outside its reviewed catalog. Merely adding more guessed labels is insufficient.

No new native diagnostic entry or real-request permission is introduced by this audit. No new inference or login occurred. Current truth remains: a valid saved GPT subscription dream is unconfirmed, and the exact latest rejected event is unavailable. A future real request requires fresh permission. Independent MIT project code only; no private Continuity text, actual dream material, local identifiers, callback links, keys, runtime books or cross-repository writes are included.
