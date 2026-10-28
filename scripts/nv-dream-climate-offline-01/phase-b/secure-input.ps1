param(
    [Parameter(Mandatory = $true)]
    [string]$PriceFile
)

$ErrorActionPreference = 'Stop'

function Stop-SecureInput {
    param([string]$Reason)
    throw ('dream_climate_live_secure_input_failed: ' + $Reason)
}

function Invoke-NodeCapture {
    param([string]$NodePath, [string]$ScriptPath, [string]$EvidenceFile)
    $info = New-Object System.Diagnostics.ProcessStartInfo
    $info.FileName = $NodePath
    $quote = [string][char]34
    $info.Arguments = $quote + $ScriptPath + $quote + ' --price-file ' + $quote + $EvidenceFile + $quote
    $info.WorkingDirectory = $repoRoot
    $info.UseShellExecute = $false
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    $info.CreateNoWindow = $true
    $child = New-Object System.Diagnostics.Process
    $child.StartInfo = $info
    if (-not $child.Start()) { Stop-SecureInput 'node_capture_start_failed' }
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
$adapterPath = Join-Path $PSScriptRoot 'secure-console.mjs'
$checkPath = Join-Path $PSScriptRoot 'check-admission.mjs'
$releasePath = Join-Path $PSScriptRoot 'release.json'
$storePath = 'C:\Users\Administrator\AppData\Local\Nightvoyage\nightvoyage-dream-climate-live-01'

if (-not [IO.Path]::IsPathRooted($PriceFile) -or $PriceFile.Contains([string][char]34) -or
    $PriceFile.Contains([string][char]13) -or $PriceFile.Contains([string][char]10)) {
    Stop-SecureInput 'price_file_path_invalid'
}
foreach ($required in @($PriceFile, $adapterPath, $checkPath)) {
    if (-not (Test-Path -LiteralPath $required -PathType Leaf)) {
        Stop-SecureInput 'required_file_missing'
    }
}
if (Test-Path -LiteralPath $releasePath) { Stop-SecureInput 'release_already_present' }
if (Test-Path -LiteralPath $storePath) { Stop-SecureInput 'dedicated_store_already_present' }

$nodePath = (Get-Command node -ErrorAction Stop).Source
if (-not [IO.Path]::IsPathRooted($nodePath)) { Stop-SecureInput 'node_path_invalid' }

$releaseBase64 = 'ewogICJzdGF0dXMiOiAiYXBwcm92ZWRfb25jZSIsCiAgIm9mZmxpbmVIZWFkIjogIjExOWE2YmE5MDljZmFhNzViMjliZDNkNGM0ZmNmOTUwMDk5NmUyYmQiLAogICJvZmZsaW5lVHJlZSI6ICJhYjQxNzFiOGYxOGZlNDkwNjBkNGY2NDljNGIxNjcyZDA5MjAwYWJlIiwKICAib2ZmbGluZVBhcmVudCI6ICI3ZWMyNGU2ZDkwYzQ1YWY2N2ZlMjUxZmM2NWYyMWM0ZDI1N2JmNDc2IiwKICAib2ZmbGluZUlkZW50aXR5SGFzaCI6ICJmODhmY2NiMDM0OWIwMDA0ZGI2YzgxZGViMDI2MWYzZDYyMGYwNjQ4MGFiMjRiNGE5YzNhZWUyZjk0Y2ZhZTI4IiwKICAib2ZmbGluZVByb21wdEhhc2giOiAiOWM4NTVkOGIzZTNiMmE1NWMzZjU4ZTM2ZGU0YTlhZWU1ZGVjMDdiNzA2Y2JmNjc1OTEyNjMyZDZmZjhkZDExOSIsCiAgIm9mZmxpbmVTb3VyY2VIYXNoIjogIjYwNWQ2OTUxMWNjNzJjMGIwY2E2MGE3N2JlMzRkYWZiMDYxZTYzYjU3ZTk4ZGI5NGI3NzhjZjdiZmNlOGNiYjYiLAogICJwcmljZVNuYXBzaG90SGFzaCI6ICIyNDdiOGE4MzQxNWVhNTRiMDViNDNlMjE2MmQ3NGNlZWYwOTM4MjRmNmQyYWJhMWI0NzgwMjg4OTBjYzg1NTIyIiwKICAicHJpY2VQYWdlU2hhMjU2IjogIjU1NjA5N2NhYmE4YWRmZWVlZDY0NTU3MTRiZmZkNzMxYzdmNjBkYjUyMGZjZWUwNmE5MjJlYmE1ODQwNjYzYTMiLAogICJhbGxvd2FuY2VDYXBNaWNyb0NueSI6IDQ4MDAwMCwKICAibWF4UnVucyI6IDMsCiAgIm1heENhbGxzIjogMTIsCiAgInN0b3JlRGlyZWN0b3J5IjogIkM6XFxVc2Vyc1xcQWRtaW5pc3RyYXRvclxcQXBwRGF0YVxcTG9jYWxcXE5pZ2h0dm95YWdlXFxuaWdodHZveWFnZS1kcmVhbS1jbGltYXRlLWxpdmUtMDEiLAogICJub1JldHJ5IjogdHJ1ZQp9Cg=='
$releaseJson = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($releaseBase64))

$releasePrepared = $false
$process = $null
$secure = $null
$pointer = [IntPtr]::Zero
$plain = $null
$frame = $null
$frameBytes = $null

try {
    $releasePrepared = $true
    [IO.File]::WriteAllText($releasePath, $releaseJson, [Text.UTF8Encoding]::new($false))

    $checkResult = Invoke-NodeCapture -NodePath $nodePath -ScriptPath $checkPath -EvidenceFile $PriceFile
    if ($checkResult.ExitCode -ne 0) { Stop-SecureInput 'admission_failed' }
    try { $check = $checkResult.Stdout | ConvertFrom-Json }
    catch { Stop-SecureInput 'admission_receipt_invalid' }
    if ($check.status -ne 'READY_FOR_USER_SECURE_INPUT_R1' -or -not $check.ok -or
        $check.releaseHash -ne 'ee7ab9fbb6f71b582b442d27000d17f153dbfff1ac378ae4691cbfc869401bae' -or
        $check.pricePageSha256 -ne '556097caba8adfeeed6455714bffd731c7f60db520fcee06a922eba5840663a3' -or
        $check.storePath.directory -ne $storePath -or
        $check.storeAbsent.exists -ne $false -or $check.storeExistsAfter -ne $false -or
        $check.dummy.status -ne 'DUMMY_REHEARSAL_PASSED' -or
        $check.dummy.completedRuns -ne 3 -or $check.dummy.calls -ne 12 -or
        $check.dummy.thirteenthRefused -ne $true -or $check.dummy.fourthRunRefused -ne $true -or
        $check.dummy.retryRefused -ne $true -or $check.dummy.ownerLockObserved -ne $true -or
        $check.dummy.ownerLockCleared -ne $true -or $check.dummy.storeDeleted -ne $true -or
        $check.sentinelSupplierCalls -ne 0 -or $check.credentialSupplierCalls -ne 0 -or
        $check.networkAttempts -ne 0 -or $check.realModelRequests -ne 0 -or
        $check.realStoreCreated -ne $false) {
        Stop-SecureInput 'admission_not_ready'
    }
    Write-Host ('Admission ready: ' + $check.status)

    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = $nodePath
    $quote = [string][char]34
    $startInfo.Arguments = $quote + $adapterPath + $quote + ' --price-file ' + $quote + $PriceFile + $quote
    $startInfo.WorkingDirectory = $repoRoot
    $startInfo.UseShellExecute = $false
    $startInfo.RedirectStandardInput = $true
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    $startInfo.CreateNoWindow = $true
    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $startInfo
    if (-not $process.Start()) { Stop-SecureInput 'secure_console_start_failed' }

    $secure = Read-Host 'DeepSeek API Key' -AsSecureString
    if ($secure.Length -lt 1 -or $secure.Length -gt 2000) { Stop-SecureInput 'credential_length_invalid' }
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    $frame = ConvertTo-Json -Compress -InputObject ([ordered]@{ credential = $plain })
    $frameBytes = [Text.Encoding]::UTF8.GetBytes($frame)
    if ($frameBytes.Length -lt 1 -or $frameBytes.Length -gt 8192) { Stop-SecureInput 'credential_frame_invalid' }
    $process.StandardInput.BaseStream.Write($frameBytes, 0, $frameBytes.Length)
    $process.StandardInput.BaseStream.Flush()

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
    if ($process.ExitCode -ne 0) { Stop-SecureInput 'secure_console_run_failed' }
    if (Test-Path -LiteralPath (Join-Path $storePath 'owner.lock')) {
        Stop-SecureInput 'owner_lock_not_cleared'
    }
} finally {
    if ($pointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    }
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
