# Codex RPC lifecycle rehearsal

## Implemented slice

`scripts/codex-rpc-rehearsal.mjs` adds a pure, separately named RPC conversation driver in front of the existing Codex notification decoder. It emits local proposals for initialize, initialized, thread/start and turn/start, accepts only the matching numbered replies, binds returned thread/turn IDs and releases a result only after the existing completed-turn decoder finishes. Its version is `offline-codex-rpc-rehearsal-v1`.

No process or transport is present. `drain()` returns detached request proposals to trusted test code; it does not send them. The proposal deliberately has no guessed tool-disable, sandbox or ephemeral-thread settings. It is not a production launch configuration. A thread/start model, when returned, must match; omission does not establish model entitlement. Effective provider identity, loaded config and instruction sources have not been qualified for native admission.

The draft comes from the existing non-dispatchable Codex preparation. Its instruction text and stage JSON are combined into a synthetic user input for RPC rehearsal only. This is not a reviewed native prompt/configuration. The original CodexAdapter, live GPT decoders/owners/approvals, API legacy accounting, Store and dream core are unchanged. The trusted simulator uses this driver to feed the existing CodexAdapter, preserving its simulator identity and zero external calls. No Asteria gateway or canonical state is added.

## Bounds and failures

- One initialization, one new thread and one turn per driver; no resume, repair, login, model list, automatic retry or provider switch.
- Incoming UTF-8 NDJSON is bounded to 65,536 bytes and 128 nonempty frames, including RPC replies and thread notification. The reused final-content ceiling is 1,200 bytes. These are local byte/frame limits, not provider token or monetary limits.
- Replies before their request proposals are drained, wrong/duplicate IDs, provider RPC errors, server tool/approval requests and unknown events reject with the fixed `codex_rpc_rejected` error. Arbitrary provider messages are never echoed in that error.
- A thread/started notification is admitted once after the thread reply and before the turn reply. Other reviewed notifications arriving before the turn reply are bounded, buffered and subsequently checked against its authoritative identity. Other orderings stay unsupported. This is intentionally a narrow subset, not complete app-server interoperability.
- The existing transcript decoder still rejects tools, approvals, nonfinal/reasoning messages, reroutes, failed/interrupted turns, conflicting final items and incomplete streams. Rejecting a tool notification after receipt does not prove a real harness could not execute it earlier.
- Local cancel clears proposals and buffered content; late frames and finish reject. No interrupt command is sent and remote cancellation remains unknown. Timeout, actual process death/cleanup, stderr, backpressure and OS environment isolation are not implemented by this pure driver.

The driver returns transient protocol IDs/chunks only to trusted simulator code. Existing engine persistence stores the validated dream stages and provenance, not those IDs. The helper peer uses independent fictional material only. No credentials, real user approval, private input or account state are used.

## Run the independent check

```sh
node --test test/codex-rpc-rehearsal.test.js test/subscription-model-port.test.js
node scripts/check-codex-rpc-rehearsal.mjs
```

The script creates temporary fictional books, completes two scenes and wake through three independent RPC rehearsals, reopens/replays with no additional simulation, verifies the original is unchanged, and withdraws a source across reopen. It never launches Codex, uses a real network endpoint or opens the user's Store. Passing proves the scripted mechanism, not subscription access or dream quality. Validation is recorded in [the slice receipt](validation/codex-rpc-rehearsal.json).

## Official references and next admission boundary

Reviewed on 2026-10-18:

- [Official app-server lifecycle](https://learn.chatgpt.com/docs/app-server): handshake, thread/turn RPCs, notifications and interrupt semantics.
- [Official subscription provider configuration](https://developers.openai.com/siwc/token-sharing-open-source/codex-app-server): app-owned OAuth and the Responses provider; a model catalog is not an inference entitlement test.
- [Preview limitations](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations): app-server can include local tools and maintains local thread history.
- [Configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference): shell execution is separately controlled; approval settings are not a global tool-disable proof.

Only public protocol identifiers and architectural ideas are used. All implementation and scripted fixtures are independently written MIT project code; no SDK, third-party parser or private Continuity text is copied.

Next: build a bounded process-pipe rehearsal against an independent local child peer, then inspect the actual installed Codex version/schema without login or inference. Before native model dispatch, verify isolated configuration/history/credential handling and effective tool exclusion for that exact binary. Read-only sandboxing or approvalPolicy never by itself is insufficient: read-only tools can still read, and some operations need no approval. No real Codex process, login, subscription request or API fallback is enabled by this slice. User confirmation remains required at the real login/inference boundary. A failed GPT run stays terminal and cannot be continued through Codex.
