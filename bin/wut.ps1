#requires -PSEdition Core

$verMajor = 7
$verMinor = 4

if ($PSVersionTable.PSVersion.Major -lt ${verMajor} ||
    $PSVersionTable.PSVersion.Minor -lt ${verMinor}) {
  Write-Error "pwsh must be >= '${verMajor}.${verMinor}' .. found '$($PSVersionTable.PSVersion)' .. aborting"
  exit 1
}

# subshell to avoid persisting env vars in session
pwsh -nologo -noprofile -command {
  if (-not "${env:WUT_LOCATION}") {
    $env:WUT_LOCATION = "${env:HOME}/.wut"
  }
  if (-not "${env:WUT_CONFIG_LOCATION}") {
    $env:WUT_CONFIG_LOCATION = "${env:HOME}/.wut-config"
  }

  if ($args.Length -gt 0 -and ($args[0] -eq 'gud' -or $args[0] -eq 'g' -or $args[0] -eq ':')) {
    if ($args.Length -lt 2) {
      Write-Error 'no command specified .. aborting'
      exit 1
    }

    if ($args[1] -eq 'list' -or $args[1] -eq 'l' -or $args[1] -eq '/' -or $args[1] -eq 'li' -or $args[1] -eq 'ls') {
      Get-ChildItem "${env:WUT_LOCATION}/gud" -Filter '*.pwsh' | Select-Object -ExpandProperty FullName
      exit
    }

    if ($args.Length -lt 3) {
      Write-Error 'no name specified .. aborting'
      exit 1
    }

    if ($args[1] -eq 'run' -or $args[1] -eq 'r' -or $args[1] -eq '$' -or $args[1] -eq 'rn') {
      pwsh "${env:WUT_LOCATION}/gud/$($args[2]).pwsh"
      exit
    }

    exit
  }

  if ($args.Length -gt 0 -and ($args[0] -eq 'up' -or $args[0] -eq 'u' -or $args[0] -eq '^')) {
    Write-Output "> git -C '${env:WUT_LOCATION}' pull --prune"
    git -C "${env:WUT_LOCATION}" pull --prune | Out-Null

    if (Test-Path "${env:WUT_CONFIG_LOCATION}") {
      Write-Output "> git -C '${env:WUT_CONFIG_LOCATION}' pull --prune"
      git -C "${env:WUT_CONFIG_LOCATION}" pull --prune | Out-Null
    }

    if (Get-Command bun -ErrorAction Ignore) {
      if ("${env:BUN_INSTALL}") {
        Write-Output '> bun upgrade'
        bun upgrade
      }

      Push-Location "${env:WUT_LOCATION}"
      Write-Output '> bun install'
      bun install
      Pop-Location
    }

    exit
  }

  if (-not (Get-Command bun -ErrorAction Ignore)) {
    Write-Error 'bun not found .. aborting'
    exit 1
  }

  Push-Location "${env:WUT_LOCATION}"
  bun run src/cli.ts $args
  Pop-Location
} -args $args
