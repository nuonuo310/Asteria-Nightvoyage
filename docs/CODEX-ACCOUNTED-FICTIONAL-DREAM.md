# Accounted Codex fixture dream

This slice binds app-server HTTP forwarding to the existing two-scene/wake lifecycle. The default check uses an **independent Node peer**. A separate explicit native mode is prepared for installed **codex-cli 0.160.0**. Native execution was not performed in this maintainer workspace; native success is **pending the user's Windows observation**.

Neither mode logs in, supplies credentials or calls a real model. The adapter remains `CodexAdapter / openai_protocol_simulator / synthetic_stub`, fixed model `gpt-5.6-sol`. This is a development fixture, not a subscription grant or production bridge. GPT remains the formal target default, Codex the subscription backup, and Fake the automatic-test default. Existing DeepSeek/API functionality stays behind its explicit boundary.

## Actual path

`AccountedCodexDream` reuses the existing local ModelPort runtime and Store. A stage obtains a module-issued accounting context, then the existing runtime saves its dispatched attempt before invoking the adapter. The accounted transport activates that context before starting its owned process.

The process speaks the reviewed initialize/config/thread/turn RPC sequence. Its Responses URL is an owned loopback relay. The relay reads and reviews the actual HTTP bytes, saves its local journal and the **dream Store's pending intent**, then opens a direct loopback socket to the independent upstream fixture. That fixture independently reads `state.json` and checks the exact pending row and outbound-byte hash before supplying its scripted final answer. The relay saves HTTP completion before releasing the response to app-server.

The fixture final answer must match the fixed stage, thread, turn and item. Successful completion requests bounded stdin EOF, waits for the owned child to close with a normal zero exit, closes the relay, and removes only the invocation's leased temporary workspace. The stage response is then validated by the existing model port; its canonical checkpoint and committed attempt, including the completed HTTP row, share one Store save.

| Count or state | Meaning |
| --- | --- |
| Three stages | Scene 0, scene 1, wake 2 |
| At most one forwarded POST per stage | This fixed final-answer fixture has no tool continuation or automatic retry |
| At most three forwarded POSTs per run | Persisted per-run rows survive reopening; stage invocations and HTTP counts are separate |
| HTTP completion | Bounded transport reply read; not semantic acceptance, inference entitlement or billing |
| `external_calls_started: 0` | No real provider generation in this fixture |
| Relay journal `continuation_ready`, calls 1, closed | The reused two-request relay journal was closed after this one-request stage; it is not being represented as a completed two-request trial |

The earlier [Fake HTTP rehearsal](FICTIONAL-HTTP-DREAM-CHECKPOINTS.md) scripted two POSTs per stage and six in total. This app-server fixture scripts one final-answer POST per stage and three in total. They are different independent fixtures, with distinct identities and no shared approval or budget.

## Persistent identity and failure handling

Each body-free intent contains a global ordinal, exact UTF-8 request SHA-256 and pending/completed state. Its enclosing stage account binds run/request ID, stage/index, selection hash, normalized snapshot hash and previous canonical checkpoint hash. Peer and native modes have distinct protocol identities: `codex-peer-accounted-stage-v1` and `codex-native-accounted-stage-v1`. Reopening with a different adapter identity is refused.

An HTTP reply alone cannot commit a scene. Wrong output, failed turn, tool request or child death after HTTP completion leaves a dispatched stage and blocks resume. A true parent-process exit immediately after pending persistence likewise remains uncertain. A saved first-scene checkpoint can explicitly resume the remaining stages with the same identity; an uncommitted stage cannot be retried. Cancellation, persistence failure and late responses cannot publish a scene or start a wake.

The relay's journal and the dream Store are separate writes, **not a cross-file atomic transaction**. A failure between them stops forwarding/publication. The dream Store's dispatched stage prevents recovery from replaying an ambiguous request, even if a disposable relay journal is later removed. No power-loss durability or remote cancellation is claimed. A poisoned Store is reported as `storage_io_failure` rather than disguised as an output-validation failure.

The old relay's default two-tool rule is unchanged. Only the new module-issued stage-account branch accepts an explicitly empty tool array; it refuses absent/nonempty tool lists, remote URLs, auth/cookie headers and encoded or oversized requests. Old allowance objects cannot be combined with a dream-stage account. Existing environment isolation and the previously reviewed code-mode-host guard settings are requested and checked. The fixture uses an independent **direct/empty** catalogue; it does not represent the account's real `code_mode_only` model metadata. Empty tool declarations are not all-handler denial or subscription entitlement.

## Reading and old source pins

Dreambook recognizes only the two new protocol identities and uses a separate `accounted-codex-content-view.mjs`. That projection requires all three completed HTTP/checkpoint records and retains the existing canonical scene/source checks. It does not relax older GPT readers, source manifests or approvals. The first full development run caught `trial_source_pins_changed` when the original reader was edited; that edit was removed and the original source-pinned file restored byte-for-byte. Old permission fingerprints were not refreshed.

Reopening a completed fixture book creates no new child or POST. Dream, wake, simulated residue and fictional recall remain typed separately. Source withdrawal removes their bodies and derivatives across reopening; body-free request metadata remains. This project still does not implement Asteria's memory, Mind, personality, canonical state or either formal bridge.

## Checks and the Windows handoff

Maintainer evidence: [validation/codex-accounted-dream.json](validation/codex-accounted-dream.json). Automatic tests use independent fictional fixtures, including a true child-process exit. The no-argument check is:

```sh
node scripts/check-codex-accounted-dream.mjs
```

`Invoke-CodexAccountedDream.ps1` is a **new one-shot local observation**, not an old-probe rerun. It resolves only the installed x64 0.160.0 wrapper-selected platform package. The CLI checks the selected program's `--version` in a clean environment, separately from at most three app-server children. The fresh fixed application-data directory must not already exist. Before any app-server child, `entry-once.json` records independent fixture identity, three-child/three-POST limits, fixture hash and selected implementation hashes. Those hashes are explicitly **not a complete dependency-graph pin** or real-inference approval.

The native directory and body-free rows are retained. Repeating the entry, renaming/resetting it, switching to a fallback directory, recovering an old failed root or automatically retrying is unsupported. The CLI prints a bounded receipt without narrative, credentials, raw stderr, callback, request body or local paths. After one run, return its complete final JSON and stop, including when blocked.

Remaining work: native Windows observation of this full fixture path; then a separate review of real authenticated forwarding, source closure, actual model metadata/tool exposure and explicit subscription permission before any real turn. Catalogues and these local fixtures do not establish selected-model inference access. Official lifecycle reference, read for this slice: [OpenAI Docs — Codex app-server](https://developers.openai.com/siwc/token-sharing-open-source/codex-app-server). No token-handling example from that page was enabled here.
