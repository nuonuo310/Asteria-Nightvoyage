# Offline integration and Windows verification v1

Status: **local reviewed integration and the required Windows offline verification passed**. This is a candidate branch for coordinator review. It does not merge PR #82 or PR #83, write `main`, enable production admission or validate a real provider.

## Authority and opening

- Repository: `nuonuo310/Asteria-Nightvoyage`
- Authority: `917c4e04924d01ff033e738dc91d4909c6145402`
- Authority parent: `fe55734f209f3aaa59b2cdf59bd27b19488a6233`
- Authority diff: only `docs/construction-envelopes/2026-10-21-offline-integration-v1.md`
- Authority package blob: `78ed4451b1d5b581419e71ea669fbb4390b14772`
- Worktree: separate owned candidate worktree
- Branch: `deepseek/nightvoyage-offline-integration-v1`

The authority package and its parent were verified locally. The authority, PR #83 and PR #82 heads are all ancestors of the candidate head. No existing task worktree was switched, reset, cleaned or moved.

## Exact integration

| Order | Exact reviewed input | Local merge commit |
| --- | --- | --- |
| 1 | PR #83 `46ccd57bfd7a8dad64f31c139edc32e8d6395a5f` | `ff4ffdfd5674a2b083f6b4b6879b294a2a093a9b` |
| 2 | PR #82 `a7fa9b373e2111a085a0fa8d8427357939e00210` | `0ec94b2782f11f76c4900633b3ba3c88d90ed9e4` |

PR #82 was integrated from `a7fa9b373e2111a085a0fa8d8427357939e00210`; the older `dec6975` head was not used. There was no rebase, squash or selective source rewrite.

The merge base and merge parents were checked directly. PR #83 changed nine files and PR #82 changed fourteen files from its own base. All seven non-documentation PR #83 files and all twelve non-documentation PR #82 files have Git blobs identical to their exact reviewed heads. The only conflict was `PROGRESS.md`; both historical entries were retained in chronological order. `README.md` merged automatically. The authority package blob is unchanged.

The candidate head before new evidence was `0ec94b2782f11f76c4900633b3ba3c88d90ed9e4`, tree `6d516deceeaef0dd6d25a587d653856cb550df7e`. The executable content exercised by the final suite had tree `786f8fe02ebe4f5434fd8743020c95994ce8bfbc`; that tree is HEAD plus the new capability probe and excludes documentation-only evidence added afterward.

## Windows capability gate

On genuine Windows `10.0.26200.0`, AMD64, Node `v24.19.0`, the new no-argument probe:

```text
node scripts/check-offline-integration-capability.mjs
```

reported exit 0, `capability_available`, file symbolic links `supported`, directory symbolic links `supported`, and owned cleanup `complete`. Each link was read through and its target behavior checked. Only the probe's own temporary link and target paths were removed.

No Developer Mode, elevation, ACL, ownership, security-policy or global Git configuration change was made. A separate invocation with an unexpected argument returned exit 1 and `arguments_rejected`; it emitted neither the argument nor any path. This capability observation is not a containment proof.

## Offline verification

| Check | Result |
| --- | --- |
| `git diff --check` with explicit owned repository selection | exit 0 |
| `node --test test/codex-accounted-source.test.js test/codex-plan-credential-owner.test.js` | 37 tests, 37 pass, 0 fail, 0 skipped |
| `node scripts/check-codex-accounted-source.mjs` | exit 0, `repository_source_inventory_verified`, 65 files, 242 edges, 0 diagnostics |
| `node scripts/check-codex-plan-credential-owner.mjs` | exit 0, seven exact status/reason outcomes |
| `node scripts/check-codex-accounted-dream.mjs` with no arguments | exit 0, independent fake peer, two scenes plus wake, three persisted local intents |
| One final `node --test` | 1873 tests, 1873 pass, 0 fail, 0 skipped, 0 cancelled, 0 todo |

The source checker remained on `exact_reviewed_source_registry`. Registry SHA-256 was `42b5d560366c598dafadce8c376697eb3aa5e3e00c12637bbef63b2738a806d4`, candidate manifest SHA-256 was `fa988b747d2337409641866e114ba1280cc3c0db73ac020630f9314d6e3e4143`, closure SHA-256 was `8055bd5f965737e5bc742648a6b74ef7cc9f559d028bf8956bd07d9c1542b8a1`, and edges SHA-256 was `722dadb4f371be0802a65fd6ba1f71ff586b8db3ba8a5f29ea2fa77e76f7055d`. No pin or registry entry was refreshed or widened.

The credential checker returned the exact outcomes `completed/null`, `blocked/timeout`, `blocked/cancelled` twice, `blocked/spawn_failed`, and `blocked/untrusted_child_output` twice. The accounted-dream checker used its default independent Node peer only; it reported two saved scenes, wake saved, three persisted local HTTP intents, zero replay children, unchanged original content, readable dreambook, withdrawal suppression and complete stage-owned cleanup.

One preliminary `git diff --check` shell invocation omitted explicit repository selection and returned 129 with Git usage text. The command was immediately re-run with the owned repository selected and returned 0; no code failure was observed. The final full suite was run once after executable edits were stable, and its real exit was preserved.

## New executable helper

`scripts/check-offline-integration-capability.mjs` accepts no command-line options or environment overrides. It uses fixed dummy content, attempts file and directory links independently, verifies the link target and read behavior, and removes only its own link, file, directory and temporary root. It emits only fixed labels, Node/platform, bounded error codes (`EPERM`, `EACCES`, `ENOTSUP`, `unknown`) and owned-cleanup status.

Normalized SHA-256, with UTF-8 text and CRLF/lone CR normalized to LF:

```text
fd1be7d5f84f33ff4e9048b333aeb089e33d0ee4234e7af747dbdf3dd6b165d9
```

The raw SHA-256 happened to be identical in this checkout because the file already used LF.

## Boundaries and remaining limits

- No login, real credential read, native Codex process, real model/provider request, fee or account access occurred.
- No Codex configuration, `CODEX_HOME`, model, provider or launcher was changed.
- PR #82, PR #83 and this candidate remain unmerged; `main` was not written.
- This proves a scripted offline Windows combination, not Linux behavior, native containment, production admission, entitlement, remote cancellation, billing or dream quality.
- The exact reviewed source registry remains authoritative. Discovery and candidate manifests cannot approve new sources.
- GitHub publication is reported separately by the draft PR for this branch.

Machine-readable evidence: `docs/validation/offline-integration-windows.json`.