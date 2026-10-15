# One additional grounded-wake trial

The user approved one additional fictional dream, at most three calls and CNY 3 additional total on 2026-10-15. This is separate from the completed first trial, not a reset or enlargement of its nine-call allowance. The new entry uses the same external directory and authoritative Store, so original entries, tombstones and all original billing rows remain present. New approval is stored in `grounded-wake-followup.json` with a distinct immutable allowance ID. No real request was made while preparing this entry.

## Gates and limits

- Original trial must already contain nine settled calls across three run IDs, matching its original reviewed configuration. Incomplete/unknown accounting blocks initialization.
- Explicit CNY 3 plus fictional-egress flags are required for initialization. Only the existing SHA-256 pinned fictional fixture is admitted. Withdrawn source identities remain blocked across both allowances.
- New allowance: one run, three calls, 3,000,000 micro-CNY; fixed model/pricing and original review expiry (2026-10-16 12:10 UTC). The same conservative CNY 2.2032 reservation applies. Initialization is idempotent; edited configuration/limits conflict.
- Preflight is credential-free and reports previous-trial, follow-up and cumulative accounting separately. It does not grant a new allowance. Run requires `--live`, persisted approval and ready preflight before key access.
- Stable request/session IDs permit only this one follow-up. A different run cannot reuse the allowance. Completed replay reads the saved result without a key; a fake-only request with the same ID is rejected rather than reported as billed validation.
- Partial execution requires explicit `--resume`. Unknown attempts keep their full hold; there is no automatic retry, repair or budget release. SIGINT requests cancellation. No guarantee of cancelling remote billing.
- Storage, withdrawal and external-backup boundaries are unchanged. Do not move/delete the old directory, restore an older state, clear accounting or create a fresh directory to bypass limits.

## Windows offline checks and initialization

From the existing checkout, stop if the first command reports edits or any later command fails:

```powershell
git status --short
git fetch origin
git switch --track origin/feat/grounded-wake-followup
npm.cmd test
node src/followup-cli.js init --approve-budget-cny 3 --allow-fictional-egress
node src/followup-cli.js preflight
```

After merge, main can be used instead. This entry defaults to `%LOCALAPPDATA%\Nightvoyage\first-fictional-trial`; `--data-dir` is only for the original directory if it was explicitly customized. Initialization/preflight never send HTTP or read a key. Expected: old trial nine calls / three runs; follow-up zero / zero; cumulative nine calls. Do not proceed with test failures or `ready:false`.

## First real execution, only after Windows checks

Keep the key local. In the same PowerShell window:

```powershell
$nightvoyageSecureKey = Read-Host 'DeepSeek API Key' -AsSecureString
$nightvoyageKeyPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($nightvoyageSecureKey)
try {
  $env:NIGHTVOYAGE_DEEPSEEK_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($nightvoyageKeyPtr)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($nightvoyageKeyPtr)
}
try {
  node src/followup-cli.js run --live
} finally {
  Remove-Item Env:NIGHTVOYAGE_DEEPSEEK_KEY -ErrorAction SilentlyContinue
  Remove-Variable nightvoyageSecureKey -ErrorAction SilentlyContinue
}
node src/followup-cli.js preflight
```

Use direct output, avoiding the known PowerShell native-output JSON decoding issue. No new key should be sent to chat or written to a repository file. A completed follow-up should expose two scenes, one quoted wake fragment with program-owned scene linkage, independent residue and zero/one unverified association. Compare the quote against its referenced scene and inspect whether extractive recall still feels useful. Passing shape/substring checks does not accept general dream quality.

After success the cumulative count should be twelve calls / four runs and the follow-up cap should block further generation. Record conservative ledger figures separately from provider-invoice amounts. On a failure, stop and inspect; do not rerun blindly or delete a hold.

## Evidence

Linux LF and independent CRLF checkout simulation: **90 passed / 0 failed / 0 skipped**. Eight new tests cover explicit approvals, original-trial prerequisite, unchanged prior ledger rows, idempotent initialization, cumulative totals, one-run/three-call caps across reopen, unknown holds, withdrawal, expiry/config tampering, disabled/missing-approval CLI paths, credential-free completed replay and conflicting fake-only IDs. Evidence and source hashes: `validation/followup-entry.json` and referenced TAP files. Prior ledger rows and completed-journal replay fixtures in these tests are invented, not real provider executions. This is same-author review. New entry has not been executed on Windows or against DeepSeek yet.
