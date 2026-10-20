# Guard input correction: runtime fields are not startup settings

The [user's Windows native receipt](validation/user-local-codex-guarded-exec-startup-windows.json) reports Codex 0.160.0 blocked during startup with `unrecognized_configuration`, before initialize/config/thread/turn, zero local model POSTs and no scripted call. Owned process closure and temporary cleanup succeeded. It is user-reported evidence, not a maintainer native reproduction. The exact rejected setting name was discarded by the bounded diagnostic, so that receipt alone cannot establish a unique root cause or any tool-handler result.

A subsequent pinned-source audit found a definite implementation error in the v1 candidate: `code_mode.disable_in_process_fallback=false` is an **internal runtime-shaped path**, not a supported root startup setting. The maintainer introduced that error. The old independent peer accepted arbitrary dotted keys and echoed them; its passing tests therefore failed to check the translation into the native configuration input contract. Those earlier tests remain historical evidence of the scripted behavior, not native configuration compatibility.

## Corrected v2 contract

| Layer | Correct representation |
| --- | --- |
| Startup input | `features.code_mode_host.enabled=false` |
| Startup input | `features.code_mode_host.disable_in_process_fallback=false` |
| config/read input representation required by this candidate | `features.code_mode_host` table with both explicit false fields |
| Resolved internal Config | `config.code_mode.disable_in_process_fallback` derived from that feature table |

Both false values remain required. No setting is enabled to force a pass. Source-valid boolean shorthand, omitted fields or implicit defaults do not satisfy this probe's explicit two-field guard. The reviewer rejects the old root `code_mode` table, unknown host-table keys and incorrectly typed values. New report versions are `offline-code-mode-guard-review-v2-input-schema` and `codex-local-guarded-exec-denial-v2-input-schema`. The command name is unchanged; the old Windows v1 receipt is not reinterpreted or resumed.

The rest of the native owner retains the same limits: one owned child, fictional file catalogue, owned loopback provider, no login or credential environment, exact thread-bound unavailable warning, fixed `1+1` call only after the checks, at most two accepted local POSTs, strict matching custom-call output, terminal unknown notifications/errors and owned cleanup. The startup diagnostic is not relaxed. Selected denial, full schema/handler qualification, wait behavior, real subscription inference and real per-POST accounting remain pending.

## Public release evidence

All source below is from OpenAI Codex commit `a956835d020762cb2b570053af06f643a11c0ecc` (rust-v0.160.0):

| File | Git blob | Finding |
| --- | --- | --- |
| [core/config.schema.json](https://github.com/openai/codex/blob/a956835d020762cb2b570053af06f643a11c0ecc/codex-rs/core/config.schema.json) | ac6171c01cf88d729b59609439338d6477f7ce49 | Root additionalProperties is false and has no code_mode property. Feature code_mode_host accepts a boolean or CodeModeHostConfigToml table. |
| [features/src/feature_configs.rs](https://github.com/openai/codex/blob/a956835d020762cb2b570053af06f643a11c0ecc/codex-rs/features/src/feature_configs.rs) | b48bc7631493a31dbbb4e40c0c831f8e05370a1f | CodeModeHostConfigToml has optional boolean enabled/disable_in_process_fallback fields and denies unknown fields. |
| [core/src/config/mod.rs](https://github.com/openai/codex/blob/a956835d020762cb2b570053af06f643a11c0ecc/codex-rs/core/src/config/mod.rs) | 60c6f65353453265ad413ce6f4d093b17cbdc625 | resolve_code_mode_config reads features.code_mode_host Config and copies its fallback field into the internal CodeModeConfig; omitted fallback defaults false. |

The original [constructor truth table](CODEX-CODE-MODE-EXECUTION-BOUNDARY.md) still describes the source-level provider selection. The v1 design proposal is retained as historical design; its old CLI path is superseded here and must not be used.

## Independent regression and limits

The peer now validates a **release-derived projection** before replying to initialize. The retained projection contains the official root/feature key sets and host-field schema, with upstream source identity. Its checker validates root keys, feature keys, host-table keys/booleans and code-mode feature key placement. It is neither a full JSON-schema validator nor a Rust TOML parser, and it does not validate every other setting. Missing fields may be schema-valid while still failing the stricter candidate guard.

New regression fixtures prove that the literal prior startup shape is rejected, corrected dotted overrides produce the feature-table input, implicit shorthand cannot pass the explicit guard, and legacy-invalid input exits the independent peer before initialize, with zero turn/model POST/scripted-call activity. Other prior owner and journal tests remain required. Automatic tests use only fictional data; the pasted user receipt is documentation, not a runtime test fixture.

No matching native executable is selected in the maintainer environment. After verified publication, the next minimum user step is one Windows local v2 observation through the existing explicit native executable entry, without login, installing/upgrading, real model requests or automatic retry. A new result is needed to establish whether this corrected candidate reaches the later native boundaries. No new paid/subscription allowance is requested.

## Windows invocation helper

`scripts/Invoke-CodexGuardedExec.ps1` retains the previously used installed-wrapper resolver: exact wrapper/platform package versions, known x64 vendor path and exact native --version check. It runs the relevant independent tests first and then only the one local guarded-exec probe. It cannot install, upgrade, log in, accept caller code or retry. It resolves the project directory relative to its own location; no user absolute path is committed. The --version preparation is separate from the one child owned by the probe.

The helper was statically reviewed here; PowerShell/native Windows execution is not claimed by the Linux Node test results. Invoke it after pulling main, using a separate `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\Invoke-CodexGuardedExec.ps1` process; that flag applies to the helper process only and does not change persistent execution-policy settings. Return the final JSON and stop, regardless of probe success.

The later [user v2 observation](validation/user-local-codex-guarded-exec-warning-windows.json) passed configuration and ephemeral-thread checks, then rejected a warning before any local model POST. Input flags stay corrected; the separately sourced [v3 warning-envelope correction](CODEX-GUARD-WARNING-ENVELOPE.md) does not retroactively accept that result.
