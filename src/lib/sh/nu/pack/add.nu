do {
  if (('PACK_MANAGER' not-in $env) or ($env.PACK_MANAGER == 'winget')) and (which winget | is-not-empty) {
    mut yn = ''
    if 'YES' in $env {
      $yn = 'y'
    } else {
      $yn = input '? add packages with winget (system) [y, [n]] '
    }
    if $yn != 'n' {
      if 'PACK_ADD_GROUPS' in $env {
        $env.PACK_ADD_GROUPS | each {
          |pg| { opPrintRunCmd ...($pg | split words) }
        }
      }
      opPrintRunCmd winget install $env.PACK_ADD_NAMES
    }
  }

  if (('PACK_MANAGER' not-in $env) or ($env.PACK_MANAGER == 'scoop')) and (which scoop | is-not-empty) {
    mut yn = ''
    if 'YES' in $env {
      $yn = 'y'
    } else {
      $yn = input '? add packages with scoop (user) [y, [n]] '
    }
    if $yn != 'n' {
      if 'PACK_ADD_GROUPS' in $env {
        $env.PACK_ADD_GROUPS | each {
          |pg| { opPrintRunCmd ...($pg | split words) }
        }
      }
      opPrintRunCmd scoop update | ignore
      opPrintRunCmd scoop install $env.PACK_ADD_NAMES
    }
  }
}
