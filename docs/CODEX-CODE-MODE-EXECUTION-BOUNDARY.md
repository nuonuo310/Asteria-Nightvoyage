# Code-mode execution boundary: source review, not runtime admission

The [new user Windows identity receipt](validation/user-local-codex-code-mode-witness-windows.json) completes the bounded name/kind observation: public_exec_custom and shared_wait_function, no unreviewed identities, one local POST and owned cleanup. Its inner report remains blocked. This is a distinct new request; it does not reconstruct the preceding discarded names. It does not identify the wait handler, validate the native schema, test execution denial or establish subscription inference.

## Release-pinned call chain

Reviewed public OpenAI Codex release rust-v0.160.0, commit `a956835d020762cb2b570053af06f643a11c0ecc`. The following are source-level findings, not observations of the user's runtime provider selection:

| Source | Git blob | Finding |
| --- | --- | --- |
| [features/src/lib.rs](https://github.com/openai/codex/blob/a956835d020762cb2b570053af06f643a11c0ecc/codex-rs/features/src/lib.rs) | 4b05bdb5bee3345f7aa3e9e20c542adb3fc5aaae | code_mode_host is a separate stable feature, enabled by default. |
| [core/src/thread_manager.rs](https://github.com/openai/codex/blob/a956835d020762cb2b570053af06f643a11c0ecc/codex-rs/core/src/thread_manager.rs) | ba195d8e0cdb9381891b06713a595257f320c422 | The normal constructor selects the process-owned provider if host feature OR disable_in_process_fallback is true; otherwise the disabled provider. |
| [code-mode/src/remote_session.rs](https://github.com/openai/codex/blob/a956835d020762cb2b570053af06f643a11c0ecc/codex-rs/code-mode/src/remote_session.rs) | 36e4e1a74f57847f12608fc714b5d1228158c925 | Disabled provider rejects session creation with a fixed disabled-host error. Process-owned provider can start a host. |
| [core/src/tools/code_mode/mod.rs](https://github.com/openai/codex/blob/a956835d020762cb2b570053af06f643a11c0ecc/codex-rs/core/src/tools/code_mode/mod.rs) | 79a95b2ac26288ff141e5d670bf49bb8ae3f7eda | Both execute and wait first obtain a session through the service's session provider. |
| [core/src/tools/code_mode/execute_handler.rs](https://github.com/openai/codex/blob/a956835d020762cb2b570053af06f643a11c0ecc/codex-rs/core/src/tools/code_mode/execute_handler.rs) | 2215209053284c66a1feece99819e2f419cf29bb | The handler parses code, constructs enabled nested-tool metadata and calls the code-mode service before it can obtain a started cell. |
| [app-server/src/code_mode_host.rs](https://github.com/openai/codex/blob/a956835d020762cb2b570053af06f643a11c0ecc/codex-rs/app-server/src/code_mode_host.rs) | 97b250a59a8037aa808599011ee24eb27fb22d9f | No remote host argument selects the Local transport; a supplied URL selects gRPC. |
| [app-server/src/lib.rs](https://github.com/openai/codex/blob/a956835d020762cb2b570053af06f643a11c0ecc/codex-rs/app-server/src/lib.rs) | d1a622ca8cc94ab626e8e377333c9d875cd18451 | Local transport passes no injected code-mode provider; gRPC supplies one and requires the host feature. |
| [app-server/src/message_processor.rs](https://github.com/openai/codex/blob/a956835d020762cb2b570053af06f643a11c0ecc/codex-rs/app-server/src/message_processor.rs) | 9e9a90437b3fddde282a0d05216907d77fa5a745 | An injected provider replaces the ThreadManager selection; constructor configuration alone cannot describe arbitrary injected deployments. |

Model tool-mode selection and tool registration were reviewed separately in [the field contract](CODEX-MODEL-FIELD-CONTRACT.md). They must not be confused with host/session availability. The current isolation review checks features.code_mode.enabled=false, but it does not explicitly set/check code_mode_host or disable_in_process_fallback. Existing identity observations therefore cannot certify the host as disabled.

## Candidate constructor guard

For the reviewed normal constructor, without a provider override:

| features.code_mode_host | code_mode.disable_in_process_fallback | Selected provider |
| --- | --- | --- |
| false | false | Disabled |
| false | true | Process-owned host |
| true | false | Process-owned host |
| true | true | Process-owned host |

Thus setting disable_in_process_fallback=true is not a way to disable the execution host. A candidate guard must explicitly set BOTH values false at process startup, seal the launch against a remote host argument/provider injection, and verify effective configuration before any turn. It must preserve code_mode_only metadata rather than pretend that the model uses direct. This is a candidate based on public source, not a runtime-qualified production configuration.

The service also emits a fixed unavailable warning when code mode is selected without an available provider. An existing observer correctly stops on unreviewed warnings; do not broadly ignore them to make a guard trial pass. Any future continuation of this one expected warning needs a separate exact, bounded, thread/configuration-bound rule, with unknown messages still rejected.

## Next fixture contract, not an executable approval

The [machine-readable design](proposals/codex-code-mode-execution-guard-design-v1.json) is a review plan only. It has no CLI, init command, credential owner, approval store or real-inference authority. No execution call was supplied or native execution probe run in this slice.

A future local-only rehearsal should first prove exact effective guard configuration and Local host transport under independent fixtures. Only after reviewing the exact response/notification/error semantics may it supply fixed harmless calls: exec with arithmetic-only source, and wait with an independent nonexistent cell identifier. Use fresh owned state for each case, no account or real model, no caller code/path/arguments, one scripted call at most per case and a bounded continuation POST. If arithmetic executes, output is unclassified, identity differs or the guard cannot be checked, stop without admission. Do not read user files, deliberately spawn a host, enable a feature, or inject a real account catalogue to force a result.

Two further distinctions remain material:

- A denied selected call does not prove every handler is denied, broader process containment or schema compatibility. Source-based shared-session reasoning must remain distinct from measured native denial.
- A tool-output continuation can lead to another provider request inside one app-server turn. The earlier [user native selected-refusal receipt](validation/user-local-codex-selected-refusal-windows.json) already reports two local POSTs after one turn/start. Transport retry limits do not by themselves bound that agent loop. A real adapter must durably account for/stop additional external dispatch; one turn/start is not automatically one external generation call. A future local fixture's deliberate second local POST would be protocol evidence only, not approval for an uncounted real request.

The real Codex subscription transport remains unadmitted. No new login/inference confirmation is requested here. Existing Fake tests, direct GPT target, explicit API/legacy boundaries, consumed grants, unknown holds, immutable snapshots and Asteria-owned state/bridges remain unchanged. Evidence: [source review and receipt validation](validation/codex-code-mode-execution-boundary.json).
