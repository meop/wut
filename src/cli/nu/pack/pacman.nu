def packYay [] {
  let cmd = 'yay'

  if ('PACK_MANAGER' not-in $env or $env.PACK_MANAGER == $cmd) and (which $cmd | is-not-empty) {
    mut yn = ''
    if 'YES' in $env {
      $yn = 'y'
    } else {
      $yn = input $"? use ($cmd) \(system\) [y, [n]] "
    }
    if $yn != 'n' {
      packPacmanOp $cmd
    }
  }
}

def packPacman [] {
  let cmd = 'pacman'

  if ('PACK_MANAGER' not-in $env) and (which yay | is-not-empty) {
    # yay is a superset of pacman
  } else if ('PACK_MANAGER' not-in $env or $env.PACK_MANAGER == $cmd) and (which $cmd | is-not-empty) {
    mut yn = ''
    if 'YES' in $env {
      $yn = 'y'
    } else {
      $yn = input $"? use ($cmd) \(system\) [y, [n]] "
    }
    if $yn != 'n' {
      let cmd = if (which sudo | is-not-empty) { $"sudo ($cmd)" } else { $cmd }
      packPacmanOp $cmd
    }
  }
}
