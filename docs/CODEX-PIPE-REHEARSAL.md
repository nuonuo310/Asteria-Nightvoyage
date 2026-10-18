# Independent child-process pipe rehearsal

This slice exercises real Node child processes and stdin/stdout with the [offline RPC driver](CODEX-RPC-REHEARSAL.md). It does not launch Codex, log in, inspect auth files or contact a provider. The synthetic peer lives in test-support and produces independently scripted fictional responses.

`runCodexPipeRehearsal(draft, options)` accepts only a cancellation signal, a bounded local deadline and a closed synthetic fault scenario. The executable is always the current Node executable; the child script and arguments are fixed by project code. There is no command, cwd, environment, live or provider override. It is not a general launcher and cannot serve as a native Codex adapter.

The child runs without a shell in a newly created temporary directory. Environment inheritance is replaced with an empty object, except SystemRoot on Windows. Credentials, OAuth state, HOME, PATH, NODE_OPTIONS, module-search and proxy settings are not copied. The fixture refuses known forbidden environment fields. This is environment separation for trusted project test code, not an OS security sandbox or proof that a Codex process would be isolated.

## Completion and failure

The parent writes only the driver's proposals, each capped at 65,536 bytes. The finite handshake permits one pending RPC request at a time (plus the initialized notification), bounding queued writes; it does not implement a reusable high-throughput transport. The existing input stream caps bound total stdout. Any stderr data is discarded and rejects the stage, with no provider message echoed. This deliberately strict stderr rule is suitable for this scripted peer; real Codex startup logging is not yet qualified.

A valid final turn is insufficient until the child closes with code zero and the decoder finishes. Unexpected exit, trailing/malformed output and stream errors suppress data. Timeout or local cancellation kills this owned synthetic Node child and waits for close before rejecting; the temporary directory is removed before the promise settles. No remote interrupt is sent or remotely confirmed. The fixture creates no descendants; this is not process-tree termination evidence for arbitrary tools or a native Codex harness. OS-kernel failure and physical power loss are outside these tests.

Local cleanup failure rejects rather than claiming successful completion. The wrapper does not provide a crash journal or delete temporary directories left after the parent itself is killed. Its fixed peer writes no body files there. The existing engine owns durable stage attempts, checkpoints, deduplication, cancellation and source withdrawal. A second peer's abrupt exit preserves the first saved scene and cannot be ambiguously retried; no second provider continues it.

## Independent commands

```sh
node --test test/codex-pipe-rehearsal.test.js test/codex-rpc-rehearsal.test.js test/subscription-model-port.test.js
node scripts/check-codex-pipe-rehearsal.mjs
```

The script completes two scenes and wake with three independent Node children, waits for all three to close, reopens/replays without another child, preserves the original and withdraws a source across reopen. All engine receipts retain the existing Codex simulator identity and zero external generation calls. Usage is unknown; no subscription, billing or quality qualification follows. No user Store, private input, real approval or credential is read. See [verification](validation/codex-pipe-rehearsal.json).

Implementation and fixtures are original MIT project code, with no third-party launcher copied or new dependency. The same [official references](CODEX-RPC-REHEARSAL.md#official-references-and-next-admission-boundary) inform RPC ordering; no official behavior is inferred from this fabricated peer's success.

## Next boundary

Supplementary static inspection used only the embedded host CLI's --version, generate-json-schema --help and generate-json-schema commands, with no app-server listener, OAuth or turn request. The schema bundle was generated in temporary scratch with an empty child environment; it is not copied into this public repository. Version 0.159.2 exposes thread/start model/provider, base/developer instructions, config, cwd, sandbox and ephemeral fields, while its response carries effective model/provider and sandbox information. The initialize response also requires environment metadata that the intentionally minimal synthetic peer does not reproduce. Thus these fixtures test ordering and selected guards, not full official schema conformance. Native admission must validate the actual returned model/provider/configuration and independently verify tool exclusion; the mere presence of config/sandbox fields is insufficient. Windows installation and behavior remain unverified.

Before native Codex work, inspect the exact installed version and its generated RPC schema/configuration without login or model dispatch. No Codex command resolved through this execution environment's PATH. A later read-only check of its embedded host executable reports codex-cli 0.159.2; that is not evidence of the user's Windows installation/version, which remains unconfirmed. A local --version check is the next minimal user-environment input, not permission for login, model inference or installation. Do not request a doctor report, auth files or private configuration. A native owner still needs isolated config/history, verified tool exclusion, OAuth lifecycle, durable one-run approval and failure receipts before a real trial can be proposed. Direct GPT remains the intended primary route; its consumed compatibility stop is unchanged. Asteria's bridges are not implemented here.
