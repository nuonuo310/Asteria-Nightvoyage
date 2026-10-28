param(
    [Parameter(Mandatory = $true)][string]$NodeStub,
    [Parameter(Mandatory = $true)][string]$OutFile,
    [Parameter(Mandatory = $true)][string]$Mode,
    [string]$ReceiptDir,
    [string]$ReleaseOut
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'r6-common.ps1')
. (Join-Path $PSScriptRoot 'execution-pin.ps1')

if (-not [IO.Path]::IsPathRooted($NodeStub) -or -not [IO.Path]::IsPathRooted($OutFile)) {
    [Console]::Error.WriteLine('utf8_roundtrip_path_required')
    exit 2
}
if (-not (Test-Path -LiteralPath $NodeStub -PathType Leaf)) {
    [Console]::Error.WriteLine('utf8_roundtrip_stub_missing')
    exit 2
}
if ($Mode -notin @('ok','empty','error','garbage')) {
    [Console]::Error.WriteLine('utf8_roundtrip_mode_invalid')
    exit 2
}

$nodePath = (Get-Command node -ErrorAction Stop).Source
$arguments = '--mode ' + $Mode
if ($ReceiptDir) {
    if (-not [IO.Path]::IsPathRooted($ReceiptDir)) {
        [Console]::Error.WriteLine('utf8_roundtrip_receipt_dir_required')
        exit 2
    }
    $arguments += ' --out ' + [char]34 + $ReceiptDir + [char]34
}
$frame = [Text.Encoding]::UTF8.GetBytes('{'+[char]34+'credential'+[char]34+':'+[char]34+'DUMMY-TEST-ONLY'+[char]34+'}')
$capture = Start-Utf8Process -NodePath $nodePath -ScriptPath $NodeStub `
    -Arguments $arguments -WorkingDirectory $PSScriptRoot
try {
    Write-Utf8ProcessInput -Capture $capture -Bytes $frame
    [Array]::Clear($frame, 0, $frame.Length)
    $result = Complete-Utf8Capture -Capture $capture -TimeoutMs 60000
    $capture = $null
} finally {
    if ($null -ne $capture) { Stop-Utf8Capture -Capture $capture }
    if ($null -ne $frame) { [Array]::Clear($frame, 0, $frame.Length) }
}

if ($ReleaseOut) {
    Write-R6ReleaseJson -Path $ReleaseOut
}

$document = [ordered]@{
    schemaVersion = 1
    mode = $Mode
    nodeExitCode = $result.ExitCode
    timedOut = $result.TimedOut
    stdoutExact = $result.Stdout
    stderrExact = $result.Stderr
    decodeError = $result.DecodeError
    receiptFile = if ($ReceiptDir) { Join-Path $ReceiptDir 'receipt.json' } else { $null }
    releaseFile = if ($ReleaseOut) { $ReleaseOut } else { $null }
}
Write-Utf8NewFile -Path $OutFile `
    -Text ((ConvertTo-Json -InputObject $document -Depth 10) + [Environment]::NewLine)
exit 0
