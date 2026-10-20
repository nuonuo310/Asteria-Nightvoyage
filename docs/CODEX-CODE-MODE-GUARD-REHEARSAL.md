# Independent execution-guard and dispatch-accounting rehearsal

This slice implements an **offline candidate policy and an independent outbound journal**, not a native Codex execution guard. It follows the [pinned source review](CODEX-CODE-MODE-EXECUTION-BOUNDARY.md). No Codex process, account, provider token, real model or user store is used. The earlier native identity receipt remains blocked and unchanged.

Run the complete independent rehearsal:

```sh
node scripts/check-codex-code-mode-guard.mjs
```

This command accepts no arguments. It cannot enable native execution, login or inference. Its two HTTP POSTs go to a fresh owned loopback server and return empty 204 responses. There is no model response, tool call, code execution or handler-denial simulation. All metadata, including the expected warning, is independently scripted. A passing receipt does not establish native behavior.

## Candidate configuration and warning policy

`scripts/codex-code-mode-guard-review.mjs` adds two explicit startup overrides to the earlier controls: `features.code_mode_host=false` and `code_mode.disable_in_process_fallback=false`. Its bounded JSON reviewer requires both explicit false values and all previously reviewed isolation settings. Missing, mismatched or differently typed values cannot pass. It does not change model tool mode or the old observers.

The separate warning reviewer permits **fixture continuation only** for the exact disabled-host warning derived from the pinned source, under matching candidate configuration and an independently fixed fictional thread. A different thread, extra field, altered message or unknown event does not match. It returns labels only. It makes no native warning or handler claim.

Effective configuration is still insufficient to prove Local host transport or exclude provider injection; these remain false in the review. A future native owner must seal/check the launch and validate the actual configuration and warning before any scripted call.

## Request intents and recovery

`scripts/codex-local-dispatch-journal.mjs` is an independent, synchronous-persistence state machine. The rehearsal saves its snapshots in a fresh temporary directory using write-then-rename and reopens them. The loopback server verifies that each request's in-flight intent is already present when its HTTP request arrives.

| Saved phase | Intent count | Allowed next operation |
| --- | --- | --- |
| ready | 0 | Reserve first request |
| first_in_flight | 1 | Live owner may complete; reopened owner blocks acknowledgement and dispatch |
| continuation_ready | 1 | Reserve second request |
| second_in_flight | 2 | Live owner may complete; reopened owner blocks acknowledgement and dispatch |
| completed | 2 | No further request |
| cancelled | 0–2 | No request or late completion |

Each reservation is saved before the caller may dispatch. A second reservation during an in-flight request, a third request, a late completion after cancellation and an attempt to acknowledge a restored ambiguous request all fail. Persistence failure closes that live owner; it cannot dispatch based on an optimistic in-memory state. A write-then-error may leave a saved in-flight checkpoint, which a reopened owner also blocks.

This journal records **intent**, not proof that the provider received, billed or cancelled a request. Its persistence callback is synchronous by contract; it is not an adversarial storage capability. The rehearsal does not test OS power-loss durability, multiple-process ownership, malicious snapshot rollback or a real app-server transport. It does not add a retry path or repair an ambiguous checkpoint. Production integration requires an owned durable store and a transport boundary that can stop every actual outbound request.

## Remaining native work

The [earlier design proposal](proposals/codex-code-mode-execution-guard-design-v1.json) remains design-only and is not upgraded into an approval by these tests. Native arithmetic/wait fixture calls have not been implemented or supplied. Their exact schema, output, notification and stderr semantics still need a separately bounded native owner. The current CLI deliberately rejects `--native-executable`.

No existing provider, source pin, consumed allowance, failed run, unknown billing hold, dream, review, recall or Asteria boundary is rewritten. The real Codex subscription adapter remains unadmitted; real per-POST accounting is not yet integrated. No new user login or inference confirmation is requested for this slice.
