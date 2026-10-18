# Separately gated aggregate-envelope GPT trial

This entry integrates the [offline aggregate-budget candidate](OFFLINE-AGGREGATE-ENVELOPE.md) under a distinct native adapter and one-run permission owner. It does not replace or resume any earlier failed trial. Source integration and synthetic checks are separate from real inference qualification and dream-quality acceptance.

## Fixed scope and limits

| Item | Fixed value |
| --- | --- |
| Contract | `chatgpt-plan-aggregate-envelope-trial-v1` |
| Native adapter / provider / auth | `ChatGPTPlanAdapter / openai / chatgpt_plan` |
| Native protocol | `chatgpt-plan-aggregate-envelope-http-v1` |
| Decoder | `offline-aggregate-envelope-v1` |
| Aggregate event policy | `single-owner-1024-events-v1` |
| Model | `gpt-5.6-sol` |
| New scope | One fictional dream; two scenes and wake; at most three external intents |
| Request / complete incoming stream bytes | 65,536 / 65,536 per call |
| Final JSON content bytes | 1,200 per call |
| Non-comment events | 1,024 per call; 1,025 rejects |
| Local stage timeout | 60 seconds |
| Server output-token cap | Absent (`null`); no guarantee of remote usage |
| API fallback / extra-credit approval | Disabled / false |

The event budget is an explicit finite candidate policy, not a model-token estimate or a promise the next response will fit. Existing byte, final JSON/model/usage, lifecycle and complete-stream checks remain. Only the final validated assistant answer is returned; reasoning/encrypted content is discarded. Existing transient/final-text equality and sequence-continuity limitations are described in the offline candidate document; semantic validity is not inferred from structure.

The new native transport has its own WeakSet brand and requires three exact low-level opt-ins: missing-header compatibility, reasoning discard and aggregate-event policy. Old adapters reject that brand. It delegates the existing fixed public transport without endpoint/key/tool/retry overrides. A low-level component opt-in is not an end-user grant: the trial owner also binds source pins, model, account, snapshot, run, request, stage and durable intent around dispatch and reads. The decoder and native identity do not create a new memory system or an Asteria bridge.

## Fresh permission and preserved history

Before `init`, the user must explicitly approve this new trial scope. The seven exact approval flags represent:

- fictional subscription generation and fictional fixture egress;
- user assertion that extra-credit use is disabled or unavailable;
- acknowledgement that no server token cap is available;
- compatibility with a missing Content-Type only when the complete SSE stream validates;
- acknowledgement that prior diagnostic and failed-trial intents remain consumed;
- validation followed by reasoning discard;
- the new finite aggregate-event policy.

CLI flags are `--approve-fictional-subscription-trial`, `--confirm-extra-credits-disabled`, `--acknowledge-no-server-token-cap`, `--approve-missing-content-type-compatibility`, `--acknowledge-consumed-diagnostics`, `--approve-reasoning-discard`, and `--approve-aggregate-event-budget`. All are required together; unknown, duplicated, false or executable approval fields are rejected. This repository does not remotely verify a user's usage-settings assertion or infer zero billing from a model list.

Initialization additionally requires the exact prior validated-envelope failed receipt: one external intent, zero scenes/wake, `responses_envelope / event_limit`, `invalid_model_response`, and revocation confirmed. Its full existing ancestry must still validate. Six old state files are opened through their existing contracts and remain unchanged in a stable synthetic run. Prior stopped records and permissions never refresh. A changed or withdrawn predecessor blocks the new owner. Its body-free receipt hash binds the new grant without copying rejected content.

The relative, normalized static source closure includes the new entry/CLI, adapter, decoder, runtime, transport and the full predecessor closure plus eight historical proposal files. CRLF normalization is allowed; changed code, fixture or historical projection is rejected. The fixed public fixture remains fictional, pinned and no-egress in source; an approved in-memory snapshot grants only this trial's fixture egress. No private repository content or real memories are accepted.

The grant is immutable and expires 24 hours after initialization. Durable authorizing/executing state and external intent precede the corresponding action. Terminal replay is local, including after expiry, and never reopens login or regenerates. Failure, cancellation or process death cannot reset the grant. There is no resume/repair/new-allowance flag. A second-scene failure preserves its committed first scene and stops; it never changes adapter or model. Uncertain calls retain unknown usage; remote cancellation is never assumed successful. Revocation failure remains explicit with the existing account-cleanup notice.

## Local entry and storage

`scripts/aggregate-plan-trial-cli.mjs` supports only help, credential-free preflight, exact init and `run --live`. It uses a new app-data book named `gpt-subscription-aggregate-envelope-dream-v1`. Existing default dreambook selection is unchanged. Windows uses `%LOCALAPPDATA%\Nightvoyage`; other platforms use the existing application-data convention. Real runtime data stays outside the checkout. No arbitrary model, path, credential, endpoint or recovery flag is exposed.

The generic reader admits the exact new native and offline protocol identities through a validated superset projection. It continues to separate narrative, wake, simulated affect and attributed reviews. Parent deletion or source withdrawal suppresses replay, reading and cached recall. Managed bodies are purged across reopen; external backups/copies, terminal output, remote retained data and physical erasure remain outside the Store boundary.

Before any fresh real trial, the maintainer must obtain explicit new user permission and provide a complete platform-specific block. The user should open only the current local authorization link, never paste a callback/token or upload a runtime book. No real call is authorized by this document, by synthetic tests or by prior consent for a consumed entry.

## Verification and current truth

`node scripts/check-aggregate-plan-entry.mjs` fabricates the whole predecessor chain, approval, OAuth/catalog and HTTP responses. It exercises the actual entry and persistence path with three 159-event streams, two scenes/wake and usage, zero HTTP on replay, byte-for-byte preserved historical states, credential-free generic reading and withdrawal. Actual child CLI init/preflight/run/replay is tested against fixed temporary app-data directories. These are simulator assertions, not real login or account revocation claims.

Tests cover new opt-in and transport-brand refusal, 1,025-event stop, missing/invalid approval, immutable expiry/config/source pins, CRLF source copying, provider errors, missing versus wrong media type, malformed/oversized/incomplete response, cancellation/late bodies, no-egress, direct withdrawal, owner lock, deletion, storage/atomic commit failure and child death during authorization/queued/dispatch/checkpoint states. The previous real entry remains independently verifiable and consumed.

Linux Node.js v24.19.0 targeted checks: 97/97. Full regression: 1245/1245, no failed/cancelled/skipped tests. The Windows runtime has not been executed by the maintainer for this entry; CRLF fixtures and copied source checks are not Windows qualification. Detailed bounded evidence is in [the script receipt](validation/aggregate-plan-entry-script.json) and [validation record](validation/aggregate-plan-entry-validation.json).

At this delivery, no new real login/inference permission is recorded or exercised by the maintainer. No validated GPT subscription dream has been established by the available real receipts. The next action is fresh permission for this exact scope, followed by a user-run local trial; inference qualification requires a successful real response and dream quality remains a separate review. Codex's native entry and both formal Asteria bridges remain pending. Independent MIT project reuse only, with no copied private/third-party implementation, dependency or other repository write.
