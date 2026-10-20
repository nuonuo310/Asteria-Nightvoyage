# Persistent native wait blocked by cleanup; EOF-drain candidate

## Reported Windows outcome

The user supplied the beginning of the same console receipt after the archived tail. [Header evidence](validation/user-local-codex-persistent-wait-cleanup-windows.json) and the [unchanged earlier excerpt](validation/user-local-codex-persistent-wait-excerpt-windows.json) share the fixed identity fingerprint, final clock and both request hashes. They are two supplied portions, not a fabricated complete raw receipt. Actual checkout and native version line remain unreported.

Overall status is **blocked**, reason **temporary_cleanup_failed**. Both pre-forward intents and bounded HTTP completions, the selected same-call disabled-host wait continuation, owned child closure, closed relay and final retained allowance closure/presence are reported. Cleanup tried eight removals with seven scheduled waits totalling 6300 ms and reached cleanup_retry_limit. First and last failures were EBUSY / rmdir / state. No earlier root was scanned, no process restarted and no cleanup signal sent.

Scheduled delay is not measured wall time. The metadata does not identify the busy handle holder, antivirus activity, an escaped descendant, or a unique cause. Owned child closure does not prove descendant termination or directory removal. The completed retained allowance is not permission to repeat the consumed trial. The failed workspace has no persisted cleanup lease; this slice does not search for, reconstruct, relabel or delete it. Its removal remains unconfirmed.

## Reviewed source and hypothesis

The requested owner's normal-success stop path forcibly terminated the child immediately after the checked local response/accounting completion. This is a concrete lifecycle observation in Nightvoyage source, not proof that force termination caused the Windows EBUSY.

The pinned upstream release is OpenAI Codex rust-v0.160.0 commit `a956835d020762cb2b570053af06f643a11c0ecc`:

- [stdio transport](https://github.com/openai/codex/blob/a956835d020762cb2b570053af06f643a11c0ecc/codex-rs/app-server-transport/src/transport/stdio.rs), blob `12552800cf2c79f6e6fe2b75a3e4e8e18c2aaace`: stdin EOF ends the reader and sends ConnectionClosed.
- [app-server lifecycle](https://github.com/openai/codex/blob/a956835d020762cb2b570053af06f643a11c0ecc/codex-rs/app-server/src/lib.rs), blob `d1a622ca8cc94ab626e8e377333c9d875cd18451`: stdio single-client connection closure exits the processing loop; the non-forced branch drains connection/background tasks and shuts down threads.

The candidate gives this existing upstream path an opportunity to run. It is not an official promise of bounded exit or successful filesystem cleanup. GitHub default-branch search was used only to locate the transport file; the reviewed bytes were fetched at the pinned release commit.

## Candidate behavior and verification scope

`scripts/codex-owned-child-stop.mjs` attaches to exactly one already-owned live ChildProcess. On normal completion it closes that child's stdin once and allows 1500 ms for its exit. A deadline, stdin-end failure, cancellation or other failure requests an immediate stop of that child; no restart, PID search, descendant enumeration, account RPC, model request or allowance reset is exposed. Repeated normal-stop calls cannot extend the timer. Exit-code/signal classes, EOF and force-stop requests are reported without raw errors. Graceful zero exit is separate from actual directory cleanup; cleanupProven is always false in this helper.

The persistent local owner uses EOF only after the existing exact-denial/two-journal completion check. Failure/cancellation still requests immediate stop. Its exit handler still closes owned pipe handles; descendant termination remains unknown. The original eight-attempt cleanup lease and all directory identity checks are unchanged. Cleanup still runs after child closure and must independently confirm removal before the overall result can pass.

The old consumed allowance and its Windows failure are preserved. No new native invocation, allowance, directory recovery or login is performed. The existing Windows helper retains its fixed-directory refusal and only adds independent helper tests. Running it against the consumed directory is not a candidate validation strategy. An independent Node peer can test EOF integration, but Windows native effect remains **unverified**.

[Validation](validation/codex-owned-child-eof.json) records independent actual-child tests, integrated peer checks and regression. Actual Node children cover EOF resource release and zero exit, ignored EOF/deadline, immediate cancellation, cancellation during grace, nonzero exit and invalid controls. Integrated tests retain the two-request cap, persisted identity, refusal/cancellation boundaries and repeat-launch block. These do not establish a Windows EBUSY fix, power-loss durability, real model entitlement, universal handler denial or production admission.

Next: use this verified candidate when separately arranging a fresh, explicitly bounded local native observation. Do not reuse, delete or relaunch the consumed persistent-wait v1 trial, and do not broaden cleanup authority to find its old workspace. Real subscription inference remains a separate gated task.

Final Linux Node v24.19.0 evidence: targeted **53/53** (7321.755097 ms); full **1808/1808** (104560.805788 ms), no failures/cancellations/skips. The independent peer reported normal EOF, zero exit, no force-stop request and successful scoped temporary cleanup. Windows effectiveness remains unverified.

The [fresh EOF observation entry](CODEX-EOF-WAIT-OBSERVATION.md) supplies a distinct immutable identity and a separate fixed retained directory. It requires observed normal EOF as well as actual cleanup. The consumed earlier trial remains sealed; native execution of the fresh entry is pending.
