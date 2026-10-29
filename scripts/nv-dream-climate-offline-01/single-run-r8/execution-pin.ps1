# Fixed release construction for R8. This file is excluded from the execution
# digest so the reviewed digest can be anchored without hashing itself.

function New-R8Release {
    [ordered]@{
        status = 'approved_once'
        profile = 'nv-dream-climate-single-run-r8-v1'
        authorityCommit = 'e30d49f19819787623829a239abafbf521ab8e4e'
        identityVersion = 'nv-dream-climate-single-run-r8-identity-v1'
        executionDigest = 'ba7444d97ecbf21afab5d3e179db26505bbe0b9d52caee29fc4a2c0d8319ad00'
        offlineHead = 'a99341ea31f25fa67df968e46f8eb45159f0fa75'
        offlineTree = '2c3f5a172433b6b3ef1e3eadbb08d80e339a05df'
        offlineParent = '5885ebf8f7a73f53fd471e1680d21b9f6a457945'
        offlineIdentityHash = 'e574d505ca4ce104507af00b19f72f63c99658d65cab1918ff6c3ad903e2287a'
        offlinePromptHash = '89b1d4a87d53f41b697341dd32fb4bb3ad41b665e2a47b68a3d5e5464cbf3c38'
        offlineSourceHash = '605d69511cc72c0b0ca60a77be34dafb061e63b57e98db94b778cf7bfce8cbb6'
        protocolVersion = 'nv-dream-climate-offline-v1'
        runtimeVersion = 'nv-dream-climate-single-run-r8-runtime-v1'
        matrixHash = '8c63b97380ca99e03c173d1fc9cb197250b5a17234533e7633ac41e757c197ae'
        priceSnapshotHash = 'c755ea8b5ca6e62d1c81899be0b1d1d884c03b2d6f02506caf20f624dd73ae3b'
        pricePageSha256 = '556097caba8adfeeed6455714bffd731c7f60db520fcee06a922eba5840663a3'
        allowanceId = 'nv-dream-climate-one-dream-r8-001'
        allowanceCapMicroCny = 160000
        perCallMaximumMicroCny = 35968
        worstMicroCny = 143872
        maxRuns = 1
        maxCalls = 4
        scenesPerRun = 3
        callsPerRun = 4
        runId = 'nv-dream-climate-one-dream-r8-a'
        storeDirectory = 'C:\Users\Administrator\AppData\Local\Nightvoyage\nightvoyage-dream-climate-one-dream-r8-01'
        receiptFile = 'receipt.json'
        noRetry = $true
    }
}

function Write-R8ReleaseJson {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [object]$Release = $null
    )
    $document = if ($null -eq $Release) { New-R8Release } else { $Release }
    $json = ConvertTo-Json -InputObject $document -Depth 8
    Write-Utf8NewFile -Path $Path -Text ($json + [Environment]::NewLine)
}
