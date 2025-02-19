#requires -PSEdition Core

pwsh -nologo -noprofile -command {
  if (-not "${env:WUT_CONFIG_LOCATION}") {
    $env:WUT_CONFIG_LOCATION = "${env:HOME}/.wut-config"
  }

  $yn = Read-Host '> run (boot)straps? (y/N)'
  if ("${yn}" -eq 'y') {
    pwsh "${env:WUT_CONFIG_LOCATION}/strap/pwsh/install/bun.ps1"
    pwsh "${env:WUT_CONFIG_LOCATION}/strap/pwsh/install/scoop.ps1"

    pwsh "${env:WUT_CONFIG_LOCATION}/strap/pwsh/setup/nvim.ps1"
  }

} -args $args
