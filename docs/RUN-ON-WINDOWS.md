# Local Windows trial handoff

The integrated runner is implemented but no real request was executed for this delivery. Windows execution is pending user-side validation. Linux tests exercise the same JavaScript with stub HTTP. Node.js 24+ and Git are needed; the `.cmd` launcher avoids npm.ps1 execution-policy issues.

## Approved trial budget

The user approved a CNY 3 total trial ceiling on 2026-10-15, at most three dreams and nine calls, fictional material only. This supersedes the earlier CNY 1 ceiling. The [official Chinese pricing page](https://api-docs.deepseek.com/zh-cn/quick_start/pricing/), checked 2026-10-15, lists Flash peak cache-miss input CNY 2 per million tokens, output CNY 8 per million and a 1M context. We use 1,100,000 as a conservative bound covering both common readings of “1M”; it is not a claim that the API accepts that many tokens. Each call therefore reserves CNY 2.2032 with 400 output tokens.

The ledger uses peak cache-miss prices even off peak, so settlement is a conservative upper-cost record, not the exact provider invoice. A provider bill may be lower. No cache discounts or currency conversions are assumed. External price/model bounds remain prerequisites, not facts established by tests. The profile expires 2026-10-16 12:10 UTC.

CNY 1 preflight reports `ready:false` before reading the key. The newly approved CNY 3 ceiling permits this reservation strategy with unchanged call/run limits. A failed/ambiguous request keeps its full hold and may prevent further calls. Do not silently increase limits or clear a ledger.

## Get the code

Use main after PR #3 is confirmed merged. Do not overwrite existing local work.

```powershell
git clone --branch main https://github.com/nuonuo310/Asteria-Nightvoyage.git
cd Asteria-Nightvoyage
npm.cmd test
.\nightvoyage.cmd help
```

Default data directory: `%LOCALAPPDATA%\Nightvoyage\first-fictional-trial`, outside the checkout. `--data-dir` selects an alternative external directory. Retain that directory across every trial run; moving/deleting it breaks budget continuity. Keys are not written there.

## Initialize the approved trial

Initialize the approved CNY 3 ceiling:

```powershell
.\nightvoyage.cmd init --approve-budget-cny 3 --allow-fictional-egress
.\nightvoyage.cmd preflight
```

Changing an existing allowance/configuration conflicts. If a CNY 1 configuration already exists, stop for inspection; do not delete a ledger to bypass it. Approval to raise the trial ceiling does not authorize discarding prior usage. The egress flag covers only the SHA-256 pinned fictional fixture, not private files or Asteria data.

## Key entry only after ready preflight

In the same PowerShell window, prompt without echo and keep the key only in the shell environment. No literal key enters command history. Do not send it to ChatGPT.

```powershell
$nightvoyageSecureKey = Read-Host 'DeepSeek API key (local only)' -AsSecureString
$nightvoyageKeyPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($nightvoyageSecureKey)
try {
  $env:NIGHTVOYAGE_DEEPSEEK_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($nightvoyageKeyPtr)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($nightvoyageKeyPtr)
}
.\nightvoyage.cmd run 1 --live
Remove-Item Env:NIGHTVOYAGE_DEEPSEEK_KEY
```

Slot 1 executes at most two scene calls plus one wake call and prints the typed result. Inspect it before deliberately requesting slots 2 and 3; there is no automatic loop or retry. Ctrl+C requests cancellation; a remote service may already have incurred cost. Enter the key locally again if another slot is requested.

Completed-slot replay returns the saved result without key access or another request. A partial slot requires `run 1 --live --resume`: committed scenes resume, but an unknown uncommitted request stays uncertain and is not resent. `list` and `read <entry-id>` work without a key. Storage/authorization failures require inspection, not blind lock removal or budget increases.

## Persistence and validation boundary

A scene/wake and its settled billing row share one atomic state snapshot. Crash before it exposes neither settlement nor a new stage; the previous hold becomes unknown. Crash after it retains both. There is no separate model-response cache. Withdrawal clears dependent journal bodies while retaining body-free money receipts. Existing single-host, external-backup and physical-erasure limits remain.

Actual DeepSeek compatibility, actual charges, Windows execution and dream quality remain unverified until the corresponding user-local run produces evidence. The shell key-entry example and `.cmd` launcher have not been executed on Windows in this environment.

## Windows compatibility correction

If the first Windows run reports `fixture_changed` and a doubled-drive path in the lifecycle test, use the `fix/windows-fixture-and-paths` review branch until that correction is confirmed merged. Do not reclone or remove runtime data:

```powershell
git status --short
git fetch origin
git switch --track origin/fix/windows-fixture-and-paths
npm.cmd test
.\nightvoyage.cmd init --approve-budget-cny 3 --allow-fictional-egress
.\nightvoyage.cmd preflight
```

Stop if there are existing local edits, a branch conflict or test failures. Identical CNY 3 initialization is idempotent and preserves accounting. No key is needed for these checks. The correction allows only CRLF-to-LF normalization for the pinned fictional fixture; all other content stays covered by the original SHA-256 pin. LF and CRLF simulations pass 78 tests on Linux; a Windows rerun is still needed.

## Reopen and recall verification

The user reported 78/78 tests passing on Windows and one completed fictional live trial. Reopen/completed replay and a literal cue candidate succeeded with the same three total calls and 5,060 micro-CNY conservative ledger amount. These are user-reported results, not independent platform billing evidence; one sample does not establish general generation quality.

Prefer direct output while checking a completed slot. Windows PowerShell can decode native UTF-8 output using a legacy code page when piping into `ConvertFrom-Json`, producing garbled Chinese or invalid JSON even though direct display and stored UTF-8 are valid. If a pipeline is needed, set `[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)` in that shell before capturing native output. This workaround has not been revalidated on the user's machine. A pipeline display error does not require regenerating a dream, deleting data or resetting accounting.
