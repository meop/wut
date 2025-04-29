do {
  if (('PACK_MANAGER' not-in $env) or ($env.PACK_MANAGER == 'winget')) and (which winget | is-not-empty) {
    mut yn = ''
    if 'YES' in $env {
      $yn = 'y'
    } else {
      $yn = input '? sync packages with winget (system) [y, [n]] '
    }
    if $yn != 'n' {
      if 'PACK_UP_NAMES' in $env {
        opPrintRunCmd winget upgrade $env.PACK_UP_NAMES
      } else {
        opPrintRunCmd winget upgrade --all
      }
    }
  }

  if (('PACK_MANAGER' not-in $env) or ($env.PACK_MANAGER == 'scoop')) and (which scoop | is-not-empty) {
    mut yn = ''
    if 'YES' in $env {
      $yn = 'y'
    } else {
      $yn = input '? sync packages with scoop (user) [y, [n]] '
    }
    if $yn != 'n' {
      if 'PACK_ADD_GROUPS' in $env {
        opPrintRunCmd scoop update $env.PACK_UP_NAMES
      } else {
        opPrintRunCmd scoop update --all
      }
    }
  }
}
