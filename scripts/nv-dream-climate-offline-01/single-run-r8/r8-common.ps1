# Strict UTF-8 process capture and fixed R8 release construction. The capture
# reads stdout/stderr bytes and decodes with throw-on-invalid UTF-8; it never
# inspects environment secrets, the clipboard or any Store.

function Write-Utf8BytesNewFile {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][byte[]]$Bytes
    )
    if (-not [IO.Path]::IsPathRooted($Path)) { throw 'utf8_path_not_rooted' }
    $full = [IO.Path]::GetFullPath($Path)
    $parent = [IO.Path]::GetDirectoryName($full)
    if ([string]::IsNullOrWhiteSpace($parent) -or -not (Test-Path -LiteralPath $parent -PathType Container)) {
        throw 'utf8_parent_missing'
    }
    $stream = [IO.File]::Open($full, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
    try { $stream.Write($Bytes, 0, $Bytes.Length) } finally { $stream.Dispose() }
}

function Write-Utf8NewFile {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Text
    )
    $strict = New-Object System.Text.UTF8Encoding($false)
    Write-Utf8BytesNewFile -Path $Path -Bytes $strict.GetBytes($Text)
}

function Write-Utf8Output {
    param(
        [Parameter(Mandatory = $true)][AllowEmptyString()][string]$Text,
        [string]$FilePath
    )
    $strict = New-Object System.Text.UTF8Encoding($false)
    if ($FilePath) {
        Write-Utf8NewFile -Path $FilePath -Text $Text
    }
    try { [Console]::OutputEncoding = $strict } catch { }
    [Console]::Out.Write($Text)
}

function Start-Utf8Process {
    param(
        [Parameter(Mandatory = $true)][string]$NodePath,
        [Parameter(Mandatory = $true)][string]$ScriptPath,
        [string]$Arguments = '',
        [Parameter(Mandatory = $true)][string]$WorkingDirectory
    )
    if (-not [IO.Path]::IsPathRooted($NodePath) -or -not (Test-Path -LiteralPath $NodePath -PathType Leaf)) {
        throw 'utf8_capture_node_missing'
    }
    if (-not [IO.Path]::IsPathRooted($ScriptPath) -or -not (Test-Path -LiteralPath $ScriptPath -PathType Leaf)) {
        throw 'utf8_capture_script_missing'
    }
    $info = New-Object System.Diagnostics.ProcessStartInfo
    $info.FileName = $NodePath
    $info.Arguments = [char]34 + $ScriptPath + [char]34
    if (-not [string]::IsNullOrWhiteSpace($Arguments)) { $info.Arguments += ' ' + $Arguments }
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
    if (-not $process.Start()) {
        $stdout.Dispose(); $stderr.Dispose(); $process.Dispose()
        throw 'utf8_capture_start_failed'
    }
    $capture = [pscustomobject]@{
        Process = $process
        Stdout = $stdout
        Stderr = $stderr
        StdoutTask = $null
        StderrTask = $process.StandardError.BaseStream.CopyToAsync($stderr)
        StdoutStarted = $false
    }
    return $capture
}

function Read-Utf8NoticeLine {
    param([Parameter(Mandatory = $true)]$Capture)
    $stream = $Capture.Process.StandardOutput.BaseStream
    $bytes = New-Object System.Collections.Generic.List[byte]
    while ($true) {
        $value = $stream.ReadByte()
        if ($value -lt 0) { break }
        if ($value -eq 10) { break }
        if ($value -ne 13) { $bytes.Add([byte]$value) }
    }
    $strict = New-Object System.Text.UTF8Encoding($false, $true)
    return $strict.GetString($bytes.ToArray())
}

function Write-Utf8ProcessInput {
    param(
        [Parameter(Mandatory = $true)]$Capture,
        [Parameter(Mandatory = $true)][byte[]]$Bytes
    )
    $stream = $Capture.Process.StandardInput.BaseStream
    $stream.Write($Bytes, 0, $Bytes.Length)
    $stream.Flush()
}

function Complete-Utf8Capture {
    param(
        [Parameter(Mandatory = $true)]$Capture,
        [int]$TimeoutMs = 900000
    )
    $timedOut = $false
    try {
        if (-not $Capture.StdoutStarted) {
            $Capture.StdoutTask = $Capture.Process.StandardOutput.BaseStream.CopyToAsync($Capture.Stdout)
            $Capture.StdoutStarted = $true
        }
        try { $Capture.Process.StandardInput.Close() } catch { }
        if (-not $Capture.Process.WaitForExit($TimeoutMs)) {
            $timedOut = $true
            try { $Capture.Process.Kill() } catch { }
            $null = $Capture.Process.WaitForExit(30000)
        }
        try { [void]$Capture.StdoutTask.Wait(30000) } catch { }
        try { [void]$Capture.StderrTask.Wait(30000) } catch { }
        $strict = New-Object System.Text.UTF8Encoding($false, $true)
        $stdout = $null; $stderr = $null; $decodeError = $null
        try { $stdout = $strict.GetString($Capture.Stdout.ToArray()) }
        catch { $decodeError = 'stdout_invalid_utf8' }
        try { $stderr = $strict.GetString($Capture.Stderr.ToArray()) }
        catch { $decodeError = if ($decodeError) { $decodeError + ',stderr_invalid_utf8' } else { 'stderr_invalid_utf8' } }
        return [pscustomobject]@{
            ExitCode = $Capture.Process.ExitCode
            TimedOut = $timedOut
            Stdout = $stdout
            Stderr = $stderr
            DecodeError = $decodeError
        }
    } finally {
        try { $Capture.Process.Dispose() } catch { }
        try { $Capture.Stdout.Dispose() } catch { }
        try { $Capture.Stderr.Dispose() } catch { }
    }
}

function Stop-Utf8Capture {
    param($Capture)
    if ($null -eq $Capture) { return }
    try { if (-not $Capture.Process.HasExited) { $Capture.Process.Kill() } } catch { }
    try { $Capture.Process.Dispose() } catch { }
    try { $Capture.Stdout.Dispose() } catch { }
    try { $Capture.Stderr.Dispose() } catch { }
}

function Invoke-Utf8CaptureWithInput {
    param(
        [Parameter(Mandatory = $true)][string]$NodePath,
        [Parameter(Mandatory = $true)][string]$ScriptPath,
        [string]$Arguments = '',
        [Parameter(Mandatory = $true)][string]$WorkingDirectory,
        [byte[]]$InputBytes = [byte[]]@(),
        [int]$TimeoutMs = 120000
    )
    $capture = Start-Utf8Process -NodePath $NodePath -ScriptPath $ScriptPath `
        -Arguments $Arguments -WorkingDirectory $WorkingDirectory
    try {
        if ($InputBytes.Length -gt 0) { Write-Utf8ProcessInput -Capture $capture -Bytes $InputBytes }
        try { $capture.Process.StandardInput.Close() } catch { }
        return Complete-Utf8Capture -Capture $capture -TimeoutMs $TimeoutMs
    } catch {
        Stop-Utf8Capture -Capture $capture
        throw
    }
}
