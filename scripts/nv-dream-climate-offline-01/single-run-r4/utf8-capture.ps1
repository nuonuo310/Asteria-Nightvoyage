# Strict UTF-8 process capture for offline stubs. It never handles credentials:
# callers pass a read-only Node script and only stdout/stderr bytes are read.
function Read-Utf8ProcessOutput {
    param(
        [Parameter(Mandatory = $true)][string]$NodePath,
        [Parameter(Mandatory = $true)][string]$ScriptPath,
        [Parameter(Mandatory = $true)][string]$WorkingDirectory,
        [int]$TimeoutMs = 120000
    )
    if (-not [IO.Path]::IsPathRooted($NodePath) -or -not (Test-Path -LiteralPath $NodePath -PathType Leaf)) {
        throw 'utf8_capture_node_missing'
    }
    if (-not [IO.Path]::IsPathRooted($ScriptPath) -or -not (Test-Path -LiteralPath $ScriptPath -PathType Leaf)) {
        throw 'utf8_capture_script_missing'
    }
    $info = New-Object System.Diagnostics.ProcessStartInfo
    $info.FileName = $NodePath
    $info.Arguments = [string][char]34 + $ScriptPath + [char]34
    $info.WorkingDirectory = $WorkingDirectory
    $info.UseShellExecute = $false
    $info.RedirectStandardInput = $true
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    $info.CreateNoWindow = $true
    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $info
    $stdout = New-Object System.IO.MemoryStream
    $stderr = New-Object System.IO.MemoryStream
    try {
        if (-not $process.Start()) { throw 'utf8_capture_start_failed' }
        try { $process.StandardInput.Close() } catch { }
        $outTask = $process.StandardOutput.BaseStream.CopyToAsync($stdout)
        $errTask = $process.StandardError.BaseStream.CopyToAsync($stderr)
        if (-not $process.WaitForExit($TimeoutMs)) {
            try { $process.Kill() } catch { }
            throw 'utf8_capture_timeout'
        }
        [void]$outTask.Wait(10000)
        [void]$errTask.Wait(10000)
        $strict = New-Object System.Text.UTF8Encoding($false, $true)
        return [pscustomobject]@{
            ExitCode = $process.ExitCode
            Stdout = $strict.GetString($stdout.ToArray())
            Stderr = $strict.GetString($stderr.ToArray())
        }
    } finally {
        try { $process.Dispose() } catch { }
        $stdout.Dispose()
        $stderr.Dispose()
    }
}

# Write UTF-8 without BOM to a file and to this process console only.
function Write-Utf8Output {
    param(
        [Parameter(Mandatory = $true)][string]$Text,
        [string]$FilePath
    )
    $strict = New-Object System.Text.UTF8Encoding($false)
    if ($FilePath) {
        [IO.File]::WriteAllText([IO.Path]::GetFullPath($FilePath), $Text, $strict)
    }
    try { [Console]::OutputEncoding = $strict } catch { }
    [Console]::Out.Write($Text)
}
