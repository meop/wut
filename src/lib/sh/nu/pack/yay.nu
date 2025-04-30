def packYay [] {
  mut yn = ''
  mut cmd = 'yay'

  if ('PACK_MANAGER' not-in $env or $env.PACK_MANAGER == $cmd) and (which $cmd | is-not-empty) {
    if 'YES' in $env {
      $yn = 'y'
    } else {
      $yn = input $"? ($env.PACK_OP) packages with ($cmd) \(system\) [y, [n]] "
    }
    if $yn != 'n' {
      if $env.PACK_OP == 'add' {
        if 'PACK_ADD_GROUP_NAMES' in $env {
          $env.PACK_ADD_GROUP_NAMES | each {
            |pg| { opPrintRunCmd ...($pg | split words) }
          }
        }
        opPrintRunCmd $cmd --sync --refresh '|' complete '|' ignore
        opPrintRunCmd $cmd --sync --needed $env.PACK_ADD_NAMES
      } else if $env.PACK_OP == 'find' {
        opPrintRunCmd $cmd --sync --refresh '|' complete '|' ignore
        opPrintRunCmd $cmd --sync --search $env.PACK_FIND_NAMES
      } else if $env.PACK_OP == 'list' {
        if 'PACK_LIST_NAMES' in $env {
          opPrintRunCmd $cmd --query '|' find --ignore-case $env.PACK_LIST_NAMES
        } else {
          opPrintRunCmd $cmd --query
        }
      } else if $env.PACK_OP == 'out' {
        opPrintRunCmd $cmd --sync --refresh '|' complete '|' ignore
        if 'PACK_OUT_NAMES' in $env {
          opPrintRunCmd $cmd --query --upgrades '|' find --ignore-case $env.PACK_OUT_NAMES
        } else {
          opPrintRunCmd $cmd --query --upgrades
        }
      } else if $env.PACK_OP == 'rem' {
        opPrintRunCmd $cmd --remove --recursive --nosave $env.PACK_REM_NAMES
        if 'PACK_REM_GROUP_NAMES' in $env {
          $env.PACK_REM_GROUP_NAMES | each {
            |pg| { opPrintRunCmd ...($pg | split words) }
          }
        }
      } else if $env.PACK_OP == 'sync' {
        opPrintRunCmd $cmd --sync --refresh '|' complete '|' ignore
        if 'PACK_SYNC_NAMES' in $env {
          opPrintRunCmd $cmd --sync --needed $env.PACK_SYNC_NAMES
        } else {
          opPrintRunCmd $cmd --sync --sysupgrade
        }
      } else if $env.PACK_OP == 'tidy' {
        opPrintRunCmd $cmd --sync --clean
      }
    }
  }
}
