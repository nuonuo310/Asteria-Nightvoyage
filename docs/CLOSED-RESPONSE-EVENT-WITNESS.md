# Closed response-event location metadata

## Implemented scope

`closed-response-event-witness-v1` is a new, independently versioned diagnostic contract. It separates a reviewed identifier from a name outside the reviewed catalog, and records bounded context at the first unsupported event. It never reconstructs the discarded historical response, broadens accepted events, executes tools or proves dream quality. The existing [coverage audit](UNREVIEWED-EVENT-COVERAGE.md) remains the reason this change is needed.

The source is this project's reviewed static list of 59 public reference identifiers. It is not an exhaustive service catalog. Its canonical hash is `051cd44649b7473fe524499a76cba0ba4fa1777c5f15d1419d49ff200f74b096`; changing it requires a new reviewed policy/manifest, not silently relabeling old codes. The helper resolves codes only to that static public list. No unknown-name hash, provider example, SDK implementation or private text is copied.

## Metadata contract

A witness has exactly eleven fields. The containing rejection diagnostic has exactly `schemaVersion`, `layer`, `check` and `witness`; its layer is `responses_event_witness`.

| Witness field | Meaning and bound |
| --- | --- |
| `schemaVersion` | Exactly 1 |
| `policyVersion` | Exactly `closed-response-event-witness-v1` |
| `catalogueHash` | The fixed public catalog hash above, never a provider-name hash |
| `classification` | `reviewed_event`, `outside_catalogue` or `invalid_type` |
| `eventCode` | Fixed `event_000` through `event_058`, or null outside the catalog |
| `route` | Fixed audit routing label, not event acceptance |
| `namespace` | Only `response`, `error`, `other` or `invalid` |
| `typeShape` | Only `lowercase_dotted`, `empty`, `other` or `invalid` |
| `typeByteBand` | Only `empty`, `1_32`, `33_96`, `97_plus` or `invalid`; UTF-8 bytes, not tokens |
| `ordinal` | Local structured-frame position, 1–1024, not provider sequence or time |
| `previousReviewedEventCode` | The last preceding catalog code, or null; no raw prefix history |

The observer accepts only a type value, never an event body. It does not stringify objects, invoke type getters or retain raw strings. Descriptor-based review rejects extra fields, accessors, inconsistent codes/derived values and invalid bounds. Private error branding prevents unrelated exception text from entering a program-created rejection; schema review of a stored object is not provider attestation.

The versioned stream applies its existing shape/sequence/resource checks first, observes the type once, then continues the unchanged validation branches. Blank/comment frames do not count. A malformed JSON/type, refusal, forbidden output item, post-completion frame or exceeded byte/event limit keeps its earlier diagnostic. The helper can describe a nonstring as `invalid_type`; the actual stream rejects that earlier as `event_shape`. The event witness appears only at the final unsupported-type branch. All 42 reviewed unsupported identifiers remain rejected. The other 17 identifiers continue through their existing validation/refusal routes; a known name alone is never accepted.

## Explicit next decisions

| Result | Diagnostic decision | Permitted automatic continuation |
| --- | --- | --- |
| Reviewed but unsupported identifier | `review_named_event_schema` | None; review its complete schema/lifecycle before any acceptance change |
| Name outside this catalog | `provider_contract_unverified_stop` | None; a direct-provider protocol boundary remains unverified |
| Invalid type/witness | `malformed_type_stop` / `invalid_witness_stop` | None |

An outside-catalog result is deliberately unresolved. It does not recover a name or prove that a service event is unofficial, malicious or malformed. The byte/shape/context bins support a bounded engineering decision, not a promise of exact root-cause discovery. Do not start another blind diagnostic after that result. No API fallback or mid-dream adapter switch is enabled; any future Codex selection belongs to a separately authorized new run with zero external calls and a ready adapter.

## Local and native components

`offline-event-witness-envelope.mjs`, `offline-event-witness-port.mjs` and `offline-event-witness-runtime.mjs` reuse the project-owned decoder/lifecycle with a guarded, narrow transformation and a distinct simulator identity. They default to Fake, reject native transport/fallback options, and persist closed failures only. A simulator callback is trusted test code, not an OS sandbox.

The separate [one-request entry](EVENT-WITNESS-DIAGNOSTIC.md) adds a newly branded native transport and explicit persisted approval owner; it does not replace any old entry. Both paths require the existing complete final-answer/stage validation before returning a valid stage. No reasoning is returned or saved. A native diagnostic discards even valid stage bodies rather than publishing a dream.

```sh
node --test test/response-event-witness.test.js test/response-event-coverage.test.js test/rejected-event-class.test.js
node scripts/check-response-event-witness.mjs
```

The rehearsal uses only fictional frames and temporary managed books, with zero real requests or user Store access. It checks 42 unsupported reviewed names, an explicit outside-catalog stop, reopen/deduplication/withdrawal, Fake completion and unchanged old native/API manifests. Integration tests additionally cover cancellation/late output, one-scene budget exhaustion, actual child exit and failure while saving diagnostic metadata. No generated raw name/body survives. Existing managed backup/withdrawal limits apply; no physical erasure, external backup deletion or remote cancellation is claimed.

Independent MIT implementation; no new dependency or cross-repository write. [Validation and native rehearsal](validation/event-witness-diagnostic.json) distinguish mechanism tests from real qualification. No new real login, subscription request, recovered historical cause or accepted GPT dream is established by this work.
