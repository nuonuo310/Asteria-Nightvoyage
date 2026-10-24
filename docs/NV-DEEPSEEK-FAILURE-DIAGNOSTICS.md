# DeepSeek failure diagnostics (offline candidate)

Status: **OFFLINE_DIAGNOSTICS_READY**. The recorded targeted and full gates pass. This candidate is not a paid-dream approval, does not authorize a provider request, and does not make the earlier failed attempt attributable to DNS, TLS, HTTP, accounting or provider receipt.

## Boundary

- Authority envelope: `docs/construction-envelopes/2026-10-24-deepseek-failure-diagnostics-v1.md` on `main@ae44ede83d4df6840820892fc3a56464a5a4c003`.
- Candidate base: draft PR #91, exact head `a94d0909162ce9d544c5d1338cb9096cd97b17e1`.
- Existing one-dream contract, source graph, fixture, authorization, billing rows, run rows and unknown holds remain unchanged.
- The diagnostics runtime is offline-only. It refuses `live` construction and is not a new paid entry.
- No user Store, Key, login, external provider request or public network probe is used by this candidate or its tests; the tests use synthetic Stores and local stand-ins only.

## Receipt model

Failures are written to `nv-deepseek-failure-diagnostics.json` in the selected synthetic/local data directory. The journal is independent of `state.json`, so a publication failure that poisons the main Store can still leave a bounded receipt without rewriting a billing row.

Each receipt contains only fixed enums and bounded local identities:

- `phase`: `pre_dispatch`, `dispatch_intent`, `transport`, `http_response`, `response_read`, `response_protocol`, `cancellation`, `settlement`, `publication`, or `internal`.
- `diagnosticClass`: the closed vocabulary in `scripts/nv-deepseek-failure-diagnostics/policy.mjs`.
- `dispatchIntent`: `none` or `persisted`.
- `transportObservation`: DNS/connect/TLS/write/unknown-native/not-classified, or not attempted.
- `httpStatusClass`: unauthorized, rate-limited, client, server, other non-200, or not observed.
- Delivery, usage and money are always `unknown`; remote cancellation and settlement are always false claims. Body and credential storage flags stay false.
- Contract and terms hashes are included when available. No error text, stack, host, address, status code, credential, request or response body is persisted.

The journal is validated on every reopen, bounded to 32 receipts and written atomically with owner-only permissions. A duplicate run/request identity returns the first receipt rather than increasing calls or rewriting history.

## Classification limits

- A transport class only records the local native error layer. It does not prove whether a remote endpoint received or acted on a request.
- HTTP classes only record the locally observed status class. They do not establish provider billing, usage or cancellation.
- `unclassified` is fail-closed for arbitrary internal exceptions.
- Existing unknown holds stay unknown. The candidate never releases, settles or replays them.
- The current offline runtime deliberately cannot claim live-provider readiness. A future paid admission needs a fresh exact proposal, source identity, approval and local Key action.

## Verification

`test/nv-deepseek-failure-diagnostics.test.js` injects failures at the real runtime/client/transport/ledger boundaries and covers pre-dispatch refusal, persisted dispatch intent, DNS/connect/TLS/write refusal, 401/429/5xx, stream abort/size/read failure, invalid JSON/usage/stage, timeout/cancel/late reply, arbitrary sensitive exceptions, receipt storage failure, publication failure, duplicate request, restart, blocked unknown replay, old-history preservation and sensitive-material exclusion. `scripts/check-nv-deepseek-failure-diagnostics.mjs` is the no-Key offline selfcheck.
