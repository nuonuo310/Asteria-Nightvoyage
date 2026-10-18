# Explicit missing-type subscription trial entry

## Completion status

The missing-Content-Type candidate now has an authenticated transport, a versioned model-port extension, the existing lifecycle algorithm, persistence, replay and a gated trial CLI. Synthetic OAuth/HTTP tests exercise the actual new transport path through two scenes and wake. **No real account login, user Store access or real model request has occurred in this implementation slice.** Actual account eligibility, missing-header full-stream compatibility and dream quality remain unverified.

The observed user prefix is only SSE-like. This entry does not recover that discarded body or treat it as a completed response. A new real trial requires separate explicit user permission and fresh manual browser authorization.

## Interface and version boundary

| Surface | Contract |
| --- | --- |
| Adapter identity | `ChatGPTPlanAdapter`, `openai`, `gpt-5.6-sol`, `chatgpt_plan` |
| New transport protocol | `chatgpt-plan-inline-missing-type-v1` |
| Header policy | `explicit-missing-only-complete-sse-v1` |
| Shared model contract | Existing `dream-model-port-v1` request/response validators |
| New trial | `chatgpt-plan-missing-type-trial-v1` |
| API fallback | Disabled |
| Run / call ceiling | One new fictional dream, at most two scenes plus wake / three external intents |
| Local limits | 65536 request bytes, 65536 stream bytes, 128 events, 1200 JSON-content bytes, 60 seconds |
| Server token cap / money | No server cap / unknown |

`missing-type-model-port.mjs` reuses the original request, response, error and Fake/Codex definitions and adds a module-issued candidate adapter/selection. Candidate transport instances are capability-branded and require a checked active session, the fixed model, an authorization callback and explicit missing-type opt-in. A forged transport/session is rejected. The original adapter refuses candidate transport instances; they cannot impersonate the original protocol.

`missing-type-model-runtime.mjs` is a project-owned versioned copy of the existing 77-line lifecycle wrapper, with only its model-port import changed. A test compares that exact transformation. The dream engine, Store, complete-stream decoder, stage validator and original runtime remain unchanged. This small duplication preserves existing immutable source closures instead of migrating consumed grants or rewriting the dream engine. Maintenance cost is explicit: a future shared-runtime change must update and reverify this version boundary, not silently let the copies drift.

`missing-type-content-view.mjs` retains the validated original projection and explicitly admits the candidate's live/synthetic protocol identities. Dreambook's one import change uses this superset reader, preserving previous supported books. New books are read with an explicit `--data-dir`; the existing default directory does not change. An absent/withdrawn dream yields no body. No review writer or Asteria integration is added.

## Admission and output validation

The request still posts only to the public Responses endpoint with `store:false`, `stream:true`, explicit context, no tools or unsupported token-cap fields. HTTP must be 200. SSE headers remain valid; only a null/empty header can use the explicitly approved compatibility branch. A present JSON, HTML or plain-text type is rejected even if its body contains a valid-looking SSE transcript.

Missing-header admission uses the pure candidate predicate from the prior offline slice. Its historical `offline-*` metadata label describes the predicate, not dispatch permission. Only the separately identified authenticated transport can issue requests. Header admission alone releases no model-stage output. The unchanged strict decoder must validate complete UTF-8/SSE framing, permitted event shapes, matching model, `response.completed`, bounded assistant JSON and consistent usage; the existing dream-stage validator must then accept the stage. Prefixes, failed/incomplete streams, explicit tool/refusal output, malformed or truncated data cannot publish a dream. Limits are not raised to accommodate the observed response.

Receipts state the **approved header policy**, not whether a particular new response actually lacked its header. Per-call raw header observations are not saved. Successful normalized token usage is reported when available; failed/ambiguous attempts remain unknown. This does not prove free usage, zero charge, remote cancellation or quota restoration.

## Approval, history and lifecycle

The CLI is `scripts/missing-type-plan-trial-cli.mjs`, with `preflight`, exact `init` and `run --live` only. Initialization requires all five flags:

```
--approve-fictional-subscription-trial
--confirm-extra-credits-disabled
--acknowledge-no-server-token-cap
--approve-missing-content-type-compatibility
--acknowledge-consumed-diagnostics
```

These flags are a contract, not a record of user approval. The no-extra-credit setting remains a user assertion, not a remotely verified account setting. No API key or additional RMB budget is requested.

The fixed new Store is `Nightvoyage/gpt-subscription-missing-type-dream-v1` under platform application data, outside the checkout. A separate immutable 24-hour grant pins the full source closure, public fictional fixture and body-free preceding prefix receipt. The existing fixture file remains no-egress; only the approved in-memory snapshot grants model egress. The predecessor chain must preserve the exact consumed missing-type, SSE-like-prefix result and confirmed revocation. It records three preceding diagnostic intents without resetting any older account, request count or unknown usage. Previous failed dream and diagnostic directories are not modified.

Public discovery is checked before login; network failure there leaves approval untouched and performs no automatic retry. Durable authorization state precedes login. The existing model-port lifecycle durably records each intent before dispatch and commits validated stage/checkpoint/usage atomically. The adapter identity is fixed from scene zero. No mid-dream model switch, fallback, repair, resume flag or automatic retry is available. A failure after scene one retains its checkpoint and stops. Process death after authorization or dispatch reopens as uncertain and cannot log in or dispatch again. Completed/failed/cancelled replay is local. Reinitialization cannot reset a consumed grant or extend expiry.

Own-source withdrawal and predecessor withdrawal/mutation block dispatch and subsequent views. Late output is suppressed. Deletion and withdrawal remove managed body/descendant data; the accounting/intent metadata is body-free. This guarantee covers the managed local Store and recovery files, not provider retention, terminal copies, external backups or physical erasure. Store opening may update lock/recovery bookkeeping.

OAuth credentials remain transient, with checked identity/scope/catalog validation and cleanup. Revocation true is reported only from confirmed cleanup; false/unknown is not success. Returned authorization cleanup notices instruct disconnection in ChatGPT Settings if authorization completed but revocation was unconfirmed. Cancellation of HTTP remains unknown remotely. Historical readers/preflights and their pinned source closures still verify; consumed entries remain incapable of another call.

## Verification and next operation

[Targeted evidence](validation/missing-type-plan-entry-validation.json): 51/51 tests, including 28 new trial tests plus existing policy/dreambook tests. Full Linux regression: 1069/1069. [Independent script evidence](validation/missing-type-plan-entry-script.json) exercises three candidate synthetic HTTP requests, two saved scenes, wake, normalized usage, zero-request replay, unchanged original/wake and old state bytes, typed reading and withdrawal suppression after restart. Synthetic historical setup also uses fabricated fixtures; these receipts are not real user consent or account eligibility evidence.

Tests cover exact approvals, capability opt-in, closed CLI flags, full source/CRLF pins, unchanged legacy runtime algorithm, unchanged historical states, rejected wrong types/partial streams, failure after first scene, queued/in-flight cancellation, timeout, source/ancestor withdrawal, owner conflicts, process death, initial/intent/checkpoint persistence failures, deletion, and unconfirmed revocation. Windows validation remains pending for this entry.

Next operation requires asking the user to approve **one new fictional dream, at most three additional subscription calls**, with this explicit missing-header policy and no extra credits. Only after confirmation provide one complete Windows synchronization/test/init/preflight/login block. Stop on failure; do not rerun consumed diagnostics. The formal default and legacy API entries are not silently changed. Native Codex transport and both Asteria bridges remain pending; no other repository is modified.

Independent MIT project implementation. Existing project code is reused/versioned openly; no third-party implementation, private repository text, real chat, private memory, key, callback or user runtime file is copied. No dependencies added.

Official references: [Models and inference](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference), [Preview limitations](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations). The compatibility branch is a project engineering policy, not an official guarantee about missing response headers.
