def packScoop [] {
  mut yn = ''
  let cmd = 'scoop'

  if ('PACK_MANAGER' not-in $env or $env.PACK_MANAGER == $cmd) and (which $cmd | is-not-empty) {
    if 'YES' in $env {
      $yn = 'y'
    } else {
      $yn = input $"? ($env.PACK_OP) packages with ($cmd) \(user\) [y, [n]] "
    }
    if $yn != 'n' {
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
        opPrintMaybeRunCmd $cmd search $env.PACK_FIND_NAMES
      } else if $env.PACK_OP == 'list' {
        if 'PACK_LIST_NAMES' in $env {
          opPrintMaybeRunCmd $cmd list '|' complete '|' get stdout '|' str trim --right '|' find --ignore-case $env.PACK_LIST_NAMES
        } else {
          opPrintMaybeRunCmd $cmd list
        }
      } else if $env.PACK_OP == 'out' {
        opPrintMaybeRunCmd $cmd update '|' complete '|' ignore
        if 'PACK_OUT_NAMES' in $env {
          opPrintMaybeRunCmd $cmd status '|' complete '|' get stdout '|' str trim --right '|' find --ignore-case $env.PACK_OUT_NAMES
        } else {
          opPrintMaybeRunCmd $cmd status
        }
      } else if $env.PACK_OP == 'rem' {
        opPrintMaybeRunCmd $cmd uninstall $env.PACK_REM_NAMES
        if 'PACK_REM_GROUP_NAMES' in $env {
          $env.PACK_REM_GROUP_NAMES | each {
            |pg| { opPrintMaybeRunCmd ...($pg | split words) }
          }
        }
      } else if $env.PACK_OP == 'sync' {
        opPrintMaybeRunCmd $cmd update '|' complete '|' ignore
        if 'PACK_SYNC_NAMES' in $env {
          opPrintMaybeRunCmd $cmd update $env.PACK_SYNC_NAMES
        } else {
          opPrintMaybeRunCmd $cmd update --all
        }
      } else if $env.PACK_OP == 'tidy' {
        opPrintMaybeRunCmd $cmd cleanup --all --cache
      }
    }
  }
}
