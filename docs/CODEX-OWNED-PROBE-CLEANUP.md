# Accounted-wait Windows cleanup block and bounded correction

The user returned native Codex 0.160.0 / Windows / Node v24.19.0 evidence for the requested implementation `ae534228c270c1670f28665c6213e50adf1f1ecb`. Actual Git HEAD was not included. [Archived bounded receipt](validation/user-local-codex-accounted-wait-cleanup-windows.json). This is user-reported native evidence, not a maintainer Windows reproduction.

## What the v1 report establishes

The exact selected wait disabled-host function output was observed. Two requests were forwarded through the local relay; both had the matching saved pre-forward intent when they reached the fixture. Both direct socket attempts and post-observation records were two, the relay journal was completed, and the owned process and relay were closed. There were no rejected/extra fixture requests, real model requests, credential reads or account authorizations.

Overall status was correctly blocked: temporary cleanup failed with EBUSY. The receipt retained no failing path, syscall, occupant identity or retry timing. Neither a unique cause nor eventual removal of that old directory can be inferred. The old result stays blocked; its completed request-accounting sub-result is not an overall acceptance. No old temporary path is searched, recovered or deleted by the correction.

## V2 correction

The separate accounted-wait owner now leases its freshly created temporary root before starting a child. The lease accepts only the expected probe-root name directly under the resolved OS temporary parent outside Git checkouts, rejects symlinks, records the directory device/inode using BigInt metadata, and can be invoked once with no retargeting argument. Before every attempt it checks the same identity. Replacement stops removal rather than deleting the replacement.

The new cleanup helper removes only that root, with Node's inner maxRetries=0. It makes at most eight attempts for the closed retryable error set, with delays 100, 200, 400, 800, 1600, 1600, 1600 ms: 6300 ms total scheduled backoff. This is a bounded retry schedule, not a filesystem-I/O wall-time or power-loss guarantee. No child, model request, turn, forwarding call or login is restarted; no additional process signal is sent by cleanup. Unknown/non-retryable errors stop immediately. The helper confirms actual absence after a resolved removal promise; a false successful return cannot pass.

New receipts retain only closed error codes, syscall labels and relative location categories such as owned_root, cwd, state, profile or relay_state. No path, arbitrary message, timestamp or body is returned. Successful retry keeps its first failure witness and attempt counters. Exhausted retries remain temporary_cleanup_failed; successful cleanup never erases an earlier protocol failure. The version advances to `codex-local-accounted-wait-denial-v2-owned-cleanup`. V1 receipts are not backfilled with unavailable location metadata.

A directory lease and identity checks are scope guards in a trusted temporary workspace, not an adversarial filesystem/TOCTOU or descendant-containment proof. No forced unlock, administrator privilege, wildcard scan or deletion outside the leased root is added. The identity check failure itself remains blocked. Existing plain exec/wait helpers, forwarding implementation, journal and historic grants stay unchanged.

## Verification and next operation

Tests cover actual removal/absence, one-use/argument guards, transient/permanent mocked EBUSY, exact retry schedule, unknown errors, path-redaction classes, outside-path errors, root replacement, symlink rejection, false removal success, integrated accounting preservation and unchanged earlier-failure status. Mocked busy errors verify control flow; they do not reproduce the unknown Windows occupant. Linux Node v24.19.0: targeted 48/48 and full 1766/1766, zero failures/cancellations/skips; default independent-peer cleanup passed. See [validation](validation/codex-owned-probe-cleanup.json) for final counts and source hashes.

The accounted-wait Windows helper includes these regressions and retains its exact installed 0.160.0 resolver/version check. It performs one fresh local native observation, no login or real model. Windows v2 cleanup remains pending; permanent busy errors still stop with body-free location metadata. Its result cannot establish that the earlier unlocated root was removed. Real-provider/persistent-trial allowance integration and subscription inference remain unverified. No Asteria bridge is implemented.
