# Code-mode tool identity witness, with exposure still blocked

## Received native observation

The [sanitized user Windows receipt](validation/user-local-codex-tool-mode-comparison-windows.json) reports two completed local POST observations: direct_empty declares zero tools, while code_only_empty declares two tools, one unknown, with the legacy agents class. The matrix is blocked at request_tools_unreviewed and is not a successful two-case admission. Both owned processes and temporary workspaces close; no real inference, credential use, authorization or generated response is reported. The pasted JSON contains Node/platform, but not a native binary version or commit; the requested source version is recorded separately rather than invented as measured.

The code-mode condition therefore does not inherit the prior direct-mode zero-tool result. Do not repeat that same matrix to recover names: it deliberately discarded raw tool identities/schemas, and its summaries are not invertible.

## Release-pinned source review

Reviewed public OpenAI Codex commit `a956835d020762cb2b570053af06f643a11c0ecc` (rust-v0.160.0):

| Source | Git blob | Relevant fact |
| --- | --- | --- |
| [code-mode-protocol/src/lib.rs](https://github.com/openai/codex/blob/a956835d020762cb2b570053af06f643a11c0ecc/codex-rs/code-mode-protocol/src/lib.rs) | aab810d95493f745430148c180a71947c561001d | Public code-mode tool names are exec and wait. |
| [core/src/tools/code_mode/execute_spec.rs](https://github.com/openai/codex/blob/a956835d020762cb2b570053af06f643a11c0ecc/codex-rs/core/src/tools/code_mode/execute_spec.rs) | 8068614d78c1d54d7170ecd34c871be4e197bade | exec is built as a freeform tool with grammar metadata. |
| [core/src/tools/code_mode/wait_spec.rs](https://github.com/openai/codex/blob/a956835d020762cb2b570053af06f643a11c0ecc/codex-rs/core/src/tools/code_mode/wait_spec.rs) | 01b713e515c1aed3a43d4aac5e0afae84db07958 | Code-mode wait is a function tool for a running cell. |
| [core/src/tools/spec_plan.rs](https://github.com/openai/codex/blob/a956835d020762cb2b570053af06f643a11c0ecc/codex-rs/core/src/tools/spec_plan.rs) | bb1474feb52820424f14089c0b073df7b9d650a1 | The code-mode registration path prepends execute and wait handlers. |

Nightvoyage's unchanged legacy classifier maps function/custom wait to agents solely by its name, and does not recognize exec. That label cannot establish which handler is present. The independently authored script `node scripts/check-code-mode-name-ambiguity.mjs` shows that an exec/wait fixture and an unrelated-custom-tool/wait fixture produce exactly the same legacy summary. These are counterexamples, not recovered native requests or Rust-schema executions. The historical tools remain unidentified.

## New bounded observer

The new entry fixes the fictional condition to code_only_empty and accepts only an explicit native executable plus closed timeout/cancellation settings. It is a static derivative of the prior local observer; old owners, classifiers, account entries, manifests and receipts remain unchanged. A fresh outside-checkout profile/state/cwd uses the byte-checked independent catalogue, empty turn environments and the same controls. At most one child and one local Responses POST are permitted. The server supplies only a fixed error envelope; no generated answer, tool call or tool execution is supplied. No account catalogue, credential, OAuth owner or real provider is involved.

The additional closed classifier maps only:

- custom exec to public_exec_custom;
- function wait to shared_wait_function, always with waitHandlerRole=not_established_by_name.

Only the empty/functions namespace qualifies for these codes. Wrong kinds and unfamiliar namespaces remain unreviewed; arbitrary names, descriptions, definitions, parameters and arguments are never returned. This is public-name/kind matching, not native schema validation, handler identity, execution approval or denial proof. It cannot relabel the old observation.

The original request summary remains attached unchanged. Any nonempty tool inventory leaves the report blocked with tool_exposure_requires_review, including a fully recognized public-name pair. Unknown identity remains explicitly unreviewed. The CLI can report identity_witness_observed when the bounded observation and owned cleanup completed; that means diagnostic completion only. It does not make the blocked exposure acceptable. Warnings, unexpected notifications/server requests, configuration/catalogue mismatches, timeout and cancellation still stop; no retry or relaxed tool acceptance is added.

## Running and next boundary

- `node scripts/check-code-mode-name-ambiguity.mjs` — three independent fictional counterexamples; no child or network.
- `node --test test/codex-code-mode-witness.test.js` — independent synthetic tests only.
- `node scripts/check-codex-code-mode-witness.mjs` — one scripted Node peer; public identities are independently scripted.
- `node scripts/check-codex-code-mode-witness.mjs --native-executable ABSOLUTE_NATIVE_CODEX_PATH` — one installed-native local observation, without login, credentials or a real model request.

Evidence: [validation](validation/codex-code-mode-witness.json). No matching native executable was selected and no native witness run is claimed in the maintainer environment. The subsequent user Windows witness is recorded below; execution denial remains untested. No fresh login is needed for this local step.

Even if native identities match the public pair, tool exposure remains unresolved for a text-only dream contract. A later execution/containment test would require its own explicit fixed fixture and reviewed response semantics; this entry supplies no such tool call. Do not rewrite real model metadata to direct, install a fictional catalogue in a real subscription provider, count a name match as all-handler denial, or send an account token before the production boundary is settled. Background networking is not instrumented; descendant termination remains unknown. Existing GPT stops, failed dreams/grants, API budgets and Asteria state/bridges remain unchanged.

## User Windows identity observation received

The [new sanitized receipt](validation/user-local-codex-code-mode-witness-windows.json) reports public_exec_custom and shared_wait_function with zero unreviewed identities, one local POST and owned cleanup. The diagnostic completed, while the inner report remains tool_exposure_requires_review. This is user-reported evidence, not a maintainer native reproduction or retrospective recovery of the old names. No schema, wait-handler role, execution denial or subscription entitlement is established. Do not repeat identity observation. The [execution-boundary source review](CODEX-CODE-MODE-EXECUTION-BOUNDARY.md) separates host/session availability, its candidate constructor guard and external-call accounting from declared tool identity.
