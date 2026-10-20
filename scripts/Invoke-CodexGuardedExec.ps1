# Local fixed fixture only. This process's execution policy does not grant model/auth authority.
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot) -ErrorAction Stop

node --test test/codex-guard-exec-trace.test.js test/codex-guard-warning-envelope.test.js test/codex-guard-input-projection.test.js test/codex-code-mode-guard-owner.test.js
if ($LASTEXITCODE -ne 0) { throw 'Local tests failed. Stop and return the output.' }

$nightvoyageWrapper = Get-Command codex.cmd -CommandType Application -ErrorAction SilentlyContinue |
    Select-Object -First 1
if ($null -eq $nightvoyageWrapper) { throw 'Installed Codex wrapper missing. Do not install or retry.' }

$nightvoyageNativeText = @'
import fs from "node:fs";
import path from "node:path";
import {createRequire} from "node:module";
if(process.platform!=="win32"||process.arch!=="x64")throw Error("unsupported_platform");
const root=path.join(path.dirname(process.argv[2]),"node_modules","@openai","codex");
const wrapper=JSON.parse(fs.readFileSync(path.join(root,"package.json"),"utf8"));
if(wrapper.name!=="@openai/codex"||wrapper.version!=="0.160.0")throw Error("wrapper_version_requires_review");
const require=createRequire(path.join(root,"bin","codex.js"));
const manifestPath=require.resolve("@openai/codex-win32-x64/package.json");
const manifest=JSON.parse(fs.readFileSync(manifestPath,"utf8"));
if(manifest.version!=="0.160.0-win32-x64")throw Error("platform_package_version_requires_review");
const native=path.join(path.dirname(manifestPath),"vendor","x86_64-pc-windows-msvc","bin","codex.exe");
if(!fs.statSync(native).isFile())throw Error("native_program_missing");
console.log(fs.realpathSync(native));
'@ | node --input-type=module - $nightvoyageWrapper.Source
if ($LASTEXITCODE -ne 0) { throw 'Native resolution failed. Do not change versions or retry.' }

$nightvoyageNative = ($nightvoyageNativeText -join "`n").Trim()
$nightvoyageVersion = (& $nightvoyageNative --version | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or $nightvoyageVersion -ne 'codex-cli 0.160.0') {
    throw 'Native version requires review. Stop and return the output.'
}
Write-Host $nightvoyageVersion
node scripts/check-codex-guarded-exec.mjs --native-executable $nightvoyageNative
$nightvoyageProbeExit = $LASTEXITCODE
Write-Host 'Finished. Return the final JSON; do not repeat automatically.'
exit $nightvoyageProbeExit
