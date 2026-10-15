# Nightvoyage local contract v1

Status: implementation contract; no Asteria compatibility claim. The local file adapter and a future Asteria adapter must provide the same validated snapshot. Asteria endpoints remain pending integration and are not implemented here.

## Inputs and authority

A snapshot has `id`, `version`, `materialKind` (`fictional` in this release), `sources`, and five channels: memory, background, affect, mind, intents. A present affect channel additionally supplies bounded `value:{valence,arousal}`; otherwise the simulated initial affect is neutral. Each channel has availability `present|absent|denied|stale|unavailable` and source IDs. Every source has an ID of 1–200 characters, version, text and grant `{dream:true, modelEgress:false}`. Only present, explicitly referenced sources participate. Missing channels are recorded; missing memory skips generation. No implicit personality, concern, intent or lived event is invented as an input.

Input material identity and output epistemic identity are separate: every generated artifact carries `materialKind`, `origin: dream|simulated_affect|wake_note|recollection|imagined_continuation`, `isRealityFact:false`, source refs and derivation refs. Real-source support is deliberately disabled in this release. Model output cannot supply or override provenance.

## Ports

- `start(requestId, sessionId, snapshot, config)` persists a request and returns its run ID. Same request with different content conflicts; same session/snapshot/config reuses the existing run. A new session permits a deliberate new experiment.
- `execute(runId)` drives up to two sequential scenes and one wake call. `status`, `cancel`, `resume` expose durable control. Resume uses validated scene checkpoints; an ambiguous dispatched attempt requires an explicit `retryUnknown` choice and retains its budget charge.
- `read(entryId)`, `list()`, `append(entryId, kind, text)` keep original scenes immutable. Appends are separate recollections or imagined continuations.
- `setPolicy(entryId,{cherished,recallAccess})` controls preservation preference and manual/cue access independently of affect. Local v1 retains until explicit deletion; cherished is metadata, not a retention daemon.
- `recall(cue,requestId,now)` returns zero or one typed candidate with match reason and source identity. Request replay returns the same candidate unless revoked/deleted. It does not inject or apply anything.
- `residue(entryId,now)` computes a bounded decaying simulated wake residue. It does not modify daily emotion.
- `deleteEntry(entryId)` removes a dream and descendants. `withdraw(sourceId)` blocks the source immediately, purges all dependent run bodies/entries, and persists a body-free tombstone. Over-purging a whole dependent dream is intentional.

Outputs are separate `dream`, `wake`, `residue`, `associations`, `receipt` fields. Associations may be empty. Dream scenes contain event text, appraisal (goal effect, control, uncertainty), and before/delta/after valence and arousal. Program validation checks boundedness and continuity, not subjective experience or narrative truth.

## Execution and budget

States: queued, running, completed, skipped, failed, cancelled, uncertain, revoked. Cancellation is terminal; resume is only for failed/uncertain work. A provider receives an AbortSignal. Cancellation may not stop a remote service; late output is discarded. This release includes only a fake provider and never executes tools from dream text.

Before dispatch, persist an attempt and reserve its input estimate plus maximum output. Defaults: three calls, 6,000 estimated input tokens total, 1,200 output tokens total, 400 maximum output per call, 10 seconds per call. Retries count. Fake usage is not a real provider token measurement. Real providers need a separate authorization and accurate provider-specific budget implementation. Structured-output repair is not implicit.

A result is validated and saved before the next stage starts. Failure stores a code, not provider text or stack traces. Interrupted dispatch becomes uncertain on reopen. No exactly-once promise for remote calls. There is no real provider in B/C.

## Storage and withdrawal boundary

One external data directory, one JSON state snapshot, separate body-free withdrawal/deletion tombstone files, one fixed temporary snapshot, one owner lock and a short-lived recovery guard. Data path must be outside the source checkout and not a symlink. Single host/process owner; a second owner is rejected. Dead-process locks can be recovered locally under an exclusive recovery guard. A corrupt owner lock, PID reuse, or abandoned recovery guard requires manual inspection; no blind lock removal is performed. No network filesystem, multi-host writers or restored backups are supported.

Snapshots use exclusive temporary creation, file fsync, atomic rename and directory fsync where supported. Startup removes abandoned temporary snapshots before serving reads. Source and deletion tombstones are fsynced separately before purge; startup enforces them before exposing state. There are no content logs, disk indexes, provider caches or automatic backups. Reads/recall always recheck current state. Returned copies already held by a caller, OS/filesystem snapshots, SSD remnants and user-created copies cannot be recalled or securely erased. An old backup must never be opened as current storage without reapplying the latest withdrawal tombstones; backup restoration is outside v1 support.

Revocation during an in-flight call discards its response. A successful withdrawal means the managed live state and managed temporary files contain no dependent body. Storage I/O failures are surfaced and the instance fails closed until reopened. Deletion and revocation are exceptions to append-only preservation.

A successful control response is the durability acknowledgement. If storage fails before the withdrawal/deletion tombstone is durable, the current instance blocks all access, but no restart guarantee can be made for that failed request: repair storage and retry the control request before resuming service. Crash tests cover process interruption, not physical power-loss guarantees or forensic secure erasure. The withdrawal authority is monotonic per source ID, across versions; regrant is not implemented.

Public return values are detached copies: mutating a recall candidate must never alter stored provenance. Non-finite clock inputs are rejected. Grant normalization retains only supported permission fields.
