# Fixed release construction for R6. This file is excluded from the execution
# digest so the reviewed digest can be anchored without hashing itself.

function New-R6Release {
    [ordered]@{
        status = 'approved_once'
        profile = 'nv-dream-climate-single-run-r6-v1'
        authorityCommit = '1562240ca3c6967a2f3f50bb3788223b0ea73c5e'
        identityVersion = 'nv-dream-climate-single-run-r6-identity-v1'
    executionDigest = 'f2eceb8719d20b492f130b4cba9030ea7e09cd03f66fabd1c2ceb379d278b294'
        offlineHead = 'c4680ad1065c7b8c8c4cbf57ba90d24d04d175b6'
        offlineTree = 'b178f3ff6772842af210e3bac71206bbc5e13bb0'
        offlineParent = '48be3aad209db57cf125e69e84b1276cc3177efb'
        offlineIdentityHash = '47767f6f733dc657dfef815839b7e9cf3218cff3d4844711a7a3d32c4488dedd'
        offlinePromptHash = '9fe4d0863983eae2eb8a969d89fd6ffc5eeab3ebec507bf263d0f27664fbdb66'
        offlineSourceHash = '605d69511cc72c0b0ca60a77be34dafb061e63b57e98db94b778cf7bfce8cbb6'
        protocolVersion = 'nv-dream-climate-offline-v1'
        runtimeVersion = 'nv-dream-climate-single-run-r6-runtime-v1'
        matrixHash = '13c248a72b30266730997ee990838ec15ebaee48efd201c771bfc480bd1c52c9'
        priceSnapshotHash = 'fd3016c7cc74a0eeac704bff94295dd1db3fd86a2bdee5ec464ef91d1c23b796'
        pricePageSha256 = '556097caba8adfeeed6455714bffd731c7f60db520fcee06a922eba5840663a3'
        allowanceId = 'nv-dream-climate-one-dream-r6-001'
        allowanceCapMicroCny = 160000
        perCallMaximumMicroCny = 35968
        worstMicroCny = 143872
        maxRuns = 1
        maxCalls = 4
        scenesPerRun = 3
        callsPerRun = 4
        runId = 'nv-dream-climate-one-dream-r6-a'
        storeDirectory = 'C:\Users\Administrator\AppData\Local\Nightvoyage\nightvoyage-dream-climate-one-dream-r6-01'
        receiptFile = 'receipt.json'
        noRetry = $true
    }
}

function Write-R6ReleaseJson {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [object]$Release = $null
    )
    $document = if ($null -eq $Release) { New-R6Release } else { $Release }
    $json = ConvertTo-Json -InputObject $document -Depth 8
    Write-Utf8NewFile -Path $Path -Text ($json + [Environment]::NewLine)
}
