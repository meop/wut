def packDnf [] {
  mut yn = ''
  mut cmd = 'dnf'

  if ('PACK_MANAGER' not-in $env or $env.PACK_MANAGER == $cmd) and (which $cmd | is-not-empty) {
    if 'YES' in $env {
      $yn = 'y'
    } else {
      $yn = input $"? ($env.PACK_OP) packages with ($cmd) \(system\) [y, [n]] "
    }
    if $yn != 'n' {
      if (which sudo | is-not-empty) {
        $cmd = $"sudo ($cmd)"
      }
      if $env.PACK_OP == 'add' {
        if 'PACK_ADD_GROUP_NAMES' in $env {
          $env.PACK_ADD_GROUP_NAMES | each {
            |pg| { opPrintRunCmd ...($pg | split words) }
          }
        }
        opPrintRunCmd $cmd check-update '|' complete '|' ignore
        opPrintRunCmd $cmd install $env.PACK_ADD_NAMES
      } else if $env.PACK_OP == 'find' {
        opPrintRunCmd $cmd check-update '|' complete '|' ignore
        opPrintRunCmd $cmd search $env.PACK_FIND_NAMES
      } else if $env.PACK_OP == 'list' {
        if 'PACK_LIST_NAMES' in $env {
          opPrintRunCmd $cmd list --installed '|' find --ignore-case $env.PACK_LIST_NAMES
        } else {
          opPrintRunCmd $cmd list --installed
        }
      } else if $env.PACK_OP == 'out' {
        opPrintRunCmd $cmd check-update '|' complete '|' ignore
        if 'PACK_OUT_NAMES' in $env {
          opPrintRunCmd $cmd list --upgrades '|' find --ignore-case $env.PACK_OUT_NAMES
        } else {
          opPrintRunCmd $cmd list --upgrades
        }
      } else if $env.PACK_OP == 'rem' {
        opPrintRunCmd $cmd remove $env.PACK_REM_NAMES
        if 'PACK_REM_GROUP_NAMES' in $env {
          $env.PACK_REM_GROUP_NAMES | each {
            |pg| { opPrintRunCmd ...($pg | split words) }
          }
        }
      } else if $env.PACK_OP == 'sync' {
        opPrintRunCmd $cmd check-update '|' complete '|' ignore
        if 'PACK_SYNC_NAMES' in $env {
          opPrintRunCmd $cmd upgrade $env.PACK_SYNC_NAMES
        } else {
          opPrintRunCmd $cmd distro-sync
        }
      } else if $env.PACK_OP == 'tidy' {
        opPrintRunCmd $cmd clean dbcache
        opPrintRunCmd $cmd autoremove
      }
    }
  }
}
