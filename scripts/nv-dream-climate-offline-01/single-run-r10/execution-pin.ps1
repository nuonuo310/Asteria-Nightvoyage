# Fixed release construction for R10. This file is excluded from the execution
# digest so the reviewed digest can be anchored without hashing itself.

function New-R10Release {
    [ordered]@{
        status = 'approved_once'
        profile = 'nv-dream-climate-single-run-r10-v1'
        authorityCommit = '377de3adf45b61550bfbfcb90dae966bba869ca2'
        identityVersion = 'nv-dream-climate-single-run-r10-identity-v1'
        executionDigest = '031f33667be0e50196256d75e2e4d84d70c590695048948660196c19fdffd151'
        offlineHead = 'fe0afa3ee734611bc949de33b61e4d19e2151f13'
        offlineTree = 'cfbf1f9e35ce78835a09077b1424711002c45694'
        offlineParent = 'fe0b196a0a22210107205a0a6660955251c8f724'
        offlineIdentityHash = '153503232906afd729d78054cc199ee71a9ea6aca8ebfd7ddfb6ebe7283ac867'
        offlinePromptHash = '89b1d4a87d53f41b697341dd32fb4bb3ad41b665e2a47b68a3d5e5464cbf3c38'
        offlineSourceHash = '605d69511cc72c0b0ca60a77be34dafb061e63b57e98db94b778cf7bfce8cbb6'
        protocolVersion = 'nv-dream-climate-offline-v1'
        runtimeVersion = 'nv-dream-climate-single-run-r10-runtime-v1'
        matrixHash = '2708c23bd788b7657fa80947eec9a4fbdd8f0aee3909bdc4c66513ada0848df3'
        priceSnapshotHash = 'c755ea8b5ca6e62d1c81899be0b1d1d884c03b2d6f02506caf20f624dd73ae3b'
        pricePageSha256 = '556097caba8adfeeed6455714bffd731c7f60db520fcee06a922eba5840663a3'
        allowanceId = 'nv-dream-climate-one-dream-r10-001'
        allowanceCapMicroCny = 160000
        perCallMaximumMicroCny = 35968
        worstMicroCny = 143872
        maxRuns = 1
        maxCalls = 4
        scenesPerRun = 3
        callsPerRun = 4
        runId = 'nv-dream-climate-one-dream-r10-a'
        storeDirectory = 'C:\Users\Administrator\AppData\Local\Nightvoyage\nightvoyage-dream-climate-one-dream-r10-01'
        receiptFile = 'receipt.json'
        noRetry = $true
    }
}

function Write-R10ReleaseJson {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [object]$Release = $null
    )
    $document = if ($null -eq $Release) { New-R10Release } else { $Release }
    $json = ConvertTo-Json -InputObject $document -Depth 8
    Write-Utf8NewFile -Path $Path -Text ($json + [Environment]::NewLine)
}
