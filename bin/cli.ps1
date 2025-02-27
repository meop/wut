#requires -PSEdition Core

$verMajor = 7
$verMinor = 4

if ($PSVersionTable.PSVersion.Major -lt ${verMajor} ||
    $PSVersionTable.PSVersion.Minor -lt ${verMinor}) {
  Write-Error "pwsh must be >= '${verMajor}.${verMinor}' .. found '$($PSVersionTable.PSVersion)' .. aborting"
  exit 1
}

pwsh -nologo -noprofile -command {
  if (-not "${env:WUT_LOCATION}") {
    $env:WUT_LOCATION = "${env:HOME}/.wut"
  }
  if (-not "${env:WUT_CONFIG_LOCATION}") {
    $env:WUT_CONFIG_LOCATION = "${env:HOME}/.wut-config"
  }

  if (-not (Get-Command bun -ErrorAction Ignore)) {
    Write-Error 'bun not found .. aborting'
    exit 1
  }

  Push-Location "${env:WUT_LOCATION}"
  bun run src/cli.ts $args | Invoke-Expression
  Pop-Location
} -args $args
