# Full-dream HTTP/checkpoint rehearsal

`independent-fictional-http-dream-v1` connects actual loopback HTTP requests to the existing DreamModelPort lifecycle. It uses **FakeAdapter / local_fake / none**, independent fictional material, two scenes and one wake. It starts no Codex process, signs into no account and calls no real provider. GPT remains the intended default and Codex the subscription backup; this rehearsal changes neither route.

Run the isolated check with:

```sh
node scripts/check-fictional-http-dream.mjs
```

There are no CLI arguments, user-book selectors, authorization options or remote endpoints. The check creates and removes its own temporary fictional book. It prints a bounded receipt without narrative, source text, paths or credentials. Automated tests use only independent fictional snapshots. The exported fixture owner is a development harness, not a user-approval authority or production adapter.

## What is bound and saved

Each of the three stages uses a fixed two-POST fixture exchange: one continuation marker, then one scripted stage value. **Three stage invocations are six HTTP requests.** This distinction is explicit in the receipt; `external_calls_started` remains zero because all six requests go to an owned literal loopback server.

Before each socket is opened, the stage attempt receives a pending row and the existing Store saves it. The row binds:

| Field | Meaning |
| --- | --- |
| Run and stage request IDs | Existing durable run/attempt identity |
| Stage and index | Scene 0, scene 1 or wake 2 |
| Selection hash | Pinned adapter, model, protocol and fallback metadata |
| Snapshot hash | Exact normalized fictional snapshot, including source versions and grants |
| Checkpoint hash | Canonical scenes committed before the current stage |
| Request hash | SHA-256 of the exact outbound UTF-8 JSON bytes |
| Global ordinal and part | Non-renewing per-run count and position in the two-POST exchange |

Only metadata and hashes enter the accounting rows. The loopback peer receives the binding and part number, and supplies its own fixed fictional material. Its URL, headers, credentials, model and reply implementation cannot be injected through fixture options. Outbound sockets use an owned HTTP agent and a literal `127.0.0.1` connection. Replies have an 8 KiB bound and a two-second socket timeout; ordinary runtime stage limits also apply.

HTTP completion is saved before the reply is returned to FakeAdapter. `http_completed` means transport completion; it does **not** mean the stage value passed validation. The existing runtime validates the value and commits the canonical scene/wake and committed attempt in the **same Store save**. All previously completed request rows are included in that save. There is no second allowance file to reconcile with the canonical checkpoint in this slice.

## Stops, replay and recovery

- Default cap is six local POSTs per run. A smaller explicit test cap from one through six is pinned into the Fake model identity; reopening with a larger cap is a foreign owner. A stage starts only if its known two-POST fixture exchange fits. This is a local fixture cap, not token, money or subscription accounting.
- A completed dream replays without HTTP. A crash at a saved first-scene boundary can explicitly resume only the remaining scene and wake, preserving the original scene and selection.
- A dispatched stage with a pending HTTP row, or with completed HTTP but no canonical checkpoint, cannot resume. It remains ambiguous; the harness has no retry, reset, model-switch or repair port.
- An atomic pending-intent write failure opens no socket. Process death after reservation leaves an uncertain run and retained pending row. This tests process recovery, not power-loss durability.
- Cancellation suppresses late responses and wake generation. Pending rows stay reserved; stopping local work does not prove remote cancellation.
- Existing Store owner exclusion, request deduplication, source withdrawal, typed dream/wake/residue, dreambook reading and fictional recall remain in use. Withdrawal purges generated bodies and derivatives while retaining body-free accounting. The ordinary dreambook reader can read the saved Fake run without contacting the fixture.

## Verified scope and remaining dependency

Exact Linux evidence is recorded in [validation/fictional-http-dream.json](validation/fictional-http-dream.json). Tests cover disk-before-socket ordering, checkpoint/row consistency, committed-boundary recovery, ambiguous-stage refusal, true child-process death, local cap exhaustion, owner conflict, cancellation/late response, persistence failure, binding mismatch, read/replay and withdrawal after reopen.

No existing core, provider, model-port runtime, native probe, retained allowance, paid graph or old failed state was changed. The prior Windows EOF result remains [a separate accepted native local-fixture observation](CODEX-EOF-WAIT-WINDOWS-RESULT.md).

**Still missing:** binding the native app-server's actual per-HTTP forwarding owner to this full-dream lifecycle, real-provider accounting/authorization, successful subscription inference, all-handler denial and any quality acceptance. Six local fixture requests do not prove those capabilities. The earlier native relay's two-request contract was not expanded or reused. Next is an explicitly identified native/local integration slice with the same checkpoint rules, using independent fixtures before any account or real model request. No new user action or repeat of an old probe is needed for this rehearsal.
