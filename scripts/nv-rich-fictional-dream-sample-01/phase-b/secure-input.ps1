param(
    [Parameter(Mandatory = $true)]
    [string]$PriceFile
)

$ErrorActionPreference = 'Stop'

function Stop-SecureInput {
    param([string]$Reason)
    throw "rich_sample_secure_input_failed: $Reason"
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
    if (-not $child.Start()) {
        Stop-SecureInput 'node_capture_start_failed'
    }
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
$storePath = 'C:\Users\Administrator\AppData\Local\Nightvoyage\rich-fictional-dream-sample-01'

if (-not [IO.Path]::IsPathRooted($PriceFile) -or $PriceFile.Contains('"') -or
    $PriceFile.Contains("`r") -or $PriceFile.Contains("`n")) {
    Stop-SecureInput 'price_file_path_invalid'
}
foreach ($required in @($PriceFile, $adapterPath, $checkPath)) {
    if (-not (Test-Path -LiteralPath $required -PathType Leaf)) {
        Stop-SecureInput 'required_file_missing'
    }
}
if (Test-Path -LiteralPath $releasePath) {
    Stop-SecureInput 'release_already_present'
}
if (Test-Path -LiteralPath $storePath) {
    Stop-SecureInput 'dedicated_store_already_present'
}

$nodePath = (Get-Command node -ErrorAction Stop).Source
if (-not [IO.Path]::IsPathRooted($nodePath)) {
    Stop-SecureInput 'node_path_invalid'
}

$releaseJson = @'
{
  "status": "approved_once",
  "phaseAHead": "c9c0438945bb35a1b507ca14166136c4292f73ec",
  "phaseATree": "375bc898da910d2311903ed9a4a74df50f2d95a0",
  "identityHash": "851e443a44bb044e8f2153dd791cc47ec653713b3bdc7339c5a0513cbc2c44ea",
  "promptHash": "23ab5917e42bfbcf4f6072f43142d5d32b9c7e47f3d19b426aaa49612bf15bea",
  "sourceHash": "605d69511cc72c0b0ca60a77be34dafb061e63b57e98db94b778cf7bfce8cbb6",
  "priceSnapshotHash": "4a4cfc970a3e285756b9ce0703467c13ff3b76da4578a0f7e9f637d4a3ecd00d",
  "allowanceCapMicroCny": 480000,
  "maxRuns": 3,
  "maxCalls": 12,
  "storeDirectory": "C:\\Users\\Administrator\\AppData\\Local\\Nightvoyage\\rich-fictional-dream-sample-01",
  "noRetry": true
}
'@

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
    if ($checkResult.ExitCode -ne 0) {
        Stop-SecureInput 'admission_failed'
    }
    try {
        $check = $checkResult.Stdout | ConvertFrom-Json
    } catch {
        Stop-SecureInput 'admission_receipt_invalid'
    }
    if ($check.status -ne 'READY_FOR_ONE_LIVE_BATCH' -or -not $check.ok -or
        $check.storeExists -ne $false -or $check.credentialSupplierCalls -ne 0 -or
        $check.sentinelSupplierCalls -ne 0 -or $check.networkAttempts -ne 0 -or
        $check.realModelRequests -ne 0) {
        Stop-SecureInput 'admission_not_ready'
    }
    Write-Host ('Admission ready: ' + $check.status)

    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = $nodePath
    $startInfo.Arguments = '"' + $adapterPath + '" --price-file "' + $PriceFile + '"'
    $startInfo.WorkingDirectory = $repoRoot
    $startInfo.UseShellExecute = $false
    $startInfo.RedirectStandardInput = $true
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    $startInfo.CreateNoWindow = $true

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $startInfo
    if (-not $process.Start()) {
        Stop-SecureInput 'secure_console_start_failed'
    }

    $secure = Read-Host 'DeepSeek API Key' -AsSecureString
    if ($secure.Length -lt 1 -or $secure.Length -gt 2000) {
        Stop-SecureInput 'credential_length_invalid'
    }
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    $frame = ConvertTo-Json -Compress -InputObject ([ordered]@{ credential = $plain })
    $frameBytes = [Text.Encoding]::UTF8.GetBytes($frame)
    if ($frameBytes.Length -lt 1 -or $frameBytes.Length -gt 8192) {
        Stop-SecureInput 'credential_frame_invalid'
    }
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
    if (-not [string]::IsNullOrWhiteSpace($stdout)) {
        Write-Output $stdout.TrimEnd()
    }
    if ($process.ExitCode -ne 0) {
        Stop-SecureInput 'secure_console_run_failed'
    }
} finally {
    if ($pointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    }
    if ($null -ne $frameBytes) {
        [Array]::Clear($frameBytes, 0, $frameBytes.Length)
    }
    $plain = $null
    $frame = $null
    if ($null -ne $secure) {
        $secure.Dispose()
    }
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
