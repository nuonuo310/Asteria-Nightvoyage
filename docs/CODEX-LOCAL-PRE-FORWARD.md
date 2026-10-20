# Local Codex pre-forward accounting candidate

This slice adds a loopback-only forwarding owner and a separate accounted-wait observation entry. It does not enable a real provider or subscription inference. The existing selected native exec/wait receipts remain unchanged; they prove their fixed local denial outcomes, not outbound real-model accounting.

## What is implemented

`openLocalForwardOwner` owns a loopback HTTP listener, a private file journal and an exclusive create-only lock in an explicit temporary directory outside Git checkouts. Its target must be a literal loopback HTTP responses endpoint; it rejects remote URLs, credentials, query/fragment paths and unknown/getter options. It uses an explicit net.createConnection to the validated loopback address, without a global fetch or default HTTP agent. A direct-socket attempt counter and regression verify that connection path. It never reads an API key, browser credential, account profile or real catalogue. Request bodies stay transient and are not journaled.

For each accepted request it bounds/validates JSON, the fixed model and closed public tool identities, then synchronously saves a LocalDispatchJournal reservation **before** calling fetch. There is no await/caller callback between reserve and dispatch. It permits at most two forwarding intents in that journal. An upstream handler independently reads the saved journal before replying, verifying ordering at actual arrival. Initial reservation failure causes zero upstream requests; completion persistence failure suppresses the upstream reply.

A bounded complete HTTP reply can settle a local transport request, including an HTTP error. That does not mean a dream, model output, billing or semantic content was accepted. Protocol acceptance remains the caller's responsibility. Redirects are not followed; timeout, oversized reply, concurrency conflict and transport failure stop further forwarding. A concurrent attempt can abort the first; it cannot create another outbound request while one is active. Remote cancellation remains unknown.

Reopening a completed journal blocks a third request. Reopening an ambiguous pending journal blocks forwarding and acknowledgement. A stale owner lock or partial-write file also blocks; there is no automatic stale-lock deletion, counter reset, retry or repair API. Tests kill an owned Node child after upstream arrival and observe its saved pending intent plus stale lock; no subsequent dispatch is admitted. Private-directory cleanup in a test does not represent authorized production recovery.

Snapshots use write-and-rename and synchronous callbacks from the existing independent journal. This is not OS power-loss/fsync, malicious rollback or hostile-filesystem qualification. The directory is a trusted caller-owned temporary capability. HTTP limits are 262144 request/reply bytes, 512 input items and bounded read/upstream deadlines. Only the safe content-type response header is forwarded; cookie/authorization/encoding/route controls are checked. Model identity and tool names are shape witnesses, not full schema/handler qualification.

## App-server observation candidate

The new `codex-accounted-wait-owner.mjs` is an explicit derivative of the fixed wait owner at `153f7abe2f76d876f9f705090ab4176e9b9ab52b`. It preserves the fixed nonexistent cell, terminate=false, guard/warning/catalogue/identity checks, one owned child, exact same-call disabled-host function output and two accepted fixture POST cap. Its provider base URL points to the forwarding owner; only that owner can reach the owned fixture service through the selected transport route.

At each fixture arrival the observation owner reads the on-disk relay journal and requires the matching in-flight ordinal. It waits for the relay's second HTTP completion before normal shutdown and reports the two pre-forward checks separately from already-arrived fixture POST records. The default uses the independent peer, so appServerIntegrated/nativeAppServerClient remain false. With an explicit native executable, nativeAppServerClient/appServerIntegrated describe this local client connection only; realProviderAccountingIntegrated and logicalTrialBudgetIntegrated remain false.

The candidate's temporary relay state is removed during ordinary owned cleanup, as are the existing native-probe profiles. It is not a persistent real trial allowance across manual invocations. A real trial needs its own durable approval/run store bound to adapter, model, stage and every forwarding reservation; this slice does not pretend to provide it. Background egress and descendant termination remain unverified. No extra request limit is inferred from one turn/start.

No old exec/wait source or helper, historical auth graph, consumed approval, legacy/API adapter, DreamModelPort core, dream/wake/review/recall body or Asteria state is rewritten. This transport is not AsteriaModelGateway or Context Bridge.

## Verification

The final targeted suite covers the relay, independent journal and accounted-wait owner: 37/37, zero failures/cancellations/skips on Linux Node v24.19.0. It checks pre-arrival persistence for both requests, completion/reopen caps, pending/stale-lock blocks, reserve/settle failure, actual child death, concurrent/cancelled/late replies, redirect/timeout/size bounds, malformed/wrong-model/unknown-tool input, credential headers, path restrictions and cross-owner refusal. Final full regression: 1755/1755, zero failures/cancellations/skips (102938.49108 ms). The accounted-wait peer check observed its exact function denial, two pre-forward checks and owned cleanup.

The initial development fixture omitted the custom tool format object and was rejected; four failing test cases were observed before that run stalled and was interrupted. The fixture was corrected. A preliminary full run was interrupted when the separately scoped observation integration was added. No incomplete run is claimed as passing evidence. A preliminary 1754-test pass preceded the final direct-socket hardening and is not the final source verification. Final commands/results, development summary and file hashes are in [validation](validation/codex-local-pre-forward.json).

## Current next step

`node scripts/check-codex-local-forward.mjs` uses two independent owned loopback servers, no Codex. `node scripts/check-codex-accounted-wait.mjs` defaults to the independent peer. Only `--native-executable` selects a native file; no login, code, cell, host, account, target or token override is exposed. Native pre-forward observation remains pending. No real model, subscription entitlement, universal handler denial, formal Asteria bridge or production admission is claimed.

The Windows helper `scripts/Invoke-CodexAccountedWait.ps1` retains the exact installed 0.160.0 wrapper/platform-package resolver and version check. It runs independent tests, then one new local native accounted-wait observation. It does not repeat the older plain exec/wait probes. The helper is statically reviewed here; Windows execution is separate evidence. No login or real inference is needed. Stop after the final JSON and do not repeat automatically.
