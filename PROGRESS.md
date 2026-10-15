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

## DeepSeek offline preparation — 2026-10-15

Provider preference is DeepSeek. User is away from the home computer and approved preparing code and offline tests only; no live request or credential work is authorized now. Added an independent request/response protocol module and an engine-compatible fake simulator provider. The live engine gate, existing CLI and source grants remain unchanged.

Full suite: **43 passed, 0 failed, 0 skipped**, Linux / Node.js v24.19.0. Ten new tests cover request framing, explicit model/options, JSON/empty/truncated/tool responses, sanitized HTTP errors, usage validation, a three-stage local protocol rehearsal, no automatic repair, cancellation/late output and missing-simulator refusal. Evidence: `docs/validation/deepseek-offline.txt` and source hashes in `deepseek-offline.json`. No production API was called.

Live transport, external credential loading, explicit fictional-material egress grants and a durable session-wide monetary ledger are still pending. The proposed CNY 1 / 3 dreams / 9 calls budget was not approved and is not enabled. See `docs/DEEPSEEK-PREPARATION.md` for the at-home handoff. Ready for review as a separate PR; do not merge on PR #1's authorization. No real-generation quality claim.

## Budget and default-off transport — 2026-10-15

Implemented `BudgetLedger` and `GatedDeepSeekClient` as separate API components. Allowances are immutable per ID and accumulate run/call/money usage across restarts. Money uses integer micro-CNY, upward rounding and full verified model-context reservation rather than fake token estimates. Same request replays without dispatch; failures/unknowns retain reservations. Added bounded, redirect-refusing native HTTP code behind explicit enabled/live/allowance/credential/egress gates. Native HTTP was never invoked in this run. Existing CLI/engine remain fake-only. Snapshot grants now accept explicit boolean model-egress permission; all shipped fixtures remain false.

Validation: **65 passed, 0 failed, 0 skipped**, Linux / Node.js v24.19.0. Twenty-two new tests exercise allowance caps, immutable limits, restart and actual child-process exit, duplicate parallel requests, storage faults before dispatch/settlement, stub HTTP failures, oversized/stalled streams, cancellation, source withdrawal, input mutation isolation and credential/body-free ledger records. A native-fetch interception test verifies default/unapproved live modes cannot reach the network. Direct TAP output and source hashes: `docs/validation/budget-transport.txt` and `.json`.

Review changes before publication: recover ambiguous billing attempts on Store reopen only (not whenever a second client is constructed); snapshot stage/affect before await; whitelist source/usage metadata; abort failed HTTP operations; distinguish timeout from cancellation. No real price, credential, live allowance or private material was used.

Scope limit: this is a gated client plus ledger, not an integrated live dream runner. Engine/journal publication, Windows/external credential setup and verified live configuration remain pending. Full-context reservation may refuse a small proposed allowance; do not raise it without approval. Correct external prices/model bounds remain a prerequisite, not something a passing stub test proves. Documentation: `docs/BUDGET-AND-TRANSPORT.md`. Separate PR, no automatic merge or real request authorization.

## Integrated runtime and local launcher — 2026-10-15

Trial scope now authorizes fictional material, at most three dreams, nine calls and CNY 1 total. Added `BudgetedNightvoyage`, atomic scene/wake plus billing publication, stable billing stage IDs, completed-result replay, explicit partial-run resume, a default-off CLI and Windows `.cmd` launcher. A local key is read only after credential-free preflight succeeds. Only the pinned fictional fixture and reviewed trial configuration are accepted. No actual key or production request was used.

Pricing review found a preflight blocker: full-context reservation is CNY 2.2032 per Flash call at published peak cache-miss/output rates and a conservative 1,100,000-token context bound. CNY 1 stays enforced and is refused before key access. CNY 3 is an unapproved alternative, not enabled on the user's behalf. Profile expires 2026-10-16 12:10 UTC. Public references and local steps are in `docs/RUN-ON-WINDOWS.md`.

Validation: **76 passed, 0 failed, 0 skipped**, Linux / Node.js v24.19.0. Eleven new integration tests cover three budgeted scene/wake calls, nine calls across three dreams, committed-scene restart, actual process exit after atomic publication, settlement failure, unknown-response refusal, withdrawal and credential-free CNY 1 refusal. Credential-free replay also reports persisted billing usage rather than fake zero counters. The earlier 65 tests still pass. Direct output and source hashes: `docs/validation/integrated-runtime.txt` and `.json`.

Same-author review, not an independent-agent audit. An execution-environment disconnect interrupted an intermediate documentation command; recovery succeeded before final verification. No interrupted attempt is represented as test evidence. Windows, actual API/billing and dream quality remain unverified. PR #3 includes the integrated change and remains unmerged. Next: resolve the budget/pre-reservation conflict, obtain merge authorization, then user-local setup and the first real fictional dream.

## Trial decision and merge authorization — 2026-10-15

The user explicitly approved the revised CNY 3 total ceiling, at most three fictional dreams / nine calls, and merging PR #3. This supersedes the prior CNY 1 trial ceiling. Updated the Windows handoff to initialize CNY 3 and use main after confirmed merge. No runtime code changed; the 76-test evidence remains bound to the same source hashes. No local user credential or production API request was accessed. Merge confirmation follows through GitHub metadata; user-local Windows execution and actual dream-quality review remain next.

## Windows compatibility correction — 2026-10-15

User-local Windows validation of merged PR #3 reported 72 passed / 4 failed: three `fixture_changed` failures and one URL-path assertion failure. Initialization/preflight stopped before credential entry; no live output was reported. Reproduced the three fixture failures on the unchanged parent by converting text working files to CRLF (8 passed / 3 failed in integration tests). The attached terminal transcript is not copied into this public repository.

The pinned fictional fixture verifier now converts CRLF to LF before SHA-256 comparison, with the original canonical digest unchanged. No whitespace, JSON reformatting, content or permission edits are normalized. Added regression tests for both newline forms, unchanged no-egress grants, and rejection of changed text/grants/whitespace/lone CR. The lifecycle test now converts file URLs with `fileURLToPath` and uses a Windows junction without symlink privileges; production storage isolation remains unchanged.

Validation: **78 passed / 0 failed / 0 skipped** on Linux with LF working files and independently in a temporary CRLF text checkout. Direct output, baseline reproduction and source hashes: `docs/validation/windows-compatibility.json` and referenced TAP files. This is CRLF simulation on Linux, not Windows execution. Source/fixture budget gates remain active, user-local CNY 3 accounting is retained, no real request or key access occurred. Next: Windows rerun on the fix branch, then merge review and credential-free preflight before the first live fictional dream.

## User-local Windows and first live fictional trial — 2026-10-15

The user supplied Windows terminal output for the correction branch showing **78 passed / 0 failed / 0 skipped**, followed by successful CNY 3 preflight with zero calls/runs and no credential read. The user then entered a key locally and supplied the first live result: completed, two saved scenes, separate wake note and simulated residue, three committed/settled calls, 1,526 input tokens and 251 output tokens. The conservative ledger total is 5,060 micro-CNY (CNY 0.00506), not independently verified provider billing. The key was not shared with this workspace.

Evidence is user-reported terminal output, not an independently observed Windows execution or provider dashboard. The runtime dream journal, generated narrative, IDs and raw user transcript are not published. A body-free aggregate record is in `docs/validation/user-local-first-trial.json`. This establishes one reported live protocol/persistence success; it does not establish general dream quality. No insight was produced, which is valid. Wake notes may reconstruct details and retain their separate non-factual identity; they must not overwrite the original.

Next: user-local credential-free reopen/replay and cue recall, verifying allowance calls remain three. Do not automatically generate slots 2/3 or clear accounting. PR #4 remains the unmerged review branch pending the merge decision.

## User-local reopen, replay and cue recall — 2026-10-15

User-reported follow-up output returned the same completed run after reopen and a literal-match cue candidate with dream origin, fictional material and `isRealityFact:false`. Final preflight still showed three calls, one run and 5,060 micro-CNY held/spent. No additional model call was observed. This completes the first reported user-local fictional loop through generation, persistence, wake, reopened replay and cue recall. It is one successful sample, not general narrative-quality acceptance or an independent provider invoice audit.

The suggested PowerShell `ConvertFrom-Json` pipeline failed on mojibake while direct CLI Chinese output remained readable. The failure occurred in shell decoding after the saved result had been returned, not in model generation or journal parsing. Windows PowerShell native-output decoding is the likely cause; set UTF-8 before piping if that optional presentation is retried. No rerun or data reset is required. Recorded aggregates only; no dream journal or user transcript was copied to the public repository.

## Three-run trial complete; grounded wake correction — 2026-10-15

PR #4 was authorized and merged as 75a9e8519d3550f9e8b689cd0f948fa687ec6d9e; all 49 merged blobs matched the reviewed local tree. User-reported three fictional live runs all completed, consuming the approved nine calls. Final preflight blocked further generation with `call_limit_reached`, three runs and 14,504 micro-CNY conservative ledger total. This is not provider-invoice verification. No additional paid request is authorized; do not reset accounting. Body-free aggregate evidence: `docs/validation/user-local-trial-batch.json`.

Quality review found unsupported additions in wake fragments and unspecified narrative viewpoint. Implemented DeepSeek protocol v2: verbatim excerpt grounding against saved scene events before publication, program-owned scene linkage for integrated wake output, and explicit fictional third-person prompt guidance. Invalid fragments fail without rewrite/repair, retain conservative holds and cannot redispatch the ambiguous attempt after reopen. Protocol identity changes prevent mixing partial old/new contracts; old completed records remain readable, unmodified and not retroactively certified.

The before-fix invented-aftermath probe failed on the merged parent. After correction, **82 passed / 0 failed / 0 skipped** on Linux LF and Linux CRLF simulation. Direct TAP and hashes: `docs/validation/wake-grounding.json`. Four new tests cover grounded excerpt evidence, novel/paraphrased/seed-only rejection, offline-provider rejection and integrated no-publication/no-repair/restart handling. Same-author review; new code has not run on Windows or the real provider. Full review, tradeoffs and next gate: `docs/FIRST-LIVE-TRIAL-REVIEW.md`. Next: separate PR review/merge decision and Windows offline rerun, then separately approve any paid follow-up trial. Generation quality remains unaccepted.

## Grounded wake Windows follow-up — 2026-10-15

The user supplied terminal output after switching to `fix/grounded-wake-fragments`: **82 passed / 0 failed / 0 skipped** on Windows. This is user-reported offline validation; the user's exact checkout HEAD was not independently inspected. The earlier user-reported trial preflight remains nine calls / three runs / 14,504 micro-CNY and blocked by the call cap. No new key, model request or allowance reset. Updated the aggregate evidence in `docs/validation/wake-grounding.json`; no raw transcript or journal published. PR #5 is ready for the user's merge decision after content verification. The new wake policy still needs separately authorized live validation; generation quality remains unaccepted.

## Single grounded-wake follow-up authorized and prepared — 2026-10-15

PR #5 was explicitly authorized and merged as bc95581b6d8380fdd0aba02ab20c3b72daf880d5; all 55 merged blobs matched the reviewed local tree. The user then authorized one additional fictional dream / at most three calls / CNY 3 additional ceiling to validate the revised wake policy. This is a new approval, not a reset of the completed original nine-call trial.

Implemented a separate immutable follow-up configuration and CLI in the same authoritative external Store. It requires completed original accounting, keeps original entries/tombstones/allowance untouched, grants one run/three calls, reports per-trial and cumulative usage, gates key access behind preflight and explicit live mode, preserves unknown holds and supports credential-free completed replay. Review added a billing-allowance identity check so a fake-only request cannot masquerade as the live validation. No secret, real provider request or runtime journal was used during implementation.

Validation: **90 passed / 0 failed / 0 skipped** on Linux LF and a separate Linux CRLF checkout simulation. Eight new tests and source hashes are in `docs/validation/followup-entry.json`. Source/approval/profile limits remain unchanged otherwise. The new Windows entry and real generation quality are unverified. Handoff: `docs/GROUNDED-WAKE-FOLLOWUP.md`. Next: Windows offline rerun and initialization on the work branch, then the already authorized single live trial; no further trial or merge is implicit.

## Grounded-wake follow-up reported complete — 2026-10-15

User-supplied Windows output shows **90 passed / 0 failed / 0 skipped**, successful separate-allowance initialization preserving the old nine calls, and one completed live fictional follow-up. Its wake fragment is a verbatim excerpt of its referenced second scene, with separate residue and empty associations. Three calls settled, 1,650 input / 231 output tokens; conservative ledger amount 5,148 micro-CNY. Final preflight blocked at the new call cap and reported cumulative twelve calls / four runs / 19,652 micro-CNY, preserving the old 14,504 amount. No platform invoice was inspected. Body-free evidence: `docs/validation/user-local-grounded-followup.json`.

The narrow wake-grounding sample passed. General narrative quality is not accepted: gender-neutral viewpoint guidance was not fully followed. No new trial, private input, Asteria work or automatic reset follows. No new code changed after the 90-test run; this update only records user-reported evidence. Raw user output, journal text and key are not published. Proceed to PR #6 merge under the user's standing instruction to handle merges, with expected-head and merged-content verification; GitHub metadata is the merge confirmation. Next: retain known quality limitations and plan any broader evaluation separately from additional spending.

## Offline dream-quality evaluation pack — 2026-10-15

The user accepted preparing a quality-evaluation plan and varied fictional material. Added six independently authored fictional snapshots covering ordinary low-stimulation events, an unfinished intention, unrelated fragments, initial unease, unresolved uncertainty and unavailable/denied/stale context. Every source defaults to no model egress; no paid-evaluation approval is present. No generated runtime journal or private material is included.

The evaluation method separates deterministic mechanism checks from human narrative assessment, permits ordinary/unsettling/unresolved/no-insight dreams, and requires original/wake/association identities to remain distinct. It records concerns instead of mood quotas or an aggregate score that masks authority failures. A blank review template and a proposed three-case initial screen are included; no new paid budget, provider call or broader adapter integration follows.

Validation via `node scripts/check-quality-pack.mjs`: **6/6 contract/file-adapter checks and 6/6 fake persistence/reopen loops**, eighteen fake stage calls, zero real requests. Direct output and fixture/source hashes: `docs/validation/quality-pack-offline.*`. This is not narrative-quality acceptance. Existing runtime files were not changed; the earlier 90-test evidence was not rerun or represented as new quality evidence. Plan: `docs/QUALITY-EVALUATION.md`. Ready for work-branch review under standing repository merge authority; any new live batch still needs explicit fixture-egress and fee approval.

## Three-case quality entry implemented offline — 2026-10-15

PR #7 was merged as 5f17f1c956d3e6695442879dd7fc63eaf7f26e0c. User-reported Windows / Node.js v24.19.0 output after syncing that commit shows six contract/file-adapter checks and six fake persistence/reopen loops passed, eighteen fake stage calls, zero real requests, and quality unassessed. Aggregate only: `docs/validation/user-local-quality-pack.json`; no terminal transcript or journal is published.

Implemented a fixed three-case screening entry in `src/quality-config.js` and `src/quality-cli.js`, reusing the same budgeted core and external Store. Case and protocol-source pins support LF/CRLF, while changed content or grants are refused. Explicit initialization requires all three exact case IDs, fictional egress and a separate CNY 3 ceiling; the proposal remains unapproved. Per-case deterministic requests, ordered execution, credential-free completed replay/read, unresolved-attempt stops, explicit checkpoint resume, cancellation and withdrawal use the existing durable accounting and journal. No existing allowance is reset; status includes both batch and cumulative totals. The existing price-review expiry is retained, not refreshed.

Validation: **103 passed / 0 failed / 0 skipped** on Linux LF and an independent temporary Linux CRLF simulation. Thirteen new tests include actual CLI subprocesses with an in-memory native-fetch replacement, actual child exits before/after committed checkpoints, in-flight cancellation, invalid wake rejection, replay, source withdrawal and default/approval gates. Tests freeze only their child clocks and use dummy credentials; production entry exposes neither clock nor HTTP overrides. Direct output and source hashes: `docs/validation/quality-entry.*`. Same-author review, not an independent-agent audit. No provider call, user initialization, real key, fee or narrative-quality evaluation occurred.

Handoff: `docs/QUALITY-BATCH-ENTRY.md`. Proceed through work-branch PR and merge under standing same-repository authority. Next: native Windows offline validation, then separately confirm the three pinned fictional inputs' egress and additional spending, verify the still-current provider/price profile, and only then prepare real-run commands. No Asteria or other-repository work is authorized by this entry.

## Three-case live quality screen reported complete — 2026-10-15

PR #8 was merged as 75babad9bf2ba446b7330cc4967cc6d63920fb71; all 83 tracked blobs matched the reviewed local tree. User-supplied Windows output reports 103/103 offline tests and credential-free preflight stopped at approval required. The user then explicitly approved the three pinned fictional fixtures' egress, three runs/nine calls and CNY 3 additional ceiling. Official provider pricing was checked against the existing profile before handoff, without extending its expiry or resetting any allowance.

User-reported three live results each completed two scenes and three settled calls. All wake fragments matched their referenced second scenes; reported initial/step affect values remained continuous. The batch used 5,640 input / 751 output tokens and 17,288 micro-CNY in conservative accounting. Final preflight blocked at nine calls; cumulative prior-plus-current totals were 21 calls / seven runs / 36,940 micro-CNY. These are local ledger amounts, not independently verified provider invoices. Windows execution, exact user HEAD and raw HTTP were not independently observed. No key, raw terminal transcript, run ID, narrative or journal is published; only aggregate evidence is in `docs/validation/user-local-quality-screen.json`.

Limited content review records acceptable ordinary/unresolved/empty-association outcomes and one associative combination, while retaining concerns about unexplained goal/affect appraisal, inconsistent gender-neutral narration and wake-excerpt representativeness. New imagined objects in the sparse-context dream remain dream content; they are not automatically an unauthorized background claim. General dream quality remains unaccepted. Full qualified review and offline next steps: `docs/QUALITY-SCREEN-REVIEW.md`.

This is a documentation/evidence-only closeout; no runtime source, prompt or tests changed, no test suite rerun, no new model request and no further paid trial approved. Next: clarify event-to-appraisal criteria and review excerpt/viewpoint concerns with offline fictional comparisons before considering a separately approved real retest. Proceed through work-branch PR/merge under standing same-repository authority.

## Offline appraisal-evidence candidate — 2026-10-15

The user authorized continuing the offline quality improvements after syncing the three-case closeout. PR #9 was merged as 26a6f3edf45bf2731fda654de5fad9542eccce41; all 85 merged blobs matched the reviewed tree. No further paid run, private input or cross-repository work follows.

Implemented an isolated simulator-only candidate protocol/provider and `AppraisalRehearsal` extension of the existing engine/Store. Nonzero goal effects require bounded goal/outcome quotations, and control/uncertainty/affect fields require current-scene excerpts or constrained missing-evidence values. Program-owned appraisal basis survives persistence/reopen and remains dream-derived, non-factual and semantically unassessed. Explicit unknown control/uncertainty use 0.5 only as a compatibility placeholder; this is not a measured midpoint. Quote existence cannot prove meaning: an intentionally irrelevant literal quotation is tested as structurally admitted but not semantically verified. No hidden reasoning or extra explanation call is requested. Candidate viewpoint/excerpt-selection guidance remains unverified on a real model.

Added independently authored scripted fictional probes and a credential-free three-scenario rehearsal command. It preserves separate original/wake/residue/recall identity, exact wake grounding, three-call/output bounds, explicit recovery, cancellation, withdrawal and deletion; it refuses executing old protocol runs. The paid v2 source/pins, allowances, pricing expiry and prior dreams remain unchanged. No new transport or dependency was added; this reuses this project's own MIT code rather than third-party implementation.

Validation: **120 passed / 0 failed / 0 skipped** on Linux LF and a separate temporary Linux CRLF simulation, including 17 new appraisal tests. Three scripted scenarios completed, persisted/reopened/replayed with nine fake stage calls and no duplicate calls in both newline copies. New tests include actual child-process exit with saved evidence, quote failures, semantic-proof limits, cancellation/late responses, source withdrawal, deletion, candidate identity isolation and retained wake rejection. Direct output and source hashes: `docs/validation/appraisal-rehearsal.*`. Same-author review, not an independent-agent audit. Zero real provider requests or key use; no real quality acceptance or native Windows validation claimed.

Handoff and limitations: `docs/OFFLINE-APPRAISAL-EVIDENCE.md`. Next: work-branch PR/merge under standing authority, then Windows offline validation and review of the evidence/placeholder semantics before any paid-protocol integration. New real evaluation requires a separately reviewed protocol, provider/price profile, exact input egress and spending authorization. No requirement to generate positive endings, insights or mood quotas was introduced.

## User-local appraisal Windows validation — 2026-10-15

PR #10 was merged as f16354a78c7392015d4f7ee4c293e780dc85171c, with all 95 tracked blobs matching the reviewed tree. The user supplied Windows terminal output reporting **120 passed / 0 failed / 0 cancelled / 0 skipped / 0 todo**, plus the appraisal checker on Node.js v24.19.0 / win32. All three scripted scenarios completed with persistent evidence, successful reopen, three fake stage calls each and zero duplicate calls; total nine fake calls, zero real requests. Semantic support and quality remained unassessed. Evidence is user-reported, not independent observation or verification of the user's complete checkout identity. Body-free aggregate: `docs/validation/user-local-appraisal-rehearsal.json`; raw user attachment and runtime journals are not published.

The isolated candidate's reported Windows offline gate is complete. No runtime source or prompt changed, no tests rerun in this documentation closeout, no provider call/key/fee, no Asteria change and no paid-protocol integration or new allowance. Remaining gate: review unknown/placeholder interpretation and the added output burden before any real protocol/transport integration. Literal evidence cannot certify semantic support, and scripted responses do not establish dream quality. Any future real retest still needs a separate fixed protocol/input scope, current provider/price review and explicit spending decision.
