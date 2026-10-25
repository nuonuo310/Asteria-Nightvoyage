# NV-DEEPSEEK-ONE-DREAM-01

Status: `OFFLINE_READY_AWAITING_FRESH_APPROVAL`.

This slice prepares one new fictional dream under the construction envelope
[2026-10-24-deepseek-one-dream-v1.md](construction-envelopes/2026-10-24-deepseek-one-dream-v1.md),
from PR #89 head `c3e5cdaf366961f5d7ae3cee1e54f673c2701a04` and authority base
`main@dfe56712ebe2384b3f385a4867f8a4e08b5aedfa`. It does not extend, rewrite,
refresh or consume the 2026-10-17 grant. Phase One, old source admission, old
authorizations and old books are unchanged.

No login, real API Key, user Store, `init`, `run --live`, provider request or paid
API call was used while preparing this slice.

## Fresh contract

| Item | Pinned value |
| --- | --- |
| Contract | `docs/proposals/deepseek-one-dream-20261025.json` |
| Contract id | `nv-deepseek-one-dream-fresh-admission-20261025` |
| Contract hash | `c3a87c6085a5551bd1622ad5303ab5f8f810ab02a2009b9fb1712b1c33ba84c5` |
| Fixture | `examples/deepseek-one-dream-20261025.json` |
| Fixture snapshot hash | `401d3ae218ebe569d33f85c2ae2a35e82cf87837c108f4f83dc12210495f4f7c` |
| Fixture file hash | `9d5f8dabe6a8db6f6bc62862f389a9885581d18611d0f61f024d63e988e093a9` |
| Source graph | `scripts/nv-deepseek-one-dream/runtime-graph.json` |
| Graph hash | `70eccc5071db0215163e5c77ac3b5351c5b520c8e75f0fc64a1f40c5bb9e8e5d` |
| Code hash | `2e86af02e666462900b8c81f495958d1c7d00eb93032b28d0ef7244289d85b42` |

The graph is a parse-only static ESM closure of 43 files and 8 builtins. Runtime
loading is constrained to those exact pins. The fixture and code hashes are not
an approval, a successful provider call or a quality verdict.

Validity is `2026-10-24T16:45:00Z` through `2026-10-25T16:45:00Z`. The price basis
is the published CNY peak cache-miss upper bound for `deepseek-flash`: 2 CNY per
million input tokens and 8 CNY per million output tokens, with a 1,048,576-token
context. Public pricing and model documents were re-read without authentication
on 2026-10-24; the reviewed alias and rates still matched. No models API request
was made.

## Limits and state separation

- At most one run, three calls, two ordered original scenes and one wake.
- At most 400 output tokens per call and a 3 CNY aggregate reservation ceiling.
- One complete worst-case call reserves `2100352` micro-CNY. Unknown usage keeps
  that full hold; it is never represented as a settled provider bill.
- The new state uses `nvDeepSeekOneDreamAuthorization` and the separate billing
  account `nv-deepseek-one-dream-20261025`.
- Four historical unknown holds totalling `8812800` micro-CNY must remain
  byte-for-byte unchanged. They are compared against a persisted baseline and
  never captured, settled, released or reused.
- The old contract hash `8c1d8a58070f5100de2714845754ceddac75f1de424656d52d26b59dcc1fcdef`
  and old inventory hash `b4a06baeaeb4d9cf572bb349117d651db993957f413518a4b7ea1caf975a908d`
  remain historical, expired and non-reusable. Source admission was not relaxed.

## Offline closure

The independent loopback stand-in returns two fixed fictional scenes and one
wake. The committed original and `wake_note` remain separate from later records,
recollection, continuation and separately attributed opinion. The Dreambook
projection is readable without showing a provider, adapter or model label to the
reader-facing page; internal accounting and technical receipts still name the
actual model and usage truthfully.

The no-Key checker saves two scenes and one wake, records three settled calls over
three loopback POSTs, reports `3240` micro-CNY of synthetic fixture usage, performs
zero credential-supplier calls and zero provider-network requests, and replays
without another call. A withdrawal suppresses the managed bodies while retaining
the body-free billing record.

## Verification

Recorded on Windows x64 with Node `v24.19.0`:

- New suite: `15/15`, exit `0`, `39055.8591 ms`.
- Targeted paid-entry/Dreambook combination: `58/58`, exit `0`, `42470.1086 ms`.
- Full `node --test`: `1937/1937`, exit `0`, `485487.505 ms`.
- No Windows symlink `EPERM` failure occurred in the final runs.
- `git diff --check` and the sensitive-material scan pass.

The first full development run had one test-harness failure: the timeout case's
polling window expired under suite-wide load before the loopback received the
request. The test was changed to a deterministic 100 ms timeout and 300 ms late
controlled response; the business implementation and contract pins were not
changed. The final full run passes.

Compact machine receipt:
[validation/nv-deepseek-one-dream-20261025.json](validation/nv-deepseek-one-dream-20261025.json).

## Stop boundary

This work stops at `OFFLINE_READY_AWAITING_FRESH_APPROVAL`. A fresh user decision
must confirm this exact contract hash, the 3 CNY ceiling, the fixture, a CNY
account, preservation of old holds and the mutable model alias before a local
`init`. Even after that, `run --live` remains a separate deliberate action with a
locally supplied Key and only one fixed trial. Provider usage and the final bill
remain unknown until then. There is no retry, fallback, renewed price snapshot or
extension by default.

Remaining admission blockers:

- `fresh_explicit_contract_approval_required`
- `user_account_currency_confirmation_required`
- `provider_usage_and_bill_remain_unknown`
