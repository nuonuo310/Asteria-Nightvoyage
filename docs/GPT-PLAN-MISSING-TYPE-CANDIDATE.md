# Missing Content-Type: full-stream compatibility candidate

## Evidence and inference limits

The user supplied a Windows receipt from the separately approved bounded-prefix diagnostic: HTTP 200, missing-or-empty Content-Type, an 8192-byte inspected prefix labeled `sse_like_prefix`, and confirmed session revocation. Its one additional request intent is consumed. No raw prefix, body, account identity, runtime identifier or authorization link is published here.

This supports investigating a mismatch between available stream data and the application's header requirement. It does not establish the full body's format, a completed model response, correct dream JSON, model eligibility, measured usage, quota restoration or a provider/VPN root cause. The prefix could be only a comment or an early event followed by failure. The discarded response cannot be reconstructed.

Official [models and inference](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference) requires consuming streamed events and checking `response.completed`; failed, incomplete and interrupted streams are separate outcomes. [Preview limitations](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations) requires the existing store/stream/input request settings. Neither page establishes the root cause of this user's missing header or promises that missing headers are supported. The compatibility policy below is an explicit project engineering candidate, not an official guarantee.

## Candidate implementation

`plan-missing-type-policy.mjs` is a pure, offline admission policy. It has no network, OAuth, credential, Store or filesystem dependency. It returns fixed metadata indicating that complete stream and dream-stage validation are still required. `inferenceAccepted` and `dispatchEnabled` are always false.

- HTTP status must be exactly 200.
- SSE Content-Type is admitted under the existing spelling rule.
- A null or empty Content-Type requires the exact boolean `allowMissingContentType:true`. Strict default rejects it.
- A present non-SSE value, including JSON, HTML, plain text, whitespace-only and near-matching values, is rejected even if the body starts with an SSE marker.
- Malformed or extra metadata and accessors are rejected without evaluating getters.

Admission is only to the **unchanged** `ChatgptPlanStream` decoder and model-port stage validation. It is not acceptance based on body sniffing. The decoder must reach a matching-model `response.completed` with a completed assistant text message, valid bounded JSON and consistent usage, followed by a valid stream ending. The dream stage must separately validate the resulting data. HTML, partial streams, fabricated markers, wrong models, refusal/tool output, failed/incomplete events, malformed UTF-8, duplicate completion and invalid dream structures remain rejected. Bounds stay 65536 stream bytes, 128 non-comment events and 1200 JSON content bytes. These are local byte ceilings, not server token caps.

## Real execution remains blocked

This slice does **not** modify the current live transport, model port, trial entry, proposal source pins or consumed approvals. No live option is added. The policy is exercised only in explicit protocol simulators whose receipts retain `provider_kind:openai_protocol_simulator`, `auth_mode:synthetic_stub` and zero external calls. It cannot be supplied to the existing live entry to bypass its type check.

A future integration must use a separately identified, immutable policy, preserve the provider-neutral port, pin one adapter per dream from its first external intent, and preserve old records. Existing historical preflights verify their full original import closures; modifying the common model-port/transport modules directly would invalidate those source checks. A migration must provide a verified read path for old receipts while leaving old dispatch grants consumed/blocked. It must not substitute a permissive simulator for an authenticated live transport or mislabel a compatibility path as the original protocol.

The next engineering slice is that integration/history boundary. This candidate alone does not justify another real request. No new browser login or real subscription inference is approved or attempted by this slice. No API fallback, paid API call, private material or Asteria bridge is introduced. Native Codex transport remains pending.

## Verification

Ten targeted tests cover the strict/explicit policy, full synthetic completion, invalid streams and model/stage data, unchanged limits, cancellation, and a persistent two-scene/wake loop with restart, replay, typed recall and withdrawal suppression. The loop uses independent fictional fixtures and three simulator stage calls, with no external generation. The original dream and wake remain unchanged on replay. The standalone command is:

```
node scripts/check-missing-type-sse.mjs
```

This command creates and removes a temporary synthetic book; it never opens the user's book or logs in. [Script evidence](validation/missing-type-sse-script.json) and [test evidence](validation/missing-type-sse-validation.json) record Linux results. Windows and actual missing-header stream compatibility remain unverified. Passing the rehearsal does not establish dream quality or semantic support.

Independent project implementation under MIT, with no new dependency or copied third-party/private implementation. Existing original-trial, envelope-diagnostic and prefix-diagnostic source-pin checks still pass. Other repositories are unchanged.
