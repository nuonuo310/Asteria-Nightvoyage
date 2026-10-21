# Accounted Codex source admission v1

Status: **offline exact reviewed repository-source admission verified after third review correction**. This slice does not enable generation, authentication, a real provider, native execution or production admission. Authority: [NV-SOURCE-ADMISSION-01 v1](construction-envelopes/2026-10-21-codex-source-admission-v1.md), commit `f75e4054bd82bbd0c7023f8b3a73536f44d74b97`.

## Purpose and roots

The earlier native receipt pinned selected files only and explicitly set `wholeDependencyGraphPinned:false`. This slice replaces that selected-file-only gap with one deterministic, fail-closed and explicitly bounded inventory.

The two inventory roots are:

- Accounted checker: `scripts/check-codex-accounted-dream.mjs`
- Standalone accounted reading projection: `scripts/accounted-codex-content-view.mjs`

The scanner does not import or execute either root. It reads normalized source and follows only the edge classes below.

Admission authority is the static exact reviewed registry `docs/proposals/codex-accounted-source-reviewed-registry-v1.json`. The scanner and candidate manifest are discovery aids only: they cannot mint approval, and a fresh candidate hash is not admission. Only the registry's exact normalized source hashes, explicit edge records, roots, fixed inputs, external declarations and exclusions can contribute to an admitted closure.

## Covered edge classes

- Relative static imports and side-effect imports.
- Relative static re-exports.
- Literal dynamic imports, including literal Node built-ins.
- Repository child programs selected through reviewed literal URL construction.
- Fixed repository data and configuration inputs.
- Reviewed executable occurrences, each bound to one owning source hash, one exact source token and one occurrence index.
- External program declarations for the supplied native executable and the platform URL opener; declarations are not content verification and are not emitted as source edges.
- Generated workspace, book, Store and relay state as explicit exclusions.

The reviewed registry is `docs/proposals/codex-accounted-source-reviewed-registry-v1.json`. It records every admitted path, role, normalized byte length and SHA-256, a per-file review owner identity/kind, every explicit outgoing import/re-export/dynamic/child/data/config/built-in/executable edge with its source location, and the declared external inputs and exclusions. The candidate manifest `docs/proposals/codex-accounted-source-admission-v1.json` is generated discovery output and is marked `candidate_requires_review`; it stores the closure and hash summary but cannot admit a source without the registry.

## Determinism and fail-closed behavior

Text files (`.js`, `.mjs`, `.json`) are decoded as fatal UTF-8, CRLF and lone CR are normalized to LF, and SHA-256 is taken over the normalized UTF-8 bytes. Source scanning uses a UTF-16 code-unit view, so token indexes and line numbers remain identical to JavaScript string offsets after astral characters. Comments and raw template text are masked; `${...}` template interpolations are scanned as code. `\\xNN`, `\\uNNNN` and `\\u{...}` escapes in string literals are decoded before classifying a literal dynamic import. Other files use exact bytes. Paths and edges are sorted. Traversal terminates on cycles.

Static import and re-export clauses are parsed across line terminators and comments, including default, named and namespace combinations; a clause the scanner cannot attribute fails closed. The lexical pass distinguishes regex literals from division and masks regex bodies, string contents, comments, raw template text and the regex separators while still scanning `${...}` interpolation as code. This is a bounded conservative lexer, not a general JavaScript parser.

Every path is repository-relative and checked segment by segment. Absolute paths, `..` escape, missing files, non-files, symlink traversal, unreviewed packages, unsupported specifiers, computed or concatenated `import(...)`, `require`, `createRequire`, dynamic `Function`, `eval`, `import.meta.resolve`, `vm`, `process.getBuiltinModule` and `process.binding` loading produce bounded fixed diagnostics.

Admission is exact-source-hash-bound. A source path without a registry record, a changed normalized source hash, an unrecorded discovered edge, a registry edge not observed at its recorded location, an unvisited registry file, a missing target, an extra reachable file, an unclassified executable or computed-load edge, path escape or symlink all block. The lexer is used only to discover candidate edges; it is not claimed to be a general JavaScript parser, and a successful scan plus a newly generated manifest hash cannot create or extend the reviewed registry. Ordinary edits therefore require explicit review and a registry update, not automatic re-admission.

Child-process coverage is fail-closed and call-specific. The scanner recognises named, aliased, namespace and default `node:child_process` imports, including combined default-plus-named and default-plus-namespace forms. It records each actual `spawn`/`spawnSync`/`exec`/`execFile`/`fork` call and rejects executable functions used as values, optional calls, computed member calls, destructured namespace values, dynamic child-process loading and child-process re-exports. Each recorded call must match exactly one reviewed occurrence with the same owning file SHA-256, exact token and occurrence index. A second unreviewed call, a token that appears only in a comment or string, a changed source hash, a changed call or an unused review record blocks the inventory. Reviewed child/data records use the same hash-and-occurrence binding rather than a bare substring check.

Both the candidate manifest hash and the reviewed registry hash are pinned in the checker. `verifyInventory` is discovery-only and reports `candidate_only`; the admission path is `verifyReviewedInventory`, which requires the registry. A changed manifest, changed registry, changed nested source, changed edge set, missing file, extra file, role/count mismatch or an attempt to admit a source absent from the registry blocks before any child, auth operation or user-state directory can be created. The checker has no arguments, writes nothing and performs no network or process operation.

## Actual bounded closure

The reviewed closure contains 65 files: 63 JavaScript sources, 2 fixed data/config JSON inputs, 1 fixed repository configuration input, 2 reviewed repository child programs, 242 sorted edges and 9 distinct Node built-ins. It includes 171 relative static imports, 1 literal dynamic import, 3 reviewed repository-child edges and 5 reviewed executable occurrences. The closure is a repository-source closure only.

The fixed data edge is `examples/adapter-boundary.snapshot.json`, read by the accounted checker. Reviewed child edges select the local observer peer from the accounted and non-accounted fixture owners, and the local RPC peer from the pipe rehearsal. `package.json` is a reviewed configuration input for ESM mode and Node >=24.

The source closure also references the installed native Codex executable and the Windows URL opener. Those are declared as unreviewed external programs, not repository files. Native binary content, operating-system behaviour, dynamic imports hidden in generated data, authenticated forwarding, entitlement and model quality are outside this proof.

## Checker output

`node scripts/check-codex-accounted-source.mjs` prints relative paths, fixed diagnostic codes, counts and hashes only. A verified result still includes:

```json
{
  "reviewMode": "exact_reviewed_source_registry",
  "discoveryReviewStatus": "candidate_requires_review",
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

Second review correction: the scanner now inventories multiline and comment-separated static imports and re-exports, tracks combined default/named and default/namespace `node:child_process` imports, and lexes regex literals separately from division, strings and templates. The targeted file now reports 19 tests, 19 pass and 0 skips on Node `v24.19.0`/win32. The new negative fixtures are grouped by syntax category and include all three probes from the `f7e0a84` review. The no-argument checker still reports `repository_source_inventory_verified` with 65 files, 242 edges, zero diagnostics, closure hash `8055bd5f965737e5bc742648a6b74ef7cc9f559d028bf8956bd07d9c1542b8a1` and edges hash `722dadb4f371be0802a65fd6ba1f71ff586b8db3ba8a5f29ea2fa77e76f7055d`; the reviewed manifest hash remains `684a3e24c568fe28d95eb91a1ed1ab6385c2fa307bdd58cfb60bb120b5733172`. The appended evidence is under `secondReviewCorrection` in the validation JSON.

The second-correction full run reports 1,863 tests, 1,859 pass, 4 fail, 0 skipped and exit status 1. The four failures are the same pre-existing `codex-plan-credential-owner` assertions preserved in earlier evidence: `success` returns `blocked` instead of `completed`, while `timeout`, `failed_child` and `secret_output` return `child_failed` instead of `timeout` or `untrusted_child_output`. No new assertion failure and no symlink `EPERM` failure occurred in this run. This does not convert the four preserved failures into acceptance.

Third review correction (`5604119232`): admission no longer relies on the completeness of the handwritten lexer. The static reviewed registry records all 65 normalized source hashes and all 242 explicit edges; every edge was checked against its recorded source line (242/242). The two new division probes produce a candidate manifest with zero unresolved diagnostics and `candidate_requires_review`, but reviewed admission blocks them with `reviewed_source_hash_mismatch`; the two probes are refused 2/2. The latest targeted run reports 24 tests, 23 pass, 0 fail and 1 environment skip (the retained file-symlink probe, unavailable in this sandbox). The checker reports `repository_source_inventory_verified`, `reviewMode: exact_reviewed_source_registry`, 65 files, 242 edges and zero diagnostics. The reviewed registry hash is `42b5d560366c598dafadce8c376697eb3aa5e3e00c12637bbef63b2738a806d4`; the candidate manifest changed from `684a3e24c568fe28d95eb91a1ed1ab6385c2fa307bdd58cfb60bb120b5733172` to `fa988b747d2337409641866e114ba1280cc3c0db73ac020630f9314d6e3e4143` solely to add `reviewStatus: candidate_requires_review`. The closure and edge hashes remain unchanged.

Exact commands, counts, input hashes and the preserved failure set are recorded in [validation/codex-accounted-source-admission.json](validation/codex-accounted-source-admission.json).

## Remaining limits

This is exact reviewed repository-source admission, not a general JavaScript parser, dynamic call-graph proof, native-binary proof or real-provider capability. Coverage is exactly the registry's reviewed source hashes and explicit edge locations; syntax or an edge that cannot be matched to that registry blocks admission rather than being inferred as covered. The discovery lexer may miss or over-approximate syntax, but it cannot extend the admitted set: a new source, changed hash, new executable/load edge, child program, package dependency or fixed file requires an explicit registry update reviewed by the coordinator. It does not validate the installed executable, platform package, operating system, dynamic behaviour, authenticated route, tool exposure, remote cancellation, billing, entitlement or real inference. Generated state is never scanned.
