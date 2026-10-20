# Windows fresh EOF wait observation accepted within its local scope

The user returned the complete compact receipt for the separately identified local observation requested at e179d104ec5b0204c5837c81eaeb863ef08271c4. [Archived receipt and scope review](validation/user-local-codex-eof-wait-windows.json) are user-reported evidence, not a maintainer reproduction. The supplied native version line is codex-cli 0.160.0, with Node v24.19.0 / win32 in the receipt. Actual Git HEAD was not supplied. The helper-test excerpt supplies duration 7342.9749 ms but no test count; no count is invented.

## Accepted observations

Top-level status is eof_wait_cleanup_observed, with no failure reason. The selected same-call wait denial is observed. The owned child received stdin EOF and exited with code class zero and signal class none, without a force-stop request or restart. The original 1500-ms EOF grace remained fixed. Owned child closure is confirmed separately from the filesystem result.

Scoped temporary cleanup reports removed on **attempt 6**, after **5 retries** and **3100 ms of scheduled waits**. First and last observed failures were EBUSY / rmdir / state. Root identity was checked; there was no prior-directory scan, process restart, cleanup signal or returned path. Scheduled waits are not measured wall time. This confirms removal of this invocation's leased root, not all earlier workspaces.

Both local requests had saved intents before arrival. The transport journal reports completed / two calls, no failure and closed=true. The retained fictional allowance reports the distinct independent-persistent-eof-wait-v1 identity, completed / two calls, closed=true, persistenceFailed=false and ambiguousDispatch=false; retained allowance and relay presence flags are true. Identity fields and canonical fingerprint match the requested candidate. Native client/integration flags are true; the peer is not the independent Node simulator.

These observations qualify the **single native local fixture round**. They do not establish a unique Windows EBUSY cause, rule out recurrence, or show removal of the older failed workspace. The earlier cleanup failure remains an unchanged historical result. No old trial is resumed or repaired, and this completed allowance must not be rerun or reset.

## Boundaries and next dependency

The model label and catalogue are independent fictional fixtures. Real model requests and credential reads are zero; account authorization, real-user approval, real-provider accounting, production admission and dispatch remain false. Native version and fixed identity observations are not real subscription entitlement or whole-source graph qualification. Background/descendant containment, power-loss durability, the terminate=true path and universal handler denial remain unverified. There is no actual subscription dream or formal Asteria bridge result.

Next implementation dependency: bind persistent per-HTTP reservations and their terminal states to the existing DreamModelPort's full two-scene-plus-wake stage/checkpoint lifecycle, first with independent fictional fixtures. The two-call local observation allowance is not relabelled as a real-user/full-dream allowance. Reuse the core's existing typed checkpoints, fixed adapter selection, provenance and withdrawal behavior; do not implement Asteria canonical state or a formal bridge here. A real credential/provider route and explicit subscription inference authorization remain subsequent work.

This evidence-only slice checks the supplied identity/fingerprint, normal EOF, cleanup schedule and two-call accounting consistency. No test suite, probe child, native probe, new allowance, account login or model call is run to manufacture more evidence. Existing 1815/1815 implementation regression remains separate evidence. No user action or repeat is needed for this completed observation.
