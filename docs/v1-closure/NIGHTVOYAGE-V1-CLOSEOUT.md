# Nightvoyage V1 Closeout Manifest

Date: 2026-10-30

Status: **V1 closeout candidate for total-control review only; final receipt `TOTAL_CONTROL_DECISION_REQUIRED`**. This branch does not authorize R11, a real model call, secure input, price review, a real Store access, release, ready, merge or deployment.

Authority: `docs/construction-envelopes/2026-10-28-dream-climate-offline-v1.md`, section `V1-CLOSEOUT-01`, from commit `b640f7f3942fd7b7742e936a41d787ac15af8f03`.

Implementation base: `main@249d38ab6eb65aeab3207771062b0e51b962bd4d`.

Worktree: `C:\Users\Administrator\Desktop\Asteria-Nightvoyage-NV-V1-CLOSEOUT-01`

Branch: `codex/nightvoyage-v1-closeout-01`

Draft PR base: `main`

## KEEP / EXCLUDE

| Decision | Material | Result |
| --- | --- | --- |
| KEEP | #98 explicit `present / absent / uncertain` firstFeeling record and fixture | Copied unchanged as an independent, explicit fictional record capability. |
| KEEP | #101 generated-wake protocol, records and isolated offline runtime | Extracted and adapted to three scenes plus one wake and four fake calls. |
| KEEP | #103 read-only HTML/terminal reading surface | Extracted as a minimal pure local reader; no page redesign. |
| KEEP | #109 accepted dream-climate and R9 UNKNOWN normalization semantics | Extracted into a new pure `src/dream-climate-protocol.js`. |
| REFERENCE ONLY | #105 fictional-source boundary evidence | No probe code copied. |
| REFERENCE ONLY | #107 rich sample / Phase B history | No sample or Phase B code copied. |
| EXCLUDE | `scripts/fictional-source-probe.mjs`, `scripts/nv-rich-fictional-dream-sample-01/**` | Not present on this branch. |
| EXCLUDE | `scripts/nv-dream-climate-offline-01/phase-b/**`, `single-run-r4/**`, `single-run-r6/**`, `single-run-r8/**`, `single-run-r10/**` | Not present on this branch. |
| EXCLUDE | secure-input, credential supplier, provider transport, price fetch/check, release/pin, allowance, real Store launcher, receipt writer | No new copy from #109. Existing base history remains outside this candidate. |
| EXCLUDE | R1-R10 old live identities, execution manifests, rerunnable entry points and paid-test matrices | Not copied. |
| EXCLUDE | real Key, Store, receipt originals, ledgers or user data | Not read or copied. |
| EXCLUDE | Dreambook decoration, illustration, Memory/Mind/Asteria bridge, automatic recollection or persistent residue | Out of scope. |

## PRODUCT FILES AND PROVENANCE

Final blob means the blob on this candidate before its commit. Requiring a new commit hash for a file that is itself new would create a circular identity; the source commit and source blob are therefore recorded independently.

| File | Source | Source blob | Final blob | Adaptation |
| --- | --- | --- | --- | --- |
| `src/wake-first-feeling.js` | #98 `4e994b5f2ab0c42df4bdb9cff2a95aa9fc96d94f` | `24b1fa3929fdc3c93934489af703d39dfb8f7b28` | `24b1fa3929fdc3c93934489af703d39dfb8f7b28` | Unchanged explicit record module. |
| `fixtures/wake-first-feeling.json` | #98 | `18187ff812ec22e9c3427ef547f3bcbea45dcca8` | `18187ff812ec22e9c3427ef547f3bcbea45dcca8` | Unchanged synthetic fixture. |
| `test/wake-first-feeling.test.js` | #98 | `9c0e0d7f26883e4b0000534ab442eab988291cff` | `9c0e0d7f26883e4b0000534ab442eab988291cff` | Unchanged direct regression. |
| `scripts/wake-first-feeling-demo.mjs` | #98 | `63ec0cd8c93f2af71ff8079a5995eb18ad4b3149` | `63ec0cd8c93f2af71ff8079a5995eb18ad4b3149` | Unchanged synthetic demo. |
| `docs/validation/wake-first-feeling-source-v1.json` | #98 | `22e943bfc4cc573a4d33a142c3cea442ddeb7175` | `22e943bfc4cc573a4d33a142c3cea442ddeb7175` | Unchanged identity evidence for the independent module. |
| `src/generated-wake-protocol.js` | #101 `40589d54838f542e470ed9d45c1f2500193b6eaa` | `5f5d8f34f4387a3ab2579ba8119442711583040d` | `95066d09ea9121f944ce0fb779499f3686df890e` | Uses the pure dream-climate prompt and normalization; identity v2; three scenes plus wake. |
| `src/generated-wake-records.js` | #101 | `837ac451d2e61f9d2ad46735731404341ad4d87c` | `8ef9f30e4513e92c3d9bb613ee67bc2b4611b756` | Three-scene v2 view, audit-free dream material, five-part reading order. |
| `src/generated-wake-runtime.js` | #101 | `6e798ba9c59198e140af2f4c12e1aa8bdf98f9d3` | `1619da9ee3684441df7e91c00680228f71bee219` | Isolated fake runtime for three scenes plus one wake, four calls, R9 normalization; carries the local 3-scene/4-call configuration without changing the shared contract. |
| `fixtures/generated-wake-offline.js` | #101 | `8708d868121ffb82566e94594f9482d47d7f2ef9` | `1c785070d5d3d163fe6d17bd6dd9321d4fd92db6` | Synthetic three-scene fixture; third scene exercises an unbased uncertainty value. |
| `test/generated-wake-offline.test.js` | #101 | `18de75f029546dac26f1182908d49dc8e2effd80` | `85d482975228b6c1a26ae5b555d85097710d9599` | Four-call and three-scene runtime regression. |
| `scripts/generated-wake-story-html.mjs` | #103 `d7f070713aa7d13828efc18667ae66b7a62d257b` | `5d95c43be18158a7e6d2d6e052dd5744b02751d2` | `d492ca3bcb14fcd864dcf9899eee0565c47d93ee` | Pure reader; simulated residue is now visible in the reading order. |
| `test/generated-wake-story.test.js` | #103 | `25eb560bd29674980c58cd0e4bc2fe2bc8eefa99` | `c97b965a177cd492dacf4c50a08331de304e0f48` | Reader semantics and privacy regression rewritten for v2. |
| `src/dream-climate-protocol.js` | #109 `340867606e2356eb02ec1f7388646123c764e70a`, `scripts/nv-dream-climate-offline-01/protocol.mjs` | `42ffb5c1e6e6bf5322b598a36e597e683a4bf57b` | `2a0d404c44961dcf393fc82dce9ef9f43f4f98fc` | Pure climate, three-scene, mechanism/anchor and R9 UNKNOWN audit extraction; no worker, transport, release, price or Store code. |
| `src/contract.js` | `main@249d38ab6eb65aeab3207771062b0e51b962bd4d` | `f524265557eca11632bfe6645ce4fbb2366d026a` | `f524265557eca11632bfe6645ce4fbb2366d026a` | Unchanged. The shared config keeps its two-scene/three-call bound; `src/generated-wake-runtime.js` applies three scenes and four calls only in its local `generatedConfig`. |
| `test/dream-climate-protocol.test.js` | New closeout test | - | `bf0ee1be42324a55be6264b5be248e78fc87ba27` | Climate boundaries, prompt rules, same-scene evidence, R9 audit and material privacy. |
| `test/inline-paid-entry.test.js` | `main`, adapted only as regression expectation | `f1fc755569121c405b7fc891a986ccfcff6caff9` | `00dd99711aa55286b91216222137f353fcc05a53` | Old paid process is now asserted to fail closed; the old graph remains pinned to the base contract and does not admit closeout modules. |
| `test/v1-closeout.test.js` | New closeout test | - | `9cc44ba50c7500bf5901e990ab8f7513ff0b9376` | Manifest, exclusion, independent firstFeeling surface and local runtime-bound regression. |
| `docs/v1-closure/NIGHTVOYAGE-V1-CLOSEOUT.md` | New closeout manifest | - | This file | Review evidence only. |

The pre-existing source inventory is deliberately **not refreshed**. The graph's recorded `src/contract.js` hash remains `850c99572c39930eac150588e379c9af90b5e792159ae46a04f9fad0f9d52ca7`, which still equals the unchanged candidate contract content. The inventory and graph do not admit the new closeout modules. The old paid worker therefore refuses before credential supply, network, Store access or `owner.lock` creation.

## V1 CONCEPT BOUNDARIES

- **Dream**: exactly three fictional scenes. Scene 1 establishes a concrete moment; scenes 2 and 3 each change an observable state; at least one perceptible dream transformation occurs. Climate is a batch-local creative constraint, not a real mood or diagnosis.
- **Wake fragment**: a brief exact contiguous excerpt from one saved scene. It is not a paraphrase, a stitched quotation, a continuation or a new fact.
- **firstFeeling**: an independent `present / absent / uncertain` record, or omitted when no record object exists. It is never derived from appraisal, affect, climate, fragment or residue. The generated runtime writes the automatic generated-wake form; #98's explicit recorder remains a separate caller-requested capability and is not used by the generated runtime.
- **Simulated residue**: an independent `simulated_estimate` in `0..0.3` with bounded decay. It is not a subjective mood, a measured affect value or a persistent feeling record.
- **Later recollection**: append-only explicit user records. Empty means no content and no generated sample. It does not rewrite the dream or backfill a deleted feeling.
- **Technical audit**: R9's `unbasedAppraisalAudit` is for deterministic checkpoint verification. Dream material strips it before persistence, follow-up model material rejects it, and neither default reader renders it.

### firstFeeling write-path matrix

| Surface | Journal | Writer | Boundary |
| --- | --- | --- | --- |
| Explicit caller-requested record | `wakeFirstFeeling` | #98 `recordWakeFirstFeeling` | Preserves request-id idempotence and explicit `present / absent / uncertain`; not called by the generated-wake runtime. |
| Generated wake publication | `generatedWakeJournal` | #101 `prepareGeneratedWakePublication` | The unique automatic firstFeeling path for generated wakes; it does not derive text from appraisal, climate, fragment or residue. |

The two journals serve different admission surfaces and are never used as interchangeable derivations. No generated feeling is synthesized from the explicit journal, and no explicit record is synthesized from the generated journal.

## R10 ACCEPTED FACTS

| Fact | Value |
| --- | --- |
| Run ID | `nv-dream-climate-one-dream-r10-a` |
| Receipt SHA-256 | `e6eb5e63050a12fa2eb8c3fe36347a97da98d78055038a0467cfce4e8042e6d6` |
| Accounting behavior | 4/4 settled |
| Settled calculated amount | `16924 micro-CNY` |
| Unknown hold | 0 |
| Human content decision | Passed Nightvoyage V1 content candidate |
| Known limitation | Structured scene affect remained neutral/unchanged |

`16924 micro-CNY` is a local rule-computed settled accounting amount. It is not a provider invoice or provider billing confirmation.

The R10 body text and real Store are not copied into this repository. The synthetic fixture in this branch is not presented as the R10 result. No R11 was started, no model was called, no fee was incurred and no retry was attempted.

## VERIFICATION RECORD

Targeted command:

`node --test test/dream-climate-protocol.test.js test/generated-wake-offline.test.js test/generated-wake-story.test.js test/wake-first-feeling.test.js test/inline-paid-entry.test.js test/v1-closeout.test.js`

Result: **44 tests, 44 pass, 0 fail, exit 0**. Individual suites were 5, 12, 8, 12, 3 and 4 tests respectively.

`git diff --check` result: **exit 0**.

Complete `npm.cmd test` first run:

- **1942 tests, 1798 pass, 144 fail, exit 1**.
- The first failure is `test/continuity-trial.test.js:8:1`, where the frozen prior-source list rejects the newly present `dream-climate-protocol.js` and generated-wake modules.
- Failures are confined to 11 pre-existing legacy secure-input/source-pin suites: `continuity-trial` (1), `inline-admission` (7), `inline-authorization` (22), `inline-bootstrap` (16), `inline-entry-preflight` (19), `inline-integration-review` (1), `inline-paid-contract` (21), `inline-paid-runtime` (26), `inline-trial-authorization` (29), `response-event-coverage` (1) and `response-event-witness` (1).
- These are the expected fail-closed consequence of adding the authority-mandated product modules under `src/` while deliberately leaving the old inventory and graph unrefreshed. They are not refreshed or reinterpreted by this branch.
- No failure was a Windows symlink/EPERM-only retry case, so the authority did not permit a second complete rerun.

## TOTAL CONTROL DECISION REQUIRED

The authority fixes the formal modules under `src/`, requires the old paid entry to fail closed under the new source identity and forbids refreshing the old source inventory. The same frozen inventory is used by pre-existing legacy suites that test the former positive secure-input paths. Those suites therefore turn red even though the closeout-specific behavior, fail-closed proof and direct regressions pass.

Total control must decide whether the intentional 144 legacy failures are accepted as evidence of the new fail-closed source identity, or whether a separately authorized test/inventory migration should be performed. This branch does not make that decision, does not refresh the old pins, does not mark the PR ready and does not merge it.

## NON-BLOCKING FUTURE ITEMS

- Memory/Mind integration and real long-term state.
- Natural later recollection rather than explicit append-only records.
- Dynamic dream climate or repeated sampling.
- Fuller structured affect semantics.

These are not V1 closeout blockers and are not authorized by this branch.
