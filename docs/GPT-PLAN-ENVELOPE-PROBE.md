# Separately approved HTTP metadata diagnostic

The preceding user-reported reconnect was rejected by the HTTP Content-Type check. The pinned transport checks status 200 before that check and has not opened its body reader there. This establishes neither the actual media type nor the response body or root cause. Its request permission is consumed; discarded data cannot be recovered.

This slice adds a dedicated HTTP metadata observer, not a DreamModelPort inference adapter. It does not loosen the production SSE acceptance rule, continue the old dream, or qualify a model for generation. No new real request has been approved or executed during implementation.

## Approval and scope

A new explicit approval permits at most **one additional** subscription request, beyond the consumed diagnostic. It acknowledges the old consumed intent, fictional egress, no extra credits and the absence of a server output token cap. The model remains `gpt-5.6-sol`; the request uses the existing first-scene builder and independent `examples/gpt-plan-trial.snapshot.json`. Repository fixture grants remain no-egress; only the approved in-memory snapshot enables egress.

The command stores a separate immutable 24-hour approval outside the checkout. Its fixed local directory is `Nightvoyage/gpt-subscription-envelope-diagnostic-v1` under the platform application-data base. It verifies and hashes the closed, body-free preceding reconnect receipt, including the preceding one consumed intent. It does not reset old accounts, refresh their grants, modify old trial records, introduce an API fallback or authorize money. Runtime absolute paths and account bindings must not be committed.

CLI commands are `preflight`, `init`, and `run --live`. Initialization requires all five flags:

```
--approve-additional-subscription-request
--allow-fictional-egress
--acknowledge-consumed-diagnostic
--confirm-no-extra-credits
--acknowledge-no-server-token-cap
```

These describe the contract, not a record of user consent. Do not initialize or run a real diagnostic until the new additional request is explicitly approved. Browser authorization remains a separate manual step; do not share authorization URLs or callbacks.

## Observation and persistence

- Public discovery is checked before fresh OAuth. A blocked public check leaves approval unchanged and does not start login. There is no retry loop.
- The existing checked OAuth flow supplies a transient capability. The observer posts only to the fixed public Responses endpoint, with the pinned request shape. No API key, tool, endpoint override or environment credential is accepted.
- The observer records normalized HTTP status/media class. For SSE it stops at headers without opening a body reader. For other types it retains at most 8 KiB transiently and records only fixed shape labels and whitelisted official error codes/parameter names. Arbitrary messages, detail text, headers, request identifiers, bodies and generated text are neither returned nor saved.
- `observed` means metadata collection completed, including for an HTTP error. It never means inference accepted, a dream published or quality approved. Usage and money remain `unknown`; a response shape is not billing evidence.
- Authorization start and the single request intent are durable before their corresponding actions. Interrupted authorization/dispatch is `uncertain`; replay cannot log in, resend or refund an unknown request. Terminal replay is local. Reinitialization cannot extend approval.
- Local timeout, cancellation, withdrawal, source changes, prior-record changes, overlapping ownership and persistence failures fail closed. Late output cannot become dream content. If headers were obtained before a failure, only fixed header metadata may remain. Remote cancellation is unknown.
- Remote session revocation is reported from the checked cleanup result. If unconfirmed, the receipt explicitly asks the user to disconnect the app in ChatGPT Settings if authorization completed. Credentials are not persisted. Local abort does not prove remote cancellation or quota restoration.

The diagnostic Store holds only its closed approval, identity, intent, body-free observation and cleanup metadata. Source withdrawal blocks subsequent read/replay/reinitialization. Guarantees cover managed local storage, not provider retention, terminal copies, external backups or physical erasure. Store ownership/recovery bookkeeping can write during opening; this is not a filesystem-zero-writes claim.

## Verification and current state

`test/plan-envelope-probe.test.js` contains 16 synthetic tests. Together with the five existing classifier tests, targeted checks pass 21/21. The full Linux Node.js test run passes 1005/1005. See [machine-readable evidence](validation/plan-envelope-probe.json). Synthetic authorization, HTTP, cancellation, process exit, withdrawal, persistence failure, replay and source-pin checks use independent fictional fixtures; they access no user Store, real credentials or external model. Loopback callbacks are used for synthetic OAuth.

The tests prove mechanisms only. Windows execution and the actual returned media/shape/code remain unverified for this new entry. Direct GPT inference eligibility and dream quality remain unestablished. Asteria bridges and native Codex transport are still pending. Existing production providers, legacy API accounting, source pins and consumed trials retain their previous boundaries.

Independent project implementation under MIT; no third-party implementation or private source text copied, no dependency added. Next step: ask for one separately approved real metadata request, then provide one complete Windows command block. Do not silently spend the old permission again.

## Official references

- [Models and inference](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference): supported public inference route and streaming completion contract.
- [Errors and recovery](https://developers.openai.com/siwc/token-sharing-open-source/errors-and-recovery): error envelopes and official code vocabulary. A detail string is not treated as a stable error code.
- [Preview limitations](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations): request constraints; this diagnostic does not invent a server token cap.
