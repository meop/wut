& {
  function wutNuVersCurrent ([string]$nuBin, [string]$nuVers) {
    if (-not (Test-Path -Path $nuBin -PathType Leaf)) {
      return $false
    }
    $installed = & $nuBin --version 2>$null
    if ($LASTEXITCODE -ne 0) {
      return $false
    }
    return ($installed | Out-String).Trim() -eq $nuVers
  }

  function wutNuLockRelease ([string]$lockDir) {
    Remove-Item -Force -Recurse -Path $lockDir -ErrorAction SilentlyContinue
    # best-effort: only removes it if now empty, so a concurrent process's own in-flight files are never touched
    $workDir = Split-Path -Path $lockDir -Parent
    if ((Get-ChildItem -Path $workDir -Force -ErrorAction SilentlyContinue | Measure-Object).Count -eq 0) {
      Remove-Item -Path $workDir -Force -ErrorAction SilentlyContinue
    }
  }

  function wutNuInstall ([string]$wutHome, [string]$nuBin, [string]$nuVers, [string]$ext) {
    if (wutNuVersCurrent $nuBin $nuVers) {
      return
    }

    $triple = switch ("${SYS_OS_PLAT}_${SYS_CPU_ARCH}") {
      'darwin_aarch64' { 'aarch64-apple-darwin' }
      'darwin_x86_64' { 'x86_64-apple-darwin' }
      'linux_aarch64' { 'aarch64-unknown-linux-gnu' }
      'linux_x86_64' { 'x86_64-unknown-linux-gnu' }
      'winnt_aarch64' { 'aarch64-pc-windows-msvc' }
      'winnt_x86_64' { 'x86_64-pc-windows-msvc' }
      default { '' }
    }
    if ($triple -eq '') {
      opPrintErr "unsupported platform/arch for nu sync: ${SYS_OS_PLAT}/${SYS_CPU_ARCH}"
      exit 1
    }

    # a hidden dir nested inside bin (not bin itself) so a fresh download can never collide with the pinned nuBin path
    $workDir = Join-Path $wutHome 'vendor' '.nu'
    New-Item -ItemType Directory -Force -Path $workDir | Out-Null

    $lockDir = Join-Path $workDir 'nu.lock'
    $acquired = $false
    $waited = 0
    while ($waited -lt 240) {
      if (wutNuVersCurrent $nuBin $nuVers) {
        return
      }
      try {
        New-Item -ItemType Directory -Path $lockDir -ErrorAction Stop | Out-Null
        $acquired = $true
        break
      } catch {
        Start-Sleep -Milliseconds 500
        $waited += 1
      }
    }
    if (-not $acquired) {
      opPrintWarn "reclaiming stale nu sync lock: ${lockDir}"
      Remove-Item -Force -Recurse -Path $lockDir -ErrorAction SilentlyContinue
      try {
        New-Item -ItemType Directory -Path $lockDir -ErrorAction Stop | Out-Null
      } catch {
        opPrintErr "failed to acquire nu sync lock: ${lockDir}"
        exit 1
      }
    }

    if (wutNuVersCurrent $nuBin $nuVers) {
      wutNuLockRelease $lockDir
      return
    }

    $extArchive = if ($SYS_OS_PLAT -eq 'winnt') { 'zip' } else { 'tar.gz' }
    $asset = "nu-${nuVers}-${triple}.${extArchive}"
    $url = "https://github.com/nushell/nushell/releases/download/${nuVers}/${asset}"
    $archivePath = Join-Path $workDir $asset
    $extractDir = Join-Path $workDir "nu-${nuVers}-${triple}"

    Remove-Item -Force -Recurse -Path $archivePath, $extractDir -ErrorAction SilentlyContinue

    & curl --fail-with-body --location --no-progress-meter --output $archivePath --url $url
    if ($LASTEXITCODE -ne 0) {
      opPrintErr "failed to download nu ${nuVers}: ${url}"
      Remove-Item -Force -Path $archivePath -ErrorAction SilentlyContinue
      wutNuLockRelease $lockDir
      exit 1
    }

    # zip assets (winnt) have no wrapping folder, unlike tar.gz assets, so they must extract directly into
    # extractDir; tar.gz assets already contain their own nu-${nuVers}-${triple} folder, so they extract into workDir
    if ($extArchive -eq 'zip') {
      New-Item -ItemType Directory -Force -Path $extractDir | Out-Null
      & tar -xf $archivePath -C $extractDir
    } else {
      & tar -xf $archivePath -C $workDir
    }
    if ($LASTEXITCODE -ne 0) {
      opPrintErr "failed to extract nu ${nuVers}"
      Remove-Item -Force -Recurse -Path $archivePath, $extractDir -ErrorAction SilentlyContinue
      wutNuLockRelease $lockDir
      exit 1
    }

    $extractedBin = Join-Path $extractDir "nu${ext}"
    if (-not (Test-Path -Path $extractedBin -PathType Leaf)) {
      opPrintErr "nu binary not found in extracted archive: ${extractDir}"
      Remove-Item -Force -Recurse -Path $archivePath, $extractDir -ErrorAction SilentlyContinue
      wutNuLockRelease $lockDir
      exit 1
    }

    if ($SYS_OS_PLAT -ne 'winnt') {
      & chmod +x $extractedBin
    }
    Move-Item -Force -Path $extractedBin -Destination $nuBin
    # a copy from before nu was vendored, in a dir that is on PATH
    Remove-Item -Force -Path (Join-Path $wutHome 'bin' "nu${ext}") -ErrorAction SilentlyContinue
    Remove-Item -Force -Recurse -Path $archivePath, $extractDir -ErrorAction SilentlyContinue

    wutNuLockRelease $lockDir
  }

  if ($SYS_OS_PLAT -notin @('darwin', 'linux', 'winnt')) {
    opPrintWarn 'script is for darwin, linux, or winnt'
    return
  }

  $env:WUT_HOME = $env:WUT_HOME ?? "${env:HOME}/.wut"
  $wutHome = $env:WUT_HOME
  $ext = if ($SYS_OS_PLAT -eq 'winnt') { '.exe' } else { '' }
  $nuBin = Join-Path $wutHome 'vendor' "nu${ext}"
  $nuVers = "${NU_VERS_MAJOR}.${NU_VERS_MINOR}.${NU_VERS_PATCH}"

  wutNuInstall $wutHome $nuBin $nuVers $ext
}
