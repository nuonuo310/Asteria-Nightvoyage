# Versioned native envelope components: entry still pending

The user has previously completed authorization and started real GPT-5.6-Sol request intents, but no GPT dream has passed validation and been saved. The most recent reported failure saved zero scenes and stopped at `plan_output_shape`; the old discarded response cannot identify the cause. Synthetic success below is not that failed run succeeding.

## What is implemented

- `envelope-plan-http.mjs` wraps the existing reviewed fixed public Responses transport, using a new module-issued brand and protocol `chatgpt-plan-reasoning-envelope-http-v1`. It adds no alternate endpoint, credential source, retry, API fallback or looser byte/time limit. It requires both explicit missing-header compatibility and validated reasoning-discard opt-in, plus an active checked OAuth capability and an authorizer supplied by the eventual trial owner.
- `EnvelopePlanAdapter` accepts only that brand and GPT-5.6-Sol. It uses the exact offline-tested envelope decoder and existing typed stage checks. Reasoning is validated/discarded and never becomes an answer, memory or persisted stage. A native selection cannot declare fallback or impersonate the old missing-type adapter. The original Fake default and original providers remain unchanged.
- A versioned lifecycle wrapper changes exactly one import from the existing runtime. A separate read projection adds only the exact new native protocol identity. Both deltas are guarded by whole-file comparison tests. The generic dreambook CLI has **not** admitted this native identity yet; tests use the explicit component projection.
- A read-only source/fixture inventory reports implementation scope and pending work. It sets `dispatchEnabled:false`, `userApprovalRecorded:false`, `fixtureEgressApproved:false` and is not a grant or initializer. No real trial command exists for this candidate.

These are low-level trusted application components, not an independent consent boundary. A caller importing them still needs an active checked session and a correct policy owner. An authorizer callback is not proof of human consent. No claim is made that arbitrary host JavaScript is sandboxed.

## Verification

`node scripts/check-envelope-native-components.mjs` exercises the native OAuth/HTTP code path using fabricated OAuth/provider HTTP and a temporary fictional Store. Only native loopback authorization callbacks are used; every public service request is intercepted by the independent synthetic fixture. No real login, credential, user Store or model is accessed.

The rehearsal commits two scenes/wake, three usage rows and three durable external **intents**, with three synthetic provider requests. Completed replay issues zero extra requests; original/wake remain unchanged, reasoning and credentials are absent on disk, persisted content can be projected after closing the engine, and the session becomes unavailable after the action. Synthetic revocation success says nothing about a real account.

Tests also cover missing/forged authority, broadened constructor options/getters, old-brand incompatibility, no-egress rejection, second-stage failure without repair, explicit HTML/incomplete/invalid-usage rejection, noncooperative cancellation, direct Store withdrawal and late output. Existing source-pinned proposal checks remain intact.

## Required before fresh real inference

1. Implement an immutable new trial grant bound to the exact source closure, fictional fixture and body-free predecessor receipt. Preserve the consumed first-scene failure; do not reset or continue it.
2. Bind one run to GPT-5.6-Sol and this protocol, at most three external intents, no retries/repair/fallback; persist authorization and intent before dispatch. Expiry, cancellation, process death, storage failure and withdrawal must remain closed across replay/reinit.
3. Add candidate-specific fixed diagnostic vocabulary before requesting another real call. The existing candidate still collapses some envelope failures into an unclassified validation label; repeated one-call observers are not a substitute for this offline work. Never preserve arbitrary messages, reasoning, provider identifiers or rejected bodies as diagnostics.
4. Admit the exact native protocol in the generic reader and complete end-to-end synthetic CLI/grant/replay tests. A source inventory is not this implementation.
5. Only then request fresh permission and provide a complete Windows command block. Keep no-server-token-cap and unknown usage/billing/cancellation limitations explicit. Do not treat a model catalog, synthetic OAuth or component success as inference entitlement or dream-quality acceptance.

## Official references and code provenance

Reviewed 2026-10-18: [Sign in with ChatGPT models and inference](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference) specifies the public Responses route, streaming, `store:false` and terminal completion. [Responses streaming events](https://developers.openai.com/api/reference/resources/responses/streaming-events) describes separately typed message and reasoning events. The compatibility subset and discard policy are this project's engineering decisions, not a guarantee that the historical failure was reasoning-related or that missing Content-Type is officially supported.

Implementation reuses project-owned MIT code. No third-party implementation, private source text, user material or key is copied; no dependency or other repository is modified. Asteria bridges and native Codex remain pending.
