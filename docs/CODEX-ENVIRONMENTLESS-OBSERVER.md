# Local observer with empty turn environments

## Prior native result

The user Windows fictional-catalogue observation reached the owned loopback service exactly once. The catalogue path and bytes, ephemeral thread, owned-process closure and current temporary cleanup all checked. No notification rejection occurred in this run; this is not proof of the earlier warning's root cause. The request declared three known tool classes: file_edit, file_read and interaction, with tool_choice auto. No tool execution or generated response was supplied. This is an actual native request observation under synthetic catalogue data, not real GPT capability or subscription evidence. [Sanitized user receipt](validation/user-local-codex-fictional-catalog-windows.json).

## Separate implemented comparison

The original observers retain their entry behavior. `scripts/check-codex-environmentless.mjs` is a separate explicit mode with the same fictional catalogue bytes and fixed provider/model, adding:

- Explicit initialize experimentalApi capability opt-in for the experimental turn field; no account or execution authority is granted.
- `environments: []` to the sole local turn, requesting no environment access.
- Startup `tools.experimental_request_user_input.enabled=false` and `tools.update_plan.enabled=false`.
- Separate requested/configured/status metadata. An explicit contradictory reported switch blocks. Missing projection fields remain not_reported, never verified. Config/read's public ToolsV2 projects only web_search, so absence is expected in the reviewed native protocol.

The mode never filters tool declarations from the captured request. Known remaining tools stay visible; unknown/missing inventories and every warning still block. Even an empty array is only no_tools_declared, never handler denial, subscription eligibility or admission. There is no model response, exploit attempt, real filesystem operation or login. Background network instrumentation and descendant containment remain unqualified.

The fictional catalogue retains its shell, patch and image metadata and its exact hash. No real model metadata is modified. A catalogue-dependent empty inventory cannot qualify another real catalogue or authenticated provider.

Default command runs an independent Node peer: `node scripts/check-codex-environmentless.mjs`.

Explicit native command: `node scripts/check-codex-environmentless.mjs --native-executable ABSOLUTE_NATIVE_CODEX_PATH`.

Both are local error-only observations; no live/login/fee/model override is accepted. Do not automatically repeat native runs. Native Windows comparison is pending. [Validation and source hashes](validation/codex-environmentless-observer.json).

## Reviewed first-party source, rust-v0.160.0

- [Turn protocol](https://github.com/openai/codex/blob/rust-v0.160.0/codex-rs/app-server-protocol/src/protocol/v2/turn.rs), blob f938d179e697fa116666d6673ec249805f6f614e: experimental empty environments disables turn environment access; it does not promise a globally empty registry.
- [Tool planning](https://github.com/openai/codex/blob/rust-v0.160.0/codex-rs/core/src/tools/spec_plan.rs), blob bb1474feb52820424f14089c0b073df7b9d650a1: patch/image registration depends on environment availability; request_user_input and plan have distinct config conditions. Handler denial is not established by that review.
- [Configuration fields](https://github.com/openai/codex/blob/rust-v0.160.0/codex-rs/config/src/config_toml.rs), blob 9915de6b40cb46e207a363af4c7abd02e0c46d43: independently selectable utility switches.
- [Config/read projection](https://github.com/openai/codex/blob/rust-v0.160.0/codex-rs/app-server-protocol/src/protocol/v2/config.rs), blob 42b7df7c4543344662ffbdcfd590ee04c1d1f92d: ToolsV2 omits those utility switches. The first local native iteration correctly blocked on an overly strict echo expectation; final code records unknown projection explicitly. Final native 0.159.2 checks base config, records switches not_reported, then preparation_timeout before a thread/turn or fixture request. Owned cleanup passes. This does not establish Windows behavior.

- [Initialize protocol](https://github.com/openai/codex/blob/rust-v0.160.0/codex-rs/app-server-protocol/src/protocol/v1.rs), blob 7d05fb1bd4d62bc79954bdd929a7f9f69936ccf3: experimentalApi opt-in is explicit only in the new mode.

Public fields informed independent code. No upstream implementation or catalogue was copied. No real inference, other repository change or Asteria bridge implementation is part of this slice.
