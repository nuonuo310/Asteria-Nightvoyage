# NV-DREAM-CLIMATE-LIVE-R3 offline validation

Status: `READY_FOR_HUMAN_OFFLINE_REVIEW_R3`

This receipt covers an offline review candidate only. No real Store was opened,
no key or credential store was read, no provider request was made, and no cost,
retry, ready, merge or deployment occurred.

## Fixed identity

- Implementation start: `9c2137304471ab554cb95d52374e10521e2f4272`
- Start tree: `eeef65e184715aa1176f6f81351eae76ea65d1b5`
- Start parent: `8a7c42116a50261f844097de8427c9790b5d8fcc`
- Authority commit: `40cf8e998abdccdaa2ce10fbae1f425a4fe0c10e`
- Authority document blob: `fd0429fd7ee06d1cd3f6604ae14f60e0078f6afd`
- R3 live identityHash: `aff0b17e450c561908589a68ae2306be7a694c4faf9b044782286ea50a36e3f1`
- Previous R2 live identityHash (history): `54393cfd54ebef8d86afbb2922cc3ab0d8a2657ccf690b695691ac4ddb3528d3`
- Offline identityHash (frozen): `f88fccb0349b0004db6c81deb0261f3d620f06480ab24b4a9c3aee2f94cfae28`
- Release hash (kept as history, not enabled): `ee7ab9fbb6f71b582b442d27000d17f153dbfff1ac378ae4691cbfc869401bae`
- Matrix hash (unchanged): `05247698e2b4e13989f40edb4c25ce8ad21a901a162ea1c9f7556e69dfcce7eb`
- Price snapshot hash (unchanged): `247b8a83415ea54b05b43e2162d74ceef093824f6d2aba1b478028890cc85522`

The new identity covers 21 Phase B execution files. The frozen offline five,
prompt, source, fixture, matrix, price and budget are unchanged.

## R3 behavior

- `secure-input.ps1`, `secure-console.mjs`, `launcher.mjs` and `worker.mjs` now
  stop at `OFFLINE_REVIEW_REQUIRED_R3` before credential supply, Store creation
  or networking. A byte-exact old R1 release cannot enable a live run.
- Provider usage is settled through `BudgetLedger.settle` without a publication
  callback. Content normalization and publication happen only after that
  independent settlement step.
- Invalid wake content after valid usage leaves exactly one wake settlement,
  keeps the three saved draft scenes, records a stable subreason and publishes
  no dream, wake, feeling or residue.
- Receipts separate `settledChargeMicroCny`, `unknownReservedMicroCny` and
  `combinedAccountingMicroCny`. The combined value is explicitly not a provider
  confirmed charge.
- Diagnostics are versioned, bounded to 16 KiB each, retain only selected model
  content/parsed JSON and exclude headers, Authorization, credentials, env,
  envelopes and stacks. Credential-echo rejection remains in the transport.
- A failure stops the batch before B/C. Direct execution of a later run is also
  refused until its complete prefix is committed.

## Synthetic invalid-wake example

This is a new synthetic response, not a reconstruction of the historical wake.
The wake response is otherwise valid but supplies `{status:"present"}` without
the required text. All four provider usages are valid.

```json
{
  "run": {
    "id": "nv-dream-climate-live-a",
    "status": "failed",
    "error": "invalid_wake",
    "validation": {
      "subreason": "firstFeeling",
      "originalError": "invalid_generated_wake_first_feeling"
    },
    "publication": {
      "status": "not_published",
      "wakeRecorded": false,
      "firstFeelingRecorded": false,
      "residueCreated": false
    },
    "draftScenes": [
      {
        "index": 0,
        "event": "杯沿刚被轻敲两下，余音还在桌面下面轻轻碰着。梦里的人把杯子放下，手指仍停在杯沿。",
        "appraisal": {"goalEffect": 0, "control": 0.5, "uncertainty": 0.5},
        "before": {"valence": 0, "arousal": 0.2},
        "delta": {"valence": 0, "arousal": 0},
        "after": {"valence": 0, "arousal": 0.2},
        "appraisalBasis": {"verification": "literal_excerpt_only", "semanticSupport": "not_assessed"},
        "affectDeclaration": {"kind": "unchanged"}
      },
      {
        "index": 1,
        "event": "第二下余音没有散，杯沿顺着一圈看不见的力裂出细白纹。梦里的人伸手去摸，不确定纹路会不会碰到杯里的水。",
        "appraisal": {"goalEffect": 0, "control": 0.5, "uncertainty": 0.6},
        "before": {"valence": 0, "arousal": 0.2},
        "delta": {"valence": 0, "arousal": 0.06},
        "after": {"valence": 0, "arousal": 0.26},
        "appraisalBasis": {"verification": "literal_excerpt_only", "semanticSupport": "not_assessed"},
        "affectDeclaration": {"kind": "estimated"}
      },
      {
        "index": 2,
        "event": "细纹向杯底收拢，杯沿恢复成圆，桌上却留下一小片白屑。梦里的人把杯子挪到桌面另一侧，白屑留在原处。",
        "appraisal": {"goalEffect": 0, "control": 0.65, "uncertainty": 0.4},
        "before": {"valence": 0, "arousal": 0.26},
        "delta": {"valence": 0.04, "arousal": -0.04},
        "after": {"valence": 0.04, "arousal": 0.22},
        "appraisalBasis": {"verification": "literal_excerpt_only", "semanticSupport": "not_assessed"},
        "affectDeclaration": {"kind": "estimated"}
      }
    ],
    "billing": {
      "calls": 4,
      "settledChargeMicroCny": "52222",
      "unknownReservedMicroCny": "0",
      "combinedAccountingMicroCny": "52222",
      "combinedIsProviderCharged": false,
      "rows": [
        {"call": 1, "stage": "scene", "status": "settled", "usage": {"inputTokens": 4855, "outputTokens": 120, "totalTokens": 4975}, "chargedMicroCny": "10670"},
        {"call": 2, "stage": "scene", "status": "settled", "usage": {"inputTokens": 5780, "outputTokens": 120, "totalTokens": 5900}, "chargedMicroCny": "12520"},
        {"call": 3, "stage": "scene", "status": "settled", "usage": {"inputTokens": 6795, "outputTokens": 120, "totalTokens": 6915}, "chargedMicroCny": "14550"},
        {"call": 4, "stage": "wake", "status": "settled", "usage": {"inputTokens": 6761, "outputTokens": 120, "totalTokens": 6881}, "chargedMicroCny": "14482"}
      ]
    },
    "diagnostics": [
      {
        "version": "nv-dream-climate-live-r3-diagnostic-v1",
        "runId": "nv-dream-climate-live-a",
        "requestId": "nv-dream-climate-live-a-wake-3",
        "stage": "wake",
        "originalError": "invalid_generated_wake_first_feeling",
        "subreason": "firstFeeling",
        "responseAvailable": true,
        "contentByteLength": 114,
        "usageValidation": "verified",
        "settlement": "settled",
        "publication": "rejected_non_published",
        "rejected": true,
        "published": false,
        "credentialEchoRejected": false,
        "parsedJson": {
          "fragment": "桌上却留下一小片白屑",
          "associations": [],
          "residue": 0.07,
          "firstFeeling": {"status": "present"}
        }
      }
    ]
  },
  "laterRuns": [
    {"id": "nv-dream-climate-live-b", "status": "queued"},
    {"id": "nv-dream-climate-live-c", "status": "queued"}
  ]
}
```

The historical facts remain separate: the old A run settled three scene calls
for 11,770 micro-CNY, carried an unknown wake reservation of 35,968 micro-CNY,
and had total accounting occupation 47,738 micro-CNY. Those are not rewritten
or used as evidence for the cause of the old invalid wake.

## Verification

- `node --test test/dream-climate-live-r1.test.js test/dream-climate-live-r2.test.js test/dream-climate-live-r3.test.js`: 35 pass / 0 fail, exit 0.
- `node --test test/dream-climate-offline.test.js`: 11 pass / 0 fail, exit 0.
- 51-test registered regression set: 51 pass / 0 fail, exit 0.
- `node scripts/check-generated-wake-offline.mjs`: exit 0; key reads 0, network 0, real model 0, user Store accessed false.
- `node scripts/check-versioned-wake-admission.mjs`: exit 0; credential reads 0, network 0, real model 0, user Store accessed false.
- Phase B admission check: `OFFLINE_REVIEW_REQUIRED_R3`, dummy `DUMMY_REHEARSAL_PASSED`, supplier 0, network 0, real Store 0.
- `git diff --check`: exit 0.

The first R3-focused run was 12 pass / 6 fail. The failures were test
expectations rather than runtime regressions: the existing compatible error for
a nonliteral fragment is `wake_fragment_not_grounded`, the existing transport
compatibility error is `provider_or_validation_failure`, and one accounting
assertion incorrectly compared a combined total with an inequality. The test
expectations were corrected without relaxing production validation; the next
run was 18 / 18 for the R3 file and 35 / 35 for all Phase B files.

## Boundaries

- No key, credential store, environment credential, balance or real
  `state.json` was read.
- No real model, real network endpoint, retry, replacement run, fourth run or
  real Store was used.
- No prompt, emotion rule, source, fixture, matrix, price, budget, shared `src/`
  or frozen offline execution file was modified.
- No ready, merge, deployment or next construction package was started.
