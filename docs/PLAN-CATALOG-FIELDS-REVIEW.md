# Separately approved catalogue field review

This is a new catalogue-only observation entry, not a retry of the consumed v1 review and not a dream trial. It can resolve a future selected model's reviewed field labels; it cannot recover the two discarded original values. Real execution requires fresh explicit browser-login approval. No real login or catalogue request was performed while implementing this slice.

## Fixed scope

- Contract `plan-catalog-fields-review-v1`; selected model `gpt-5.6-sol`; projection `selected-plan-catalog-fields-v2` using the release-pinned [field contract](CODEX-MODEL-FIELD-CONTRACT.md).
- One authorization attempt, at most one additional authenticated GET to the fixed `https://api.openai.com/v1/models` endpoint. Login validation itself performs a catalogue GET, so at most two authenticated catalogue GETs total. OAuth exchange, identity validation and revocation are separate operations, not inference.
- Zero model requests, zero Codex children, no token transfer to a child, no API-key reads, no extra-credit approval, no dream publication, no automatic retry or fallback. The existing authentication owner remains unchanged and attempts remote revocation at action end.
- An isolated approval store outside the checkout, `codex-plan-catalog-fields-review-v1`, reuses only the existing application's connection identity mapping. Neither account credentials nor raw catalogue records/instructions are persisted. An old v1 review, dream or billing store is refused as a foreign owner.
- Fixed 24-hour approval lifetime. Authorization intent is durable before discovery/login; the additional GET intent is durable before its HTTP request. Re-init cannot reset consumed state or extend expiry, even if the attempt failed before inference. There is no inference in this contract.

## Projection

The new projection reuses the old bounded own-data catalogue reader to select exactly one model. It then classifies shell_type and tool_mode with the reviewed release vocabulary. It keeps the other existing fixed shape labels, not raw values. All qualification flags remain false.

| Status | Retained value | Meaning |
| --- | --- | --- |
| recognized | One reviewed canonical enum label | The supplied string matched this vocabulary; not native execution proof. |
| recognized_alias | unified_exec, shell only | A reviewed shell alias matched. The exact alias is not retained. |
| missing | null | No own field was present. |
| null | null | The field explicitly contained null. |
| invalid_type | null | A non-string, non-null value was present; its raw value/type is not retained. |
| unreviewed | null | A string outside this closed vocabulary was present; the string is not retained. |

The underlying classifier retains its `offline-codex-0160-field-review-v1` identity because its classification algorithm is unchanged; its header now describes a pure classifier usable by this bounded observer. It supplies no credentials or dispatch authority. The new owner is the only newly added authorized-use boundary. Missing/null/unknown values are not converted into native defaults or production admission.

Selected-field accessors are rejected without executing them, and new result validation reads descriptors before copying data. This is a parser for ordinary JSON data, not a sandbox for executable JavaScript/Proxy inputs. Extra persisted fields, unknown statuses and mismatched canonical labels are rejected. Unknown catalogue data never becomes raw diagnostic text.

## Commands and approval boundary

`node scripts/plan-catalog-fields-review-cli.mjs preflight` is credential-free; if the store is absent it returns the source-pinned proposal without creating a directory. The [proposal](proposals/plan-catalog-fields-review-v1.json) pins the new owner, CLI, projection, classifier and their import closure separately from consumed v1.

After fresh explicit user confirmation only, initialization requires all three exact flags:

`init --approve-catalog-login --acknowledge-no-inference --acknowledge-prior-review-not-recoverable`

`run --login` then permits one browser login and bounded observation. It prints a private transient local authorization link; do not share the link or callback. No API key or native executable is needed. Unknown flags, model/fee overrides and omitted acknowledgement fail before opening the store. The CLI itself has no injected transport or test-auth override.

Reports separate shape observation from remote cleanup. An observed result with unknown/failed revocation still requires cleanup attention. Local process cancellation does not prove remote cancellation. Process death during authorization reports uncertain; death after observed persistence can retain shape with unknown cleanup. Both remain terminal and cannot log in again. Queued cancellation consumes no network but durably prevents repetition. A cancelled/expired late catalogue body is discarded. Storage errors do not authorize another request or publish an uncommitted result.

## Verification and remaining work

All automated tests use independent synthetic OAuth/JWT/HTTP and local callback fixtures. They cover new enum/alias/type labels, malformed persisted labels/getters, exact approval and actual CLI paths, v1 ownership refusal and unchanged bytes, terminal replay, cancellation/late body, expiry, concurrency, actual child exit and persistence failure before login or before the extra GET. The old projection, v1 owner/CLI/proposal and auth owner remain unchanged; the old 28-source proposal still validates.

Evidence: [validation](validation/plan-catalog-fields-review.json). Tests do not establish live account fields, real subscription entitlement, native tool configuration or all-handler denial. The next user operation, only after fresh confirmation, is this catalogue-only login. Actual native credential containment, model inference, dream quality and Asteria's formal bridges remain unfinished and are not enabled here. Historical grants, unknown billing holds, API budgets, user memories and other repositories remain unchanged.

## Subsequent user observation

The [sanitized Windows receipt](validation/user-local-plan-catalog-fields-windows.json) reports one consumed observation: recognized_alias/unified_exec for shell and recognized/code_mode_only for tool mode, with revocation confirmed and zero inference/native children. The repeated action/preflight JSON is one result, not two authorization attempts. No exact shell alias or prior v1 value is reconstructed. This is user-reported evidence, not a maintainer real-account reproduction.

The next dependency is a [credential-free fictional two-mode comparison](CODEX-TOOL-MODE-COMPARISON.md), because the previous Windows native matrix used direct throughout. No new login or real inference is requested by that local comparison.
