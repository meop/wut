def packAptget [] {
  mut yn = ''
  let cmd = 'apt-get'

  if ('PACK_MANAGER' not-in $env or $env.PACK_MANAGER == $cmd) and (which $cmd | is-not-empty) {
    if ('PACK_MANAGER' not-in $env and (which apt | is-not-empty)) {
      $yn = 'n'
    } else if 'YES' in $env {
      $yn = 'y'
    } else {
      $yn = input $"? ($env.PACK_OP) packages with ($cmd) \(system\) [y, [n]] "
    }
    if $yn != 'n' {
      let cmd = if (which sudo | is-not-empty) { $"sudo ($cmd)" } else { $"($cmd)" }
      if $env.PACK_OP == 'add' {
        if 'PACK_ADD_GROUP_NAMES' in $env {
          $env.PACK_ADD_GROUP_NAMES | each {
            |pg| { opPrintMaybeRunCmd ...($pg | split words) }
          }
        }
        opPrintMaybeRunCmd $cmd update '|' complete '|' ignore
        opPrintMaybeRunCmd $cmd install $env.PACK_ADD_NAMES
      } else if $env.PACK_OP == 'find' {
        opPrintMaybeRunCmd $cmd update '|' complete '|' ignore
        let cacheCmd = if (which sudo | is-not-empty) { 'sudo apt-cache' } else { 'apt-cache' }
        opPrintMaybeRunCmd $cacheCmd search $env.PACK_FIND_NAMES
      } else if $env.PACK_OP == 'list' {
        if 'PACK_LIST_NAMES' in $env {
          opPrintMaybeRunCmd $cmd list --installed '|' complete '|' get stdout '|' str trim --right '|' find --ignore-case $env.PACK_LIST_NAMES
        } else {
          opPrintMaybeRunCmd $cmd list --installed
        }
      } else if $env.PACK_OP == 'out' {
        opPrintMaybeRunCmd $cmd update '|' complete '|' ignore
        if 'PACK_OUT_NAMES' in $env {
          opPrintMaybeRunCmd $cmd list --upgradable '|' complete '|' get stdout '|' str trim --right '|' find --ignore-case $env.PACK_OUT_NAMES
        } else {
          opPrintMaybeRunCmd $cmd list --upgradable
        }
      } else if $env.PACK_OP == 'rem' {
        opPrintMaybeRunCmd $cmd purge $env.PACK_REM_NAMES
        if 'PACK_REM_GROUP_NAMES' in $env {
          $env.PACK_REM_GROUP_NAMES | each {
            |pg| { opPrintMaybeRunCmd ...($pg | split words) }
          }
        }
      } else if $env.PACK_OP == 'sync' {
        opPrintMaybeRunCmd $cmd update '|' complete '|' ignore
        if 'PACK_SYNC_NAMES' in $env {
          opPrintMaybeRunCmd $cmd install $env.PACK_SYNC_NAMES
        } else {
          opPrintMaybeRunCmd $cmd dist-upgrade
        }
      } else if $env.PACK_OP == 'tidy' {
        opPrintMaybeRunCmd $cmd autoclean
        opPrintMaybeRunCmd $cmd autoremove
      }
    }
  }
}
