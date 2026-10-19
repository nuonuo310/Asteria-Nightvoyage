# Codex local request tool observer

## What is implemented

A dedicated process owner observes a bounded request sent to a project-owned loopback error fixture. It is separate from the metadata-only owner, DreamModelPort, subscription adapters and every previous trial grant. Existing core/provider modules were not changed.

`node scripts/check-codex-request-observer.mjs` starts only a fixed independent Node peer. Native inspection requires `--native-executable` and an absolute installed codex/codex.exe path. Unknown flags, credentials, model/provider/URL overrides and wrapper execution are refused. The fixed model is gpt-5.6-sol; the provider is a no-auth local fixture, not OpenAI.

The owner creates fresh state/cwd/profile outside Git checkouts, constructs the child environment without supplied account/Node/proxy settings, and verifies initialization and effective fixture configuration. Only a matching ephemeral thread permits one queued turn/start with a fixed independent fictional probe text. No user snapshot, existing book, account authorization or credential supplier is accepted.

The local server accepts bounded empty catalog GETs and at most one reviewed POST to its exact response route. It rejects authentication headers, unsupported content encoding/media, unexpected routes and duplicate requests. A 256 KiB body ceiling, fatal UTF-8 decoder, three-second read deadline and the owner deadline bound inspection. Completed local requests receive a fixed HTTP 400 error envelope. The server never returns model output, a tool call, generated text, SSE or a redirect. There is no retry/fallback loop.

The tool reviewer returns fixed categories/counts only. Unknown names/types/namespaces or a missing tools field remain unreviewed and block the overall observation. Malformed shapes, duplicate function identities, more than 128 leaf tools, excessive namespaces/depth and model mismatch reject without raw details. A familiar name inside an unknown namespace does not inherit reviewed identity. Parameters, descriptions, prompts, paths, arbitrary names and errors are not returned or written. Request bytes exist transiently in bounded process memory; secure memory erasure is not claimed.

A request_observed result means a reviewed request was captured, not that its tools were absent. Inspect toolExposureStatus and counts. Known nonempty inventories can be observed successfully and remain unsuitable for dream inference. Even an explicit empty tools array leaves toolExclusionVerified, handlerDenialVerified, modelEntitlementVerified and dispatchEnabled false. It does not establish every handler is disabled, every future request is empty or the executable is contained.

## Protocol and lifecycle

Initialization/configuration/thread checks and bounded startup diagnostics follow the original project metadata-owner controls. The observer is original project code derived from that project owner, not copied third-party implementation. It separately permits reviewed turn-start metadata, matching thread status with no approval/input wait flags, and a user-message lifecycle item containing exactly its own fixed probe. Foreign thread/turn IDs, altered user text, tool items, unknown notifications, server approval requests, warnings and known startup errors stop it. No arbitrary notification body is accepted as a dream.

The owned process is terminated and awaited, server sockets closed, and its workspace removed with bounded filesystem retries. Cancellation and read failures suppress late observation data. Cleanup failure stays blocked with a closed errno label. No old workspace scavenging exists. Windows direct-child termination and POSIX group termination do not prove descendant containment; descendantTerminationConfirmed remains unknown. Background network activity by the native executable is not instrumented; fixture counters are not an OS-wide network audit.

## Verification and remaining dependency

Automatic tests invoke only independent fictional peers, local HTTP and injected filesystem failures. They cover empty/known/unknown/missing inventories, malformed or oversized/stalled bodies, schema/model/provider/thread mismatch, early/duplicate/wrong-route/authenticated requests, unsupported encoding, foreign lifecycle messages, cancellation/timeouts, raw-content suppression, credential-environment exclusion, CLI defaults, argument closure and cleanup failure. The earlier metadata-only owner is included in the targeted regression.

The actual maintainer Linux native observation remains blocked at thread preparation: initialization and configuration passed, but no thread response or local HTTP request was received before the deadline. No turn/start or login was queued. It does not validate native request format or tool inventory. The successful user Windows metadata result is a separate earlier observation and is not upgraded into request-observer evidence.

A next explicit Windows comparison can run this committed observer against the already identified 0.160.0 x64 executable. It needs no login, real subscription inference or API budget. If it blocks, retain the closed receipt and diagnose locally; do not raise limits, accept unknown tools or reuse old real-call grants. Tool exposure/handler containment must be resolved before proposing a separately approved subscription trial.

Detailed independent-test and native receipts are in docs/validation/codex-local-request-observer.json. Passing fake tests proves the observer mechanics, not native compatibility, dream quality or Asteria bridge readiness.

## Public references consulted

- [Official app-server lifecycle](https://learn.chatgpt.com/docs/app-server)
- [Official configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference)
- [Versioned tool planning](https://github.com/openai/codex/blob/rust-v0.160.0/codex-rs/core/src/tools/spec_plan.rs)
- [Versioned thread protocol](https://github.com/openai/codex/blob/rust-v0.160.0/codex-rs/app-server-protocol/src/protocol/v2/thread.rs)
- [Versioned turn protocol](https://github.com/openai/codex/blob/rust-v0.160.0/codex-rs/app-server-protocol/src/protocol/v2/turn.rs)
- [Versioned item protocol](https://github.com/openai/codex/blob/rust-v0.160.0/codex-rs/app-server-protocol/src/protocol/v2/item.rs)

References informed boundary and field checks; no upstream source or generated schema bundle was copied into this repository. Versioned source review is separate from installed-binary execution evidence.
