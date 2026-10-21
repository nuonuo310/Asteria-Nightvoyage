# Accounted Codex source admission v1

Status: **offline repository-source inventory verified**. This slice does not enable generation, authentication, a real provider, native execution or production admission. Authority: [NV-SOURCE-ADMISSION-01 v1](construction-envelopes/2026-10-21-codex-source-admission-v1.md), commit `f75e4054bd82bbd0c7023f8b3a73536f44d74b97`.

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
- Reviewed external program edges, declared but not content-verified.
- Generated workspace, book, Store and relay state as explicit exclusions.

The reviewed manifest and scanner are `docs/proposals/codex-accounted-source-admission-v1.json` and `scripts/codex-accounted-source-inventory.mjs`. The manifest stores every included path, role, normalized byte length and SHA-256, a sorted-edge hash, counts, the closure hash and each reviewed explicit edge with its source token and note.

## Determinism and fail-closed behavior

Text files (`.js`, `.mjs`, `.json`) are decoded as fatal UTF-8, CRLF and lone CR are normalized to LF, and SHA-256 is taken over the normalized UTF-8 bytes. Other files use exact bytes. Paths and edges are sorted. Traversal terminates on cycles.

Every path is repository-relative and checked segment by segment. Absolute paths, `..` escape, missing files, non-files, symlink traversal, unreviewed packages, unsupported specifiers, computed `import(...)`, `require`, `createRequire`, dynamic `Function`, `eval`, `import.meta.resolve` and `vm` loading produce bounded fixed diagnostics. A source containing an executable launch must have a reviewed child edge or reviewed external-program edge; otherwise it is unclassified and fails closed.

The manifest hash is pinned in the checker. A changed manifest, changed nested source, changed edge set, missing file, extra file or role/count mismatch blocks verification before any child, auth operation or user-state directory can be created. The checker has no arguments, writes nothing and performs no network or process operation.

## Actual bounded closure

The reviewed closure contains 65 files: 63 JavaScript sources, 2 fixed data/config JSON inputs, 1 fixed repository configuration input, 2 reviewed repository child programs, 241 sorted edges and 9 distinct Node built-ins. It includes 171 relative static imports, 1 literal dynamic import and 3 reviewed repository-child edges. The closure is a repository-source closure only.

The fixed data edge is `examples/adapter-boundary.snapshot.json`, read by the accounted checker. Reviewed child edges select the local observer peer from the accounted and non-accounted fixture owners, and the local RPC peer from the pipe rehearsal. `package.json` is a reviewed configuration input for ESM mode and Node >=24.

The source closure also references the installed native Codex executable and the Windows URL opener. Those are declared as unreviewed external programs, not repository files. Native binary content, operating-system behavior, dynamic imports hidden in generated data, authenticated forwarding, entitlement and model quality are outside this proof.

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

The authority baseline was measured on Windows with Node `v24.19.0`: 1,844 tests, 1,840 pass and 4 pre-existing `codex-plan-credential-owner` failures. The final full run after adding this slice was 1,853 tests, 1,849 pass and the same 4 failures; no new failure was introduced. The new targeted suite is 9/9 passing, and the no-argument checker reports `repository_source_inventory_verified` with zero diagnostics.

Exact commands, counts, input hashes and the preserved failure set are recorded in [validation/codex-accounted-source-admission.json](validation/codex-accounted-source-admission.json).

## Remaining limits

This is an honest repository-source inventory, not a general JavaScript call-graph proof. It does not validate the installed executable, platform package, operating system, dynamic behavior, authenticated route, tool exposure, remote cancellation, billing, entitlement or real inference. Generated state is never scanned. Any future computed code-loading edge, additional child program, package dependency or fixed file requires a reviewed manifest update rather than a silent expansion.
