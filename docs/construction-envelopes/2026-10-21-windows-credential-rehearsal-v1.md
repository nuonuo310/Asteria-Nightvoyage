# NV-WINDOWS-CREDENTIAL-01 v1 — offline fixture repair

Repository: **nuonuo310/Asteria-Nightvoyage**. Executor: **DeepSeek**. Coordinator/reviewer: **Shenshu**.

This package authorizes bounded diagnosis, ordinary repair and verification of the independent Node credential-lifetime rehearsal on Windows. It authorizes no real credentials, authentication, Codex process, provider inference or production change.

## Authority and opening gate

Code baseline: `f75e4054bd82bbd0c7023f8b3a73536f44d74b97`. The exact authority SHA is supplied in the launch instruction and contains this new control document only. Verify that baseline is its parent and that no other file differs. Read this document, applicable AGENTS.md, README, relevant rehearsal/peer/checker/tests and existing validation before editing.

Verify remote `nuonuo310/Asteria-Nightvoyage`, Node 24+, Windows platform, branch/HEAD, a clean owned worktree, and the hashes below (UTF-8 CRLF/CR normalized to LF, SHA-256):

- `scripts/codex-plan-credential-rehearsal.mjs`: `4a1bf01c0ce7fb1e9949f7f71c2de43fd7ba51e2c19c57656c3db4b09eaecf04`
- `test-support/codex-plan-credential-child.mjs`: `2982792bad4045597ed2e741b69219ccfbdd3cad8a19e73f3716552fa239a9fb`
- `scripts/check-codex-plan-credential-owner.mjs`: `f0cf52f81ac198e1d11ebca83da1aaeda0bdc5550454b85dbbfcb729362650ce`
- `test/codex-plan-credential-owner.test.js`: `fe64baa95941b399f51428d3025b365428a463449dc93e6f4bee4e8f847fdada`
- Read-only comparison: `src/inline-child-environment.js`: `04f7b6217d0d0336e50274248f0e5cfe7b023a230726ccb2ed65a18968900f73`

Create `deepseek/nightvoyage-credential-windows-v1` from the exact authority commit in a separate owned worktree. Do not switch/reset/move another task's checkout. Do not merge, rebase or cherry-pick PR #82 into this branch. Its reviewed source-inventory work remains a separate draft at `a7fa9b373e2111a085a0fa8d8427357939e00210`. Do not continue its lexer work.

## Known observations, not an established root cause

Repeated executor Windows reports show four failures: success returns blocked instead of completed; timeout returns child_failed instead of timeout; failed_child and secret_output return child_failed instead of untrusted_child_output. The coordinator's Linux full suites pass; Linux success does not settle Windows behavior.

Source inspection shows the fixed Node peer rejects any child environment key outside ACCESS_TOKEN, PATH, SystemRoot and WINDIR, and exits with code 2 before its scenario if its initial check fails. The parent starts an absolute Node executable with a newly built environment. Existing project Windows environment handling discusses startup supplementation. This is a **hypothesis**, not proof that supplementation caused these four failures. Do not label it established before a fresh bounded Windows reproduction.

The current rehearsal checker tests successful-final-reply selection and lifetime invariants but does not validate all per-scenario reason categories. Repair that gap within this package so an incorrect blocked reason cannot appear as a passing rehearsal.

## Required outcome

1. Run the original targeted test first on the unchanged authority worktree and retain measured results. Reproduce and classify the earliest failing boundary with the fixed independent Node peer. Add only bounded body-free diagnostics if necessary: fixed check labels, phase, approved key-class presence/counts, exit-code class and observed lease/close ordering. Never return raw stdout/stderr, environment values, usernames, home paths, arbitrary exception strings, tokens or callback contents. Unknown key names need not be printed.
2. Fix the actual fixture launch/validation mismatch or other demonstrated ordinary defect. Preserve strict refusal for unexpected inherited configuration. If Windows requires startup placeholders, use a small explicit policy with case-insensitive key handling, neutral values where appropriate, validation before clearing, and tests. Do not simply accept arbitrary inherited environment keys or copy the parent environment. Do not import or modify a production environment helper merely to bypass review.
3. Keep the rehearsal closed: fixed independent sentinel only, fixed Node peer only, no user-supplied executable, environment, token, endpoint, session or model. Do not read existing account stores, API/OAuth variables or Codex configuration. Any tests of unwanted keys must mint independent dummy values, not inspect real secrets.
4. Preserve all seven scenarios and exact expected status/reason contracts:
   - success: completed / null, one accepted final reply;
   - timeout: blocked / timeout;
   - cancel and late_response: blocked / cancelled, no late publication;
   - failed_spawn: blocked / spawn_failed;
   - failed_child and secret_output: blocked / untrusted_child_output.
   Child closure must precede lease disposal and synthetic revocation. Parent environment must remain untouched; secret references must be disposed. Real remote revocation/cancellation and native containment remain unverified. Do not change expected categories, skip failing cases, swallow stderr, claim success from process exit alone, or replace the peer with hardcoded scenario results.
5. Make `check-codex-plan-credential-owner.mjs` validate exact scenario outcomes as well as lifetime invariants and exit nonzero for a mismatch. Preserve rejection of unexpected arguments/options and accessors.
6. Run meaningful negative tests for the chosen repair: unexpected key rejection; case variants/known Windows placeholders if used; dummy sensitive configuration excluded; malformed/secret output refusal; cancellation/late output; timeout and failed spawn/child; parent environment and lifetime ordering. Platform simulation is supplementary; genuine independent Node child behavior on Windows is required before reporting the Windows repair verified.

## Allowed writes

The previous source-admission package froze these files; this **new** package specifically permits editing only:

- `scripts/codex-plan-credential-rehearsal.mjs`
- `test-support/codex-plan-credential-child.mjs`
- `scripts/check-codex-plan-credential-owner.mjs`
- `test/codex-plan-credential-owner.test.js`

If needed, new files only:
- `scripts/codex-credential-rehearsal-*.mjs`
- `test-support/codex-credential-rehearsal-*`
- `test/codex-credential-rehearsal*.test.js`
- `docs/CODEX-CREDENTIAL-WINDOWS-REPAIR.md`
- `docs/validation/codex-credential-windows-*`

README may gain one concise paragraph; PROGRESS may gain append-only entries. Keep this authority document and all historical evidence immutable. New evidence must distinguish baseline failures, development failures, final results and unavailable platform checks.

## Frozen boundaries

Do not modify src/, real providers/transports, model ports, OAuth/auth protocol, credentials/session handling, native owners, shutdown/cleanup, allowance/relay logic, source manifests or approval pins, PR #82's source-inventory code/manifests/tests, old validation evidence, package dependencies/lockfiles or unrelated tests.

No login, browser authorization, real credential reads, native Codex invocation, real model request, provider/account request, fee, installation/upgrade, machine-wide environment/config change, proxy/network-policy change, real user book/memory, old retained probe cleanup or other-repository write. Independent fixed Node test children and loopback fixtures used by existing offline tests are allowed. Ordinary Git fetch/push and draft-PR publication through existing authorization are allowed; no new login or manual credential-store inspection.

If an old pin refuses changed code, report the exact boundary and stop; do not refresh pins. If a timing change is necessary, justify its bound with measured process behavior rather than hiding a premature-exit failure through larger timeouts.

## Verification and write endpoint

Use actual commands and exit statuses:
- Original targeted baseline: `node --test test/codex-plan-credential-owner.test.js`.
- Final targeted suite including any new fixture tests.
- `node scripts/check-codex-plan-credential-owner.mjs`: all seven exact expected outcomes and lifetime invariants.
- Final full `node --test` once the repair is stable. Do not rerun the entire suite after every ordinary edit; use targeted checks during repair.

Record actual Node/platform, baseline/authority, changed source hashes, commands/counts/exits, fixed diagnostic vocabulary, root-cause confidence and remaining unknowns. Preserve symlink/permission/environment failures if encountered; do not disable unrelated tests or relabel them passing. Coordinator will independently validate Linux after publication. Do not claim a Windows run from simulated platform arguments.

Inspect diff/sensitive additions/worktree; commit, push this dedicated branch and create a **new draft PR to main**, separate from #82. Do not merge or push main. The coordinator resolves the order and any later documentation conflicts between the two PRs.

Continue ordinary debugging and repair within scope without asking for each step. STOP only for authority/hash drift, required frozen-file changes, broader architecture, missing genuine Windows capability, real credentials/auth/native/provider/fees, privacy exposure or unavailable publication.

If publication is blocked, keep tested commits and report exact missing capability. Do not repeatedly retry network or change proxy/security settings. Final receipt: COMPLETE, BLOCKED or TOTAL CONTROL DECISION REQUIRED, commit/PR/evidence paths, actual Windows result, remaining limits. Report COMPLETE only after verified deliverables and the authorized write endpoint are reached.
