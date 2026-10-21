# NV-OFFLINE-INTEGRATION-01 v1 — reviewed PR integration and Windows verification

Repository: **nuonuo310/Asteria-Nightvoyage**. Executor: **DeepSeek**. Coordinator: **Shenshu**.

## Purpose and authority

Integrate the two reviewed offline changes in a separate candidate branch and measure their combined Windows behavior. This is local Git integration, not permission to merge either PR on GitHub or update main. No real model, authentication, credential or native Codex execution is authorized.

Control baseline: `fe55734f209f3aaa59b2cdf59bd27b19488a6233`, tree `9317025c23f59cfc0cf202160295c18a40e24b8b`. The launch instruction supplies the exact authority commit. Its parent must equal that baseline and its diff must contain only this new document.

Reviewed inputs, immutable:
- PR #83: `46ccd57bfd7a8dad64f31c139edc32e8d6395a5f`, branch `deepseek/nightvoyage-credential-windows-v1`. Coordinator review 5605039509 accepts the bounded synthetic credential rehearsal fix.
- PR #82: `a7fa9b373e2111a085a0fa8d8427357939e00210`, branch `deepseek/nightvoyage-source-admission-v1`. Coordinator review 5604555400 accepts exact reviewed offline source admission with limitations.
- Both PRs remain draft and unmerged. Prior reviewed source, pins, evidence and limitations remain authoritative for their own slices.

Read applicable AGENTS.md, README, both prior construction envelopes, both implementation documents, coordinator evidence and relevant tests before work. Verify repository remote, exact commits, clean owned checkout and Node 24+ on genuine Windows. Do not guess a missing commit or work from stale origin/main. Git fetch through existing authorization is allowed. Stop on authority/input drift.

## Opening and integration

1. Inventory current worktrees without changing them. Create one new owned worktree/branch `deepseek/nightvoyage-offline-integration-v1` from the exact authority commit. Do not switch, reset, clean or move either previous task's worktree. Do not change Codex configuration, CODEX_HOME, model/provider or launcher.
2. Integrate exact #83 first, then exact #82 using local merge commits. Preserve original commit identities and review histories; no rebase, squash or selective source rewrite. A merge commit on the candidate branch is permitted; GitHub merge and main writes are not.
3. Coordinator preflight with git merge-tree found a PROGRESS.md content conflict and an automatic README merge. For documentation conflicts only, preserve both historical entries in chronological order, retaining their original claims and limitations. Do not use an entire ours/theirs file to erase the other slice. Preserve the new authority document.
4. Stop on any source/test/registry conflict, unexpected file deletion, changed reviewed source or need to refresh a pin. Resolve ordinary permitted documentation conflicts autonomously.
5. Prove ancestry of authority and both exact reviewed heads. Record Git blob equality for every input changed file except explicitly resolved README/PROGRESS. Files only changed by one input must match that input exactly. Record a combined source tree identity before verification. Discovery cannot authorize new sources.

## Windows capability gate

Before the full suite, run a small independent capability probe using a newly created owned temporary directory and fixed dummy file content. Attempt file and directory symbolic links separately, verify read/target behavior if created, then remove only the owned links and directory. Do not traverse/delete targets outside that directory. No user files, credential stores or old retained probes may be read.

A new fixed script `scripts/check-offline-integration-capability.mjs` may implement this probe. Accept no command-line options, paths or environment overrides. Return only fixed outcome labels, Node/platform, supported/unsupported per link kind, bounded known error codes (EPERM/EACCES/ENOTSUP/unknown), and owned-cleanup status. Never output temporary paths, user identity, raw errors, machine environment values or arbitrary link contents. No subprocess, network, native Codex, real provider or authentication calls.

Unsupported capability is an environment observation, not proof of a product defect or successful containment. Preserve it; do not enable Developer Mode, elevate privileges, change ownership/ACLs, add global safe.directory, modify security policy, install tools, switch accounts, or silently skip/relax symlink tests. No repeated privilege/config experiments.

If capability is absent, still perform the bounded offline checks and one stable full suite below to classify actual combined results. Publish evidence if possible, but retain BLOCKED for the Windows verification gate. Do not spend repeated full runs trying to make environmental failures disappear.

## Verification

All automatic tests use independent fictional fixtures and existing default fake peers. Never pass native executable arguments or run a consumed one-shot entry.

After integration is stable:
- `git diff --check`.
- `node --test test/codex-accounted-source.test.js test/codex-plan-credential-owner.test.js`.
- `node scripts/check-codex-accounted-source.mjs`: exact reviewed registry and zero diagnostics.
- `node scripts/check-codex-plan-credential-owner.mjs`: seven exact status/reason/lifetime outcomes.
- `node scripts/check-codex-accounted-dream.mjs` with no arguments: default independent peer only; two scenes, wake, three persisted local intents, replay/withdrawal invariants. Check source first to verify its default remains fake; do not invoke native Codex.
- One final `node --test` after stable allowed edits. Around 1,873 tests are expected before any new tests; actual runner counts and exits are authoritative, not this estimate.

Preserve all nonzero exits. Separate assertion failures, capability failures and timeouts using bounded diagnostics with actual test names and known error codes. Do not call a failed full run passed because failures seem unrelated. Ordinary failures within new probe/report code may be fixed with focused verification; changes to reviewed runtime/test files require a new coordinator decision.

Record actual Node/platform, authority and input SHAs, merge commits, tested tree and normalized SHA-256 for new executable helpers, commands/exits/counts, capability and cleanup outcomes. Do not reconstruct missing logs or claim power-loss durability, native containment, subscription entitlement, cancellation, billing or dream quality. Linux coordinator validation is a separate later step.

If a normal user-shell rerun is necessary, prepare a bounded reviewed PowerShell helper `scripts/Invoke-OfflineIntegrationVerification.ps1` that:
- derives the candidate repository from its script location, validates origin, candidate branch and exact recorded tested executable hashes before running;
- accepts no paths, tokens, native executable or provider flags;
- runs only the capability probe, the specified targeted/checker commands and one full offline suite, with real exit checks;
- writes sanitized result metadata under a new owned local evidence directory and never overwrites historical receipts;
- does not fetch/pull, change branches, modify config, elevate, retry models or read credentials.
Do not instruct the user to run it yet; coordinator reviews it first. The helper must distinguish unsupported capability from failed assertions and must not overwrite the earlier sandbox result. Do not claim the helper has run in the user shell.

## Write scope

Beyond exact integration of the two reviewed heads, new writes are limited to:
- `scripts/check-offline-integration-capability.mjs`;
- optional `scripts/Invoke-OfflineIntegrationVerification.ps1` as bounded above;
- `docs/OFFLINE-INTEGRATION-REVIEW.md`;
- new `docs/validation/offline-integration-*.json` evidence;
- one concise current-status paragraph in README and append-only PROGRESS entries.

Do not edit source inventory code, candidate manifest, reviewed registry, approved hashes, existing runtime/providers/auth/model ports/core/transport/shutdown/allowances, old tests or evidence, dependencies or lockfiles. Do not broaden source admission. Do not alter other repositories or copy private wishes, real memories, user materials, callback details, raw logs, credentials or sensitive absolute paths to the public repository.

## Publication and terminal receipt

Inspect the final diff, exact input preservation, sensitive additions and worktree before commits. Commit only within scope, push this new branch through existing Git authorization, and create a new draft PR to main. This integrated candidate will contain the two original histories; it does not supersede or close #82/#83 automatically. Explain the integration relationship in its PR body. Leave all three PRs unmerged; coordinator chooses final merge disposition.

If GitHub access is unavailable, retain commits and report the minimal existing-auth push command. Do not repeatedly retry or modify network/proxy/credential settings. Stop before login, real credentials, native Codex, real inference, fees, destructive changes, missing authority or broader writes.

Final receipt: COMPLETE only if integration, required real Windows verification and authorized publication complete; otherwise BLOCKED with the precise gate and completed deliverables. Report commit/PR links, compact test/capability evidence, input preservation, current actual status and one minimal proposed user action if needed. Do not label design, implementation, local fixture execution and real subscription success as the same milestone.
