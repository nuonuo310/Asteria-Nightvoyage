# Codex configuration observation, not tool admission

## Implemented boundary

`scripts/codex-isolation-review.mjs` supplies a detached candidate list of documented launch overrides and reviews an in-memory `config/read` reply. This is a pure metadata helper: it does not spawn Codex, read a file, inspect an account, open a Store, request a thread or call a model. Its input is a bounded JSON string (64 KiB), not a caller object with getters or coercion. RPC errors, wrong request identity, malformed JSON and missing configuration reject with one fixed error.

The review reports only fixed `matched`, `different` or `unknown` labels for selected controls. It checks explicit false values for shell, apps, collaboration, hooks, memories, goals and Code Mode; a disabled app default with no per-app records; an empty MCP server map; disabled web search; never approval; and read-only sandbox. Missing values are unknown, not inferred defaults. Even a disabled MCP record is different from this deliberately narrower empty-map candidate. Unknown config fields and origins are never echoed. This is not a validator for every native configuration field.

A matching review **always** returns `dispatchEnabled: false`, `toolExclusionVerified: false` and `modelEntitlementVerified: false`. It is not an authorization object and is not connected to the adapter selector or a production launcher. Approval policy and read-only sandbox do not establish an empty tool set. Local image tools, other built-ins, managed configuration, project instructions, plugin loading and effective thread settings still require separate qualification. In particular, this slice does not claim that all capabilities are covered by the selected controls.

## Actual native evidence

On 2026-10-19 the maintainer ran the embedded Linux codex-cli 0.159.2 app-server with the helper's launch overrides, in a fresh empty temporary working directory and separate fresh state directory. The child environment contained only the fresh `CODEX_HOME` setting. No existing user config, credential environment or user Store was intentionally supplied.

The native process received only initialize, initialized and config/read (includeLayers false), with bounded replies. Its actual configuration reply was passed in memory to the implemented reviewer. All 13 selected control labels matched, including the empty MCP map and no per-app override records. The sanitized result is recorded in `docs/validation/codex-isolation-config.json`. Raw replies, origins, local paths, config values and credentials are not stored here. The owned process was terminated and awaited, and the temporary directories removed.

This proves that these explicit settings were reflected by this native binary's config/read in this isolated invocation. It does not prove that the eventual model request has no tools, that Windows behaves identically, that arbitrary installed configurations are isolated, or that a subscription can generate a dream. No login, model list, thread/start or turn/start was requested. Background network activity was not instrumented; this is not an audited zero-network claim. No remote cancellation or revocation is asserted.

## Validation and next dependency

The independent fictional tests cover enabled controls, absent/mistyped values, per-app overrides, nonempty MCP maps, raw metadata suppression, bounded malformed replies and detached results. They do not invoke the native binary or use host configuration. Full regression results are recorded beside the native observation; neither type of test assesses dream quality.

Next, qualify the effective tool set and thread constraints using a local fictional provider only, before proposing any new login or real subscription trial. Do not relax rejected-event guards, reuse consumed GPT trials, attach an existing account, silently select an API provider, or stitch Codex output into an old failed GPT run. Direct GPT remains the intended primary adapter and Codex the explicit backup; the dream core, API legacy boundary and Asteria ownership are unchanged.

## Public references and provenance

The implementation and synthetic fixtures are original project code. No third-party implementation or generated schema bundle is copied. Public documentation was consulted for configuration meanings, not treated as runtime proof:

- [Official configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference): shell/apps/collaboration/hooks flags, Code Mode, app defaults, MCP, web search and sandbox/approval settings.
- [Official app-server protocol](https://learn.chatgpt.com/docs/app-server): initialization and config/read.

Disabling unified_exec is deliberately not used as a shell exclusion claim: the documented user opt-out behavior can leave one-shot execution available. App defaults may also be overridden per app, hence the separate empty-override observation.


## Subsequent local-provider preparation did not reach a model request

A separate isolated native probe attempted thread/start with an explicit fictional loopback provider, fresh state/cwd, disabled OpenAI authentication, zero HTTP/stream retry settings and independent fictional input. The loopback fixture would return an immediate fixed HTTP error rather than generate or execute a tool. It did not use a user account, API key or real provider endpoint. This probe is separate from the successful config/read observation above.

Initialization succeeded, but no thread/start reply arrived within the bounded wait. Consequently no turn/start was sent, and the local fixture observed neither a catalog GET nor a model POST. The process emitted configWarning and remoteControl/status/changed notifications. A fixed warning classification found that the additional experimental `tools.view_image=false` candidate was marked deprecated/ignored. This override is **not** in the implemented candidate list. The other warning mentioned sandboxing; its specific meaning and the thread-start timeout cause remain unestablished. Neither warning proves whether a particular tool was actually advertised.

A minimal Node-directory PATH comparison and a shell-snapshot-disabled comparison did not resolve the timeout. The final recorded invocation used both, still stopped before a turn, closed its owned process, removed its temporary directories, and left no process carrying its isolated probe state setting. No raw notification body, header, config, credential or local path is retained. This is a bounded unsuccessful preparation experiment, not an authenticated subscription attempt or a successful native adapter integration. No general zero-background-network or account-revocation claim is made.

Tool-set qualification therefore remains blocked at native thread preparation. Keep this as an unresolved dependency; do not work around it by inheriting the user's existing account/configuration, treating ignored settings as effective, or running a real subscription trial to obtain missing local evidence.
