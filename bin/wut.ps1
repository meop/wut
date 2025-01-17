#requires -PSEdition Core

$verMajor = 7
$verMinor = 4

if ($PSVersionTable.PSVersion.Major -lt $verMajor || $PSVersionTable.PSVersion.Minor -lt $verMinor) {
  Write-Error "pwsh must be >= $verMajor.$verMinor .. found $($PSVersionTable.PSVersion) .. aborting"
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

pwsh -nologo -noprofile -command {
  if (-not "${env:WUT_CONFIG_LOCATION}") {
    $env:WUT_CONFIG_LOCATION = "${env:HOME}/.wut-config"
  }
  if (-not "${env:WUT_LOCATION}") {
    $env:WUT_LOCATION = "${env:HOME}/.wut"
  }

  if ($args.Length -gt 0 -and $args[0] -eq 'up') {
    Write-Output "> git -C `"${env:WUT_CONFIG_LOCATION}`" pull --prune"
    Write-Output ''
    git -C "${env:WUT_CONFIG_LOCATION}" pull --prune
    Write-Output ''

    Write-Output "> git -C `"${env:WUT_LOCATION}`" pull --prune"
    Write-Output ''
    git -C "${env:WUT_LOCATION}" pull --prune
    Write-Output ''

    Push-Location "${env:WUT_LOCATION}"
    Write-Output '> bun install'
    bun install
    Pop-Location

    exit
  }

  Push-Location "${env:WUT_LOCATION}"
  bun run src/cli.ts $args
  Pop-Location
} -args $args
