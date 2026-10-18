# Output-shape rejection: evidence and next boundary

## User-reported execution

The separately authorized missing-type trial stopped on its first external request intent. No scene or wake was committed. The recorded fixed diagnostic is `responses_protocol / plan_output_shape`; usage and money remain unknown. Authorization revocation was reported confirmed. These are user-supplied Windows receipts, not a maintainer-side live run. No runtime identifier, link, response body or user configuration is published here.

This is a different rejection layer from the preceding HTTP Content-Type failure. It does not establish full-stream completion, model inference qualification, or that this particular response lacked a header. The receipt's header policy identifies the allowed policy, not an observed header value. The grant is consumed; do not rerun, refresh, continue the dream, or switch providers.

## What the current code proves

`chatgpt-plan-protocol.mjs` uses the same fixed error at five distinct branches:

| Branch | Example synthetic cause |
| --- | --- |
| Completed output cardinality | Missing/empty output, or reasoning plus a message |
| Completed message/content | Wrong role/status, multiple text parts, refusal |
| Stream output item | Reasoning or a tool item |
| Stream content part | A non-output-text part |
| Stream event allowlist | Reasoning summary or another unknown event |

Thirteen independently authored counterexamples reproduce that one diagnostic. A separate strict control still succeeds. All rejected decoders stay closed and release no partial body. This demonstrates ambiguity; it does not identify which branch the discarded historical response reached. No historical body recovery is possible from the existing metadata.

## Official references and implementation judgment

Reviewed on 2026-10-18:

- [Responses streaming events](https://developers.openai.com/api/reference/resources/responses/streaming-events) documents reasoning output items, reasoning text/summary events and assistant text events as distinct envelope structures.
- [Sign in with ChatGPT: models and inference](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference) describes the Responses subscription route and completion semantics.

The project's current strict parser intentionally rejects reasoning envelopes as well as tools. Thus a documented reasoning envelope is one plausible compatibility gap, but it is **not a confirmed cause** of this run. These references establish neither the actual response nor this account's successful inference entitlement. Fixtures are project-owned synthetic examples, not copied provider responses or third-party implementation.

## Next autonomous work

Before any further login or real request, develop and test an isolated offline envelope candidate that can distinguish bounded reasoning metadata from prohibited tool/refusal output. It must discard reasoning content, require exactly one completed assistant text result, validate completion/model/usage and dream-stage structure, and fail closed on malformed, unknown, ambiguous, truncated or late output. Event and byte limits remain in force. No reasoning text, encrypted payload or provider thread becomes memory.

Do not loosen the live parser or add another one-call observer just to guess at this receipt. Any later live candidate must have its own versioned identity and explicit approval; existing source pins, consumed grants and checkpoints remain readable and unchanged. Native Codex transport and Asteria bridges remain pending. The current slice adds only offline counterexamples and evidence, with no live dispatch option or new permission.
