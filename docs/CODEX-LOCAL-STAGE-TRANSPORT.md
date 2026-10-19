# Explicit local stage transport at DreamModelPort

This slice makes a named transport object available to the explicitly versioned CodexAdapter in scripts/codex-local-model-port.mjs, with its paired scripts/codex-local-model-runtime.mjs. The original source-pinned model port/runtime and all historical grants remain unchanged. It does not turn the fixed Windows final-answer observer into an inference transport. The concrete transport here starts only the existing independent Node child peer, never an installed Codex executable, account or provider endpoint.

## Contract and identity

`createCodexLocalStageTransport({model_id, timeoutMs?})` requires an explicit model identity. Its module-issued frozen object exposes model_id, protocolVersion, ready(), status(), exchange(draft,{signal}) and async close(). The adapter accepts it only through stageTransport, with the same model and no simulator callback. A forged or copied object cannot qualify; a native executable, endpoint, environment, credential, caller fixture, login or scenario override is unavailable. Model and configuration cannot change after construction.

The adapter returns provider_kind=openai_protocol_simulator, auth_mode=synthetic_stub and protocol_version=offline-codex-owned-stage-pipe-v1. Its external_generation flag is false. Both original and versioned default CodexAdapter still have no native transport and remains unavailable. Existing explicit simulator callbacks retain their old protocol identity and behavior. Reopening a book under a different execution identity is rejected rather than silently adopting its checkpoints.

Each exchange uses the existing bounded NDJSON pipe driver and fixed independent peer. The child closes before successful data returns. The adapter reuses its existing stage request preparation, final-output decoder and typed scene/wake validation. The dream engine still owns durable intents, checkpoints, call/byte budgets, deduplication, publication, cancellation and withdrawal. This is an explicit process transport implementation rather than a caller-wired simulator callback, but it remains synthetic.

Only one exchange may be active per transport. Overlap is rejected before another child is started. Close permanently disables readiness, aborts the owned pending exchange and waits for its settlement. Caller cancellation is forwarded; no remote cancellation is claimed. Status reports exchange counts and successful child closures, never input/output text, thread IDs, credentials or a real model usage estimate. Exchange counts do not claim that a native process or inference request occurred.

## Verified local behavior

The check traverses two scenes and wake, closes all three independent child peers before publication, reopens and replays without additional children, preserves the original and withdraws its source across reopen. Tests also cover closed/forged transports, pinned-model mismatch, callback combination, inert getters, caller overrides, overlap, active/pre-dispatch cancellation, call-budget checkpoint preservation and refusal to adopt an old simulator execution owner. Existing pipe/RPC tests cover child death, timeout, malformed replies, tools and late frames. Only independent fictional fixtures are used.

Run `node scripts/check-codex-local-stage-transport.mjs` or `node --test test/codex-local-stage-transport.test.js`. The command accepts no arguments and creates only a temporary fictional book. Evidence and final source hashes: [validation](validation/codex-local-stage-transport.json).

## Remaining native boundary

The user Windows fixed-answer and selected-refusal observations remain separate evidence for the installed native harness. They do not authorize native stageTransport registration. A distinct native owner must still integrate per-stage input/output and identity checks, real-provider configuration, bounded lifetime/containment, credential ownership and cancellation before any production adapter can use it. Real catalogue tool exposure cannot be inferred from the fixed fictional catalogue. Login and real subscription inference require fresh user confirmation; no old failed dream is continued or switched to another model.

ChatGPTPlanAdapter remains the formal target primary, CodexAdapter the explicit subscription backup, Fake the automatic-test default and API legacy explicit. No AsteriaModelGateway, Context Bridge, canonical state, user memory or other repository is implemented or modified by this slice. Native subscription generation and dream quality remain unverified.
