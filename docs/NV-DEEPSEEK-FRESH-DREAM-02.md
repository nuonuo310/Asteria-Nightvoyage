# NV-DEEPSEEK-FRESH-DREAM-02

Status: `OFFLINE_READY_AWAITING_FRESH_APPROVAL`.

This slice adds one separately versioned offline admission candidate for one new
fictional dream. It is built at the exact PR #92 head
`e927b882b07c93285a6a88b2b8c4524db1474af0` on branch
`deepseek/nightvoyage-nv-deepseek-fresh-dream-02`. It does not merge, rebase or
consume PR #91, PR #92, the 2026-10-17 grant or the earlier one-dream grant.

No login, real API Key read, user Store access, `init`, `run --live`, provider
request, paid API call or real model invocation was used while preparing this
slice. All new-dream execution and failure injection used synthetic Stores and a
local loopback stand-in.

## Authority and base

- The construction envelope was published on `main` at
  `249d38ab6eb65aeab3207771062b0e51b962bd4d`. That authority commit only adds
  `docs/construction-envelopes/2026-10-25-deepseek-fresh-dream-02.md` as Git
  blob `83b76b6f06b0bf9c625100a25c35d6e70e4b94c1`.
- PR #92 exact head is `e927b882b07c93285a6a88b2b8c4524db1474af0`; its parent is
  `6eb9a8665f9b387bb7863b0f3320e4c79b36c20a`. PR #92 is stacked over PR #91 head
  `a94d0909162ce9d544c5d1338cb9096cd97b17e1`.
- PR #92 is not a descendant of `main`. Its merge base with the authority commit
  is `dfe56712ebe2384b3f385a4867f8a4e08b5aedfa`. The implementation branch starts
  at the exact #92 head instead of silently rebasing it.
- The initial worktree was clean and there was no `AGENTS.md`.
- The envelope text itself records historical authority
  `main@ae44ede83d4df6840820892fc3a56464a5a4c003`; the separate publication
  commit above is the authority requested for this construction.

## Fresh contract

| Item | Pinned value |
| --- | --- |
| Contract | `docs/proposals/deepseek-fresh-dream-02-20261025.json` |
| Contract id | `nv-deepseek-fresh-dream-02-fresh-admission-20261025` |
| Contract hash | `734dbed92a2839ce147d002ce73d3052b72d98c624f81aa74bde0db5d952e9d0` |
| Contract file SHA-256 | `e3f6718d667e823464365c11f1635767ce28a4209b9bdcc3805e43674d87c06c` |
| Fixture | `examples/deepseek-fresh-dream-02-20261025.json` |
| Fixture id | `fictional-glass-orchard-20261025` |
| Fixture snapshot hash | `694265fed23ae52c407bf5f584056415ca1177d64f8648fa6ecbb7ecc37b1124` |
| Fixture file hash | `00bb025ccf4978ce8a4f665d30e55938e22f96c9cdac6c16065db2bec7e5aae1` |
| Source graph | `scripts/nv-deepseek-fresh-dream-02/runtime-graph.json` |
| Graph hash | `9ea5e2de37153849d5ca477c3f9b26fbcadcc61c32b158e551ceeb134ad43c15` |
| Code hash | `a84faaf539a7954db713da092586940247fcd0496e2ab35148adc278cc354297` |
| Public legacy row identities | not disclosed |
| Allowance | `nv-deepseek-fresh-dream-02-20261025` |
| Authorization field | `nvDeepSeekFreshDream02Authorization` |

The graph is a parse-only static ESM closure of 47 files and 8 builtins. The
fixture source is `fiction-glass-orchard-source` and is independently fictional.
Hashes are identity pins, not approval, quality evidence or a successful provider
receipt.

The public contract discloses only the preserved history's group shape:
four earlier independent `unknown` holds at `2203200` micro-CNY each, one later
one-dream `unknown` hold at `2100352` micro-CNY, and the exact total `10913152`
micro-CNY. It does not disclose any account, request, run, fingerprint or source
identity for those five rows.

During first `init`, inside the local Store owner lock, the implementation verifies
that the actual history has five `unknown` rows in five distinct legacy accounts and
that the rows form exactly those two cardinality and amount groups. It then seals a
schema-2 baseline privately in the local authorization record: hashes of every
legacy account plus the complete account/request/run/fingerprint/source identity of
all five `unknown` rows. The baseline and those identities are not returned by the
authorization API and are not written to the public contract. Missing the fifth row, adding an undeclared `unknown`,
changing a group amount or reaching an invalid row shape fails before a new
authorization, allowance or commit phase is created. Reopen strictly compares the
current complete private baseline with the sealed baseline and never recaptures it.

Validity is `2026-10-25T13:10:19Z` through `2026-10-26T13:10:19Z`. The public
DeepSeek Chinese pricing page was read without authentication from
`2026-10-25T13:10:17.715Z` through `13:10:18.942Z`: HTTP 200, 26,182 bytes,
SHA-256 `556097caba8adfeeed6455714bffd731c7f60db520fcee06a922eba5840663a3`.
It still listed `deepseek-flash` as the mutable alias for
`DeepSeek-V4.1-Flash-1017`, with peak cache-miss input 2 CNY and output 8 CNY per
million tokens. No models API or provider endpoint was called.

## Limits and state separation

- At most one run, three calls, two ordered original scenes and one wake.
- At most 400 output tokens per call and a 3 CNY aggregate reservation ceiling.
- The local request bound is 65,536 input tokens. A complete worst-case call
  reserves `134272` micro-CNY; all three reserve `402816` micro-CNY, below the
  `3000000` micro-CNY ceiling.
- Unknown usage or delivery keeps the complete call hold and stops. It is not
  presented as a settled provider bill, remote receipt or known charge.
- The four earlier unknown holds remain `8812800` micro-CNY. The later one-dream
  unknown remains `2100352` micro-CNY under
  `nv-deepseek-one-dream-20261025`. Their combined `10913152` micro-CNY and every
  original account, request, run and row identity are preserved byte-for-byte.
- The new package uses an independent authorization field and allowance. It does
  not widen the old four-account history guard and does not release, settle,
  retry or extend any old unknown hold.
- The old contract and inventory hashes remain pinned historical values:
  `8c1d8a58070f5100de2714845754ceddac75f1de424656d52d26b59dcc1fcdef` and
  `b4a06baeaeb4d9cf572bb349117d651db993957f413518a4b7ea1caf975a908d`.

## Offline closure and diagnostics

The loopback stand-in commits two ordered fictional scenes and one separate wake
under three settled synthetic calls. The no-Key checker reports three loopback
POSTs, `3240` micro-CNY of synthetic fixture usage, zero credential-supplier
calls, zero provider-network requests and a credential-free replay. Dreambook
keeps the original, wake, later records and attributed opinion separate and does
not show a provider or model label on the reader page.

PR #92's closed classes are wired into this new transport at the real
pre-dispatch, reservation, dispatch, transport, HTTP, stream, protocol,
cancellation, settlement and publication boundaries. Receipts are bounded,
body-free and free of error text, hosts, addresses, status codes, credentials and
arbitrary exception messages. A diagnostic-journal save failure fails closed and
preserves an ambiguous hold. A ledger save failure records
`pre_dispatch / local_storage_failure / none` before any loopback POST. There is
no automatic retry, repair call or provider fallback.

The PR #93 review correction keeps only reviewed native transport codes in a typed,
fixed-message error. Arbitrary native codes, response text and addresses are dropped.
Response abort, read failure and size overflow now carry separate fixed
response-stage codes and map to `response_aborted`, `response_read_failure` and
`response_too_large`. Four local CA-signed HTTPS cases exercise TLS verification
failure, response abort, malformed chunk/read failure and oversize response through the real
`providerResponse` implementation. Each writes one body-free receipt with a
persisted dispatch intent, retains the full unknown hold, and produces the same
receipt after reopen. These are local stand-in observations, not provider or live
evidence.

## Verification

Recorded on Windows x64 with Node `v24.19.0`:

| Gate | Result | Exit | Duration |
| --- | --- | --- | --- |
| New targeted suite | 25/25, zero failures/cancellations/skips | 0 | 101646.0045 ms |
| Six-file targeted suites | 101/101, zero failures/cancellations/skips | 0 | 118016.7093 ms |
| Complete `node --test` | 1980/1980, zero failures/cancellations/skips | 0 | 481978.8939 ms |

The no-Key fresh checker, earlier one-dream checker and failure-diagnostics
checker all passed with exit `0`. The inline entry dependency gate passed with
33 parsed modules, 184 static edges and 4 allowed builtins. Source-graph
regeneration reproduced 47 files, 8 builtins and the pinned graph hash.

The review-fix suite randomizes all five legacy row identities before first
authorization, proves those identities appear nowhere in the public contract, and
verifies that the complete randomized baseline is sealed locally. It then mutates
the sealed fifth row and proves reopen reports a strict-comparison failure. Separate
independent negatives delete the fifth row and change its amount; both fail before
authorization, allowance or commit, with no mutation left outside the temporary
fixture. Four local HTTPS transport negatives remain independent. The old accounts
in the real Store were not read or altered; production code does not repair, release
or rewrite preserved history.

Sensitive-material scanning found no real Key, production private-key,
GitHub-token or provider-token pattern in the new package. The embedded PFX is a
synthetic local HTTPS test identity only. `PRIVATE-*-SENTINEL` strings are
synthetic test-only assertion markers, never credentials. `git diff --check`
passes for the final tree.

## Delivery boundary

A narrow review-fix commit is prepared on the isolated branch and updates the same
draft PR #93. This update creates no new PR, does not merge PR #91/#92/main and does
not alter any prior approval, authorization, ledger row or unknown hold.

This work stops at `OFFLINE_READY_AWAITING_FRESH_APPROVAL`. A coordinator must
review the exact candidate. The user must then make a fresh 3 CNY decision for
this exact contract hash, CNY account, fixture, preserved holds and mutable model
alias. Only after that may a separate local Key step and at most one genuine
trial be considered. No old approval, currency confirmation, result or unknown
hold is reusable as permission.

Remaining blockers:

- `fresh_explicit_contract_approval_required`
- `user_account_currency_confirmation_required`
- `provider_usage_and_bill_remain_unknown`
- `mutable_model_alias_requires_reconfirmation`
- `no_server_side_output_cap_local_bound_only`

Compact machine receipt:
[validation/nv-deepseek-fresh-dream-02-20261025.json](validation/nv-deepseek-fresh-dream-02-20261025.json).
