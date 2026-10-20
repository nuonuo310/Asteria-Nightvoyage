# Codex 0.160.0 model-field contract review

This slice reviews public upstream source and adds an offline classifier. It does not log in, inspect account data, start Codex, refresh an approval, change a live parser or generate a dream. The prior selected-model receipt remains unchanged and insufficient to recover its discarded values.

## Pinned source

Reviewed 2026-10-20 at OpenAI Codex release `rust-v0.160.0`, resolved commit `a956835d020762cb2b570053af06f643a11c0ecc`. The protocol file fetched by tag and commit has the same Git blob. These sources describe that release, not every future binary or the user's actual catalogue payload.

- [Protocol metadata](https://github.com/openai/codex/blob/a956835d020762cb2b570053af06f643a11c0ecc/codex-rs/protocol/src/openai_models.rs): ConfigShellToolType, ToolMode, ModelInfo and deserialize_optional_model_selector. Blob `e5f02ac9e86d31bc6f27e3624fd64b4a8fa3e881`.
- [Tool-mode selection](https://github.com/openai/codex/blob/a956835d020762cb2b570053af06f643a11c0ecc/codex-rs/core/src/tools/mod.rs): requested_tool_mode and effective_tool_mode. Blob `41ed0189b8bfd80d938a16073b2af5c40b18d2f9`.
- [Tool specification planning](https://github.com/openai/codex/blob/a956835d020762cb2b570053af06f643a11c0ecc/codex-rs/core/src/tools/spec_plan.rs): the shell registration branch also checks environment and feature configuration. Blob `bb1474feb52820424f14089c0b073df7b9d650a1`.

The [official plan/app-server guide](https://developers.openai.com/siwc/token-sharing-open-source/codex-app-server) documents the authenticated integration route and distinguishes a catalogue from a successfully completed inference turn. It does not define these internal enum values; the release source above supplies that narrower evidence.

## Field meanings and limits

| Raw field | Reviewed release vocabulary | Deserialization and use |
| --- | --- | --- |
| shell_type | unified_exec, disabled; aliases default/local/shell_command deserialize as unified_exec | Required ModelInfo enum field, without a field default. Unknown strings, null and other types are not accepted by this enum. Disabled skips this shell-registration branch; it does not prove that every other tool or handler is absent. |
| tool_mode | direct, code_mode, code_mode_only | Optional field. Omitted/null produces None; an unknown string also becomes None under the custom selector deserializer. A non-string non-null value does not satisfy Option<String>. A known model value takes precedence over CodeModeOnly/CodeMode feature fallback in requested_tool_mode. |

The effective-tool-mode function has another fallback: requested code_mode can become direct if code mode is unavailable and in-process fallback is not disabled. code_mode_only is not covered by that branch. This is source review, not a native execution result. Tool exposure also depends on environments, feature/configuration state, handlers and other specification branches; the two enum fields cannot alone establish zero tools or containment.

The existing pinned plan-catalog-shape-v1 recognizes only unified_exec for shell_type and direct for tool_mode. Thus some release-supported values or aliases yield unreviewed under that projection. This is a demonstrated ambiguity, not evidence that the user received any particular alternative. Unreviewed also covers malformed/non-string data. No original raw value/type can be reconstructed from the stored labels.

## Separate offline classifier

`scripts/codex-model-field-review.mjs` classifies own-data shell_type/tool_mode values using the reviewed vocabulary, canonicalizes only the three documented shell aliases, and distinguishes missing, null, invalid_type and unreviewed. Unknown raw values are not returned. Selected-field getters are rejected without invocation; exotic roots are rejected. This utility expects ordinary parsed data, not hostile executable JavaScript/Proxy objects.

It is not a Rust deserializer or native compatibility check. In particular its missing/null labels preserve shape rather than silently adopting native defaults, and it does not resolve effective feature fallback. All dispatch, production, entitlement and compatibility flags remain false. No live adapter, OAuth owner, CLI approval, proposal source pin, historical receipt or account store imports this classifier.

Independent fictional tests cover all 15 shell/mode combinations, unknown strings/types, absence/null, accessors, immutable input and a counterexample where v1 returns unreviewed for a known release value. A regression verifies that the archived receipt bytes stay unchanged and that its camelCase projection cannot supply absent raw fields.

## Next dependency

The source vocabulary is now reviewed; the user's original two values remain unknown. Next prepare a distinct, bounded shape-only projection proposal that can preserve reviewed enum/type labels, still with zero inference and no token-to-child transfer. It must have its own source identity and fresh approval before another authenticated observation. Do not retrofit the consumed v1 allowance, inject guessed metadata into Codex, disable errors merely to pass, or claim real subscription generation from catalogue membership. Actual credential ownership, native configuration admission and inference remain separate unfinished gates.
