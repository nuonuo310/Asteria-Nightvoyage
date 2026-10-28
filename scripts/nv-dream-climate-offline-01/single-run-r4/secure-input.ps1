param(
    [string]$PriceFile
)

$ErrorActionPreference = 'Stop'

# R5 is an offline review candidate. This script deliberately contains no
# credential prompt, release write, Store creation, worker launch or network
# path. The former inline ProcessStartInfo capture moved to the credential-free
# utf8-capture.ps1 helper, which is verified by an offline Node stub.
[Console]::Error.WriteLine('OFFLINE_REVIEW_REQUIRED_R5')
exit 2
