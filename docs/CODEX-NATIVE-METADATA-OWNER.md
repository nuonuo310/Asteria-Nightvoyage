# Codex metadata-only process owner

## Entry and scope

`node scripts/check-codex-native-metadata.mjs` defaults to a fixed independent Node peer. It does not start Codex. An operator may explicitly select an installed native binary with `--native-executable` followed by its absolute executable path. Command wrappers such as codex.cmd are not launched through a shell; the native executable must be resolved first.

Both modes use the same owner and checks. The only queued app-server methods are initialize, initialized, config/read and thread/start. There is no login, account authorization, model-list or turn/start operation, no dream snapshot input, and no reuse of a user Store or previous trial grant. Queued methods are intentions written to stdin, not proof the native server accepted them. The structured result separately records verified initialization/configuration and a verified temporary-thread response, if received.

A metadata_prepared result means only that this metadata sequence satisfied the selected checks. dispatchEnabled, toolExclusionVerified and modelEntitlementVerified remain false. It is not native inference admission, subscription qualification or a dream-quality verdict. The existing DreamModelPort adapters and dream core are unchanged.

## Fixed owner controls

- A fresh temporary state directory, working directory and profile are created for each explicit invocation. The real temporary parent must be outside the project source tree and outside every detected Git checkout; a redirected in-checkout temporary directory is rejected before owner state is created. The owner constructs a child environment rather than inheriting keys, OAuth state, Node flags, proxies or user configuration paths. Credential caching is explicitly selected as file storage in the fresh state directory and checked in config/read; existing login state is not intentionally supplied.
- PATH consists of the selected binary directory, the running Node directory and platform system directories. Windows also receives the system-root setting needed to launch native programs. These are lookup inputs, not arbitrary environment or executable overrides accepted from model output.
- The selected provider is an independent loopback fixture, with exact base/catalog URLs, no required OpenAI authentication, no WebSocket transport and zero HTTP/stream retries. The owner verifies the effective configuration before requesting a thread. A changed endpoint or authentication requirement blocks before thread/start.
- The fixture serves only a small empty catalog response. Any POST, unexpected path, excess catalog request or Authorization header is rejected and stops preparation. An unexpected local POST is counted honestly; it cannot return a dream. Model names and configuration echoes are not entitlement evidence.
- Initialization must match the fresh state directory and required metadata fields. Thread metadata must match the fixed model/provider, never approval, the readOnly sandbox shape and ephemeral true. Early thread notifications must bind to the returned thread identity. Server requests, configuration warnings, malformed/unexpected frames and known startup-error labels block the observation.
- Stdout has a 256 KiB aggregate ceiling, 64 KiB line ceiling and 64-frame ceiling. Stderr uses the existing bounded fixed-label reader. The deadline is ten seconds by default; module tests may use a bounded timeout and AbortSignal. There is one process attempt and no automatic retry.
- The owner stops its own process, awaits its close event, closes its pipe handles and removes its temporary workspace before returning. POSIX termination targets the created process group; Windows terminates the directly owned process. Detached descendants and OS-wide isolation are not proven: descendantTerminationConfirmed stays unknown. A future inference owner still needs platform process-tree containment qualification. Temporary cleanup failure is a blocked result.

The owner does not promise zero background network activity by the native CLI. It explicitly reports backgroundNetworkInstrumented false. It returns no native thread ID, raw config, origins, instruction sources, stderr text, local URL, credential or temporary path. A managed policy that changes the requested configuration is a mismatch, not something to bypass.

## Actual maintainer results

On Linux with embedded codex-cli 0.159.2, the implemented native mode verified initialization and the exact fictional-provider configuration, then reached the preparation deadline without a thread reply. The fixture observed no GET or POST. The owner closed its process and removed its temporary workspace. No login or model turn was requested. This reproduces the earlier preparation failure through committed code, rather than a scratch-only harness.

Two additional environment checks failed with operation-not-permitted errors: a minimal nested bubblewrap user/PID namespace launch, and ptrace-based tracing of a version-only child. No escalation or sandbox bypass was attempted. These establish limitations of this work environment, not the cause of the thread timeout and not a general Codex defect. Windows behavior remains unmeasured by the maintainer.

The native generated ThreadStartResponse SandboxPolicy definition was inspected locally: readOnly is a discriminator of the compatibility sandbox shape. No generated schema bundle or third-party implementation was copied. This field check is not full effective-permission-profile validation.

Earlier process-enumeration notes must be read narrowly: visible zero counts did not establish complete descendant absence. This environment exposes differing execution/proc PID views, so unqualified process-tree conclusions are not retained as admission evidence. Historical observations remain in place; the new owner explicitly reports descendant termination as unknown.

## Windows comparison

Run the default independent-peer command first. For a native comparison, resolve the installed codex.exe, print its version, then run the same command with --native-executable. The project deliberately does not install/update Codex, reuse an existing login, enable generation or open a browser. The returned sanitized JSON is enough for comparison, including a blocked result; do not retry automatically, send configuration files or share credentials.

Correction to the first launcher instruction: differing executable hashes do not establish differing versions. Do not recursively select or compare every executable under node_modules/@openai. For the reviewed npm wrapper 0.160.0 on Node win32/x64, resolve @openai/codex-win32-x64/package.json from the installed wrapper and select its vendor/x86_64-pc-windows-msvc/bin/codex.exe, then check the native version. The official versioned wrapper was consulted for this selection rule; its implementation was not copied. Other versions/layouts require their own inspection. Launcher resolution is distinct from binary provenance, runtime compatibility or subscription access. See [official 0.160.0 wrapper source](https://github.com/openai/codex/blob/rust-v0.160.0/codex-cli/bin/codex.js).

## Evidence and references

Independent fictional tests cover successful metadata preparation, altered model/provider/thread identity, non-ephemeral replies, changed endpoint/auth requirements, initialization mismatch, warnings/errors, unexpected server requests/HTTP dispatch, cancellation, timeout, credential-environment exclusion and CLI defaults. Automatic tests launch only independent Node peers. Native evidence and test summaries are recorded in docs/validation/codex-native-metadata-owner.json and adjacent files.

Implementation and peers are original project code. Public references: [official app-server lifecycle](https://learn.chatgpt.com/docs/app-server), [configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference), and [CLI reference](https://learn.chatgpt.com/docs/cli/reference). Consulted protocol/configuration meanings are separate from the runtime measurements above.

## Windows cleanup follow-up

A user-reported Windows native 0.160.0 observation verified initialization, configuration and ephemeral thread preparation. The owned process closed; temporary cleanup failed, so the overall result correctly remained blocked. No account authorization or turn was requested; local fixture GET/POST counters were zero. The original receipt did not preserve an errno, so a file lock, descendant handle or permission issue is not established as its cause. This is user-reported native evidence, not a maintainer Windows run or model inference.

Workspace removal now uses awaited Node asynchronous recursive removal with five bounded filesystem retries and a 100 ms linear retry delay for errors supported by Node. The nominal retry delays sum to 1.5 seconds; this is not a hard wall-clock bound for OS filesystem operations. Only the current invocation's already-owned temporary workspace is removed. No Codex process, thread, authorization or model request is retried. A terminal removal error still blocks and returns only temporaryCleanupFailureCode from a fixed errno list, or unknown; no path, error text or retained body is emitted. Process-tree containment remains unknown, and removal retries do not prove descendants are terminated.

No stale workspace scavenger or broad deletion command was added. The failed observation's previous temporary directory may remain; this change does not claim to have removed it. Tests use independent peers and injected filesystem failures to verify blocked results, path/body suppression and awaiting removal before success. These tests do not reproduce or establish the cause of a Windows native file lock. A new explicit Windows metadata-only comparison is still required to determine whether this change resolves the observed cleanup failure.
