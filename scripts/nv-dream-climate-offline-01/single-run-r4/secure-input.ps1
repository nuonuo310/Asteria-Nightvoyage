param(
    [Parameter(Mandatory = $true)]
    [string]$PriceFile
)

$ErrorActionPreference = 'Stop'

function Stop-R4Input {
    param([string]$Reason)
    throw "dream_climate_r4_secure_input_failed: $Reason"
}

function Invoke-NodeCapture {
    param(
        [string]$NodePath,
        [string]$ScriptPath,
        [string]$EvidenceFile
    )
    $info = New-Object System.Diagnostics.ProcessStartInfo
    $info.FileName = $NodePath
    $info.Arguments = '"' + $ScriptPath + '" --price-file "' + $EvidenceFile + '"'
    $info.WorkingDirectory = $repoRoot
    $info.UseShellExecute = $false
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    $info.CreateNoWindow = $true
    $child = New-Object System.Diagnostics.Process
    $child.StartInfo = $info
    if (-not $child.Start()) { Stop-R4Input 'node_capture_start_failed' }
    $stdoutTask = $child.StandardOutput.ReadToEndAsync()
    $stderrTask = $child.StandardError.ReadToEndAsync()
    $child.WaitForExit()
    $captured = [pscustomobject]@{
        Stdout = $stdoutTask.Result
        Stderr = $stderrTask.Result
        ExitCode = $child.ExitCode
    }
    $child.Dispose()
    return $captured
}

$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..'))
$admissionPath = Join-Path $PSScriptRoot 'check-admission.mjs'
$workerPath = Join-Path $PSScriptRoot 'worker.mjs'
$releasePath = Join-Path $PSScriptRoot 'release.json'
$storePath = 'C:\Users\Administrator\AppData\Local\Nightvoyage\nightvoyage-dream-climate-one-dream-r4-01'

if (-not [IO.Path]::IsPathRooted($PriceFile) -or $PriceFile.Contains('"') -or
    $PriceFile.Contains("`r") -or $PriceFile.Contains("`n")) {
    Stop-R4Input 'price_file_path_invalid'
}
foreach ($required in @($PriceFile, $admissionPath, $workerPath)) {
    if (-not (Test-Path -LiteralPath $required -PathType Leaf)) {
        Stop-R4Input 'required_file_missing'
    }
}
if (Test-Path -LiteralPath $releasePath) { Stop-R4Input 'release_already_present' }
if (Test-Path -LiteralPath $storePath) { Stop-R4Input 'dedicated_store_already_present' }

$nodePath = (Get-Command node -ErrorAction Stop).Source
if (-not [IO.Path]::IsPathRooted($nodePath)) { Stop-R4Input 'node_path_invalid' }

# Admission is completed before any credential prompt. It runs only the local
# dummy rehearsal and metadata checks; it never creates the real Store.
$checkResult = Invoke-NodeCapture -NodePath $nodePath -ScriptPath $admissionPath -EvidenceFile $PriceFile
if ($checkResult.ExitCode -ne 0) { Stop-R4Input 'admission_failed' }
try { $check = $checkResult.Stdout | ConvertFrom-Json } catch { Stop-R4Input 'admission_receipt_invalid' }
if ($check.status -ne 'R4_OFFLINE_ADMISSION_PASSED' -or -not $check.ok -or
    $check.releasePresent -ne $false -or $check.storeExists -ne $false -or
    $check.storeDirectory -ne $storePath -or $check.dummy.status -ne 'R4_DUMMY_REHEARSAL_PASSED' -or
    $check.dummy.calls -ne 4 -or $check.credentialSupplierCalls -ne 0 -or
    $check.networkAttempts -ne 0 -or $check.realModelRequests -ne 0 -or
    $check.realStoreCreated -ne $false -or $check.runCount -ne 1 -or $check.maxCalls -ne 4) {
    Stop-R4Input 'admission_not_ready'
}
if (Test-Path -LiteralPath $storePath) { Stop-R4Input 'dedicated_store_already_present' }
Write-Host ('Admission ready: ' + $check.status)

$releaseJson = @'
{
  "status": "approved_once",
  "profile": "nv-dream-climate-single-run-r4-v1",
  "authorityCommit": "6316e99ad51d1ba2a282406b6667e24e2444f77f",
  "offlineHead": "de14f237d26b7ee82d5be7196162d661a6291b28",
  "offlineTree": "5435202edc9ca444385609d867294d75a882e1e2",
  "offlineParent": "9c2137304471ab554cb95d52374e10521e2f4272",
  "offlineIdentityHash": "f88fccb0349b0004db6c81deb0261f3d620f06480ab24b4a9c3aee2f94cfae28",
  "offlinePromptHash": "9c855d8b3e3b2a55c3f58e36de4a9aee5dec07b706cbf675912632d6ff8dd119",
  "offlineSourceHash": "605d69511cc72c0b0ca60a77be34dafb061e63b57e98db94b778cf7bfce8cbb6",
  "protocolVersion": "nv-dream-climate-offline-v1",
  "runtimeVersion": "nv-dream-climate-single-run-r4-runtime-v1",
  "matrixHash": "b9d123b99fb241423e63bf79d5cc2ed1a761a6bd4c9741425d0918950ab13fde",
  "priceSnapshotHash": "fd3016c7cc74a0eeac704bff94295dd1db3fd86a2bdee5ec464ef91d1c23b796",
  "pricePageSha256": "556097caba8adfeeed6455714bffd731c7f60db520fcee06a922eba5840663a3",
  "allowanceId": "nv-dream-climate-one-dream-r4-001",
  "allowanceCapMicroCny": 160000,
  "perCallMaximumMicroCny": 35968,
  "worstMicroCny": 143872,
  "maxRuns": 1,
  "maxCalls": 4,
  "scenesPerRun": 3,
  "callsPerRun": 4,
  "runId": "nv-dream-climate-one-dream-r4-a",
  "storeDirectory": "C:\\Users\\Administrator\\AppData\\Local\\Nightvoyage\\nightvoyage-dream-climate-one-dream-r4-01",
  "noRetry": true
}
'@

$releasePrepared = $false
$credentialDelivered = $false
$process = $null
$secure = $null
$pointer = [IntPtr]::Zero
$plain = $null
$frame = $null
$frameBytes = $null

try {
    if (Test-Path -LiteralPath $releasePath) { Stop-R4Input 'release_already_present' }
    [IO.File]::WriteAllText($releasePath, $releaseJson, [Text.UTF8Encoding]::new($false))
    $releasePrepared = $true

    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = $nodePath
    $startInfo.Arguments = '"' + $workerPath + '" run --price-file "' + $PriceFile + '"'
    $startInfo.WorkingDirectory = $repoRoot
    $startInfo.UseShellExecute = $false
    $startInfo.RedirectStandardInput = $true
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    $startInfo.CreateNoWindow = $true

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $startInfo
    if (-not $process.Start()) { Stop-R4Input 'r4_worker_start_failed' }

    # The worker prints credential_required only after its own release,
    # identity, price and Store-absence preflight has passed. Nothing is
    # prompted until that exact line arrives with the admitted hashes.
    $noticeTask = $process.StandardOutput.ReadLineAsync()
    if (-not $noticeTask.Wait(60000)) { Stop-R4Input 'r4_worker_preflight_timeout' }
    $noticeLine = $noticeTask.Result
    $notice = $null
    if (-not [string]::IsNullOrWhiteSpace($noticeLine)) {
        try { $notice = $noticeLine | ConvertFrom-Json } catch { $notice = $null }
    }
    if ($null -eq $notice -or $notice.type -ne 'credential_required' -or
        $notice.releaseHash -ne $check.releaseHash -or
        $notice.r4IdentityHash -ne $check.r4IdentityHash -or
        $notice.pricePageSha256 -ne $check.pricePageSha256) {
        $null = $process.WaitForExit(30000)
        $earlyError = $null
        try { $earlyError = $process.StandardError.ReadToEnd() } catch { }
        if (-not [string]::IsNullOrWhiteSpace($earlyError)) { Write-Output $earlyError.TrimEnd() }
        Stop-R4Input 'r4_worker_preflight_refused'
    }
    Write-Host ('Worker preflight ready: first request ' + $notice.nextRequestBytes +
        ' bytes, reservation ' + $notice.nextReservationMicroCny + ' micro-CNY')

    $secure = Read-Host 'DeepSeek API Key' -AsSecureString
    if ($secure.Length -lt 1 -or $secure.Length -gt 2000) { Stop-R4Input 'credential_length_invalid' }
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    $frame = ConvertTo-Json -Compress -InputObject ([ordered]@{ credential = $plain })
    $frameBytes = [Text.Encoding]::UTF8.GetBytes($frame)
    if ($frameBytes.Length -lt 1 -or $frameBytes.Length -gt 8192) { Stop-R4Input 'credential_frame_invalid' }
    $process.StandardInput.BaseStream.Write($frameBytes, 0, $frameBytes.Length)
    $process.StandardInput.BaseStream.Flush()
    $credentialDelivered = $true

    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    $pointer = [IntPtr]::Zero
    $plain = $null
    $frame = $null
    [Array]::Clear($frameBytes, 0, $frameBytes.Length)
    $frameBytes = $null
    $secure.Dispose()
    $secure = $null
    try { $process.StandardInput.Close() } catch { }

    $stdoutTask = $process.StandardOutput.ReadToEndAsync()
    $stderrTask = $process.StandardError.ReadToEndAsync()
    $process.WaitForExit()
    $stdout = $stdoutTask.Result
    $stderr = $stderrTask.Result
    if (-not [string]::IsNullOrWhiteSpace($stdout)) { Write-Output $stdout.TrimEnd() }
    if ($process.ExitCode -ne 0) {
        $receipt = $null
        try {
            $parsed = $stdout | ConvertFrom-Json
            if ($parsed.type -eq 'result') { $receipt = $parsed.value }
        } catch { }
        if ($null -eq $receipt) {
            $receipt = [ordered]@{
                status = 'blocked'; ready = $false;
                reason = 'r4_worker_child_failed_after_credential';
                credentialRequested = $true; credentialDelivered = $credentialDelivered;
                credentialPersisted = $false; networkAttempts = $null;
                realModelRequests = $null; requestOutcomeKnown = $false;
                storeCreated = $null; automaticRetry = $false
            }
            Write-Output (ConvertTo-Json -Depth 8 -InputObject $receipt)
        }
        Stop-R4Input 'r4_worker_run_failed'
    }
} finally {
    if ($pointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
    if ($null -ne $frameBytes) { [Array]::Clear($frameBytes, 0, $frameBytes.Length) }
    $plain = $null
    $frame = $null
    if ($null -ne $secure) { $secure.Dispose() }
    if ($null -ne $process) {
        try {
            if (-not $process.HasExited) { $process.Kill() }
            $process.WaitForExit()
        } catch { }
        $process.Dispose()
    }
    if ($releasePrepared) {
        Remove-Item -LiteralPath $releasePath -Force -ErrorAction SilentlyContinue
    }
}
