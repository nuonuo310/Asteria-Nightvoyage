# Accounted Codex source admission v1

Status: **offline repository-source inventory verified after review correction**. This slice does not enable generation, authentication, a real provider, native execution or production admission. Authority: [NV-SOURCE-ADMISSION-01 v1](construction-envelopes/2026-10-21-codex-source-admission-v1.md), commit `f75e4054bd82bbd0c7023f8b3a73536f44d74b97`.

## Purpose and roots

The earlier native receipt pinned selected files only and explicitly set `wholeDependencyGraphPinned:false`. This slice replaces that selected-file-only gap with one deterministic, fail-closed and explicitly bounded inventory.

The two inventory roots are:

- Accounted checker: `scripts/check-codex-accounted-dream.mjs`
- Standalone accounted reading projection: `scripts/accounted-codex-content-view.mjs`

The scanner does not import or execute either root. It reads normalized source and follows only the edge classes below.

## Covered edge classes

- Relative static imports and side-effect imports.
- Relative static re-exports.
- Literal dynamic imports, including literal Node built-ins.
- Repository child programs selected through reviewed literal URL construction.
- Fixed repository data and configuration inputs.
- Reviewed executable occurrences, each bound to one owning source hash, one exact source token and one occurrence index.
- External program declarations for the supplied native executable and the platform URL opener; declarations are not content verification and are not emitted as source edges.
- Generated workspace, book, Store and relay state as explicit exclusions.

The reviewed manifest and scanner are `docs/proposals/codex-accounted-source-admission-v1.json` and `scripts/codex-accounted-source-inventory.mjs`. The manifest stores every included path, role, normalized byte length and SHA-256, a sorted-edge hash, counts, the closure hash, and every reviewed child/data/executable occurrence with its source token, owning source SHA-256, occurrence index and note.

## Determinism and fail-closed behavior

Text files (`.js`, `.mjs`, `.json`) are decoded as fatal UTF-8, CRLF and lone CR are normalized to LF, and SHA-256 is taken over the normalized UTF-8 bytes. Source scanning uses a UTF-16 code-unit view, so token indexes and line numbers remain identical to JavaScript string offsets after astral characters. Comments and raw template text are masked; `${...}` template interpolations are scanned as code. `\\xNN`, `\\uNNNN` and `\\u{...}` escapes in string literals are decoded before classifying a literal dynamic import. Other files use exact bytes. Paths and edges are sorted. Traversal terminates on cycles.

Every path is repository-relative and checked segment by segment. Absolute paths, `..` escape, missing files, non-files, symlink traversal, unreviewed packages, unsupported specifiers, computed or concatenated `import(...)`, `require`, `createRequire`, dynamic `Function`, `eval`, `import.meta.resolve`, `vm`, `process.getBuiltinModule` and `process.binding` loading produce bounded fixed diagnostics.

Child-process coverage is fail-closed and call-specific. The scanner recognises named, aliased, namespace and default `node:child_process` imports. It records each actual `spawn`/`spawnSync`/`exec`/`execFile`/`fork` call and rejects executable functions used as values, optional calls, computed member calls, destructured namespace values, dynamic child-process loading and child-process re-exports. Each recorded call must match exactly one reviewed occurrence with the same owning file SHA-256, exact token and occurrence index. A second unreviewed call, a token that appears only in a comment or string, a changed source hash, a changed call or an unused review record blocks the inventory. Reviewed child/data records use the same hash-and-occurrence binding rather than a bare substring check.

The manifest hash is pinned in the checker. A changed manifest, changed nested source, changed edge set, missing file, extra file or role/count mismatch blocks verification before any child, auth operation or user-state directory can be created. The checker has no arguments, writes nothing and performs no network or process operation.

## Actual bounded closure

The reviewed closure contains 65 files: 63 JavaScript sources, 2 fixed data/config JSON inputs, 1 fixed repository configuration input, 2 reviewed repository child programs, 242 sorted edges and 9 distinct Node built-ins. It includes 171 relative static imports, 1 literal dynamic import, 3 reviewed repository-child edges and 5 reviewed executable occurrences. The closure is a repository-source closure only.

The fixed data edge is `examples/adapter-boundary.snapshot.json`, read by the accounted checker. Reviewed child edges select the local observer peer from the accounted and non-accounted fixture owners, and the local RPC peer from the pipe rehearsal. `package.json` is a reviewed configuration input for ESM mode and Node >=24.

The source closure also references the installed native Codex executable and the Windows URL opener. Those are declared as unreviewed external programs, not repository files. Native binary content, operating-system behaviour, dynamic imports hidden in generated data, authenticated forwarding, entitlement and model quality are outside this proof.

## Checker output

`node scripts/check-codex-accounted-source.mjs` prints relative paths, fixed diagnostic codes, counts and hashes only. A verified result still includes:

```json
{
  "generationEnabled": false,
  "productionAdmission": false,
  "credentialsRead": false,
  "realModelRequests": 0,
  "realProviderStatus": "unverified",
  "externalBinaryStatus": "unverified",
  "entitlementStatus": "unverified"
}
```

No approval, trial initialization, native version probe, login, OAuth callback, credential load, Store creation or temporary workspace is part of this command.

## Verification

The review-correction targeted suite covers template interpolation, raw-template/comment inertness, escaped literals, concatenated dynamic imports, aliased and namespaced launches, a second unreviewed launch, hash-mismatched review records, comment-only review tokens, child-process re-exports and astral UTF-16 offsets. On Windows with Node `v24.19.0` the targeted file reports 16 tests, 15 pass and 1 environment skip for unavailable file symlinks. The no-argument checker reports `repository_source_inventory_verified` with zero diagnostics. The full run reports 1,860 tests, 1,847 pass, 1 skip and 12 failures: the same four pre-existing `codex-plan-credential-owner` assertions plus eight frozen-test symlink tests that stop at `fs.symlinkSync` with `EPERM` because this sandbox cannot create Windows file symlinks. No new assertion failure was observed. Exact counts, sanitized assertion values and the environment probe are recorded in [validation/codex-accounted-source-admission.json](validation/codex-accounted-source-admission.json) under `reviewCorrection`.

Exact commands, counts, input hashes and the preserved failure set are recorded in [validation/codex-accounted-source-admission.json](validation/codex-accounted-source-admission.json).

## Remaining limits

This is an honest repository-source inventory, not a general JavaScript parser or call-graph proof. Coverage is limited to the recognised import forms and reviewed occurrences above; unusual executable aliasing or syntax that the scanner cannot attribute yields a bounded diagnostic or manifest divergence rather than an admission claim. It does not validate the installed executable, platform package, operating system, dynamic behaviour, authenticated route, tool exposure, remote cancellation, billing, entitlement or real inference. Generated state is never scanned. Any future computed code-loading edge, additional child program, executable call, package dependency or fixed file requires a reviewed manifest update rather than a silent expansion.
