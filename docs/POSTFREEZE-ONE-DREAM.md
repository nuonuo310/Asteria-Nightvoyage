# One post-freeze fictional subscription dream

## Current status

`NV-POSTFREEZE-DREAM-01 v1` prepared one fictional ChatGPT subscription dream from exact `main@476b4378e78a0eab5371e2d6801bbd0f99c537dc`. Its offline preparation preceded a separately approved Windows live run. The run has now ended **failed**, with one external stage call and no saved scene or wake. The one-run authorization is consumed; this package does not reopen Phase One or permit another run.

## Terminal live observation and closure

The user-reported Windows receipt for proposal `da35a84fba7701a1b0f6ce41b222471c1c794f0b56f75be55a9a7ab530d68fd9` records `status: failed`, `external_calls_started: 1`, `checkpoint.saved_scenes: 0`, `wake_saved: false`, and `invalid_model_response` with `responses_protocol / plan_stream_limit`. The authorization wrapper reported remote revocation confirmed. Usage, money and remote cancellation remain unknown. This is a reported terminal receipt, not an independent replay or a recovered provider response. No run ID, local path, generated body, token or callback is reproduced here.

The adapter maps both envelope `event_limit` and `stream_byte_limit` to `plan_stream_limit`, so the stored diagnostic alone does not identify the underlying check. The transport has its own 65,536-byte limit and would normally report `http_stream_limit` before handing an oversized chunk to the envelope decoder. That makes an event limit a plausible explanation, not proof of the unseen stream. A prior independent fictional case showed 129 frames can exceed the current 128-event ceiling while remaining under the byte ceiling. None of this establishes that the discarded response would have passed the complete event lifecycle or final dream-stage validation.

Closure decision: retain the failed local checkpoint and this draft as review evidence. Do not merge this candidate as a demonstrated live success, reset the allowance, rerun `init` or `run`, continue another model, or recover rejected body. Any later trial needs a separately scoped offline review of the aggregate envelope and inner strict counter, then a new proposal and fresh authorization. The experimental local Phase One baseline remains frozen.

## Reviewable protocol correction

The strict historical `ChatgptPlanStream` still requires the completed response output to contain exactly one assistant message. The official Responses streaming reference documents a distinct reasoning output item and reasoning lifecycle events, so a successful subscription response may contain a reasoning item before its assistant message. The historical `unknown_event` and `output_shape` receipts did not prove this was the actual prior cause, but they left this documented compatibility gap unresolved.

The new entry reuses the existing reviewed `ValidatedEnvelopeStream` decoder instead of adding another protocol. It validates a closed reasoning subset and discards reasoning text, summaries and encrypted content. Exactly one completed assistant text message must remain. Refusal, tool or unknown output, invalid lifecycle, a mismatched model, inconsistent usage, incomplete output, invalid UTF-8 and byte/event overflow still fail closed. Final dream-stage validation remains separate and mandatory.

Coordinator correction: a previous bounded Windows observation reported HTTP 200 with a missing Content-Type and an SSE-like prefix. The first post-freeze candidate required a present header, so that known case would have consumed its one call before decoding. This entry now reuses the existing explicit missing-type transport and policy: a missing header only permits bounded reading; a complete validated envelope and valid dream stage are still required. A present non-SSE header remains rejected. This compatibility policy is local engineering judgment, not an official guarantee or proof of the old response's full content.

Official references are the [Sign in with ChatGPT models and inference](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference) and [Responses streaming events](https://developers.openai.com/api/reference/resources/responses/streaming-events) pages already recorded in [the output-shape review](PLAN-OUTPUT-SHAPE-REVIEW.md). Those contracts do not prove this account's entitlement, the cause of the historical failure or successful inference.

## Fixed trial

| Item | Fixed value |
| --- | --- |
| Contract | `nv-postfreeze-dream-01-v1` |
| Adapter / provider / auth | `ChatGPTPlanAdapter / openai / chatgpt_plan` |
| Model | `gpt-5.6-sol` |
| Transport / decoder | `chatgpt-plan-inline-missing-type-v1 / validated-reasoning-envelope-v1` |
| Scope | One run; at most three stage calls; two scenes and one wake |
| HTTP media type | `text/event-stream`, or missing/empty only under the explicit complete-stream policy; present non-SSE rejected |
| Request / stream bytes | 65,536 / 65,536 per call |
| Final JSON bytes | 1,200 per call |
| Local stage timeout | 60 seconds |
| API fallback / retry / model switch | Disabled |
| Extra credits / prior grant | Not approved / not reused |
| Server output-token cap | Absent (`null`) |

The fictional fixture remains `modelEgress: false` in source. Only an approved in-memory copy grants egress for this exact trial. The static proposal binds the normalized fixture hash, authority commits, fixed identities, limits and the full relative source closure in [the proposal](proposals/nv-postfreeze-dream-01-v1.json).

## Fresh approval and storage

Initialization requires three explicit user assertions: approval of this fictional subscription trial, confirmation that extra-credit use is disabled or unavailable, and acknowledgement that no server token cap is available. These assertions are not remotely verified and do not establish browser-session entitlement.

The grant is immutable, lasts 24 hours from initialization and permits only one run. Durable authorizing and executing states, plus the external-call intent, precede their actions. A terminal replay is local and never reopens OAuth or regenerates, including after expiry. A first-stage failure stops with zero saved scenes; a second-stage failure retains only the committed first scene. There is no resume, retry, repair, fallback or new-allowance flag. Usage and money remain `unknown`; remote cancellation is never inferred from local abort.

Runtime storage is outside the checkout under `Nightvoyage/gpt-subscription-postfreeze-dream-v1`. The local authorization link uses a loopback callback and is never committed or printed by the offline check. Dream, wake, simulated residue and associations retain separate types and fictional, non-fact provenance. Source withdrawal suppresses later replay and readback.

## Offline verification

`node scripts/check-postfreeze-plan-trial.mjs` creates temporary synthetic OAuth and HTTP responses, performs no real network request, uses no credential environment or user Store, validates two scenes and the wake, reads the typed result, verifies reasoning privacy and replay deduplication, then withdraws the source and verifies suppression. It removes its temporary files.

The automated tests cover fixed identity and source pins, credential-free preflight, immutable approval, old-decoder rejection versus reviewed-envelope acceptance, forged adapter refusal, first-stage and second-stage checkpoints, missing-header complete-stream acceptance, present non-SSE rejection, expiry, withdrawal, typed residue and Dreambook provenance. The validation receipt returned with this branch records the exact commit, environment and test counts for the run.

These offline checks established no live inference entitlement or dream quality. The later failed live attempt is recorded above; it did not save a typed dream. No Asteria integration is claimed. This exact trial is terminal and its authorization cannot be reused.
