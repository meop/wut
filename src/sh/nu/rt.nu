def wutNuVersCurrent [nu_bin: string, nu_vers: string] {
  if not ($nu_bin | path exists) {
    return false
  }
  let installed = (do { ^$nu_bin --version } | complete)
  if $installed.exit_code != 0 {
    return false
  }
  ($installed.stdout | str trim) == $nu_vers
}

def wutNuLockRelease [lock_path: string] {
  rm --force $lock_path
  # best-effort: only succeeds if now empty, so a concurrent process's own in-flight files are never touched
  try { rm ($lock_path | path dirname) } catch { }
}

def wutNuInstall [wut_home: string, nu_bin: string, nu_vers: string, ext: string] {
  if (wutNuVersCurrent $nu_bin $nu_vers) {
    return
  }

  let triple = match $"($env.SYS_OS_PLAT)_($env.SYS_CPU_ARCH)" {
    'darwin_aarch64' => 'aarch64-apple-darwin',
    'darwin_x86_64' => 'x86_64-apple-darwin',
    'linux_aarch64' => 'aarch64-unknown-linux-gnu',
    'linux_x86_64' => 'x86_64-unknown-linux-gnu',
    'winnt_aarch64' => 'aarch64-pc-windows-msvc',
    'winnt_x86_64' => 'x86_64-pc-windows-msvc',
    _ => '',
  }
  if $triple == '' {
    opPrintErr $"unsupported platform/arch for nu sync: ($env.SYS_OS_PLAT)/($env.SYS_CPU_ARCH)"
    exit 1
  }

  # a hidden dir nested inside bin (not bin itself) so a fresh download can never collide with the pinned nu_bin path
  let work_dir = ($wut_home | path join 'vendor' '.nu')
  mkdir $work_dir

  let lock_path = ($work_dir | path join 'nu.lock')
  mut acquired = false
  mut waited = 0
  while $waited < 240 {
    if (wutNuVersCurrent $nu_bin $nu_vers) {
      return
    }
    let locked = (try { "" | save $lock_path; true } catch { false })
    if $locked {
      $acquired = true
      break
    }
    sleep 500ms
    $waited = $waited + 1
  }
  if not $acquired {
    opPrintWarn $"reclaiming stale nu sync lock: ($lock_path)"
    rm --force $lock_path
    let locked = (try { "" | save $lock_path; true } catch { false })
    if not $locked {
      opPrintErr $"failed to acquire nu sync lock: ($lock_path)"
      exit 1
    }
  }

  if (wutNuVersCurrent $nu_bin $nu_vers) {
    wutNuLockRelease $lock_path
    return
  }

  let ext_archive = if $env.SYS_OS_PLAT == 'winnt' { 'zip' } else { 'tar.gz' }
  let asset = $"nu-($nu_vers)-($triple).($ext_archive)"
  let url = $"https://github.com/nushell/nushell/releases/download/($nu_vers)/($asset)"
  let archive_path = ($work_dir | path join $asset)
  let extract_dir = ($work_dir | path join $"nu-($nu_vers)-($triple)")

  rm --force --recursive $archive_path $extract_dir

  if (do { ^curl --fail-with-body --location --no-progress-meter --output $archive_path --url $url } | complete).exit_code != 0 {
    opPrintErr $"failed to download nu ($nu_vers): ($url)"
    rm --force $archive_path
    wutNuLockRelease $lock_path
    exit 1
  }

  # zip assets (winnt) have no wrapping folder, unlike tar.gz assets, so they must extract directly into
  # extract_dir; tar.gz assets already contain their own nu-($nu_vers)-($triple) folder, so they extract into work_dir
  let extract_target = if $ext_archive == 'zip' {
    mkdir $extract_dir
    $extract_dir
  } else {
    $work_dir
  }
  if (do { ^tar -xf $archive_path -C $extract_target } | complete).exit_code != 0 {
    opPrintErr $"failed to extract nu ($nu_vers)"
    rm --force --recursive $archive_path $extract_dir
    wutNuLockRelease $lock_path
    exit 1
  }

  let extracted_bin = ($extract_dir | path join $"nu($ext)")
  if not ($extracted_bin | path exists) {
    opPrintErr $"nu binary not found in extracted archive: ($extract_dir)"
    rm --force --recursive $archive_path $extract_dir
    wutNuLockRelease $lock_path
    exit 1
  }

  if $env.SYS_OS_PLAT != 'winnt' {
    ^chmod +x $extracted_bin
  }
  mv --force $extracted_bin $nu_bin
  # a copy from before nu was vendored, in a dir that is on PATH
  rm --force ($wut_home | path join 'bin' $"nu($ext)")
  rm --force --recursive $archive_path $extract_dir

  wutNuLockRelease $lock_path
}

def --env wutNuSync [] {
  if $env.SYS_OS_PLAT not-in ['darwin' 'linux' 'winnt'] {
    opPrintWarn 'script is for darwin, linux, or winnt'
    return
  }

  $env.WUT_HOME = ($env.WUT_HOME? | default ($env.HOME | path join '.wut'))
  let wut_home = $env.WUT_HOME
  let ext = if $env.SYS_OS_PLAT == 'winnt' { '.exe' } else { '' }
  let nu_bin = ($wut_home | path join 'vendor' $"nu($ext)")
  let nu_vers = $"($env.NU_VERS_MAJOR).($env.NU_VERS_MINOR).($env.NU_VERS_PATCH)"

  wutNuInstall $wut_home $nu_bin $nu_vers $ext
}

wutNuSync
