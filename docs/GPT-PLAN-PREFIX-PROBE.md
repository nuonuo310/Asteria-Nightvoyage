# One-request bounded-prefix diagnostic

## Scope and current state

The user-reported preceding metadata diagnostic returned HTTP 200, missing-or-empty Content-Type and an over-limit body observation. Its one request permission is consumed. Its discarded response cannot be recovered. The standalone prefix helper is now used by a **new, separately approved diagnostic entry**, never by production dream inference.

This entry is implemented and synthetically verified. It has not performed real login, accessed a user Store or issued a real subscription request during development. A new explicit user approval and fresh manual browser authorization are required before any real execution. The previous approval is not reused.

## Closed contract

- Model: `gpt-5.6-sol`, ChatGPT subscription authorization, existing reviewed first-scene request builder and the same independent fictional fixture. The request is fixed to the public Responses endpoint, `store:false`, `stream:true`, no tools or endpoint override. Fixture files remain no-egress; only a separately approved in-memory snapshot enables egress.
- Budget: one additional external request intent, request JSON at most 65536 UTF-8 bytes, non-SSE inspection at most 8192 bytes, local 60-second timeout. No API key, RMB allowance, automatic retry or provider fallback. There is no server output-token cap; local abort does not establish remote cancellation or restore quota. Usage and money remain unknown.
- Approval: all five exact flags below, immutable source closure, fixture hash and body-free predecessor receipt hash. The new approval expires 24 hours after initialization and cannot be refreshed by reinitialization.
- Antecedent: the existing envelope diagnostic must report exactly one consumed additional intent, one earlier diagnostic intent, HTTP 200, missing media class, byte-limit/over-limit observation, no model error category, and confirmed session revocation. Existing checks recursively verify the prior records and source withdrawal. Changing or withdrawing an ancestor blocks this entry.
- Storage: a separate `Nightvoyage/gpt-subscription-prefix-diagnostic-v1` directory under platform application data, outside the checkout. Only closed approval, source identity, intent, diagnostic labels, account binding hash and cleanup metadata persist. Preceding diagnostic state and the original dream remain unchanged.

Initialization flags:

```
--approve-additional-subscription-request
--allow-fictional-egress
--acknowledge-consumed-diagnostic
--confirm-no-extra-credits
--acknowledge-no-server-token-cap
```

The CLI is `scripts/plan-prefix-probe-cli.mjs`, with `preflight`, `init` and `run --live` only. It accepts no custom storage selector, API mode, model, endpoint, retry, resume or broad approval. Missing/invalid approval cannot create the new Store or read credentials. These documented flags are not evidence of real user permission.

## Bounded reading and interpretation

The new observer keeps the same request preparation and header classification. Expected SSE records only headers and does not open its body reader. For other media types, including a missing header:

1. Retain only the first 8192 bytes across chunks. If an upstream chunk is larger, copy only its remaining allowed prefix. The network stack can allocate/read ahead more than this application inspection budget; this is not a hard bound on total network traffic or underlying chunk size.
2. On reaching exactly 8192 retained bytes, stop without another read or EOF probe. Report `prefix_limit`, original header metadata and a fixed prefix label. Do not claim that the full body is larger than the ceiling; its completeness is unknown. Do not parse a truncated JSON error or publish provider text.
3. If EOF arrives earlier, classify the bounded complete body using the existing fixed shape/error-code vocabulary, and separately retain the prefix label. Even a complete SSE-looking text body under a missing header is not accepted as inference.
4. Abort locally and cancel/release the reader on exit. Reader cancellation cannot stall completion indefinitely. On timeout, cancellation, withdrawal or transport failure, do not publish partial text or prefix data; at most fixed header metadata is retained.

Prefix labels are `sse_like_prefix`, `html_like_prefix`, `json_like_prefix`, `empty_prefix`, `unrecognized_prefix`, or fixed invalid-input/UTF-8 labels. They say only what a bounded beginning resembles. Every prefix record has `completeBodyValidated:false`, `inferenceAccepted:false`, `dispatchEnabled:false`, `bodyReturned:false`, unknown usage and no quality claim. The byte ceiling can split a UTF-8 character; bounded streaming decoding handles that without treating the unseen remainder as validated.

`observed` means collection of diagnostic metadata. It never means inference eligibility, a completed model response, a published dream or quality acceptance. No arbitrary body, header value, detail string, request identifier, callback or credential is returned or saved. The production strict SSE parser and DreamModelPort contract are unchanged.

## Lifecycle and safety evidence

Public discovery is checked before fresh OAuth. A public-network failure leaves approval unchanged and does not start login. Authorization start is durable before login; request intent is durable before HTTP. Interrupted authorization/dispatch reopens as `uncertain` and cannot create another session/request. A durably observed record survives process death without resending, while cleanup remains unknown if it did not finish. Terminal replay is local, including after approval expiry.

Source withdrawal is checked in the new Store and across the predecessor chain on each authorization hook, between reads and before publishing labels. Withdrawal blocks read/replay/reinitialization and late data. Store ownership, source pins, history mutation, invalid metadata and persistence failures fail closed. Save failures cannot leave a successful returned observation without durable state. Cleanup confirmation is reported from the checked OAuth flow; an unconfirmed result explicitly directs the user to disconnect the app in ChatGPT Settings if authorization completed.

Managed storage suppression does not cover external backups, provider retention, terminal copies or physical erasure. Store opening can write lock/recovery bookkeeping. No filesystem-zero-writes claim is made.

The 22 new synthetic entry tests plus four existing prefix tests pass 26/26. Full Linux Node.js regression passes 1031/1031. Tests include missing-type SSE/HTML/JSON prefixes in large single chunks, multi-chunk exact ceiling without another read, small complete bodies, metadata forgery/getters, stalled HTTP/reader cancellation, queued/in-flight cancellation, withdrawal in both new and ancestor Stores, changed history, owner conflicts, immutable CRLF source pins, authorization/dispatch/observation persistence failures, real child-process death at authorization/dispatch/observation, and replay without a second request. Synthetic approval fixtures do not represent real user consent. See [validation](validation/plan-prefix-probe.json).

Current limits: Windows remains unverified for this entry; no actual prefix is known. No real call or extra subscription permission has been inferred from the user's request to continue engineering. Native Codex transport and Asteria bridges remain pending. Existing API providers and accounting are unchanged. Independent project code under MIT; no third-party implementation copied or dependencies added.

Next: separately ask whether to spend one additional subscription request for this diagnostic. Only after approval provide a complete Windows test/init/preflight/login command block. Do not rerun consumed entries or accept sniffed data as a dream.

## Official references

- [Models and inference](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference)
- [Errors and recovery](https://developers.openai.com/siwc/token-sharing-open-source/errors-and-recovery)
- [Preview limitations](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations)

These inform the existing request and acceptance boundaries; the observer remains project-specific diagnostic code, not a claim that OpenAI endorses media-type sniffing for inference.
