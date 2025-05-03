def packPacman [] {
  mut yn = ''
  let cmd = 'pacman'

  if ('PACK_MANAGER' not-in $env or $env.PACK_MANAGER == $cmd) and (which $cmd | is-not-empty) {
    if ('PACK_MANAGER' not-in $env and (which yay | is-not-empty)) {
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
        opPrintMaybeRunCmd $cmd --sync --refresh '|' complete '|' ignore
        opPrintMaybeRunCmd $cmd --sync --needed $env.PACK_ADD_NAMES
      } else if $env.PACK_OP == 'find' {
        opPrintMaybeRunCmd $cmd --sync --refresh '|' complete '|' ignore
        opPrintMaybeRunCmd $cmd --sync --search $env.PACK_FIND_NAMES
      } else if $env.PACK_OP == 'list' {
        if 'PACK_LIST_NAMES' in $env {
          opPrintMaybeRunCmd $cmd --query '|' find --ignore-case $env.PACK_LIST_NAMES
        } else {
          opPrintMaybeRunCmd $cmd --query
        }
      } else if $env.PACK_OP == 'out' {
        opPrintMaybeRunCmd $cmd --sync --refresh '|' complete '|' ignore
        if 'PACK_OUT_NAMES' in $env {
          opPrintMaybeRunCmd $cmd --query --upgrades '|' find --ignore-case $env.PACK_OUT_NAMES
        } else {
          opPrintMaybeRunCmd $cmd --query --upgrades
        }
      } else if $env.PACK_OP == 'rem' {
        opPrintMaybeRunCmd $cmd --remove --recursive --nosave $env.PACK_REM_NAMES
        if 'PACK_REM_GROUP_NAMES' in $env {
          $env.PACK_REM_GROUP_NAMES | each {
            |pg| { opPrintMaybeRunCmd ...($pg | split words) }
          }
        }
      } else if $env.PACK_OP == 'sync' {
        opPrintMaybeRunCmd $cmd --sync --refresh '|' complete '|' ignore
        if 'PACK_SYNC_NAMES' in $env {
          opPrintMaybeRunCmd $cmd --sync --needed $env.PACK_SYNC_NAMES
        } else {
          opPrintMaybeRunCmd $cmd --sync --sysupgrade
        }
      } else if $env.PACK_OP == 'tidy' {
        opPrintMaybeRunCmd $cmd --sync --clean
      }
    }
  }
}
