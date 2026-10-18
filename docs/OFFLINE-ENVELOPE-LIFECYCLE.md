# Simulator envelope adapter and durable lifecycle

Protocol: `offline-plan-reasoning-envelope-v1`. Execution family: `dream-model-port-v1`. Adapter identity is explicitly `ChatGPTPlanAdapter / openai_protocol_simulator / synthetic_stub`; this is not a live ChatGPT connection or inference qualification.

## Implemented boundary

`offline-envelope-model-port.mjs` adds a simulator-only adapter behind the existing stage contract. It requires an explicitly supplied simulator and model. Closed constructor options refuse HTTP transports, credentials and endpoint overrides without evaluating getters. Default selection remains Fake. A candidate selection is module-issued, fixed for the run and cannot declare a fallback; original GPT/Codex selection policies remain available through the unchanged original port. This candidate is not accepted by the original live selector.

The adapter prepares the same immutable fictional stage request, uses the isolated [envelope decoder](OFFLINE-PLAN-ENVELOPE.md), and returns only normalized stage value and usage. Reasoning text, encrypted content and transient protocol audits are not stage data and do not enter the Store. No network client or credential loader is added to this adapter. A supplied JavaScript simulator is trusted test code, not an OS sandbox; automated tests use only this project's fabricated responses.

`offline-envelope-model-runtime.mjs` is a project-owned versioned wrapper with exactly one import changed from the existing runtime; a test compares the entire file to that transformation. This preserves the original source-pinned entry and consumes no old permission. The dream engine, Store, original parser, original model port, real transports and proposals remain unchanged. The duplicate wrapper is intentional while source-pinned historical records must remain readable; the equality test guards drift.

The reader gains a superset projection through one import change. Its versioned projection differs from the preceding projection only by adding the exact simulator protocol identity. Ownership hash, source version, scene chain and wake checks remain mandatory; unsupported independent reviews still refuse rather than disappear. Old supported readers retain their prior behavior and default directory.

## Verified behaviors

- Two scenes and one extractive wake persist separately, with simulated affect/residue and non-fact provenance. Usage rows describe fabricated responses; receipts record three local stage dispatches and zero external intents.
- Reopening and repeating a request or session add no simulator call. Changed request content conflicts. Recollection and imagined continuation append without replacing the original; detached reads cannot mutate it.
- First scene fixes adapter/model/protocol. A failed second dispatch keeps that checkpoint and stops. An ambiguous dispatch cannot resume or repair. An interrupted committed checkpoint resumes only explicitly with the exact same identity and does not regenerate scene one.
- Actual child-process exit after intent and after committed scene exercises recovery. Call/input/output budgets survive replay. Queued, in-flight and after-scene cancellation stop later stages; timeout and partial-stream late output cannot publish.
- Initial persistence failure prevents simulation; checkpoint-save failure leaves no committed scene/usage after reopen. Another Store owner and overlapping execution cannot duplicate a dispatch.
- Literal cue candidates retain dream/non-fact identity. Source withdrawal purges the source, original, descendants and cached cue bodies; reader, restart, replay, direct Store withdrawal and delayed stream paths cannot re-expose them. Withdrawn input cannot start again.

Run the aggregate rehearsal with `node scripts/check-offline-envelope-runtime.mjs`. Its temporary fictional Store is outside the checkout and is removed after the check. No user Store, real login, key or model is accessed. Detailed test and script evidence are under `docs/validation/offline-envelope-runtime-*`.

## Limits and next step

This slice verifies simulator integration and local lifecycle, not real subscription HTTP, remote cancellation, actual usage/billing, account entitlement, semantic retrieval or dream quality. Local byte guards are not provider token caps. Source-withdrawal guarantees cover managed Store files and returned views, not external exports/backups, terminal history, provider storage or physical media erasure.

All old consumed grants remain consumed; no real trial CLI or new real approval exists for this candidate. Next: review a versioned native transport/approval proposal against this exact decoder and lifecycle, preserve historical source pins and recheck the supported envelope subset before requesting any fresh login or subscription inference. Never continue the failed dream with this candidate or silently switch adapters. Asteria bridges and native Codex transport remain pending. No third-party/private implementation is copied; all new code and fixtures use the repository's MIT license.
