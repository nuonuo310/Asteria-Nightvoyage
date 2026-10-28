param(
    [string]$PriceFile
)

$ErrorActionPreference = 'Stop'

# R3 is an offline review candidate. This script deliberately contains no
# credential prompt, Store creation, worker launch or network path.
[Console]::Error.WriteLine('OFFLINE_REVIEW_REQUIRED_R3')
exit 2
