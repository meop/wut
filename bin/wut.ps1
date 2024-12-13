#requires -PSEdition Core

$verMajor = 7
$verMinor = 4

if ($PSVersionTable.PSVersion.Major -lt $verMajor || $PSVersionTable.PSVersion.Minor -lt $verMinor) {
  Write-Error "pwsh must be >= $verMajor.$verMinor .. found $($PSVersionTable.PSVersion) .. aborting"
  exit 1
}

if (-not $IsWindows) {
  Write-Error "windows only .. found $($PSVersionTable.Platform) .. aborting"
  exit 1
}

if (-not (Get-Command node -ErrorAction Ignore)) {
  Write-Error "node not found .. aborting"
  exit 1
}
if (-not (Get-Command git -ErrorAction Ignore)) {
  Write-Error "git not found .. aborting"
  exit 1
}

if (-not "$env:WUT_LOCATION") {
  $env:WUT_LOCATION = "$env:HOME\.wut"
}

$env:NODE_NO_WARNINGS = 1
$env:NODE_OPTIONS = '--experimental-strip-types --experimental-transform-types'

if ($args.Length -gt 0 -and $args[0] -eq 'up') {
  Write-Output "git -C ${$env:WUT_LOCATION} pull --prune"
  Write-Output ''
  git -C "$env:WUT_LOCATION" pull --prune
  Write-Output ''

  Push-Location "$env:WUT_LOCATION"
  npm install
  Pop-Location

  exit
}

Push-Location "$env:WUT_LOCATION"
node src/cli.ts $args
Pop-Location
