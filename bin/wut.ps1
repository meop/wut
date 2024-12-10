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

if (-not (Get-Command bun -ErrorAction Ignore)) {
  Write-Error "bun not found .. aborting"
  exit 1
}
if (-not (Get-Command git -ErrorAction Ignore)) {
  Write-Error "git not found .. aborting"
  exit 1
}

if (-not "$env:BUN_INSTALL") {
  $env:BUN_INSTALL = "$env:HOME\.bun"
}
if (-not "$env:WUT_LOCATION") {
  $env:WUT_LOCATION = "$env:HOME\.wut"
}

if ($args.Length -gt 0 -and $args[0] -eq 'up') {
  # bun upgrade only if it was installed by its own script
  if (((Get-Command bun).Source).StartsWith("$env:BUN_INSTALL")) {
    bun upgrade
  }

  git -C "$env:WUT_LOCATION" pull --prune

  exit
}

Push-Location "$env:WUT_LOCATION"

bun run --install=force src/main.ts $args

Pop-Location
