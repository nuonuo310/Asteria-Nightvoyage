# Plan transport admission (offline candidate)

## State

**Subsequent user-reported Windows trial (2026-10-23): STOPPED / CONSUMED.** The user ran the exact one-use proposal after a fresh approval. The first scene recorded one external-call intent and one stage dispatch, then failed with `invalid_model_response` at `responses_envelope / unknown_event`. No scene or wake was saved; usage and money remain unknown. Local authorization finished and remote session revocation was reported confirmed; remote cancellation is unknown. No automatic retry, API/Codex fallback or second stage occurred. The rejected event name and body were not retained, so this record cannot identify which provider event appeared or whether a completed response would have passed. The allowance is consumed: **do not reinitialize or rerun it**. The reported object-hash `proposalHash` is `9a82a79cd39be213ec5ed3a60193b39f25838e4f6c9e277dcd93c470b229c0e8`; it is distinct from the proposal JSON file's byte SHA-256 below and was independently recomputed from the pinned proposal object. This is a user-reported receipt, not a coordinator-observed Windows run.

The following describes the earlier offline candidate before this consumed trial. `NV-PLAN-TRANSPORT-ADMISSION-01` is **OFFLINE_READY_AWAITING_FRESH_APPROVAL**. It is a new candidate over implementation base `d7ab7f3de3c4e850b2a71510f0718c9272220b27` and authority commit `19f14308497bc843294af0847d5adad10f2a8250`; it does not continue, retry, reuse or reinterpret the consumed trial at PR #85 (`6468dffa38c8e52757f8f76f4d94cf12512e83c7`). No real login, credential read, model request, permit creation, permit consumption or extra-credit approval occurred while producing this candidate.

PR #85's terminal record remains a reported failed first stage with one external call, zero saved scenes, and `invalid_model_response / responses_protocol / plan_stream_limit`. Its old adapter folded aggregate `event_limit` and `stream_byte_limit` into `plan_stream_limit`; this candidate does not use that folded mapping to claim what happened in the unseen response, and does not treat the discarded answer as valid.

## Fixed transport identity

| Item | Fixed value |
| --- | --- |
| Adapter / provider / auth | `ChatGPTPlanAdapter / openai / chatgpt_plan` |
| Model | `gpt-5.6-sol` |
| Admission HTTP protocol | `chatgpt-plan-aggregate-admission-v1` |
| Upstream reviewed transport | `chatgpt-plan-inline-missing-type-v1` |
| Aggregate decoder | `offline-aggregate-envelope-v1` |
| DreamModelPort | `dream-model-port-v1` |
| Fallback | none: no API-key, Codex, model switch or retry route |

The adapter accepts only the new branded HTTP transport; a simulator, renamed stub, environment key, forged transport or fallback option cannot mint this selection. The endpoint, request shape and `store:false` remain those of the reviewed MissingType transport. The adapter adds no provider parameter, tool, retry or diagnostic request.

## Independent limits and diagnostics

| Boundary | Limit | Diagnostic layer / check |
| --- | --- | --- |
| HTTP request body | 65,536 UTF-8 bytes | `responses_protocol / plan_request_too_large` |
| HTTP response stream | 65,536 bytes | `http / http_stream_limit` |
| Aggregate outer stream | 65,536 bytes | `responses_envelope / stream_byte_limit` |
| Aggregate outer events | 1,024 non-comment events | `responses_envelope / event_limit` |
| Inner strict canonical frame | 65,536 bytes | `responses_protocol / plan_stream_limit` |
| Final answer JSON | 1,200 bytes | `responses_protocol / plan_content_limit` |
| Dream stage | inline scene/wake contract | `dream_stage / <closed check>` |

A missing Content-Type is allowed only by the explicit reviewed policy and still requires a complete, validated SSE envelope and dream stage. A present non-SSE type fails as `http / http_content_type`. The outer parser owns aggregate bytes and events; each transient event is shape-checked without accumulating the old 128-event counter, while the single sanitized completion enters the strict final-answer validator. The validator still requires a completed stream, fixed model, one assistant text message, consistent integer usage, bounded JSON, and the separate dream-stage checks.

Reasoning summaries, reasoning text and encrypted content are validated only against a closed shape and then discarded. They are not returned, logged, saved in the Store, shown in the Dreambook or included in a receipt. Unknown events, tools, refusals, malformed/truncated streams, post-completion data, invalid UTF-8, ambiguous attempts and source withdrawal fail closed.

## Durable trial boundary

The durable Store records the approval and external-call intent before HTTP dispatch. A first-stage failure stops with zero scenes; a second-stage failure retains only the committed first scene and never dispatches wake; a terminal failure or replay is local. The trial permits one fictional dream: at most three stage calls (two scenes and one wake), a 24-hour window, 60-second local stage timeout, first-failure stop, no resume entry, no Codex route, no paid API fallback and no extra credits. Cancellation, timeout and remote cancellation remain locally suppressed but remotely unconfirmed; money, remote usage and credit consumption remain `unknown`.

## Proposal binding

- Fixture: `examples/plan-transport-admission.snapshot.json`
- Fixture SHA-256: `5710d9e1180b50f6d9cc88cecbd0e71e017188572b0d6c90d43d36eed9646af7`
- Authority: `docs/construction-envelopes/2026-10-23-plan-transport-admission-v1.md` (`19f14308497bc843294af0847d5adad10f2a8250`)
- Source identity: `3c3012f0f235b6a797f10d4d343b079194b577affd90afa0a5f93f8babc11222`
- Proposal SHA-256: `984cb8dbff80cc68ac0e8935d743fa6d3ed736051a8708a6eed7e2d9cd1635a3`
- Proposal: `docs/proposals/nv-plan-transport-admission-01-v1.json`

The proposal is pending review text. It records `permitCreated:false` and `permitConsumed:false`; it does not authorize a run.

## Official contract review

Read on 2026-10-23:

- https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference
- https://developers.openai.com/siwc/token-sharing-open-source/errors-and-recovery
- https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations
- https://developers.openai.com/api/docs/guides/streaming-responses
- https://developers.openai.com/api/reference/resources/responses/streaming-events

These documents inform the request/event schema, completion and error handling. They do not verify this account's entitlement to `gpt-5.6-sol`, live inference, usage accounting, cancellation or dream quality.

## Offline verification

Run from the repository root:

```text
node --test test/plan-transport-admission.test.js
node scripts/check-plan-transport-admission.mjs
node scripts/check-codex-accounted-source.mjs
node --test
```

Windows / Node.js v24.19.0 results for this candidate: targeted 18 tests, 18 pass, 0 fail, exit 0; synthetic admission check exit 0; repository source-admission check exit 0; final full suite 1,911 tests, 1,911 pass, 0 fail, exit 0, 452,365.4742 ms. During construction, the stale source pin first produced 8 pass / 9 fail, and a test-observation mistake then produced 17 pass / 1 fail; both were corrected and are not presented as acceptance.

The checks cover synthetic OAuth and missing-type HTTP two scenes plus wake, 128/129 and 1,024/1,025 event boundaries, all three byte layers, first- and second-stage failure, unknown/tool/refusal/error events, malformed and truncated streams, model/usage/cardinality/JSON rejection, dream-stage rejection, cancellation, timeout, late output, checkpoint recovery, duplicate requests, replay, reasoning privacy, typed Dreambook readback and source withdrawal.

## Remaining blocker

The official example uses `gpt-6.1-sol`, while the requested fixed trial identity is `gpt-5.6-sol`. This account's availability of `gpt-5.6-sol` remains unverified. No model list, login or inference check was run to resolve it. A fresh approval must not substitute another model without a new proposal and review.
