param(
    [Parameter(Mandatory = $true)]
    [string]$PriceFile
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'r6-common.ps1')
. (Join-Path $PSScriptRoot 'execution-pin.ps1')

$quote = [char]34
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..'))
$admissionPath = Join-Path $PSScriptRoot 'check-admission.mjs'
$workerPath = Join-Path $PSScriptRoot 'worker.mjs'
$releasePath = Join-Path $PSScriptRoot 'release.json'
$storePath = 'C:\Users\Administrator\AppData\Local\Nightvoyage\nightvoyage-dream-climate-one-dream-r6-01'
$receiptPath = Join-Path $storePath 'receipt.json'

function Stop-R6Input {
    param([string]$Reason)
    throw ('dream_climate_r6_secure_input_failed: ' + $Reason)
}

function Write-R6FallbackReceipt {
    param([string]$Reason)
    $document = [ordered]@{
        status = 'blocked'
        reason = $Reason
        profile = 'r6'
        credentialRequested = $true
        credentialDelivered = $true
        credentialPersisted = $false
        networkAttempts = $null
        realModelRequests = $null
        requestOutcomeKnown = $false
        storeCreated = (Test-Path -LiteralPath $storePath -PathType Container)
        automaticRetry = $false
        recordedAt = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
        receiptFile = $null
        receiptWritten = $false
        receiptWriteError = $null
    }
    if (Test-Path -LiteralPath $storePath -PathType Container) {
        $document.receiptFile = $receiptPath
        if (Test-Path -LiteralPath $receiptPath -PathType Leaf) {
            $document.receiptWritten = $true
            $document.receiptAlreadyPresent = $true
        } else {
            $envelope = [ordered]@{
                schemaVersion = 1
                receiptFileVersion = 'nv-dream-climate-single-run-r6-receipt-file-v1'
                writtenAt = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
                encoding = 'UTF-8'
                materialKind = 'fictional'
                isRealityFact = $false
                receipt = $document
            }
            try {
                Write-Utf8NewFile -Path $receiptPath `
                    -Text ((ConvertTo-Json -InputObject $envelope -Depth 10) + [Environment]::NewLine)
                $document.receiptWritten = $true
            } catch {
                $document.receiptWriteError = $_.Exception.Message
            }
        }
    } else {
        $document.receiptWriteError = 'store_not_created'
    }
    Write-Utf8Output -Text ((ConvertTo-Json -InputObject $document -Depth 10) + [Environment]::NewLine)
}

$exitCode = 0
$capture = $null
$releasePrepared = $false
$credentialDelivered = $false
$secure = $null
$pointer = [IntPtr]::Zero
$plain = $null
$frame = $null
$frameBytes = $null

try {
    if (-not [IO.Path]::IsPathRooted($PriceFile) -or $PriceFile.Contains([string]$quote) -or
        $PriceFile.Contains([string][char]10) -or $PriceFile.Contains([string][char]13)) {
        Stop-R6Input 'price_file_path_invalid'
    }
    foreach ($required in @($PriceFile, $admissionPath, $workerPath)) {
        if (-not (Test-Path -LiteralPath $required -PathType Leaf)) {
            Stop-R6Input 'required_file_missing'
        }
    }
    if (Test-Path -LiteralPath $releasePath) { Stop-R6Input 'release_already_present' }
    if (Test-Path -LiteralPath $storePath) { Stop-R6Input 'dedicated_store_already_present' }

    $nodePath = (Get-Command node -ErrorAction Stop).Source
    if (-not [IO.Path]::IsPathRooted($nodePath)) { Stop-R6Input 'node_path_invalid' }

    $admissionArgs = '--price-file ' + $quote + $PriceFile + $quote
    $admission = Invoke-Utf8CaptureWithInput -NodePath $nodePath `
        -ScriptPath $admissionPath -Arguments $admissionArgs `
        -WorkingDirectory $repoRoot -TimeoutMs 300000
    if ($admission.DecodeError -or $admission.TimedOut -or $admission.ExitCode -ne 0) {
        Stop-R6Input 'admission_failed'
    }
    $check = $null
    try { $check = $admission.Stdout | ConvertFrom-Json } catch { Stop-R6Input 'admission_receipt_invalid' }
    if ($check.status -ne 'R6_OFFLINE_ADMISSION_PASSED' -or -not $check.ok -or
        $check.releasePresent -ne $false -or $check.storeExists -ne $false -or
        $check.storeDirectory -ne $storePath -or
        $check.dummy.status -ne 'R6_DUMMY_REHEARSAL_PASSED' -or
        $check.dummy.calls -ne 4 -or $check.credentialSupplierCalls -ne 0 -or
        $check.networkAttempts -ne 0 -or $check.realModelRequests -ne 0 -or
        $check.realStoreCreated -ne $false -or $check.runCount -ne 1 -or
        $check.maxCalls -ne 4 -or [string]::IsNullOrWhiteSpace($check.releaseHash) -or
        [string]::IsNullOrWhiteSpace($check.r6IdentityHash) -or
        [string]::IsNullOrWhiteSpace($check.executionDigest) -or
        [string]::IsNullOrWhiteSpace($check.pricePageSha256)) {
        Stop-R6Input 'admission_not_ready'
    }
    if ($check.executionDigest -ne $executionDigest) {
        Stop-R6Input 'execution_pin_mismatch'
    }
    if (Test-Path -LiteralPath $storePath) { Stop-R6Input 'dedicated_store_already_present' }
    Write-Host ('Admission ready: ' + $check.status)

    $releasePrepared = $true
    Write-R6ReleaseJson -Path $releasePath

    $workerArgs = 'run --price-file ' + $quote + $PriceFile + $quote
    $capture = Start-Utf8Process -NodePath $nodePath -ScriptPath $workerPath `
        -Arguments $workerArgs -WorkingDirectory $repoRoot
    $noticeLine = Read-Utf8NoticeLine -Capture $capture
    $notice = $null
    if (-not [string]::IsNullOrWhiteSpace($noticeLine)) {
        try { $notice = $noticeLine | ConvertFrom-Json } catch { $notice = $null }
    }
    if ($null -eq $notice -or $notice.type -ne 'credential_required' -or
        $notice.releaseHash -ne $check.releaseHash -or
        $notice.r6IdentityHash -ne $check.r6IdentityHash -or
        $notice.executionDigest -ne $check.executionDigest -or
        $notice.pricePageSha256 -ne $check.pricePageSha256 -or
        [int]$notice.nextRequestBytes -ne 4855 -or
        [int]$notice.nextReservationMicroCny -ne 35968) {
        Stop-R6Input 'r6_worker_preflight_refused'
    }
    Write-Host ('Worker preflight ready: first request ' + $notice.nextRequestBytes +
        ' bytes, reservation ' + $notice.nextReservationMicroCny + ' micro-CNY')

    $secure = Read-Host 'DeepSeek API Key' -AsSecureString
    if ($secure.Length -lt 1 -or $secure.Length -gt 2000) { Stop-R6Input 'credential_length_invalid' }
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    $frame = ConvertTo-Json -Compress -InputObject ([ordered]@{ credential = $plain })
    $frameBytes = [Text.Encoding]::UTF8.GetBytes($frame)
    if ($frameBytes.Length -lt 1 -or $frameBytes.Length -gt 8192) { Stop-R6Input 'credential_frame_invalid' }
    Write-Utf8ProcessInput -Capture $capture -Bytes $frameBytes
    $credentialDelivered = $true

    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    $pointer = [IntPtr]::Zero
    $plain = $null
    $frame = $null
    [Array]::Clear($frameBytes, 0, $frameBytes.Length)
    $frameBytes = $null
    $secure.Dispose()
    $secure = $null
    try { $capture.Process.StandardInput.Close() } catch { }

    $result = Complete-Utf8Capture -Capture $capture -TimeoutMs 900000
    $capture = $null

    if ($result.DecodeError -or $result.TimedOut -or [string]::IsNullOrWhiteSpace($result.Stdout)) {
        $exitCode = 1
        $reason = if ($result.DecodeError) { 'r6_worker_stdout_invalid_utf8' }
            elseif ($result.TimedOut) { 'r6_worker_timeout_after_credential' }
            else { 'r6_worker_result_missing' }
        Write-R6FallbackReceipt -Reason $reason
    } else {
        $parsed = $null
        try { $parsed = $result.Stdout | ConvertFrom-Json } catch { $parsed = $null }
        if ($null -eq $parsed -or $parsed.type -ne 'result' -or $null -eq $parsed.value) {
            $exitCode = 1
            Write-R6FallbackReceipt -Reason 'r6_worker_result_unparseable'
        } else {
            Write-Utf8Output -Text ($result.Stdout.TrimEnd() + [Environment]::NewLine)
            if ($parsed.value.status -ne 'SINGLE_RUN_READY_FOR_MANUAL_CONTENT_REVIEW') {
                $exitCode = 1
            }
        }
    }
    if (-not [string]::IsNullOrWhiteSpace($result.Stderr)) {
        [Console]::Error.WriteLine($result.Stderr.TrimEnd())
    }
} catch {
    $exitCode = 1
    $message = $_.Exception.Message -replace '^dream_climate_r6_secure_input_failed:\s*', ''
    [Console]::Error.WriteLine($message)
} finally {
    if ($pointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
    if ($null -ne $frameBytes) { [Array]::Clear($frameBytes, 0, $frameBytes.Length) }
    $plain = $null
    $frame = $null
    if ($null -ne $secure) { $secure.Dispose() }
    if ($null -ne $capture) { Stop-Utf8Capture -Capture $capture }
    $credentialDelivered = $credentialDelivered
    if ($releasePrepared) {
        Remove-Item -LiteralPath $releasePath -Force -ErrorAction SilentlyContinue
    }
}

if ($exitCode -ne 0) { exit $exitCode }
