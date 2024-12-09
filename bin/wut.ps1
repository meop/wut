#requires -PSEdition Core

if (-not $IsWindows) {
  Write-Error "checked for Windows .. found $($PSVersionTable.Platform) .. aborting"
  exit 1
}

$verMajor = 7
$verMinor = 4

if ($PSVersionTable.PSVersion.Major -lt $verMajor || $PSVersionTable.PSVersion.Minor -lt $verMinor) {
  Write-Error "checked for Pwsh >= $verMajor.$verMinor .. found $($PSVersionTable.PSVersion) .. aborting"
  exit 1
}

if (-not (Get-Command git -ErrorAction Ignore)) {
}

if (-not "$env:WUT_LOCATION") {
  $myPath = $MyInvocation.MyCommand.Definition
  $myDir = Split-Path -Parent "$myPath"
  $myParentDir = Split-Path -Parent "$myDir"
  $env:WUT_LOCATION = "$myParentDir"
}

if (-not (Get-Command bun -ErrorAction Ignore)) {
  # bun install sets BUN_INSTALL in the running shell profile
  Invoke-RestMethod 'https://bun.sh/install.ps1' | pwsh -c -
  $env:BUN_INSTALL = "$env:HOME/.bun"
  $env:PATH = "$env:BUN_INSTALL/bin;$env:PATH"
}

if ($args.Length -gt 0 -and $args[0] -eq 'up') {
  # bun upgrade only if it was installed by its own script
  if ("$env:BUN_INSTALL" -and ((Get-Command bun).Source).StartsWith("$env:BUN_INSTALL")) {
    bun upgrade
  }
  
  git -C "$env:WUT_LOCATION" fetch --all --tags --prune --prune-tags
  git -C "$env:WUT_LOCATION" pull
}

Push-Location "$env:WUT_LOCATION"

bun run --install=force src/main.ts $args

Pop-Location
