# Progress

## A — contract prepared, 2026-10-15

Contract, implementation sequence, public references and fictional walkthrough written. Initial repository contained README only. No runtime or quality result claimed. Next: implement B with a deterministic fake provider.

## B — local fake loop implemented, 2026-10-15

Implemented local snapshot validation, two sequential scene calls and one wake call, persisted dream/wake output, separate simulated residue, cue candidates, immutable-original child records, policy changes and CLI. All examples are fictional. Runtime data must be outside the checkout. Non-fake providers and real source materials are rejected.

Validation: Node.js v24.19.0, `npm test`: 5 tests passed, 0 failed. Covered persistence/reopen, scene affect continuity, input/output identity separation, optional empty associations, recall/no-match, child records, preservation/access/residue independence and input rejection. These tests use a deterministic fake provider and do not establish narrative quality.

Lifecycle code is present but C fault/restart tests and review are next. No real model or Asteria integration has run.

## C — lifecycle implemented and reviewed, 2026-10-15

Implemented durable per-call reservations and checkpoints, same-request/session deduplication, explicit ambiguous-attempt recovery, cancellation and late-response rejection, provider timeout signal, bounded retries, single-owner storage with guarded dead-process recovery, and monotonic withdrawal/deletion journals. Reopen enforces tombstones before any read and removes abandoned managed temporary snapshots. No body text is stored in recall receipts, tombstones or errors. Original entries remain separate from recollection/continuation. Present affect has explicit validated values; absent affect uses a marked simulated neutral start.

Validation on Linux / Node.js v24.19.0: **30 passed, 0 failed, 0 skipped**. Direct TAP output is in `docs/validation/tests-output.txt`; `run.json` binds source/test/fixture hashes to the run. Tests include an actual child-process exit after persisted dispatch, checkpoint reopen, cancellation at queued/in-flight/scene-boundary states, timeout, malformed/oversized output, call/input/output budget bounds, conflicting requests, object-key edge cases, withdrawal during generation, cached recall suppression, purge of descendants, crash before purge, failed storage writes, deletion journal replay, lock/path isolation, and inert dream tool commands.

A separate CLI smoke run completed the fake demo twice with one run ID and three total calls, returned a typed dream recall, withdrew the source and listed zero entries. See `docs/validation/cli.json`. Temporary test data was outside the source checkout and removed after verification.

Review corrections: added own-property ID lookup, explicit initial affect validation, narrowed generated appraisal fields, provenance on list/residue outputs, abort propagation on timeout, execution cleanup on initial save failure, guarded stale-lock recovery, durable deletion tombstones and a named local file adapter. A fault test was corrected to distinguish failure before a tombstone is durable from failure after it is durable; a separate test now covers each case.

### Supported boundary and remaining limitations

- Single host, one active owner, local filesystem; JSON snapshots are rewritten in full. No scale, multi-host, network-filesystem or external backup restoration support.
- Successful withdrawal/delete acknowledges persistence; a storage error before its tombstone is durable blocks this instance but requires repair and retry before any restart serves data. Latest tombstones must accompany any future restore design.
- No automatic backups, content logs or disk indexes. Managed current files and temp snapshots are purged; caller-held copies, OS snapshots, user copies and physical media remnants are outside erasure scope.
- Tests cover process crashes and injected I/O failures, not physical power-loss durability. Directory fsync is attempted; unsupported-platform errors are handled. Windows execution has not been verified.
- Recall is bounded literal scene-text matching, not semantic retrieval. Wall-clock timestamps are used for candidate expiry/residue; there is no scheduling service.
- Token counts are conservative fake-provider reservations, not measured API usage. Fake generation is deterministic and deliberately leaves the fictional problem unresolved. This is no evidence of real generation quality, subjective dreams or emotional benefit.
- Source IDs remain withdrawn across versions; regrant and backup restore require future design. Corrupt locks/PID reuse or an abandoned recovery guard require manual inspection.

**Authorized B/C implementation complete. D is paused:** no real provider, credentials, private input, Asteria modification, frontend or automatic merge. Next decision: select and authorize a real provider and explicit cost/data limits before implementing D. Work remains on a review branch and PR.

## Pre-merge review — corrections verified, 2026-10-15

User authorized merging PR #1 after review. Same-author review (not an independent-agent audit) found and fixed three issues: a fresh recall result shared its source-ref array with stored state, accepted source IDs could exceed the withdrawal API length limit, and residue accepted non-finite clocks. The recall alias could let a caller damage provenance and prevent an entry from being purged; candidates now return detached source refs. Source IDs are bounded at admission, and invalid clocks are rejected. Grant fields are also normalized to the supported permission fields.

Three targeted probes failed on remote baseline `6f3a9e086a5c6aacc1c1323fbc1d66020486220a` before the fixes. After fixes, full suite: **33 passed, 0 failed, 0 skipped** on Linux / Node.js v24.19.0. `docs/validation/review-before.txt`, `review-after.txt` and `review.json` preserve direct output, source hashes and scope. The earlier 30-test evidence remains historical evidence for the earlier source hashes; the review evidence supersedes it for current code.

No GitHub Actions workflow is configured; local test evidence is not CI evidence. Existing storage/backup, Windows, fake-provider and quality limits remain. Review disposition: eligible for the explicitly authorized B/C merge after verifying remote content and current PR head. D remains paused; merge does not authorize a real provider or private data.
