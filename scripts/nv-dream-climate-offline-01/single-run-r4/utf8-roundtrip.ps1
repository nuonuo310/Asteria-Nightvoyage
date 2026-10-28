param(
    [Parameter(Mandatory = $true)][string]$NodeStub,
    [Parameter(Mandatory = $true)][string]$OutFile
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'utf8-capture.ps1')

if (-not [IO.Path]::IsPathRooted($NodeStub) -or -not [IO.Path]::IsPathRooted($OutFile)) {
    [Console]::Error.WriteLine('utf8_roundtrip_path_required')
    exit 2
}
if (-not (Test-Path -LiteralPath $NodeStub -PathType Leaf)) {
    [Console]::Error.WriteLine('utf8_roundtrip_stub_missing')
    exit 2
}

$nodePath = (Get-Command node -ErrorAction Stop).Source
$capture = Read-Utf8ProcessOutput -NodePath $nodePath -ScriptPath $NodeStub -WorkingDirectory $PSScriptRoot
$parsed = $null
$parseError = $null
try { $parsed = $capture.Stdout | ConvertFrom-Json } catch { $parseError = $_.Exception.Message }
$result = [ordered]@{
    schemaVersion = 1
    nodeExitCode = $capture.ExitCode
    stdoutExact = $capture.Stdout
    stderrExact = $capture.Stderr
    parsed = $parsed
    parseError = $parseError
}
Write-Utf8Output -Text (ConvertTo-Json -Depth 16 -InputObject $result) -FilePath $OutFile
exit 0
