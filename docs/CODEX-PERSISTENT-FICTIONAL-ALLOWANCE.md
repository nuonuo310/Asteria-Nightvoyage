# Persistent fictional allowance and pre-forward binding

This slice adds a retained, explicit-create local allowance candidate and binds it to the existing loopback forwarding owner. It uses only independent fictional fixtures. It does not record real user approval, authorize a subscription turn, prove a real model entitlement, or implement an Asteria bridge.

## Identity and lifecycle

`scripts/codex-fictional-trial-store.mjs` stores a closed identity: approval ID, run ID, CodexAdapter, gpt-5.6-sol, protocol version, source/fixture SHA-256 identifiers, immutable expiry, exactly two HTTP calls, and confirmation origin `independent_fictional_fixture`. The source/fixture identifiers in the rehearsal are synthetic identities, not downloaded model metadata or user sources. An identity fingerprint and per-request ID/hash/ordinal are saved without request/reply bodies, credentials, provider thread IDs or filesystem paths. Only this module can issue an allowance object accepted by the forwarding owner.

Create is explicit and refuses an existing record; open refuses a missing record, wrong identity, partial write, malformed state, stale lock, or clock earlier than the saved clock. Opening saves an advanced clock without extending expiry. Observed expiry becomes terminal; it cannot be undone by reopening with an earlier clock. The existing caller-owned directory is retained on close. There is no automatic directory search, record replacement, counter reset, stale-lock removal, expiry renewal or approval repair. Creating a different directory remains possible in the independent test harness; this is not yet an authoritative real-user approval registry.

A reservation saves a pending attempt before returning. Duplicate request IDs are refused even with a different body hash. Only the owner that reserved an attempt can acknowledge its HTTP completion. Reopened pending state is ambiguous and cannot be acknowledged or redispatched. Cancellation before dispatch consumes zero calls and remains terminal; cancellation after reservation retains the call and suppresses late completion. A reply already in flight can settle after expiry without admitting another request. HTTP completion means a bounded transport reply, never accepted inference, settled billing, or quality approval.

## Optional loopback integration

`openLocalForwardOwner` accepts an optional branded `fictionalTrial`. The previous local observation path remains usable without it and reports that absence explicitly. With it, startup requires matching relay/trial counts. The relay saves its own intent, then saves the logical trial intent and SHA-256 of the exact outbound bytes, with no asynchronous gap before the owned loopback socket is started. Every upstream fixture arrival independently checks both on-disk pending records.

Completion saves the relay first, then the logical attempt, before publishing reply bytes. The two files are deliberately **not** claimed to be an atomic transaction. Failure between either pair of saves is conservative: it suppresses the reply and leaves a count mismatch, pending attempt, partial write or failed owner that blocks another dispatch. These cases have direct tests. Reopening both retained directories preserves the two-call cap. A new empty relay cannot reset the retained logical trial.

The allowance owner and relay have separate exclusive locks. The caller must close the relay before closing the allowance. Closing a relay never deletes the retained allowance or releases its owner. The standalone rehearsal deletes its own independent fixture root only after recording the result; it never scans or accesses user stores.

This does not change the existing native accounted-wait owner/helper into a persistent-trial implementation. Its historical Windows result remains a proof of the temporary local observation path. Native integration of the retained allowance, stage/checkpoint binding for an entire dream, an authoritative real-user approval entry, credential/provider forwarding, and actual subscription inference are subsequent dependencies. No login, account read, native child or real model is needed for this slice.

## Storage and verification limits

Snapshots use synchronous write-to-exclusive-next-file and rename, plus create-only owner locks. Tests include an actual owned child killed after reservation: the pending record and stale lock block reopen. This is not fsync/power-loss, hostile filesystem, malicious rollback, system clock authenticity, universal handler denial, remote cancellation or descendant containment qualification. The filesystem and caller-owned directory are trusted. No recovery API is offered.

Run `node scripts/check-codex-persistent-forward.mjs` for the standalone two-POST/reopen/cap check. It has no flags or native executable override. Targeted verification covers allowance identity, per-request replay, expiry/clock rewind, cancellation, persistence failures, symlinks, exclusive owners, actual process death and dual-intent loopback arrival. Exact results are in [validation](validation/codex-persistent-fictional-allowance.json).

Next: integrate the retained identity into a separately bounded native local fixture owner, preserving its existing tool denial/cleanup evidence, before considering a real-user approval and credential-bearing provider route. Real subscription inference remains disabled and requires a new explicit user step.

Linux Node v24.19.0 verification: targeted 71/71 (7302.921132 ms); full regression 1789/1789 (99684.361331 ms), zero failures/cancellations/skips. A Windows-only junction refinement in the test fixture received a subsequent 15/15 Linux allowance rerun; it does not constitute Windows validation. The standalone check observed two dual-intent arrivals and zero additional POSTs after reopen/cap.
